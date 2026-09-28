/**
 * Pure Builder-turn reducer and classification wrappers.
 *
 * This module folds projected {@link RunEventView} events into the host-owned
 * {@link BuilderTurnViewModel} and maps a terminal run's classification to a
 * display phase. Every function here is pure and total: no side effects, no
 * Core access, no mutation of its inputs.
 *
 * Completion is decided ONLY by the real {@link classifyBuilderTurn}
 * (design §Correctness Property 1): a run whose `status === 'SUCCEEDED'` is
 * never treated as task completion on its own — the durable Task status and
 * Completion Report of the same Task are what `classifyBuilderTurn` inspects.
 */
import {
  classifyBuilderTurn,
  type BuilderTurnOutcome,
  type LocalRun,
  type ProjectSessionSnapshot,
  type RunEventView,
} from "../../../vendor/frontend-client";
import type { BuilderTurnViewModel, ToolRowViewModel } from "./agent-view-model";

/**
 * Fold one projected run event into the Builder turn view model.
 *
 * Pure and total: returns a new {@link BuilderTurnViewModel} and never mutates
 * `vm`. The switch is exhaustive over every {@link RunEventView} kind so TS
 * enforces that new kinds are handled here.
 *
 * - `TEXT`: append a transcript line keyed by sequence (Requirement 2.1).
 * - `TOOL`: upsert a row keyed by `toolId ?? seq:<sequence>`; a repeated key
 *   replaces the existing row (RUNNING → SUCCEEDED/FAILED/UNKNOWN), a new key
 *   appends (Requirements 2.2–2.4). `relativePath` is passed through as-is —
 *   the projected view already carries a relative path only (Requirement 2.9).
 * - `STATE`: no-op on the transcript; run STATE is handled via `onRun`
 *   (Requirement 2.6).
 * - `PERMISSION_DENIED`: set the permission-denied flag (Requirement 2.5).
 */
export function reduceEvent(
  vm: BuilderTurnViewModel,
  view: RunEventView,
): BuilderTurnViewModel {
  switch (view.kind) {
    case "TEXT":
      return {
        ...vm,
        transcript: [
          ...vm.transcript,
          { sequence: view.sequence, text: view.text },
        ],
      };
    case "TOOL": {
      const key = view.toolId ?? `seq:${view.sequence}`;
      const row: ToolRowViewModel = {
        key,
        tool: view.tool,
        status: view.status,
        // Pass through the view's relative path (already relative — never absolute).
        relativePath: view.relativePath,
        command: view.command,
        exitCode: view.exitCode,
        coreAction: view.coreAction,
        output: view.output,
        truncated: view.truncated,
        errorCode: view.errorCode ?? null,
      };
      const idx = vm.toolRows.findIndex((r) => r.key === key);
      const toolRows =
        idx >= 0
          ? // Upsert by key: status transitions RUNNING → SUCCEEDED/FAILED/UNKNOWN
            // happen naturally by replacing the existing row.
            vm.toolRows.map((r, i) => (i === idx ? row : r))
          : [...vm.toolRows, row];
      return { ...vm, toolRows };
    }
    case "STATE":
      // Transcript no-op; run STATE is handled via onRun, not the view model.
      return vm;
    case "PERMISSION_DENIED":
      return { ...vm, permissionDenied: true };
  }
}

/**
 * Map a {@link BuilderTurnOutcome} to a display phase. Exhaustive over every
 * outcome kind. Both `TURN_ENDED_TASK_ACTIVE` and `TASK_BINDING_CHANGED`
 * present as `TURN_ENDED` (Requirement 1.8).
 */
export function phaseFromOutcome(
  outcome: BuilderTurnOutcome,
): BuilderTurnViewModel["phase"] {
  switch (outcome.kind) {
    case "RUNNING":
      // Should not occur post-terminal, but map for totality.
      return "RUNNING";
    case "TASK_COMPLETED":
      return "TASK_COMPLETED";
    case "DECISION_REQUIRED":
      return "DECISION_REQUIRED";
    case "TURN_ENDED_TASK_ACTIVE":
      return "TURN_ENDED";
    case "TASK_BINDING_CHANGED":
      return "TURN_ENDED";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
  }
}

/**
 * Classify a terminal Builder turn against an After_Snapshot read after the run
 * became terminal, delegating to the real {@link classifyBuilderTurn}.
 *
 * A `SUCCEEDED` run status alone is never completion (design §Correctness
 * Property 1); completion requires the durable Task status and Completion
 * Report of the same Task, which the SDK helper inspects.
 *
 * `classifyBuilderTurn` accepts `Pick<LocalRun, 'kind' | 'status' | 'errorCode'
 * | 'projectId'>`; a full {@link LocalRun} is assignable to that structural
 * type, so it is passed through directly.
 */
export function classifyTurn(
  run: LocalRun,
  after: ProjectSessionSnapshot,
  taskId: string,
): BuilderTurnOutcome {
  return classifyBuilderTurn(run, after, taskId);
}
