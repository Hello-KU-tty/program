/**
 * CrewBackendPort — the **documented, unimplemented** crew-backend transport
 * for the Discovery -> Spec flow.
 *
 * This file is a **doc-only stub**. It exists so the future HTTP+HMAC transport
 * has a named home and a precise, reviewable contract, WITHOUT shipping any live
 * networking. It compiles, implements both {@link DiscoveryPort} and
 * {@link SpecPort}, and every method throws `not implemented`. It is deliberately
 * NOT wired into {@link createFlowPorts} — the factory keeps returning the
 * `MockDiscoveryPort`. When the real transport lands, this class is the single
 * concrete implementation the factory swaps to, and the FlowController/webview
 * change nothing (Req 1.4).
 *
 * ## Future transport contract
 *
 * All eight port operations map 1:1 onto a single crew-backend Core endpoint:
 *
 *   `POST /api/application`
 *
 * (Browser builds address it under the app prefix, e.g.
 * `/apps/vibe-helper/api/application`; the extension host uses the bare
 * `/api/application` target.) There is no per-operation REST surface — the
 * request body is a discriminated Core "application input" envelope whose kind
 * selects the operation (start discovery, generate preview round, enrich, submit
 * feedback, generate/refine/confirm spec, prepare builder task). The typed
 * `req` + {@link RequestEnvelope} of each method below is serialized into that
 * body.
 *
 * ### Request body
 *
 * The body is JSON with a mandatory protocol pin:
 *
 * ```jsonc
 * {
 *   // ...operation-specific Core application input (mapped from req + env)...
 *   "clientProtocolVersion": 3   // CREW_UI_PROTOCOL_VERSION; server 409s on mismatch
 * }
 * ```
 *
 * The {@link RequestEnvelope} fields (`correlationId`, `idempotencyKey`,
 * `expectedRevision`) travel inside this Core input so the backend can correlate,
 * dedupe, and enforce optimistic concurrency.
 *
 * ### Proxy signature (`x-kirocrew-proxy`)
 *
 * Every request is authenticated with a timestamped HMAC-SHA256 signature over a
 * canonical string binding the timestamp, method, target path, and a hash of the
 * exact serialized body. Given:
 *
 * - `body`      = the exact JSON string that is sent (including `clientProtocolVersion`)
 * - `timestamp` = current Unix time in **seconds**, as a string
 * - `target`    = the request path, e.g. `/api/application`
 * - `secret`    = the shared proxy secret (>= 32 bytes)
 *
 * the signature is computed as:
 *
 * ```ts
 * const bodyHash  = sha256(body).toString("hex");
 * const message   = `${timestamp}:POST:${target}:${bodyHash}`;
 * const signature = hmacSHA256(secret, message).toString("hex");
 * ```
 *
 * and sent as the header:
 *
 * ```
 * x-kirocrew-proxy: ${timestamp}:${signature}
 * content-type: application/json
 * ```
 *
 * The server recomputes the same message and rejects stale timestamps, bad
 * signatures, or unsupported media types.
 *
 * ### Response envelope
 *
 * The backend replies with a uniform Core envelope:
 *
 * ```jsonc
 * { "success": true,  "data": <operation result> }   // -> PortResult ok(value)
 * { "success": false, "error": { "code": ..., "message": ... } } // -> err(PortError)
 * ```
 *
 * The concrete implementation would translate `{ success, data }` into
 * `{ ok: true, value }` and map transport/HTTP failures (timeouts, `409`
 * protocol/revision conflicts, `5xx`, network errors) onto {@link PortError}
 * codes (`timeout` | `revision_conflict` | `unavailable` | `invalid` |
 * `unknown`) so that — like every port — it resolves an `err` rather than
 * throwing.
 *
 * See design.md "crew-backend-port.ts (doc-only stub)" and
 * `flow-port-factory.ts` for the swap point. Requirements: 1.4.
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
import type {
  DiscoveryPort,
  PortResult,
  RequestEnvelope,
  SpecPort,
} from "./discovery-port";

/**
 * The Core application endpoint every operation POSTs to. Documented here as the
 * single target the future transport signs and calls.
 */
export const CREW_BACKEND_APPLICATION_PATH = "/api/application";

/**
 * The protocol version the client pins in the request body
 * (`clientProtocolVersion`). Mismatches are rejected by the backend with `409`.
 */
export const CREW_UI_PROTOCOL_VERSION = 3;

/** Message used by every unimplemented method so the intent is unmistakable. */
const NOT_IMPLEMENTED =
  "CrewBackendPort not implemented: crew-backend transport is a documented spike";

/**
 * Documented, unimplemented crew-backend transport implementing both port
 * halves. Constructed with nothing today; the real version would take an HTTP
 * transport (base URL + proxy-secret signer). Every method throws — this class
 * is never wired into the factory (Req 1.4).
 */
export class CrewBackendPort implements DiscoveryPort, SpecPort {
  // --- DiscoveryPort ---------------------------------------------------------

  startDiscovery(
    _req: { projectId: string; input: DiscoveryInput },
    _env: RequestEnvelope,
  ): Promise<PortResult<DiscoverySession>> {
    throw new Error(NOT_IMPLEMENTED);
  }

  generatePreviewRound(
    _req: { discoverySessionId: string },
    _env: RequestEnvelope,
  ): Promise<PortResult<PreviewRound>> {
    throw new Error(NOT_IMPLEMENTED);
  }

  enrichCandidate(
    _req: { discoverySessionId: string; target: CandidateRevisionReference },
    _env: RequestEnvelope,
  ): Promise<PortResult<ProjectCandidateRevision>> {
    throw new Error(NOT_IMPLEMENTED);
  }

  submitFeedback(
    _req: { discoverySessionId: string; feedback: DiscoveryFeedback },
    _env: RequestEnvelope,
  ): Promise<PortResult<CandidateRound>> {
    throw new Error(NOT_IMPLEMENTED);
  }

  // --- SpecPort --------------------------------------------------------------

  generateSpecDraft(
    _req: { projectId: string; selectedCandidate: CandidateRevisionReference },
    _env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    throw new Error(NOT_IMPLEMENTED);
  }

  refineSpec(
    _req: { projectId: string; learningSpecId: string; message: string },
    _env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    throw new Error(NOT_IMPLEMENTED);
  }

  confirmSpec(
    _req: { projectId: string; learningSpecId: string },
    _env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    throw new Error(NOT_IMPLEMENTED);
  }

  prepareBuilderTask(
    _req: { projectId: string; learningSpecId: string },
    _env: RequestEnvelope,
  ): Promise<PortResult<PreparedBuilderTask>> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
