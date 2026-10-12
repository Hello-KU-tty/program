import { type OperationProgress, progressText } from "../../core/flow/flow-progress";

/**
 * Keeps one countdown line current while a Discovery or Spec step runs (K17):
 * the usual time, ticking down every second, then a "taking a little longer"
 * line past the estimate. Without timing (an older host) it shows `fallback`.
 */
export class Countdown {
  private progress: OperationProgress | null = null;
  private fallback = "";
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly element: HTMLElement,
    private readonly now: () => number = () => Date.now(),
  ) {
    element.setAttribute("aria-live", "off");
  }

  set(progress: OperationProgress | null | undefined, fallback = ""): void {
    const next = progress ?? null;
    this.fallback = fallback;
    if (JSON.stringify(next) !== JSON.stringify(this.progress)) {
      this.progress = next;
      if (next !== null && this.timer === null) this.timer = setInterval(() => this.tick(), 1000);
      if (next === null && this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
    this.tick();
  }

  private tick(): void {
    const text = this.progress === null ? this.fallback : progressText(this.progress, this.now());
    this.element.textContent = text;
    this.element.hidden = text === "";
  }
}
