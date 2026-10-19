# Hello Vibe — Kiro 확장 프론트엔드

배우고 싶은 기술에서 프로젝트를 발견하고, 실제 서비스를 만들며 이해의 근거를 남기는 Kiro IDE 확장입니다. 이 저장소는 Vibe Helper 패널(프로젝트 찾기 · Learning Spec · 진행 · 학습 기록)을 담당합니다. 상태·권한·Evidence 계산, SQLite 저장과 설치물 포장은 [Core 저장소](https://github.com/Hello-KU-tty/core)의 책임입니다.

## 설치

본선 설치물은 Kiro-native **0.2.14**(Apple Silicon Mac, Windows x64)입니다. 사용자는 소스를 빌드하지 않고 VSIX를 설치합니다.

- [다운로드·설치 가이드](https://github.com/Hello-KU-tty/core/blob/main/docs/DOWNLOAD_GUIDE.md)
- [Mac(Apple Silicon)용 0.2.14 VSIX](https://github.com/Hello-KU-tty/core/raw/refs/heads/main/releases/macos/kiro-native/builder-helper-agent-panel-0.2.14-darwin-arm64.vsix)
- [Windows x64용 0.2.14 VSIX](https://github.com/Hello-KU-tty/core/raw/refs/heads/main/releases/windows/kiro-native/builder-helper-agent-panel-0.2.14-win32-x64.vsix)
- [소개 영상·제품 소개](https://github.com/Hello-KU-tty/core#소개-영상)

Kiro IDE 최신판(1.2.56에서 확인)과 Kiro CLI 2.21.1 이상을 설치하고 둘 다 본인 Kiro 계정으로 로그인합니다. 모델 사용량은 그 계정에서 차감되며 별도 서비스 계정이나 API Key는 없습니다. 일반 VS Code 지원을 뜻하지 않습니다.

예선 설치물(Mac 0.1.4, Windows 0.0.18, Kiro 1.1.70 전용)과 개발자 ZIP은 [예선 다운로드 가이드](https://github.com/Hello-KU-tty/core/blob/main/docs/archive/preliminary/DOWNLOAD_GUIDE_PRELIMINARY.md)에 남아 있습니다.

## 사용자 흐름

배우고 싶은 것 입력 → 프로젝트 후보 → Learning Spec 확인과 **이걸로 시작** → Kiro 채팅의 새 세션에서 만들기 → 실제 선택은 번호와 이유로 답하기 → 궁금한 점은 Kiro 채팅에서 `/vibe-helper 질문`으로 묻기(읽기 전용) → 진행 탭의 다음 작업후보로 이어 가기 → 학습 기록에서 내 이유와 Evidence 확인.

만들기는 학습자의 Kiro 채팅(Builder)이 하고, 패널은 Core에 쌓인 진행·선택·Evidence를 보여 줍니다. 패널은 local Core와 인증된 HTTP/SSE로 연결하며, Core는 확장이 자동으로 준비·연결·복구합니다. 소스에 남은 DemoAdapter/MockAdapter는 개발·테스트용이고 제품의 기본 응답이 아닙니다.

실제 초보 사용자 사용 및 후속 인터뷰에서 프로젝트 선택, 개발 중 개념 설명과 회상에 관한 정성 피드백을 확인했습니다. 일반 Kiro 대비 정량 비교나 학습 효과의 인과 검증은 수행하지 않았습니다. [제품 검증 범위](https://github.com/Hello-KU-tty/core#사용자-검증)를 참고하세요.

## 개발·검사

Node.js **24.19.0**을 사용합니다. Core 개발과 설치물 빌드에는 pnpm **11.13.1**이 필요합니다.

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
```

0.2.14 설치물은 이 저장소 `main` `fc1ff89`(package version 0.0.19)로 빌드했고, typecheck와 64 files / 875 tests를 Mac과 Windows에서 통과했습니다. 자동 검사는 모델을 호출하지 않으며 실제 Kiro 설치·모델 완주를 대신하지 않습니다. 실제 Kiro 확인 기록은 [본선 인계 문서](https://github.com/Hello-KU-tty/core/blob/main/docs/FRONTEND_KIRO_NATIVE_HANDOFF.md)에 있습니다.

설치물은 Core checkout에서 운영체제별로 빌드합니다. 포장 Core의 네이티브 모듈이 그 운영체제용이라 Mac은 Mac에서, Windows는 Windows에서 빌드합니다.

```sh
# Core 폴더에서
pnpm install --frozen-lockfile
pnpm panel:pack:macos <이 저장소 경로>          # Apple Silicon Mac
pnpm panel:pack:kiro-windows <이 저장소 경로>   # Windows x64
```

자세한 절차는 [설치 가이드의 직접 빌드](https://github.com/Hello-KU-tty/core/blob/main/docs/DOWNLOAD_GUIDE.md#8-소스에서-직접-빌드-개발자용)를 따르세요.

## 버전 차이와 한계

- 0.2.14는 0.2.13에 연결 안정성 수정을 더했습니다. Project 터미널 준비가 실패해도 패널과 Kiro 채팅은 계속 쓸 수 있고, 시작 화면이 모르는 Core 오류 코드를 함께 보여 줍니다. 화면 구성은 0.2.13과 같습니다.
- 0.2.13부터 패널은 진행 · 학습 기록 두 탭이고 도우미 탭은 없습니다. 질문은 Kiro 채팅에서 `/vibe-helper`로 합니다.
- Apple Silicon Mac과 Windows x64만 지원합니다. Intel Mac, Windows ARM, Linux는 지원하지 않습니다.
- Evidence Analyst의 자연어 판정에는 오류가 있을 수 있습니다. 자동 테스트·실제 모델 실측·사용자 인터뷰는 서로 다른 근거입니다.
- 새 TypeScript 프로젝트만 지원하며 기존 프로젝트 import와 cloud sync는 범위 밖입니다.

## 구조

- `src/core/`: 화면 상태·Controller·사용자 흐름
- `src/webview/`: UI renderer(`flow/` 프로젝트 찾기·Spec, `agent/` 진행·학습 기록), 메시지 protocol, 접근성
- `src/extension.ts`, `src/agent-panel-view-provider.ts`: 확장과 Core host 연결
- `vendor/frontend-client/`: Core frontend SDK
- `portable/`: 예선 Windows runtime 자산과 라이선스. 본선 설치물에는 Core가 포장한 runtime이 들어갑니다.
- `test/`: unit·integration·property-based 회귀
