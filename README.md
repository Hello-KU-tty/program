# Hello Vibe — Kiro 확장 프론트엔드

배우고 싶은 기술에서 프로젝트를 발견하고, 실제 서비스를 만들며 이해의 근거를 남기는 Kiro IDE 확장입니다. 이 저장소는 Discovery · Learning Spec · Builder · Helper · History 화면을 담당합니다. 상태·권한·Evidence 계산과 SQLite 저장은 [Core 저장소](https://github.com/Hello-KU-tty/core)의 책임입니다.

## 설치와 시연

사용자는 소스를 빌드하지 않고 운영체제별 VSIX를 설치할 수 있습니다.

- [다운로드·설치 가이드](https://github.com/Hello-KU-tty/core/blob/main/docs/DOWNLOAD_GUIDE.md)
- [Mac Apple Silicon VSIX](https://github.com/Hello-KU-tty/core/blob/main/releases/macos/0.1.0/builder-helper-agent-panel-0.1.0-darwin-arm64.vsix?raw=true)
- [Windows x64 VSIX](https://github.com/Hello-KU-tty/core/blob/main/releases/windows/0.0.18/builder-helper-agent-panel-0.0.18-win32-x64-74208fffa5c0.vsix?raw=true)
- [시연 영상·제품 소개](https://github.com/Hello-KU-tty/core#시연-영상)
- [백엔드·프론트 개발자 ZIP](https://github.com/Hello-KU-tty/core/raw/refs/heads/main/releases/frontend-handoff/20260927/frontend-handoff-20260927.zip)

검증 기준은 Kiro IDE **1.1.70** / 내장 Agent **1.1.158**입니다. 본인 Kiro 계정으로 로그인하며 모델 사용량은 해당 계정에서 소비됩니다. 별도 서비스 API Key는 필요하지 않습니다. 일반 VS Code 지원을 뜻하지 않습니다.

## 현재 연결과 사용자 흐름

학습 목표 → 프로젝트 후보 → Spec 확정·Builder 시작 → 실제 Decision 선택·계속 실행 → Helper 대화 → 결과 실행·History로 이어집니다. Helper는 읽기 전용이며 사용자 Evidence와 Agent 출력을 구분합니다.

현재 확장은 `portable` host를 통해 실제 local Core와 인증된 HTTP/SSE로 연결하고 Kiro 내장 Agent를 사용합니다. Core는 자동으로 준비·연결됩니다. 소스에 남은 DemoAdapter/MockAdapter는 개발·테스트용이며 제품의 기본 응답이 mock이라는 과거 README 설명은 더 이상 맞지 않습니다.

실제 초보 사용자 사용 및 후속 인터뷰에서 프로젝트 선택, 개발 중 개념 설명과 회상에 관한 정성 피드백을 확인했습니다. 일반 Kiro 대비 정량 비교나 학습 효과의 인과 검증은 수행하지 않았습니다. [제품 검증 범위](https://github.com/Hello-KU-tty/core#사용자-검증)를 참고하세요.

## 개발·검사

Node.js **24.19.0**을 사용합니다. Core 개발에는 pnpm **11.13.1**이 필요합니다.

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
```

현재 공개 기능 소스 기준은 `a61d408`(package version 0.0.18), 포함된 Windows runtime은 kit `2026.09.30.1`입니다. 자동 검사 57 files / 807 tests와 typecheck/build를 통과했습니다. 자동 검사는 모델을 호출하지 않으며 실제 Kiro 설치·모델 완주를 대신하지 않습니다.

Apple Silicon에서는 최신 Core checkout의 `pnpm panel:pack:macos <이 저장소 경로>`로 Mac portable을 별도로 만듭니다. 이 저장소에 포함된 `portable/`은 Windows x64용이므로 Mac에서 그대로 실행하지 않습니다. [Mac 빌드 안내](https://github.com/Hello-KU-tty/core/blob/main/docs/MAC_VSIX.md#재현)를 따르세요.

## 버전 차이와 한계

- 0.0.18은 완료 뒤 Builder·Helper 대화 유지, 기존 Node·pnpm 재사용과 중복 Helper 요약 제거를 포함합니다. Mac 설치물은 같은 기능 소스를 사용하되 Mac 패키지 버전 0.1.1로 별도 빌드합니다.
- 정확한 Kiro/Agent source pin에 의존합니다. 다른 버전·Intel Mac·Linux 및 장기 안정성은 별도 검증이 필요합니다.
- Evidence Analyst의 자연어 판정에는 오류가 있을 수 있습니다. 자동 테스트·실제 모델 실측·사용자 인터뷰는 서로 다른 근거입니다.
- 새 TypeScript 프로젝트만 지원하며 기존 프로젝트 import와 cloud sync는 범위 밖입니다.

## 구조

- `src/core/`: 화면 상태·Controller·사용자 흐름
- `src/webview/`: UI renderer, 메시지 protocol, 접근성·stream 표시
- `src/extension.ts`, `src/agent-panel-view-provider.ts`: 확장과 Core host 연결
- `vendor/frontend-client/`: Core frontend SDK
- `portable/`: 검증된 Windows runtime 자산 및 라이선스
- `test/`: unit·integration·property-based 회귀
