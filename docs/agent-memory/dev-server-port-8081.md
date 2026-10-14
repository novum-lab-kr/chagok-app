---
name: dev-server-port-8081
description: "User-facing Metro is always port 8081; before swapping what it serves, say what's on it and ask first"
metadata:
  node_type: memory
  type: feedback
  originSessionId: c7a03afe-b368-4e9b-ac9f-b21c1670b1a2
  modified: 2026-10-13T14:39:27.291Z
---

The dev server the user checks with (phone and simulator) stays on **port 8081**. To show a worktree's changes, stop the 8081 Metro and restart it from that worktree on 8081. Do not open extra ports (8084, 8085, …) for the user to check.

Before swapping: tell the user what 8081 currently serves (which folder/branch/commit) and what it will switch to, and **wait for their OK**. Then restart and say what is now on 8081.

**Why:** 2026-10-13 the user got confused by addresses changing per task ("포트를 왜 계속 다른걸로 띄우는거야?"); they want one fixed address on the phone.

**How to apply:** Applies to Metro the user tests on. Storybook ports for my own captures are separate. Still never touch other sessions' servers without asking. Related: [[worktree-before-writing]], [[worktree-env-local]].
