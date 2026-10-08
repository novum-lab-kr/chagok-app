---
name: worktree-before-writing
description: "Before writing any file (even uncommitted 시안 drafts), make a new worktree + branch; never work in the main checkout — other sessions use it"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1d05cee6-6163-4003-bb57-9d42ae74ee75
  modified: 2026-10-06T11:14:10.473Z
---

파일을 하나라도 쓰기 전에 `git worktree add ../chagok-wt-<작업> -b <브랜치> main`으로 작업 공간을 따로 만들고 거기서 작업한다. 시안 원본·임시 스토리처럼 커밋하지 않을 파일도 같다. main 작업 트리(`chagok-app`)에는 쓰지 않는다.

**Why:** 2026-10-06 컬러 스티커 시안을 main 작업 트리에서 만들다가, 같은 시간 위젯 세션이 main에서 작업 중이던 README를 건드렸고 옮기는 중 한 번 비우기까지 했다(위젯 작업은 이미 다른 브랜치에 커밋돼 있어 피해는 없었음). 사용자: "왜 새로 작업공간을 안만들고 main 에서 계속한거야? 다른 세션에서 위젯 작업 하고있던거에 문제 생기면 어쩔꺼야".

**How to apply:** 작업을 시작할 때 `git status`와 `git worktree list`로 다른 세션의 흔적을 먼저 본다. 파일을 고치는 스크립트는 읽기와 쓰기를 따로 연다 — `open(p,'w').write(...open(p).read()...)`는 읽기 전에 파일을 비운다. [[no-commit-before-approval]]
