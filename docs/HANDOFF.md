# 차곡차곡 디자인 시스템 인계

갱신: 2026-09-29 · 프로젝트: `/Users/eunjukim/Desktop/workspace/chagok-app`

구현 현황과 시각 기준의 단일 출처다. 제품 요구사항은 [PRD.md](PRD.md), 작업 방식은 [WORKING-AGREEMENT.md](WORKING-AGREEMENT.md)를 따른다. 이미 끝난 수정 이력은 git 기록과 [보관본](archive/HANDOFF-design-system-history-2026-09-23.md)에 있다.

## 0. 다음 세션 시작점 (2026-09-29)

**상태 (2026-09-30).** 2026-09-29 결정을 앱에 옮겼다: 목표 목록 / 판 상세 / 목표 설정 / 칸·종료일 늘리기 / 완성 흐름 / 5단계 튜토리얼, 스키마 v4. 구현 기록·미확인 항목·확인할 결정은 [DEV-DESIGN-home-structure.md](DEV-DESIGN-home-structure.md) 10절이 단일 출처다. **커밋하지 않았다** — 사용자가 화면 개발 뒤 한꺼번에 커밋하기로 했다(2026-09-30). 아래 0절의 순서는 완료 이력이다.

**코드를 쓰기 전에 이 순서로 한다.**

1. ~~개발 설계 문서를 먼저 만들고 사용자 확인을 받는다.~~ **완료 (2026-09-30):** [DEV-DESIGN-home-structure.md](DEV-DESIGN-home-structure.md). 결정은 그 문서 9절. 원래 담을 것:
   - 데이터: 달력판 종료일(선택), 완성 시각, 마지막으로 붙인 시각의 컬럼과 `PRAGMA user_version` 마이그레이션. PRD 5절 스키마 표는 "필요"까지만 적혀 있다.
   - 라우트: 목록 `/`와 판 상세의 경로, 목표 설정·새 목표·기록·종료일 늘리기와의 연결.
   - 규칙 함수: 진행률(%)·목록 정렬·완성 판정·readonly·기간 밖 날짜. 시안의 `progressOf`·`orderGoals`·`percentLabel`(`stories/HomeStructure.stories.tsx`)은 참고 구현이고 명세는 PRD다. 도메인 테스트부터 쓴다.
   - 작업 순서와 검증 계획.
2. ~~커밋하지 않은 앱 변경을 "앱 기반 작업" 커밋 하나로 묶는다.~~ **따로 묶지 않는다 (2026-09-30).** 화면이 많이 바뀌므로 화면 개발이 끝난 뒤 함께 커밋한다. 폐기하지 않고 이어서 고친다(9절 끝).
3. 그다음 설계 순서대로 구현한다. 화면은 확정된 Storybook(`Screens / Home structure · proposals`, `Components / Goal list & board`)과 대조한다.

**개발 중에 만나면 사용자에게 묻는 것 (아직 열린 결정).**

- ~~목표가 하나도 없을 때의 새 목록 화면 시안~~ → 2026-09-30 A안(안내 상자만, `Screens / Empty goal list`) 확정.
- 튜토리얼 다시 보기 진입 위치 (PRD 4.6, 4.9). **TODO로만 남긴다 (2026-09-30).**
- 목표 설정에서 칸 수·판 종류 변경은 미확정이다. 확정 Storybook의 목표 설정에 없으므로 넣지 않는다.

**이번 세션에서 정한 값 (다시 묻지 않는다).** 완성 모션은 [완성] 스티커 붙이기 모션 하나, 칸 수 상한 없음(2026-09-30, 칸 늘리기 기본값은 처음 칸 수만큼 더하기), 기간 없는 달력판은 미래 달 이동 가능, 삭제·떼기 확인은 기존 `basic` 다이얼로그, 판 조작은 한 번 = 붙이기·떼기 / 두 번·꾹 = 기록 열기.

## 1. 현재 유효한 사용자 지시

- **기존 디자인 시스템으로 시안의 화면과 컴포넌트를 구성한다.** 팔레트·폰트·공통 프레임·포커스를 새로 바꾸지 않는다.
- 스티커는 앞으로 계속 추가된다. 화면 코드와 분리해 자산·메타데이터를 관리한다 (5절).
- 판 종류 선택은 사용자가 첨부한 [상세 시안](design/retro-pocket-v1/review-set-02/references/board-type-detail-user.png)이 기존 03-new-goal 이미지보다 우선한다.
- 확대 화면만 보고 완료 처리하지 않는다. Playwright로 **100% 배율, DPR 1, 390px와 320px**에서 실제 렌더링을 확인한다.
- **Storybook 확정 (2026-09-29).** 현재 Storybook(`Screens / Home structure · proposals`, `Components / Goal list & board` 포함)을 앱 전환의 기준으로 확정했다. 새 기능이 생기면 그때 보완한다. 안 쓰게 된 부분과 버그는 별도로 고친다 (9절 끝).
- 테스트 통과, 토큰 버전, 문서의 baseline 표기만으로 사용자 승인을 추정하지 않는다. 폰트 차이도 해결됐다고 말하지 않는다.
- 디자인 시스템을 사용자 요청 없이 다시 해석하거나 바꾸지 않는다. 앱 연결 작업은 기존 컴포넌트에 선택(optional) prop을 더하는 방식으로 한다.

## 2. 시각 기준

| 범위 | 기준 |
| --- | --- |
| 공통 시스템 | [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [tokens.json](design/retro-pocket-v1/system/tokens.json), 실제 공통 컴포넌트 |
| 홈 목록·판 상세·완성 흐름·튜토리얼 (2026-09-29) | Storybook `Screens / Home structure · proposals` |
| 확인 다이얼로그·계정·설정 등 추가 화면 | [PRD 추가 화면 시안](design/retro-pocket-v1/prd-additions-review/README.md), [추가 공통 컴포넌트](design/retro-pocket-v1/component-additions-review/README.md) |
| 새싹 단일 원본 | [지정 작은 미리보기](design/retro-pocket-v1/revisions/v6/references/sprout-and-label-source.png), x540:591/y530:586 |
| 추가 스티커·기존 화면 구성 | [review-set-02/screens](design/retro-pocket-v1/review-set-02/screens) |
| 판 종류 카드 | [사용자 추가 첨부](design/retro-pocket-v1/review-set-02/references/board-type-detail-user.png) |

홈 구조는 2026-09-29 결정으로 바뀌었다. `review-set-02`의 01·02 홈(목표 칩 + 판)과 PRD 추가 시안의 "판 흐림 + 큰 중앙 도장 + 3개 선택지"는 더 이상 기준이 아니다. 시안의 폰 목업·OS 상태바·광원·질감은 구현 대상이 아니다. `review-set-01`, `screen-preview`의 거절된 실험이나 과거 종이 테마를 되살리지 않는다.

색상은 이미지 샘플링보다 아래 값이 우선한다.

| 용도 | 값 |
| --- | --- |
| 화면 | `#AFE1CB` |
| LCD | `#C7DE94` |
| Primary | `#FD855F` |
| Secondary / dialog / input | `#FEF1D1` |
| 텍스트 / 프레임 / 스티커 | `#06261C` |
| 버튼 텍스트 | `#01241C` |

Neo둥근모 1.601을 사용한다. 대체 폰트는 선택되지 않았다. 임의 교체, 가짜 bold/그림자로 획 덧칠, 한글 텍스트를 이미지로 대체하지 않는다.

## 3. 공통 시스템 수치

- RN + react-native-svg 공통 컴포넌트를 Storybook RN Web에서 같은 소스로 렌더한다.
- 패널 계단 단위 6px, 컨트롤 5px, 기본 셀 3px. 컨트롤/패널/칸 border와 패널 제목 구분선은 3px. 과거의 2px 수치는 폐기됐다.
- `PixelFocusRing`: cornerSize 15, cornerThickness 8, cornerCut 2, lineWidth 3, lineInset 2, gap 3.
- 톱니바퀴는 v6 원본 윤곽을 추출한 `assets/gear.ts`를 쓴다. 임의 16×16 아이콘으로 되돌리지 않는다.
- `StickerGrid`: 3열, 좌우 안쪽 6px, 열 간격 15px, 행 간격 10px. 390px에서 칸 약 84×64px.
- 붙인 새싹 최대 54px, 아래 여백 2px. 기본 스티커 미리보기 32px. 칸 숫자 28px/32px.
- 전체/친구/모양/사물 필터는 개별 테두리 없이 선택 채움과 세로 구분선만 쓴다.
- 확인 다이얼로그는 `PixelDialog variant="basic"`을 화면 가운데에 둔다(앱은 `PixelDialogModal`). 위험 동작도 같은 primary 버튼을 쓰며 별도 destructive 스타일은 만들지 않는다 (2026-09-29 확정).

## 4. 파일 구조

| 파일 | 역할 |
| --- | --- |
| `src/design-system/components.tsx` | 텍스트, 프레임, 버튼, 입력, 패널, 진행률, 목표 칩, 필터, 슬롯, 그리드, focus, 다이얼로그, 아이콘, 배지(`badgeTones`), 탭, 완성 스티커 |
| `src/design-system/tokens.ts`, `geometry.ts` | 문서 토큰 연결, 픽셀 외곽 경로 |
| `src/design-system/composition-controls.tsx` | 화면 헤더, 판/칸 수 선택, 스티커 요약/선택, 기록, 설정 행, 짧은 알림, 로딩, `RetroScreen`, 앱·목록 헤더, 목록 카드, 진행 줄, 빈 목록, 선택 버튼 줄, 종료일·기간, 삭제 영역 |
| `src/design-system/gestures.ts` | 한 번 누르기와 두 번 누르기 구분(250ms). 공개 export 아님 |
| `src/design-system/calendar.tsx` | 월 이동, 날짜 그리드. 선택 prop `isDateEnabled`·`canGoPrev`·`canGoNext` (기간 밖 날짜) |
| `src/design-system/tutorial.tsx` | 타깃 실측 스포트라이트. 선택 prop `content`로 1–3단계 밖 문구를 넘긴다 |
| `src/design-system/screen-compositions.tsx` | 판 칸(`GoalStickerCell`), 기록 화면(`RecordScreen`), 예시 데이터(`exampleGoals`) |
| `src/design-system/board-screens.tsx` | 목록·판 상세·목표 설정·완성한 판 설정·새 목표·칸/종료일 늘리기 화면 조합 (앱과 Storybook 공용) |
| `src/design-system/first-run-tutorial.tsx` | 5단계 첫 실행 튜토리얼과 예시 화면 |
| `src/domain/board.ts`, `dates.ts` | 판 규칙(진행률·정렬·완성·붙이기/떼기·기간)과 로컬 날짜 |
| `src/design-system/sticker-glyphs.tsx` | 스티커 라이브러리 어댑터, 액션 아이콘 |
| `src/app-data/` | 도메인↔화면 어댑터·문구(`pocketAdapter.ts`), 판 읽기(`boardData.ts`), 확인·알림 다이얼로그(`useDialog.ts`), 연속 탭 방지(`singleFlight.ts`), 사진 보관(`recordPhotos.ts`), 뒤로가기(`goBack.ts`, `useUnsavedBack.ts`) |
| `stories/HomeStructure.stories.tsx` | 홈 구조 30개 장면. `board-screens.tsx`로 그린다 |
| `stories/EmptyGoalList.stories.tsx` | 목표 없음 화면 (2026-09-30 A안) |
| `stories/GoalListBoard.stories.tsx` | 위 시안에서 추출한 공통 컴포넌트 개별 상태 17개 |

## 5. 스티커 라이브러리

`src/stickers/pocket/`가 새 스티커의 관리 위치다.

- `catalog.ts`: ID·이름·분류·asset의 단일 등록 위치. 현재 sprout/cat/star/flower/book/shoe 6종. `PocketStickerId` 타입은 여기서 파생된다.
- `assets/<id>.ts`: 투명 단색 SVG path, 56×56 viewBox, revision, 원본 파일/crop, 추가 5종은 원본 SHA256.
- `StickerArtwork.tsx`: DS에 의존하지 않고 크기/색상을 받아 렌더한다.
- 새싹 path는 `src/stickers/pocket/assets/sprout.ts` 한 곳에 있다. 꽃 스티커는 헤더의 꽃 아이콘과 별도 자산이다. 밝은 내부는 투명이다.

[추가·수정 절차](../src/stickers/pocket/README.md), [자산 검수](design/retro-pocket-v1/review-set-02/asset-review/README.md).

아래 명령은 **추가 5종 파일을 덮어쓴다.** 자산 재생성 때만 실행한다. 새싹은 바꾸지 않는다.

```sh
node scripts/trace-pocket-stickers.mjs /private/tmp/chagok-preview-tools/node_modules/playwright/index.mjs
```

`src/stickers/catalog.ts`(22종)는 참조하는 코드가 없지만 스키마 v2 마이그레이션(6종에 없는 id → `sprout`)의 매핑 근거다. 지우지 않는다.

## 6. 실행과 검증

```sh
npm run storybook        # http://localhost:6006
npm test                 # 도메인·저장소
npm run test:components
npm run typecheck
npm run lint
npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check
```

- 실행 중인 Storybook·Metro를 임의로 종료하지 않는다. 포트와 프로세스는 세션마다 다시 확인한다.
- 시안 캡처는 `scripts/review-*.mjs` 패턴을 따른다(Storybook `index.json`에서 스토리를 찾아 390·320px로 찍고 렌더 오류·가로 넘침을 기록). 제목에 `·`가 든 스토리 ID는 URL 인코딩해서 연다.
- Docs 페이지의 반복 렌더링은 3초 동안의 DOM 변경 수(MutationObserver)와 스크롤 위치로 확인한다. 정상이면 0, 0이다.
- Playwright 모듈은 프로젝트 의존성이 아니라 임시 설치다. 경로를 확인한다. `MachPortRendezvousServer Permission denied`가 나오면 우회하지 말고 Chromium 실행 권한을 요청한다.
- Android 확인은 이 저장소 전용 에뮬레이터 `Chagok_Pixel_7`(포트 5556)을 쓴다. `Pixel_7`은 다른 프로젝트와 함께 쓴다.

## 7. 되풀이될 함정

- **`RetroScreen`을 감싸는 래퍼에는 높이가 필요하다.** `flex:1` + `ScrollView`라 부모 높이가 없으면 0으로 접혀 화면이 통째로 빈다.
- **`useSafeAreaInsets()`를 쓰지 않는다.** Provider 없이 렌더하는 테스트·Storybook에서 예외를 던진다. `SafeAreaInsetsContext`를 직접 읽고 없으면 0으로 둔다.
- **훅은 조건부 return보다 위에 둔다.** `app/index.tsx`는 `loading` / 튜토리얼 / 목표 없음 분기가 있어, 아래에 둔 훅은 새로 설치한 기기에서만 터진다. `npm run lint`가 잡는다.
- **PanResponder를 `useRef(...).current`로 만들지 않는다.** 첫 렌더 값을 가둔다. `useMemo`로 만든다.
- **네이티브 한 줄 입력에 `lineHeight`를 주지 않는다.** iOS가 글자를 아래로 붙인다. `PixelInput`이 처리한다.
- **뒤로가기는 `goBackOrHome`을 쓴다.** 딥링크로 연 화면은 스택이 없어 `router.back()`이 동작하지 않는다.
- **폰트 연결은 콜드 스타트로 확인한다.** Fast Refresh로 반영하면 이전 글자 폭이 재사용되어 끝 글자가 잘려 보인다.
- Storybook·vitest는 `react-native-safe-area-context`를 `src/index.tsx`로 별칭한다. 기본 진입점을 타면 RN Flow 문법에서 죽는다. SVG를 `optimizeDeps.exclude`로 돌리지 않는다.
- Storybook 래퍼 div는 높이가 auto라 `flex:1` 사슬이 끊긴다. 스크롤을 잴 때는 조상에 높이를 준다.
- 달력 키는 로컬 시간으로 만든다. `toISOString()`은 자정 근처에서 하루를 민다.
- **Storybook Docs는 한 파일의 스토리를 한 페이지에 모두 그린다.** 포커스를 옮기거나 위치를 재는 스토리는 Docs에서 반복 렌더링·스크롤 끌림을 일으킨다. 튜토리얼 스토리는 Docs에서 `autoFocus={false}`로 그리고, 측정 결과를 담는 context 값은 `useMemo`로 고정하고 같은 좌표면 상태를 바꾸지 않는다.
- RN Web의 `AccessibilityInfo.addEventListener`는 구독 객체를 돌려주지 않는다. 정리할 때 `?.remove?.()`로 부른다.
- 붙인 칸의 한 번 누르기(떼기)는 두 번 누르기와 가르느라 250ms 늦게 실행된다(`gestures.ts`). 의도된 동작이다.

## 8. 현재 앱 상태

> **2026-09-30 갱신.** 아래 표는 전환 전 상태다. 지금 라우트: `/` 목록(탭·`+`·첫 실행 튜토리얼), `/goal/new`, `/goal/[id]` 판 상세, `/goal/[id]/settings`, `/goal/[id]/extend`, `/sticker/[id]`(완성한 판이면 읽기 전용), `/settings`. 스키마 v4. 화면 조합은 `src/design-system/board-screens.tsx`·`first-run-tutorial.tsx`, 규칙은 `src/domain/board.ts`·`dates.ts`, 판 읽기는 `src/app-data/boardData.ts`, 확인·실패 알림은 `src/app-data/useDialog.ts`(OS `Alert` 없음). 자세한 것은 DEV-DESIGN 10절.

Expo Router 5개 라우트가 SQLite 저장소(스키마 v3)에 연결돼 있다. **앱은 아직 기존 홈 구조(목표 칩 + 판)다.**

| 라우트 | 동작 |
| --- | --- |
| `index` | 목표 칩 전환, 적립판 어느 빈칸에든 붙이기, 달력판 오늘 칸 붙이기와 오늘 포커스, 기록 표식(B안), 스와이프·버튼 월 이동, 첫 실행 튜토리얼(3단계), 목표 없음 화면 |
| `goal/new` | 이름·판 종류·칸 수(1–100, 새 결정으로 상한 제거 예정)·기본 스티커로 생성 후 그 목표를 선택해 홈으로 |
| `goal/[id]` | 이름과 기본 스티커만 변경. 저장 안 한 입력 확인 |
| `sticker/[id]` | 사진(앱 문서 디렉터리에 복사, 유실 안내), 메모, 기록 있을 때만 떼기 확인 |
| `settings` | 로컬 기록 상태만 표시 |

폰트(`RetroFontProvider`)와 화면 배경은 앱 루트에 연결돼 있다. 저장 안 한 입력 확인은 `PixelDialogModal`이다. iPhone 16 Pro 시뮬레이터와 `Chagok_Pixel_7`에서 주요 화면 진입을 확인했다. **실기기 검수는 하지 않았다.**

## 9. 남은 구현 과제

**2026-09-29 결정을 앱에 옮기는 일 (시안: `Screens / Home structure · proposals`, PRD 4.1–4.7)**

- 홈을 목표 목록(탭 `내 목표 / 완성한 판`, 헤더 `+`)과 판 상세 라우트로 나눈다.
- 스키마에 종료일, 완성 시각, 마지막으로 붙인 시각을 더한다. 진행률(%)·정렬·완성 판정·readonly 규칙을 도메인 테스트부터 쓴다.
- 판 조작을 바꾼다. 지금은 붙인 칸을 한 번 누르면 기록이 열린다 → 한 번 = 떼기, 두 번·꾹 = 기록 열기, 스크린리더용 '기록 열기' 접근성 동작.
- 완성 확인 → [완성] 스티커 붙이기 모션 → `닫기 / 계속하기` 흐름, 칸 늘리기(상한 없음, 기본은 처음 칸 수만큼)와 종료일 늘리기, 완성한 판 readonly(기록 읽기 전용, 설정은 삭제만).
- 기간 없는 달력판은 미래 달로 이동할 수 있다. 붙이기는 여전히 오늘 칸만.
- 목표 설정 구성(이름 → 기본 스티커 → 기간 → 저장 → [삭제하기])과 **목표 삭제**. `deleteGoal`은 있지만 앱 화면과 기기 사진 파일 정리가 없다.
- 첫 실행 튜토리얼을 5단계로 바꾼다.

**그 밖에**

- OS `Alert` 7곳(저장·붙이기·떼기·생성 실패 5곳, 사진 권한 안내 1곳, 기록 있는 스티커 떼기 확인 1곳)이 남아 있다. 확정된 `basic` 다이얼로그로 바꾼다.
- 배치 시 시각 피드백이 없다. 지금은 햅틱뿐이다 (PRD 4.5·6.1). 로딩 점(`PixelLoadingDots`)은 모션 감소 설정을 따른다.
- `useGoals`가 모든 목표의 스티커를 전부 읽는다. PRD 6.3은 표시 중인 범위로 한정하라고 한다.
- 계정·백업·복원, 앱 설정 항목, 약관·라이선스 화면은 시안만 있고 연결 전이다 (PRD 4.8·4.9·8.1). **로그인 버튼은 디자인 시스템의 예외**다. Apple·Google 브랜드 가이드라인 때문에 픽셀 프레임으로 다시 그리지 않고 주변 레이아웃만 맞춘다.
- 튜토리얼 스포트라이트는 스크롤 중 좌표가 어긋난다. `onLayout`에서만 다시 잰다. 첫 실행은 스크롤 0이라 문제없지만 다시 보기 진입을 만들 때 고쳐야 한다.

**커밋하지 않은 앱 변경 (2026-09-28–29)은 폐기하지 않고 이어서 고친다.** 루트 폰트·배경, 사진 문서 폴더 보존과 유실 안내(`recordPhotos.ts`, `expo-file-system`), 사진 권한 문구(`app.json`), `goBackOrHome`·`useUnsavedBack`, `canPlaceAtSlot`, 기록 표식 대상 수정, 기록 화면 저장·떼기 확인, 앱 설정 자리 화면은 새 구조에서도 그대로 쓴다. 교체 대상은 `app/index.tsx`의 칩 + 판 구조(약 60줄)뿐이고, 붙이기·기록 표식 로직은 판 상세 라우트로 옮긴다. 선택 목표를 URL 파라미터(`selectedGoalId`)로 유지하던 방식은 상세 라우트로 대체한다. 실기기 확인은 하지 않았다. 따로 커밋하지 않고 화면 개발이 끝난 뒤 함께 커밋한다(2026-09-30 사용자 결정).

**나중에 따로 고칠 것 (Storybook 확정 뒤 정리)**

- 모든 Docs 페이지에 `props.pointerEvents is deprecated` 경고가 나온다. 동작에는 영향이 없다.
- ~~새 구조에서 안 쓰게 되는 것~~ **2026-09-30 정리함.** 옛 컴포넌트(`GoalChip`, `HomeScreen`, `GoalEditorScreen`, 3단계 `TutorialScreen`, `GoalStickerLink`/`DefaultStickerLink`)와 스토리(`Review Set 02`, `PRD additions · proposals`, `Goal chip`, `Setting row`, `Reference Match`), 그 검수 스크립트를 지웠다. 계정·복원·앱 설정 시안은 `docs/design/retro-pocket-v1/prd-additions-review/` 캡처와 git 기록에 남아 있다. 구현할 때 스토리로 다시 만든다.

**PRD 미확정인데 코드에 값이 들어간 것:** 튜토리얼 상태를 DB(사용자 범위)에 저장, `app.json`의 `userInterfaceStyle: "automatic"`. (칸 수 상한은 2026-09-30 제거로 확정.)

## 10. 다음 작업 시 주의

- 코드 작성 전 [Expo 57 문서](https://docs.expo.dev/versions/v57.0.0/)를 읽는다. 현재 Expo ~57.0.24 / RN 0.86.3 / React·React DOM 19.2.3, React DOM override 유지.
- 의존성을 추가할 때는 `package.json`·`package-lock.json`을 백업하고, 설치 후 `npm ls react-dom --all`이 `19.2.3` 하나인지 확인한다.
- 작업 브랜치는 `chore/lint-and-app-hardening`이고 원격에 올라가 있다(PR 없음). 디자인 시스템(`8456e72`)과 문서(`2df26ba`)는 커밋했고, **커밋하지 않은 것은 앱 코드 변경뿐이다**(9절). 일괄 reset/복원/삭제 금지. 관련 없는 `.omc`, 앱 설정, 기존 계획을 건드리지 않는다.
- Storybook은 확정했지만 원본 이미지 시안(`review-set-02` 등)과 픽셀 단위로 일치한다는 뜻은 아니다. 폰트·프레임 치수·focus·단색 asset에서 오는 차이는 남아 있다.
