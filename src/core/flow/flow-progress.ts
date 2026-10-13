/**
 * Countdown for long Discovery and Spec steps (K17). The learner sees the
 * usual time ticking down instead of an open-ended spinner; past the estimate
 * the panel says it is taking a little longer instead of counting below zero.
 *
 * Estimates come from measured runs (Kiro-native 0.2.7–0.2.8, kiro-cli):
 * ten previews about 20–30 s, a new round about 30–45 s, "보완하기" with
 * nothing in the basket on the first screen about 2 minutes (it fills every
 * preview before the new round), a Spec draft or revision about 45 s.
 */

/** One running step: when its chain started and how long it usually takes. */
export interface OperationProgress {
  readonly startedAt: number;
  readonly estimateMs: number;
}

/** Usual duration per Flow operation kind; unknown kinds get a short default. */
export function estimateOperationMs(kind: string, context: { readonly hasRounds: boolean }): number {
  switch (kind) {
    case "startDiscovery":
    case "regenerateDiscovery":
    case "generatePreviewRound":
      return 30_000;
    case "submitFeedback":
      return context.hasRounds ? 45_000 : 120_000;
    case "selectCandidate":
      return 10_000;
    case "generateSpecDraft":
    case "refineSpec":
      return 45_000;
    case "confirmSpec":
    case "prepareBuilderTask":
      return 15_000;
    default:
      return 30_000;
  }
}

function duration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
}

/** The line under a running step, e.g. "약 1분 30초 남았어요". */
export function progressText(progress: OperationProgress | null, now: number): string {
  if (progress === null) return "";
  const left = Math.ceil((progress.startedAt + progress.estimateMs - now) / 1000);
  return left > 0
    ? `보통 ${duration(Math.round(progress.estimateMs / 1000))} 걸려요 · 약 ${duration(left)} 남았어요`
    : "예상보다 조금 더 걸리고 있어요. 끝나면 바로 보여 드릴게요.";
}
