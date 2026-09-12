/**
 * Framework-free DOM rendering for the Discovery -> Spec flow webview surfaces.
 *
 * This module is the flow-side analogue of {@link file://../render.ts}
 * (`PanelRenderer`): it builds and updates the flow shell DOM with plain
 * TypeScript + DOM APIs (no framework, to avoid adding dependencies), using the
 * **existing inline-CSS design system** (VS Code theme vars + class hooks) that
 * task 14 fills in. All copy is Korean.
 *
 * Renderers mirror `PanelRenderer`'s idempotent build-once/update-in-place
 * style: each view is constructed once against a root element, remembers its
 * child elements, and each subsequent `render(snapshot)` updates text,
 * visibility, and disabled state in place (never rebuilding wholesale). Every
 * renderer takes a shared {@link FlowRenderCallbacks} object through which it
 * posts user intents back to the host.
 *
 * This file currently implements {@link DiscoveryStartView} (Req 4). The
 * {@link FlowRenderCallbacks} interface is defined in full now so tasks 12.2 /
 * 12.3 can add `DiscoveryWorkspace` and `SpecReview` to this same file and wire
 * their intents without re-touching the callbacks seam.
 *
 * See design.md "Webview UI surfaces".
 * Requirements: 4.1, 4.2, 4.3, 4.6, 13 (draft restore).
 */

import type { FlowSnapshot } from "../../core/flow/flow-snapshot";
import type {
  CandidatePreview,
  CandidateRevisionReference,
  CandidateRound,
  DiscoveryInput,
  ExpectedDecision,
  LearnerLevel,
  LearningScopeCategory,
  LearningSpecRevision,
  ProjectCandidateRevision,
  SpecScopeEntry,
} from "../../core/flow/flow-types";
import { refKey } from "../../core/flow/flow-types";
import type { RefinementAction } from "./flow-messages";

/**
 * The maximum accepted Refinement_Composer free-text length (Req 7.1). Feedback
 * free text is capped at 2,000 characters.
 */
export const MAX_REFINEMENT_TEXT = 2000;

/**
 * Preview cards ({@link CandidatePreview}) do not carry a `revision`; the whole
 * preview round is the session's first revision. To form a
 * {@link CandidateRevisionReference} consistently with feedback-round refs
 * (and with basket `refKey`s), preview candidates are treated as **revision 1**.
 */
const PREVIEW_REVISION = 1;

/** Builds the revision-1 reference for a preview candidate (see {@link PREVIEW_REVISION}). */
function previewRef(preview: CandidatePreview): CandidateRevisionReference {
  return { candidateId: preview.candidateId, revision: PREVIEW_REVISION };
}

/**
 * The maximum accepted Learning Goal length, mirrored from the host contract
 * (Req 4.1/4.3). A goal must be 1..240 non-whitespace-only characters.
 */
export const MAX_LEARNING_GOAL = 240;

/**
 * Callbacks the flow render layer invokes when the learner interacts with a
 * flow surface. The full interface is defined now; {@link DiscoveryStartView}
 * uses `onStartDiscovery` (and optionally `onDraftChanged`), while tasks
 * 12.2 / 12.3 wire the workspace and spec-review intents.
 */
export interface FlowRenderCallbacks {
  /** The learner submitted the Discovery Start form (Req 4). */
  onStartDiscovery(input: DiscoveryInput): void;
  /** The learner toggled a candidate in the basket (Req 6.1/6.2). */
  onToggleBasket(ref: CandidateRevisionReference): void;
  /** The learner submitted composer feedback with an action + targets (Req 7). */
  onSubmitRefinement(
    action: RefinementAction,
    text: string,
    targets: CandidateRevisionReference[],
  ): void;
  /** The learner selected a candidate to draft a spec (Req 8). */
  onSelectCandidate(target: CandidateRevisionReference): void;
  /** The learner asked to refine the current spec draft (Req 10). */
  onRefineSpec(message: string): void;
  /** The learner confirmed the spec, advancing to Build (Req 11). */
  onConfirmSpec(): void;
  /**
   * An unsent input field changed; reported so the host can restore it on
   * re-hydration (Req 13.2). Optional so views can omit draft reporting.
   */
  onDraftChanged?(field: string, text: string): void;
}

/** The ordered set of learner levels offered by the Discovery Start form. */
const LEVEL_OPTIONS: readonly { value: LearnerLevel; label: string }[] = [
  { value: "UNSPECIFIED", label: "선택 안 함" },
  { value: "NEW", label: "처음이에요" },
  { value: "BEGINNER", label: "초보예요" },
  { value: "FAMILIAR", label: "익숙해요" },
];

/**
 * Renders and updates the Discovery Start surface (Req 4).
 *
 * Build-once/update-in-place: the constructor builds the form skeleton once
 * against `root`; {@link DiscoveryStartView.render} is idempotent and only
 * updates values, the length indicator, the Agent_Run_Banner, and the submit
 * control's disabled state on each snapshot.
 *
 * The view is shown only while `snapshot.phase === "discovery_start"`; for any
 * other phase it hides its container so the shell can reveal a different
 * surface. On each render it restores the learningGoal + optional fields from
 * `snapshot.input` when present (Req 13 draft restore), keeps submit disabled
 * while the goal is empty/whitespace-only or exceeds {@link MAX_LEARNING_GOAL}
 * (showing a length notice in the latter case, Req 4.2/4.3), and shows the
 * Agent_Run_Banner + disables submit while `snapshot.discoveryInProgress`
 * (Req 4.6).
 */
export class DiscoveryStartView {
  private readonly doc: Document;
  private readonly callbacks: FlowRenderCallbacks;

  /** The top-level container, shown only in the `discovery_start` phase. */
  private readonly container: HTMLElement;
  /** The required Learning Goal input. */
  private readonly goalInput: HTMLTextAreaElement;
  /** Optional personal-need input. */
  private readonly personalNeedInput: HTMLInputElement;
  /** Optional recent-friction input. */
  private readonly frictionInput: HTMLInputElement;
  /** Optional current-level select. */
  private readonly levelSelect: HTMLSelectElement;
  /** Length / validation indicator. */
  private readonly lengthIndicator: HTMLElement;
  /** The submit ("후보 만나기") control. */
  private readonly submitButton: HTMLButtonElement;
  /** The Agent_Run_Banner, hidden unless a discovery op is in flight. */
  private readonly agentBanner: HTMLElement;

  /** True while a discovery op is in flight (mirrors the last snapshot). */
  private discoveryInProgress = false;

  constructor(root: HTMLElement, callbacks: FlowRenderCallbacks) {
    this.doc = root.ownerDocument;
    this.callbacks = callbacks;

    const container = this.el("div", "flow-start");

    const heading = this.el("h1", "flow-start-heading");
    heading.textContent = "무엇을 배우고 싶나요?";
    container.appendChild(heading);

    const intro = this.el("p", "flow-start-intro");
    intro.textContent = "배우고 싶은 목표를 적어 주세요. 함께 만들 프로젝트 후보를 찾아드릴게요.";
    container.appendChild(intro);

    // Agent_Run_Banner (Req 4.6) — hidden by default.
    const banner = this.el("div", "flow-agent-banner");
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.textContent = "후보를 찾고 있어요…";
    banner.hidden = true;
    container.appendChild(banner);
    this.agentBanner = banner;

    // Required Learning Goal input (Req 4.1).
    const goalField = this.el("div", "flow-field");
    const goalLabel = this.el("label", "flow-field-label");
    goalLabel.textContent = "학습 목표 (필수)";
    const goalInput = this.el("textarea", "flow-goal-input") as HTMLTextAreaElement;
    goalInput.setAttribute("aria-label", "학습 목표");
    goalInput.setAttribute("placeholder", "예: 리액트로 나만의 할 일 앱을 만들어 보고 싶어요");
    goalInput.rows = 3;
    goalInput.maxLength = MAX_LEARNING_GOAL * 4; // allow over-typing so Req 4.3 notice can show.
    goalInput.addEventListener("input", () => {
      this.callbacks.onDraftChanged?.("learningGoal", goalInput.value);
      this.refreshValidation();
    });
    goalField.appendChild(goalLabel);
    goalField.appendChild(goalInput);
    container.appendChild(goalField);
    this.goalInput = goalInput;

    // Length / validation indicator (Req 4.3).
    const indicator = this.el("div", "flow-length-indicator");
    indicator.setAttribute("aria-live", "polite");
    indicator.hidden = true;
    container.appendChild(indicator);
    this.lengthIndicator = indicator;

    // Optional personalNeed (Req 4.1).
    this.personalNeedInput = this.buildOptionalField(
      container,
      "이걸 배우고 싶은 이유 (선택)",
      "개인적인 필요",
      "personalNeed",
    );

    // Optional recentFriction (Req 4.1).
    this.frictionInput = this.buildOptionalField(
      container,
      "최근에 겪은 불편함 (선택)",
      "최근의 어려움",
      "recentFriction",
    );

    // Optional currentLevel select (Req 4.1).
    const levelField = this.el("div", "flow-field");
    const levelLabel = this.el("label", "flow-field-label");
    levelLabel.textContent = "현재 실력 (선택)";
    const levelSelect = this.el("select", "flow-level-select") as HTMLSelectElement;
    levelSelect.setAttribute("aria-label", "현재 실력");
    for (const option of LEVEL_OPTIONS) {
      const opt = this.doc.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      levelSelect.appendChild(opt);
    }
    levelSelect.addEventListener("change", () => {
      this.callbacks.onDraftChanged?.("currentLevel", levelSelect.value);
    });
    levelField.appendChild(levelLabel);
    levelField.appendChild(levelSelect);
    container.appendChild(levelField);
    this.levelSelect = levelSelect;

    // Submit control (Req 4).
    const submit = this.el("button", "flow-start-submit") as HTMLButtonElement;
    submit.type = "button";
    submit.textContent = "후보 만나기";
    submit.disabled = true;
    submit.addEventListener("click", () => this.attemptSubmit());
    container.appendChild(submit);
    this.submitButton = submit;

    root.appendChild(container);
    this.container = container;
    this.refreshValidation();
  }

  /**
   * Idempotent update-in-place from a snapshot. Reveals the start view only in
   * the `discovery_start` phase, restores the retained input (Req 13), shows
   * the Agent_Run_Banner + disables submit while a discovery op runs (Req 4.6),
   * and re-evaluates the submit lock + length notice (Req 4.2/4.3).
   */
  render(snapshot: FlowSnapshot): void {
    const visible = snapshot.phase === "discovery_start";
    this.container.hidden = !visible;
    if (!visible) {
      return;
    }

    // Restore the retained input on (re-)hydration (Req 13 draft restore). Only
    // overwrite when out of sync so it does not fight active typing.
    const input = snapshot.input;
    const goal = input?.learningGoal ?? "";
    if (this.goalInput.value !== goal) {
      this.goalInput.value = goal;
    }
    const personalNeed = input?.personalNeed ?? "";
    if (this.personalNeedInput.value !== personalNeed) {
      this.personalNeedInput.value = personalNeed;
    }
    const friction = input?.recentFriction ?? "";
    if (this.frictionInput.value !== friction) {
      this.frictionInput.value = friction;
    }
    const level = input?.currentLevel ?? "UNSPECIFIED";
    if (this.levelSelect.value !== level) {
      this.levelSelect.value = level;
    }

    // Agent_Run_Banner + submit lock while a discovery op is in flight (Req 4.6).
    this.discoveryInProgress = snapshot.discoveryInProgress;
    this.agentBanner.hidden = !this.discoveryInProgress;

    this.refreshValidation();
  }

  /**
   * Builds an optional single-line text field, appends it to `container`, and
   * returns the input element. The field reports draft changes under `field`.
   */
  private buildOptionalField(
    container: HTMLElement,
    labelText: string,
    ariaLabel: string,
    field: string,
  ): HTMLInputElement {
    const wrap = this.el("div", "flow-field");
    const label = this.el("label", "flow-field-label");
    label.textContent = labelText;
    const input = this.el("input", "flow-optional-input") as HTMLInputElement;
    input.type = "text";
    input.setAttribute("aria-label", ariaLabel);
    input.addEventListener("input", () => {
      this.callbacks.onDraftChanged?.(field, input.value);
    });
    wrap.appendChild(label);
    wrap.appendChild(input);
    container.appendChild(wrap);
    return input;
  }

  /**
   * Re-evaluates the submit lock and length notice against the current goal
   * text and in-progress state. Submit is disabled while the goal is
   * empty/whitespace-only (Req 4.2) or exceeds {@link MAX_LEARNING_GOAL}
   * (Req 4.3) or a discovery op is running (Req 4.6); an over-limit goal shows
   * a length notice.
   */
  private refreshValidation(): void {
    const value = this.goalInput.value;
    const trimmedLength = value.trim().length;
    const overLimit = value.length > MAX_LEARNING_GOAL;
    const emptyOrWhitespace = trimmedLength === 0;

    if (overLimit) {
      this.lengthIndicator.hidden = false;
      this.lengthIndicator.textContent = `학습 목표는 최대 ${MAX_LEARNING_GOAL}자까지 입력할 수 있어요. (현재 ${value.length}자)`;
    } else {
      this.lengthIndicator.hidden = true;
      this.lengthIndicator.textContent = "";
    }

    this.submitButton.disabled = emptyOrWhitespace || overLimit || this.discoveryInProgress;
  }

  /**
   * Reads the fields, guards the same validation client-side, composes a
   * {@link DiscoveryInput}, and posts `onStartDiscovery`. Optional fields are
   * omitted when blank; `currentLevel` is omitted when left `UNSPECIFIED`.
   */
  private attemptSubmit(): void {
    if (this.submitButton.disabled) {
      return;
    }
    const learningGoal = this.goalInput.value;
    // Client-side guard mirroring refreshValidation (Req 4.2/4.3).
    if (learningGoal.trim().length === 0 || learningGoal.length > MAX_LEARNING_GOAL) {
      this.refreshValidation();
      return;
    }

    const input: DiscoveryInput = { learningGoal };
    const personalNeed = this.personalNeedInput.value.trim();
    if (personalNeed.length > 0) {
      input.personalNeed = personalNeed;
    }
    const recentFriction = this.frictionInput.value.trim();
    if (recentFriction.length > 0) {
      input.recentFriction = recentFriction;
    }
    const level = this.levelSelect.value as LearnerLevel;
    if (level !== "UNSPECIFIED") {
      input.currentLevel = level;
    }

    this.callbacks.onStartDiscovery(input);
  }

  /** Creates an element with a class name, mirroring `PanelRenderer.el`. */
  private el(tag: string, className: string): HTMLElement {
    const element = this.doc.createElement(tag);
    element.className = className;
    return element;
  }
}

/**
 * Renders and updates the Discovery Workspace surface (Req 5, 6, 7, 8).
 *
 * Build-once/update-in-place: the constructor builds the stable shell once
 * against `root` — the Agent_Run_Banner, the scrollable rounds region, and the
 * Refinement_Composer (free-text input + action buttons). Each
 * {@link DiscoveryWorkspace.render} call reveals the surface only in the
 * `discovery_workspace` phase, then rebuilds the dynamic rounds region in place
 * from the snapshot (the preview round as the base 10 cards plus each
 * accumulated feedback round in ascending `roundIndex`), and updates the banner
 * + control disabled state.
 *
 * The workspace keeps **no independent selection state**: basket membership is
 * read from `snapshot.basket` on every render (Req 6.3), and the composer reads
 * the current basket selection at click time from the last snapshot so its
 * client-side narrow/merge guards (Req 7.3/7.5) always reflect live selection.
 *
 * Feedback action -> Discovery_Feedback intent mapping happens host-side; this
 * surface posts the {@link RefinementAction} plus the free text and the target
 * refs (the basket selection for narrow/merge, `[]` for new-direction/show-more)
 * through `onSubmitRefinement`. Select-to-proceed posts `onSelectCandidate`
 * (Req 8.1).
 */
export class DiscoveryWorkspace {
  private readonly doc: Document;
  private readonly callbacks: FlowRenderCallbacks;

  /** The top-level container, shown only in the `discovery_workspace` phase. */
  private readonly container: HTMLElement;
  /** The Agent_Run_Banner, hidden unless a discovery op is in flight. */
  private readonly agentBanner: HTMLElement;
  /** The scrollable region holding the round sections + candidate cards. */
  private readonly roundsRegion: HTMLElement;
  /** The composer free-text input (<= {@link MAX_REFINEMENT_TEXT} chars). */
  private readonly composerInput: HTMLTextAreaElement;
  /** The composer action buttons, disabled while a discovery op runs. */
  private readonly actionButtons: HTMLButtonElement[] = [];
  /** The composer message line (guard failures / hints). */
  private readonly composerMessage: HTMLElement;

  /** The last snapshot, read by the composer/select handlers at click time. */
  private snapshot: FlowSnapshot | null = null;
  /** True while a discovery op is in flight (mirrors the last snapshot). */
  private discoveryInProgress = false;

  constructor(root: HTMLElement, callbacks: FlowRenderCallbacks) {
    this.doc = root.ownerDocument;
    this.callbacks = callbacks;

    const container = this.el("div", "flow-workspace");

    const heading = this.el("h1", "flow-workspace-heading");
    heading.textContent = "프로젝트 후보를 골라 보세요";
    container.appendChild(heading);

    // Agent_Run_Banner (Req 5.5, 7.11) — hidden by default.
    const banner = this.el("div", "flow-agent-banner");
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.textContent = "후보를 준비하고 있어요…";
    banner.hidden = true;
    container.appendChild(banner);
    this.agentBanner = banner;

    // Dynamic rounds region — rebuilt in place each render.
    const rounds = this.el("div", "flow-rounds");
    container.appendChild(rounds);
    this.roundsRegion = rounds;

    // Refinement_Composer (Req 7.1).
    const composer = this.el("div", "flow-composer");

    const composerLabel = this.el("label", "flow-field-label");
    composerLabel.textContent = "어떻게 다듬을까요? (선택 입력)";
    composer.appendChild(composerLabel);

    const composerInput = this.el("textarea", "flow-composer-input") as HTMLTextAreaElement;
    composerInput.setAttribute("aria-label", "다듬기 요청");
    composerInput.setAttribute(
      "placeholder",
      "예: 두 후보를 합쳐서 더 실용적인 방향으로 만들어 주세요",
    );
    composerInput.rows = 3;
    composerInput.maxLength = MAX_REFINEMENT_TEXT;
    composer.appendChild(composerInput);
    this.composerInput = composerInput;

    // Composer message line (guard failures, Req 7.3/7.5).
    const message = this.el("div", "flow-composer-message");
    message.setAttribute("aria-live", "polite");
    message.hidden = true;
    composer.appendChild(message);
    this.composerMessage = message;

    // Composer action buttons (Req 7.2/7.4/7.6/7.7).
    const actions = this.el("div", "flow-composer-actions");
    const actionSpecs: readonly { action: RefinementAction; label: string }[] = [
      { action: "narrow", label: "좁히기" },
      { action: "merge", label: "합치기" },
      { action: "new_direction", label: "새 방향" },
      { action: "show_more", label: "더 보기" },
    ];
    for (const spec of actionSpecs) {
      const button = this.el("button", "flow-composer-action") as HTMLButtonElement;
      button.type = "button";
      button.textContent = spec.label;
      button.dataset.action = spec.action;
      button.addEventListener("click", () => this.attemptRefinement(spec.action));
      actions.appendChild(button);
      this.actionButtons.push(button);
    }
    composer.appendChild(actions);

    container.appendChild(composer);

    root.appendChild(container);
    this.container = container;
  }

  /**
   * Idempotent update-in-place from a snapshot. Reveals the workspace only in
   * the `discovery_workspace` phase, rebuilds the rounds region (preview round
   * as the base 10 cards + accumulated feedback rounds in ascending
   * `roundIndex`), reflects basket state per card (Req 6.3), and shows the
   * Agent_Run_Banner + disables the action/select controls while a discovery op
   * runs (Req 5.5, 7.11) — re-enabling them otherwise (Req 7.12).
   */
  render(snapshot: FlowSnapshot): void {
    this.snapshot = snapshot;
    const visible = snapshot.phase === "discovery_workspace";
    this.container.hidden = !visible;
    if (!visible) {
      return;
    }

    this.discoveryInProgress = snapshot.discoveryInProgress;
    this.agentBanner.hidden = !this.discoveryInProgress;

    // Disable composer + select controls while a discovery op is in flight
    // (Req 5.5, 7.11); re-enable otherwise (Req 7.12).
    for (const button of this.actionButtons) {
      button.disabled = this.discoveryInProgress;
    }

    this.rebuildRounds(snapshot);
  }

  /**
   * Rebuilds the rounds region from scratch against the snapshot: the preview
   * round (rationale + base 10 cards) first, then each accumulated feedback
   * round section in ascending `roundIndex` (Req 5.2, 5.4). Enriched detail is
   * matched by `candidateId` from `snapshot.enrichedCandidates` (Req 5.3).
   */
  private rebuildRounds(snapshot: FlowSnapshot): void {
    this.roundsRegion.textContent = "";

    const enrichedById = new Map<string, ProjectCandidateRevision>();
    for (const enriched of snapshot.enrichedCandidates) {
      enrichedById.set(enriched.candidateId, enriched);
    }
    const basket = new Set(snapshot.basket);

    // Preview round as the base set of 10 cards (Req 5.1, 5.2).
    const preview = snapshot.previewRound;
    if (preview) {
      const section = this.el("div", "flow-round");
      const header = this.el("div", "flow-round-header");
      header.textContent = "라운드 1";
      section.appendChild(header);

      const rationale = this.el("p", "flow-round-rationale");
      rationale.textContent = preview.generationRationale;
      section.appendChild(rationale);

      for (const item of preview.previews) {
        section.appendChild(
          this.buildPreviewCard(item, basket, enrichedById.get(item.candidateId)),
        );
      }
      this.roundsRegion.appendChild(section);
    }

    // Accumulated feedback rounds in ascending roundIndex (Req 5.4).
    const rounds = [...snapshot.rounds].sort((a, b) => a.roundIndex - b.roundIndex);
    for (const round of rounds) {
      this.roundsRegion.appendChild(this.buildRoundSection(round, basket, enrichedById));
    }
  }

  /**
   * Builds a candidate card for a {@link CandidatePreview}: title, summary,
   * appeal, coreInteraction, and generationTags as chips (Req 5.1); a basket
   * toggle reflecting membership (Req 6.3); a select-to-proceed control
   * (Req 8.1); and, when an enriched revision exists, its coreConcepts +
   * suggestedScope (Req 5.3).
   */
  private buildPreviewCard(
    preview: CandidatePreview,
    basket: ReadonlySet<string>,
    enriched: ProjectCandidateRevision | undefined,
  ): HTMLElement {
    const ref = previewRef(preview);
    const card = this.buildCardShell(ref, basket, {
      title: preview.title,
      summary: preview.summary,
      appeal: preview.appeal,
      coreInteraction: preview.coreInteraction,
      tags: preview.generationTags,
    });
    if (enriched) {
      card.appendChild(this.buildEnrichedDetail(enriched));
    }
    return card;
  }

  /**
   * Builds a feedback-round section: its `roundIndex` header + generationRationale
   * (Req 5.2), then a lighter card per {@link CandidateRevisionReference}. When
   * an enriched revision matches the ref (by candidateId), its full preview-like
   * fields + coreConcepts + suggestedScope are shown (Req 5.3); otherwise a
   * minimal card by ref keeps the surface robust when only refs are available.
   */
  private buildRoundSection(
    round: CandidateRound,
    basket: ReadonlySet<string>,
    enrichedById: ReadonlyMap<string, ProjectCandidateRevision>,
  ): HTMLElement {
    const section = this.el("div", "flow-round");
    const header = this.el("div", "flow-round-header");
    header.textContent = `라운드 ${round.roundIndex}`;
    section.appendChild(header);

    const rationale = this.el("p", "flow-round-rationale");
    rationale.textContent = round.generationRationale;
    section.appendChild(rationale);

    for (const ref of round.candidates) {
      const enriched = enrichedById.get(ref.candidateId);
      if (enriched) {
        const card = this.buildCardShell(ref, basket, {
          title: enriched.title,
          summary: enriched.summary,
          appeal: enriched.appeal,
          coreInteraction: enriched.coreInteraction,
          tags: enriched.generationTags,
        });
        card.appendChild(this.buildEnrichedDetail(enriched));
        section.appendChild(card);
      } else {
        section.appendChild(this.buildRefOnlyCard(ref, basket));
      }
    }
    return section;
  }

  /**
   * Builds the shared card shell for a reference: title, summary, appeal,
   * coreInteraction, tag chips, the basket toggle, and the select-to-proceed
   * control. Both preview and enriched cards reuse this.
   */
  private buildCardShell(
    ref: CandidateRevisionReference,
    basket: ReadonlySet<string>,
    fields: {
      title: string;
      summary: string;
      appeal: string;
      coreInteraction: string;
      tags: readonly string[];
    },
  ): HTMLElement {
    const card = this.el("div", "flow-candidate-card");

    const title = this.el("h2", "flow-candidate-title");
    title.textContent = fields.title;
    card.appendChild(title);

    const summary = this.el("p", "flow-candidate-summary");
    summary.textContent = fields.summary;
    card.appendChild(summary);

    const appeal = this.el("p", "flow-candidate-appeal");
    appeal.textContent = `매력 포인트: ${fields.appeal}`;
    card.appendChild(appeal);

    const interaction = this.el("p", "flow-candidate-interaction");
    interaction.textContent = `핵심 경험: ${fields.coreInteraction}`;
    card.appendChild(interaction);

    if (fields.tags.length > 0) {
      const tags = this.el("div", "flow-candidate-tags");
      for (const tag of fields.tags) {
        const chip = this.el("span", "flow-tag");
        chip.textContent = tag;
        tags.appendChild(chip);
      }
      card.appendChild(tags);
    }

    card.appendChild(this.buildCardControls(ref, basket));
    return card;
  }

  /**
   * Builds a minimal card for a bare {@link CandidateRevisionReference} (no
   * enriched detail yet), so feedback-round rendering stays robust when only
   * refs are available. Still carries the basket toggle + select control.
   */
  private buildRefOnlyCard(
    ref: CandidateRevisionReference,
    basket: ReadonlySet<string>,
  ): HTMLElement {
    const card = this.el("div", "flow-candidate-card");
    const title = this.el("h2", "flow-candidate-title");
    title.textContent = `후보 ${ref.candidateId}`;
    card.appendChild(title);

    const note = this.el("p", "flow-candidate-summary");
    note.textContent = "세부 정보를 불러오는 중이에요.";
    card.appendChild(note);

    card.appendChild(this.buildCardControls(ref, basket));
    return card;
  }

  /**
   * Builds the per-card controls row: the basket toggle reflecting current
   * membership (Req 6.3) and the select-to-proceed control (Req 8.1). Both are
   * disabled while a discovery op is in flight.
   */
  private buildCardControls(
    ref: CandidateRevisionReference,
    basket: ReadonlySet<string>,
  ): HTMLElement {
    const controls = this.el("div", "flow-candidate-controls");

    const inBasket = basket.has(refKey(ref));
    const toggle = this.el("button", "flow-basket-toggle") as HTMLButtonElement;
    toggle.type = "button";
    toggle.textContent = inBasket ? "바구니에서 빼기" : "바구니에 담기";
    toggle.setAttribute("aria-pressed", inBasket ? "true" : "false");
    toggle.disabled = this.discoveryInProgress;
    toggle.addEventListener("click", () => {
      this.callbacks.onToggleBasket({ candidateId: ref.candidateId, revision: ref.revision });
    });
    controls.appendChild(toggle);

    const select = this.el("button", "flow-select-button") as HTMLButtonElement;
    select.type = "button";
    select.textContent = "이걸로 진행";
    select.disabled = this.discoveryInProgress;
    select.addEventListener("click", () => {
      this.callbacks.onSelectCandidate({ candidateId: ref.candidateId, revision: ref.revision });
    });
    controls.appendChild(select);

    return controls;
  }

  /**
   * Builds the enriched-detail block for a {@link ProjectCandidateRevision}:
   * coreConcepts as chips and the suggestedScope split into learnerFocus /
   * agentSupport / excluded (Req 5.3).
   */
  private buildEnrichedDetail(enriched: ProjectCandidateRevision): HTMLElement {
    const detail = this.el("div", "flow-enriched");

    if (enriched.coreConcepts.length > 0) {
      const conceptsLabel = this.el("div", "flow-enriched-label");
      conceptsLabel.textContent = "핵심 개념";
      detail.appendChild(conceptsLabel);
      const concepts = this.el("div", "flow-candidate-tags");
      for (const concept of enriched.coreConcepts) {
        const chip = this.el("span", "flow-tag");
        chip.textContent = concept;
        concepts.appendChild(chip);
      }
      detail.appendChild(concepts);
    }

    const scope = enriched.suggestedScope;
    detail.appendChild(this.buildScopeGroup("내가 집중할 부분", scope.learnerFocus));
    detail.appendChild(this.buildScopeGroup("에이전트가 도울 부분", scope.agentSupport));
    detail.appendChild(this.buildScopeGroup("이번엔 제외할 부분", scope.excluded));

    return detail;
  }

  /** Builds one labeled scope group with its entries as chips. */
  private buildScopeGroup(label: string, entries: readonly string[]): HTMLElement {
    const group = this.el("div", "flow-enriched-scope");
    const groupLabel = this.el("div", "flow-enriched-label");
    groupLabel.textContent = label;
    group.appendChild(groupLabel);
    const chips = this.el("div", "flow-candidate-tags");
    for (const entry of entries) {
      const chip = this.el("span", "flow-tag");
      chip.textContent = entry;
      chips.appendChild(chip);
    }
    group.appendChild(chips);
    return group;
  }

  /**
   * Handles a composer action click: reads the live basket selection from the
   * last snapshot, applies the client-side narrow/merge guards (Req 7.3/7.5),
   * and on success posts `onSubmitRefinement` with the mapped targets and the
   * free text (host attaches it when non-empty, Req 7.8). narrow/merge target
   * the selection; new-direction/show-more submit with no targets regardless of
   * selection (Req 7.6/7.7). After a successful submit the composer text is
   * cleared optimistically.
   */
  private attemptRefinement(action: RefinementAction): void {
    if (this.discoveryInProgress) {
      return;
    }
    const snapshot = this.snapshot;
    const selection = this.selectedRefs(snapshot);
    const text = this.composerInput.value;

    let targets: CandidateRevisionReference[];
    if (action === "narrow") {
      // Req 7.3: narrow requires exactly 1 selected candidate.
      if (selection.length !== 1) {
        this.showComposerMessage("좁히기는 후보를 정확히 1개 선택해야 해요.");
        return;
      }
      targets = selection;
    } else if (action === "merge") {
      // Req 7.5: merge requires 2 or more selected candidates.
      if (selection.length < 2) {
        this.showComposerMessage("합치기는 후보를 2개 이상 선택해야 해요.");
        return;
      }
      targets = selection;
    } else {
      // new_direction (Req 7.6) / show_more (Req 7.7): no targets.
      targets = [];
    }

    this.clearComposerMessage();
    this.callbacks.onSubmitRefinement(action, text, targets);
    // Optimistically clear the free text after a successful submit.
    this.composerInput.value = "";
  }

  /**
   * Reads the current basket selection from the snapshot as concrete
   * {@link CandidateRevisionReference}s. The basket stores canonical
   * `candidateId:revision` `refKey`s; this parses them back into refs so the
   * composer targets match host expectations.
   */
  private selectedRefs(snapshot: FlowSnapshot | null): CandidateRevisionReference[] {
    if (!snapshot) {
      return [];
    }
    const refs: CandidateRevisionReference[] = [];
    for (const key of snapshot.basket) {
      const idx = key.lastIndexOf(":");
      if (idx <= 0) {
        continue;
      }
      const candidateId = key.slice(0, idx);
      const revision = Number.parseInt(key.slice(idx + 1), 10);
      if (Number.isFinite(revision)) {
        refs.push({ candidateId, revision });
      }
    }
    return refs;
  }

  /** Shows a composer guard/hint message (Req 7.3/7.5). */
  private showComposerMessage(text: string): void {
    this.composerMessage.hidden = false;
    this.composerMessage.textContent = text;
  }

  /** Clears the composer message line. */
  private clearComposerMessage(): void {
    this.composerMessage.hidden = true;
    this.composerMessage.textContent = "";
  }

  /** Creates an element with a class name, mirroring `PanelRenderer.el`. */
  private el(tag: string, className: string): HTMLElement {
    const element = this.doc.createElement(tag);
    element.className = className;
    return element;
  }
}

/** The ordered set of learning-scope categories shown in the Spec_Review scope
 * section (Req 9.4). Rendered in this order: what the learner focuses on, what
 * the agent supports, and what is excluded this time. */
const SCOPE_CATEGORY_ORDER: readonly LearningScopeCategory[] = [
  "LEARNER_FOCUS",
  "AGENT_SUPPORT",
  "EXCLUDED",
];

/** Korean section titles for each {@link LearningScopeCategory} (Req 9.4). */
const SCOPE_CATEGORY_LABELS: Readonly<Record<LearningScopeCategory, string>> = {
  LEARNER_FOCUS: "내가 배울 것",
  AGENT_SUPPORT: "에이전트가 도울 것",
  EXCLUDED: "이번 범위에서 제외",
};

/**
 * Renders and updates the Spec_Review surface (Req 9, 10, 11).
 *
 * Build-once/update-in-place: the constructor builds the stable shell once
 * against `root` — the Agent_Run_Banner, the dynamic spec-content region, and
 * the refine + confirm composer skeleton. Each {@link SpecReview.render} reveals
 * the surface only in the `spec_review` phase, rebuilds the spec-content region
 * in place from `snapshot.spec` (mirroring {@link DiscoveryWorkspace}'s
 * `rebuildRounds`), and updates the banner + control disabled state.
 *
 * The learner reviews the generated {@link LearningSpecRevision} — its product
 * purpose, target users + moments, MVP features, scope grouped into the three
 * {@link LearningScopeCategory} sections (Req 9.4), the expected decisions
 * (Req 9.5), and the runtime + deployment constraints (Req 9.6) — then either
 * refines it with free text (`onRefineSpec`, Req 10.1) or confirms it to advance
 * to Build (`onConfirmSpec`, Req 11.1). The Agent_Run_Banner shows while
 * `snapshot.specInProgress`, disabling the refine input/button and the confirm
 * control (Req 10.4, 11.6) and re-enabling them otherwise.
 */
export class SpecReview {
  private readonly doc: Document;
  private readonly callbacks: FlowRenderCallbacks;

  /** The top-level container, shown only in the `spec_review` phase. */
  private readonly container: HTMLElement;
  /** The Agent_Run_Banner, hidden unless a spec op is in flight. */
  private readonly agentBanner: HTMLElement;
  /** The dynamic spec-content region, rebuilt in place each render. */
  private readonly contentRegion: HTMLElement;
  /** The refine free-text input. */
  private readonly refineInput: HTMLTextAreaElement;
  /** The refine ("다듬기") button. */
  private readonly refineButton: HTMLButtonElement;
  /** The confirm ("이걸로 시작") button. */
  private readonly confirmButton: HTMLButtonElement;

  /** True while a spec op is in flight (mirrors the last snapshot). */
  private specInProgress = false;

  constructor(root: HTMLElement, callbacks: FlowRenderCallbacks) {
    this.doc = root.ownerDocument;
    this.callbacks = callbacks;

    const container = this.el("div", "flow-spec");

    const heading = this.el("h1", "flow-spec-heading");
    heading.textContent = "이 스펙으로 시작할까요?";
    container.appendChild(heading);

    // Agent_Run_Banner (Req 10.4, 11.6) — hidden by default.
    const banner = this.el("div", "flow-agent-banner");
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.textContent = "스펙을 다듬고 있어요…";
    banner.hidden = true;
    container.appendChild(banner);
    this.agentBanner = banner;

    // Dynamic spec-content region — rebuilt in place each render.
    const content = this.el("div", "flow-spec-content");
    container.appendChild(content);
    this.contentRegion = content;

    // Refine composer (Req 10.1).
    const composer = this.el("div", "flow-spec-composer");

    const refineLabel = this.el("label", "flow-field-label");
    refineLabel.textContent = "더 다듬고 싶은 부분이 있나요? (선택 입력)";
    composer.appendChild(refineLabel);

    const refineInput = this.el("textarea", "flow-spec-refine-input") as HTMLTextAreaElement;
    refineInput.setAttribute("aria-label", "스펙 다듬기 요청");
    refineInput.setAttribute(
      "placeholder",
      "예: 목표 사용자를 더 구체적으로 좁혀 주세요",
    );
    refineInput.rows = 3;
    refineInput.maxLength = MAX_REFINEMENT_TEXT;
    composer.appendChild(refineInput);
    this.refineInput = refineInput;

    const refineButton = this.el("button", "flow-spec-refine-button") as HTMLButtonElement;
    refineButton.type = "button";
    refineButton.textContent = "다듬기";
    refineButton.addEventListener("click", () => this.attemptRefine());
    composer.appendChild(refineButton);
    this.refineButton = refineButton;

    // Confirm control (Req 11.1) — prominent "이걸로 시작".
    const confirmButton = this.el("button", "flow-spec-confirm") as HTMLButtonElement;
    confirmButton.type = "button";
    confirmButton.textContent = "이걸로 시작";
    confirmButton.addEventListener("click", () => this.attemptConfirm());
    composer.appendChild(confirmButton);
    this.confirmButton = confirmButton;

    container.appendChild(composer);

    root.appendChild(container);
    this.container = container;
  }

  /**
   * Idempotent update-in-place from a snapshot. Reveals the spec surface only in
   * the `spec_review` phase, rebuilds the spec-content region from
   * `snapshot.spec` (a minimal loading state when the spec is not ready yet),
   * and shows the Agent_Run_Banner + disables the refine input/button and the
   * confirm control while a spec op runs (Req 10.4, 11.6) — re-enabling them
   * otherwise.
   */
  render(snapshot: FlowSnapshot): void {
    const visible = snapshot.phase === "spec_review";
    this.container.hidden = !visible;
    if (!visible) {
      return;
    }

    this.specInProgress = snapshot.specInProgress;
    this.agentBanner.hidden = !this.specInProgress;

    // Disable the refine + confirm controls while a spec op is in flight
    // (Req 10.4, 11.6); re-enable otherwise.
    this.refineInput.disabled = this.specInProgress;
    this.refineButton.disabled = this.specInProgress;
    this.confirmButton.disabled = this.specInProgress;

    this.rebuildContent(snapshot.spec);
  }

  /**
   * Rebuilds the spec-content region from scratch against the current spec. When
   * the spec is not ready yet (visible but null), renders a minimal loading
   * state; otherwise renders the full review: purpose (Req 9.1), users + moments
   * (Req 9.2), MVP features (Req 9.3), the grouped scope (Req 9.4), the expected
   * decisions (Req 9.5), and the runtime + deployment constraints (Req 9.6).
   */
  private rebuildContent(spec: LearningSpecRevision | null): void {
    this.contentRegion.textContent = "";

    if (!spec) {
      const loading = this.el("p", "flow-spec-loading");
      loading.textContent = "스펙을 준비하고 있어요…";
      this.contentRegion.appendChild(loading);
      return;
    }

    // Product purpose one-liner (Req 9.1).
    const purpose = this.el("p", "flow-spec-purpose");
    purpose.textContent = spec.productPurpose;
    this.contentRegion.appendChild(purpose);

    // Target users + primary usage / success moments (Req 9.2).
    this.contentRegion.appendChild(this.buildChipsSection("이런 분들을 위해", spec.targetUsers));

    this.contentRegion.appendChild(
      this.buildFactLine("주로 쓰는 순간", spec.primaryUsageMoment),
    );
    this.contentRegion.appendChild(this.buildFactLine("성공하는 순간", spec.successMoment));

    // MVP features (Req 9.3).
    this.contentRegion.appendChild(this.buildListSection("핵심 기능", spec.mvpFeatures));

    // Scope grouped by category in a fixed order (Req 9.4).
    const scopeSection = this.el("div", "flow-spec-scope");
    const scopeHeading = this.el("h2", "flow-spec-section-heading");
    scopeHeading.textContent = "이번 프로젝트의 범위";
    scopeSection.appendChild(scopeHeading);
    for (const category of SCOPE_CATEGORY_ORDER) {
      const entries = spec.scope.filter((entry) => entry.category === category);
      scopeSection.appendChild(this.buildScopeGroup(category, entries));
    }
    this.contentRegion.appendChild(scopeSection);

    // Expected decisions (Req 9.5).
    const decisionsSection = this.el("div", "flow-spec-decisions");
    const decisionsHeading = this.el("h2", "flow-spec-section-heading");
    decisionsHeading.textContent = "함께 정할 결정들";
    decisionsSection.appendChild(decisionsHeading);
    for (const decision of spec.expectedDecisions) {
      decisionsSection.appendChild(this.buildDecision(decision));
    }
    this.contentRegion.appendChild(decisionsSection);

    // Runtime + deployment constraints (Req 9.6).
    const constraintsSection = this.el("div", "flow-spec-constraints");
    const constraintsHeading = this.el("h2", "flow-spec-section-heading");
    constraintsHeading.textContent = "기술 제약";
    constraintsSection.appendChild(constraintsHeading);
    constraintsSection.appendChild(
      this.buildFactLine("실행 환경", spec.runtimeConstraint),
    );
    constraintsSection.appendChild(this.buildListSection("배포 제약", spec.deploymentConstraints));
    this.contentRegion.appendChild(constraintsSection);
  }

  /** Builds a labeled fact line: a bold label + its value. */
  private buildFactLine(label: string, value: string): HTMLElement {
    const line = this.el("p", "flow-spec-fact");
    const labelEl = this.el("span", "flow-spec-fact-label");
    labelEl.textContent = label;
    line.appendChild(labelEl);
    const valueEl = this.el("span", "flow-spec-fact-value");
    valueEl.textContent = value;
    line.appendChild(valueEl);
    return line;
  }

  /** Builds a labeled section rendering the entries as `flow-tag` chips. */
  private buildChipsSection(label: string, entries: readonly string[]): HTMLElement {
    const section = this.el("div", "flow-spec-chips-section");
    const labelEl = this.el("div", "flow-spec-section-label");
    labelEl.textContent = label;
    section.appendChild(labelEl);
    const chips = this.el("div", "flow-candidate-tags");
    for (const entry of entries) {
      const chip = this.el("span", "flow-tag");
      chip.textContent = entry;
      chips.appendChild(chip);
    }
    section.appendChild(chips);
    return section;
  }

  /** Builds a labeled section rendering the entries as a `flow-spec-list`. */
  private buildListSection(label: string, entries: readonly string[]): HTMLElement {
    const section = this.el("div", "flow-spec-list-section");
    const labelEl = this.el("div", "flow-spec-section-label");
    labelEl.textContent = label;
    section.appendChild(labelEl);
    const list = this.el("ul", "flow-spec-list");
    for (const entry of entries) {
      const item = this.el("li", "flow-spec-list-item");
      item.textContent = entry;
      list.appendChild(item);
    }
    section.appendChild(list);
    return section;
  }

  /**
   * Builds one scope group for a {@link LearningScopeCategory}: its Korean
   * section title + each {@link SpecScopeEntry} (title + rationale +
   * conceptNames as `flow-tag` chips) (Req 9.4).
   */
  private buildScopeGroup(
    category: LearningScopeCategory,
    entries: readonly SpecScopeEntry[],
  ): HTMLElement {
    const group = this.el("div", "flow-spec-scope-group");
    group.dataset.category = category;

    const title = this.el("h3", "flow-spec-scope-title");
    title.textContent = SCOPE_CATEGORY_LABELS[category];
    group.appendChild(title);

    for (const entry of entries) {
      const entryEl = this.el("div", "flow-spec-scope-entry");

      const entryTitle = this.el("div", "flow-spec-scope-entry-title");
      entryTitle.textContent = entry.title;
      entryEl.appendChild(entryTitle);

      const rationale = this.el("p", "flow-spec-scope-entry-rationale");
      rationale.textContent = entry.rationale;
      entryEl.appendChild(rationale);

      if (entry.conceptNames.length > 0) {
        const chips = this.el("div", "flow-candidate-tags");
        for (const concept of entry.conceptNames) {
          const chip = this.el("span", "flow-tag");
          chip.textContent = concept;
          chips.appendChild(chip);
        }
        entryEl.appendChild(chips);
      }

      group.appendChild(entryEl);
    }
    return group;
  }

  /**
   * Builds one expected-decision block for an {@link ExpectedDecision}: its
   * category, description, and why the learner's input matters (Req 9.5).
   */
  private buildDecision(decision: ExpectedDecision): HTMLElement {
    const block = this.el("div", "flow-decision");

    const category = this.el("div", "flow-decision-category");
    category.textContent = decision.category;
    block.appendChild(category);

    const description = this.el("p", "flow-decision-description");
    description.textContent = decision.description;
    block.appendChild(description);

    const why = this.el("p", "flow-decision-why");
    why.textContent = decision.whyUserInputMatters;
    block.appendChild(why);

    return block;
  }

  /**
   * Handles a refine click: posts `onRefineSpec` with the free text (Req 10.1)
   * and clears the input optimistically. No-ops while a spec op is in flight.
   */
  private attemptRefine(): void {
    if (this.specInProgress) {
      return;
    }
    const text = this.refineInput.value;
    this.callbacks.onRefineSpec(text);
    // Optimistically clear the free text after a successful submit.
    this.refineInput.value = "";
  }

  /**
   * Handles a confirm click: posts `onConfirmSpec` to advance to Build
   * (Req 11.1). No-ops while a spec op is in flight.
   */
  private attemptConfirm(): void {
    if (this.specInProgress) {
      return;
    }
    this.callbacks.onConfirmSpec();
  }

  /** Creates an element with a class name, mirroring `PanelRenderer.el`. */
  private el(tag: string, className: string): HTMLElement {
    const element = this.doc.createElement(tag);
    element.className = className;
    return element;
  }
}
