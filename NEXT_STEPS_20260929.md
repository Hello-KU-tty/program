# 앞으로 고칠 것과 점검할 것 (2026-09-29)

## 결정 선택 후 계속 실행 (0.0.16)

**최종 native 상태:** 선택 적용(`resolved/applied=true`, pending0)과 파일 작성 뒤 21:32:42 KST에 `NATIVE_BUILDER_BUDGET_TIMEOUT_CONFIRMED`로 종료됐다. Task는 ACTIVE이며 앱 완성은 아니다. 자동 유료 재시도는 하지 않았다. 아래 실행 중 보존 기록 이후 현재 run은 terminal이다. 새 확장의 설치·화면 확인은 core 상세 기록을 따른다.

사용자 실측에서 선택은 저장됐지만 Builder는 별도 재개 버튼을 기다렸다. 최신 화면 개편과 kit 갱신·인계 0f94445 위에서 선택 버튼을 ‘정하고 계속하기’로 바꾸고 decision/resolveAndContinue를 연결했다. 기존 decision/resolve는 계속 저장만 수행하므로 Helper·History의 자동 실행은 없다.

- 저장 성공 후 같은 Project/Task와 선택 저장을 다시 확인하고, 다른 미해결 결정·기존 활성 Builder가 없을 때 한 번 시작한다. 실패·중복·프로젝트 이동·dispose·최종 준비 중 Task 교체는 새 실행0이다. 여러 결정이면 마지막 선택 뒤 이어진다.
- 실행 중 선택은 기존 Builder에 저장된 결정을 제공한다. 중복 run은 열지 않는다. 별도 재개 버튼은 ‘선택한 내용으로 계속하기’로 명확히 표시한다.
- 실제 Core-issued blocking Decision→프론트 dispatcher/controller→HTTP/SSE/SQLite에서 저장·ACTIVE 전환·Builder1회와 중복 클릭 병합 PASS. 테스트 fixture의 Agent는 합성이며 native 모델 성공으로 주장하지 않는다.
- 사용자 기존 선택은 다시 제출하지 않고 현재0.0.14의 명시적 재개 버튼으로 이어서 실행했다. 실제 Builder가 저장된 선택을 읽고 후속 파일을 작성하는 것을 확인했다. 실행 중인 창의 reload/종료는 하지 않는다.
- 타입·전체 테스트57파일/794개·빌드 PASS. 다음 확장 버전은0.0.17 이상이다. frontend가 적용한 backend kit2026.09.29.3을 유지한다. [검증·설치 상태](../core/docs/FRONTEND_DECISION_CONTINUE_FIX_20260929.md).

## 즉시 작업 인계: 양쪽 main 병합 완료 (0.0.14)

HURDOO의 program push 권한을 확인했고, 원격 ca586f4/5519b18과 로컬0.0.10~0.0.13 수정들을 merge로 보존했다. 오류 안내 NATIVE_IDE_TURN_FAILED/PROJECT_TOOLCHAIN_DENIED도 포함한다. 아래16:30의 Write 권한 대기·브랜치 병합 대기는 이 후속으로 대체한다.

- 병합 최종 frontend 타입·전체 테스트·빌드 검증을 수행했다. 채팅 수정 이전의 실제 provider/Core 소비 회귀도 PASS다.
- **최종 소스는0.0.14**다. 병합 전 로컬 설치한0.0.13과 다른 내용이므로 버전을 올렸다. 개발자는 최신 main에서 이어서 작업한다.
- backend kit은2026.09.29.2 유지. B13을 포함할 다음 kit은2026.09.29.3 이상, 다음 확장 버전은0.0.15 이상을 사용한다. 기존 source ZIP은 아직0.0.10 시점이다.
- 이쪽 프론트 실제 화면 검증은 별도 완료 근거가 필요하다. 전체 자동 검증을 Windows 한 창 동시 실행·기존0.0.9 업그레이드·사용자 학습 효과 PASS로 확대하지 않는다.

## 채팅·도우미 배너 수정 인계 (0.0.13)

스트리밍 TEXT 조각을 하나로 이어 문단·목록·강조·코드를 안전하게 표시하고, 역할 표시/대화 스타일/Helper 스크롤 보존을 추가했다. HTML과 외부 이미지·활성 링크는 실행하지 않는다. Helper의 실제 run 이벤트와 terminal을 기준으로 창 준비 표시를 해제하며 늦은 로컬 상태가 다시 켜지 못하게 했다. 무한 blink도 제거했다.

- typecheck, 57 files / 779 tests, build, 실제 provider/Core HTTP/SSE/SQLite 소비 회귀 PASS. kit2026.09.29.2/118관리hash 유지.
- Kiro CLI0.0.13 설치 확인. W reload에서 이전 H owner의 UPDATE_WAITING을 확인했으며, 이 인계 시점 실제 새 화면 검증은 미완료다.
- Windows 별도 H 창은 현재 권한 격리 제약으로 유지한다. 한 창 제거는 별도 capability 검증이 필요하다. 재시작 전체 transcript 복원·Helper 저장 요약 품질·영어 진행 출력은 후속 항목이다.
- [원인·수정·VSIX hash·후속 작업](../core/docs/FRONTEND_CHAT_FIX_20260929.md). 프론트 실측은 이쪽에서 이어서 진행한다. 아래 이전 기록은 당시 상태다.

## Builder 시작 연결 (0.0.12)

사용자 실측에서 스펙의 ‘이걸로 시작’이 확정·Task 준비만 수행하고 Builder를 호출하지 않았다. 명시적 확정 동작에서 준비 성공·동일 Project·PENDING Task를 확인해 한 번 시작하도록 연결했다. History/재시작은 모델0 복원을 유지하며 기존 PENDING 작업에는 ‘빌더 시작’을 제공한다. 초기 학습 목표를 복사한 제목 대신 선택한 제품명을 표시하고, DISCOVERY 종료를 Builder 오류처럼 보이지 않게 안내한다.

- typecheck, 56 files / 767 tests, build 및 실제 provider→Core HTTP/SSE→SQLite 소비 PASS. 중복 시작·준비 실패·화면 이탈·dispose와 복원0 회귀 포함.
- 0.0.12 설치·재시작 전후 기존 저장 hash 동일. 계정836.86/2000·Overages Disabled 확인 뒤 기존 PENDING 작업의 시작 버튼1회로 실제 native 도구의 작업 시작 성공, Task ACTIVE/revision2를 확인했다. 앱 완성으로 판정하지 않으며 사용자 직접 실측을 이어간다.
- 현재 [설치 파일·hash·실측](../core/docs/FRONTEND_BUILDER_START_FIX_20260929.md). backend kit2026.09.29.2/118관리hash 유지. B13 진단 변경은 다음 backend kit 대상이다. program push는 HURDOO Write 권한 대기다.


## 새 후보 표시 복구 (0.0.11)

사용자 실측에서 MERGE는 성공·저장됐지만 새 후보가 ID/로딩 안내로만 보였다. adapter가 round 참조만 반환하고 controller가 저장 상세를 반영하지 않은 문제였다. 저장 상세를 round와 함께 전달해 즉시 표시하고, renderer의 상세 조회도 candidateId:revision으로 바꿔 이전 후보에 최신 내용이 섞이지 않도록 수정했다.

- typecheck, 56 files / 758 tests, build PASS. 실제 controller/port→Core HTTP/SSE→SQLite→webview에서 MERGE/REGENERATE 직후 표시, 입력·바구니 보존, 추가 enrichment 없음 PASS.
- kit2026.09.29.2 관리 파일118개는 그대로다. 0.0.11 VSIX를 설치·재시작해 기존 프로젝트의 새 후보와 원래 후보 상세를 확인했다. 저장 상태 hash는 동일하고 복구의 새 모델 run은0이다.
- 현재 설치 파일·SHA와 검증 범위는 [후속 기록](../core/docs/FRONTEND_FEEDBACK_DISPLAY_FIX_20260929.md)을 따른다. 아래0.0.10과 기존 source ZIP은 이전 시점 기록이다.
- program push는 HURDOO Write 권한 대기다. 권한 부여 전 재시도하지 않는다. 프론트 직접 실측은 준비된 Kiro 창에서 이어서 진행한다.


## 2026-09-29 후속 작업 결과 (0.0.10)

**직접 사용 준비 결과:** 이쪽에서 현재 소스0.0.10을 다시 빌드·설치하고 제품 workspace Trust를 적용했다. 합성 목표로 실제 PREVIEW1회가32.812초에 성공해10개 후보를 저장했다. Kiro 정상 종료·재시작 뒤 History에서 같은 후보를 추가 모델 호출 없이 복원했고 durable 상태 hash도 같았다. 사용량835.96→836.18/2000, Overages Disabled. 사용자용 Kiro 창은 빈 학습 목표 입력 화면으로 준비했다. Builder/Helper 이후 직접 실측은 이어서 진행할 예정이다. [현재 VSIX·실측 범위](../core/docs/FRONTEND_LIVE_READY_20260929.md).

**Git 전달:** core 소스 `bc8570b` push 완료. program 소스 `deef685` commit 완료이며, 현재 HURDOO의 해당 repository Write 권한이 없어 push를 대기한다. 권한 부여 전 반복 push하지 않는다. 이 후속은 소스 변경 없는 문서 기록이다.

**실측 담당/예정:** 프론트 실측은 **이쪽(core 작업 환경)에서 현재 제출 후보 확장을 Kiro에 적용해 진행할 예정**이다. 사용자 직접 사용을 위한 창과 대상 Workspace Trust도 준비한다. 확장 설치·Trust는 사용자가 승인했으며, 이번 변경은 `hurdoo` 계정으로 `Hello-KU-tty/core`, `Hello-KU-tty/program`에 commit/push한다. 아래 미커밋/실측 미완료 문구는 이전 자동 검증 시점의 기록이며 실제 관측 결과는 후속 인계로 구분한다.

이 절은 아래 최초 인계의 현재 상태/바로 할 일을 갱신한다. 최초 기록과 당시 실측은 그대로 보존한다.

- backend8265e9d에는 e3532b7이 이미 포함되어 있다. 새 kit **frontend-handoff-20260929-2 / 2026.09.29.2**를 실제 program에 적용했고 관리 파일118개 hash를 검증했다. 새 적용 receipt는 `.vibe-helper-kit.json`이다.
- kit 이름·버전·이전 기준의 소스 하드코딩을 없앴다. 실제 적용 파일 hash와 receipt/manifest를 대조하는 `--program`, `--verification` 방식은 [새 kit 절차](../core/docs/FRONTEND_HANDOFF.md)를 따른다.
- 외부 JS/CMD/EXE pnpm의 공용 shim 교체를 정확한 descriptor/launcher와 같은 제품 상위 버전 조건에서 검증했다. Node 변경·변조·downgrade 거절은 유지했다.
- Spec의 이전 후보 보기는 저장 Session/Spec/candidate/input을 보존하며 모델0이다. 현재 Spec 재열기도 모델0이다. 명시적 새 후보 받기에서만 같은 Project의 새 Session과 preview1회를 생성한다.
- package/package-lock **0.0.10**, Node24.19.0 pin 유지. 실제 frontend typecheck·753 tests·build, actual consumer PASS. backend 전체 check와 native169도 PASS.
- 제품0.0.10 VSIX 생성 및 Kiro1.1.70 CLI 설치/목록 확인을 마쳤다. 이 PC는 설치 전 기존0.0.9가 없어 기존 프로젝트 upgrade PASS로 세지 않는다. 실제 Kiro 재시작/activation·Agent는 미검증이다.
- source ZIP781개 파일을 새로 풀어 lockfile 설치, backend 전체 check, frontend753, panel build/native169+source selector6, actual consumer를 통과했다. 검사 후781개 hash 일치. 실제 모델0.
- 모든 변경은 현재 미커밋이다. commit/push/외부 제출은 하지 않았다. 옛 push 명령을 이번 작업에서 실행하지 않았다.

남은 실측: 최신 크레딧/Overages 관측(누적900·신규중단880 유지), 기존 프로젝트/Trust 확인, B6/B7/B8/B11과 vertical flow·History·fallback 영상. B3 durable 실패/abandon은 여전히 미구현이다. 사람 pilot·baseline과 정확한 제출 형식도 별도 조건이다.

산출물·hash·잔여 항목은 [제출 전 결과](../core/docs/SUBMISSION_READINESS_20260929.md), 소스 재현 명령은 [재현 보고서](../core/docs/SOURCE_REPRODUCIBILITY_20260929.md)를 기준으로 한다. 아래 최초 기록의0.0.9/하드코딩/push 권고는 현재 완료 상태로 오해하지 않는다.

---

프론트(`program`)와 백엔드(`core`)를 함께 기준으로 정리했다. 실측은 이 문서의 **2. 실측 점검** 순서대로 진행하고, 결과는 `LIVE_TEST_CHECKLIST.html`의 "결과 Markdown 복사"로 남긴다.

## 0. 현재 상태 (16:30 갱신)

| 항목 | 값 |
| --- | --- |
| 이 PC 설치 확장 | 0.0.9 (kit 2026.09.29.1) |
| 백엔드 `main` | `eb215ef` — PR #1 머지, HURDOO `bc8570b`/`d8c0d31`, B13 포함. push 완료 |
| 프론트 `main` | `5519b18` — push 완료. `82f55ff` 이후 오류 안내 2개(`NATIVE_IDE_TURN_FAILED`, `PROJECT_TOOLCHAIN_DENIED`)와 이 문서 |
| HURDOO 프론트 `deef685` | 0.0.10, kit 2026.09.29.2 적용, "다른 주제로 돌아가기" 후보 보존 등. **program Write 권한이 없어 push 안 됨** (`82f55ff` 기반) |
| 백엔드 `pnpm check` (`eb215ef`) | 전체 통과. E2E 1개는 첫 실행 실패 후 3/3 재통과(일시적) |

`5519b18`과 `deef685`는 둘 다 `82f55ff`에서 갈라졌다. 같은 버전 번호(0.0.10, kit 2026.09.29.2)로 다른 결과물을 만들지 않기 위해, 이 PC에서는 새 kit와 VSIX를 만들지 않고 합치기를 기다린다.

---

## 1. 바로 할 일 (순서대로)

1. **HURDOO에게 `Hello-KU-tty/program` Write 권한 부여** (GitHub → program → Settings → Collaborators and teams → HURDOO를 Write로 추가)
2. **HURDOO가 `deef685`를 브랜치로 push:** 예) `git push origin deef685:refs/heads/feat/submission-0.0.10`
3. **합치기:** 그 브랜치에 `main`(`5519b18`)을 merge한다. 겹칠 수 있는 파일은 `src/core/runtime-errors.ts`, `test/runtime-errors.test.ts`, `NEXT_STEPS_20260929.md`, `LIVE_TEST_CHECKLIST.html`이다. `runtime-errors.ts`는 양쪽 항목을 모두 살린다.
4. **최종 kit:** 백엔드 `main`(`eb215ef` 이상, B13 포함)에서 PowerShell로 `pnpm check` → `pnpm frontend:handoff`. 기준은 자동 선택되며, 버전은 `2026.09.29.3` 이상으로 한다(2026.09.29.2는 HURDOO 로컬 kit와 겹침).
5. **프론트 적용과 설치:** `update-program.mjs --check` → 적용 → typecheck·test·build → `--verify` → 버전 **0.0.11**로 VSIX 조립 → 설치 → Kiro 완전 재시작.
6. **이 PC에서 업그레이드 확인:** 0.0.9 → 0.0.11에서 기존 프로젝트("기본적인 리액트 활용 웹사이트") Builder가 막히지 않는지 본다. B12와 pnpm shim 수정의 실사용 검증이다. HURDOO 쪽은 기존 확장이 없어 이 검증을 하지 못했다.

---

## 2. 실측 점검 (우선순위 순)

### 2.1 사전 조건

- [ ] Kiro 창은 하나만. 특히 `core-data\workspaces` 창이 두 개가 되지 않게 한다.
- [ ] `vibe-test`와 `core-data\workspaces` 폴더 둘 다 Workspace Trust.
- [ ] Kiro 크레딧 잔량 확인.
- [ ] 확장 설치 후에는 Kiro 완전 재시작(Reload만 하면 이전 Core가 남을 수 있음).
- [ ] **빌더·도우미가 실행 중일 때 그 창을 닫거나 다시 열지 않는다.** 닫히면 run이 `NATIVE_IDE_TURN_FAILED`로 끊긴다(2026-09-29 15:58 재현: 빌더 창과 도우미 창이 3초 간격으로 닫히며 두 run 모두 실패). 작업은 ACTIVE로 남으니 같은 요청을 다시 보내면 된다.
- [ ] **`nvm use`로 전역 Node를 바꾸지 않는다.** 생성 프로젝트는 Node 경로를 기록하고, Node가 바뀌면 의도적으로 거절된다.

### 2.2 이번 수정의 실제 동작

| 항목 | 기대 결과 | 관련 |
| --- | --- | --- |
| 기존 프로젝트 Builder 재실행 | `PROJECT_TOOLCHAIN_CHANGED_RESTART_REQUIRED` 없이 실행 | B12, `e3532b7` |
| 새 프로젝트 Builder 실행 | 첫 실행부터 정상. 공용 pnpm shim 문제 없음 | `e3532b7` |
| 확장 버전 업그레이드 후 기존 프로젝트 | 0.0.9 → 0.0.10 뒤에도 그대로 실행 | B12 |
| Builder 진행 설명 언어 | 한국어. 규칙 번호·도구 식별자로 설명하지 않음 | B11 |
| Builder 셸 명령 | `.\.kiro\vibe-tools.cmd pnpm …` 형식으로 실행. 막히면 원인별 안내 | B8 |
| 완료 판정 | 빌드·테스트 없이 완료하려 하면 `TASK_VALIDATION_NOT_RUN` 안내, 완료로 표시 안 됨 | B8 |
| 도구 목록 | 최근 3개 + 요약, 펼치기, 한글 이름, "파일 없음"은 회색이고 실패 개수에서 제외 | B9 |
| Helper | 도구 0개 거절이 재발하는지. 재발 시 bridge 마지막 단계 코드 기록 | B7 |
| 같은 폴더 창 두 개 | 현재 창으로 처리되거나 "창을 하나만 남기고" 안내 | B6 |

### 2.3 아직 한 번도 실측하지 못한 흐름

- [ ] 작업 폴더 열기(생성 프로젝트가 Kiro에서 열림, 화면에 절대경로 노출 없음)
- [ ] 결과 실행(`http://127.0.0.1:<포트>`로 열리고 서비스 동작)
- [ ] Decision 해결 후 자동 재개 없음, "빌더 다시 시작"으로만 재개
- [ ] 추가 질문(native) 답변 전달
- [ ] Evidence 불러오기와 정직한 표시(관찰만 / 인정 0건 사유)
- [ ] 분석 실패 재시도
- [ ] Final Upgrade 후보·준비
- [ ] 개인화: Evidence가 쌓인 뒤 Helper 설명이나 새 Discovery 후보가 달라지는지
- [ ] Kiro 재시작 후 History에서 각 단계(탐색/스펙/빌드) 복원
- [ ] "← 처음으로" 후 Reload해도 시작 화면 유지
- [ ] "다른 주제로 돌아가기" 후 같은 입력으로 재생성

---

## 3. 고쳐야 할 것

### 3.1 백엔드

| 우선 | 항목 | 내용 |
| --- | --- | --- |
| 높음 | kit 생성 자동화 | 이름·버전·이전 기준이 코드에 고정돼 있어 kit마다 스크립트를 고쳐야 한다. 직전 적용 kit manifest를 기준으로 자동 선택하도록 바꾸면 `PROGRAM_MANAGED_FILE_MODIFIED` 재발을 막을 수 있다. |
| 높음 | Builder 명령과 허용 목록 불일치 | 2026-09-29 15:58:09 `PERMISSION_GUARD_BUILDER_SHELL_PROJECT_TOOLCHAIN_DENIED`: Builder가 보호 실행기 허용 목록(`pnpm install --frozen-lockfile`, `pnpm install --lockfile-only …`, `pnpm test`, `pnpm run <script>`, `pnpm rebuild esbuild`, `node --test`)에 없는 명령을 시도했다. 입력 원문은 기록되지 않는다. Builder prompt(1.3.11)가 허용 목록만 쓰도록 안내하는지, 거부된 명령의 종류(예: `pnpm add`, `npx`)를 원문 없이 분류해 남길 수 있는지 확인한다. |
| 중간 | 창 종료 시 턴 실패 사유 | 창이 닫혀 끊긴 턴이 범용 `NATIVE_IDE_TURN_FAILED`로만 남는다. 창 종료·세션 종료를 구분한 코드가 있으면 안내가 정확해진다. |
| 높음 | 도구 교체 경로 점검 | B12와 `e3532b7`은 Core 관리 pnpm만 다룬다. 사용자 PC의 기존 pnpm(`EXISTING_PNPM`)을 쓰던 공용 shim은 pin이 바뀌면 여전히 거절된다. pin 교체 시 필요한 파일 전체(프로젝트 실행기, descriptor, 공용 shim)를 한 번에 검증하는 통합 테스트가 필요하다. |
| 중간 | B7 근본 원인 | Helper 도구 0개 거절의 원인은 미확정이다. 새 bridge 진단(`BRIDGE_STAGE_*`)으로 재현 시 마지막 단계를 확인한다. |
| 중간 | B3 실패 기록·정리 | 실패한 Discovery가 History에 "탐색 중"으로만 남고, Core 재시작 후에는 실패 사유도 사라진다. durable 실패 기록과 프로젝트 정리(abandon) API가 필요하다. |
| 중간 | 이전 후보 보기 | "다른 주제로 돌아가기"가 새 세션을 만들어서 이전 후보를 보여 주지 못한다(BRIEF §8과 다름). 이전 세션 후보를 조회하는 경로가 필요하다. |
| 낮음 | 테스트 fixture 이름 | 업그레이드 테스트 대부분이 참조 패널 이름(`vibe-helper-portable-core`)만 쓴다. 실제 제품 이름으로 된 케이스를 늘린다. |

### 3.2 프론트

| 우선 | 항목 | 내용 |
| --- | --- | --- |
| 중간 | History 실패 표시·정리 | 백엔드 B3가 생기면 실패 사유 표시와 "정리" 버튼을 추가한다. |
| 완료 | 턴 중단·명령 거부 안내 | `NATIVE_IDE_TURN_FAILED`, `PROJECT_TOOLCHAIN_DENIED` 한국어 안내 추가(로컬 커밋, 0.0.10 설치 때 반영). |
| 중간 | 새 코드 안내 | 실측에서 원시 코드로 보이는 새 오류·상태가 나오면 `src/core/runtime-errors.ts`에 안내를 추가한다. 모르는 코드는 원시 코드로 표시되며 깨지지는 않는다. |
| 낮음 | Discovery 중 Helper | BRIEF는 "항상 접근 가능한 Helper"를 말하지만 현재 Helper는 빌드 단계에서만 보인다. 범위를 확인한 뒤 결정한다. |
| 낮음 | `engines.node` | `package.json`이 24.19.0으로 고정돼 이 PC(24.18.0)에서 `npm ci` 경고가 난다. `>=20.19.0`으로 완화할지 결정한다(동작 영향 없음). |

---

## 4. 실패했을 때 확인 순서

1. **화면 안내와 오류 코드.** 대부분 한국어 안내와 코드가 함께 뜬다.
2. **worker 기록:** `%APPDATA%\Kiro\User\globalStorage\vibe-helper.builder-helper-agent-panel\core-data\native-worker-status.jsonl`의 마지막 `AGENT_FAILED_*`, `PERMISSION_GUARD_*`.
3. **Kiro 로그:** `%APPDATA%\Kiro\logs\<최신>\window*\exthost\`에서 `[KRS]`(한도·인증), `Exception` 검색.
4. **run 상태:** `program/vendor/frontend-client/node.cjs`의 `connectLocalCore(connection.json)` → `listRuns(projectId)`의 `status`/`errorCode`.
5. **`PROJECT_TOOLCHAIN_CHANGED_RESTART_REQUIRED`가 나면 세 가지를 비교한다.**
   - 프로젝트 실행기: `<project>\.kiro\vibe-tools.cmd`
   - descriptor: `core-data\project-tools\projects\<sha>.json`
   - 공용 shim: `core-data\project-tools\bin\pnpm.cmd`

   이 셋의 Node 경로·pnpm 버전·설치 경로가 현재 확장과 맞는지 본다.

## 5. 작업 환경 규칙

- 백엔드 검증(`pnpm check`)은 **PowerShell**에서 돌린다. Git Bash에서는 `whoami.exe`가 다른 도구로 잡혀 테스트 2개가 실패한다.
- 백엔드 명령은 `$env:PATH = "C:\Users\USER\AppData\Local\nvm\v24.19.0;" + $env:PATH`처럼 Node 24.19.0을 앞에 붙여서만 실행한다.
- 백엔드 checkout은 LF 줄바꿈이어야 한다(`.gitattributes`의 `eol=lf`). CRLF로 풀리면 포맷 검사가 실패한다.
- kit 관리 디렉터리(`program/portable`, `program/vendor`)는 직접 수정하지 않는다. 바꿔야 하면 백엔드에서 고치고 kit로 반영한다.

## 참고 문서

- 백엔드 요청 기록: `BACKEND_LIVE_TEST_ISSUES_20260928.md` (B1~B12)
- 백엔드 답변: `core/docs/FRONTEND_LIVE_TEST_RESPONSE_20260929.md`(B6), `core/docs/FRONTEND_B7_B11_RESPONSE_20260929.md`(B7~B11)
- 현재 kit 안내: `core/docs/FRONTEND_HANDOFF_20260929.md`
- 실측 체크리스트: `LIVE_TEST_CHECKLIST.html`
