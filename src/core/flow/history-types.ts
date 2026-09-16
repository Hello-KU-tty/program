/**
 * Program-local, webview-facing SAFE view-model types for read-only Project
 * History (guide §6 History row, §9 security boundary, §10-2).
 *
 * History is a SEPARATE, read-only concern from the Discovery -> Spec state
 * machine: it lists previously-created durable projects (`listProjects()`) and
 * can restore a single project's durable snapshot (`restoreProject(projectId)`)
 * for display — WITHOUT starting any run, mutating anything, or auto-triggering
 * discovery ("read-only, 모델 호출 0", "run 자동 시작 없음").
 *
 * SECURITY (guide §9). The types in this module are the ONLY History shapes
 * allowed to cross the host <-> webview boundary. They are projected from the
 * vendored `@vibe-helper/frontend-client` contracts (`ProjectHistory`,
 * `ProjectHistoryItem`, `ProjectSessionSnapshot`) but carry ONLY non-sensitive,
 * safe scalar fields. They MUST NEVER carry:
 *   - the `LocalConnection`, the connection-file path, or any bearer token,
 *   - an absolute `workspaceDirectory` / `generatedWorkspacePath`,
 *   - raw model transcripts, helper-conversation bodies, or decision payloads.
 * Only the safe projected fields declared here are permitted to be serialized
 * to the webview. Any new field added here MUST be a safe scalar.
 *
 * These are pure, transport-agnostic type declarations (no VS Code / adapter /
 * SDK runtime dependency) so they can be exercised by unit tests directly.
 */

import type { ProjectStatus } from "./flow-types";

/**
 * The surface a restored project would resume into, projected from the
 * contract `suggestedSurface`. A safe enum scalar (no path/token).
 */
export type HistorySuggestedSurface = "DISCOVERY" | "SPEC" | "BUILD";

/**
 * A single history row — the SAFE projection of a contract
 * `ProjectHistoryItem`. Carries only non-sensitive scalars for display in the
 * read-only History list (guide §6/§9). NO connection, token, or absolute path
 * is ever present here.
 */
export interface HistoryProjectView {
  /** Durable project id (`project_<uuid>`). Safe opaque identifier. */
  projectId: string;
  /** Project title. */
  title: string;
  /** The learning goal one-liner. */
  learningGoal: string;
  /** Lifecycle status. */
  status: ProjectStatus;
  /** Which surface a restore would resume into (safe enum). */
  suggestedSurface: HistorySuggestedSurface;
  /** Count of unresolved decisions (a safe scalar, never the decision bodies). */
  pendingDecisionCount: number;
  /** Count of helper conversations (a safe scalar, never the transcripts). */
  helperConversationCount: number;
  /** Last-updated epoch ms, when derivable from the contract `updatedAt`. */
  updatedAt?: number;
}

/**
 * The SAFE projection of a contract `ProjectHistory` — just the list of safe
 * {@link HistoryProjectView} rows. This is the only History-list shape that
 * crosses to the webview (guide §9).
 */
export interface ProjectHistoryView {
  projects: HistoryProjectView[];
}

/**
 * The SAFE projection of a restored durable `ProjectSessionSnapshot` for a
 * future "restore detail" view. Minimal by design (guide §6/§9): only safe
 * summary scalars — the project's title/status/goal, the resume surface,
 * whether a Learning Spec exists, and the current task title if any.
 *
 * SECURITY: this MUST NOT include `workspaceDirectory` / `generatedWorkspacePath`,
 * any connection/token, or raw transcripts/decision payloads. Adding a field
 * here requires it to be a safe scalar.
 */
export interface RestoredProjectView {
  /** Durable project id (`project_<uuid>`). */
  projectId: string;
  /** Project title. */
  title: string;
  /** The learning goal one-liner. */
  learningGoal: string;
  /** Lifecycle status. */
  status: ProjectStatus;
  /** Which surface this restore would resume into (safe enum). */
  suggestedSurface: HistorySuggestedSurface;
  /** Whether a Learning Spec exists on the durable snapshot (safe boolean). */
  hasSpec: boolean;
  /** The current task title, when one exists (safe scalar, no path/token). */
  currentTaskTitle?: string;
}
