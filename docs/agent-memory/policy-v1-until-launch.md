---
name: policy-v1-until-launch
description: "Until official launch, every terms/privacy change edits version 1 in place — never create v2 folders or bump versions.json"
metadata:
  node_type: memory
  type: feedback
  originSessionId: c7a03afe-b368-4e9b-ac9f-b21c1670b1a2
  modified: 2026-10-14T07:31:18.035Z
---

Before the official store launch, all changes to the terms of service and privacy policy go into **1판** (`terms/v1`, `privacy/v1` in chagok-app-policy). Do not create `v2/` folders, add entries to `versions.json`, or bump the app's consent version.

**Why:** 2026-10-14 the user said "정식 출시전까지 바뀌는건 무조건 1판이야." Nobody has agreed to a published version yet, so new versions only add re-consent and history noise.

**How to apply:** Payment/ads clauses drafted as "제2판" were merged into 1판 (policy branch `docs/paid-v1`). After launch, follow the policy README's versioning steps and docs/LEGAL-REVIEW.md. Related: [[policy-site-pending]].
