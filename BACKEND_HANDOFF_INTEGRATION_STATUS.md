# 백엔드 인계 kit 적용 상태 및 다음 단계

## 0. 요약
백엔드가 올린 Windows 실행 kit(`frontend-handoff-20260926`, receipt sha256 `1e730fcf7485c32088ce65c4571fdc52233314324aa3b2e34b80536d35d18089`)을 프론트 저장소 `Hello-KU-tty/program`에 적용 완료했습니다. Discovery·Spec·History가 실제 백엔드(managed host + portable Core)에 연결됐고, 설치 가능한 Windows VSIX까지 조립·검증했습니다.

- 적용 브랜치: `feat/windows-live-backend` (origin에 push됨)
- 3-way merge로 `program.patch` 적용 (kit 기준 revision `73d0eb58`가 프론트 히스토리에 없어 자동 `apply-program.mjs` 대신 `git apply --3way` 사용; 11개 파일 clean 적용)
- 조립된 VSIX: `dist/builder-helper-agent-panel-0.0.1-win32-x64-615d7513b257.vsix` (2.5MB, 71 files, receipt sha256 `316b6f8cc973f2201434e0f0082a75d9e8ac7109dded89d2ba0eec9205d38a96`)
- 검증: typecheck 통과 / 테스트 29 files·228 passing / build 성공 / VSIX package 성공

## 1. 적용 방식에 대한 한 가지 중요한 노트 (백엔드 확인 요청)
kit의 `apply-program.mjs`는 `manifest.programBaseFiles`의 SHA-256과 프론트 파일이 정확히 일치해야만 진행합니다. 그러나 프론트는 kit 도착 전에 이미 자체 SDK 통합 커밋(`ed27132`: `LocalCoreDiscoveryPort` 초안 + fail-closed 게이팅 + read-only History)을 갖고 있었고, kit 기준 `frontendRevision: 73d0eb58e374357d6f28ea8db13e9b659cec5e5a` 커밋은 프론트 저장소(로컬/원격) 어디에도 존재하지 않았습니다. 따라서:
- `apply-program.mjs`는 `PROGRAM_FILE_CHANGED`로 중단됩니다(예상된 동작).
- 대신 kit README §1이 안내한 "수동 반영" 경로를 따라 `git apply --3way program.patch`로 적용했고, 11개 파일 모두 충돌 없이 clean 적용됐습니다.
- **요청**: 다음 인계부터는 (a) 프론트의 현재 HEAD를 기준 revision으로 kit을 생성하거나, (b) `73d0eb58` 커밋 자체를 프론트가 접근 가능한 브랜치로 push해 주시면, hash 게이트를 통과하는 정식 `apply-program.mjs` 경로를 쓸 수 있습니다.

## 2. 지금 실제로 연결된 것 (patch 적용 결과, 코드 기준)
- `src/extension.ts`: activation에서 `require(<extensionPath>/portable/bin/frontend-host.cjs)` → `createFrontendHost(context)`로 managed host를 만들고 provider에 주입. `vibeHelper.retryCore`(재연결 후 창 reload), `vibeHelper.stopDiscovery`(진행 중 DISCOVERY run 취소) 명령 등록. deactivate에서 `host.dispose()`.
- `src/adapter/flow/flow-port-factory.ts`: `createManagedFlowPorts(hostPromise)` 추가 — `host.prepare()` 후 `LocalCoreDiscoveryPort(host.client)` 구성. `host.getStatus().native === "WORKER_READY"`면 `mode:"live"`, 아니면 `mode:"unavailable"`(reason = `nativeErrorCode`). `unavailableFlowPorts(reason)`는 모든 op가 `unavailable`을 반환하는 안전 포트(예: `CORE_PREPARING`). 기존 순수 Mock factory(`createFlowPorts`)는 개발 테스트 전용으로 유지.
- `src/adapter/flow/local-core-port.ts`: 백엔드 managed 매핑으로 재작성 — SSE terminal + durable 결과 대기, JIT(ENRICH_SELECTED)/SELECT/Spec 중복 제거, entity별 revision/correlation.
- Discovery·Spec·History → 실제 Core 연결. Builder/Helper의 기존 Demo 응답은 제품 모드에서 차단되고 미연결 안내 표시.

## 3. 백엔드가 이 결과물을 테스트/검증하는 방법
프론트 브랜치를 받아 아래를 재현하면, 프론트가 kit을 올바르게 소비했는지 백엔드 쪽에서 독립 확인할 수 있습니다.

### 3.1 정적 검증 (개발 PC, backend 불필요)
```powershell
git fetch origin feat/windows-live-backend
git checkout feat/windows-live-backend
Set-Location program
npm ci --ignore-scripts
npm run typecheck   # 통과해야 함
npm test            # 29 files / 228 passing 이어야 함
npm run build       # dist/extension.js + dist/webview/main.js 생성
```
- `portable/manifest.json`의 파일별 SHA-256이 kit `manifest.json.files`의 `portable/*` 항목과 일치하는지 확인(무결성). `vendor/frontend-client`가 kit SDK와 동일한지도 대조 가능.

### 3.2 VSIX 조립 재현
```powershell
# kit의 package-program.mjs 사용 (전역 vsce/pnpm 불필요)
node "<kit>\package-program.mjs" "<...>\program"
```
- `dist/*.vsix`와 `dist/program-vsix-receipt.json`이 생성되는지 확인. private 파일(.db/.sqlite/.env/connection.json/.map) 차단 로직이 통과해야 함.

### 3.3 실제 런타임 검증 (지원 Windows pin 필요)
kit README §2/§6 기준. 지원 조합: **Windows x64 build 26200, Kiro 1.1.70 / Agent 1.1.158 / API 1.131.0**, Kiro commit `8ce1870416c7dc7e51fffb01765d93ef7ad55102`, Agent entry SHA-256 `cf6a5124f2fed75144b9d4236e0ffff85a5b22732d739807070783323c071b87`.
1. 지원 Kiro에 로그인 → 작업 폴더 열고 Workspace Trust 승인.
2. Extensions → Install from VSIX로 `dist/builder-helper-agent-panel-0.0.1-win32-x64-615d7513b257.vsix` 설치.
3. Agent Panel 열기 → `CORE_PREPARING` → 준비 완료 시 실제 백엔드 연결 배너.
4. Learning Goal 제출 → preview run 저장 후 후보 10개(자동 전체 enrichment 아님, 선택 후보 JIT 상세화).
5. 후보 선택 → JIT → SELECT 저장 → Spec 생성 1회 → Spec 수정/확정 → Core가 Task·생성 workspace 준비.
6. History 새로고침/확장 재시작으로 저장된 Project 요약 확인(조회만으로 Agent 미호출).
- 오류 코드 대응은 kit README §6 표를 따름(`NATIVE_WORKSPACE_TRUST_REQUIRED`, `CORE_*`, `DISCOVERY_RUN_ACTIVE_STOP_OR_WAIT`, revision conflict, `NATIVE_ROLE_CATALOG_UNVERIFIED` 등).

### 3.4 프론트가 backend에 확인 요청하는 항목
- [ ] 위 3.1/3.2가 백엔드 PC에서도 동일 결과인지(특히 `portable` 무결성·VSIX 조립).
- [ ] 3.3 런타임에서 Discovery→Spec→Task→History 실측이 재현되는지(다른 기기 검증은 kit이 제외했으므로, 추가 기기 검증 필요 여부 판단).
- [ ] `73d0eb58` 기준 문제(§1)에 대한 향후 인계 방식 합의.

## 4. 아직 연결 안 된 것 (다음 단계)
patch는 Discovery·Spec·History만 실제 연결했습니다. 아래는 kit README §5가 제공한 실제 SDK 계약으로 이어 붙일 다음 작업이며, 각 항목은 `host.client` + `portable/bin/local-panel.cjs`(백엔드 참조) 기준입니다.

| 순서 | 화면/기능 | 프론트가 붙일 호출 | 백엔드가 확인/제공할 것 |
| --- | --- | --- | --- |
| 1 | Builder | `startRun({kind:'BUILDER', taskId, expectedTaskRevision, idempotencyKey, message})` + `watchRun` SSE(TEXT/TOOL/STATE/PERMISSION_DENIED) → `restoreProject`로 completion 확인 | Builder run 이벤트 스키마·completion report 안정성 |
| 2 | Helper | `startRun({kind:'HELPER', projectId, taskId, decisionId?, message})` + `HELPER_RECORDED` | Windows Helper가 보조 Kiro 창 사용하는 현재 동작 문서화 |
| 3 | Decision | snapshot `pendingDecisions`+`liveContext.contextVersion` → `UI_RESOLVE_DECISION`(source USER) | Decision→Builder 재개 계약 |
| 4 | 실행 중지 | `cancelRun(runId)` + 후속 `getRun/watchRun` | native ACK 노출 여부(현재 typed ACK 없음) |
| 5 | native 추가 질문 | `host.worker.listUserInputs`/`subscribeUserInputs`/`submitUserInput(NativeAnswer)` | 이 host.worker API 표면 안정성 |
| 6 | 생성 workspace | `UI_PREPARE_BUILDER_SESSION`(purpose WORKSPACE_VIEW) → host `vscode.openFolder` | binding descriptor·절대경로 host-only 규약 |
| 7 | 결과 실행 | `UI_LAUNCH_RESULT` → 검증된 `RUNNING` loopback URL을 `openExternal` | result health·port 검증 |
| 8 | Evidence/분석 | `UI_READ_EVIDENCE_TRACE`, `UI_READ_ANALYSIS_JOBS` | Evidence `QUALITY_FAILED/NEEDS_REVIEW` 표기(학습 성공으로 오독 금지) |
| 9 | Final Upgrade | `UI_PREPARE_FINAL_UPGRADE_TASK` | `PersonalizationTrace`/`HELPER_RECORDED` eligibility gap 해소 여부(현재 미완) |

또한 UX 후속: History 현재 UI는 저장 요약 조회 수준 — 이전 진행 화면 전체 복원 UX는 프론트 후속 범위(kit README §2 명시).

## 5. 백엔드에 대한 구체적 요청 정리
- [ ] 다음 인계 kit은 프론트 현재 HEAD(`feat/windows-live-backend` tip) 기준으로 생성하거나, 기준 revision을 접근 가능한 브랜치로 제공(§1).
- [ ] Builder/Helper run 이벤트·completion·Decision 계약을 §4 순서 1~3부터 안정화해 실제 연결 재개.
- [ ] native `host.worker.*` API(§4-5)와 `UI_PREPARE_BUILDER_SESSION`/`UI_LAUNCH_RESULT` 계약(§4-6,7) 확인.
- [ ] Evidence 품질·Final Upgrade eligibility gap(§4-8,9)의 Core 측 상태 공유.
- [ ] 지원 pin 확대 계획(현재 Kiro 1.1.70/Agent 1.1.158 exact) 공유 — 프론트 개발/데모 머신 Kiro 버전과 어긋나면 host의 exact-source gate가 fail-closed.
