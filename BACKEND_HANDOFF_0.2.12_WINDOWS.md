# Windows 0.2.12 결과와 다음 할 일 (2026-10-17)

> **2026-10-19 갱신:** 부스 PC 준비(3장)는 지금도 이 순서를 따릅니다. 설치 파일 버전과 당일 주의만 최신으로 고쳤습니다. 1·2장은 0.2.12 당시 기록입니다.

frontend가 Windows 0.2.12를 확인해 core `main`에 올렸습니다. 이 문서는 세 가지를 담습니다.
- backend에 전달할 결과와 다음 빌드 커밋
- 부스 PC 준비 절차
- 참고 사항

같은 내용을 [core 이슈 #4](https://github.com/Hello-KU-tty/core/issues/4)에도 올렸습니다.

| # | 할 일 | 누가 | 언제까지 |
| --- | --- | --- | --- |
| 1 | 0.2.12 결과 확인 | backend | 참고만 |
| 2 | 다음 빌드(0.2.13)에 program `b0541b5` 이후 커밋 쓰기 | backend | 0.2.13을 만들 때 |
| 3 | 부스 PC 준비 | **부스 PC를 가진 사람** | **부스(10-20) 전** |

---

## 1. Windows 0.2.12 올림 (core `86a64b7`)

- **빌드:** backend `e020bbc` + program `1eefe3f`(두 checkout 모두 깨끗함)
- **파일:** 2,608,078 bytes · SHA-256 `bd65be96e6ddb9beb9e92ed32d8faac2a471d5a0c542b1d861beb56aa34b9a4b`
- **설치 가이드·README:** 두 플랫폼 모두 0.2.12를 가리킵니다. 올린 뒤 내려받아 HTTP 200과 해시 일치를 확인했습니다.
- **자동 검사(Windows):** program 843, backend unit 179, integration 557, 패널 CJS 193 통과
- **자세한 결과:** 인계 문서 [0.2.12 Windows 확인](https://github.com/Hello-KU-tty/core/blob/main/docs/FRONTEND_KIRO_NATIVE_HANDOFF.md#0212-windows-확인-2026-10-17)

| 확인 | 결과 |
| --- | --- |
| 1~8 | 통과 |
| 9 | 통과. 첫 Task에서 코드 전에 선택을 물음, `run_workflow` 없음 |
| 14 | 통과. 이의 제기로 같은 질문이 다시 열리고, 곁가지 질문은 기록되지 않음 |
| 16 | 통과. 서버 확인과 브라우저 열기에 승인 창 없음 |
| 26 npm | 통과. `npm install`·`test`·`build`에 `double-loading config` 없음, 우회 명령 없음 |
| 27 승인 창 | 통과. 명령 승인 창 0개(Kiro `web_search` 도구 승인 1번뿐). 새 규칙(`Out-String`, `Invoke-WebRequest "http://localhost:*`)이 새 폴더와 0.2.11 폴더 모두에 생김 |
| 28 개념 기록 | 통과. `conceptUsage`에 계획의 두 개념이 있고 `ignoredConcepts`는 `[]`. 패널 학습 기록 탭에 보임 |
| 29 실패 보고 | 나오지 않음 |
| 30 새 창 | 새 창 확장 호스트 시작 뒤 **4.5초**에 활성화(0.2.11 사용자 기록은 19초). 이 PC는 상위 폴더가 이미 신뢰돼 있어 신뢰 창이 뜨지 않았다. 그래서 "상위 폴더도 신뢰" 선택지는 확인하지 못했다. **이 PC는 부스 PC가 아니다** |

## 2. 다음 빌드에 쓸 program 커밋: `b0541b5`

- [program#13](https://github.com/Hello-KU-tty/program/pull/13)을 `main`에 합쳤습니다. program `main` = `b0541b5`.
- **문제:** "근거 불러오기"를 누르면 학습 기록 탭에 Evidence Analyst의 판정 메모가 그대로 보였습니다. 예: "인정된 근거 없음: Episode에서 … USER_DECISION reference … BUILDER_CHAT_TURN …".
- **고친 것:**
  - 인정된 근거가 0건인 분석은 고정 문장을 보여 줍니다. "이번 대화에서는 이해 근거로 인정된 내용이 없어요. 고른 이유나 내 생각을 내 말로 적으면 근거로 남아요."
  - Analyst 메모는 지우지 않고 "자세한 분석 메모" 접힌 영역에 둡니다.
  - 성공처럼 보이지 않게 하는 규칙(Req 10.4)은 그대로입니다.
- **확인:** typecheck 통과, `npm test` 844 통과(Windows). 실제 Kiro 화면은 다음 빌드에서 확인합니다.
- **0.2.12에는 들어 있지 않습니다.** 0.2.13을 만들 때 이 커밋 이후로 빌드해 주세요. 패널 UI 세 건과 함께 넣든 따로 넣든 상관없습니다. 커밋을 알려 주시면 Windows도 같은 커밋으로 빌드해 맞추겠습니다.

## 3. 부스 PC 준비 (부스 전에 꼭)

부스 PC 앞에서 직접 해야 하는 일입니다. 약 15분 걸립니다. Kiro 계정 크레딧이 조금 듭니다(후보 찾기 한 번).

### 3-1. 설치와 로그인
1. Kiro IDE를 설치하고 **본선 계정**으로 로그인합니다. 버전은 1.2.56에서 확인했습니다(Help → About).
2. Kiro CLI를 설치하고 로그인합니다.
   - Windows: PowerShell에서 `irm https://cli.kiro.dev/install.ps1 | iex` → `kiro-cli login` → `kiro-cli whoami`가 성공해야 합니다.
   - Mac: Kiro 공식 안내대로 설치한 뒤 같은 순서로 로그인합니다.
   - **IDE와 CLI는 같은 계정, 크레딧이 남은 계정**이어야 합니다. 크레딧이 떨어지면 작업이 중간에 멈춥니다(0.2.10 확인 때 실제로 겪었습니다).
3. [설치 가이드](https://github.com/Hello-KU-tty/core/blob/main/docs/DOWNLOAD_GUIDE.md)에서 OS에 맞는 **최신 설치 파일**을 받습니다. 2026-10-19 기준 **Windows는 0.2.14**(`win32-x64`)이고, **Apple Silicon Mac은 0.2.13**(`darwin-arm64`)입니다. Mac 0.2.14는 backend가 빌드 중입니다(이슈 #7). Kiro에서 Extensions → `…` → **Install from VSIX…**로 설치한 뒤, **Kiro를 완전히 종료했다가** 엽니다.

### 3-2. Kiro 자동 업데이트 끄기
부스 도중 Kiro가 업데이트되면 확인한 버전과 달라집니다.

1. 명령 팔레트(Windows `Ctrl+Shift+P`, Mac `Cmd+Shift+P`) → **Preferences: Open User Settings (JSON)**
2. 맨 아래에 아래 한 줄을 추가하고 저장합니다. 앞 줄 끝에 쉼표가 있어야 합니다.
   ```json
   "update.mode": "none"
   ```
3. 화면 오른쪽 위에 **Update** 버튼이 보여도 누르지 않습니다.

### 3-3. 생성 프로젝트 상위 폴더 신뢰
패널에서 새 Project를 열 때마다 신뢰 창과 "다시 로드"가 뜨면 관람객 시연이 끊깁니다. 상위 폴더를 한 번 신뢰해 두면 둘 다 없어집니다.

1. Kiro 빈 창(File → New Window)의 Agent Panel에서 아무 목표로 후보 → 계획 확정 → **"이걸로 시작"**을 누릅니다. 프로젝트 폴더가 새 창으로 열립니다.
2. 신뢰 창이 뜨면 **"상위 폴더도 신뢰"(Trust the authors of all files in the parent folder 같은 문구)** 선택지를 켜고 신뢰합니다.
3. 그런 선택지가 없으면, Kiro의 신뢰 설정(명령 팔레트 → **Workspaces: Manage Workspace Trust**)에서 폴더 추가로 아래 폴더를 넣습니다.
   - Windows: `%APPDATA%\Kiro\User\globalStorage\vibe-helper.builder-helper-agent-panel\core-data\workspaces\projects`
   - Mac: `~/Library/Application Support/Kiro/User/globalStorage/vibe-helper.builder-helper-agent-panel/core-data/workspaces/projects`(Mac 경로는 Windows 구조로 미루어 적은 것이니 실제 폴더를 확인해 주세요)
4. **확인:** 다른 목표로 새 Project를 한 번 더 엽니다. 새 창이 **신뢰 창과 다시 로드 없이** 열리고, Kiro 채팅 새 세션이 저절로 열리면 됩니다.

### 3-4. 리허설 한 번
1. 새 Project 창의 Kiro 채팅에 "계획대로 만들기 시작해 줘"(또는 "ㄱㄱ")를 보냅니다.
2. 번호 선택지가 오면 "1번, 이유는 ○○"처럼 답합니다.
3. 완료 뒤 브라우저가 열리고, 패널 빌더 탭에 "다음 한 걸음" 카드가 생기는지 봅니다.
4. 승인 창이 뜨면 명령 원문을 적어 frontend에 알려 주세요.

### 3-5. 부스 당일 주의
- **창을 다시 로드했거나 Kiro를 다시 켰으면, Kiro 채팅은 새 세션(+)에서 이어 갑니다.** 예전 세션을 계속 쓰면 Builder가 도구를 못 찾고 같은 시도를 반복할 수 있습니다(0.2.13 확인).
- **"Core에 연결할 수 없어요 (코드)"가 뜨면:** 먼저 **Vibe Helper: Retry Core Connection**을 실행합니다. 그래도 같으면 괄호 안 코드를 frontend에 알려 주세요(Windows 0.2.14부터 코드가 보입니다).
- **절전 끄기:** 노트북 덮개를 닫거나 절전에 들어가도 0.2.10부터는 Core가 버팁니다(Windows 5분 절전 확인). 그래도 시연 중에는 전원을 연결하고 절전을 꺼 두는 편이 안전합니다.
- **터미널이 채팅 자리를 가리면:** 명령 팔레트 → **Vibe Helper: Restore Kiro Layout** 또는 **View: Reset View Locations**를 실행합니다.
- **Core 연결 실패 알림이 뜨면:** 알림의 **다시 연결**을 누르거나, 명령 팔레트 → **Developer: Reload Window**를 실행합니다.
- **Kiro 채팅이 Vibe Helper 도구를 못 쓴다고 하면:** 창을 다시 로드한 뒤 새 세션(+)에서 다시 시작합니다.
- **답을 안 하고 멈추면:** 세션 기록에 `UsageLimitReachedError`가 있으면 크레딧 소진입니다. 다른 계정으로 로그인한 뒤 "작업 마무리해 줘"를 보내면 이어집니다.

## 4. 참고: 이번 Task의 이해 근거가 0건인 이유 (의도한 동작)

- 첫 답의 근거는 인정됐다가, "그건 내가 고른 게 아니야"로 철회됐습니다(`DECISION_NOT_CHOSEN_BY_LEARNER`).
- 두 번째 답 "1번, … 코드가 단순한 게 좋다"는 곁가지 질문에 Builder가 "1번이 더 간단하다"고 답한 직후라 `DIRECTLY_LED`·`INSUFFICIENT_EVIDENCE`로 거절됐습니다.
- 확인 14 절차가 만든 결과이고, 보수적 Evidence 원칙대로 동작했습니다. 부스에서 관람객이 자기 이유로 답하면 근거로 남습니다.

## 5. 아직 정하지 않은 것

- 0.2.12 인계의 패널 UI 세 건(탭 정리, 첫 화면 진행 안내, Next Move 입력 예시와 복사 버튼)은 사용자가 범위를 정한 뒤 frontend가 진행합니다. 들어가면 두 플랫폼을 0.2.13으로 다시 빌드합니다.
