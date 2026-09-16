/**
 * MockDiscoveryPort — the default {@link DiscoveryPort} + {@link SpecPort}
 * implementation for the Discovery -> Spec flow.
 *
 * One combined class implements both port halves (as `createFlowPorts` returns
 * the same instance for both). It produces realistic, varied Korean mock data
 * with no network access (Req 1.3, 15), mirroring `DemoAdapter`'s real-timer
 * approach so the UI loads believably — but is deterministic-enough for tests
 * via an injectable {@link Clock} and RNG seed.
 *
 * Every operation returns a `Promise<PortResult<T>>` that resolves after a
 * seeded latency scheduled through `clock.setTimeout` (default
 * {@link SystemClock}), always well under the controller's 30s op budgets. When
 * `options.failures` scripts a failure for an op kind, that op resolves an
 * `err(PortError)` instead so error paths are testable.
 *
 * Determinism: all data comes from a seeded mulberry32 PRNG so a given seed +
 * op sequence yields repeatable output (Req 15). Tests inject a fake clock and
 * advance time to resolve pending ops synchronously.
 *
 * See design.md "MockDiscoveryPort" for the authoritative behavior.
 * Requirements: 1.3, 15.1, 15.2, 15.3, 15.4, 15.5.
 */

import type { Clock } from "../../core/clock";
import { SystemClock } from "../../core/clock";
import type {
  CandidatePreview,
  CandidateRevisionReference,
  CandidateRound,
  CandidateScopeSuggestion,
  DiscoveryFeedback,
  DiscoveryInput,
  DiscoverySession,
  ExpectedDecision,
  GenerationTag,
  LearningSpecRevision,
  PreparedBuilderTask,
  PreviewRound,
  ProjectCandidateRevision,
  SpecScopeEntry,
} from "../../core/flow/flow-types";
import type {
  ProjectHistoryView,
  HistoryProjectView,
  RestoredProjectView,
} from "../../core/flow/history-types";
import type {
  DiscoveryPort,
  HistoryPort,
  PortError,
  PortResult,
  RequestEnvelope,
  SpecPort,
} from "./discovery-port";

/** The set of mock operation kinds that can be scripted to fail. */
export type MockOp =
  | "startDiscovery"
  | "generatePreviewRound"
  | "enrichCandidate"
  | "submitFeedback"
  | "generateSpecDraft"
  | "refineSpec"
  | "confirmSpec"
  | "prepareBuilderTask"
  | "listProjects"
  | "restoreProject";

/** Construction options for the {@link MockDiscoveryPort}. */
export interface MockPortOptions {
  /** Deterministic RNG seed so tests get repeatable data (Req 15). */
  seed?: number;
  /** Injectable clock so tests drive latency without real waits. Defaults to SystemClock. */
  clock?: Clock;
  /** Simulated per-op latency window in ms (defaults ~600-1400ms, < 30s budgets). */
  latency?: { minMs: number; maxMs: number };
  /** Optional scripted failures for a given op, so error paths are testable. */
  failures?: Partial<Record<MockOp, PortError>>;
}

const DEFAULT_SEED = 0x5eed_c0de;
const DEFAULT_LATENCY = { minMs: 600, maxMs: 1400 };

/**
 * A small, fast, deterministic PRNG (mulberry32). Given the same 32-bit seed it
 * produces the same sequence of floats in [0, 1). Used so mock data is
 * repeatable per seed (Req 15).
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Curated Korean corpora (beginner project idea generator vibe) ---

/** Project themes: a short title + summary + core interaction seed. */
interface ThemeSeed {
  title: string;
  summary: string;
  interaction: string;
  concepts: string[];
  mvp: string[];
}

const THEMES: readonly ThemeSeed[] = [
  {
    title: "습관 트래커",
    summary: "매일 실천하고 싶은 습관을 등록하고 완료 여부를 체크하는 앱",
    interaction: "오늘 할 습관을 눌러 완료 표시하고 연속 달성 일수를 확인한다",
    concepts: ["상태 관리", "로컬 저장", "날짜 계산"],
    mvp: ["습관 등록", "일일 체크", "연속 달성 표시"],
  },
  {
    title: "가계부",
    summary: "수입과 지출을 간단히 기록하고 월별 합계를 보여주는 도구",
    interaction: "지출 항목을 추가하면 이번 달 남은 예산이 즉시 갱신된다",
    concepts: ["폼 입력 검증", "합계 집계", "카테고리 분류"],
    mvp: ["거래 입력", "월별 합계", "카테고리별 요약"],
  },
  {
    title: "플래시카드 암기",
    summary: "앞뒤 카드를 넘기며 단어나 개념을 반복 학습하는 앱",
    interaction: "카드를 뒤집어 정답을 확인하고 아는 정도를 표시한다",
    concepts: ["배열 순회", "간격 반복", "진행률 계산"],
    mvp: ["카드 덱 만들기", "카드 뒤집기", "복습 대상 선정"],
  },
  {
    title: "물 마시기 알림",
    summary: "하루 목표 수분량을 정하고 마신 양을 기록하며 알림을 받는 앱",
    interaction: "한 잔 버튼을 누르면 오늘 마신 양이 쌓이고 목표까지 남은 양이 보인다",
    concepts: ["타이머와 알림", "누적 합산", "목표 대비 진행률"],
    mvp: ["목표 설정", "한 잔 기록", "달성률 표시"],
  },
  {
    title: "로컬 북마크 정리",
    summary: "자주 쓰는 링크를 태그로 묶어 빠르게 찾는 정리 도구",
    interaction: "링크를 붙여넣고 태그를 달면 태그별로 모아 볼 수 있다",
    concepts: ["태그 필터링", "검색", "로컬 저장"],
    mvp: ["북마크 추가", "태그 부여", "태그별 필터"],
  },
  {
    title: "간단 설문 도구",
    summary: "질문을 만들고 링크로 응답을 모아 결과를 요약하는 도구",
    interaction: "질문을 추가해 설문을 만들고 응답이 들어오면 막대로 집계된다",
    concepts: ["동적 폼 생성", "응답 집계", "결과 시각화"],
    mvp: ["설문 작성", "응답 수집", "결과 요약"],
  },
  {
    title: "할 일 우선순위 보드",
    summary: "할 일을 중요도와 급함으로 나눠 네 칸에 배치하는 보드",
    interaction: "할 일을 드래그해 사분면에 놓으면 오늘 집중할 일이 정리된다",
    concepts: ["드래그 앤 드롭", "2차원 분류", "정렬"],
    mvp: ["할 일 추가", "사분면 배치", "완료 처리"],
  },
  {
    title: "독서 기록장",
    summary: "읽은 책과 인상 깊은 문장을 기록하고 다시 찾아보는 앱",
    interaction: "책을 등록하고 문장을 메모하면 나중에 검색해 다시 볼 수 있다",
    concepts: ["관계형 데이터", "검색", "메모 편집"],
    mvp: ["책 등록", "문장 메모", "메모 검색"],
  },
  {
    title: "운동 루틴 타이머",
    summary: "정한 동작을 순서대로 안내하며 세트와 휴식을 재는 타이머",
    interaction: "루틴을 시작하면 동작과 휴식이 자동으로 카운트다운된다",
    concepts: ["상태 기계", "카운트다운 타이머", "순서 진행"],
    mvp: ["루틴 구성", "타이머 진행", "완료 기록"],
  },
  {
    title: "감정 일기",
    summary: "하루의 기분을 이모지로 남기고 추이를 달력으로 보는 앱",
    interaction: "오늘 기분을 고르고 한 줄 메모를 남기면 달력이 색으로 채워진다",
    concepts: ["달력 렌더링", "데이터 시각화", "로컬 저장"],
    mvp: ["기분 기록", "한 줄 메모", "월간 달력 보기"],
  },
  {
    title: "간단 예약 관리",
    summary: "예약 슬롯을 만들고 겹치지 않게 배정하는 소규모 예약 도구",
    interaction: "빈 시간대를 열어두면 방문자가 슬롯을 골라 예약한다",
    concepts: ["시간 충돌 검사", "슬롯 상태", "목록 필터"],
    mvp: ["슬롯 개설", "예약 신청", "겹침 방지"],
  },
  {
    title: "레시피 저장소",
    summary: "재료와 조리 단계를 정리하고 재료로 검색하는 요리 노트",
    interaction: "재료를 입력하면 만들 수 있는 저장된 레시피가 추려진다",
    concepts: ["집합 매칭", "검색 필터", "목록 편집"],
    mvp: ["레시피 등록", "재료 검색", "단계 보기"],
  },
  {
    title: "타이핑 연습",
    summary: "짧은 문장을 따라 치며 속도와 정확도를 재는 연습 앱",
    interaction: "제시된 문장을 입력하면 실시간으로 정확도와 타수가 계산된다",
    concepts: ["문자열 비교", "실시간 계산", "기록 갱신"],
    mvp: ["연습 문장 제공", "정확도 측정", "최고 기록 저장"],
  },
  {
    title: "용돈 목표 저금통",
    summary: "목표 금액을 정하고 저축을 기록하며 달성률을 보는 앱",
    interaction: "저축을 기록할 때마다 목표까지 남은 금액과 진행 막대가 갱신된다",
    concepts: ["누적 합산", "진행률 계산", "목표 관리"],
    mvp: ["목표 설정", "저축 기록", "달성률 표시"],
  },
];

const APPEALS: readonly string[] = [
  "매일 쓰기 좋아 성취감이 바로 느껴진다",
  "화면이 단순해 초보자도 헤매지 않는다",
  "작게 시작해 기능을 하나씩 붙여 나가기 좋다",
  "결과가 눈에 보여 계속하고 싶어진다",
  "핵심 개념만 담아 학습 부담이 적다",
  "혼자서도 끝까지 완성할 수 있는 규모다",
];

const TARGET_USERS: readonly string[] = [
  "습관을 꾸준히 만들고 싶은 직장인",
  "처음 앱을 만들어 보는 입문 개발자",
  "간단한 개인 도구가 필요한 학생",
  "가벼운 기록 습관을 원하는 사용자",
  "취미로 코딩을 배우는 사람",
];

const USAGE_MOMENTS: readonly string[] = [
  "아침에 하루를 계획할 때",
  "잠들기 전 하루를 정리할 때",
  "일과 중 짬이 날 때",
  "주말에 한 주를 돌아볼 때",
];

const TECH_NECESSITIES: readonly string[] = [
  "상태 관리와 로컬 저장을 자연스럽게 익힐 수 있다",
  "간단한 데이터 모델링을 연습하기에 알맞다",
  "이벤트 처리와 화면 갱신 흐름을 배우기 좋다",
  "폼 입력 검증과 집계 로직을 다뤄볼 수 있다",
];

const ALL_TAGS: readonly GenerationTag[] = ["DIRECT", "EXPAND", "DISCOVER", "UPGRADE"];

const EXCLUDED_SCOPE: readonly string[] = [
  "사용자 계정과 로그인",
  "다중 기기 실시간 동기화",
  "결제 및 구독 처리",
  "푸시 알림 서버 인프라",
];

const AGENT_SUPPORT_SCOPE: readonly string[] = [
  "프로젝트 구조와 초기 설정",
  "테스트 작성 보조",
  "반복 코드 자동 생성",
  "에러 원인 진단 도움",
];

const DEPLOYMENT_CONSTRAINTS: readonly string[] = [
  "로컬 브라우저에서 단독 실행",
  "정적 호스팅으로 배포 가능",
  "외부 서버 없이 동작",
];

/** A safe, seeded sample of previously-created projects for the History list. */
interface HistorySeed {
  title: string;
  learningGoal: string;
  status: HistoryProjectView["status"];
  suggestedSurface: HistoryProjectView["suggestedSurface"];
  pendingDecisionCount: number;
  helperConversationCount: number;
}

const HISTORY_SEEDS: readonly HistorySeed[] = [
  {
    title: "습관 트래커",
    learningGoal: "리액트로 매일 습관을 기록하는 앱을 만들어 보고 싶어요",
    status: "BUILDING",
    suggestedSurface: "BUILD",
    pendingDecisionCount: 1,
    helperConversationCount: 3,
  },
  {
    title: "가계부",
    learningGoal: "수입과 지출을 정리하는 간단한 가계부를 만들고 싶어요",
    status: "SPEC_REVIEW",
    suggestedSurface: "SPEC",
    pendingDecisionCount: 0,
    helperConversationCount: 1,
  },
  {
    title: "플래시카드 암기",
    learningGoal: "단어를 반복 학습하는 플래시카드 앱을 만들어 보고 싶어요",
    status: "DISCOVERY",
    suggestedSurface: "DISCOVERY",
    pendingDecisionCount: 0,
    helperConversationCount: 0,
  },
];

/**
 * The combined mock port. A single instance satisfies both {@link DiscoveryPort}
 * and {@link SpecPort}; `createFlowPorts` returns it for both roles.
 */
export class MockDiscoveryPort implements DiscoveryPort, SpecPort, HistoryPort {
  private readonly clock: Clock;
  private readonly latency: { minMs: number; maxMs: number };
  private readonly failures: Partial<Record<MockOp, PortError>>;
  private readonly rng: () => number;
  private readonly seed: number;

  /** Monotonic counter making every generated id unique within this instance. */
  private idSeq = 0;
  /** Per-session round index so feedback rounds advance monotonically (Req 15.5). */
  private readonly roundIndexBySession = new Map<string, number>();
  /** Per-spec latest revision, for optimistic-concurrency conflict simulation. */
  private readonly revisionBySpec = new Map<string, number>();

  constructor(options: MockPortOptions = {}) {
    this.seed = options.seed ?? DEFAULT_SEED;
    this.clock = options.clock ?? new SystemClock();
    this.latency = options.latency ?? DEFAULT_LATENCY;
    this.failures = options.failures ?? {};
    this.rng = mulberry32(this.seed);
  }

  // --- DiscoveryPort ---

  startDiscovery(
    req: { projectId: string; input: DiscoveryInput },
    _env: RequestEnvelope,
  ): Promise<PortResult<DiscoverySession>> {
    return this.schedule("startDiscovery", () => {
      const session: DiscoverySession = {
        id: this.nextId("discovery_session"),
        projectId: req.projectId,
        revision: 1,
        input: req.input,
        status: "ACTIVE",
        schemaVersion: 1,
        createdAt: this.clock.now(),
        updatedAt: this.clock.now(),
      };
      // Seed the round counter so the first preview round is round 1.
      this.roundIndexBySession.set(session.id, 1);
      return session;
    });
  }

  generatePreviewRound(
    req: { discoverySessionId: string },
    _env: RequestEnvelope,
  ): Promise<PortResult<PreviewRound>> {
    return this.schedule("generatePreviewRound", () => {
      const previews = this.makePreviews(req.discoverySessionId);
      const round: PreviewRound = {
        discoverySessionId: req.discoverySessionId,
        previews,
        generationRationale: this.pick([
          "학습 목표와 가까운 아이디어부터 새로운 방향까지 골고루 담았습니다",
          "완성 가능한 규모를 우선해 다양한 주제를 제안합니다",
          "핵심 개념을 익히기 좋은 후보를 다양하게 구성했습니다",
        ]),
      };
      return round;
    });
  }

  enrichCandidate(
    req: { discoverySessionId: string; target: CandidateRevisionReference },
    _env: RequestEnvelope,
  ): Promise<PortResult<ProjectCandidateRevision>> {
    return this.schedule("enrichCandidate", () => this.makeEnriched(req.target));
  }

  submitFeedback(
    req: { discoverySessionId: string; feedback: DiscoveryFeedback },
    _env: RequestEnvelope,
  ): Promise<PortResult<CandidateRound>> {
    return this.schedule("submitFeedback", () => {
      const prior = this.roundIndexBySession.get(req.discoverySessionId) ?? 1;
      const roundIndex = prior + 1;
      this.roundIndexBySession.set(req.discoverySessionId, roundIndex);

      const { feedback } = req;
      const candidates = this.makeRoundCandidates(feedback);
      const round: CandidateRound = {
        roundIndex,
        candidates,
        generationRationale: this.rationaleFor(feedback.intent),
        appliedFeedbackIds: [feedback.id],
      };
      return round;
    });
  }

  // --- SpecPort ---

  generateSpecDraft(
    req: { projectId: string; selectedCandidate: CandidateRevisionReference },
    _env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    return this.schedule("generateSpecDraft", () => {
      const specId = this.nextId("learning_spec");
      this.revisionBySpec.set(specId, 1);
      return this.makeSpec(specId, 1, req.selectedCandidate, "DRAFT");
    });
  }

  refineSpec(
    req: { projectId: string; learningSpecId: string; message: string },
    _env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    return this.schedule("refineSpec", () => {
      const prior = this.revisionBySpec.get(req.learningSpecId) ?? 1;
      const revision = prior + 1;
      this.revisionBySpec.set(req.learningSpecId, revision);
      const selected: CandidateRevisionReference = {
        candidateId: this.nextId("cand"),
        revision: 1,
      };
      const spec = this.makeSpec(req.learningSpecId, revision, selected, "DRAFT");
      spec.parentRevision = prior;
      return spec;
    });
  }

  confirmSpec(
    req: { projectId: string; learningSpecId: string },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    return this.schedule<LearningSpecRevision>("confirmSpec", () => {
      const latest = this.revisionBySpec.get(req.learningSpecId) ?? 1;
      // Optimistic-concurrency guard (Req 11.9): the caller's expectedRevision
      // must match the port's latest stored revision for this spec.
      if (env.expectedRevision !== latest) {
        return {
          ok: false,
          error: {
            code: "revision_conflict",
            message: "스펙이 변경되어 확정할 수 없습니다",
          },
        };
      }
      const selected: CandidateRevisionReference = {
        candidateId: this.nextId("cand"),
        revision: 1,
      };
      return this.makeSpec(req.learningSpecId, latest, selected, "CONFIRMED");
    });
  }

  prepareBuilderTask(
    req: { projectId: string; learningSpecId: string },
    _env: RequestEnvelope,
  ): Promise<PortResult<PreparedBuilderTask>> {
    return this.schedule("prepareBuilderTask", () => {
      const task: PreparedBuilderTask = {
        projectId: req.projectId,
        workspacePath: `/generated/${req.projectId}`,
        status: "READY",
        schemaVersion: 1,
        createdAt: this.clock.now(),
      };
      return task;
    });
  }

  // --- HistoryPort (read-only; guide §6/§10-2) ---

  /**
   * List a small, deterministic, seeded set of sample projects (guide §6
   * History row) so the read-only History UI has something believable to show
   * on Windows / fail-closed / dev. Read-only: no run started, nothing mutated.
   *
   * SECURITY (guide §9): returns only the SAFE {@link HistoryProjectView}
   * fields — no connection, token, or path is ever produced.
   */
  listProjects(
    limit: number,
    _env: RequestEnvelope,
  ): Promise<PortResult<ProjectHistoryView>> {
    return this.schedule("listProjects", () => {
      // Seeded count in [0, HISTORY_SEEDS.length] so different seeds show
      // different-but-repeatable sample sets (including an occasional empty).
      const max = Math.min(HISTORY_SEEDS.length, Math.max(0, limit));
      const count = Math.floor(this.rng() * (max + 1));
      const projects: HistoryProjectView[] = [];
      for (let i = 0; i < count; i++) {
        const seed = HISTORY_SEEDS[i % HISTORY_SEEDS.length] as HistorySeed;
        projects.push({
          projectId: this.nextId("project"),
          title: seed.title,
          learningGoal: seed.learningGoal,
          status: seed.status,
          suggestedSurface: seed.suggestedSurface,
          pendingDecisionCount: seed.pendingDecisionCount,
          helperConversationCount: seed.helperConversationCount,
          updatedAt: this.clock.now(),
        });
      }
      return { projects };
    });
  }

  /**
   * Restore a minimal, safe summary for a project id (guide §6). Read-only:
   * no run started, nothing mutated. SECURITY (guide §9): only safe scalars —
   * never a workspaceDirectory/path or token.
   */
  restoreProject(
    projectId: string,
    _env: RequestEnvelope,
  ): Promise<PortResult<RestoredProjectView>> {
    return this.schedule("restoreProject", () => {
      const seed = HISTORY_SEEDS[
        Math.floor(this.rng() * HISTORY_SEEDS.length)
      ] as HistorySeed;
      const view: RestoredProjectView = {
        projectId,
        title: seed.title,
        learningGoal: seed.learningGoal,
        status: seed.status,
        suggestedSurface: seed.suggestedSurface,
        hasSpec: seed.status !== "DISCOVERY",
        ...(seed.status === "BUILDING"
          ? { currentTaskTitle: "첫 화면 만들기" }
          : {}),
      };
      return view;
    });
  }

  // --- internals ---

  /**
   * Schedule an op's resolution via the injected clock at a seeded latency well
   * under 30s. If the op is scripted to fail, resolve `err`; otherwise run the
   * producer. A producer may itself return a `PortResult` (used by confirmSpec
   * to signal a revision conflict) or a bare value that is wrapped in `ok`.
   */
  private schedule<T>(
    op: MockOp,
    produce: () => T | PortResult<T>,
  ): Promise<PortResult<T>> {
    const failure = this.failures[op];
    const delay = this.nextLatency();
    return new Promise<PortResult<T>>((resolve) => {
      this.clock.setTimeout(() => {
        if (failure) {
          resolve({ ok: false, error: failure });
          return;
        }
        const produced = produce();
        if (isPortResult(produced)) {
          resolve(produced);
          return;
        }
        resolve({ ok: true, value: produced });
      }, delay);
    });
  }

  /** A seeded latency inside the configured window (inclusive). */
  private nextLatency(): number {
    const { minMs, maxMs } = this.latency;
    const span = Math.max(0, maxMs - minMs);
    return minMs + Math.floor(this.rng() * (span + 1));
  }

  /** A unique, seed-scoped id with the given prefix (e.g. `cand_<seed>_<n>`). */
  private nextId(prefix: string): string {
    this.idSeq += 1;
    return `${prefix}_${(this.seed >>> 0).toString(36)}_${this.idSeq}`;
  }

  /** Pick a deterministic element from a non-empty array. */
  private pick<T>(arr: readonly T[]): T {
    const i = Math.floor(this.rng() * arr.length);
    return arr[Math.min(i, arr.length - 1)] as T;
  }

  /** Build exactly 10 varied previews with positions 1..10 and unique ids. */
  private makePreviews(_sessionId: string): CandidatePreview[] {
    // Rotate through the theme pool from a seeded offset so the 10 cards differ.
    const start = Math.floor(this.rng() * THEMES.length);
    const previews: CandidatePreview[] = [];
    for (let i = 0; i < 10; i++) {
      const theme = THEMES[(start + i) % THEMES.length] as ThemeSeed;
      const suffix = this.pick(["", " 라이트", " 미니", " 플러스", " 스타터"]);
      previews.push({
        candidateId: this.nextId("cand"),
        position: i + 1,
        title: `${theme.title}${suffix}`.trim(),
        summary: theme.summary,
        coreInteraction: theme.interaction,
        appeal: this.pick(APPEALS),
        technologyNecessity: this.pick(TECH_NECESSITIES),
        generationTags: this.makeTags(),
      });
    }
    return previews;
  }

  /** 1..4 varied, de-duplicated generation tags. */
  private makeTags(): GenerationTag[] {
    const count = 1 + Math.floor(this.rng() * 4);
    const chosen = new Set<GenerationTag>();
    let guard = 0;
    while (chosen.size < count && guard < 20) {
      chosen.add(this.pick(ALL_TAGS));
      guard += 1;
    }
    // Preserve a stable enum order for readability.
    return ALL_TAGS.filter((t) => chosen.has(t));
  }

  /** Build a fully-populated enriched candidate (Req 15.3). */
  private makeEnriched(target: CandidateRevisionReference): ProjectCandidateRevision {
    const theme = this.pick(THEMES);
    return {
      candidateId: target.candidateId,
      revision: target.revision >= 1 ? target.revision : 1,
      parentRevisions: [],
      title: theme.title,
      summary: theme.summary,
      targetUsers: this.sample(TARGET_USERS, 2),
      coreInteraction: theme.interaction,
      usageMoment: this.pick(USAGE_MOMENTS),
      appeal: this.pick(APPEALS),
      technologyNecessity: this.pick(TECH_NECESSITIES),
      coreConcepts: [...theme.concepts],
      mvpFeatures: [...theme.mvp],
      suggestedScope: this.makeScopeSuggestion(theme),
      risks: ["범위가 커지면 완성이 늦어질 수 있음"],
      generationTags: this.makeTags(),
      schemaVersion: 1,
      createdAt: this.clock.now(),
    };
  }

  private makeScopeSuggestion(theme: ThemeSeed): CandidateScopeSuggestion {
    return {
      learnerFocus: [...theme.concepts],
      agentSupport: this.sample(AGENT_SUPPORT_SCOPE, 2),
      excluded: this.sample(EXCLUDED_SCOPE, 2),
    };
  }

  /** Build a Learning Spec revision with all three scope categories (Req 15.4). */
  private makeSpec(
    id: string,
    revision: number,
    selectedCandidate: CandidateRevisionReference,
    status: LearningSpecRevision["status"],
  ): LearningSpecRevision {
    const theme = this.pick(THEMES);
    const scope: SpecScopeEntry[] = [
      {
        category: "LEARNER_FOCUS",
        title: "핵심 학습 영역",
        rationale: "직접 구현하며 개념을 익히는 부분",
        conceptNames: [...theme.concepts],
      },
      {
        category: "AGENT_SUPPORT",
        title: "에이전트 지원 영역",
        rationale: "반복 작업은 에이전트가 도와 학습에 집중",
        conceptNames: this.sample(AGENT_SUPPORT_SCOPE, 2),
      },
      {
        category: "EXCLUDED",
        title: "이번 범위에서 제외",
        rationale: "완성 가능한 규모를 지키기 위해 제외",
        conceptNames: this.sample(EXCLUDED_SCOPE, 2),
      },
    ];
    const expectedDecisions: ExpectedDecision[] = [
      {
        category: "PRODUCT_BEHAVIOR",
        description: "핵심 화면에서 어떤 흐름을 우선 보여줄지 정한다",
        whyUserInputMatters: "학습자가 원하는 사용 경험에 따라 우선순위가 달라진다",
      },
      {
        category: "DATA_MODEL",
        description: "기록 항목에 어떤 필드를 둘지 정한다",
        whyUserInputMatters: "무엇을 남기고 싶은지에 따라 데이터 구조가 달라진다",
      },
    ];
    return {
      id,
      revision,
      status,
      selectedCandidate,
      productPurpose: `${theme.title}로 ${theme.summary.replace(/ 앱$| 도구$/, "")}를 손쉽게 돕는다`,
      targetUsers: this.sample(TARGET_USERS, 2),
      primaryUsageMoment: this.pick(USAGE_MOMENTS),
      successMoment: "기록이 쌓여 변화가 눈에 보일 때",
      mvpFeatures: [...theme.mvp],
      scope,
      expectedDecisions,
      runtimeConstraint: "TYPESCRIPT",
      deploymentConstraints: this.sample(DEPLOYMENT_CONSTRAINTS, 2),
      schemaVersion: 1,
      createdAt: this.clock.now(),
    };
  }

  /**
   * Produce the candidate references for a feedback-driven round.
   * SELECT/PIN preserve the referenced candidates; MORE/REGENERATE add fresh
   * candidates; MERGE synthesizes a single combined candidate (Req 15.5).
   */
  private makeRoundCandidates(feedback: DiscoveryFeedback): CandidateRevisionReference[] {
    switch (feedback.intent) {
      case "SELECT":
      case "PIN":
      case "REVISE":
      case "SHRINK":
      case "EXPAND":
        // Preserve the referenced candidates (advance their revision).
        return feedback.targets.map((t) => ({
          candidateId: t.candidateId,
          revision: t.revision + 1,
        }));
      case "MERGE": {
        // Synthesize one combined candidate from the merged inputs.
        const merged: CandidateRevisionReference = {
          candidateId: this.nextId("cand_merged"),
          revision: 1,
        };
        return [merged];
      }
      case "REJECT":
      case "MORE":
      case "REGENERATE":
      default: {
        // Add a fresh set of candidates.
        const fresh: CandidateRevisionReference[] = [];
        for (let i = 0; i < 10; i++) {
          fresh.push({ candidateId: this.nextId("cand"), revision: 1 });
        }
        return fresh;
      }
    }
  }

  private rationaleFor(intent: DiscoveryFeedback["intent"]): string {
    switch (intent) {
      case "MERGE":
        return "선택한 아이디어들의 장점을 합쳐 하나로 정리했습니다";
      case "REVISE":
      case "SHRINK":
      case "EXPAND":
        return "요청한 방향에 맞춰 후보를 다듬었습니다";
      case "MORE":
        return "비슷한 결의 후보를 더 찾아왔습니다";
      case "REGENERATE":
        return "새로운 방향으로 후보를 다시 구성했습니다";
      case "SELECT":
      case "PIN":
        return "선택한 후보를 유지했습니다";
      default:
        return "피드백을 반영했습니다";
    }
  }

  /** A deterministic sample of up to `n` distinct items from a pool. */
  private sample<T>(pool: readonly T[], n: number): T[] {
    const count = Math.min(n, pool.length);
    const start = Math.floor(this.rng() * pool.length);
    const out: T[] = [];
    for (let i = 0; i < count; i++) {
      out.push(pool[(start + i) % pool.length] as T);
    }
    return out;
  }
}

/** Narrow a produced value to a {@link PortResult} discriminated union. */
function isPortResult<T>(v: T | PortResult<T>): v is PortResult<T> {
  return typeof v === "object" && v !== null && "ok" in (v as Record<string, unknown>);
}
