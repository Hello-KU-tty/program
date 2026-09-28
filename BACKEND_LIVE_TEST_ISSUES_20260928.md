# 백엔드 요청: 지원 pin 실측 결과와 발견한 문제 (2026-09-28)

> 보낸 사람: 프론트
> 기준 브랜치: feat/windows-live-backend (1dd230f 이후 로컬 변경, VSIX 0.0.3)
> 환경: Windows x64, Kiro 1.1.70 (commit `8ce18704…5102`) / Agent 1.1.158 (entry SHA-256 `cf6a5124…1b87`) / API 1.131.0
> 시간은 KST, 괄호 안은 로그의 UTC

---

## 0. 요약

- **pin 블로커 해소:** 프론트 PC를 지원 pin(1.1.70 / 1.1.158)으로 업그레이드했습니다. 설치본의 commit·Agent entry hash·API가 exact 조합과 일치하고, host의 `attestWindowsKiroInstallation`도 통과합니다. `BACKEND_NEXT_STEPS_20260927.md` §1은 "(b) 프론트 업그레이드"로 닫아 주세요.
- **실측 결과:** Core 연결, Workspace Trust, History, worker 준비(`WORKER_READY`)까지 성공했습니다. Discovery preview run은 **3회 모두 실패**했습니다. 원인은 각각 달랐습니다.

| 시각 | 결과 | 원인 | 책임 |
| --- | --- | --- | --- |
| 01:03, 01:18 | `WORKSPACE_SWITCH_UNCONFIRMED` 뒤 job claim 없음 | 폴더 신뢰 전 시점으로 추정 | 문서화 요청 (§B4) |
| 08:12 | `NATIVE_PACKAGED_ROLE_CONFIG_INVALID` | 확장 업데이트 뒤 이전 설치본의 Core 재사용 | **백엔드 결함 (§B2)** |
| 08:18 | `NATIVE_RPC_REJECTED` | Kiro 월간 한도 초과(`ServiceQuotaExceededException`) | 계정 한도 + **오류 코드 은폐 (§B1)** |

- **현재 상태:** 이 PC의 Kiro 계정 크레딧이 1000/1000이고 overage가 꺼져 있어, 2026-10-01 리셋 전까지 이 PC에서는 모델 호출 실측이 불가합니다(§4).

---

## B1. `NATIVE_RPC_REJECTED`가 실제 사유(한도 초과)를 숨김 — 요청

**현상.** 08:17:59 `AGENT_RUNNING_DISCOVERY` 후 1.4초 만에 `AGENT_FAILED_NATIVE_RPC_REJECTED`로 끝났습니다. Core run 기록도 `DISCOVERY PREVIEW FAILED err=NATIVE_RPC_REJECTED`입니다.

**실제 원인 (Kiro 로그 `window1/exthost/...`, 08:18:00.695 / 23:18:00.695Z).**
```
[KRS] HTTP 400 body={"__type":"com.amazon.kiro.runtimeservice#ServiceQuotaExceededException",
 "message":"You have reached the limit.","reason":"MONTHLY_REQUEST_COUNT"}
```
같은 세션의 `GetUsageLimits`는 `currentUsage 1000 / usageLimit 1000`, `overageStatus DISABLED`였습니다.

**원인 코드.** `examples/kiro-native-host/native-client.cjs:495`에서 JSON-RPC `message.error`가 오면 code와 message를 버리고 일괄 `NATIVE_RPC_REJECTED`로 바꿉니다.

**요청.**
1. `session/prompt` 등의 RPC error를 분류해 안정된 코드로 노출해 주세요. 예: `NATIVE_QUOTA_EXCEEDED`, `NATIVE_AUTH_REQUIRED`, `NATIVE_MODEL_UNAVAILABLE`. 원문 message는 필요 없고, 분류된 코드만이면 충분합니다.
2. 이 코드들을 run `errorCode`와 worker status에 그대로 실어 주세요. 프론트는 코드별로 "이번 달 사용량을 모두 썼어요(리셋일)" 같은 안내를 띄우겠습니다.
3. 가능하다면 run 시작 전 사전 검사를 검토해 주세요. 한도 초과 상태에서도 창 전환(§B4)과 역할 파일 생성이 먼저 일어납니다.

---

## B2. 확장 업데이트 후 이전 설치본의 Core를 재사용해 역할 설정 검증 실패 — 결함

**재현.**
1. VSIX 0.0.2 설치 상태에서 Core가 기동됐습니다. PID 36564, 01:00:35, cmd `...\vibe-helper.builder-helper-agent-panel-0.0.2\portable\bin\core.mjs managed`.
2. 같은 Kiro 세션에서 0.0.3을 설치하고 Reload했습니다. `portable/`은 동일하며 `owner.json packageHash`도 같습니다.
3. 0.0.3 host가 새 Core를 띄우지 않고 기존 Core(0.0.2 경로)에 lease로 붙었습니다.
4. Discovery 시작 시 Core가 쓴 `workspaces\.kiro\agents\vibe-native-discovery-d1c57c9d.json`의 bridge 인자가 `...-0.0.2\portable\bin\bridge.mjs`였습니다.
5. 0.0.3 worker의 `materializePackagedRoleRuntime`(`examples/kiro-panel/src/native-runtime.cjs:184`)은 자기 `...-0.0.3\...\bridge.mjs`와 비교하므로 `NATIVE_PACKAGED_ROLE_CONFIG_INVALID`로 막았습니다(08:12:47).
6. Kiro를 완전히 종료했다가 다시 켜자 0.0.3 경로로 새 Core(PID 29432)가 떴고, 이 오류는 사라졌습니다.

**영향.** 사용자가 확장을 업데이트하면 Kiro를 완전히 재시작할 때까지 모든 native run이 실패합니다. Kiro가 이전 버전 폴더를 정리하면, 아직 살아 있는 Core는 존재하지 않는 bridge 경로를 쓰게 됩니다.

**요청 (둘 중 하나).**
- (a) host의 설치 경로가 Core의 기동 경로와 다르면, packageHash가 같아도 기존 Core를 재사용하지 말고 교체해 주세요.
- (b) 역할 설정의 bridge/runtime 경로를 Core 기동 경로가 아니라 **job을 claim한 host가 보고한 경로** 기준으로 쓰게 해 주세요.

---

## B3. 실패한 Discovery 프로젝트가 History에 "탐색 중"으로만 남음 — 요청

**현상.** `listProjects` 결과 4개 프로젝트가 모두 `DISCOVERY` 상태입니다. Core가 재시작된 뒤에는 3개 프로젝트의 run 기록(`listRuns`)이 비어 있어, 실패 사실과 사유를 알 수 없습니다. 사용자에게는 "탐색 중 · 이어서 보기"로만 보입니다.

**요청.**
1. 실패한 PREVIEW를 **같은 프로젝트에서 재시도하는 공식 경로**를 정해 주세요. `startRun({ kind: "DISCOVERY", phase: "PREVIEW" })` 허용 여부나 별도 command 등입니다. BRIEF §7 "실패 구간만 재시도" 요구와 연결됩니다.
2. History row나 restore snapshot에 마지막 preview 실패 여부와 errorCode를 durable로 제공할 수 있는지 알려 주세요. run은 Core 재시작 시 사라집니다.
3. 불필요한 실패 프로젝트를 사용자가 정리(abandon)하는 경로가 있는지 알려 주세요.

---

## B4. Discovery 시작 시 창 폴더 전환 동작 문서화 — 요청

**관찰.** Discovery 시작 시 사용자 창이 `vibe-test`에서 `...\core-data\workspaces`로 전환됐습니다. Extension host가 재시작되고 worker가 다시 붙은 뒤 job을 claim했습니다(08:17:43 → 08:17:56). 실패 후에도 창은 `core-data\workspaces`에 남아 원래 폴더로 돌아가지 않습니다. 01:03과 01:18 시도는 `WORKSPACE_SWITCH_UNCONFIRMED` 뒤 claim 없이 멈췄습니다. 당시 `core-data\workspaces`가 신뢰되지 않았던 것으로 추정합니다.

**요청.**
1. 이 전환이 의도된 동작인지, 그리고 `core-data\workspaces`에 **별도 Workspace Trust가 필요한지** 문서에 명시해 주세요.
2. 전환 대상이 신뢰되지 않은 경우에는 `WORKSPACE_SWITCH_UNCONFIRMED` 대신 `NATIVE_WORKSPACE_TRUST_REQUIRED`처럼 원인이 드러나는 코드를 주면 좋겠습니다.
3. 실패나 종료 후 원래 폴더로 돌아가는 경로가 있는지 알려 주세요.

---

## B5. 관찰 (확인만 요청)

- 세션이 끝난 뒤(08:18:00)에도 `bridge.mjs` 프로세스(PID 27484, 부모 = 현재 extension host)가 20분 넘게 살아 있었습니다. 정상 동작인지 확인해 주세요.
- 실패한 run의 역할 파일 4개(`vibe-native-discovery-*.json`)가 `workspaces\.kiro\agents`에 남아 있습니다. Kiro가 매 세션마다 4개를 모두 profile로 등록합니다(`Registered workspace profile` ×4). 정리 정책이 있는지 알려 주세요.
- Kiro 계정이 Enterprise profile로 `autonomousAgentsDisabled: true (admin_disabled)`입니다. native 경로에 영향이 없는지 확인해 주세요.

---

## B6. (추가 2026-09-29) 같은 폴더 창이 둘이면 `NATIVE_ENDPOINT_AMBIGUOUS`로 Discovery 실패 — 요청

**현상.** 2026-09-28 22:58(13:58:55Z) Discovery가 `JOB_CLAIMED_DISCOVERY` 직후 `AGENT_FAILED_NATIVE_ENDPOINT_AMBIGUOUS`로 끝났습니다. Core에는 preview가 저장되지 않았습니다(`previewRound: null`, 후보 0). 따라서 PR #8(저장된 후보 재표시)과는 별개의 실패입니다.

**원인 (추정 + 코드 근거).** `examples/kiro-native-host/native-client.cjs:179-189` `uniqueWorkspaceEndpoint`는 `core-data\workspaces`를 연 Kiro 창이 둘 이상이면 거부합니다. 재현 경로는 다음과 같습니다. 해당 세션의 Kiro 로그 파일이 비어 있어 창 목록은 직접 확인하지 못했습니다.
1. 이전 실패 후 창이 `core-data\workspaces`에 남습니다(B4).
2. 다음 Kiro 실행 때 그 창이 복원되고, 사용자는 작업 폴더 창을 따로 엽니다.
3. "후보 만나기"를 누르면 작업 폴더 창도 `core-data\workspaces`로 전환됩니다. 같은 폴더 창이 2개가 되어 AMBIGUOUS가 납니다.

**요청.**
1. 이미 `core-data\workspaces`를 연 창이 있으면 전환하지 말고 그 창을 쓰거나, worker 자신의 `windowId`와 일치하는 endpoint를 우선 선택해 주세요.
2. 막아야 한다면 "Kiro 창을 하나만 남기고 다시 시도해 주세요"로 안내할 수 있는 코드를 run `errorCode`에 실어 주세요. 현재 run 목록은 Core 재시작 후 사라져 사유가 남지 않습니다.

---

## B7. (2026-09-29) Helper가 Core 도구 0개로 연속 거절 — `NATIVE_ROLE_CATALOG_UNVERIFIED`

**현상.** 01:36 Helper 질문은 `get_helper_context` 도구를 쓰고 정상 기록됐습니다. 01:37:41 Builder 턴이 끝난 직후 01:38:02, 01:38:42의 Helper 질문 두 개는 같은 순서로 실패했습니다: `AGENT_OPENING_HELPER` → `CATALOG_HELPER_VALID_TOTAL_0_MCP_0_BUILTIN_NONE` → 약 11초 뒤 `AGENT_FAILED_NATIVE_ROLE_CATALOG_UNVERIFIED`. 모델 호출 전 거절이라 사용량은 차감되지 않았습니다.

**관찰.** 도우미 창(Kiro `window2`) 로그에는 두 번 모두 `Prepared 1 MCP servers from profile`만 있고 도구 목록이 오지 않았습니다. `Kiro - MCP Logs.log`는 비어 있어 bridge 기동 실패 여부를 확인할 수 없었습니다. 백엔드 W5 기록(`T19_W5_KIRO_1170_GENERAL_MODE_RESULTS_20260925.md` 62행)과 같은 현상입니다.

**요청.**
1. bridge(`bridge.mjs`) 기동/연결 실패를 구분할 수 있는 worker 진단(예: MCP 서버 spawn 결과, 첫 tools/list 응답 여부)을 추가해 주세요. gate 완화를 요청하는 것은 아닙니다.
2. 문서의 복구 절차(도우미 창 닫고 새 질문)를 worker가 대신할 수 있는지 검토해 주세요. 예: 실패한 Helper 세션/창 정리 후 다음 질문에서 새로 여는 것.
3. Builder 턴 직후에 재현된 점이 원인과 관련 있는지 확인해 주세요.

## B8. (2026-09-29) Builder 셸 명령이 guard에 반복 거부됨

**현상.** 같은 Builder 턴(01:37:14~01:37:28)에서 셸 명령이 두 번 거부됐습니다: `PERMISSION_GUARD_BUILDER_SHELL_LOCKFILE_PREPARE_DENIED`, `PERMISSION_GUARD_BUILDER_SHELL_TIMEOUT_INVALID`. 의존성 설치나 테스트 실행이 이뤄지지 않았을 수 있습니다.

**요청.**
1. 두 거부 사유의 허용 조건(lockfile 준비 명령 형태, timeout 인자 형식)을 알려 주세요.
2. Builder prompt나 guard 중 어느 쪽을 맞춰야 하는지 판단해 주세요. Builder가 guard가 받지 않는 형식을 반복 생성하는 것으로 보입니다.
3. 거부된 명령 때문에 Task가 검증 없이 완료로 보고되지 않는지 확인해 주세요.

## B9. (2026-09-29) 도구 이벤트 표시 정보 보강

**현상.** Builder 도구 행 중 일부는 도구 종류(`tool`)가 비어 있어 "기타 도구"로만 표시됩니다. 또 존재하지 않는 파일을 확인하는 `read`(예: `tsconfig.app.json`, `vite.config.ts`)가 "실패"로 표시되어 사용자가 오류로 오해합니다.

**요청.**
1. 도구 이벤트에 종류를 항상 채워 주세요(`projectRunEvent` 결과의 `tool`).
2. "파일 없음" 확인을 일반 실패와 구분할 수 있는 상태나 코드를 줄 수 있는지 알려 주세요.

## B10. (2026-09-29) B6 수정 kit를 Windows에서 빌드할 수 없음

`FRONTEND_LIVE_TEST_RESPONSE_20260929.md`는 B6 수정(`a4a6632`)이 담긴 새 Windows kit를 Windows에서 만들라고 안내합니다. 그런데 백엔드가 고정한 **pnpm 11.12.0은 설치가 거부됩니다**(`ERR_PNPM_BROKEN_PNPM_RELEASE`: "`@pnpm/exe` build shipped without a binary"). 버전 검사를 우회하지 않았습니다.

**요청 (둘 중 하나).**
1. 설치 가능한 pnpm 버전으로 고정을 바꿔 주세요. 그러면 프론트 PC에서 Node 24.19.0을 맞추고 kit를 빌드하겠습니다.
2. 또는 B6 수정이 담긴 Windows kit ZIP과 receipt를 직접 전달해 주세요.

---

## B11. (2026-09-29) Builder가 진행 상황을 영어로 작성

**현상.** 한국어 Learning Goal·Spec·요청("로그인 화면부터 만들어주세요")으로 진행한 Builder 턴의 진행 상황(TEXT)이 모두 영어로 표시됐습니다(예: "I'll start by reading the current Builder Task…", "Per Build-first rule 5, …"). 내부 규칙 번호나 도구 이름(`request_user_decision`)도 그대로 노출됩니다. `docs/agent-prompts/builder.md`(1.3.x)에는 응답 언어 규칙이 없습니다.

**요청.** Builder prompt에 "사용자에게 보이는 서술은 사용자의 입력 언어(이 제품은 한국어 우선)로 쓰고, 내부 규칙 번호·도구 식별자는 설명에 노출하지 않는다"는 규칙을 추가하고 평가 fixture로 확인해 주세요. Helper 응답은 이미 한국어로 나옵니다.

---

## B12. (2026-09-29) 프론트 확장 버전 업그레이드 때마다 `PROJECT_TOOLCHAIN_CHANGED_RESTART_REQUIRED`

**현상.** 확장 0.0.6에서 만든 생성 프로젝트의 Builder가, 확장을 0.0.8로 올린 뒤 `PROJECT_TOOLCHAIN_CHANGED_RESTART_REQUIRED`로 실행되지 않습니다. 프로젝트의 `.kiro\vibe-tools.cmd`는 `…\.kiro\extensions\vibe-helper.builder-helper-agent-panel-0.0.6\portable\bin\project-tools.mjs`를 가리킵니다.

**원인 (코드 근거).** `packages/runtime/src/project-toolchain.ts:472` `isProductResourceUpgrade`는 설치 폴더 이름이 `vibe-helper.vibe-helper-portable-core-X.Y.Z` 형식일 때만 업그레이드로 인정합니다. 실제 제품 확장의 폴더(`vibe-helper.builder-helper-agent-panel-X.Y.Z`)는 형식이 달라 항상 false가 되고, 575~578행에서 거절됩니다.

**영향.** 프론트가 kit 적용이나 수정으로 VSIX 버전을 올릴 때마다 기존 모든 생성 프로젝트의 Builder가 막힙니다. 확장 ID를 바꾸면 globalStorage의 Core 데이터를 잃기 때문에 프론트에서 우회할 수 없습니다.

**요청.**
1. 같은 publisher·같은 확장 이름의 더 높은 버전(예: `vibe-helper.builder-helper-agent-panel-0.0.6` → `0.0.8`)을 업그레이드로 인정해 주세요. downgrade·다른 publisher·다른 설치 위치 거절은 유지하는 것이 좋습니다.
2. 이 수정을 다음 kit에 포함해 주세요. 그 전까지 프론트는 버전 업그레이드 후 기존 프로젝트를 복구하려면 실행기와 descriptor를 수동으로 지워야 합니다.

---

## 4. 실측 재개 조건과 질문

- 이 PC의 Kiro 크레딧은 2026-10-01 리셋입니다. 그 전에 실측하려면 overage(유료)를 켜거나 다른 계정을 써야 합니다.
- **질문:** 남은 §3.1~3.9 실측(Builder/Helper/Decision/Evidence/Final Upgrade)을 백엔드 PC에서 VSIX 0.0.3으로 먼저 진행해 줄 수 있나요? 가능하면 VSIX를 전달하겠습니다.

## 5. 프론트가 처리할 것 (참고)

- Discovery/Spec 실패 notice가 화면에 표시되지 않는 문제를 수정합니다. 현재 flow view가 `snapshot.notice`를 렌더하지 않고, `flowNotice`는 no-op입니다. B1의 분류 코드가 오면 코드별 안내 문구를 붙입니다.
- 라이브 Builder/Helper 화면의 스타일 누락과 표시 조건(0.0.3에서 수정)을 반영했습니다.
