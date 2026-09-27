# 백엔드 요청: 지원 pin 실측 결과와 발견한 문제 (2026-09-28)

> 보낸 사람: 프론트
> 기준 브랜치: feat/windows-live-backend (1dd230f 이후 로컬 변경, VSIX 0.0.3)
> 환경: Windows x64, Kiro 1.1.70 (commit `8ce18704…5102`) / Agent 1.1.158 (entry SHA-256 `cf6a5124…1b87`) / API 1.131.0
> 시간은 KST, 괄호 안은 로그의 UTC

---

## 0. 요약

- **pin 블로커 해소:** 프론트 PC를 지원 pin(1.1.70 / 1.1.158)으로 업그레이드했습니다. 설치본의 commit·Agent entry hash·API가 exact 조합과 일치하고, host의 `attestWindowsKiroInstallation`도 통과합니다. `BACKEND_NEXT_STEPS_20260927.md` §1은 "(b) 프론트 업그레이드"로 닫아 주세요.
- **실측 결과:** Core 연결, Workspace Trust, History, worker 준비(`WORKER_READY`)까지 성공했습니다. Discovery preview run은 **3회 모두 실패**했습니다. 원인은 각각 달랐습니다.

| 시각 | 결과 | 원인 | 책임 |
| --- | --- | --- | --- |
| 01:03, 01:18 | `WORKSPACE_SWITCH_UNCONFIRMED` 뒤 job claim 없음 | 폴더 신뢰 전 시점으로 추정 | 문서화 요청 (§B4) |
| 08:12 | `NATIVE_PACKAGED_ROLE_CONFIG_INVALID` | 확장 업데이트 뒤 이전 설치본의 Core 재사용 | **백엔드 결함 (§B2)** |
| 08:18 | `NATIVE_RPC_REJECTED` | Kiro 월간 한도 초과(`ServiceQuotaExceededException`) | 계정 한도 + **오류 코드 은폐 (§B1)** |

- **현재 상태:** 이 PC의 Kiro 계정 크레딧이 1000/1000이고 overage가 꺼져 있어, 2026-10-01 리셋 전까지 이 PC에서는 모델 호출 실측이 불가합니다(§4).

---

## B1. `NATIVE_RPC_REJECTED`가 실제 사유(한도 초과)를 숨김 — 요청

**현상.** 08:17:59 `AGENT_RUNNING_DISCOVERY` 후 1.4초 만에 `AGENT_FAILED_NATIVE_RPC_REJECTED`로 끝났습니다. Core run 기록도 `DISCOVERY PREVIEW FAILED err=NATIVE_RPC_REJECTED`입니다.

**실제 원인 (Kiro 로그 `window1/exthost/...`, 08:18:00.695 / 23:18:00.695Z).**
```
[KRS] HTTP 400 body={"__type":"com.amazon.kiro.runtimeservice#ServiceQuotaExceededException",
 "message":"You have reached the limit.","reason":"MONTHLY_REQUEST_COUNT"}
```
같은 세션의 `GetUsageLimits`는 `currentUsage 1000 / usageLimit 1000`, `overageStatus DISABLED`였습니다.

**원인 코드.** `examples/kiro-native-host/native-client.cjs:495`에서 JSON-RPC `message.error`가 오면 code와 message를 버리고 일괄 `NATIVE_RPC_REJECTED`로 바꿉니다.

**요청.**
1. `session/prompt` 등의 RPC error를 분류해 안정된 코드로 노출해 주세요. 예: `NATIVE_QUOTA_EXCEEDED`, `NATIVE_AUTH_REQUIRED`, `NATIVE_MODEL_UNAVAILABLE`. 원문 message는 필요 없고, 분류된 코드만이면 충분합니다.
2. 이 코드들을 run `errorCode`와 worker status에 그대로 실어 주세요. 프론트는 코드별로 "이번 달 사용량을 모두 썼어요(리셋일)" 같은 안내를 띄우겠습니다.
3. 가능하다면 run 시작 전 사전 검사를 검토해 주세요. 한도 초과 상태에서도 창 전환(§B4)과 역할 파일 생성이 먼저 일어납니다.

---

## B2. 확장 업데이트 후 이전 설치본의 Core를 재사용해 역할 설정 검증 실패 — 결함

**재현.**
1. VSIX 0.0.2 설치 상태에서 Core가 기동됐습니다. PID 36564, 01:00:35, cmd `...\vibe-helper.builder-helper-agent-panel-0.0.2\portable\bin\core.mjs managed`.
2. 같은 Kiro 세션에서 0.0.3을 설치하고 Reload했습니다. `portable/`은 동일하며 `owner.json packageHash`도 같습니다.
3. 0.0.3 host가 새 Core를 띄우지 않고 기존 Core(0.0.2 경로)에 lease로 붙었습니다.
4. Discovery 시작 시 Core가 쓴 `workspaces\.kiro\agents\vibe-native-discovery-d1c57c9d.json`의 bridge 인자가 `...-0.0.2\portable\bin\bridge.mjs`였습니다.
5. 0.0.3 worker의 `materializePackagedRoleRuntime`(`examples/kiro-panel/src/native-runtime.cjs:184`)은 자기 `...-0.0.3\...\bridge.mjs`와 비교하므로 `NATIVE_PACKAGED_ROLE_CONFIG_INVALID`로 막았습니다(08:12:47).
6. Kiro를 완전히 종료했다가 다시 켜자 0.0.3 경로로 새 Core(PID 29432)가 떴고, 이 오류는 사라졌습니다.

**영향.** 사용자가 확장을 업데이트하면 Kiro를 완전히 재시작할 때까지 모든 native run이 실패합니다. Kiro가 이전 버전 폴더를 정리하면, 아직 살아 있는 Core는 존재하지 않는 bridge 경로를 쓰게 됩니다.

**요청 (둘 중 하나).**
- (a) host의 설치 경로가 Core의 기동 경로와 다르면, packageHash가 같아도 기존 Core를 재사용하지 말고 교체해 주세요.
- (b) 역할 설정의 bridge/runtime 경로를 Core 기동 경로가 아니라 **job을 claim한 host가 보고한 경로** 기준으로 쓰게 해 주세요.

---

## B3. 실패한 Discovery 프로젝트가 History에 "탐색 중"으로만 남음 — 요청

**현상.** `listProjects` 결과 4개 프로젝트가 모두 `DISCOVERY` 상태입니다. Core가 재시작된 뒤에는 3개 프로젝트의 run 기록(`listRuns`)이 비어 있어, 실패 사실과 사유를 알 수 없습니다. 사용자에게는 "탐색 중 · 이어서 보기"로만 보입니다.

**요청.**
1. 실패한 PREVIEW를 **같은 프로젝트에서 재시도하는 공식 경로**를 정해 주세요. `startRun({ kind: "DISCOVERY", phase: "PREVIEW" })` 허용 여부나 별도 command 등입니다. BRIEF §7 "실패 구간만 재시도" 요구와 연결됩니다.
2. History row나 restore snapshot에 마지막 preview 실패 여부와 errorCode를 durable로 제공할 수 있는지 알려 주세요. run은 Core 재시작 시 사라집니다.
3. 불필요한 실패 프로젝트를 사용자가 정리(abandon)하는 경로가 있는지 알려 주세요.

---

## B4. Discovery 시작 시 창 폴더 전환 동작 문서화 — 요청

**관찰.** Discovery 시작 시 사용자 창이 `vibe-test`에서 `...\core-data\workspaces`로 전환됐습니다. Extension host가 재시작되고 worker가 다시 붙은 뒤 job을 claim했습니다(08:17:43 → 08:17:56). 실패 후에도 창은 `core-data\workspaces`에 남아 원래 폴더로 돌아가지 않습니다. 01:03과 01:18 시도는 `WORKSPACE_SWITCH_UNCONFIRMED` 뒤 claim 없이 멈췄습니다. 당시 `core-data\workspaces`가 신뢰되지 않았던 것으로 추정합니다.

**요청.**
1. 이 전환이 의도된 동작인지, 그리고 `core-data\workspaces`에 **별도 Workspace Trust가 필요한지** 문서에 명시해 주세요.
2. 전환 대상이 신뢰되지 않은 경우에는 `WORKSPACE_SWITCH_UNCONFIRMED` 대신 `NATIVE_WORKSPACE_TRUST_REQUIRED`처럼 원인이 드러나는 코드를 주면 좋겠습니다.
3. 실패나 종료 후 원래 폴더로 돌아가는 경로가 있는지 알려 주세요.

---

## B5. 관찰 (확인만 요청)

- 세션이 끝난 뒤(08:18:00)에도 `bridge.mjs` 프로세스(PID 27484, 부모 = 현재 extension host)가 20분 넘게 살아 있었습니다. 정상 동작인지 확인해 주세요.
- 실패한 run의 역할 파일 4개(`vibe-native-discovery-*.json`)가 `workspaces\.kiro\agents`에 남아 있습니다. Kiro가 매 세션마다 4개를 모두 profile로 등록합니다(`Registered workspace profile` ×4). 정리 정책이 있는지 알려 주세요.
- Kiro 계정이 Enterprise profile로 `autonomousAgentsDisabled: true (admin_disabled)`입니다. native 경로에 영향이 없는지 확인해 주세요.

---

## 4. 실측 재개 조건과 질문

- 이 PC의 Kiro 크레딧은 2026-10-01 리셋입니다. 그 전에 실측하려면 overage(유료)를 켜거나 다른 계정을 써야 합니다.
- **질문:** 남은 §3.1~3.9 실측(Builder/Helper/Decision/Evidence/Final Upgrade)을 백엔드 PC에서 VSIX 0.0.3으로 먼저 진행해 줄 수 있나요? 가능하면 VSIX를 전달하겠습니다.

## 5. 프론트가 처리할 것 (참고)

- Discovery/Spec 실패 notice가 화면에 표시되지 않는 문제를 수정합니다. 현재 flow view가 `snapshot.notice`를 렌더하지 않고, `flowNotice`는 no-op입니다. B1의 분류 코드가 오면 코드별 안내 문구를 붙입니다.
- 라이브 Builder/Helper 화면의 스타일 누락과 표시 조건(0.0.3에서 수정)을 반영했습니다.
