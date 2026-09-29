/** Fixed UI guidance only. Provider text, request IDs and paths never belong here. */
export type RuntimeErrorCode = "quota_exceeded" | "auth_required" | "access_denied" |
  "model_unavailable" | "rate_limited" | "service_unavailable" | "trust_required" |
  "update_waiting" | "workspace_switch_unconfirmed" | "credit_observation_required" |
  "window_ambiguous" | "window_missing" | "window_invalid";

const failures: Readonly<Record<string, { code: RuntimeErrorCode | "unknown"; message: string }>> = {
  NATIVE_QUOTA_EXCEEDED: { code: "quota_exceeded", message: "Kiro 사용량 한도에 도달했어요. Kiro에서 사용량을 확인하고 한도가 갱신된 뒤 다시 시도해 주세요." },
  NATIVE_CREDIT_OBSERVATION_REQUIRED: { code: "credit_observation_required", message: "검증용 모델 요청 전에 최신 계정 사용량과 승인된 한도를 다시 확인해야 해요. 검증 담당자가 사용량 관측을 갱신한 뒤 다시 시도해 주세요. 이전 기록은 계속 조회할 수 있어요." },
  NATIVE_AUTH_REQUIRED: { code: "auth_required", message: "Kiro 로그인이 필요해요. 로그인 상태를 확인한 뒤 다시 시도해 주세요." },
  NATIVE_ACCESS_DENIED: { code: "access_denied", message: "현재 Kiro 계정에 이 요청을 실행할 권한이 없어요. 계정 권한이나 조직 정책을 확인해 주세요." },
  NATIVE_MODEL_UNAVAILABLE: { code: "model_unavailable", message: "현재 Kiro 모델을 사용할 수 없어요. Kiro의 모델 이용 상태를 확인한 뒤 다시 시도해 주세요." },
  NATIVE_RATE_LIMITED: { code: "rate_limited", message: "Kiro 요청이 잠시 제한됐어요. 잠시 기다린 뒤 다시 시도해 주세요." },
  NATIVE_SERVICE_UNAVAILABLE: { code: "service_unavailable", message: "Kiro 서비스에 일시적인 문제가 있어요. 잠시 기다린 뒤 다시 시도해 주세요." },
  NATIVE_RPC_REJECTED: { code: "unknown", message: "Kiro가 요청을 거절했지만 자세한 원인은 확인되지 않았어요. Kiro 상태를 확인한 뒤 다시 시도해 주세요." },
  NATIVE_WORKSPACE_TRUST_REQUIRED: { code: "trust_required", message: "현재 작업 폴더의 Workspace Trust 승인이 필요해요. Kiro에서 폴더를 확인하고 신뢰한 뒤 다시 시도해 주세요. 이전 프로젝트 기록은 계속 조회할 수 있어요." },
  CORE_UPDATE_WAITING_FOR_OWNER_EXIT: { code: "update_waiting", message: "이전 버전의 Core를 사용하는 Kiro 창이 종료되기를 기다리고 있어요. 작업을 저장하고 해당 창을 정상적으로 닫은 뒤 ‘Vibe Helper: Retry Core Connection’을 실행해 주세요." },
  WORKSPACE_SWITCH_UNCONFIRMED: { code: "workspace_switch_unconfirmed", message: "작업 폴더 전환이 확인되지 않았어요. 열린 폴더와 Kiro의 안내를 확인한 뒤 다시 시도해 주세요." },
  // Native window binding (backend T19-F7 / B6). Never auto-reroute to another window.
  NATIVE_ENDPOINT_AMBIGUOUS: { code: "window_ambiguous", message: "같은 생성 폴더를 연 Kiro 창을 하나만 남기고 다시 시도해 주세요. 다른 작업 창이나 도우미 창은 닫지 않아도 돼요." },
  NATIVE_ENDPOINT_MISSING: { code: "window_missing", message: "현재 Kiro 창의 에이전트 연결이 아직 준비되지 않았어요. 이 창의 확장 준비 상태와 Workspace Trust를 확인한 뒤 같은 프로젝트에서 다시 시도해 주세요." },
  NATIVE_ENDPOINT_INVALID: { code: "window_invalid", message: "Kiro 창 연결 정보를 확인할 수 없어요. 지원되는 Kiro 버전인지 확인하고 창을 다시 불러온 뒤(Reload Window) 다시 시도해 주세요." },
  NATIVE_WINDOW_ID_INVALID: { code: "window_invalid", message: "Kiro 창 연결 정보를 확인할 수 없어요. 지원되는 Kiro 버전인지 확인하고 창을 다시 불러온 뒤(Reload Window) 다시 시도해 주세요." },
};

/**
 * Progress/recovery guidance for native worker status codes. Display only:
 * these never mean a job was claimed or a model call succeeded.
 */
const workerGuidance: Readonly<Record<string, string>> = {
  WORKSPACE_WINDOW_AVAILABLE: "생성 폴더가 이미 다른 Kiro 창에 열려 있어요. 작업은 그 창에서 처리되니, 그 창의 패널 연결과 Workspace Trust를 확인해 주세요.",
  WORKSPACE_ENDPOINTS_UNAVAILABLE: "Kiro 창 목록을 읽지 못했어요. 확장을 다시 불러온 뒤(Reload Window) 다시 시도해 주세요. 현재 폴더는 그대로 유지돼요.",
};

export function workerStatusGuidance(code: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(workerGuidance, code)) return workerGuidance[code];
  // The tool guard denied one Builder command (e.g. lockfile prepare, timeout
  // shape). The run continues; the denial is not a run failure by itself.
  if (code.startsWith("PERMISSION_GUARD_BUILDER_SHELL_TIMEOUT_")) {
    return "빌더 명령의 제한 시간 형식이 규칙에 맞지 않아 막혔어요. 빌더는 허용된 형식으로 다시 시도해요.";
  }
  if (code === "PERMISSION_GUARD_BUILDER_SHELL_PROJECT_TOOLCHAIN_DENIED") {
    return "빌더가 허용 목록에 없는 명령을 실행하려다 막혔어요(설치·빌드·테스트 명령만 허용돼요). 빌더는 허용된 명령으로 다시 시도해요.";
  }
  if (code.startsWith("PERMISSION_GUARD_BUILDER_SHELL_LOCKFILE_")) {
    return "의존성 준비 명령이 안전 규칙에 막혔어요. 프로젝트 설정 파일 구성을 확인한 뒤 빌더가 허용된 방법으로 다시 시도해요.";
  }
  if (code.startsWith("PERMISSION_GUARD_BUILDER_SHELL_")) {
    return "빌더의 명령 하나가 안전 규칙에 막혔어요. 빌더는 허용된 방법으로 계속 진행해요.";
  }
  // B7: a failed opening's session was closed; the next explicit request starts fresh.
  if (code.startsWith("OPENING_OBSERVER_CLOSED_")) {
    return "실패한 요청의 세션을 정리했어요. 다시 요청하면 새로 시작해요.";
  }
  return undefined;
}

export function runtimeFailure(code: string): { code: RuntimeErrorCode | "unknown"; message: string } | undefined {
  return Object.prototype.hasOwnProperty.call(failures, code) ? failures[code] : undefined;
}

export function safeRuntimeCode(value: unknown): string {
  return typeof value === "string" && /^[A-Z][A-Z0-9_]{0,99}$/.test(value) ? value : "UNKNOWN";
}

/**
 * Display-only guidance for codes that keep their own agent classification and
 * raw message contract (see agent-error.ts); used by the webview error lines.
 */
const displayOnlyGuidance: Readonly<Record<string, string>> = {
  // The IDE agent turn ended without a specific cause (e.g. its window closed).
  NATIVE_IDE_TURN_FAILED: "에이전트 실행이 도중에 끊겼어요. 빌더나 도우미 창이 닫히거나 다시 열렸을 수 있어요. 실행 중에는 그 창을 닫지 말고, 같은 요청을 다시 보내 주세요. 작업 내용은 그대로 남아 있어요.",
  // Core refused a completion report without real validation results (B8).
  TASK_VALIDATION_NOT_RUN: "빌드·테스트 같은 검증을 실행하지 않아 작업 완료가 거절됐어요. 빌더에게 테스트를 실행한 뒤 완료해 달라고 요청해 주세요.",
  // Rejected before any model call: the role's Core tools never appeared.
  NATIVE_ROLE_CATALOG_UNVERIFIED: "에이전트가 Core 도구를 준비하지 못해 요청을 보내지 않았어요(사용량은 차감되지 않아요). 진행 중인 작업이 없는지 확인하고, 도우미 창이 열려 있다면 닫은 뒤 다시 시도해 주세요.",
};

/** Guidance to show next to a raw error code, or undefined when none is known. */
export function errorGuidance(code: string): string | undefined {
  const known = runtimeFailure(code);
  if (known) return known.message;
  return Object.prototype.hasOwnProperty.call(displayOnlyGuidance, code) ? displayOnlyGuidance[code] : undefined;
}

export function runtimeErrorMessage(code: string, fallback: string): string {
  const known = runtimeFailure(code);
  if (known) return known.message;
  if (code === "CORE_PREPARING" || code === "STARTING" || code === "IDLE") return "Core 연결을 준비하고 있어요.";
  if (code === "DISCOVERY_RUN_ACTIVE_STOP_OR_WAIT") return "이미 후보 생성 작업이 진행 중이에요. 완료를 기다리거나 작업을 중지한 뒤 다시 시도해 주세요.";
  if (code === "RUN_NOT_FOUND_RESTORE_PROJECT" || code === "PREVIEW_ATTEMPT_UNKNOWN_RESTORE_PROJECT") return "이전 요청의 상태를 확인할 수 없어요. 저장된 프로젝트를 확인한 뒤 다시 시도해 주세요.";
  if (code === "CANCELLED") return "후보 생성을 중지했어요. 같은 입력으로 다시 시도할 수 있어요.";
  return fallback;
}
