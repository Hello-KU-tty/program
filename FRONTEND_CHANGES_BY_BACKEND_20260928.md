# 백엔드 담당이 프론트 코드를 수정한 내역 고지 (2026-09-28)

> 작성: 백엔드 담당
> 기준: `main` `0858811` (PR #7 머지) 위의 변경. 같은 날 백엔드 Codex 작업 세션에서 수정했고, 백엔드 담당이 이 문서로 정리해 한 커밋으로 올린다.
> 세부 작업 로그: `BACKEND_TAKEOVER_PROGRESS_20260928.md` (Codex 원본 기록, 같은 커밋에 포함)

> **PR 요청:** 백엔드 계정(`hurdooagent`)은 이 저장소에 쓰기 권한이 없다. 그래서 fork `hurdooagent/program`의 `fix/discovery-reload-restore` 브랜치에서 `Hello-KU-tty/program` `main`으로 PR을 열어 두었다. 아래 내용을 확인하고 Windows에서 검증한 뒤 **PR을 받아 주세요.** 문제가 있으면 PR에 코멘트로 알려 주면 된다.

프론트 소유 코드이므로 **어디를 왜 고쳤는지** 먼저 알린다. 디자인, CSS, 카드 순서, 탐색 흐름은 바꾸지 않았다. 기존 영역에 안내 문구와 빠져 있던 버튼 연결만 더했다.

---

## 1. "후보 만나기"를 눌러도 입력한 값만 보이고 후보가 안 나오는 문제

### 증상
- 학습 목표를 입력하고 "후보 만나기"를 누르면 프로젝트 제목(= 입력한 학습 목표)만 보이고 후보 10개가 나오지 않는다.
- Kiro 사용량을 늘려도 똑같다.
- 백엔드 간이 클라이언트에서는 재현되지 않는다.
- History에는 "탐색 중 · 이어서 보기"로만 남는다.

### 원인 (프론트, `0858811` 기준)
백엔드는 후보를 정상 생성해 Core DB에 저장했다. 프론트가 **창 전환 뒤 그 결과를 다시 받아오지 못한 것**이 문제였다.

1. `startDiscovery`가 Core에 PREVIEW 실행을 요청한다. 컨트롤러는 먼저 프로젝트 제목을 입력값으로 만든다.
2. native worker가 준비되면서 Kiro 창이 `core-data\workspaces`로 전환되고 extension host가 **리로드**된다. 체크리스트의 "창이 전환될 수 있고, 패널이 다시 붙음"이 이 단계다.
3. 리로드되면 새 `FlowController`와 `LocalCoreDiscoveryPort`가 생긴다. PREVIEW 완료를 기다리던 `generatePreviewRound`와 메모리의 `previews`·`projects` 맵이 사라진다. **진행 중인 Discovery에 다시 붙는 코드가 없었다.**
4. History "이어서 보기"(`restoreHistoryProject`)는 제목·상태 요약만 반환하고 컨트롤러 화면 상태(`previewRound`, 후보, 라운드)에 넣지 않았다. 그래서 Core에 저장된 후보 10개가 끝내 화면에 올라오지 않았다.
5. `src/webview/main.ts`에서 `flowNotice`가 no-op이었다. 그래서 실패나 한도 초과 안내도 화면에 보이지 않았다.

백엔드 간이 클라이언트는 이 창 전환과 리로드를 거치지 않아서 드러나지 않았다. Mac에서 같은 증상을 재현한 기록은 백엔드 `docs/FRONTEND_MAC_PROGRESS_20260928.md` 86행과 90행에 있다.

### 수정
| 파일 | 내용 |
| --- | --- |
| `src/adapter/flow/local-core-port.ts` | `restoreFlow(projectId)`: Core durable snapshot에서 세션, previewRound, 라운드, 후보, 선택, 스펙을 복원한다. 진행 중인 Discovery run이 있으면 `pendingDiscovery` 힌트를 host에만 준다. `watchDiscovery()`: 이미 수락된 run에 SSE로 다시 붙고, 끝나면 화면을 다시 읽는다. `generatePreviewRound`: 저장된 결과를 우선 표시하고, 진행 중 PREVIEW에는 다시 붙는다. 사용자가 명시적으로 재시도할 때만 새 PREVIEW run을 시작하며, 중복 클릭은 한 요청으로 합친다. |
| `src/adapter/flow/discovery-port.ts`, `flow-port-factory.ts` | `FlowPorts.restore`와 `RestoredFlow` 타입을 추가하고 live 포트에 연결했다. |
| `src/core/flow/flow-controller.ts` | `restoreSavedProject()`로 복원 결과를 화면 상태에 반영하고, pending run이면 `watchDiscovery`로 구독한다. 같은 입력으로 다시 제출하면 새 프로젝트 대신 같은 세션의 PREVIEW를 재시도한다. 프로젝트가 바뀌면 늦게 도착한 응답은 버린다. |
| `src/webview/flow/flow-dispatcher.ts` | `openHistoryProject`가 `restoreSavedProject`를 호출한다. |
| `src/agent-panel-view-provider.ts` | 시작하거나 리로드되면 `bhlr.lastProjectId`로 마지막 프로젝트를 자동 복원한 뒤 Agent 스트림을 다시 붙인다. 새 Discovery의 Core Project ID를 Builder/Helper와 `bhlr.lastProjectId`에 바인딩한다. 복원이 끝나기 전에는 웹뷰 메시지를 처리하지 않는다. |
| `src/webview/main.ts` | `flowNotice`를 실제 화면(`role=status`)에 표시한다. |

모든 복원과 재구독은 조회와 SSE만 쓴다. **모델을 새로 호출하거나 이전 요청을 자동으로 다시 보내지 않는다.**

### Windows에서 확인하는 방법
1. 새 학습 목표로 "후보 만나기"를 누른다.
2. 창이 `core-data\workspaces`로 전환되고 패널이 다시 붙은 뒤, 추가 클릭 없이 후보 10개가 자동으로 표시되는지 확인한다.
3. 기존 "탐색 중" 프로젝트를 History에서 열었을 때, 후보가 저장돼 있으면 그대로 표시되는지 확인한다.
4. 실패하면 이제 원인 안내가 보인다. 예: "Kiro 사용량 한도에 도달했어요", Trust 필요, 이전 Core 종료 대기.

---

## 2. 그 밖에 함께 수정된 범위

| 영역 | 파일 | 내용 |
| --- | --- | --- |
| 오류 안내 | `src/core/runtime-errors.ts`(신규), `src/adapter/agent/agent-error.ts`, `local-core-port.ts` | `NATIVE_QUOTA_EXCEEDED`, `NATIVE_AUTH_REQUIRED`, `NATIVE_WORKSPACE_TRUST_REQUIRED`, `CORE_UPDATE_WAITING_FOR_OWNER_EXIT` 등을 고정된 한국어 안내로 바꾼다. provider 원문, 요청 ID, 경로는 화면에 넘기지 않는다. |
| 미준비 상태 차단 | `src/webview/flow/flow-render.ts`, `flow-controller.ts` | Core나 worker가 준비되지 않으면(`unavailable`) 생성, 선택, 다듬기 버튼을 막는다. 화면과 컨트롤러 양쪽에서 막는다. History 조회는 계속 쓸 수 있다. |
| 입력 보존과 상한 | `src/core/flow/flow-limits.ts`(신규), `flow-render.ts`, `feedback-validation.ts` | Core에 이미 있는 상한(선택 입력 4000자, 피드백 대상 8개)을 미리 안내하고, 초과해도 초안을 지우지 않는다. worker나 History가 갱신돼도 작성 중인 초안을 덮지 않는다. |
| 메시지 검증 | `src/webview/flow/flow-messages.ts`, `agent-panel-view-provider.ts` | 웹뷰→host flow 메시지의 필드, 타입, 길이를 허용 목록으로 검증한다. `type`과 `kind`가 섞인 메시지 하나로 Agent까지 실행되는 경로를 막았다. |
| Builder/Helper | `src/core/agent/agent-controller.ts`, `agent-view-model.ts`, `src/webview/agent/*` | Builder와 Helper의 구독과 중지 대상을 분리했다. 중복 요청과 "취소 응답보다 SSE가 먼저 도착하는" 경합을 보완했다. 리로드 때 완료 report와 대기 중 Decision을 복원한다. 빠져 있던 작업 폴더와 결과 실행 버튼을 연결했다. 완료된 Task에는 새 Builder 요청을 막는다. Final Upgrade 폼에 durable Task ID와 revision을 채운다(자동 제출은 없다). 분석 재시도 시 revision 0을 현재 실패 job 조회로 해결한다. 프로젝트 전환 뒤 늦게 온 Evidence, Decision, 결과 응답은 버린다. |
| 개인정보와 접근성 | `flow-render.ts`, `agent-render.ts`, `agent-panel-view-provider.ts` | 첫 Discovery 입력 위에 데이터 저장 위치와 Kiro 전달 안내 문구를 추가했다. `html lang="ko"`. 스크롤 영역에 label과 키보드 초점을 줬다. 후보를 담거나 뺄 때 초점이 BODY로 빠지는 문제를 고쳤다. |
| 스냅샷 최소화 | `src/core/flow/flow-snapshot.ts` | 웹뷰로 보내는 `preparedTask`는 `projectId`와 `status`만 포함한다. 작업 폴더 절대경로는 host에만 남긴다. |
| 테스트 | `test/*` (신규 5개: `evidence-retry`, `flow-input-limits`, `flow-messages`, `privacy-notice`, `runtime-errors`, 기존 다수 보강) | 위 항목마다 수정 전 FAIL을 재현한 뒤 수정했다. |
| 개발 의존성 | `package.json`, `package-lock.json` | `esbuild` 0.21.5→0.28.2, `vitest` 1.6→4.1.11 (`npm audit` 취약점 4건, vitest critical 포함 해소). `engines.node`를 `24.19.0`으로 고정했다. |

`vendor/portable`(Windows kit), `vendor/frontend-client`(SDK), 제품 `engines.vscode`는 **바꾸지 않았다**.

---

## 3. Node 버전 고정에 대해 (프론트 판단 필요)

- `engines.node: "24.19.0"`은 백엔드 검증 환경(Node 24.19.0)에 맞춘 **정확한 버전 고정**이다. `.npmrc`에 `engine-strict`가 없어서 다른 버전에서는 `npm ci`가 경고만 낸다.
- vitest 4.1.11은 Node `^20 || ^22 || >=24`, esbuild 0.28.2는 `>=18`을 지원한다. 프론트 환경에서 불편하면 `">=20.19.0"` 정도로 **완화해도 된다**. 완화하면 한 번 `npm ci && npm run typecheck && npm test && npm run build`로 확인해 주면 된다.
- 이 설정은 개발 도구용이다. 확장이 실행될 때의 Node는 Kiro가 결정하므로 제품 동작과는 무관하다.

---

## 4. 백엔드 호환성

- 이 프론트는 `vendor/frontend-client`의 기존 SDK 메서드(`listRuns`, `getRun`, `watchRun`, `startRun`, `restoreProject`)만 쓴다. **현재 Windows kit(`vendor/portable`)으로도 1번 수정은 동작한다.**
- 프론트 보고서 `BACKEND_LIVE_TEST_ISSUES_20260928.md`의 B1(오류 코드 분류)과 B2(업데이트 후 옛 Core 재사용)는 백엔드 커밋 `5af5eb0`(`codex/windows-extension-runtime-20260923`)에 들어 있다. **현재 `vendor/portable` kit에는 아직 반영되지 않았다.** 그래서 Windows에서는 한도 초과가 여전히 `NATIVE_RPC_REJECTED`로 보일 수 있고, 확장을 업데이트한 뒤에는 Kiro를 완전히 재시작해야 한다. 새 kit는 Windows에서 따로 만들어 검증해야 한다.
- 이번 개선의 백엔드 변경 내역은 백엔드 저장소 `docs/BACKEND_CHANGES_20260928.md`에 정리했다.

---

## 5. 검증 (2026-09-28, macOS arm64, Node 24.19.0, npm 11.17.0)

- `npm ci --ignore-scripts` → `npm run typecheck` → `npm test` **55 files / 719 tests PASS** → `npm run build` PASS → `npm audit` 0건.
- 커밋한 소스 39개 파일의 해시는 Codex가 새 폴더에 풀어 독립 재현한 source candidate(`SOURCE_MANIFEST.json`, archive SHA-256 `68b22872…3314`)와 모두 같다. 그 재현에서 백엔드 전체 검사와, 실제 프론트 provider/controller/port + 인증 HTTP/SSE + SQLite consumer 검사도 통과했다.
- 실제 Kiro는 **Mac에서만** 확인했다. PREVIEW→상세화→SPEC→Builder Task 완료까지 진행했다. **Windows에서는 아직 검증하지 않았다.** 위 1번의 확인 방법으로 Windows에서 확인해 주면 된다.
