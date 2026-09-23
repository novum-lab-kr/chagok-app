# Review Set 02 — 현재 디자인 시스템으로 구성

## 2026-09-23 전체 시안 재검수

8개 원본 이미지를 열고 Playwright DPR 1의 390/320px 렌더링과 재비교했다. 판 종류 카드는 이후 사용자가 첨부한 상세 이미지(요일·빈 날짜 칸·첫 칸 체크)를 우선한다.

| 화면 | 확인 및 수정 |
| --- | --- |
| 적립판 홈 | 목표 전환·진행률·설정·기본 스티커·15칸·7번째 공통 focus 확인. 기존 DS 유지. |
| 달력판 홈 | 배경 버튼이 붙어 있던 월 이동을 화살표 액션으로 변경, 월 제목 크기 보정. 요일·날짜·기록 및 선택 위치 확인. |
| 새 목표 | 제목 중앙 정렬. 선택 카드의 주황색 외곽, 요일/빈 칸, 적립판 첫 칸 체크 반영. 칸 수/스티커 변경/생성 확인. |
| 목표 설정 | 제목 중앙 정렬. 목표 이름 아래 구분선과 스티커 미리보기 아래 구분선 복원. 미리보기 중앙 배치. |
| 기록 | 제목 중앙 정렬. 사진을 원본 사진 영역 비율 586:494로 변경하고 샘플 크롭 조정. 메모를 제목·구분선이 있는 기존 LCD 패널로 구성. |
| 튜토리얼 1 | 추가 버튼 강조, 안내문·다음/건너뛰기 확인. |
| 튜토리얼 2 | 수정된 설정 화면의 실제 타깃을 측정해 안내창·스포트라이트 위치 확인. |
| 튜토리얼 3 | 공간이 있으면 안내창을 선택 칸 위에 우선 배치하도록 수정. 7번째 칸을 가리지 않음. |

현 디자인 시스템의 폰트·색상·공통 프레임·포커스·스티커 자산은 유지했다. 시안의 폰트 획, 광원/질감, 기기 외곽, 시스템 상태바는 구현 대상이 아니다. 글자 크기와 패널 치수는 현 DS 기반이라 픽셀 단위 일치를 의미하지 않는다. 빈 새 목표와 저장된 예시 목표는 상태 차이이며, 320px 사진 액션 줄바꿈은 좁은 화면 대응이다.

최종 typecheck 및 11개 컴포넌트 테스트 통과. Playwright 8개 화면×2개 폭과 전체 데모 흐름 통과, browser error/가로 overflow 없음. 캡처 파일은 이번 결과로 갱신했다. 캡처 중 Vite 재로딩을 막기 위해 검수 스크립트는 이미지 파일을 모든 탐색 종료 후 저장한다.

2026-09-22. `../screens`의 8개 이미지는 필요한 화면 구조와 동작을 파악하는 참고로 사용했다. 기존 색상, Neo둥근모, 프레임, 공통 포커스, 새싹 및 톱니바퀴 자산은 변경하지 않았다. 시안과 픽셀 단위 일치를 목표로 한 작업이 아니다.

## 화면 확인

Storybook 실행: 프로젝트 루트에서 `npm run storybook`.

| 화면 | Storybook | 390px 캡처 | 320px 캡처 |
| --- | --- | --- | --- |
| 적립판 홈 | [열기](http://localhost:6006/?path=/story/screens-review-set-02--tally-home) | [이미지](01-home-tally.png) | [이미지](01-home-tally-320.png) |
| 달력판 홈 | [열기](http://localhost:6006/?path=/story/screens-review-set-02--calendar-home) | [이미지](02-home-calendar.png) | [이미지](02-home-calendar-320.png) |
| 새 목표 | [열기](http://localhost:6006/?path=/story/screens-review-set-02--new-goal) | [이미지](03-new-goal.png) | [이미지](03-new-goal-320.png) |
| 목표 설정 | [열기](http://localhost:6006/?path=/story/screens-review-set-02--goal-settings) | [이미지](04-goal-settings.png) | [이미지](04-goal-settings-320.png) |
| 기록 | [열기](http://localhost:6006/?path=/story/screens-review-set-02--sticker-record) | [이미지](05-sticker-record.png) | [이미지](05-sticker-record-320.png) |
| 목표 튜토리얼 | [열기](http://localhost:6006/?path=/story/screens-review-set-02--tutorial-goal) | [이미지](06-tutorial-goal.png) | [이미지](06-tutorial-goal-320.png) |
| 스티커 튜토리얼 | [열기](http://localhost:6006/?path=/story/screens-review-set-02--tutorial-sticker) | [이미지](07-tutorial-sticker.png) | [이미지](07-tutorial-sticker-320.png) |
| 붙이기 튜토리얼 | [열기](http://localhost:6006/?path=/story/screens-review-set-02--tutorial-place) | [이미지](08-tutorial-place.png) | [이미지](08-tutorial-place-320.png) |

## 재사용 컴포넌트

`src/design-system/index.ts`에서 내보낸다. 개별 예시는 Storybook의 [Screen Building Blocks](http://localhost:6006/?path=/story/components-screen-building-blocks--goal-options)에 있다.

- `composition-controls.tsx`: 화면 헤더, 판 종류/칸 수 선택, 스티커 요약/필터/선택, 기록 요약, 사진 첨부, 메모 입력, 텍스트 액션, 화면 컨테이너.
- `calendar.tsx`: 월 이동 및 연도 전환, 요일/날짜 그리드, 날짜별 스티커와 선택 표시.
- `sticker-glyphs.tsx`: 기존 새싹/꽃을 재사용하고 고양이·별·책·운동화와 화면 액션 아이콘을 추가. 기존 저장용 스티커 카탈로그와는 분리한 표시용 카탈로그다.
- `tutorial.tsx`: 타깃 실측 위치를 기준으로 하는 스포트라이트, 단계 안내, 다음/건너뛰기. 웹 키보드 포커스 유지 및 Escape 지원.
- `screen-compositions.tsx`: 위 요소와 기존 공통 컴포넌트를 조합한 홈, 목표 작성/설정, 기록 및 튜토리얼 화면.

## 검증

- `npm run typecheck`: 통과.
- `npm run test:components`: 2개 파일, 11개 테스트 통과.
- `npm run build-storybook`: 통과. RN Web 번들 지시문 및 번들 크기 관련 경고는 남는다.
- `node scripts/check-screen-compositions.mjs /private/tmp/chagok-preview-tools/node_modules/playwright/index.mjs`: 통과. 다른 환경에서는 설치된 Playwright 모듈 경로를 인수로 전달한다.
- 390px/320px, DPR 1, 확대하지 않은 상태로 총 16개 캡처. 목표 생성/사용자 지정 칸 수, 스티커 변경 저장, 월/날짜 선택, 붙이기/떼기, 사진 업로드/삭제, 메모 저장, 튜토리얼 전환/종료 및 키보드 동작 확인.
- 가로 overflow 없음. console error/pageerror 없음. [검사 결과](verification.json), [브라우저 오류 목록](render-errors.json).
- 기존 `components.tsx`, `tokens.ts`, `geometry.ts`, `system/tokens.json`, `assets/sprout.ts`, `assets/gear.ts`의 작업 전후 SHA256 동일 확인.

## 구현 범위

공통 React Native 컴포넌트와 Storybook 메모리 상태 데모다. 목표/기록은 새로고침하면 초기화된다. 사진/메모는 실제 도메인별 저장 모델이 아닌 데모 상태이며 기본 사진은 시안의 사진 영역을 잘라 표시한다. 웹 데모에서는 파일 업로드를 지원한다. Expo 앱 라우팅, DB 저장, 네이티브 사진 선택기 연결 및 iOS/Android 실기기 검수는 포함하지 않는다.
