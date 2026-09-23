# 전체 화면 시안 · 검토본 02

[8장 한눈에 보기](index.html)

홈 원본을 그대로 보관하고, 나머지 7장은 기존 이미지에 내장 image_gen 편집을 적용했다. 앱 및 HTML UI 구현이 아닌 이미지 시안이다. 사용자 확정 전 검토본이다.

- [적립판 홈](screens/01-home-tally.png)
- [달력판 홈](screens/02-home-calendar.png)
- [새 목표](screens/03-new-goal.png)
- [목표 설정](screens/04-goal-settings.png)
- [기록](screens/05-sticker-record.png)
- [튜토리얼 · 목표 만들기](screens/06-tutorial-goal.png)
- [튜토리얼 · 스티커 고르기](screens/07-tutorial-sticker.png)
- [튜토리얼 · 붙이기](screens/08-tutorial-place.png)

## 기준과 확인

- 적립판 홈은 v6와 SHA-256이 같은 원본 파일이다.
- 상단 이름+진행 막대, 계단형 프레임, 입체 표면, 기본 스티커 문구, 일반 화면의 안내 문구 제거를 유지했다.
- 설정 필터는 외곽 테두리 없이 선택 배경과 세로 구분선만 사용한다. 장식용 4×3 점은 없다.
- 생성된 7장 모두 이미지를 직접 확인했다. 첫 설정 출력에서 빠졌던 새싹 눈·입은 수정본으로 교체했다. 달력 날짜 1–30 및 시작 요일을 확인했다.
- 이미지 편집은 픽셀 단위 복사가 아니다. 특히 설정과 홈 사이 표면 색조·새싹 윤곽의 미세한 차이는 남아 있으므로 동일 자산 구현 완료로 주장하지 않는다.
- 입력 validation, 많은 목표, 긴 텍스트는 이번 검토 범위에서 제외했다.

[편집 프롬프트](prompts/) · [파일 출처와 해시](sources.json)
