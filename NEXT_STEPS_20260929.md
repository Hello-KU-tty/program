# 앞으로 고칠 것과 점검할 것 (2026-09-29)

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
