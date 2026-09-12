/**
 * Discovery_Port / Spec_Port invocation boundary for the Discovery -> Spec flow.
 *
 * This module defines the transport-agnostic contract the Extension_Host uses
 * to drive Discovery and Spec operations. The concrete implementation (the
 * `MockDiscoveryPort` today, a future crew-backend HTTP+HMAC adapter later) is
 * chosen behind these interfaces via `createFlowPorts`, so the FlowController
 * and webview never bind to a specific transport.
 *
 * Every operation is async (returns a `Promise`), takes a typed request plus a
 * {@link RequestEnvelope}, and resolves to a {@link PortResult} that is either
 * `ok(value)` or `err(PortError)` -- ports never throw. The signatures mirror
 * the `core` UI command contracts (UI_START_DISCOVERY,
 * UI_RECORD_DISCOVERY_FEEDBACK, UI_UPDATE_LEARNING_SPEC,
 * UI_CONFIRM_LEARNING_SPEC, UI_PREPARE_BUILDER_TASK) so a future HTTP adapter
 * maps 1:1.
 *
 * These are type/interface declarations only; concrete implementations
 * (e.g. `MockDiscoveryPort`) live elsewhere.
 *
 * See design.md "Components and Interfaces > Port boundary" for the
 * authoritative definitions. Requirements: 1.1, 1.2, 1.6.
 */

import type {
  CandidateRevisionReference,
  CandidateRound,
  DiscoveryFeedback,
  DiscoveryInput,
  DiscoverySession,
  LearningSpecRevision,
  PreparedBuilderTask,
  PreviewRound,
  ProjectCandidateRevision,
} from "../../core/flow/flow-types";

/** Metadata every port call carries so a backend swap is seamless (Req 1.6). */
export interface RequestEnvelope {
  /** Correlates a request/response pair across the boundary (`corr_<uuid>`). */
  correlationId: string;
  /** Dedupe key so a retried call is idempotent (`idem_<uuid>`). */
  idempotencyKey: string;
  /**
   * Optimistic-concurrency guard: the revision the caller believes is current
   * for the entity this op targets (session or spec). Nonnegative int.
   * Mirrors core's `expectedSessionRevision` / `expectedSpecRevision`.
   */
  expectedRevision: number;
}

/** Normalized, transport-agnostic port failure (mirrors AdapterError). */
export interface PortError {
  code: "timeout" | "revision_conflict" | "unavailable" | "invalid" | "unknown";
  message: string;
}

/** A port operation resolves to ok(value) or err(PortError); it never throws. */
export type PortResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PortError };

/**
 * The Discovery half of the port boundary: open a session, generate preview
 * rounds, enrich candidates, and submit learner feedback (Req 1.1).
 */
export interface DiscoveryPort {
  /** Open a Discovery_Session from a Discovery_Input (Req 1.1, 4.4). */
  startDiscovery(
    req: { projectId: string; input: DiscoveryInput },
    env: RequestEnvelope,
  ): Promise<PortResult<DiscoverySession>>;

  /** Request the first / next Preview_Round of 10 candidates (Req 1.1, 4.5). */
  generatePreviewRound(
    req: { discoverySessionId: string },
    env: RequestEnvelope,
  ): Promise<PortResult<PreviewRound>>;

  /** Enrich one Candidate_Preview into a Project_Candidate_Revision (Req 1.1). */
  enrichCandidate(
    req: { discoverySessionId: string; target: CandidateRevisionReference },
    env: RequestEnvelope,
  ): Promise<PortResult<ProjectCandidateRevision>>;

  /** Apply Discovery_Feedback and produce the resulting Candidate_Round (Req 1.1, 7.9). */
  submitFeedback(
    req: { discoverySessionId: string; feedback: DiscoveryFeedback },
    env: RequestEnvelope,
  ): Promise<PortResult<CandidateRound>>;
}

/**
 * The Spec half of the port boundary: draft, refine, confirm a Learning Spec,
 * and prepare the Builder handoff task (Req 1.2).
 */
export interface SpecPort {
  /** Generate a Learning_Spec_Revision draft for a selected candidate (Req 1.2, 8.4). */
  generateSpecDraft(
    req: { projectId: string; selectedCandidate: CandidateRevisionReference },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>>;

  /** Refine the current draft into a new DRAFT revision (Req 1.2, 10.2). */
  refineSpec(
    req: { projectId: string; learningSpecId: string; message: string },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>>;

  /** Confirm the current revision (-> CONFIRMED) (Req 1.2, 11.2). */
  confirmSpec(
    req: { projectId: string; learningSpecId: string },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>>;

  /** Prepare the Builder handoff task once BUILDING (Req 1.2, 11.4). */
  prepareBuilderTask(
    req: { projectId: string; learningSpecId: string },
    env: RequestEnvelope,
  ): Promise<PortResult<PreparedBuilderTask>>;
}

/** The pair the factory returns and the controller consumes. */
export interface FlowPorts {
  discovery: DiscoveryPort;
  spec: SpecPort;
}
