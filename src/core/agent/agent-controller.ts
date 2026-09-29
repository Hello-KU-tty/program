/**
 * AgentSurfaceController — host-owned authoritative state + orchestration for
 * the live Builder / Helper agent surfaces (design §B.5).
 *
 * This is the analogue of the shipped {@link FlowController}: a framework-free
 * core that owns ALL agent run / turn / decision / native-question state and
 * projects a single safe {@link AgentViewModel} for the webview. It never
 * imports VS Code or a concrete transport; it depends only on the
 * {@link AgentRunPort} + {@link NativeInputPort} boundary and the injected
 * {@link AgentControllerDeps} (globalState, onChange, openFolder, openExternal),
 * so it is fully deterministic under test (design §Testing Strategy).
 *
 * SCOPE (task 5.1): this module is the controller SCAFFOLDING only —
 * construction, authoritative state ownership, worker/input subscriptions, and
 * the shared helper methods (`setBuilder`, `setHelper`, `notice`, `notify`,
 * `fail`, `applyEvent`, `onWorkerStatus`, `refreshNativeQuestions`,
 * `reprojectFromSnapshot`, `dispose`). The behavior bodies
 * (`startBuilder` / `superviseRun` / `cancelActive` / `recover` / `startHelper`
 * / `resolveDecision` / `submitNativeAnswer` / workspace / launch / evidence /
 * final upgrade) are added by tasks 5.2–5.8 and are intentionally NOT declared
 * here yet.
 *
 * SECURITY (Requirement 13.1): only safe DTOs cross into the webview; the
 * absolute `workspaceDirectory` is consumed only by the injected
 * {@link AgentControllerDeps.openFolder} and never placed into any projection.
 */

import type {
  AgentError,
  AgentRunPort,
} from "../../adapter/agent/agent-run-port";
import type { NativeInputPort } from "../../adapter/agent/native-input-port";
import { errorGuidance, runtimeErrorMessage } from "../runtime-errors";
import {
  classifyNativeWorkerStatus,
  createDecisionResolutionRequest,
  DecisionInputError,
  type DecisionSelection,
  eligibleFinalUpgradeTraces,
  entityId,
  type EvidenceTraceView,
  type FinalUpgradeCandidate,
  isRunActive,
  type LocalRun,
  type ProjectEvidenceTrace,
  type ProjectSessionSnapshot,
  type RunEventView,
  summarizeEvidenceTrace,
  uiMetadata,
} from "../../../vendor/frontend-client";
import type {
  NativeAnswer,
  NativeQuestion,
} from "../../../vendor/frontend-host";
import {
  type AgentViewModel,
  builderTaskLabel,
  type BuilderTurnViewModel,
  type DecisionViewModel,
  type HelperConversationViewModel,
  type HelperViewModel,
  initialAgentViewModel,
  type NativeQuestionViewModel,
  type NoticeViewModel,
} from "./agent-view-model";
import { classifyTurn, phaseFromOutcome, reduceEvent } from "./builder-turn";

/**
 * Injected dependencies for {@link AgentSurfaceController}.
 *
 * `openFolder` / `openExternal` are injected (rather than calling `vscode`
 * directly) so tests use spies and there are no real side effects on the
 * fail-closed dev pin (design §Testing Strategy "Non-goals for tests").
 */
export interface AgentControllerDeps {
  /** Non-throwing boundary over the managed `CoreClient` + `NativeWorker`. */
  readonly port: AgentRunPort & NativeInputPort;
  /** Persistent extension state for `bhlr.lastProjectId` (§3.1 recovery). */
  readonly globalState: {
    get(key: string): string | undefined;
    update(key: string, value: string): Thenable<void> | Promise<void>;
  };
  /** Called after any state mutation so the provider re-hydrates the webview. */
  readonly onChange: () => void;
  /** Host-side open of an absolute workspace path (§3.6). Injected spy in tests. */
  readonly openFolder: (absolutePath: string) => Promise<void> | Thenable<void>;
  /** Host-side open of a validated external URL (§3.7). Injected spy in tests. */
  readonly openExternal: (url: string) => Promise<void> | Thenable<void>;
}

/**
 * Host-side authoritative core for the agent surfaces. Owns the single
 * {@link AgentViewModel}, independent Builder/Helper live-watch abort handles, and
 * the worker status / user-input subscriptions established in the constructor.
 */
export class AgentSurfaceController {
  /** The authoritative, host-owned projection (single source of truth). */
  private vm: AgentViewModel = initialAgentViewModel();

  /** Independent streams: Helper must never replace the Builder stop target. */
  private readonly watches: Record<"builder" | "helper", AbortController | null> = { builder: null, helper: null };
  private builderFlight: Promise<void> | null = null;
  private helperFlight: Promise<void> | null = null;
  private readonly analysisRetries = new Set<string>();

  /** Worker-status subscription teardown, established in the constructor. */
  private unsubStatus?: () => void;

  /** User-input notify subscription teardown, established in the constructor. */
  private unsubInputs?: () => void;

  /** The run currently supervised, used by cancel / currentRunId helpers. */
  private activeRunId: string | null = null;

  /**
   * Set by {@link cancelActive} for the window between an accepted Core-cancel
   * and the run's terminal arriving in {@link superviseRun} (design §B.5 / §B.8;
   * Requirement 6.2/6.5). It is the ONLY coordination between the explicit stop
   * path and the supervise loop: `cancelActive` sets the phase directly to
   * `CANCELLED → CLEANUP` and this flag tells `superviseRun`, when its watch
   * resolves to the (now terminal, CANCELLED) run, to leave the phase at
   * `CLEANUP` rather than re-classifying it. Reset once `superviseRun` observes
   * it. Abort (panel dispose) never sets this — abort ≠ cancel (§B.8).
   */
  private cancelRequested = false;

  /**
   * The project the surface is currently bound to. Set once a Builder/Helper
   * flow has a project id (from `bhlr.lastProjectId`); used by
   * {@link refreshNativeQuestions} to scope `listUserInputs`. `null` until then.
   */
  private lastProjectId: string | null = null;
  private disposed = false;
  private bindingVersion = 0;

  constructor(private readonly deps: AgentControllerDeps) {
    // Worker status + user-input changes are async, non-intent-driven mutations
    // (design §B.5): subscribe once here and re-project on every notify.
    this.unsubStatus = deps.port.subscribeStatus((code) =>
      this.onWorkerStatus(code),
    );
    this.unsubInputs = deps.port.subscribeUserInputs(() =>
      this.refreshNativeQuestions(),
    );
    // Seed the bound project id from persisted state if present.
    this.lastProjectId = deps.globalState.get("bhlr.lastProjectId") ?? null;
  }

  /** The current safe projection posted to the webview. */
  getViewModel(): AgentViewModel {
    return this.vm;
  }

  private isCurrentBinding(binding: number): boolean {
    return !this.disposed && binding === this.bindingVersion;
  }

  /** Host-only guard for responses crossing one more await in the dispatcher. */
  captureBinding(): () => boolean {
    const binding = this.bindingVersion;
    return () => this.isCurrentBinding(binding);
  }

  /** Detach a view from the previous project, without cancelling its Core run. */
  bindProject(projectId: string): void {
    if (this.disposed || projectId === this.lastProjectId) return;
    this.bindingVersion++;
    this.watches.builder?.abort();
    this.watches.helper?.abort();
    this.watches.builder = this.watches.helper = null;
    this.builderFlight = this.helperFlight = null;
    this.activeRunId = null;
    this.cancelRequested = false;
    this.lastProjectId = projectId;
    this.vm = initialAgentViewModel();
    this.refreshNativeQuestions();
    this.deps.onChange();
  }

  async refreshProject(): Promise<void> {
    if (!this.disposed && this.lastProjectId) await this.reprojectFromSnapshot(this.lastProjectId);
  }

  // --- BEHAVIORS (task 5.2): start a Builder run + supervise its stream ---

  /**
   * Start a live Builder run for the project's current task (design §B.3 /
   * §B.5; Requirements 1.1–1.15, 2.1, 2.5, 2.6, 3.1).
   *
   * Non-throwing: every failure resolves through the port's {@link AgentResult}
   * and is surfaced as a `START_ERROR` phase + notice. The absolute
   * `workspaceDirectory` never enters this path — only the durable task binding
   * (taskId / expectedTaskRevision) and the user's message are used.
   *
   * Sequence:
   *  1. Require `bhlr.lastProjectId`; absent → `START_ERROR` (`PROJECT_REQUIRED`).
   *  2. `prepareBuilder` (restoreProject + require currentTask); a rejection
   *     (e.g. `invalid`/`CURRENT_TASK_REQUIRED`) → `START_ERROR` + notice.
   *  3. Persist `bhlr.lastProjectId` for §3.1 window-switch recovery.
   *  4. Enter `STARTING` with the bound task id/title; re-hydrate.
   *  5. `startBuilder`; any start-time rejection (run_busy / stale_task_revision
   *     / task_already_completed / task_binding_mismatch / runtime_capacity /
   *     idempotency_conflict) → `START_ERROR` with the mapped code. On
   *     `stale_task_revision` re-read the durable snapshot first so the task
   *     binding shown is current (Requirements 1.10–1.15).
   *  6. Otherwise record the run id and hand off to {@link superviseRun} with a
   *     full replay-from-start (`after: run.retainedFromSequence`).
   */
  startBuilder(message: string): Promise<void> {
    if (this.builderFlight) return this.builderFlight;
    if (this.activeRunId || this.disposed) return Promise.resolve();
    const flight = this.startBuilderTurn(message).finally(() => {
      if (this.builderFlight === flight) this.builderFlight = null;
    });
    this.builderFlight = flight;
    return flight;
  }

  private async startBuilderTurn(message: string): Promise<void> {
    const projectId = this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.lastProjectId = null;
      this.setBuilder({ phase: "START_ERROR" });
      this.fail("builder", "invalid", "PROJECT_REQUIRED");
      return;
    }
    this.lastProjectId = projectId;
    const binding = this.bindingVersion;

    const prep = await this.deps.port.prepareBuilder(projectId);
    if (this.disposed || binding !== this.bindingVersion) return;
    if (!prep.ok) {
      // prepareBuilder returns 'invalid' for CURRENT_TASK_REQUIRED (agent-error).
      this.setBuilder({ phase: "START_ERROR", errorCode: prep.error.code });
      this.notify(prep.error);
      return;
    }

    // Persist for §3.1 recovery (window-switch reload re-watches this project).
    await this.deps.globalState.update("bhlr.lastProjectId", projectId);
    if (this.disposed || binding !== this.bindingVersion) return;

    this.setBuilder({
      phase: "STARTING",
      taskId: prep.value.taskId,
      taskTitle: prep.value.taskTitle,
    });
    this.deps.onChange();

    const started = await this.deps.port.startBuilder({
      projectId,
      taskId: prep.value.taskId,
      expectedTaskRevision: prep.value.expectedTaskRevision,
      message,
    });
    if (this.disposed || binding !== this.bindingVersion) return;
    if (!started.ok) {
      // On a stale revision, re-read durable truth before surfacing the error
      // so the task binding shown reflects the snapshot (Requirement 1.11).
      if (started.error.code === "stale_task_revision") {
        await this.reprojectFromSnapshot(projectId);
      }
      this.setBuilder({ phase: "START_ERROR", errorCode: started.error.code });
      this.notify(started.error);
      return;
    }

    this.activeRunId = started.value.id;
    // Fresh run: replay from the run's retained sequence (0 for a new run).
    await this.superviseRun(
      projectId,
      started.value.id,
      started.value.retainedFromSequence,
      prep.value.taskId,
      "builder",
    );
  }

  /**
   * Supervise a Builder (or Helper) run's SSE stream to its terminal state
   * (design §B.3 / §B.5; Requirements 1.4–1.9, 2.1, 2.5, 2.6).
   *
   * Opens a single {@link AbortController} for the live watch, enters `RUNNING`
   * (for the Builder surface), folds each projected event into the turn view
   * model via {@link applyEvent}, and on terminal reads the After_Snapshot to
   * classify the turn. Abort (panel dispose) is explicitly NOT a cancel: when
   * the watch resolves after `signal.aborted`, this returns without marking
   * `CANCELLED`/`FAILED` — recovery re-watches on reactivation (§3.4).
   *
   * Completion gating (Requirement 5.4 / §Correctness Property 3): after a
   * `TASK_COMPLETED` outcome the projected `vm.decisions` is checked; if any
   * decision for this task is still unapplied (`applied === false`) the turn is
   * presented as `TURN_ENDED` instead of `TASK_COMPLETED`.
   *
   * The `helper` branch reads back the recorded conversation from the
   * After_Snapshot (via {@link reprojectFromSnapshot}) and then projects the
   * terminal Helper outcome via {@link applyHelperTerminal} (§B.6). It is
   * strictly read-only — no Builder / decision side effects (Requirement 4.2).
   */
  private async superviseRun(
    projectId: string,
    runId: string,
    after: number,
    taskId: string,
    surface: "builder" | "helper",
  ): Promise<void> {
    const watchAbort = new AbortController();
    this.watches[surface]?.abort();
    this.watches[surface] = watchAbort;
    const binding = this.bindingVersion;
    const isCurrent = () => !this.disposed && !watchAbort.signal.aborted && binding === this.bindingVersion;
    if (surface === "builder") {
      this.setBuilder({ phase: "RUNNING" });
    }
    this.deps.onChange();

    const res = await this.deps.port.watch(runId, {
      after,
      signal: watchAbort.signal,
      onEvent: (view) => { if (isCurrent()) this.applyEvent(surface, view); },
      onRun: (_run) => {
        // Keep last run STATE; phase/errorCode are decided at terminal via
        // classifyTurn. No projection needed mid-stream (design §B.5).
      },
    });
    if (!isCurrent()) return;
    if (surface === "builder" && this.activeRunId === runId) this.activeRunId = null;

    if (!res.ok) {
      // Abort (panel dispose) is NOT a cancel: leave the phase untouched and
      // let recovery re-watch on reactivation (§3.4 abort ≠ cancel).
      if (watchAbort.signal.aborted) {
        return;
      }
      if (surface === "builder") {
        this.setBuilder({ phase: "FAILED" });
      }
      this.fail(surface, res.error.code, res.error.raw);
      return;
    }

    // Terminal: read the durable After_Snapshot for classification / read-back.
    const snap = await this.deps.port.snapshot(projectId);
    if (!isCurrent()) return;
    if (!snap.ok) {
      if (surface === "builder") {
        this.setBuilder({ phase: "FAILED" });
      }
      this.fail(surface, snap.error.code, snap.error.raw);
      return;
    }

    if (surface === "helper") {
      // Read back the recorded conversation from the After_Snapshot first
      // (Requirement 4.4: snapshot, not live text alone) — reprojectFromSnapshot
      // already projects helper.conversations — then set the Helper phase from
      // the terminal run's outcome (§B.6). Read-only: no Builder / decision
      // side effects (Requirement 4.2).
      await this.reprojectFromSnapshot(projectId);
      if (!isCurrent()) return;
      this.applyHelperTerminal(res.value, snap.value, taskId);
      this.deps.onChange();
      return;
    }

    // Explicit-stop coordination (task 5.3; design §B.5 / §B.8): if the user
    // cancelled this run, cancelActive already set CANCELLED → CLEANUP and the
    // run is terminal as CANCELLED. Do NOT let the classifier re-clobber that
    // CLEANUP phase — the worker's AGENT_ENDED stage settles CLEANUP → IDLE via
    // onWorkerStatus. Also treat a terminal run that is itself CANCELLED the
    // same way (defensive: covers a Core-side cancel we didn't originate).
    if (this.cancelRequested || res.value.status === "CANCELLED") {
      this.cancelRequested = false;
      // SSE can report cancellation before the cancel HTTP response arrives.
      // A terminal cancellation must not leave the surface looking RUNNING.
      this.setBuilder({ phase: this.vm.worker?.stage === "AGENT_ENDED" ? "IDLE" : "CLEANUP" });
      // Leave the phase as-is (CLEANUP set by cancelActive). Just re-project the
      // durable slices so decisions/conversations reflect the terminal snapshot.
      await this.reprojectFromSnapshot(projectId);
      return;
    }

    // Re-project decisions/conversations/task binding from the snapshot first so
    // the `applied` flags used by the completion gate below are current.
    await this.reprojectFromSnapshot(projectId);
    if (!isCurrent()) return;

    const outcome = classifyTurn(res.value, snap.value, taskId);
    const phase = phaseFromOutcome(outcome);

    if (outcome.kind === "TASK_COMPLETED") {
      // Completion gating (Requirement 5.4 / Property 3): do NOT present
      // TASK_COMPLETED while any decision for this task is still unapplied.
      const hasUnappliedForTask = this.vm.decisions.some(
        (d) => d.taskId === taskId && d.applied === false,
      );
      if (hasUnappliedForTask) {
        this.setBuilder({ phase: "TURN_ENDED", completionReportId: null });
      } else {
        this.setBuilder({
          phase: "TASK_COMPLETED",
          completionReportId: outcome.completionReportId,
        });
      }
    } else if (outcome.kind === "FAILED") {
      this.setBuilder({ phase, errorCode: outcome.errorCode });
      this.notice("error", outcome.errorCode, runtimeErrorMessage(outcome.errorCode, "Builder 요청을 완료하지 못했어요. 저장된 상태를 확인한 뒤 다시 시도해 주세요."));
    } else {
      // RUNNING (should not occur post-terminal) / DECISION_REQUIRED (ids are
      // carried by the reprojected vm.decisions) / TURN_ENDED / CANCELLED.
      this.setBuilder({ phase });
    }

    this.deps.onChange();
  }

  // --- BEHAVIOR (task 5.3): explicit user "stop" / run cancellation ---

  /**
   * Explicit user "stop": cancel the active run (design §B.5 / §B.8;
   * Requirements 6.1, 6.2, 6.5). This is the ONLY path that presents
   * `CANCELLED` — a panel-dispose abort never does (abort ≠ cancel, §B.8; that
   * path is {@link dispose}, which only aborts the SSE subscription).
   *
   * Sequence:
   *  1. Resolve the supervised run id; absent → nothing to cancel, return.
   *  2. `port.cancel(runId)` → `cancelRun`. On `!ok` surface the notice and
   *     return (leave the phase untouched).
   *  3. On success the run is a terminal Core-cancel (`status:'CANCELLED'`,
   *     `errorCode:'CANCELLED'`, `outcome:'NONE'`). Native ACK is NOT in the run
   *     result, so per §B.5 the controller sets `CANCELLED` then immediately
   *     `CLEANUP` and stays there until the worker settles: `onWorkerStatus`
   *     transitions `CLEANUP → IDLE` on stage `AGENT_ENDED` (Requirement 6.6).
   *  4. Clear `activeRunId` (the run is terminal) but keep the phase in
   *     `CLEANUP`. Set {@link cancelRequested} so the in-flight
   *     {@link superviseRun}, when its watch resolves to the now-terminal
   *     CANCELLED run, leaves the phase at `CLEANUP` instead of re-classifying
   *     it. The live watch is NOT force-aborted: the run is terminal so the
   *     watch resolves on its own; force-aborting would look like a
   *     panel-dispose abort to `superviseRun` and is unnecessary here.
   */
  async cancelActive(): Promise<void> {
    if (this.disposed) return;
    const runId = this.currentRunId();
    if (!runId) {
      // Nothing is being supervised — nothing to cancel.
      return;
    }

    const binding = this.bindingVersion;
    const res = await this.deps.port.cancel(runId);
    if (this.disposed || binding !== this.bindingVersion) return;
    if (!res.ok) {
      this.notify(res.error);
      return;
    }

    // Core-cancel accepted. Set CANCELLED then immediately CLEANUP (§B.5): the
    // native ACK is not in the run result, so remain in CLEANUP until the worker
    // settles (AGENT_ENDED → IDLE via onWorkerStatus).
    this.setBuilder({ phase: "CANCELLED" });
    this.setBuilder({ phase: this.vm.worker?.stage === "AGENT_ENDED" ? "IDLE" : "CLEANUP" });

    // The run is terminal; clear the supervised id but keep phase in CLEANUP.
    this.activeRunId = null;
    // Tell the in-flight superviseRun not to re-classify the terminal CANCELLED
    // run over our CLEANUP phase (coordination flag; reset by superviseRun).
    this.cancelRequested = true;

    this.deps.onChange();
  }

  // --- BEHAVIOR (task 5.4): window-switch reload recovery ---

  /**
   * Recover an in-progress Builder run after a window-switch reload (design
   * §A.4 recovery sequence / §B.5; Requirements 3.1–3.5). Called on extension
   * reactivation (e.g. from the provider's `resolveWebviewView`).
   *
   * Starting a Builder run may `openFolder` and reload the extension host,
   * which drops the SSE stream. This re-binds to any still-active Builder run
   * and replays its full turn from sequence 0 so the transcript / tool rows are
   * reconstructed rather than lost (Requirement 3.3 / §Correctness Property 6).
   *
   * Non-throwing. Sequence:
   *  1. Read `bhlr.lastProjectId`; absent → return, leaving the surface IDLE.
   *  2. `listActiveBuilderRun`; on a port error surface a notice and return; on
   *     `ok(null)` (no active Builder run) leave the phase IDLE and return
   *     (Requirement 3.4).
   *  3. An active BUILDER run exists → enter `RECOVERING`, then `prepareBuilder`
   *     to re-read the durable task binding. If prepare fails we cannot rebind
   *     the task, so fall back to IDLE with a notice rather than stranding the
   *     surface in RECOVERING.
   *  4. Record the active run id and hand off to {@link superviseRun} with
   *     `after: 0` — a FULL replay (Requirement 3.3). superviseRun sets RUNNING
   *     and streams from sequence 0.
   *
   * Worker status is already subscribed in the constructor, so window-switch
   * stages (WORKSPACE_SWITCHING / _UNCONFIRMED / _FAILED) surface via
   * {@link onWorkerStatus} during recovery with no extra wiring here
   * (Requirement 3.5).
   */
  async recover(): Promise<void> {
    if (this.disposed) return;
    const projectId = this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      // No persisted project → nothing to recover; leave the surface IDLE.
      return;
    }
    this.lastProjectId = projectId;
    const binding = this.bindingVersion;
    await this.reprojectFromSnapshot(projectId);
    if (this.disposed || binding !== this.bindingVersion || this.activeRunId) return;

    const active = await this.deps.port.listActiveBuilderRun(projectId);
    if (this.disposed || binding !== this.bindingVersion || this.activeRunId) return;
    if (!active.ok) {
      // Could not list runs; surface a notice and leave the phase IDLE.
      this.notify(active.error);
      return;
    }
    if (!active.value) {
      // Restore durable completion/Decision state, never fabricate a run or
      // restart an Agent. Read after the active-run check to avoid a stale task.
      await this.reprojectFromSnapshot(projectId, true);
      return;
    }

    // An active Builder run exists: show RECOVERING while we re-bind the task.
    this.setBuilder({ phase: "RECOVERING" });
    this.deps.onChange();

    const task = await this.deps.port.prepareBuilder(projectId);
    if (this.disposed || binding !== this.bindingVersion || this.activeRunId) return;
    if (!task.ok) {
      // Cannot re-read the durable task binding to rebind the run. Prefer
      // dropping back to IDLE with a notice over stranding it in RECOVERING.
      this.setBuilder({ phase: "IDLE" });
      this.notify(task.error);
      return;
    }

    this.activeRunId = active.value.id;
    // after: 0 → FULL replay of the recovered run (Requirement 3.3 / Property 6).
    // superviseRun sets RUNNING and streams from sequence 0.
    await this.superviseRun(
      projectId,
      active.value.id,
      0,
      task.value.taskId,
      "builder",
    );
  }

  // --- BEHAVIOR (task 5.5): start a read-only Helper run + read-back ---

  /**
   * Start a live, read-only Helper run for the project's current task
   * (design §B.6; Requirements 4.1–4.6).
   *
   * Helper is strictly read-only: it NEVER resumes Builder and NEVER resolves a
   * Decision as a side effect (Requirement 4.2 / §Correctness Property 2). This
   * method (and the `superviseRun(..., 'helper')` it hands off to) therefore
   * never calls {@link startBuilder} nor issues a `UI_RESOLVE_DECISION`.
   *
   * Non-throwing: every failure resolves through the port's {@link AgentResult}
   * and moves the Helper turn to `FAILED` with a mapped code + notice.
   *
   * Sequence:
   *  1. Resolve the project id from the bound `lastProjectId` (falling back to
   *     persisted `bhlr.lastProjectId`); absent → Helper `FAILED`
   *     (`PROJECT_REQUIRED`).
   *  2. Determine the current task from a FRESH durable snapshot (for
   *     correctness); no current task → Helper `FAILED` (`TASK_REQUIRED`).
   *  3. Enter Helper `RUNNING`, clear `errorCode`, reset the transcript for the
   *     new turn, clear `windowOpening`; re-hydrate.
   *  4. `startHelper`; a start-time rejection (decision_binding_mismatch /
   *     helper_empty_response / native_role_catalog_unverified, already mapped
   *     by `toAgentError`) → Helper `FAILED` with the code + notice
   *     (Requirement 4.6).
   *  5. Otherwise record the run id and hand off to {@link superviseRun} with a
   *     full replay-from-start (`after: run.retainedFromSequence`); the terminal
   *     read-back is done by {@link applyHelperTerminal}.
   */
  startHelper(input: {
    message: string;
    origin: "FREE_TEXT" | "QUICK_ACTION";
    decisionId?: string;
  }): Promise<void> {
    if (this.helperFlight) return this.helperFlight;
    if (this.disposed) return Promise.resolve();
    const flight = this.startHelperTurn(input).finally(() => {
      if (this.helperFlight === flight) this.helperFlight = null;
    });
    this.helperFlight = flight;
    return flight;
  }

  private async startHelperTurn(input: {
    message: string;
    origin: "FREE_TEXT" | "QUICK_ACTION";
    decisionId?: string;
  }): Promise<void> {
    const projectId =
      this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.fail("helper", "invalid", "PROJECT_REQUIRED");
      return;
    }
    this.lastProjectId = projectId;
    const binding = this.bindingVersion;

    // Determine the current task from a fresh durable snapshot for correctness
    // (design §B.6: Helper binds to the current Task; prefer a fresh read over
    // the possibly-stale `vm.builder.taskId`).
    const snap = await this.deps.port.snapshot(projectId);
    if (this.disposed || binding !== this.bindingVersion) return;
    if (!snap.ok) {
      this.fail("helper", snap.error.code, snap.error.raw);
      return;
    }
    const taskId = snap.value.currentTask?.id ?? null;
    if (!taskId) {
      this.fail("helper", "invalid", "TASK_REQUIRED");
      return;
    }

    // New Helper turn: RUNNING, clear the prior error, reset the transcript, and
    // clear any stale window-opening indicator; re-hydrate.
    this.setHelper({
      phase: "RUNNING",
      errorCode: null,
      transcript: [],
      windowOpening: false,
    });
    this.deps.onChange();

    const started = await this.deps.port.startHelper({
      projectId,
      taskId,
      decisionId: input.decisionId,
      message: input.message,
      origin: input.origin,
    });
    if (this.disposed || binding !== this.bindingVersion) return;
    if (!started.ok) {
      // Requirement 4.6: DECISION_BINDING_MISMATCH / HELPER_EMPTY_RESPONSE /
      // NATIVE_ROLE_CATALOG_UNVERIFIED (and any other rejection) → FAILED.
      this.setHelper({ phase: "FAILED", errorCode: started.error.code });
      this.notify(started.error);
      return;
    }

    // CRITICAL (Requirement 4.2): this must NEVER trigger startBuilder or a
    // UI_RESOLVE_DECISION — superviseRun('helper') only reads back via
    // applyHelperTerminal.
    await this.superviseRun(
      projectId,
      started.value.id,
      started.value.retainedFromSequence,
      taskId,
      "helper",
    );
  }

  /**
   * Project a terminal Helper run into the Helper view model (design §B.6;
   * Requirements 4.3, 4.4, 4.6).
   *
   * Success is `run.outcome === 'HELPER_RECORDED'` (the `outcome` field on
   * {@link LocalRun}); the recorded conversation content is read back from the
   * After_Snapshot's `helperConversations` (via the already-awaited
   * {@link reprojectFromSnapshot} in the supervise loop), NEVER from the live
   * text alone (Requirement 4.4). Any other terminal outcome (failed /
   * cancelled) moves the turn to `FAILED`, carrying `run.errorCode` when
   * present.
   *
   * This is read-only: it sets Helper phase / errorCode only and never touches
   * the Builder turn or a Decision (Requirement 4.2).
   */
  private applyHelperTerminal(
    run: LocalRun,
    _after: ProjectSessionSnapshot,
    _taskId: string,
  ): void {
    if (run.status === "SUCCEEDED" && run.outcome === "HELPER_RECORDED") {
      // Requirement 4.3: recorded. The conversations are projected from the
      // After_Snapshot by reprojectFromSnapshot (called in superviseRun before
      // this); clear any prior error.
      this.setHelper({ phase: "RECORDED", errorCode: null });
      return;
    }
    // Not recorded (e.g. failed / cancelled): surface FAILED with the run's
    // error code when present (Requirement 4.6).
    this.setHelper({ phase: "FAILED", errorCode: run.errorCode ?? null });
    this.notice("error", run.errorCode ?? "HELPER_NOT_RECORDED",
      errorGuidance(run.errorCode ?? "") ?? runtimeErrorMessage(run.errorCode ?? "", "Helper 응답을 저장하지 못했어요. 상태를 확인한 뒤 다시 시도해 주세요."));
  }

  // --- BEHAVIOR (task 5.6): resolve a Decision + explicit Builder resume ---

  /**
   * Resolve a Decision from the LATEST durable snapshot and the user's explicit
   * input (design §B.7; Requirements 5.1, 5.2, 5.4, 5.5, 5.6).
   *
   * CRITICAL (Requirement 5.3 / §Correctness Property 2): this method NEVER
   * calls {@link startBuilder}. Resolving a Decision must not auto-resume the
   * Builder — the webview shows an explicit "Builder 다시 시작" action which
   * routes to {@link resumeAfterDecision}, the only decision-adjacent path that
   * starts Builder. Verify by inspection: there is no `startBuilder` call below.
   *
   * `input.selection` is the SDK's {@link DecisionSelection} shape, which is
   * structurally identical to the webview action's `selection`
   * (`{kind:'OPTION',optionId} | {kind:'RECOMMENDATION'} | {kind:'CUSTOM',customProposal}`),
   * so the webview gesture passes through unchanged into
   * {@link createDecisionResolutionRequest}. `rationale` is forwarded verbatim
   * (Requirement 5.2) — never synthesized.
   *
   * Non-throwing except the deliberate rethrow of a non-{@link DecisionInputError}
   * error, which would be a real bug rather than a rejected user input.
   *
   * Sequence:
   *  1. Resolve the project id from the bound `lastProjectId` (falling back to
   *     persisted `bhlr.lastProjectId`); absent → `fail('decision', 'invalid',
   *     'PROJECT_REQUIRED')`.
   *  2. Read the latest durable snapshot (`port.snapshot`); on a port error
   *     surface the notice and return.
   *  3. Build the `UI_RESOLVE_DECISION` request via
   *     {@link createDecisionResolutionRequest}. A {@link DecisionInputError}
   *     (a rejected user input) → a `DECISION_INPUT_<code>` notice with NO
   *     `execute` call (Requirement 5.5); any other throw is rethrown.
   *  4. `port.execute` the request. On rejection (e.g.
   *     `decision_already_resolved` / `live_context_stale`) re-project from the
   *     snapshot first, THEN surface the mapped notice (Requirement 5.6).
   *  5. On success re-project from the snapshot (`resolved: true`; `applied` may
   *     still be false). Do NOT resume Builder (Requirement 5.3). Surface an
   *     info notice; `reprojectFromSnapshot` re-hydrates.
   */
  async resolveDecision(input: {
    decisionId: string;
    selection: DecisionSelection;
    rationale?: string;
    helperUsed: boolean;
  }): Promise<void> {
    if (this.disposed) return;
    const binding = this.bindingVersion;
    const projectId =
      this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.fail("decision", "invalid", "PROJECT_REQUIRED");
      return;
    }
    this.lastProjectId = projectId;

    // Latest durable truth — the request is built against the freshest snapshot.
    const snap = await this.deps.port.snapshot(projectId);
    if (!this.isCurrentBinding(binding)) return;
    if (!snap.ok) {
      this.notify(snap.error);
      return;
    }

    let request: ReturnType<typeof createDecisionResolutionRequest>;
    try {
      // rationale forwarded verbatim (Requirement 5.2): pass input through as-is.
      request = createDecisionResolutionRequest(snap.value, input);
    } catch (e) {
      if (e instanceof DecisionInputError) {
        // Rejected user input (Requirement 5.5): notice only, NO execute call.
        this.notice("error", `DECISION_INPUT_${e.code}`, e.message);
        return;
      }
      // A non-DecisionInputError is a real bug, not a rejected input → rethrow.
      throw e;
    }

    const res = await this.deps.port.execute(request);
    if (!this.isCurrentBinding(binding)) return;
    if (!res.ok) {
      // On DECISION_ALREADY_RESOLVED / LIVE_CONTEXT_STALE (and any rejection),
      // re-read durable truth and re-project BEFORE surfacing the notice so the
      // webview reflects the current resolution state (Requirement 5.6).
      await this.reprojectFromSnapshot(projectId);
      if (!this.isCurrentBinding(binding)) return;
      this.notify(res.error);
      return;
    }

    // Resolved. `applied` may still be false until the next Builder run applies
    // it — reprojectFromSnapshot refreshes decisions (resolved:true) and
    // re-hydrates. NO auto-resume of Builder (Requirement 5.3 / Property 2).
    await this.reprojectFromSnapshot(projectId);
    if (!this.isCurrentBinding(binding)) return;
    this.notice("info", "DECISION_RESOLVED", "");
  }

  /**
   * Explicit, user-initiated Builder resume after a Decision was resolved
   * (design §B.7; Requirement 5.3). This is the ONLY decision-adjacent path
   * (besides a fresh Builder start) that starts a Builder run after a Decision,
   * and it runs only in response to the explicit `builder/resumeAfterDecision`
   * webview action — never as a side effect of {@link resolveDecision}
   * (§Correctness Property 2).
   *
   * Per §B.7 the user explicitly starts a new Builder run; there may be no new
   * message, so this delegates to {@link startBuilder} with an empty message
   * (the Builder reads the resolved Decision via `get_builder_task`).
   */
  async resumeAfterDecision(): Promise<void> {
    await this.startBuilder("");
  }

  // --- shared HELPER methods (part of 5.1; consumed by 5.2–5.8) ---

  /**
   * Merge `patch` into `vm.builder` and reassign `vm`. Pure state update only —
   * does NOT call `onChange` (callers batch change notifications).
   */
  private setBuilder(patch: Partial<BuilderTurnViewModel>): void {
    this.vm = { ...this.vm, builder: { ...this.vm.builder, ...patch } };
  }

  /**
   * Merge `patch` into `vm.helper` and reassign `vm`. Pure state update only —
   * does NOT call `onChange` (callers batch change notifications).
   */
  private setHelper(patch: Partial<HelperViewModel>): void {
    this.vm = { ...this.vm, helper: { ...this.vm.helper, ...patch } };
  }

  /**
   * Set the last notice (error / info) and re-hydrate. The raw transport error
   * is never surfaced — only a stable `{ kind, code, message }`.
   */
  private notice(
    kind: NoticeViewModel["kind"],
    code: string,
    message: string,
  ): void {
    if (this.disposed) return;
    this.vm = { ...this.vm, notice: { kind, code,
      message: runtimeErrorMessage(code, runtimeErrorMessage(message, message)) } };
    this.deps.onChange();
  }

  /** Convenience: surface an {@link AgentError} as an error notice. */
  private notify(error: AgentError): void {
    this.notice("error", error.code, error.message);
  }

  /**
   * Record a failure on a surface and re-hydrate. Generic on purpose: it sets
   * the notice and, for `'builder'`, records `errorCode`; for `'helper'`, moves
   * the Helper turn to `FAILED` with the code. The exact terminal Builder phase
   * (START_ERROR vs FAILED) is decided by the caller in 5.2 / 5.5; this helper
   * stays minimal and does not presume a phase for `'builder'` / `'decision'`.
   */
  private fail(
    surface: "builder" | "helper" | "decision",
    code: string,
    message: string,
  ): void {
    if (surface === "builder") {
      this.setBuilder({ errorCode: code });
    } else if (surface === "helper") {
      this.setHelper({ phase: "FAILED", errorCode: code });
    }
    // 'decision' has no dedicated turn phase — the notice carries the failure.
    this.notice("error", code, message);
  }

  /**
   * Fold one projected run event into the turn view model and re-hydrate so
   * streaming renders live (design §B.5 calls `onChange` in the `onEvent`
   * callback; the supervise loop in 5.2 wires this in).
   *
   * - `'builder'`: delegate to the pure {@link reduceEvent} over `vm.builder`.
   * - `'helper'`: append TEXT lines to `vm.helper.transcript`; TOOL / STATE /
   *   PERMISSION_DENIED events are ignored for the read-only Helper transcript.
   */
  private applyEvent(surface: "builder" | "helper", view: RunEventView): void {
    if (surface === "builder") {
      this.vm = { ...this.vm, builder: reduceEvent(this.vm.builder, view) };
    } else if (view.kind === "TEXT") {
      this.setHelper({
        transcript: [
          ...this.vm.helper.transcript,
          { sequence: view.sequence, text: view.text },
        ],
      });
    }
    this.deps.onChange();
  }

  /**
   * Classify a raw worker status code and project it for display
   * (design §B.15). Never branches product logic on the raw suffix — it
   * delegates to {@link classifyNativeWorkerStatus}. Settles the Builder
   * cleanup: `CLEANUP → IDLE` when the worker reaches an `AGENT_ENDED` stage
   * (Requirement 6.6 / §Correctness Property 5).
   */
  private onWorkerStatus(code: string): void {
    if (this.disposed) return;
    const view = classifyNativeWorkerStatus(code);
    this.vm = { ...this.vm, worker: view };
    if (view?.stage === "AGENT_ENDED" && this.vm.builder.phase === "CLEANUP") {
      this.setBuilder({ phase: "IDLE" });
    }
    // Helper window opening (Windows opens a separate helper Kiro window,
    // design §B.6 / Requirement 4.5): reflect the worker's
    // HELPER_WINDOW_OPENING stage in helper.windowOpening while a Helper turn is
    // RUNNING. Cleared when the stage moves on so the indicator does not linger.
    if (this.vm.helper.phase === "RUNNING") {
      this.setHelper({
        windowOpening: view?.stage === "HELPER_WINDOW_OPENING",
      });
    }
    this.deps.onChange();
  }

  /**
   * Re-read the project's native questions and re-project the list
   * (design §B.10 / §B.15; Requirements 7.1, 7.8). Native questions are
   * host-memory only, so this simply re-lists on each `subscribeUserInputs`
   * notify — they are lost on reload and are never persisted (Requirement 7.8).
   *
   * When no project is bound yet, the list is cleared and the surface
   * re-hydrated. Otherwise every {@link NativeQuestion} returned by
   * `listUserInputs` is projected into a safe {@link NativeQuestionViewModel}
   * (requestId / nativeJobId / role / status / question and the option tree with
   * title / description / recommended / subOptionsLabel / subOptions). No
   * `projectId` / `taskId` / `discoverySessionId` (host-side correlation fields)
   * cross into the projection.
   */
  private refreshNativeQuestions(): void {
    if (this.disposed) return;
    if (this.lastProjectId === null) {
      if (this.vm.nativeQuestions.length > 0) {
        this.vm = { ...this.vm, nativeQuestions: [] };
      }
      this.deps.onChange();
      return;
    }

    const questions = this.deps.port.listUserInputs(this.lastProjectId);
    const projected: NativeQuestionViewModel[] = questions.map((q) => ({
      requestId: q.requestId,
      nativeJobId: q.nativeJobId,
      role: q.role,
      status: q.status,
      question: q.question,
      options: q.options.map((o) => ({
        title: o.title,
        ...(o.description !== undefined ? { description: o.description } : {}),
        recommended: o.recommended,
        ...(o.subOptionsLabel !== undefined
          ? { subOptionsLabel: o.subOptionsLabel }
          : {}),
        subOptions: (o.subOptions ?? []).map((s) => ({
          title: s.title,
          ...(s.description !== undefined ? { description: s.description } : {}),
        })),
      })),
    }));

    this.vm = { ...this.vm, nativeQuestions: projected };
    this.deps.onChange();
  }

  // --- BEHAVIOR (task 5.7): submit a native answer verbatim ---

  /**
   * Submit a native user-input answer, exactly as the user chose (design
   * §B.10; Requirements 7.2–7.7 / §Correctness Property 9).
   *
   * The System NEVER auto-answers and NEVER synthesizes or modifies the answer:
   * `answer` is passed through to `submitUserInput` verbatim (Requirement 7.5 /
   * Property 9). Before submitting, the referenced question is validated against
   * the current durable snapshot so a stale or mis-bound question is rejected
   * client-side without reaching the worker (Requirements 7.3, 7.4).
   *
   * Non-throwing. Sequence:
   *  1. Find the referenced question via `listUserInputs(answer.projectId)`
   *     matched on `requestId`. Missing → `NATIVE_USER_INPUT_STALE` notice, no
   *     submit (Requirement 7.3). Questions are host-memory only, so a reload
   *     legitimately drops them (Requirement 7.8).
   *  2. Read the current durable snapshot; on a port error surface the notice
   *     and return.
   *  3. Check the question's role / task / discovery-session binding is
   *     consistent with the snapshot ({@link isConsistentWithSnapshot}).
   *     Inconsistent → `NATIVE_USER_INPUT_STALE` notice, no submit
   *     (Requirement 7.4).
   *  4. `port.submit(answer)` — verbatim. On rejection (`native_user_input_stale`
   *     / `native_response_invalid` / `native_not_ready`) surface the mapped
   *     notice (Requirement 7.7).
   *  5. On success surface an info notice `NATIVE_<result>` (SUBMITTED /
   *     ALREADY_SUBMITTED / ALREADY_HANDLED, Requirement 7.6) and re-list the
   *     native questions.
   */
  /**
   * Webview entry point for {@link submitNativeAnswer} (design §B.10 / §B.16;
   * Requirements 7.2–7.7). The untrusted webview `native/answer` action carries
   * only `requestId` / `nativeJobId` / `answer` — it CANNOT supply a trusted
   * `projectId`, so the dispatcher never composes one. This wrapper binds the
   * host-owned project id (`lastProjectId`, falling back to persisted
   * `bhlr.lastProjectId`) and composes the full {@link NativeAnswer} before
   * delegating to {@link submitNativeAnswer}. If no project is bound the answer
   * is not submitted and a `PROJECT_REQUIRED` notice is surfaced.
   *
   * `input.answer` is the webview {@link NativeAnswer} variant union
   * (`{action:'dismissed'} | {action:'answered';answer} |
   * {action:'answered';optionIndex;subOptionIndices}`), which is structurally
   * the SDK `NativeAnswer` variant, so it is spread through verbatim — the
   * answer is never modified or auto-answered (Requirement 7.5 / Property 9).
   */
  async submitNativeAnswerAction(input: {
    requestId: string;
    nativeJobId: string;
    answer:
      | { readonly action: "dismissed" }
      | { readonly action: "answered"; readonly answer: string }
      | {
          readonly action: "answered";
          readonly optionIndex: number;
          readonly subOptionIndices: readonly number[];
        };
  }): Promise<void> {
    if (this.disposed) return;
    const projectId =
      this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.notice("error", "PROJECT_REQUIRED", "no project bound");
      return;
    }
    this.lastProjectId = projectId;

    // Compose the trusted NativeAnswer: host-bound projectId + the webview's
    // requestId / nativeJobId / answer variant (spread verbatim).
    const answer = {
      projectId,
      nativeJobId: input.nativeJobId,
      requestId: input.requestId,
      ...input.answer,
    } as NativeAnswer;

    await this.submitNativeAnswer(answer);
  }

  async submitNativeAnswer(answer: NativeAnswer): Promise<void> {
    if (this.disposed) return;
    const binding = this.bindingVersion;
    if (answer.projectId !== this.lastProjectId) {
      this.notice("error", "NATIVE_USER_INPUT_STALE", "project binding changed");
      return;
    }
    // Locate the referenced question in the host's current in-memory list.
    const q = this.deps.port
      .listUserInputs(answer.projectId)
      .find((x) => x.requestId === answer.requestId);
    if (!q) {
      // Host-memory only; lost on reload. Missing → stale (Requirement 7.3).
      this.notice(
        "error",
        "NATIVE_USER_INPUT_STALE",
        "question no longer present",
      );
      return;
    }

    // Validate the question's binding against the current durable snapshot.
    const snap = await this.deps.port.snapshot(answer.projectId);
    if (!this.isCurrentBinding(binding)) return;
    if (!snap.ok) {
      this.notify(snap.error);
      return;
    }
    if (!isConsistentWithSnapshot(q, snap.value)) {
      // Role/task (or discovery-session) mismatch → stale (Requirement 7.4).
      this.notice("error", "NATIVE_USER_INPUT_STALE", "role/task mismatch");
      return;
    }

    // Submit exactly the user's answer — never auto-answer, never modify
    // (Requirement 7.5 / §Correctness Property 9). `answer` passes through as-is.
    const res = await this.deps.port.submit(answer);
    if (!this.isCurrentBinding(binding)) return;
    if (!res.ok) {
      // NATIVE_USER_INPUT_STALE / NATIVE_USER_INPUT_RESPONSE_INVALID /
      // NATIVE_NOT_READY → mapped notice (Requirement 7.7).
      this.notify(res.error);
      return;
    }

    // Success value SUBMITTED / ALREADY_SUBMITTED / ALREADY_HANDLED → info
    // notice (Requirement 7.6), then re-list (host-memory only).
    this.notice("info", `NATIVE_${res.value}`, "");
    this.refreshNativeQuestions();
  }

  // --- BEHAVIOR (task 5.8): workspace open / launch / evidence / final upgrade ---

  /**
   * Open the generated workspace for a task in the host editor (design §B.11;
   * Requirements 8.1–8.4 / §Correctness Property 7).
   *
   * The absolute `workspaceDirectory` returned by `UI_PREPARE_BUILDER_SESSION`
   * is a HOST-ONLY value: it is consumed solely by the injected
   * {@link AgentControllerDeps.openFolder} and is NEVER placed into any
   * projection / notice / view model (Requirement 8.4 / Property 7). It is not
   * stored on the controller either.
   *
   * Non-throwing. Sequence:
   *  1. Resolve the project id (bound `lastProjectId`, else persisted
   *     `bhlr.lastProjectId`); absent → `PROJECT_REQUIRED` error notice, return.
   *  2. Idle-check: `listActiveBuilderRun`; on a port error notify and return;
   *     if an active BUILDER run exists (`isRunActive`), surface a `RUN_ACTIVE`
   *     notice and do NOT open a workspace (Requirement 8.1).
   *  3. `execute` `UI_PREPARE_BUILDER_SESSION` with purpose `WORKSPACE_VIEW`
   *     (Requirement 8.2); on a port error notify and return.
   *  4. Pass the returned absolute `workspaceDirectory` ONLY to the host-side
   *     `openFolder` (Requirement 8.3). Never message it.
   */
  async openGeneratedWorkspace(taskId: string): Promise<void> {
    if (this.disposed) return;
    const binding = this.bindingVersion;
    const projectId =
      this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.notice("error", "PROJECT_REQUIRED", "no project bound");
      return;
    }
    this.lastProjectId = projectId;

    // Idle check (Requirement 8.1): must not open while a Builder run is active.
    const active = await this.deps.port.listActiveBuilderRun(projectId);
    if (!this.isCurrentBinding(binding)) return;
    if (!active.ok) {
      this.notify(active.error);
      return;
    }
    if (active.value && isRunActive(active.value)) {
      this.notice("error", "RUN_ACTIVE", "finish or stop first");
      return;
    }

    const res = await this.deps.port.execute({
      ...uiMetadata(),
      kind: "UI_PREPARE_BUILDER_SESSION",
      purpose: "WORKSPACE_VIEW",
      projectId,
      taskId,
    });
    if (!this.isCurrentBinding(binding)) return;
    if (!res.ok) {
      this.notify(res.error);
      return;
    }

    // res.value.workspaceDirectory is a HOST-ONLY absolute path (§B.11 /
    // Requirement 8.4 / Property 7): hand it ONLY to openFolder. Never store it
    // on the controller and never place it in any message / notice / vm.
    await this.deps.openFolder(res.value.workspaceDirectory);
  }

  /**
   * Launch the running result of the project in a browser (design §B.12;
   * Requirements 9.1–9.4).
   *
   * Non-throwing. Sequence:
   *  1. Resolve the project id; absent → `PROJECT_REQUIRED` error notice, return.
   *  2. `execute` `UI_LAUNCH_RESULT` with a fresh Idempotency_Key
   *     (Requirement 9.1); on a port error (any `RESULT_*` → `result_unavailable`)
   *     notify and return (Requirement 9.4).
   *  3. The response is a discriminated union on `status`. Only the `RUNNING`
   *     branch carries a validated `http://127.0.0.1:<port>/` `url`
   *     (contract-validated via `z.ZodURL`). Any other status → a
   *     `RESULT_NOT_RUNNING` notice and NO URL open (Requirement 9.3);
   *     `RUNNING` → `openExternal(url)` host-side (Requirement 9.2).
   */
  async launchResult(): Promise<void> {
    if (this.disposed) return;
    const binding = this.bindingVersion;
    const projectId =
      this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.notice("error", "PROJECT_REQUIRED", "no project bound");
      return;
    }
    this.lastProjectId = projectId;

    const res = await this.deps.port.execute({
      ...uiMetadata(),
      kind: "UI_LAUNCH_RESULT",
      idempotencyKey: entityId("idem"),
      projectId,
    });
    if (!this.isCurrentBinding(binding)) return;
    if (!res.ok) {
      // RESULT_* → result_unavailable (mapped by toAgentError).
      this.notify(res.error);
      return;
    }

    if (res.value.status !== "RUNNING") {
      // READY (or any non-RUNNING status): nothing to open (Requirement 9.3).
      this.notice("error", "RESULT_NOT_RUNNING", String(res.value.status));
      return;
    }

    // RUNNING branch carries the contract-validated 127.0.0.1 URL. Host-side
    // open only (Requirement 9.2); the URL is not a secret / absolute path.
    await this.deps.openExternal(res.value.url);
  }

  /**
   * Read and project the project's evidence trace honestly (design §B.13;
   * Requirements 10.1, 10.5).
   *
   * The controller only PROJECTS via {@link summarizeEvidenceTrace}; the honest
   * display rules (OBSERVED_ONLY / `userUnderstandingCount === 0` never shown as
   * understanding; ANALYZED with `acceptedCount === 0` shows `noEvidenceReason`)
   * are carried faithfully by the view and enforced by the render (task 9). The
   * dispatcher (task 7) posts the returned view as `agent/evidence`; for 5.8
   * returning it is sufficient.
   *
   * Non-throwing. Resolves the project id (absent → notice + `null`),
   * `execute`s `UI_READ_EVIDENCE_TRACE` (with an optional `conceptId`), and on
   * success returns `summarizeEvidenceTrace(projectId, res.value)`; on a port
   * error surfaces a notice and returns `null`.
   */
  async readEvidence(conceptId?: string): Promise<EvidenceTraceView | null> {
    if (this.disposed) return null;
    const binding = this.bindingVersion;
    const projectId =
      this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.notice("error", "PROJECT_REQUIRED", "no project bound");
      return null;
    }
    this.lastProjectId = projectId;

    const res = await this.deps.port.execute({
      ...uiMetadata(),
      kind: "UI_READ_EVIDENCE_TRACE",
      projectId,
      ...(conceptId ? { conceptId } : {}),
    });
    if (!this.isCurrentBinding(binding)) return null;
    if (!res.ok) {
      this.notify(res.error);
      return null;
    }

    // Analysis can finish after the Helper run. An explicit evidence refresh
    // also refreshes the recorded conversation badge, without polling or any
    // Agent invocation. Do not combine old-project evidence with a new view.
    await this.reprojectFromSnapshot(projectId);
    if (!this.isCurrentBinding(binding)) return null;
    // The response is the raw ProjectEvidenceTrace; project it honestly.
    return summarizeEvidenceTrace(projectId, res.value);
  }

  /**
   * Read the RAW project evidence trace (design §B.13/§B.14). Used by
   * {@link listFinalUpgradeCandidates} for the `eligibleFinalUpgradeTraces`
   * pre-filter, which needs the raw {@link ProjectEvidenceTrace} rather than the
   * summarized {@link EvidenceTraceView}. Non-throwing: returns `null` on a port
   * error (the caller decides how to surface it).
   */
  private async readEvidenceTraceRaw(
    projectId: string,
  ): Promise<ProjectEvidenceTrace | null> {
    if (this.disposed || projectId !== this.lastProjectId) return null;
    const binding = this.bindingVersion;
    const res = await this.deps.port.execute({
      ...uiMetadata(),
      kind: "UI_READ_EVIDENCE_TRACE",
      projectId,
    });
    if (!this.isCurrentBinding(binding)) return null;
    if (!res.ok) {
      this.notify(res.error);
      return null;
    }
    return res.value;
  }

  /**
   * Retry a failed evidence analysis job (design §B.13; Requirement 10.5).
   *
   * Non-throwing. Resolves the project id (absent → notice), `execute`s
   * `UI_RETRY_ANALYSIS` with a fresh Idempotency_Key and the caller's
   * `analysisJobId` / `expectedJobRevision`; on a port error surfaces a notice,
   * and on success returns the re-read evidence trace for the dispatcher.
   * Duplicate clicks for the same bound job revision are ignored while the
   * mutation/read is pending; a failed attempt permits a new explicit retry.
   */
  async retryAnalysis(
    analysisJobId: string,
    expectedJobRevision: number,
  ): Promise<EvidenceTraceView | null> {
    if (this.disposed) return null;
    const binding = this.bindingVersion;
    const projectId =
      this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.notice("error", "PROJECT_REQUIRED", "no project bound");
      return null;
    }
    this.lastProjectId = projectId;
    const key = JSON.stringify([binding, analysisJobId]);
    if (this.analysisRetries.has(key)) return null;
    this.analysisRetries.add(key);
    try {
      let revision = expectedJobRevision;
      // The existing EvidenceTraceView omits revisions. Its button uses 0 to
      // request a durable lookup; never send that sentinel to Core. Explicit
      // positive revisions keep Core's optimistic concurrency check intact.
      if (revision === 0) {
        const jobs = await this.deps.port.execute({
          ...uiMetadata(), kind: "UI_READ_ANALYSIS_JOBS", projectId,
          status: "FAILED", limit: 100,
        });
        if (!this.isCurrentBinding(binding)) return null;
        if (!jobs.ok) { this.notify(jobs.error); return null; }
        const job = jobs.value.find((item) => item.id === analysisJobId && item.status === "FAILED");
        if (!job) {
          this.notice("error", "ANALYSIS_JOB_NOT_RETRYABLE", "재시도할 실패한 분석을 찾지 못했어요. 근거를 새로 조회해 주세요.");
          return null;
        }
        revision = job.revision;
      }
      const res = await this.deps.port.execute({
        ...uiMetadata(),
        kind: "UI_RETRY_ANALYSIS",
        idempotencyKey: entityId("idem"),
        projectId,
        analysisJobId,
        expectedJobRevision: revision,
      });
      if (!this.isCurrentBinding(binding)) return null;
      if (!res.ok) {
        this.notify(res.error);
        return null;
      }
      // The read checks the binding again, including project switch-and-back.
      return await this.readEvidence();
    } finally {
      this.analysisRetries.delete(key);
    }
  }

  /**
   * List the final-upgrade candidates eligible from the current evidence
   * (design §B.14; Requirement 11.1).
   *
   * The UI pre-filter is `eligibleFinalUpgradeTraces(snapshot, trace)` — a trace
   * qualifies only when its Helper turn has a recorded answer. Core re-checks
   * every condition on prepare and rejects stale choices with `FINAL_UPGRADE_*`,
   * so this list is advisory (design §B.14 doc). Non-throwing: on any port error
   * or a missing trace it surfaces a notice (already done by the helpers) and
   * returns `[]`. A detached view returns `null` so the dispatcher does not
   * clear a newly bound project's candidate list with this old response.
   */
  async listFinalUpgradeCandidates(): Promise<FinalUpgradeCandidate[] | null> {
    if (this.disposed) return null;
    const binding = this.bindingVersion;
    const projectId =
      this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.notice("error", "PROJECT_REQUIRED", "no project bound");
      return [];
    }
    this.lastProjectId = projectId;

    const snap = await this.deps.port.snapshot(projectId);
    if (!this.isCurrentBinding(binding)) return null;
    if (!snap.ok) {
      this.notify(snap.error);
      return [];
    }

    const trace = await this.readEvidenceTraceRaw(projectId);
    if (!this.isCurrentBinding(binding)) return null;
    return trace ? eligibleFinalUpgradeTraces(snap.value, trace) : [];
  }

  /**
   * Prepare a final-upgrade task from an eligible evidence trace (design §B.14;
   * Requirements 11.2, 11.3).
   *
   * Non-throwing. Resolves the project id (absent → notice), `execute`s
   * `UI_PREPARE_FINAL_UPGRADE_TASK` with a fresh Idempotency_Key and the
   * caller's binding (`sourceTaskId` / `expectedSourceTaskRevision` /
   * `personalizationTraceId` / `userGoal`). On a rejection (any `FINAL_UPGRADE_*`
   * → `final_upgrade_rejected`) the candidate list is refreshed first so the
   * webview reflects the current eligibility, THEN the mapped notice is surfaced
   * (Requirement 11.3).
   */
  async prepareFinalUpgrade(input: {
    sourceTaskId: string;
    expectedSourceTaskRevision: number;
    personalizationTraceId: string;
    userGoal: string;
  }): Promise<void> {
    if (this.disposed) return;
    const binding = this.bindingVersion;
    const projectId =
      this.lastProjectId ?? this.deps.globalState.get("bhlr.lastProjectId");
    if (!projectId) {
      this.notice("error", "PROJECT_REQUIRED", "no project bound");
      return;
    }
    this.lastProjectId = projectId;

    const res = await this.deps.port.execute({
      ...uiMetadata(),
      kind: "UI_PREPARE_FINAL_UPGRADE_TASK",
      idempotencyKey: entityId("idem"),
      projectId,
      sourceTaskId: input.sourceTaskId,
      expectedSourceTaskRevision: input.expectedSourceTaskRevision,
      personalizationTraceId: input.personalizationTraceId,
      userGoal: input.userGoal,
    });
    if (!this.isCurrentBinding(binding)) return;
    if (!res.ok) {
      // FINAL_UPGRADE_* → final_upgrade_rejected: refresh the candidate list
      // first, then surface the mapped notice (Requirement 11.3).
      await this.listFinalUpgradeCandidates();
      if (!this.isCurrentBinding(binding)) return;
      this.notify(res.error);
      return;
    }
    // Preparing a Task is not starting an Agent. Re-read the new current Task
    // so the previous completion does not leave the next Builder input locked.
    await this.reprojectFromSnapshot(projectId, true);
  }

  /**
   * Re-read the durable snapshot and re-project the shared, cross-cutting slices
   * of the view model that later behaviors rely on: pending/resolved decisions,
   * recorded Helper conversations, and the current-task binding
   * (design §B.7 / §B.6 / §3.1). Non-throwing: on a port error it surfaces a
   * notice and leaves the prior projection intact. Always re-hydrates.
   *
   * The decision `applied` flag (from `application != null`) is what the
   * completion-gating in 5.2 uses to block a `TASK_COMPLETED` display while any
   * decision is unapplied (§Correctness Property 3). Field names follow the real
   * `ProjectSessionSnapshot` contract (`decisions[].request/resolution/
   * application`, `helperConversations`, `currentTask`).
   */
  private async reprojectFromSnapshot(projectId: string, restoreIdleBuilder = false): Promise<void> {
    if (this.disposed || projectId !== this.lastProjectId) return;
    const binding = this.bindingVersion;
    const snap = await this.deps.port.snapshot(projectId);
    if (this.disposed || binding !== this.bindingVersion || projectId !== this.lastProjectId) return;
    if (!snap.ok) {
      this.notify(snap.error);
      return;
    }
    const s = snap.value;

    // Decisions: project the request + resolution/application presence.
    const decisions: DecisionViewModel[] = (s.decisions ?? []).map((d) => {
      const req = d.request;
      return {
        decisionId: req.id,
        taskId: req.taskId,
        category: req.category,
        question: req.question,
        options: req.options.map((o) => ({
          id: o.id,
          label: o.label,
          description: o.description,
        })),
        recommendedOptionId: req.recommendedOptionId,
        resolved: d.resolution != null,
        applied: d.application != null,
        contextVersion: req.contextVersion,
      };
    });

    // Helper conversations: redacted excerpts / response summaries only.
    const conversations: HelperConversationViewModel[] = (
      s.helperConversations ?? []
    ).map((c) => ({
      conversationId: c.conversationId,
      taskId: c.taskId,
      decisionId: c.decisionId ?? null,
      status: c.status,
      userExcerpts: [...c.redactedUserExcerpts],
      responseSummaries: [...c.helperResponseSummaries],
    }));

    // Current-task binding for the Builder header (guarded for shape).
    const currentTask = s.currentTask;
    const taskId = currentTask?.id ?? this.vm.builder.taskId;
    const taskTitle = builderTaskLabel(s) ?? this.vm.builder.taskTitle;
    const previousBuilder = taskId !== this.vm.builder.taskId && !this.activeRunId
      ? initialAgentViewModel().builder : this.vm.builder;
    let builder = { ...previousBuilder, taskId, taskTitle, taskRevision: currentTask?.revision ?? null,
      readyToStart: currentTask?.status === "PENDING" };
    if (restoreIdleBuilder && !this.activeRunId && !this.builderFlight) {
      const unapplied = decisions.some(d => d.taskId === taskId && !d.applied) ||
        s.pendingDecisions.some(d => d.taskId === taskId);
      const completed = currentTask?.status === "COMPLETED" &&
        s.completionReport?.taskId === currentTask.id && !unapplied;
      builder = { ...builder,
        phase: completed ? "TASK_COMPLETED" : unapplied ? "DECISION_REQUIRED" : "IDLE",
        completionReportId: completed ? s.completionReport!.id : null,
        errorCode: null,
      };
    }

    this.vm = {
      ...this.vm,
      decisions,
      builder,
      helper: { ...this.vm.helper, conversations },
    };
    this.deps.onChange();
  }

  /** The run id currently supervised, if any (used by {@link cancelActive}). */
  private currentRunId(): string | null {
    return this.activeRunId;
  }

  /**
   * Tear down subscriptions and abort the live watch (design §B.8;
   * Requirement 6.3). Aborting the SSE subscription is NOT a cancel — the run
   * keeps going in Core and recovery re-watches on reactivation. This path
   * NEVER calls `cancelRun` and never sets {@link cancelRequested} (abort ≠
   * cancel). Called by the provider's `onDidDispose`.
   */
  dispose(): void {
    this.disposed = true;
    this.bindingVersion++;
    this.watches.builder?.abort();
    this.watches.helper?.abort();
    this.unsubStatus?.();
    this.unsubInputs?.();
  }
}

/**
 * Whether a native {@link NativeQuestion} is still consistent with the current
 * durable snapshot (design §B.10; Requirement 7.4). Used by
 * {@link AgentSurfaceController.submitNativeAnswer} to reject a stale or
 * mis-bound question BEFORE it reaches the worker.
 *
 * The check is by role:
 *  - `BUILDER` / `HELPER`: the question's `taskId` must equal the snapshot's
 *    `currentTask?.id`. A question bound to a task that is no longer current is
 *    stale.
 *  - `DISCOVERY`: the question's `discoverySessionId` must equal the snapshot's
 *    `discoverySession?.id`.
 *  - `EVIDENCE_ANALYST` (and any other role): no task/session binding to
 *    validate here, so it is treated as consistent (the worker still guards
 *    submission via `NATIVE_USER_INPUT_STALE`).
 *
 * Snapshot field names follow the real `ProjectSessionSnapshot` contract:
 * `currentTask` (nullable) with `id`, and `discoverySession` (nullable) with
 * `id`. Both are guarded for a null/absent shape.
 */
function isConsistentWithSnapshot(
  question: NativeQuestion,
  snapshot: ProjectSessionSnapshot,
): boolean {
  switch (question.role) {
    case "BUILDER":
    case "HELPER": {
      const currentTaskId = snapshot.currentTask?.id ?? null;
      return question.taskId === currentTaskId;
    }
    case "DISCOVERY": {
      const sessionId = snapshot.discoverySession?.id ?? null;
      return question.discoverySessionId === sessionId;
    }
    default:
      // EVIDENCE_ANALYST / any other role has no local task/session binding to
      // validate; defer to the worker's own staleness guard.
      return true;
  }
}
