# 실제 브라우저 비교 · 2026-09-21

## 사용자 재지적 후 재수정

앞선 형태 수정은 거절됨. 현재 캡처는 재수정 결과이며 미승인이다. 작은 3단 모서리를 큰 2단으로 교체하고 LCD 띠를 어둡게, 버튼 그림자를 작게 조정했다. 새싹은 근사 그리드 대신 별도 지정 원본의 원래 해상도 윤곽으로 교체했다. [확대 비교](frame-details.png) 및 Storybook `Frame Details` 참고. 폰트 획·도트 굵기는 여전히 다르다.

아래 표의 수정 후 수치는 첫 번째 수정 기록이며 현재 형태 값은 HANDOFF의 재수정 기록이 우선한다.

Playwright Chromium, viewport 390×844, DPR 1. 캡처는 실제 Storybook RN Web 렌더링이다.

- [수정 전](home-before.png): 전역 24px 여백 때문에 패널 310px / 적립판 2열.
- [수정 후](home-after.png): 패널 350px / 3열×5행 / 셀 약 85.25×64.94px.
- [같은 폭 시안 비교](comparison.png): 시안의 화면 x168–858을 390px로 환산(390/690). 상단 y122부터 표시. 폰 외곽은 CSS로 제외했고 원본 파일은 변경하지 않았다.
- [공통 컴포넌트](components.png), [새싹·필터 미리보기](sprout-preview.png), [버튼](buttons.png), [입력](input.png), [다이얼로그](dialog.png), [필터](filters.png).
- [자동 검증 결과](verification.json): 실제 셀 좌표와 브라우저 오류 목록.

## 측정과 보정

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 홈 패널 폭 | 310px | 350px (시안 환산 약 351px) |
| 배치 | 2열, 8행 | 3열, 5행 |
| 셀 | 88×64px | 약 85×65px (시안 환산 약 85×65px) |
| LCD 테두리 | 4px / 4px / 2px, 안쪽 절삭 축소 | 3px / 6px / 3px, 같은 계단 폭 |
| 새싹 | 미측정 24×24 초안 | 원본 좌표에서 분석한 세로 비율, 32 단위 공통 SVG |
| 진행바 | 직각 8px | 시안의 둥근 끝, 10px |

폰트는 Neo둥근모 그대로다. 그림자·외곽선으로 글자를 굵게 만들지 않았다. 지정 색상도 그대로다. 시안의 질감·조명, 글자 형태·굵기와 일부 아이콘/프레임 세부 비율은 남은 차이이며 승인되지 않았다.

브라우저 검증: 스티커 붙이기, 목표 선택, 검토용 팝업 열기·닫기, 한글 입력, 필터 선택 통과. console error/pageerror 0. typecheck, 컴포넌트 테스트 6개, Storybook 빌드 통과.

## 공통 포커스 / 실제 배율 검수

- [상단 버튼 100%](controls-100-percent-dpr1.png), [DPR 2](controls-100-percent-dpr2.png)
- [공통 포커스: 100%와 확대, 크기별 재사용](focus-common-dpr1.png), [DPR 2](focus-common-dpr2.png)
- PixelFocusRing 및 retro.focus를 공통 기준으로 사용한다. 7번째 available 칸의 모서리를 15px/8px 굵기/2px 절삭으로 맞추고, 가는 선을 모서리에서 3px 떨어뜨렸다.
- 상단 컨트롤은 중첩 도형 대신 단일 stroke로 선 굵기를 정의한다. 하이라이트가 외곽을 침범하지 않도록 위치를 수정했다.
- 확대하지 않은 브라우저 캡처를 확인했다. DPR 1/2에서 오류 없음, 크기별 동일 corner path 재사용 검증, 홈 붙이기·선택·입력 동작 통과. typecheck, 테스트 6개, 빌드 통과.
- 시안의 폰트와 입체 표면 차이는 여전히 남아 있다.

## Border 재확인

사용자 재요청 후 두 문제를 수정했다.

1. 본체는 stroke, 그림자는 이전 fill 경로를 쓰던 불일치: 이제 같은 `surfaceOutline`과 stroke join을 공유한다.
2. `ReferenceCrop` 높이 67.826px로 다음 버튼들이 소수점 y에 놓임: 비교 영역의 가로·세로 크기를 정수 px로 정리했다. 원본 이미지 환산 배율은 유지한다.

[100% 캡처](border-100-percent.png), [실제 PNG 픽셀 측정](border-measurements.json). 다섯 컨트롤 모두 위/왼쪽 직선 3px. 그림자를 포함한 오른쪽은 4px, 아래는 5px다(그림자 오른쪽 1px/아래 2px). 본체의 border 자체는 3px이며, 바깥 실루엣의 네 면이 모두 같은 두께라는 뜻은 아니다.

## 타이틀·칸 테두리·톱니바퀴 추가 보정

최신 home-after.png와 comparison.png에는 타이틀 하단·칸 border·포커스 연결선 3px가 반영됐다. [톱니바퀴 100% 및 3배 비교](gear-100-percent.png): v6 원본의 톱니 방향·두께·중심 구멍을 공통 PixelIcon에 반영했다. 이전 근사 16×16 경로는 사용하지 않는다.

## 2026-09-22 작은 새싹 및 박스 안 여백

[100% 비교](sprout-spacing-100-percent.png). 공통 원본은 작은 미리보기 기준으로 교체. StickerGrid로 좌우6px 안쪽 여백/열 간격15px/행 간격10px를 통일. 새싹은 칸 하단2px 위치, 최대54px. 칸 숫자28px. 최신 전체 비교는 comparison.png와 home-after.png. 같은 path 재사용과 Playwright 상호작용, 타입·컴포넌트6개·빌드 검증 통과.
