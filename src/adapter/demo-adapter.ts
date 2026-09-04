/**
 * DemoAdapter — a self-contained, auto-responding {@link AgentAdapter} for the
 * runnable demo (Extension Development Host, F5).
 *
 * Unlike {@link MockAdapter} (which is test-driven and emits events only when a
 * test explicitly pumps them), the DemoAdapter drives its own event sequence on
 * real timers so a person running the extension sees a streaming response
 * without a real Kiro backend. It:
 *
 *  1. Emits `started` almost immediately so the controller's start-timeout is
 *     cancelled quickly.
 *  2. Streams a few `message_chunk`s that form a short, clearly-labeled DEMO
 *     reply referencing the user's text and which agent answered.
 *  3. For a Builder turn (`allowWorkStream === true`) interleaves a couple of
 *     `work_item` events (a multi-line command so it renders collapsed, plus a
 *     file change) with matching `work_item_result`s.
 *  4. Ends with `completed`.
 *
 * The whole sequence runs in ~1-2 seconds, well under the controller's 30s
 * start-timeout and stall watchdog. All timers are cancellable: {@link TurnHandle.cancel}
 * clears every pending timer, and a per-turn guard ensures nothing is emitted
 * after `completed` or after `cancel()`.
 *
 * This module intentionally uses real `setTimeout`/`clearTimeout` — it is the
 * runtime demo path, never exercised by the deterministic test suite's fake
 * clock (that role belongs to {@link MockAdapter}).
 */

import type { AgentId, WorkStreamItem } from "../core/types";
import { createWorkItem } from "../core/work-item";
import type {
  AgentAdapter,
  AgentStreamEvent,
  StartTurnRequest,
  TurnHandle,
} from "./agent-adapter";

/** Human-readable label for an agent, used in the canned reply. */
function agentLabel(agent: AgentId): string {
  return agent === "builder" ? "Builder" : "Helper";
}

/**
 * Truncate the user's text for echoing back in the demo reply so a very long
 * message doesn't dominate the canned response.
 */
function shorten(text: string, max = 60): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}\u2026`;
}

/**
 * Auto-responding demo adapter. Available for both agents; produces a scripted,
 * timer-driven event stream per turn.
 */
export class DemoAdapter implements AgentAdapter {
  private turnSeq = 0;

  /** Always available in the demo. */
  isAvailable(_agent: AgentId): Promise<boolean> {
    return Promise.resolve(true);
  }

  startTurn(
    req: StartTurnRequest,
    onEvent: (e: AgentStreamEvent) => void,
  ): Promise<TurnHandle> {
    this.turnSeq += 1;
    const turnId = `demo-turn-${this.turnSeq}`;

    // Per-turn guard + timer bookkeeping so cancel()/completed stops everything.
    let done = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const stop = (): void => {
      done = true;
      for (const t of timers) {
        clearTimeout(t);
      }
      timers.clear();
    };

    // Schedule `fn` at `delayMs`, guarded so it never fires after stop().
    const schedule = (delayMs: number, fn: () => void): void => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (done) {
          return;
        }
        fn();
      }, delayMs);
      timers.add(id);
    };

    // Safe emit: no-op once the turn is done (cancelled or terminated).
    const emit = (event: AgentStreamEvent): void => {
      if (done) {
        return;
      }
      onEvent(event);
    };

    const label = agentLabel(req.agent);
    const echoed = shorten(req.text);

    // Build the interleaved event script. Times are cumulative (ms).
    type Step = { at: number; event: AgentStreamEvent };
    const steps: Step[] = [];

    // 1) started — fire almost immediately so the start-timeout is cancelled.
    steps.push({ at: 20, event: { kind: "started", turnId } });

    // 2) opening chunks referencing the agent + user text (clearly a DEMO).
    steps.push({
      at: 200,
      event: {
        kind: "message_chunk",
        text: `[DEMO] Hi, I'm the ${label} agent (mock response). `,
      },
    });
    steps.push({
      at: 450,
      event: {
        kind: "message_chunk",
        text: `You said: "${echoed}". `,
      },
    });

    if (req.allowWorkStream) {
      // Builder-only: interleave work items with the narration.
      const cmdItem: WorkStreamItem = createWorkItem({
        id: `${turnId}-wi-1`,
        seq: 1,
        itemType: "command",
        title: "Running: npm test",
        detail: [
          "$ npm test",
          "> vitest run",
          "",
          " Test Files  12 passed (12)",
          "      Tests  100 passed (100)",
          "   Duration  1.42s",
        ].join("\n"),
        // > 3 lines => renders collapsed by default.
        lineCount: 6,
      });
      const fileItem: WorkStreamItem = createWorkItem({
        id: `${turnId}-wi-2`,
        seq: 2,
        itemType: "file_change",
        title: "Edited src/example.ts",
        detail: "Applied a demo change to src/example.ts",
        lineCount: 1,
      });

      steps.push({ at: 700, event: { kind: "work_item", item: cmdItem } });
      steps.push({
        at: 950,
        event: {
          kind: "message_chunk",
          text: "I ran the test suite and made a small edit. ",
        },
      });
      steps.push({ at: 1150, event: { kind: "work_item", item: fileItem } });
      steps.push({
        at: 1350,
        event: { kind: "work_item_result", itemId: cmdItem.id, failed: false },
      });
      steps.push({
        at: 1450,
        event: { kind: "work_item_result", itemId: fileItem.id, failed: false },
      });
      steps.push({
        at: 1650,
        event: {
          kind: "message_chunk",
          text: "This is a canned demo stream — no real backend is connected.",
        },
      });
      steps.push({ at: 1900, event: { kind: "completed" } });
    } else {
      // Helper turn: message chunks only, never any work items.
      steps.push({
        at: 700,
        event: {
          kind: "message_chunk",
          text: "I can chat, but I don't run work items. ",
        },
      });
      steps.push({
        at: 950,
        event: {
          kind: "message_chunk",
          text: "This is a canned demo stream — no real backend is connected.",
        },
      });
      steps.push({ at: 1200, event: { kind: "completed" } });
    }

    for (const step of steps) {
      schedule(step.at, () => {
        emit(step.event);
        if (step.event.kind === "completed" || step.event.kind === "failed") {
          // Mark done so any (defensively) later timer becomes a no-op.
          stop();
        }
      });
    }

    const handle: TurnHandle = {
      turnId,
      cancel: () => stop(),
    };
    return Promise.resolve(handle);
  }
}
