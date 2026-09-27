# 프론트 실테스트 가이드 (Builder / Helper Live Runs)

> 대상 브랜치: feat/windows-live-backend · VSIX 0.0.2
> 마지막 구현 커밋: 1dd230f
> 상태: builder-helper-live-runs 스펙 51개 태스크 전부 완료, typecheck 통과, 49 files / 537 tests green, build 양쪽 번들 생성

---

## 0. 먼저 알아야 할 제약 (매우 중요)

이 데모 PC는 Kiro 1.0.293 / Agent 1.0.532 입니다. 백엔드 지원 pin은 Kiro 1.1.70 / Agent 1.1.158 이라 서로 다릅니다.

- 이 PC에서는 네이티브 라이브 실행이 fail-closed 됩니다. 실제 모델을 호출하는 Builder/Helper run, 결과 실행, 워크스페이스 열기는 동작하지 않습니다.
- 이 PC에서 확인 가능한 것: UI 렌더링, 화면 전환, History 조회, fail-closed 안내 문구, 결정론적 테스트(vitest).
- 실제 라이브 흐름은 지원 pin 환경(Kiro 1.1.70 / Agent 1.1.158)에서만 검증됩니다.

정리: 아래 테스트는 (A) 이 데모 PC에서 지금 할 수 있는 것과 (B) 지원 pin 환경에서만 할 수 있는 것으로 나눕니다.

---

## 1. 준비

### 1.1 코드/테스트 레벨 검증 (A)
```powershell
Set-Location c:\Users\USER\Programming_Workspace\2026AWS\program
npm run typecheck
npm test
npm run build
```
- 통과 시 라이브 연결 로직과 정합성 속성(완료 판정, 결정 후 자동재개 없음, 중지와 취소 구분, 복원 replay, 답변 그대로 전달, 근거 정직 표시, 비밀값 유출 없음)이 결정론적으로 검증된 것입니다.

### 1.2 VSIX 설치 (A, 라이브는 fail-closed)
- Extensions에서 Builder & Helper Agent Panel 버전이 0.0.2 인지 확인.
- 액티비티 바에 Agent Panel 아이콘 표시 확인.

---

## 2. 이 데모 PC에서 지금 확인할 수 있는 것 (A)

### 2.1 패널 열기 & 초기 렌더
1. 액티비티 바에서 Agent Panel 아이콘 클릭.
2. Builder / Helper 탭이 그려지고 좌측 여백/레이아웃이 겹침 없이 정상인지 확인.
3. Core 준비 상태 배너 확인. 이 PC는 pin 불일치라 native 미준비 안내가 뜨는 것이 정상.

### 2.2 Discovery to Spec 흐름 (기존 배포 흐름, 그대로 유지)
1. Learning Goal 입력 후 후보 조회 화면 진입.
2. 후보 선택 후 Spec 화면까지 이동.
3. 후보 조회 제목이 Builder/Helper UI와 겹치지 않는지 확인.

### 2.3 History 조회
1. History 새로고침 또는 확장 재시작.
2. 저장된 Project 요약이 조회만으로 표시되는지 확인(Agent 미호출).

### 2.4 fail-closed 동작 (pin 불일치 시 기대 동작)
1. Builder 탭에서 실행 시도.
2. 실제 run이 시작되지 않고 미연결/미지원 안내가 뜨는지 확인(크래시나 무한대기 없이).
3. error code와 host.worker.getStatus() 값을 기록해 두면 백엔드 회신에 유용.

---

## 3. 지원 pin 환경에서만 가능한 라이브 테스트 (B)

> Kiro 1.1.70 / Agent 1.1.158 로 맞춘 PC에서 Workspace Trust 승인 후 진행.

### 3.1 Builder run
1. Builder 탭에서 메시지 입력 후 시작.
2. 전사(TEXT)와 도구 실행 행(TOOL, 상대경로만 표시)이 스트리밍으로 갱신되는지 확인.
3. run이 SUCCEEDED로 끝나도 바로 완료로 표시되지 않고, Core 판정(classifyBuilderTurn) 결과에 따라 완료/결정필요/실패/턴종료로 구분되는지 확인.

### 3.2 창 전환 후 복원
1. Builder 시작 후 생성 workspace로 창이 전환/reload되는 상황 재현.
2. 다시 붙었을 때 진행 중이던 run에 재구독되고 sequence 0부터 전체 replay 되어 화면이 복원되는지 확인.

### 3.3 Decision (결정)
1. Builder 진행 중 Decision 요구가 뜨면 옵션/추천/직접입력 중 선택해 해결.
2. 해결해도 Builder가 자동 재개되지 않는지 확인. 사용자가 명시적으로 이어서 실행을 눌러야 재개.
3. 직접입력 rationale이 가공 없이 그대로 전달되는지 확인.

### 3.4 중지 vs 창 닫기
1. run 진행 중 중지: cancelRun 호출 후 CANCELLED, CLEANUP, worker가 AGENT_ENDED 보고 시 IDLE 로 가는지 확인.
2. 패널을 잠깐 숨겼다 다시 열기: 이건 취소가 아님. SSE 구독만 끊겼다 재개되고 CANCELLED로 바뀌지 않는지 확인.

### 3.5 native 추가 질문
1. run 중 네이티브 추가 질문이 뜨면 답변 제출.
2. 사용자가 고른 선택이 그대로 전달되는지(자동 응답 없음) 확인. stale/불일치 질문은 제출 거부되고 안내되는지 확인.

### 3.6 생성 workspace 열기
1. 워크스페이스 열기 실행.
2. 절대경로는 host의 openFolder로만 전달되고 웹뷰 메시지/화면에는 절대경로가 노출되지 않는지 확인.

### 3.7 결과 실행
1. 결과가 RUNNING이면 실행: 검증된 loopback URL(127.0.0.1 포트)을 openExternal로 여는지 확인. RUNNING 아니면 RESULT_NOT_RUNNING 안내.

### 3.8 Evidence (근거)
1. Evidence 읽기.
2. OBSERVED_ONLY / 이해 0건은 이해했다로 표시하지 않는지 확인. 분석됐지만 인정 0건이면 사유(noEvidenceReason)를 그대로 표기하는지 확인.

### 3.9 Final Upgrade
1. Final Upgrade 후보 조회 후 준비.
2. 취소/실패한 Helper 기록이 후보에서 제외되는지 확인(eligibleFinalUpgradeTraces 사전 필터). 거부 코드(FINAL_UPGRADE_*)면 목록 새로고침 후 안내.

---

## 4. 문제 생겼을 때 백엔드에 보낼 것
- 재현 절차와 화면.
- error code (예: NATIVE_*, CORE_*, RESULT_*, FINAL_UPGRADE_*).
- host.worker.getStatus() 값.
- 사용한 Kiro / Agent 버전.

---

## 5. 요약 체크리스트

이 데모 PC (A):
- [ ] typecheck / test / build 통과
- [ ] VSIX 0.0.2 설치 및 패널 렌더 확인
- [ ] Discovery to Spec 화면 겹침 없음
- [ ] History 조회
- [ ] Builder 실행 시 fail-closed 안내 정상

지원 pin 환경 (B):
- [ ] Builder run 스트리밍, 완료는 Core 판정으로만
- [ ] 창 전환 후 sequence 0부터 복원
- [ ] Decision 해결해도 자동 재개 없음
- [ ] 중지와 창 닫기 구분
- [ ] native 답변 그대로 전달
- [ ] 절대경로 openFolder로만
- [ ] 결과 실행 loopback URL
- [ ] Evidence 정직 표시
- [ ] Final Upgrade 후보 필터링
