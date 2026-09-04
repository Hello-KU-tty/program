import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { PanelController } from "../src/core/panel-controller";
import { MockAdapter } from "../src/adapter/mock-adapter";
import type { Clock, TimerId } from "../src/core/clock";
import type {
  AgentResponseEntry,
  ConversationEntry,
  TabId,
  WorkStreamItem,
} from "../src/core/types";
import type { AgentStreamEvent } from "../src/adapter/agent-adapter";

/**
 * Property-based tests for the pure {@link PanelController}/{@link TabState}
 * core, exercised with the deterministic {@link MockAdapter} and a controllable
 * fake {@link Clock}. Each property below corresponds to a "Correctness
 * Property" in the builder-helper-agent-panel design.md and runs a minimum of
 * 100 iterations. One property -> one test.
 *
 * The fake clock records timers and only fires them on an explicit advance(ms),
 * so the 30s start-timeout and 30s stall watchdog are fully deterministic and
 * never fire on real wall-clock time.
 */

const NUM_RUNS = 100;
const START_TIMEOUT_MS = 30_000;
const STALL_TIMEOUT_MS = 30_000;
const MAX_MESSAGE_LENGTH = 10_000;

/**
 * Deterministic fake Clock. Timers are recorded but never auto-fire; the test
 * drives adapter events directly and uses advance(ms) to trigger due timers in
 * scheduling order.
 */
class FakeClock implements Clock {
  private current = 0;
  private nextId = 1;
  private timers = new Map<TimerId, { fireAt: number; cb: () => void }>();

  now(): number {
    return this.current;
  }

  setTimeout(cb: () => void, ms: number): TimerId {
    const id = this.nextId++ as TimerId;
    this.timers.set(id, { fireAt: this.current + ms, cb });
    return id;
  }

  clearTimeout(id: TimerId): void {
    this.timers.delete(id);
  }

  /** Advance time by `ms`, firing any now-due timers in scheduling order. */
  advance(ms: number): void {
    this.current += ms;
    // Fire in fireAt order; re-scan after each fire so re-armed timers with an
    // earlier deadline than `current` also fire within this advance.
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, t]) => t.fireAt <= this.current)
        .sort((a, b) => a[1].fireAt - b[1].fireAt);
      if (due.length === 0) {
        break;
      }
      const [id, t] = due[0];
      this.timers.delete(id);
      t.cb();
    }
  }

  get armedCount(): number {
    return this.timers.size;
  }
}

const OTHER: Record<TabId, TabId> = { builder: "helper", helper: "builder" };

function responseOf(
  controller: PanelController,
  tab: TabId,
): AgentResponseEntry | undefined {
  return controller
    .getTabSnapshot(tab)
    .entries.find((e) => e.kind === "agent_response") as
    | AgentResponseEntry
    | undefined;
}

/** Compact serializable view of an entry list for order/content comparison. */
function entriesView(entries: ConversationEntry[]): unknown[] {
  return entries.map((e) => {
    if (e.kind === "user_message") {
      return { id: e.id, kind: e.kind, seq: e.seq, text: (e as any).text };
    }
    const r = e as AgentResponseEntry;
    return {
      id: r.id,
      kind: r.kind,
      seq: r.seq,
      forMessageId: r.forMessageId,
      chunks: [...r.chunks],
      workItems: r.workItems.map((w) => ({ ...w })),
      state: r.state,
    };
  });
}

// ---------- Generators ----------

/** Valid user text: 1..10,000 chars, not whitespace-only. */
const validText = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0 && s.length <= MAX_MESSAGE_LENGTH);

/** Whitespace-only (including empty) text -> rejected as `empty`. */
const whitespaceText = fc
  .stringOf(fc.constantFrom(" ", "\t", "\n", "\r", "\f", "\v"), {
    minLength: 0,
    maxLength: 20,
  });

/** Over-limit text (> 10,000 chars, non-whitespace) -> rejected as `too_long`. */
const overLimitText = fc
  .integer({ min: MAX_MESSAGE_LENGTH + 1, max: MAX_MESSAGE_LENGTH + 50 })
  .map((n) => "x".repeat(n));

const tabArb: fc.Arbitrary<TabId> = fc.constantFrom("builder", "helper");

/** A work item (seq is reassigned by TabState at receipt). */
const workItemArb: fc.Arbitrary<WorkStreamItem> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 8 }),
  seq: fc.constant(0),
  itemType: fc.constantFrom("tool_call", "file_change", "command", "test"),
  title: fc.string({ maxLength: 20 }),
  detail: fc.string({ maxLength: 20 }),
  lineCount: fc.integer({ min: 0, max: 10 }),
  status: fc.constantFrom("running", "succeeded", "failed"),
  expanded: fc.boolean(),
});

/**
 * A non-terminal streamed body event (message_chunk or work_item). Terminal
 * events (completed/failed) are appended separately by the test.
 */
function bodyEventArb(allowWorkItems: boolean): fc.Arbitrary<AgentStreamEvent> {
  const chunk = fc
    .string({ maxLength: 12 })
    .map((text): AgentStreamEvent => ({ kind: "message_chunk", text }));
  if (!allowWorkItems) {
    return chunk;
  }
  const work = workItemArb.map(
    (item): AgentStreamEvent => ({ kind: "work_item", item }),
  );
  return fc.oneof(chunk, work);
}

// ---------- Property 1 ----------

describe("PanelController properties", () => {
  // Feature: builder-helper-agent-panel, Property 1: Exactly one active tab
  // For any sequence of selectTab operations starting from a fresh panel, exactly one tab is active at all times, and the active tab equals the most recently selected tab (Builder if none selected yet).
  it("Property 1: exactly one active tab, equal to most recently selected", () => {
    fc.assert(
      fc.property(fc.array(tabArb, { maxLength: 30 }), (selections) => {
        const controller = new PanelController(new MockAdapter(), {
          clock: new FakeClock(),
        });
        // Fresh panel: Builder active (Req 1.3).
        expect(controller.activeTab).toBe("builder");
        let expected: TabId = "builder";
        for (const t of selections) {
          controller.selectTab(t);
          expected = t;
          expect(controller.activeTab).toBe(expected);
          // "Exactly one active" is structurally guaranteed by a single-valued
          // activeTab; assert it is always one of the two known tabs.
          expect(["builder", "helper"]).toContain(controller.activeTab);
        }
        expect(controller.activeTab).toBe(expected);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: builder-helper-agent-panel, Property 2: Tab switch preserves conversation order and draft
  // For any tab state and any sequence of switch-away-then-return operations, the returned tab's re-hydrated snapshot has the same conversation entries in the same order and the same unsent draft text as before the switch.
  it("Property 2: tab switch preserves conversation order and draft", async () => {
    await fc.assert(
      fc.asyncProperty(
        tabArb,
        validText,
        fc.array(bodyEventArb(true), { maxLength: 6 }),
        fc.string({ maxLength: 30 }),
        fc.array(tabArb, { minLength: 1, maxLength: 12 }),
        async (tab, text, body, draft, switches) => {
          const clock = new FakeClock();
          const adapter = new MockAdapter();
          const controller = new PanelController(adapter, { clock });

          // Build up some conversation state on `tab`.
          await controller.submit(tab, text);
          const turn = adapter.lastTurn!;
          turn.script({ kind: "started", turnId: turn.turnId }).emitNext();
          for (const ev of body) {
            // Only builder may hold work items; skip work_items for helper.
            if (ev.kind === "work_item" && tab !== "builder") continue;
            turn.script(ev).emitNext();
          }
          turn.script({ kind: "completed" }).emitNext();

          // Set an unsent draft after the turn completed (submission unlocked).
          controller.getTabState(tab).setDraft(draft);

          const before = controller.getTabSnapshot(tab);

          // Switch away and back an arbitrary number of times, ending elsewhere
          // then returning to `tab`.
          for (const s of switches) {
            controller.selectTab(s);
          }
          controller.selectTab(OTHER[tab]);
          controller.selectTab(tab);

          const after = controller.getTabSnapshot(tab);
          expect(entriesView(after.entries)).toEqual(entriesView(before.entries));
          expect(after.draft).toBe(before.draft);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: builder-helper-agent-panel, Property 3: Tab state independence
  // For any interleaving of operations across both tabs, every operation that targets one tab leaves the other tab's snapshot (entries, draft, submission state, in-flight response) unchanged.
  it("Property 3: operations on one tab do not affect the other tab", async () => {
    type Op =
      | { op: "submit"; tab: TabId; text: string }
      | { op: "chunk"; tab: TabId; text: string }
      | { op: "complete"; tab: TabId }
      | { op: "fail"; tab: TabId }
      | { op: "draft"; tab: TabId; text: string }
      | { op: "select"; tab: TabId };

    const opArb: fc.Arbitrary<Op> = fc.oneof(
      fc.record({ op: fc.constant("submit" as const), tab: tabArb, text: validText }),
      fc.record({ op: fc.constant("chunk" as const), tab: tabArb, text: fc.string({ maxLength: 8 }) }),
      fc.record({ op: fc.constant("complete" as const), tab: tabArb }),
      fc.record({ op: fc.constant("fail" as const), tab: tabArb }),
      fc.record({ op: fc.constant("draft" as const), tab: tabArb, text: fc.string({ maxLength: 15 }) }),
      fc.record({ op: fc.constant("select" as const), tab: tabArb }),
    );

    await fc.assert(
      fc.asyncProperty(fc.array(opArb, { maxLength: 25 }), async (ops) => {
        const clock = new FakeClock();
        const adapter = new MockAdapter();
        const controller = new PanelController(adapter, { clock });
        // Track the most recent turn per tab so chunk/complete/fail target it.
        const turnOf: Record<TabId, ReturnType<MockAdapter["startTurn"]> extends Promise<infer _T> ? any : any> = {
          builder: undefined,
          helper: undefined,
        } as any;

        for (const o of ops) {
          const target = o.tab;
          const other = OTHER[target];
          const otherBefore = entriesView(controller.getTabSnapshot(other).entries);
          const otherDraftBefore = controller.getTabSnapshot(other).draft;
          const otherEnabledBefore = controller.getTabSnapshot(other).submissionEnabled;

          switch (o.op) {
            case "submit": {
              const res = await controller.submit(target, o.text);
              if (res.status === "accepted") {
                const turn = adapter.lastTurn!;
                turn.script({ kind: "started", turnId: turn.turnId }).emitNext();
                turnOf[target] = turn;
              }
              break;
            }
            case "chunk": {
              turnOf[target]?.script({ kind: "message_chunk", text: o.text }).emitNext();
              break;
            }
            case "complete": {
              turnOf[target]?.script({ kind: "completed" }).emitNext();
              break;
            }
            case "fail": {
              turnOf[target]
                ?.script({ kind: "failed", error: { code: "stream_error", message: "x" } })
                .emitNext();
              break;
            }
            case "draft": {
              controller.getTabState(target).setDraft(o.text);
              break;
            }
            case "select": {
              controller.selectTab(target);
              break;
            }
          }

          // The other tab's snapshot must be untouched by this operation.
          expect(entriesView(controller.getTabSnapshot(other).entries)).toEqual(otherBefore);
          expect(controller.getTabSnapshot(other).draft).toBe(otherDraftBefore);
          expect(controller.getTabSnapshot(other).submissionEnabled).toBe(otherEnabledBefore);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: builder-helper-agent-panel, Property 4: State preserved across render/error faults
  // For any tab state, injecting a render failure or displaying an error/unavailability indication leaves that tab's existing conversation entries unchanged in content and order.
  it("Property 4: render/error faults preserve existing conversation entries", async () => {
    await fc.assert(
      fc.asyncProperty(
        tabArb,
        validText,
        fc.array(bodyEventArb(true), { maxLength: 6 }),
        fc.array(fc.constantFrom("render", "unavailable_submit", "over_limit"), { maxLength: 5 }),
        async (tab, text, body, faults) => {
          const clock = new FakeClock();
          const adapter = new MockAdapter();
          const controller = new PanelController(adapter, { clock });

          // Establish a conversation with a completed response.
          await controller.submit(tab, text);
          const turn = adapter.lastTurn!;
          turn.script({ kind: "started", turnId: turn.turnId }).emitNext();
          for (const ev of body) {
            if (ev.kind === "work_item" && tab !== "builder") continue;
            turn.script(ev).emitNext();
          }
          turn.script({ kind: "completed" }).emitNext();

          const before = entriesView(controller.getTabSnapshot(tab).entries);
          expect(before.length).toBeGreaterThanOrEqual(2);

          for (const f of faults) {
            if (f === "render") {
              controller.reportRenderFailure(tab);
            } else if (f === "unavailable_submit") {
              adapter.setAvailable(false);
              const res = await controller.submit(tab, "another message");
              expect(res.status).toBe("unavailable");
              adapter.setAvailable(true);
            } else {
              // over-limit rejection emits a length_limit notice.
              const res = await controller.submit(tab, "y".repeat(MAX_MESSAGE_LENGTH + 5));
              expect(res.status).toBe("rejected");
            }
            // After every fault path, existing entries are unchanged.
            expect(entriesView(controller.getTabSnapshot(tab).entries)).toEqual(before);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: builder-helper-agent-panel, Property 5: Valid submission appends exactly one user message and invokes the active agent once
  // For any text that is non-empty, not whitespace-only, and at most 10,000 characters, submitting it from a tab appends exactly one user-message entry to that tab and results in exactly one adapter startTurn for that tab's agent, with the draft cleared.
  it("Property 5: valid submission appends one user message and invokes agent once", async () => {
    await fc.assert(
      fc.asyncProperty(tabArb, validText, async (tab, text) => {
        const clock = new FakeClock();
        const adapter = new MockAdapter();
        const controller = new PanelController(adapter, { clock });
        // Seed a draft to prove it is cleared on accept.
        controller.getTabState(tab).setDraft("seed draft");

        const res = await controller.submit(tab, text);
        expect(res.status).toBe("accepted");

        const snap = controller.getTabSnapshot(tab);
        const userMsgs = snap.entries.filter((e) => e.kind === "user_message");
        expect(userMsgs).toHaveLength(1);
        expect((userMsgs[0] as any).text).toBe(text);
        // Draft cleared (Req 2.3).
        expect(snap.draft).toBe("");
        // Exactly one startTurn, for this tab's agent only.
        expect(adapter.invocationCount).toBe(1);
        expect(adapter.startTurnCountByAgent[tab]).toBe(1);
        expect(adapter.startTurnCountByAgent[OTHER[tab]]).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: builder-helper-agent-panel, Property 6: Invalid submissions are rejected without invoking the agent
  // For any string that is empty or contains only whitespace, or any string longer than 10,000 characters, submission is rejected, no adapter startTurn occurs, the tab's conversation state is unchanged, and the composed text is retained (with a length indication for the over-limit case).
  it("Property 6: invalid submissions rejected without invoking the agent", async () => {
    await fc.assert(
      fc.asyncProperty(
        tabArb,
        fc.oneof(
          whitespaceText.map((t) => ({ text: t, reason: "empty" as const })),
          overLimitText.map((t) => ({ text: t, reason: "too_long" as const })),
        ),
        async (tab, { text, reason }) => {
          const clock = new FakeClock();
          const adapter = new MockAdapter();
          const controller = new PanelController(adapter, { clock });

          const beforeEntries = entriesView(controller.getTabSnapshot(tab).entries);
          const noticesBefore = controller.notices.length;

          const res = await controller.submit(tab, text);
          expect(res.status).toBe("rejected");
          if (res.status === "rejected") {
            expect(res.reason).toBe(reason);
            // Composed text retained.
            expect(res.retainedText).toBe(text);
          }
          // No adapter invocation and no state change.
          expect(adapter.invocationCount).toBe(0);
          expect(entriesView(controller.getTabSnapshot(tab).entries)).toEqual(beforeEntries);
          expect(controller.getTabSnapshot(tab).entries).toHaveLength(0);

          if (reason === "too_long") {
            // A length-limit notice is emitted for the over-limit case.
            const added = controller.notices.slice(noticesBefore);
            expect(added.some((n) => n.kind === "length_limit" && n.tab === tab)).toBe(true);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: builder-helper-agent-panel, Property 7: Submission lock holds per tab across a turn lifecycle
  // For any turn lifecycle in a tab, once the turn is in progress every further submit in that tab is refused as locked, and submission becomes accepted again exactly when the turn reaches completion or failure — while the other tab's submission availability is never affected by this lock.
  it("Property 7: submission lock holds per tab across a turn lifecycle", async () => {
    await fc.assert(
      fc.asyncProperty(
        tabArb,
        validText,
        fc.array(fc.string({ maxLength: 6 }), { maxLength: 4 }),
        fc.constantFrom("completed", "failed", "stall"),
        fc.integer({ min: 0, max: 3 }),
        async (tab, text, chunks, ending, extraSubmits) => {
          const clock = new FakeClock();
          const adapter = new MockAdapter();
          const controller = new PanelController(adapter, { clock });
          const other = OTHER[tab];

          const accepted = await controller.submit(tab, text);
          expect(accepted.status).toBe("accepted");

          const turn = adapter.lastTurn!;
          turn.script({ kind: "started", turnId: turn.turnId }).emitNext();

          // While in progress the tab is locked; the other tab stays enabled.
          for (let i = 0; i < extraSubmits; i++) {
            const r = await controller.submit(tab, "while locked");
            expect(r.status).toBe("locked");
          }
          expect(controller.getTabSnapshot(tab).submissionEnabled).toBe(false);
          expect(controller.getTabSnapshot(other).submissionEnabled).toBe(true);
          // Other tab remains routable (Req 5.4).
          const otherRes = await controller.submit(other, "concurrent");
          expect(otherRes.status).toBe("accepted");

          // Stream some chunks.
          for (const c of chunks) {
            turn.script({ kind: "message_chunk", text: c }).emitNext();
          }

          // End the turn one of three ways.
          if (ending === "completed") {
            turn.script({ kind: "completed" }).emitNext();
          } else if (ending === "failed") {
            turn
              .script({ kind: "failed", error: { code: "stream_error", message: "boom" } })
              .emitNext();
          } else {
            // stall: no terminal event; advance past the stall watchdog.
            clock.advance(STALL_TIMEOUT_MS);
          }

          // Submission re-enabled exactly at completion/failure/stall.
          expect(controller.getTabSnapshot(tab).submissionEnabled).toBe(true);
          const again = await controller.submit(tab, "after turn");
          expect(again.status).toBe("accepted");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: builder-helper-agent-panel, Property 9: Streaming targets the originating tab without changing the active tab
  // For any active tab and any response stream whose originating tab differs from the active tab, every streamed chunk and work item is applied to the originating tab and the active tab remains unchanged throughout the stream.
  it("Property 9: streaming targets the originating tab without changing the active tab", async () => {
    await fc.assert(
      fc.asyncProperty(
        tabArb,
        validText,
        fc.array(fc.string({ maxLength: 8 }), { minLength: 1, maxLength: 8 }),
        async (origin, text, chunks) => {
          const clock = new FakeClock();
          const adapter = new MockAdapter();
          const controller = new PanelController(adapter, { clock });
          const active = OTHER[origin];

          // Submit on the originating tab, then make the OTHER tab active.
          await controller.submit(origin, text);
          const turn = adapter.lastTurn!;
          controller.selectTab(active);
          expect(controller.activeTab).toBe(active);

          turn.script({ kind: "started", turnId: turn.turnId }).emitNext();
          for (const c of chunks) {
            turn.script({ kind: "message_chunk", text: c }).emitNext();
            // Active tab never changes while streaming into the inactive tab.
            expect(controller.activeTab).toBe(active);
          }
          turn.script({ kind: "completed" }).emitNext();
          expect(controller.activeTab).toBe(active);

          // Content landed on the originating tab; the active tab is untouched.
          const originResp = responseOf(controller, origin);
          expect(originResp).toBeDefined();
          expect(originResp!.chunks.join("")).toBe(chunks.join(""));
          expect(controller.getTabSnapshot(active).entries).toHaveLength(0);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: builder-helper-agent-panel, Property 10: Failure or stall retains all content received so far and unlocks
  // For any prefix of chunks/work items received before a stream error, a start-timeout, or a stall beyond the timeout, the corresponding response retains exactly that received content in order, is marked failed, and submission in that tab is re-enabled; the text composed for a start failure or unavailability is retained for resubmission.
  it("Property 10: failure/stall retains received content in order and unlocks", async () => {
    await fc.assert(
      fc.asyncProperty(
        tabArb,
        validText,
        fc.array(fc.string({ maxLength: 8 }), { maxLength: 8 }),
        fc.constantFrom("failed", "stall", "start_timeout", "unavailable"),
        async (tab, text, chunks, mode) => {
          const clock = new FakeClock();
          const adapter = new MockAdapter();
          const controller = new PanelController(adapter, { clock });

          if (mode === "unavailable") {
            // Unavailability at submit: no turn starts, text retained, enabled.
            adapter.setAvailable(false);
            const res = await controller.submit(tab, text);
            expect(res.status).toBe("unavailable");
            expect(adapter.invocationCount).toBe(0);
            // No response entry created; submission stays enabled.
            expect(responseOf(controller, tab)).toBeUndefined();
            expect(controller.getTabSnapshot(tab).submissionEnabled).toBe(true);
            return;
          }

          const res = await controller.submit(tab, text);
          expect(res.status).toBe("accepted");
          const turn = adapter.lastTurn!;

          if (mode === "start_timeout") {
            // No `started` event: advance past the start-timeout.
            clock.advance(START_TIMEOUT_MS);
            // No response entry was created; composed text retained as draft.
            expect(responseOf(controller, tab)).toBeUndefined();
            expect(controller.getTabSnapshot(tab).draft).toBe(text);
            expect(controller.getTabSnapshot(tab).submissionEnabled).toBe(true);
            return;
          }

          // started + a prefix of chunks, then failure or stall.
          turn.script({ kind: "started", turnId: turn.turnId }).emitNext();
          for (const c of chunks) {
            turn.script({ kind: "message_chunk", text: c }).emitNext();
          }

          if (mode === "failed") {
            turn
              .script({ kind: "failed", error: { code: "stream_error", message: "boom" } })
              .emitNext();
          } else {
            // stall: no terminal event; fire the stall watchdog.
            clock.advance(STALL_TIMEOUT_MS);
          }

          const resp = responseOf(controller, tab);
          expect(resp).toBeDefined();
          // Exactly the received chunks, in order, retained.
          expect(resp!.chunks).toEqual(chunks);
          expect(resp!.state).toBe("failed");
          // Submission re-enabled.
          expect(controller.getTabSnapshot(tab).submissionEnabled).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: builder-helper-agent-panel, Property 14: Messages route to the submitting tab's agent only
  // For any valid submission from a tab, the adapter is invoked for that tab's agent and never for the other agent (Builder submissions reach only the Builder_Agent; Helper submissions reach only the Helper_Agent).
  it("Property 14: messages route to the submitting tab's agent only", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ tab: tabArb, text: validText }), { minLength: 1, maxLength: 12 }),
        async (submissions) => {
          const clock = new FakeClock();
          const adapter = new MockAdapter();
          const controller = new PanelController(adapter, { clock });

          let expectedBuilder = 0;
          let expectedHelper = 0;

          for (const { tab, text } of submissions) {
            const res = await controller.submit(tab, text);
            // A tab already in-flight would be `locked`; only count accepted.
            if (res.status === "accepted") {
              if (tab === "builder") expectedBuilder++;
              else expectedHelper++;
              // Each accepted submit routes to exactly this tab's agent.
              const invocation = adapter.invocations[adapter.invocations.length - 1];
              expect(invocation.agent).toBe(tab);
              // Complete the turn so the tab unlocks for later submissions.
              const turn = adapter.lastTurn!;
              turn.script({ kind: "started", turnId: turn.turnId }).emitNext();
              turn.script({ kind: "completed" }).emitNext();
            }
          }

          expect(adapter.startTurnCountByAgent.builder).toBe(expectedBuilder);
          expect(adapter.startTurnCountByAgent.helper).toBe(expectedHelper);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
