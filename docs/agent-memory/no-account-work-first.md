---
name: no-account-work-first
description: "Apple Developer approved 2026-10-05 (welcome mail + App Store Connect visible); Google OAuth not ready — don't push account-gated work until user says ready"
metadata:
  node_type: memory
  type: feedback
  originSessionId: ab33689a-ada1-4e52-b28c-a2e94381ecd6
  modified: 2026-10-05T01:19:34.048Z
---

계정(Apple Developer Program, Google Cloud OAuth)이 준비되기 전에는 그 계정이 걸린 단계(Apple 로그인·TestFlight·스토어 제출, Google 로그인)를 다음 할 일로 제안하지 않는다. 지금 할 수 있는 개발(개발 빌드·시뮬레이터, Storybook, 개발용 이메일 로그인)을 먼저 고른다.

**현황 (2026-10-05):** Apple Developer Program 승인 완료(2026-10-05 환영 메일 수신, 계정 페이지에 App Store Connect·인증서/ID/프로파일 메뉴 노출). 등록 유형 **개인**, 계정 소유자는 사용자 남편(minchang sung — 판매자명·정산 계좌도 남편 명의). 사용자 Mac은 본인 Apple ID로 로그인돼 있음, Team ID `AQUDD2QFNC`, 갱신일 2027-10-06. 조직 등록은 법인만 가능(개인사업자는 개인으로 등록) — 판매자명을 브랜드로 바꾸려면 법인 설립이 먼저. Google Cloud OAuth는 아직 준비됐다는 말 없음. Expo 조직 `novum-lab`(EAS `@novum-lab/chagok`) 2026-10-05 생성. 개발 빌드(시뮬레이터·에뮬레이터)는 2026-10-05 전환함 — Apple 계정 없이 됨. 승인 확인 후에는 Apple 쪽 작업(개발 빌드·EAS·TestFlight·Apple 로그인)을 다음 할 일로 제안해도 된다.

**Why:** 2026-10-01 "커밋하면 바로 개발 빌드 전환"이라고 제안했다가 사용자가 짜증 냄 — "계정 아직 준비 안됐다니깐, 준비 전에 할 수 있는 개발들을 먼저 한다니까". HANDOFF도 순서를 "준비물이 갖춰지면 개발 빌드 전환 → 서버 → 로그인"으로 적어 둠.

**How to apply:** 다음 작업을 고를 때 계정 준비 상태를 먼저 확인한다. 준비된 계정에 걸린 일만 제안하고, 나머지는 "준비물 뒤"로 묶는다.
