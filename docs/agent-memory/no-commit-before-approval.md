---
name: no-commit-before-approval
description: Do not commit specs/plans/code until the user has reviewed and approved them
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0f07339a-94c2-4372-aeaa-17ac8036a01b
  modified: 2026-10-01T22:37:01.389Z
---

계획·설계 문서·코드는 사용자가 확인하고 승인하기 전까지 커밋하지 않는다. 파일로 저장만 하고 검토를 요청한다.

**Why:** 2026-09-30 세션에서 설계 문서와 구현 계획을 쓰자마자 커밋하자 사용자가 "앞으로 계획이 확인되고 승인되기 전까지 커밋은 하지마"라고 지시했다. 스킬(brainstorming, writing-plans)이 "작성 후 커밋"을 요구해도 이 지시가 우선한다.

**How to apply:** 문서·계획은 작성 → 검토 요청 → 승인 후 커밋. **코드는 계획이 승인돼도 바로 커밋하지 않는다** — 사용자가 실제로 돌려 보고(Expo Go·Storybook 등) 확인한 뒤에 커밋한다. 테스트·타입 체크 통과는 확인으로 치지 않는다. 계획·스킬이 "태스크마다 커밋"이라고 해도 작업 트리에 둔 채 확인을 요청한다. 승인 없이 커밋하고 싶어지면 먼저 묻는다.

**2026-10-02 보강:** 계정 화면 연결 10개 태스크를 계획 승인만 믿고 태스크마다 커밋했다가 "실제로 안돌려봤는데 커밋을 왜했어?"라는 지적을 받았다.
