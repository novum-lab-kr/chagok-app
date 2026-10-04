---
name: decision-options-format
description: "When a product definition is ambiguous, give the user exactly 3 options (with a recommendation) and let them choose"
metadata:
  node_type: memory
  type: feedback
  originSessionId: d53c3c3c-770f-49eb-b316-540abf78452d
  modified: 2026-09-28T07:14:03.786Z
---

When defining product requirements (PRD) and something is ambiguous, present exactly 3 options per point, mark one as recommended, and let the user pick. Don't fill the gap with an arbitrary value.

**Why:** User said "애매한 부분 있으면 나한테 관련해서 3가지 선택지를 주면 그 안에서 선택해줄게" (2026-09-28). Matches docs/WORKING-AGREEMENT.md §1 (decide first, then write; never fill 미확정 with arbitrary values).

**How to apply:** Batch the questions (AskUserQuestion, ≤4 per round), then write the PRD. The user sometimes answers with a new direction outside the options (e.g. "self-host with Docker instead of Supabase/Firebase") — then offer 3 new options within that direction.
