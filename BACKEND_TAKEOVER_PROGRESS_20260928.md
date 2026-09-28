# 백엔드 담당자 후속 프론트 수정 — 2026-09-28

사용자 승인에 따라 `0858811`에서 이어서 기능·복구·보안·접근성 문제를 최소 수정했다. 디자인, CSS와 탐색 구조는 유지했다. 기존 영역에 필요한 안내와 누락된 실행 버튼 연결을 추가했다. commit/push/새 VSIX는 하지 않았다. 최신 결과는 아래19:06 갱신을 따른다.

## 반영 사항

- 실패한 PREVIEW는 같은 Project/Session에서 명시적으로 다시 시도한다. durable 결과와 active run을 우선하며 중복 클릭은 한 요청으로 합친다. 조회/재로드는 자동으로 새 모델을 호출하지 않는다.
- quota/auth/access/model/rate/service 오류를 안전한 고정 안내로 구분한다. Core 업데이트 소유자 대기, Workspace Trust와 일반 폴더 전환 미확인을 구별한다. provider 원문은 노출하지 않는다.
- 새 Discovery Project ID를 `bhlr.lastProjectId` 및 실제 Builder/Helper에 연결했다. ID를 미리 seed하지 않은 provider 검사로 원래 결함을 재현했다.
- History 선택·재실행 시 현재 Discovery/Spec/Build 화면을 Core durable snapshot에서 복원한다. 준비된 Task가 있으면 재확정하거나 새 Task를 만들지 않는다.
- 프로젝트 전환은 구독만 끊고 Core run을 취소하지 않는다. 늦은 응답이 다른 프로젝트 화면에 들어가지 않게 했다. Builder/Helper 구독과 Builder 중지 대상을 분리하고 중복 Builder 요청·취소 응답 순서 race를 보완했다.
- Flow snapshot의 `preparedTask`는 projectId/status만 포함한다. workspacePath는 host에 남기고, 닫힌 패널 콜백은 무효화한다.
- 실제 Mac 화면 검사에서 드러난 Trust/연결 미준비 상태의 생성 버튼 활성화와 미전송 입력 유실을 수정했다. 미준비 상태는 화면/controller 양쪽에서 새 요청을 차단하며 History 조회는 유지한다. History·worker 상태 갱신은 작성 중 초안을 덮지 않는다.
- Flow 메시지의 payload 타입·허용된 필드·길이·참조 revision을 검증한다. `type`/`kind` 혼합으로 하나의 메시지가 Agent도 실행하는 경로를 막았다. 잘못된 메시지10종의 실제 Core 요청0과 정상 메시지/History 동작을 함께 확인했다.
- History 전환·원래 Project 복귀·패널 폐기 뒤 늦은 Decision/native 답변, workspace/result 열기와 Evidence/Final Upgrade 응답을 무효화한다. 실제 HTTP 응답 지연으로 이전 Evidence가 새 화면에 전송되지 않음을 확인했다. 이미 수락된 Core 동작을 자동 취소하지 않는다. 이전 Project의 Evidence·업그레이드 선택·입력은 전환 때만 비우고 같은 Project 갱신 때는 초안을 보존한다.
- Mac 개발 host의 '최신 사용량 관측 필요'를 실제 quota 초과와 구분해 안전한 고정 안내로 표시한다. 예산/Trust/분석 재시도 가드와 동시 host 제한은 backend 개발 harness에 있으며 Windows 제품 quota 기능으로 추가하지 않았다.
- 분석 재시도 버튼이 보내는 revision0은 현재 실패 job 조회로 해결한 뒤 Core에 전달한다. 재시도 성공 후 읽은 Evidence를 실제 화면으로 보내며 같은 job의 처리 중 중복 클릭은 한 요청으로 합친다. 실패/조회 오류 후 자동 재시도는 없고 프로젝트 전환 뒤 늦은 응답은 버린다.
- 기존 Core 상한인 선택 입력4000자·피드백 대상8개를 화면/controller에서 안내한다. 초과 입력·합치기 초안은 지우지 않으며 한도 안으로 수정하면 기존 동작으로 제출한다. 디자인/탐색/도메인 상한은 바꾸지 않았다.
- 창 전환/reload 중 진행되던 Discovery를 host-only run hint로 다시 구독한다. terminal 결과 뒤 durable 화면을 자동 복원하고 Spec 미준비/복원 중 SELECT 전이를 막는다. 조회/SSE만 사용하며 새 모델 호출이나 잃어버린 intent의 자동 replay는 없다.
- Evidence 명시적 조회 후 Helper의 durable 분석 상태도 다시 읽어 PENDING_ANALYSIS 잔존을 해소한다. 전환/복귀/폐기 경합을 함께 검증했고 자동 polling/추가 분석은 도입하지 않았다.

## 검증 범위

- Node 24.19.0에서 `npm run typecheck`, `npm test` **54 files / 699 PASS**, `npm run build` PASS. payload 검사32건·혼합 명령 wiring1건·전환 경합24건·이전 화면 잔존1건의 FAIL 재현 후 수정했다. F6에서는 입력/재시도13건과 실제 Core에 연결한 버튼 클릭의 FAIL을 재현하고 정상 경계·중복·실패 후 명시적 재시도·전환/폐기 회귀를 추가했다. 이후 진행 중 Discovery 복원12건·Spec 미준비3건·Helper 분석 상태4건을 추가했다.
- backend의 `scripts/test-program-consumer.mjs <이 checkout>`: 실제 provider/controller/port + 인증 HTTP/SSE + SQLite PASS. 새 프로젝트→Spec→Builder, History, reload, 실패 재시도, Evidence projector를 검사했다. Agent는 delayed deterministic fixture이므로 native 모델 성공이 아니다.
- F6 consumer는 실제 webview bootstrap/client/renderer도 메모리 DOM에 적용했다. 합성 실패 job의 실제 버튼을 두 번 눌러 durable revision 조회→단일 mutation→WAITING 화면 갱신·재시도 버튼 제거를 검증한다. 메모리 DOM/모델0 결과이며 native 또는 실제 사람 결과가 아니다.
- backend 전체 `pnpm check` 및 E2E12 PASS. frontend consumer와 구분한다.
- Mac Kiro 1.0.437 / Agent1.0.794 / API1.109.5에서 실제 웹뷰를 별도 개발용 host로 띄웠다. 초기 모델0 화면 검사 후 사용자 Trust 승인 아래 PREVIEW/JIT/SPEC·Task 준비·Helper 저장·Analyst 근거0·Builder Decision 대기까지 실제 native로 확인했다. 최초 Builder JSON 오류/취소와 Helper worker 부재도 보존하며 Task/결과 앱 완주는 아직 아니다.
- F6 Mac 화면에서도4001자 초과 안내·History 후 입력 보존·4000자로 수정 시 안내 제거를 확인했다. 합성 테스트 입력만 비웠고 Kiro 업데이트/Trust/계정 설정은 변경하지 않았다.
- 실제 Builder가 저장소 안에서 상위 pnpm workspace14개/Node26을 사용해 그 build/test는 독립 앱 성공으로 인정하지 않았다. 기존 프로필 유지·최소 환경 수정 및 정확한 새 workspaces Trust를 승인받았다. backend 개발 harness만 저장소 밖의 새 private Core와 폴더별 비영구 Node24 terminal PATH를 사용한다. 기존 DB/Decision/창은 보존했고 새 실제 IDE 터미널에서 Node24.19.0/pnpm11.12.0을 확인했다. Windows 제품 launcher/manifest는 바꾸지 않았다.
- 마지막 16:19 계정 관측은820.91/overage Disabled였다. 과거 관측/claim을 재사용하지 않고 매 구간 실제 계정 사용량을 확인한다. 모든 UI 입력은 합성 검증이며 실제 학습자의 이해 성과가 아니다.
- 개발 의존성 npm audit4건(vitest critical 포함)은 미해결 점검 항목이다. frontend 패키지 관리자는 npm이며 임의 pnpm 실행 시 생겼던 lock/workspace2개만 제거하고 기존 package-lock으로 npm ci --ignore-scripts 복원했다. package/lock 변경이나 강제 audit fix는 하지 않았다.

## 17:32 후속 갱신

- 최신 `npm run typecheck`, `npm test`는54 files/712 PASS이고 build와 actual provider/HTTP/SSE/SQLite consumer도 PASS다. 위699개는 그 시점의 기록이다.
- Decision/native 폼은 표시 내용이 같은 stream 갱신에서 DOM/초안을 보존한다. resolved Decision의 재선택/직접 제안은 막되 Helper 질문은 유지한다.
- reload에서 같은 Task의 완료 report와 미적용 Decision을 대조해 완료/대기 상태를 복원한다. 기존 callback에 누락됐던 작업 폴더/결과 실행 버튼을 Builder 영역에 연결했고 완료 Task에 새 Builder 요청은 비활성화한다.
- 기존 Final Upgrade 폼에 durable Task ID/revision과 단일 eligible trace를 채운다. 사용자 목표/명시적 trace 선택을 덮지 않으며, 새 Task 준비 후 snapshot을 다시 읽어 기존 완료 잠금을 해제한다. 자동 Builder 시작은 없다. 디자인/CSS/탐색 구조는 변경하지 않았다.
- 실제 독립 Mac 실행은 PREVIEW10→JIT→SPEC→Decision 선택→Builder Task COMPLETED→Core loopback 실행→Chrome에서 전체8/읽음5/안 읽음3·평점순을 통과했다. 별도 소스 복사본에서 frozen install/typecheck/build/13 tests/HTTP smoke도 통과했다.
- 완료 후 실제 Helper는 Evidence-aware trace(basis5)를 남겼고 실제 폼에서 sequence2 Task를 준비했다. 현재 native Builder가 최초 앱의 서버 배열 처리와 원래 브라우저 실행 제약의 불일치를 보완 중이다. 최초 불일치와 Helper의 동률 순서 설명 오류는 모델 품질 한계로 기록한다.
-17:25 계정 누적829.38, overage Disabled. 사용자가 브라우저는 Chrome을 지정했다. Safari 제어 권한/기본 브라우저 설정은 변경하지 않는다.
- backend 실행기가 구서버를 무조건 재사용하는 결함은 모듈/manifest 회귀2건 후 bounded content fingerprint로 보완 중이다. 이는 프론트만의 수정으로 해결할 수 없어 backend 소스에서 검사한다. Windows kit는 여전히 재생성하지 않았다.

## 18:30 후속 갱신 — 최신 기준

- Node24.19.0에서 고정 설치 `npm ci --ignore-scripts`→typecheck→55 files/715 tests→build→npm audit0을 재검증했다. esbuild0.28.2/Vitest4.1.11로 개발 의존성의 기존 취약점을 해소했고 Node engine을24.19.0으로 명시했다. Vitest3.2.6 후보는 새 mocker 공지가 남아 기각했다. 기존 esbuild 외 install script 허용은 늘리지 않았다.
- 첫 Discovery 입력 전에 Activity 기본 활성화, local 저장 범위/위치, Kiro 모델 전달, masking 한계와 reset/export·자동 삭제 미제공을 안내한다. 새 모달/탐색 단계는 없다. HTML 언어는ko이며 입력에 안내를 연결하고 Builder/Helper/저장 대화/도구 출력의 스크롤 영역에 label/keyboard focus를 부여했다.
- Chrome에서 실제 renderer+고정 transport로 첫 안내·Tab 순서·History 후 초안 보존·console 오류0을 확인했다. 이는 모델0 화면 검사다. 실제 Kiro에도 최신 번들을 reload해 완료 Task/report·Helper 대화와 named region·Evidence 관찰-only 표시를 확인했다. Core 재시작 후에도 새 모델 없이 복원됐다.
- 실제 후속 Builder가 원래 Spec의 브라우저 배열 처리 제약을 구현하고 sequence2 Task를 COMPLETED로 저장했다. 독립 소스 복사본 frozen install/typecheck/build/17 tests/HTTP smoke와 Chrome 전체8/읽음5/안 읽음3·정렬을 통과했다. 원래 서버 구현 불일치는 고쳤지만 Helper의 동률 순서 설명 오류는 품질 한계로 남겼다.
- 최신 backend는 결과 실행기의 compiled output/package/lock 최신성 및 저장 전 구조화 redaction·분할 TEXT 마스킹을 보완했다. integration365/E2E12를 포함한 pnpm check, native161+2SKIP·개발 환경41, actual consumer와 pnpm audit0 PASS. Windows portable kit에는 이 변경을 반영하지 않았다.
-18:26 fresh Kiro 표시835.96, 시작815.91 대비20.05 사용. 마지막 overage Disabled dashboard 관측은17:25이며, 이후 T20 모델 호출은0이다. 새 유료 호출에는 새로운 dashboard 관측/한도 확인이 필요하다. 기존 admission timestamp/claim은 바꾸지 않았다.
- backend의 `docs/T20_AUDIT_20260928.md`, `docs/SUBMISSION.md`, `docs/SUBMISSION_DEMO_AND_SOURCE.md`, 최신 Mac 진행 기록에 감사·제출 초안·한계를 정리했다. 사람 pilot/일반 Kiro baseline과 공식 제출 형식, 알려진 Analyst 의미 오류는 아직 남아 있다. 실제 사용자 실험을 합성 클릭으로 대신하지 않는다.

## 19:06 후속 갱신 — 키보드와 독립 소스 재현

- 후보 바구니 버튼을 Space로 선택하면 hydration이 DOM을 갈아 초점이 BODY로 빠지는 결함을 Chrome에서 재현했다. 후보 표시 데이터가 같으면 버튼을 유지하고 선택/busy 상태만 갱신한다. 상세화 시에는 같은 Project/session의 같은 후보·동작이 여전히 활성화된 경우에만 초점을 복원한다. 다듬기 입력창 초점을 빼앗거나 다른 프로젝트로 옮기지 않는다. CSS·카드 순서·탐색 흐름은 변경하지 않았다.
-4개 회귀 중 수정 전3 FAIL을 재현했고 전체55 files/719 tests·typecheck·build PASS다. 실제 Chrome에서도 바구니 선택/해제 뒤 focus 유지, Tab/Enter, 다듬기 초안 보존을 확인했다. 고정 transport를 사용하는 모델0 실제 renderer 검사이며 native 모델 결과가 아니다.
- backend와 frontend의 현재 소스752개를 명시적으로 선택한 private archive를 만들었다. 압축을 새 폴더에 풀고 frozen install→frontend719/typecheck/build→backend 전체/E2E12→추가 Node210+2SKIP→actual frontend/HTTP/SSE/SQLite consumer를 모두 통과했다. 검사 후 source hash도 일치했다. 첫 후보의 누락 prompt2개는 원본을 포함해 고쳤고 테스트/oracle를 약하게 만들지 않았다.
- 실제 Kiro 개발 창에도719 기준 번들을 적용했고 완료 Task/report·저장 Helper2대화·WORKER_CONNECTED가 복원됐다.19:03 사용량 표시는835.96이며 이번 후속 작업의 모델 호출은0회다. 기존 Trust/로그인/profile과 만료된 admission은 변경하지 않았다.
- 고정 archive hash와 한계는 backend `docs/SOURCE_REPRODUCIBILITY_20260928.md`, 후보 옆 `VALIDATION.json`에 기록했다. private source 검증 후보일 뿐 제품 설치물/최종 제출본으로 승인된 것은 아니다. 사람 pilot/일반 Kiro baseline·알려진 의미 오류·공식 형식에 대한 사용자 판단은 여전히 필요하다.

## 다음 담당자가 지킬 경계

- `vendor/portable`의 Windows kit와 제품 `engines.vscode`/exact source gate는 변경하지 않았다. 현재 backend의 빈 Builder 재개 등 후속 수정을 Windows에 적용하려면 새 kit를 Windows에서 만들고 다시 검증해야 한다. Mac 결과로 Windows PASS를 주장하지 않는다.
- Mac 개발 host는 backend `examples/program-macos-dev/`와 `scripts/prepare-program-macos-dev.mjs`에 있다. 실제 frontend 소스를 번들링하지만 Windows product entry를 교체하지 않는다.
- 이번 계정 누적 크레딧 상한900, 신규 호출 중단선880, 관측 유효기간15분. overage/계정/Trust 자동 변경 금지.
- 아직 최종 제출 완료가 아니다. bounded Mac native 수직 흐름은 후속 Task까지 통과했지만 Evidence 의미 품질, 일반 설치/접근성 잔여 범위, 사람 평가·baseline·공식 제출 형식·fallback 영상은 남아 있다. 오래된 `BACKEND_HANDOFF_INTEGRATION_STATUS.md`의 당시 테스트 수/미연결 설명과 현재 결과를 혼합하지 않는다.
