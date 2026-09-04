# Builder & Helper Agent Panel (Vibe Helper - Code-centered surface)

Kiro IDE(VS Code 기반) 확장으로, 오른쪽에 Builder / Helper 두 개의 탭을 가진 Agent Panel을 추가한다. 사용자가 메시지를 입력하면 해당 탭의 에이전트로 라우팅되고, 에이전트의 응답이 스트리밍으로 되돌아온다. Builder 탭은 투명한 작업 스트림(도구 호출, 파일 변경, 명령, 테스트)을 보여주고, Helper 탭은 읽기 전용 채팅 동반자다. 더 큰 "Vibe Helper" 프로젝트의 일부다 (PROJECT_SPEC.md 참고).

## 요구사항 (Prerequisites)
- Node.js >= 18
- VS Code / Kiro (engines vscode ^1.90.0)

## 설치
- `npm install`

## 빌드
- `npm run build` — esbuild가 두 개의 번들을 생성: `dist/extension.js` (확장 호스트, CJS) + `dist/webview/main.js` (웹뷰 UI, 브라우저 IIFE)
- `npm run watch` — 파일 변경 시 자동 재번들 (개발용)

## 실행 (IDE에서 데모)
- 이 폴더를 VS Code/Kiro로 연다
- F5 (Run and Debug → "Run Extension") → Extension Development Host 창이 열림 (preLaunchTask가 먼저 build를 실행)
- 오른쪽 secondary side bar에서 "Agent Panel"을 연다 → Builder / Helper 탭
- 메시지를 입력하고 Send(또는 Enter) → 응답이 스트리밍됨
- 현재 기본 어댑터는 DemoAdapter(자동응답 mock)라서 "[DEMO]"로 시작하는 캔드 응답이 흘러나온다. Builder 탭에서는 작업 스트림 항목(명령/파일 변경)도 보이고 긴 항목은 접힌 채로 렌더된다. 실제 Kiro 에이전트 연결은 KiroAcpAdapter의 AcpTransport 구현(향후 spike)이 필요하며, `src/adapter/adapter-factory.ts` 한 곳만 교체하면 된다.

## 테스트
- `npm test` — Vitest로 전체 테스트 1회 실행 (컨트롤러/상태/어댑터/웹뷰/정규화 + property-based 테스트)
- `npm run typecheck` — 타입 검사
- `npx vitest` — watch 모드

## 프로젝트 구조 (간단히)
- `src/core/` — 순수 로직: 도메인 타입, TabState, PanelController, Clock, work-item 헬퍼
- `src/adapter/` — AgentAdapter 인터페이스, DemoAdapter(기본, 데모 자동응답), MockAdapter(테스트용 결정적 double), KiroAcpAdapter(실제 Kiro 경로, spike), adapter-factory(교체 지점)
- `src/webview/` — 메시지 프로토콜, 디스패처, 웹뷰 UI(뷰모델/렌더러/메시징)
- `src/extension.ts` + `src/agent-panel-view-provider.ts` — 확장 진입점 및 웹뷰 뷰 프로바이더
- `test/` — 유닛/통합/property-based 테스트
- `.kiro/specs/builder-helper-agent-panel/` — requirements.md / design.md / tasks.md 스펙 문서

## 현재 상태 / 알려진 제약
- UI 흐름과 스트리밍은 완전히 동작하지만 응답은 DemoAdapter의 mock이다 (실제 에이전트 아님).
- 실제 IDE의 ms 단위 지연 예산(활성화 3s 등)은 자동화로 검증하지 않았고, 실제 Kiro 에이전트 연결(AcpTransport)은 남은 작업이다.
