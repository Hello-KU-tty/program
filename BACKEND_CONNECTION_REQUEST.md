# 백엔드 연결 요청 (Frontend → Backend)

## 0. 요약

프론트엔드(`program/` Kiro 확장)는 실제 `@vibe-helper/frontend-client` SDK를 벤더링하고, 그 SDK를 소비하는 `LocalCoreDiscoveryPort` 어댑터 + fail-closed 게이팅까지 구현을 마쳤습니다. 코드/타입 레벨에서는 실제 backend에 붙을 준비가 끝났습니다. 실제 연결(실측)을 위해 backend 담당자가 아래 항목을 제공/확인해 주셔야 합니다. 이 문서는 그 체크리스트입니다.

핵심 결론: **프론트는 준비됨. 남은 것은 (1) 실행 가능한 로컬 Core backend, (2) `connection.json`, (3) macOS/arm64 실행 환경입니다.**

## 1. 프론트가 이미 구현해 둔 것 (백엔드가 새로 만들 필요 없음)

- 벤더링된 SDK: `program/vendor/frontend-client/` (recovery 브랜치 `origin/codex/kiro-native-recovery-20260913`의 `@vibe-helper/frontend-client`를 빌드해 포함).
- `LocalCoreDiscoveryPort` (`program/src/adapter/flow/local-core-port.ts`): SDK의 `LocalCoreClient`를 프론트의 DiscoveryPort/SpecPort/HistoryPort 경계에 매핑. 모든 메서드 non-throwing (`PortResult`).
- 게이팅 (`program/src/adapter/flow/flow-port-factory.ts`): `createFlowPortsAsync({ connectionFile })` + `isNativeFlowSupported()`. macOS/arm64만 experimental GO, 그 외(Windows 포함) fail-closed → Mock.
- 설정: VS Code machine 설정 `vibeHelper.connectionFile` (절대 파일 경로만; host-only, 웹뷰로 안 넘어감).
- 보안 경계: connection/token은 extension host에만 존재, 웹뷰에는 `{ mode, experimental, reason }` 판정만 전달.

## 2. 프론트가 호출하는 실제 backend 계약 (검증됨)

아래는 SDK가 실제로 때리는 HTTP 엔드포인트입니다. backend는 이 인터페이스를 그대로 제공해야 합니다 (SDK `LocalCoreClient` 구현 기준).

| 메서드 | HTTP | 경로 | 비고 |
| --- | --- | --- | --- |
| `health()` | GET | `/health` | 응답에 `protocolVersion:1`, `backendInstanceId`(connection과 일치), 선택적 `agent` |
| `execute(UiRequest)` | POST | `/api/application` | body `{ protocolVersion:1, request: <UiRequest> }`; 응답 `{ success:true, data }` 또는 `{ success:false, error:{ code } }` |
| `startRun(LocalRunInput)` | POST | `/api/runs` | body `{ protocolVersion:1, request: <LocalRunInput> }` → `LocalRun` |
| `getRun(id)` | GET | `/api/runs/:id` | `LocalRun` |
| `listRuns(projectId)` | GET | `/api/runs?projectId=:id` | `LocalRun[]` |
| `cancelRun(id)` | POST | `/api/runs/:id/cancel` | `LocalRun` (status `CANCELLED`) |
| `watchRun(id, ...)` | GET | `/api/runs/:id/events?after=:seq` | `text/event-stream` SSE; `event: run`과 데이터 이벤트 프레임 |

인증: 모든 요청에 `Authorization: Bearer <token>` 헤더 (token은 connection.json에서). `redirect: 'error'` (리다이렉트 금지). 요청 타임아웃 15초 (SSE 제외).

## 3. `connection.json` 요구 스펙 (필수)

backend가 기동 시 이 파일을 생성해야 하며, 사용자는 그 절대 경로를 `vibeHelper.connectionFile` 설정에 넣습니다. SDK의 connection reader가 다음을 검증합니다:

- 절대 경로의 일반 파일 (심볼릭 링크 아님), 크기 ≤ 16KiB.
- POSIX 권한: non-Windows에서는 private mode(그룹/기타 권한 0)여야 함. **Windows에서는 이 권한 체크를 건너뜀**(SDK `node.ts`에 `process.platform !== 'win32'` 분기 존재).
- JSON 내용은 다음 4개 필드 (zod `localConnectionSchema`):
  - `protocolVersion`: `1` (리터럴)
  - `backendInstanceId`: string (매 기동마다 새 값; `/health`·SSE run 바인딩 검증에 사용)
  - `baseUrl`: string (loopback URL, 예 `http://127.0.0.1:<port>`)
  - `token`: string (64-hex 등 유효 토큰)
- token은 절대 웹뷰/로그에 노출 금지 (프론트가 이미 보장).

## 4. `UiRequest` kind (프론트가 사용하는 것 — execute 경유)

프론트의 discovery→spec + History 흐름이 실제로 호출하는 UI request kind (전체 목록은 SDK `ui-contracts.ts`):

- `UI_START_DISCOVERY` — `{ idempotencyKey, projectId, input:{ learningGoal, personalNeed?, recentFriction?, interestAreas?, currentLevel?(NEW|BEGINNER|FAMILIAR|UNSPECIFIED), freeContext? } }`
- `UI_RECORD_DISCOVERY_FEEDBACK` — `{ idempotencyKey, expectedSessionRevision, feedback:{ id, discoverySessionId, roundId, correlationId, intent(PIN|REJECT|MERGE|REVISE|SHRINK|EXPAND|REGENERATE|MORE|SELECT), targets:[{candidateId,revision}], message?, createdAt(ISO), source:{kind:'USER'}, redactionStatus } }`
- `UI_CONFIRM_LEARNING_SPEC` — `{ idempotencyKey, projectId, learningSpecId, expectedSpecRevision }`
- `UI_PREPARE_BUILDER_TASK` — `{ idempotencyKey, projectId, learningSpecId, expectedSpecRevision }` → `PreparedBuilderTaskDescriptor`(`{ projectId, workspacePath, task, status:'READY' }`)
- `UI_LIST_PROJECTS` — `{ limit }` → `ProjectHistory`
- `UI_RESTORE_PROJECT_SESSION` — `{ projectId, helperConversationLimit }` → `ProjectSessionSnapshot`
- (프론트가 아직 미사용이나 계약상 존재: `UI_UPDATE_LEARNING_SPEC`, `UI_RETURN_TO_DISCOVERY`, `UI_RESOLVE_DECISION`, `UI_PREPARE_BUILDER_SESSION`, `UI_LAUNCH_RESULT`, `UI_OPEN_HELPER`, `UI_RECORD_HELPER_EXCHANGE`, `UI_RETRY_ANALYSIS`, `UI_READ_ANALYSIS_JOBS`, `UI_READ_EVIDENCE_TRACE`, `UI_PREPARE_FINAL_UPGRADE_TASK`, `UI_PREPARE_DISCOVERY_AGENT_CONTEXT`)

## 5. `startRun` (DISCOVERY) phase (프론트가 사용)

`startRun({ kind:'DISCOVERY', projectId, idempotencyKey, discoverySessionId, expectedSessionRevision, phase, candidateIds?, message?, expectedSpecRevision?, enrichAfterPreview? })`

- phase enum: `PREVIEW | ENRICH_ALL | ENRICH_SELECTED | ROUND | MERGE | SPEC`
- 프론트 매핑: startDiscovery→PREVIEW(+enrichAfterPreview:true), enrichCandidate→ENRICH_SELECTED, feedback intent→ (MERGE→MERGE, SELECT→SPEC, 그 외→ROUND), generateSpecDraft/refineSpec→SPEC.
- (BUILDER/HELPER run kind도 계약상 존재하나 프론트 flow에서는 아직 미사용.)

## 6. 백엔드가 해야 할 일 체크리스트

**A. 실행 가능한 로컬 Core backend 제공**

- [ ] `pnpm core:native`(또는 동등) 기동 시 `NATIVE_READY` 출력, `/health`의 Agent source가 `KIRO_IDE_BUILTIN_AGENT`.
- [ ] 위 §2 엔드포인트 전부 제공 + §3 `connection.json` 생성.
- [ ] backend와 Kiro IDE는 별도 프로세스 (가이드 §4).

**B. 설치/배포 경로 (현재 gap)**

- [ ] 현재 backend installer 없음, repository checkout 필요(가이드 §2 "repository 없이 설치하는 backend binary/service/lifecycle UI는 미제공"). → 팀원이 쓸 수 있는 설치/기동 절차 또는 스크립트 제공 요청.
- [ ] source baseline: `origin/codex/kiro-native-recovery-20260913`의 `445497b`.

**C. 플랫폼 (중요)**

- [ ] 현재 native 실행은 **macOS/arm64 exact pin에서만 EXPERIMENTAL GO**. Windows는 NO-GO(fail-closed). → 팀 데모/실측을 macOS/arm64에서 할지, Windows backend 지원을 새로 여는 게 가능한지 backend 담당자 판단 요청.
- [ ] 지원 pin(가이드 §1): macOS/arm64, Kiro IDE 1.0.437, extension-host API 1.109.5, Kiro Agent 1.0.794, Core bridge Node 24.19.0, pnpm 11.12.0(단, 이 릴리스는 깨져 있어 프론트는 SDK 빌드에 pnpm 12.4.2 사용함 — backend toolchain pin 재확인 요청).

**D. 계약 안정성**

- [ ] `protocolVersion:1`, `redactionStatus`, `expected*Revision` 낙관적 동시성 규약 유지.
- [ ] revision 충돌 시 `STALE_*_REVISION`류 코드 반환(프론트가 `revision_conflict`로 매핑), connection rotation 시 backendInstanceId 변경(프론트가 `BACKEND_RESTARTED_RELOAD_CONNECTION` 처리).

## 7. 연결이 되면 프론트에서 일어나는 일

- 사용자가 macOS에서 backend 기동 → `connection.json` 절대경로를 `vibeHelper.connectionFile`에 설정 → Kiro에서 확장 패널 열기.
- `createFlowPortsAsync`가 `isNativeFlowSupported()` 통과(macOS/arm64) + connectionFile 존재 → `connectLocalCore` → `health()` 성공 시 `mode:'live'`로 실제 데이터 사용.
- 실패/미지원 시 자동으로 Mock(`mode:'mock'`, reason 표기)로 fail-closed, 웹뷰 배너에 표시.

## 8. 아직 프론트가 구현 안 한 부분 (backend와 무관, 참고용)

- Builder/Helper 실제 run 스트리밍(`startRun BUILDER/HELPER` + `watchRun` SSE 렌더), Decision(`UI_RESOLVE_DECISION`), Result launcher(`UI_LAUNCH_RESULT`), Evidence(`UI_READ_EVIDENCE_TRACE`), a11y 정밀 검증, Final Upgrade. 이들은 backend가 준비되면 프론트에서 추가 구현할 항목입니다.
