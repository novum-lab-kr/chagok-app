---
name: plain-words-not-jargon
description: "Say \"시험 구현\" not \"spike\"; always mark whether work is a throwaway test or the real implementation"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2c124421-697f-4339-ab1e-fb622e28756c
  modified: 2026-10-06T11:08:41.897Z
---

개발 용어(spike, prebuild, CNG 같은 것)를 설명 없이 쓰지 않는다. "spike"는 **"시험 구현"**이라고 말한다.
시험 구현 중인 작업은 보고할 때마다 "시험 구현이라 실제 기록 저장·테스트는 없음"처럼 본 구현과의 차이를 짚는다.

**Why:** 2026-10-06 위젯 작업에서 사용자가 시험 구현 결과를 본 구현으로 여기고 있다가 "이게 본 구현이 아니었다고?", "spike가 뭘 의미하는거야 대체?"라고 물었다. 결정·확인이 길게 이어지는 동안 시험 구현이라는 구분이 묻혔다.

**How to apply:** 시험 구현을 시작·보고·커밋할 때 한 줄로 "시험 구현(확인용, 출시 코드 아님)"을 밝힌다. 용어가 처음 나올 때는 쉬운 말로 풀어 쓴다. [[language-korean]]
