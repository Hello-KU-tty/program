# 백엔드 다음 단계 요청 (프론트 §4 연결 완료 후)

> 보낸 사람: 프론트
> 기준 브랜치: feat/windows-live-backend (origin push 완료)
> 기준 커밋: 1dd230f (Builder/Helper/Decision/중지/추가질문/workspace/실행/Evidence/Final Upgrade 라이브 연결)
> VSIX: dist/builder-helper-agent-panel-0.0.2-win32-x64-cb9ac433df2e.vsix

---

## 0. 요약

백엔드 update kit(frontend-handoff-20260927)을 적용하고, kit §3에서 확정해 준 계약과 SDK helper(projectRunEvent, classifyBuilderTurn, createDecisionResolutionRequest, summarizeEvidenceTrace, eligibleFinalUpgradeTraces, classifyNativeWorkerStatus)를 사용해 §4 요청 화면 전부(Builder / Helper / Decision / 중지 / 추가 질문 / 생성 workspace / 결과 실행 / Evidence / Final Upgrade)를 프론트 코드/타입/결정론적 테스트 레벨에서 연결 완료했습니다.

- 검증: typecheck 통과, 49 files / 537 tests green(기존 배포 흐름 28~29파일/228테스트 유지 + 신규 20개 테스트 파일), build 양쪽 번들 생성.
- 통합은 순수 additive: managedHost가 있을 때만 라이브 컨트롤러/디스패처를 구성하고, 기존 Discovery/Spec/History(Demo/PanelController) 흐름은 그대로 유지(회귀 가드 테스트로 고정).
- 남은 것은 실측입니다. 데모 PC가 지원 pin과 달라(아래 §1) 프론트 측에서는 라이브 실측을 못 합니다. 백엔드/지원 pin 환경에서의 실측·계약 안정화가 다음 단계입니다.

---

## 1. 먼저 정해야 할 것: 지원 pin (블로커)

데모/프론트 PC 실제 버전:

| 항목 | 이 PC 값 | 백엔드 지원 pin |
| --- | --- | --- |
| Kiro IDE | 1.0.293 | 1.1.70 |
| Kiro Agent 확장 | 1.0.532 | 1.1.158 |

- 이 조합은 지원 pin과 메이저·마이너가 다른 구버전이라, host가 NATIVE_INSTALLATION_* 로 fail-closed 합니다. 이 PC에서는 native 실측이 불가하고 History 조회만 됩니다.
- 요청: 아래 중 하나를 정해 주세요.
  - (a) 이 버전(Kiro 1.0.293 / Agent 1.0.532)을 다음 검증 대상 pin으로 추가.
  - (b) 프론트가 지원 pin(Kiro 1.1.70 / Agent 1.1.158)으로 업그레이드해야 하는지.
- 확정되면 프론트가 그 환경에서 실측하고, 실패 시 error code와 host.worker.getStatus() 값을 함께 회신하겠습니다.

---

## 2. 프론트가 붙인 계약 (백엔드가 실측/안정화 확인할 항목)

아래는 각 화면에서 프론트가 실제로 호출하는 계약입니다. 백엔드는 지원 pin 환경에서 이 계약들이 안정적으로 동작/유지되는지 확인해 주세요.

| 화면 | 프론트 호출 | 백엔드 확인 요청 |
| --- | --- | --- |
| Builder | startRun(BUILDER, taskId, expectedTaskRevision, idempotencyKey, message) + watchRun SSE(projectRunEvent로 TEXT/TOOL/STATE/PERMISSION_DENIED 투영) + After_Snapshot을 classifyBuilderTurn으로 판정 | run 이벤트 스키마와 completion report 안정성. SUCCEEDED만으로 완료 아님 규약 유지 |
| 복원 | listRuns + isRunActive로 활성 BUILDER run 재구독, watchRun after=0 전체 replay. 마지막 projectId는 globalState(bhlr.lastProjectId) | 창 reload 후에도 활성 run 재조회가 일관되는지 |
| Helper | startRun(HELPER, origin, decisionId?) + HELPER_RECORDED, After_Snapshot의 helperConversations 읽기 | Windows Helper가 보조 창 쓰는 현재 동작 문서화, helperConversations 필드 안정성 |
| Decision | createDecisionResolutionRequest -> execute(UI_RESOLVE_DECISION). 해결 후 Builder 자동 재개 없음 | DECISION_ALREADY_RESOLVED / LIVE_CONTEXT_STALE 재투영 규약 |
| 중지 | cancelRun(runId). SSE Abort는 취소 아님. worker AGENT_ENDED_* 로 CLEANUP->IDLE | native ACK 노출 여부(현재 typed ACK 없음) |
| 추가 질문 | host.worker listUserInputs / subscribeUserInputs / submitUserInput(NativeAnswer). 사용자가 고른 선택 그대로 제출 | 이 worker API 표면 안정성, NATIVE_* 거부 코드 목록 |
| 생성 workspace | execute(UI_PREPARE_BUILDER_SESSION, WORKSPACE_VIEW) -> host openFolder(절대경로 host-only) | binding descriptor / 절대경로 host-only 규약 유지 |
| 결과 실행 | execute(UI_LAUNCH_RESULT) -> 검증된 RUNNING loopback URL을 openExternal | result health / port 검증, RESULT_* 코드 |
| Evidence | execute(UI_READ_EVIDENCE_TRACE) + summarizeEvidenceTrace, 재시도 UI_READ_ANALYSIS_JOBS / UI_RETRY_ANALYSIS | displayState / userUnderstandingCount 의미 안정성(관찰과 사용자 이해 분리) |
| Final Upgrade | eligibleFinalUpgradeTraces 사전 필터 + execute(UI_PREPARE_FINAL_UPGRADE_TASK) | 취소/실패 Helper 기록 제외(FINAL_UPGRADE_HELPER_TURN_NOT_RECORDED) 유지 확인 |

---

## 3. 백엔드가 이 결과물을 독립 검증하는 방법

### 3.1 정적 검증 (backend 불필요)
```powershell
git fetch origin feat/windows-live-backend
git checkout feat/windows-live-backend
Set-Location program
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
```
- 기대: typecheck 통과, 49 files / 537 tests 통과, dist/extension.js + dist/webview/main.js 생성.
- 신규 라이브 연결은 전부 additive라 기존 배포 흐름(Discovery/Spec/History) 테스트는 그대로 green.

### 3.2 실제 런타임 검증 (지원 pin 필요)
1. 지원 Kiro(1.1.70 / Agent 1.1.158)에 로그인, 작업 폴더 열고 Workspace Trust 승인.
2. Extensions -> Install from VSIX로 0.0.2 설치.
3. Agent Panel에서 Discovery -> Spec -> Task 준비까지 진행.
4. Builder run 시작 -> 스트리밍/완료 판정/Decision/중지 흐름 확인(프론트 실테스트 가이드 §3 대응).
5. 실패 시 error code + host.worker.getStatus() 회신.

---

## 4. 백엔드에 대한 구체적 요청 (체크리스트)

- [ ] (블로커) 지원 pin 결정: 데모 PC pin 추가 vs 프론트 업그레이드 (§1).
- [ ] Builder run 이벤트/ completion report / Decision 재투영 계약이 지원 pin 환경에서 안정적인지 확인 (§2).
- [ ] host.worker.* (listUserInputs / subscribeUserInputs / submitUserInput) API 표면과 NATIVE_* 거부 코드 목록 확정 (§2 추가 질문).
- [ ] UI_PREPARE_BUILDER_SESSION / UI_LAUNCH_RESULT / UI_READ_EVIDENCE_TRACE / UI_PREPARE_FINAL_UPGRADE_TASK 계약 안정성 확인 (§2).
- [ ] Evidence displayState / userUnderstandingCount 의미와 Final Upgrade eligibility(취소/실패 Helper 제외) 규약 유지 확인 (§2).
- [ ] 다음 인계 kit은 프론트 현재 HEAD(feat/windows-live-backend tip, 1dd230f) 기준으로 생성하거나 기준 revision을 접근 가능한 브랜치로 제공.

---

## 5. 참고: 프론트가 지킨 불변식 (테스트로 고정됨)

- 완료 판정은 오직 classifyBuilderTurn. run.status === SUCCEEDED 만으로 완료 표시 안 함.
- Decision 해결은 Builder를 자동 재개하지 않음(명시적 재개만).
- 미적용 Decision이 있으면 같은 Task에 TASK_COMPLETED 표시 안 함.
- 중지(cancelRun)와 창 닫기(SSE abort)는 다름.
- CLEANUP -> IDLE 전이는 worker의 AGENT_ENDED로만.
- 복원은 sequence 0부터 전체 replay.
- native 답변은 사용자가 고른 그대로 전달.
- Evidence는 관찰/이해 구분, 인정 0건이면 사유 표기(성공으로 오독 금지).
- 연결/토큰/host 객체/절대 workspaceDirectory는 웹뷰로 넘어가지 않음(절대경로는 host openFolder/openExternal 에서만).
- 통합은 additive: managedHost 없으면 기존 Demo/PanelController 경로 그대로.
