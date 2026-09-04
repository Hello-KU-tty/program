/**
 * Adapter factory — the single swap point for the concrete {@link AgentAdapter}
 * the extension wires into its {@link PanelController}.
 *
 * The extension activation code (see `agent-panel-view-provider.ts`) never
 * constructs a concrete adapter directly; it calls {@link createAgentAdapter}.
 * This keeps the choice of invocation mechanism behind one function so it can
 * be replaced without touching the wiring or UI layers.
 *
 * ## Current state (spike-gated)
 *
 * {@link createAgentAdapter} returns a {@link DemoAdapter} by default: a
 * self-contained, auto-responding adapter that streams a clearly-labeled canned
 * reply on real timers so the extension shows a live streaming response in the
 * Extension Development Host (F5) without a real Kiro backend.
 *
 * The {@link MockAdapter} remains the deterministic, test-driven double used by
 * the unit/property suites (events are pumped explicitly, no real timers) and
 * is intentionally NOT the runtime default.
 *
 * The real Kiro host invocation API (Kiro CLI over ACP / JSON-RPC subprocess,
 * Crew SDK, ...) is an OPEN spike item per design.md; wiring a
 * {@link KiroAcpAdapter} that spawns a real process would break activation and
 * tests, so it stays behind {@link createKiroAcpAdapter} until the transport
 * spike lands.
 *
 * The {@link KiroAcpAdapter} exists and implements the {@link AgentAdapter}
 * interface (see `kiro-acp-adapter.ts`). Once the Kiro transport spike lands
 * (a concrete {@link AcpTransport} that drives the real host), swapping is a
 * one-line change:
 *
 * ```ts
 * // in createAgentAdapter():
 * const transport = createRealKiroTransport(...); // <- the remaining spike
 * return createKiroAcpAdapter(transport);
 * ```
 */

import type { AgentAdapter } from "./agent-adapter";
import { DemoAdapter } from "./demo-adapter";
import { KiroAcpAdapter, type AcpTransport } from "./kiro-acp-adapter";

/**
 * Wrap an injected {@link AcpTransport} in a {@link KiroAcpAdapter}.
 *
 * This is the explicit, named construction point for the Kiro-backed adapter.
 * It performs no process spawning itself — the (still-spike) transport is
 * supplied by the caller — so it is safe to reference from activation code and
 * exercise in tests with a fake transport.
 *
 * @param transport A concrete ACP transport driving the Kiro host.
 * @returns A {@link KiroAcpAdapter} consuming that transport.
 */
export function createKiroAcpAdapter(transport: AcpTransport): AgentAdapter {
  return new KiroAcpAdapter(transport);
}

/**
 * Creates the {@link AgentAdapter} the extension host uses to invoke agents.
 *
 * Default implementation: a {@link DemoAdapter} available for both agents that
 * auto-streams a clearly-labeled canned reply so the extension is runnable in
 * the Extension Development Host without a real Kiro backend. This is the only
 * place that names a concrete default adapter. When the Kiro transport spike
 * lands, replace the return with `createKiroAcpAdapter(realTransport)` — see the
 * module doc for the exact swap.
 */
export function createAgentAdapter(): AgentAdapter {
  return new DemoAdapter();
}
