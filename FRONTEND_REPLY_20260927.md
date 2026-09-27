# 프론트 회신 (2026-09-27 update kit 적용 결과 + 데모 PC 버전 보고)

## 0. 요약
- update kit `frontend-handoff-20260927` (receipt sha256 `4c9b338bcdc24f72afa0eaf61c70c5c54d13a780fabf7fb5440df5cce378f0d9`) 적용 완료. `--verify` 118개 파일 byte 일치, git 추적 규칙 4개 존재. typecheck / 29 files·228 tests / build / VSIX 조립(0.0.2, 71 files) 모두 통과.
- **데모(프론트) PC의 Kiro/Agent 버전이 지원 pin과 다릅니다. 따라서 이 PC에서는 native 실측(§3.3)이 불가하며, 지금은 History 조회만 됩니다.** 아래 §2에 정확한 버전을 정리했습니다.
- Builder/Helper/Decision/중지 등 §4 연결은 실측 없이도 진행 가능한 코드·계약·테스트 레벨부터 착수합니다(§3).

## 1. update kit 적용 결과 (백엔드 §2 절차대로)
- `update-program.mjs --check` → `READY: kit 2026.09.27.1 can replace portable, vendor/frontend-client, vendor/frontend-host; 4 git tracking rule(s) to add.`
- 적용 후: `.gitattributes`(`/portable/** -text`, `/vendor/frontend-client/** -text`, `/vendor/frontend-host/** -text`) 생성, `.gitignore`에 `!/portable/node_modules/` 추가, `portable/node_modules/` 복원(better-sqlite3 win32-x64 native binary 포함).
- `git add portable vendor .gitattributes .gitignore package.json` → 새로 추적된 파일 다수(28개 portable/node_modules 포함).
- `--verify` → `VERIFIED: 118 managed files match kit 2026.09.27.1; git tracking rules present.`
- `package.json` version `0.0.1 → 0.0.2` (이전 VSIX 위 재설치용).
- VSIX: `dist/builder-helper-agent-panel-0.0.2-win32-x64-cb9ac433df2e.vsix` (2.39MB, 71 files, receipt sha256 `0303abb257668e4dc16982fffdda51d85bbcfa0040e040d90b798b821deaef01`).
- 적용 브랜치: `feat/windows-live-backend` (origin에 push됨). 커밋 `8557115`.
- SDK+portable을 함께 교체했으므로 Core의 신규 `helperConversations[].correlationId` 필드도 정상 수용됩니다.

## 2. 데모 PC 버전 보고 (백엔드 §1.4 요청)
백엔드가 다음 검증 대상으로 잡을 수 있도록, 이 프론트/데모 PC의 실제 버전을 보고합니다.

| 항목 | 이 PC 값 | 백엔드 지원 pin |
| --- | --- | --- |
| OS | Windows x64 | Windows x64 |
| Kiro IDE | **1.0.293** (commit `c4293777d0f76e95df562db101f8d124e2eed9ad`) | 1.1.70 (commit `8ce1870416c7dc7e51fffb01765d93ef7ad55102`) |
| Kiro Agent 확장 | **1.0.532** | 1.1.158 (entry SHA-256 `cf6a5124f2fed75144b9d4236e0ffff85a5b22732d739807070783323c071b87`) |

- Kiro 실행 파일: `C:\Users\USER\AppData\Local\Programs\kiro\Kiro.exe` (ProductVersion 1.0.293).
- Agent 확장: `...\kiro\resources\app\extensions\kiroAgent` (version 1.0.532, publisher `kiro`).
- **판정:** 이 조합은 지원 pin(1.1.70 / 1.1.158)과 **메이저 마이너가 다르고 더 낮은 구버전**입니다. 백엔드 문서 §1.4대로 host가 `NATIVE_INSTALLATION_*`로 fail-closed하며, native 수직 흐름(Discovery preview run·JIT·Spec·Task·결과 실행)은 실행되지 않습니다. VSIX 설치 자체는 되고 History 조회는 가능합니다.
- **요청:** (a) 이 버전(Kiro 1.0.293 / Agent 1.0.532)을 다음 검증 대상 pin으로 추가해 주시거나, (b) 실측이 필요하면 프론트가 지원 pin인 Kiro 1.1.70 / Agent 1.1.158로 업그레이드해야 하는지 알려 주세요. 어느 쪽이든 확정되면 그때 §3.3 실측을 진행하고, 실패 시 error code와 `host.worker.getStatus()` 값을 함께 보고하겠습니다.

## 3. §4 연결 진행 계획 (실측과 분리)
지원 pin 불일치로 실측은 대기 상태이지만, 백엔드가 §3에서 확정한 계약과 SDK helper(`projectRunEvent`, `classifyBuilderTurn`, `createDecisionResolutionRequest`, `summarizeEvidenceTrace`, `eligibleFinalUpgradeTraces`, `classifyNativeWorkerStatus`)로 아래를 코드·타입·deterministic 테스트 레벨에서 먼저 연결합니다. 지원 pin 환경이 준비되면 그대로 실측으로 이어집니다.

1. Builder(§3.1): `startRun(BUILDER)` + `watchRun` SSE(`projectRunEvent`로 TEXT/TOOL/STATE/PERMISSION_DENIED 투영) + `classifyBuilderTurn`으로 완료/Decision/실패 판정. 창 전환 reload 후 `listRuns`+`isRunActive` 재구독 복원, 마지막 Project ID를 `context.globalState`에 저장.
2. Helper(§3.2): `startRun(HELPER, origin, decisionId?)` + TEXT 이벤트 + `HELPER_RECORDED`. 보조 창(`HELPER_WINDOW_OPENING`) 상태 표시.
3. Decision(§3.3): `createDecisionResolutionRequest` → `execute`. 해결 후 Builder 자동 재개 없음(사용자 명시 실행).
4. 중지(§3.4): `cancelRun` 결과(`CANCELLED`/`NONE`)와 worker 상태(`AGENT_ENDED_*`)를 분리 표시. SSE Abort는 취소 아님.
5. 이후 native 추가 질문(§3.5), 생성 workspace 열기(§3.6), 결과 실행(§3.7), Evidence(§3.8), Final Upgrade(§3.9)를 순차 연결. Evidence는 `displayState`/`userUnderstandingCount` 기준으로 "관찰"과 "사용자 이해"를 분리하고 단정 문구를 피함.

Builder 시작 시 창이 생성 workspace로 reload될 수 있으므로, 실행 중이던 run 재구독 복원을 Builder 연결의 필수 항목으로 포함합니다(§3.1).

## 4. 확인/합의 요청 정리
- [ ] 데모 PC pin(Kiro 1.0.293 / Agent 1.0.532)을 다음 검증 대상으로 추가할지, 아니면 프론트가 1.1.70/1.1.158로 업그레이드할지.
- [ ] §4 연결은 위 순서로 착수 예정. 우선순위 조정 의견이 있으면 알려 주세요.
- [ ] 실측이 가능한 지원 pin 환경이 확보되면 §3.3 절차로 검증하고 결과 회신.
