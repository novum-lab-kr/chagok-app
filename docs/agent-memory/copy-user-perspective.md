---
name: copy-user-perspective
description: "UI copy must speak from the user's side (\"로그인이 필요해요\"), not the system's (\"로그인이 풀렸어요\", \"변경 3개를 올리지 못했어요\")"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 5dd7cf3f-6fdb-4108-b942-b3b0e30383f8
  modified: 2026-10-01T01:17:08.493Z
---

화면 문구는 사용자 관점으로 쓴다. 시스템 상태·내부 개념(세션 만료, 변경·outbox, 서버가 거부, 동기화)을 그대로 말하지 않고, 사용자가 할 일과 결과를 말한다.
예: "로그인이 풀렸어요" → "로그인이 필요해요", "변경 3개를 올리지 못했어요" → "아직 백업하지 못한 기록이 있어요".

**Why:** 2026-10-01 계정 화면 시안 3차 검토에서 사용자가 "개발 관점에서의 메세지보다 사용자 관점에서의 메세지를 쓸 수 있도록 해"라고 지적했다.

**How to apply:** 새 화면·다이얼로그·알림 문구를 쓸 때와 시안을 낼 때 먼저 이 기준으로 다듬는다. 기존 문구에 같은 말투가 보이면 함께 고칠지 제안한다. [[language-korean]]
