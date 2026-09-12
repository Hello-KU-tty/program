/**
 * Flow_Snapshot projection builder for the Discovery -> Spec flow.
 *
 * The {@link FlowController} owns all authoritative state (Req 13.1); the
 * webview holds only an immutable projection. `flow-snapshot.ts` builds that
 * projection — a {@link FlowSnapshot} — analogous to the existing
 * `TabStateSnapshot`. On webview reveal after disposal the host pushes a fresh
 * snapshot; the webview's view-model fully replaces its prior projection from
 * it, rebuilding rounds without duplication (Req 13.2, 13.3).
 *
 * The snapshot carries a top-level `phase` derived purely from
 * `Project.status` (plus whether a preview round exists), so the shell can
 * gate the flow surfaces vs the Build_Surface deterministically (Req 12.2,
 * 12.3). Every array and nested object is deep-copied so the webview
 * projection can never mutate host state.
 *
 * See design.md "Shell integration" and "Host-owned state and re-hydration".
 * Requirements: 12.2, 12.3, 13.2.
 */

import type { FlowControllerState, FlowNotice } from "./flow-controller";
import type {
  CandidateRevisionReference,
  CandidateRound,
  DiscoveryInput,
  LearningSpecRevision,
  PreparedBuilderTask,
  PreviewRound,
  Project,
  ProjectCandidateRevision,
  ProjectStatus,
} from "./flow-types";

/**
 * The top-level shell phase, derived from `Project.status` (Req 12.2, 12.3):
 *   - `discovery_start`     — DISCOVERY, no preview round yet
 *   - `discovery_workspace` — DISCOVERY, preview round present
 *   - `spec_review`         — SPEC_REVIEW
 *   - `building`            — BUILDING or COMPLETED (reveal the Build_Surface)
 */
export type FlowPhase = "discovery_start" | "discovery_workspace" | "spec_review" | "building";

/**
 * An immutable projection of the {@link FlowController}'s authoritative state,
 * pushed to the webview to (re-)hydrate its projection (Req 13.2). Every field
 * is a deep copy of host state so the webview cannot mutate the source.
 */
export interface FlowSnapshot {
  /** The derived shell phase (Req 12.2, 12.3). */
  phase: FlowPhase;
  /** The current project, or null before discovery starts. */
  project: Project | null;
  /** The retained discovery input (survives failures for resubmission). */
  input: DiscoveryInput | null;
  /** The first preview round, if generated. */
  previewRound: PreviewRound | null;
  /** Accumulated candidate rounds in ascending `roundIndex` order. */
  rounds: CandidateRound[];
  /** Enriched candidates fetched for the accumulated rounds. */
  enrichedCandidates: ProjectCandidateRevision[];
  /** Basket membership as canonical `refKey` strings. */
  basket: string[];
  /** The candidate selected to proceed to spec review, if any. */
  selectedCandidate: CandidateRevisionReference | null;
  /** The current Learning Spec revision (draft/confirmed), if any. */
  spec: LearningSpecRevision | null;
  /** The prepared Builder handoff task, once BUILDING. */
  preparedTask: PreparedBuilderTask | null;
  /** Whether a discovery-surface op is in flight (drives the Agent_Run_Banner). */
  discoveryInProgress: boolean;
  /** Whether a spec-surface op is in flight (drives the Agent_Run_Banner). */
  specInProgress: boolean;
  /** The latest notice per the append-only log, or null if none. */
  notice: { surface: string; kind: string; message: string } | null;
}

/**
 * Derive the shell {@link FlowPhase} from a project status (Req 12.2, 12.3).
 *
 * Pure and total: a `null` status (no project yet) or `DISCOVERY` maps to
 * `discovery_start` when no preview round exists and `discovery_workspace`
 * once one does; `SPEC_REVIEW` maps to `spec_review`; `BUILDING` and
 * `COMPLETED` both map to `building` (reveal the Build_Surface).
 */
export function derivePhase(status: ProjectStatus | null, hasPreviewRound: boolean): FlowPhase {
  switch (status) {
    case "SPEC_REVIEW":
      return "spec_review";
    case "BUILDING":
    case "COMPLETED":
      return "building";
    default:
      // null or DISCOVERY.
      return hasPreviewRound ? "discovery_workspace" : "discovery_start";
  }
}

/** Deep-clone a value via structured-clone-equivalent JSON round-trip. */
function clone<T>(value: T): T {
  return value === null || value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/**
 * Build an immutable {@link FlowSnapshot} from raw controller state and its
 * append-only notice log (Req 13.2). Every array and nested object is
 * deep-copied so the webview projection can never mutate host state; the
 * phase is derived via {@link derivePhase} and `notice` is the last emitted
 * notice (or null when none have been emitted).
 */
export function buildFlowSnapshot(
  state: FlowControllerState,
  notices: readonly FlowNotice[],
): FlowSnapshot {
  const lastNotice = notices.length > 0 ? notices[notices.length - 1] : null;

  return {
    phase: derivePhase(state.project?.status ?? null, state.previewRound !== null),
    project: clone(state.project),
    input: clone(state.input),
    previewRound: clone(state.previewRound),
    rounds: clone(state.rounds),
    enrichedCandidates: clone(state.enrichedCandidates),
    basket: [...state.basket],
    selectedCandidate: clone(state.selectedCandidate),
    spec: clone(state.spec),
    preparedTask: clone(state.preparedTask),
    discoveryInProgress: state.discoveryInProgress,
    specInProgress: state.specInProgress,
    notice: lastNotice
      ? { surface: lastNotice.surface, kind: lastNotice.kind, message: lastNotice.message }
      : null,
  };
}
