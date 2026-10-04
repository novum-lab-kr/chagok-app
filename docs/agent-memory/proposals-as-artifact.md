---
name: proposals-as-artifact
description: "시안은 Storybook이 아니라 고르기·메모가 되는 아티팩트로 먼저 보여주고, 모두 확정된 뒤 Storybook 컴포넌트에 반영한다"
metadata:
  node_type: memory
  type: feedback
  originSessionId: f1beb082-7ae3-445f-bc07-355504b39bec
  modified: 2026-10-03T12:29:36.723Z
---

사용자가 시안을 보여달라고 하면 **Storybook 작업부터 하지 않고 아티팩트(HTML)로 먼저** 보여준다. 시안이 모두 확정되면 그때 Storybook 컴포넌트(`src/design-system/`, `stories/`)에 반영한다.

아티팩트 형식은 2026-10-01 약관 동의 시안(`terms-consent.html`)과 같게 한다:
- 안마다 한 띠: 배치 설명, 좋은 점/걸리는 점, **[이 안 고르기]** 버튼, **메모 칸**(안마다)
- 현재안이 있으면 비교용(고를 수 없음)으로 맨 위에 둔다
- 아래 고정 막대에 고른 안 요약 + **[메모까지 복사]**
- 고른 안·메모는 `db` capability로 저장해 Claude가 `ArtifactData`로 읽는다(안 되면 localStorage + 복사 안내)
- 시안 묶음이 여러 개면(예: 설정·아이콘·스플래시) 묶음마다 따로 고른다

**Why:** 2026-10-03 사용자 지시. 고르기 전에 Storybook 코드를 만들면 버릴 코드가 쌓이고, 아티팩트에서 바로 고르고 피드백을 남기는 쪽이 빨랐다.

**How to apply:** "시안 보여줘" → artifact-design·artifact-capabilities 스킬 로드 → 위 형식으로 발행 → 사용자가 고르고 메모를 남기면 `ArtifactData`로 읽는다 → 모두 확정된 뒤 Storybook에 반영. [[decision-options-format]]의 3안 제시와 함께 쓴다.
