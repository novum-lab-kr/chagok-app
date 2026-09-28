# 차곡차곡 디자인 시스템 인계

갱신: 2026-09-23 · 프로젝트: `/Users/eunjukim/Desktop/workspace/chagok-app`

## 1. 현재 유효한 사용자 지시

- **기존 디자인 시스템으로 시안의 화면과 컴포넌트를 구성한다.** `review-set-02/screens`를 그대로 따라 팔레트·폰트·공통 프레임·포커스를 새로 바꾸지 않는다.
- 스티커는 앞으로 계속 추가된다. 화면 코드와 분리해 자산·메타데이터를 관리하며, 현재 6종은 시안과 비슷한 윤곽으로 맞춘다.
- 판 종류 선택은 이후 사용자가 첨부한 [상세 시안](design/retro-pocket-v1/review-set-02/references/board-type-detail-user.png)이 기존 03-new-goal 이미지보다 우선한다. 달력 요일/빈 칸, 적립판 첫 칸 체크, 주황색 외곽 선택 표시가 기준이다.
- 확대 화면만 보고 완료 처리하지 않는다. Playwright로 **100% 배율, DPR 1, 390px와 320px**에서 실제 렌더링을 확인한다. 선 굵기·계단 모서리·여백·아이콘 방향·작은 도트를 특히 확인한다.
- 현재 상태는 시각 검토 중이다. 테스트 통과, 토큰 버전 `1.2.0`, 문서의 baseline 표기를 사용자 디자인 승인으로 해석하지 않는다. 폰트 차이도 해결됐다고 말하지 않는다.
- 이번 요청은 인계 문서 작성이다. 추가 디자인 변경이나 앱 통합을 자동으로 시작하라는 요청이 아니다.

## 2. 시각 기준

| 범위 | 기준 |
| --- | --- |
| 현재 공통 시스템 | [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [tokens.json](design/retro-pocket-v1/system/tokens.json), 실제 공통 컴포넌트 |
| 기존 홈 프레임/형태 검토 | [v6 홈](design/retro-pocket-v1/revisions/v6/screens/01-home.png) |
| 새싹 단일 원본 | [지정 작은 미리보기](design/retro-pocket-v1/revisions/v6/references/sprout-and-label-source.png), x540:591/y530:586 |
| 추가 화면 구성 및 추가 스티커 | [review-set-02/screens](design/retro-pocket-v1/review-set-02/screens) 8개 이미지 |
| 판 종류 카드 | [사용자 추가 첨부](design/retro-pocket-v1/review-set-02/references/board-type-detail-user.png) |

시안의 폰 목업·OS 상태바·광원·질감은 구현 대상이 아니다. 이미지 전체 해상도와 CSS px를 그대로 비교하지 말고 앱 콘텐츠 영역과 논리 폭을 맞춘다. `review-set-01`, `screen-preview`의 거절된 실험이나 과거 종이 테마를 현재 기준으로 되살리지 않는다.

색상은 이미지 샘플링보다 아래 기존 값이 우선한다.

| 용도 | 값 |
| --- | --- |
| 화면 | `#AFE1CB` |
| LCD | `#C7DE94` |
| Primary | `#FD855F` |
| Secondary / dialog / input | `#FEF1D1` |
| 텍스트 / 프레임 / 스티커 | `#06261C` |
| 버튼 텍스트 | `#01241C` |

Neo둥근모 1.601을 사용한다. 대체 폰트는 선택되지 않았다. 임의 교체, 가짜 bold/그림자로 획 덧칠, 한글 텍스트를 이미지로 대체하지 않는다.

## 3. 지금까지 반영한 공통 시스템 작업

- RN + react-native-svg 공통 컴포넌트를 Storybook RN Web에서 동일 소스로 렌더한다.
- 버튼 본체/그림자의 외곽 경로를 통일하고 miter stroke와 하이라이트 범위를 보정했다. 패널 계단 단위 6px, 컨트롤 5px, 기본 셀 3px.
- 컨트롤/패널/칸 border 및 패널 제목 구분선은 현재 3px. 패널 내부 경로와 띠는 `PixelFrame` 및 토큰이 기준이다. 과거 인계의 2px 칸/선 수치는 폐기됐다.
- `PixelFocusRing`을 공통화했다. cornerSize 15, cornerThickness 8, cornerCut 2, lineWidth 3, lineInset 2, gap 3. available 슬롯 및 스티커 선택에서 재사용한다. 기존 프레임을 가리지 않도록 했다.
- 톱니바퀴는 v6 원본 윤곽을 추출한 `assets/gear.ts`를 사용한다. 임의 16×16 아이콘으로 되돌리지 않는다.
- `StickerGrid`: 3열, 좌우 안쪽 6px, 열 간격 15px, 행 간격 10px. 칸 좌표를 정수 px에 맞춘다. 390px 홈에서 약 84×64px.
- 붙인 새싹 최대 54px, 아래쪽 여백 2px. 기본 스티커 링크 미리보기 32px, gap 4px. 진행행→그리드 간격 2px. 칸 숫자는 28px/32px.
- 전체/친구/모양/사물 필터는 개별 테두리 없이 선택 채움과 세로 구분선을 유지한다. 기능 없는 점 장식이나 하단 상시 스티커 팔레트는 추가하지 않는다.

## 4. 추가 컴포넌트와 8개 화면

| 파일 | 역할 |
| --- | --- |
| `src/design-system/components.tsx` | 텍스트, 프레임, 버튼, 입력, 패널, 진행률, 목표 칩, 필터, 새싹, 슬롯, 그리드, 공통 focus, 다이얼로그, 아이콘 |
| `src/design-system/tokens.ts`, `geometry.ts` | 문서 토큰 연결 및 픽셀 외곽 경로 |
| `src/design-system/composition-controls.tsx` | 화면 헤더, 판/칸 수 선택, 스티커 요약/선택, 기록 요약, 사진/메모, 텍스트 액션 |
| `src/design-system/calendar.tsx` | 월/연도 이동, 날짜 그리드, 날짜별 기록/선택 |
| `src/design-system/tutorial.tsx` | 타깃 실측 스포트라이트, 설명창, 다음/건너뛰기, 웹 키보드 처리 |
| `src/design-system/screen-compositions.tsx` | 적립/달력 홈, 목표 작성/설정, 기록, 튜토리얼 조합 |
| `src/design-system/sticker-glyphs.tsx` | 스티커 라이브러리에 DS 색상을 전달하는 어댑터 및 액션 아이콘 |
| `src/design-system/index.ts` | 공통 export |
| `stories/ScreenCompositions.stories.tsx` | 메모리 상태로 연결된 8개 화면 데모 |
| `stories/CompositionControls.stories.tsx` | 추가 공통 구성 요소 개별 예시 |

최신 전체 비교 후 다음을 보정했다.

- 새 목표/목표 설정/기록 헤더 제목 중앙 정렬.
- 판 카드: 제목 중앙, 선택 시 LCD 표면과 주황색 외곽, 달력 요일+7×4 빈 칸, 적립판 3×3 정사각형+첫 칸 체크.
- 목표 설정: 목표 이름 아래 구분선, 스티커 미리보기 아래 구분선, 미리보기 중앙 배치.
- 달력: 배경 버튼 대신 화살표 월 이동, 월 제목 크기 보정.
- 기록: 사진 비율 586:494 및 샘플 크롭, 제목/구분선이 있는 LCD 메모 패널.
- 튜토리얼: 타깃 실측 좌표, 공통 focus 중복 제거, 2/3단계는 위쪽 공간이 있으면 안내창을 타깃 위에 배치. 웹 Tab 포커스 순환, Escape 건너뛰기, 종료 시 포커스 복원.

[화면별 검수표 및 캡처](design/retro-pocket-v1/review-set-02/implementation-review/README.md)를 확인한다. 최초 생성 화면의 빈 입력/비활성 버튼은 예시의 ‘책 읽기’ 입력 완료 상태와 의도적으로 다르다. 320px 사진 액션 줄바꿈은 작은 화면 대응이다.

## 5. 스티커 라이브러리 — 향후 확장 기준

`src/stickers/pocket/`가 새 스티커의 관리 위치다.

- `catalog.ts`: 안정적인 ID·이름·분류·asset의 단일 등록 위치. 현재 sprout/cat/star/flower/book/shoe 6종. 목록과 `PocketStickerId` 타입은 여기서 파생된다.
- `assets/<id>.ts`: 투명 단색 SVG path, 56×56 viewBox, revision, 원본 파일/crop. 추가 5종에는 원본 SHA256도 포함한다.
- `StickerArtwork.tsx`: DS에 의존하지 않고 크기/색상을 받아 렌더한다.
- `src/design-system/assets/sprout.ts`: 옮겨진 새싹 자산의 호환 export. 실제 path는 `src/stickers/pocket/assets/sprout.ts` 한 곳에 있다. 작은 링크·설정·칸에서 같은 원본을 쓴다.
- 꽃 스티커는 헤더의 꽃 아이콘과 별도 자산이다.
- 추가 5종은 `04-goal-settings.png`의 실제 윤곽을 추출해 기존 임의 SVG를 교체했다. 56 격자로 정규화했으므로 원본 질감/모든 미세 픽셀까지 동일하지는 않다.
- 새싹 얼굴을 포함해 밝은 내부는 투명이다. 별도 피부색을 넣지 않는다.

[추가·수정 절차](../src/stickers/pocket/README.md), [자산 검수](design/retro-pocket-v1/review-set-02/asset-review/README.md).

추출 재생성 명령은 아래와 같다. **검수 명령이 아니라 추가 5종 파일을 덮어쓰는 명령**이므로 자산 재생성 때만 실행한다. 새싹은 변경하지 않는다.

```sh
node scripts/trace-pocket-stickers.mjs /private/tmp/chagok-preview-tools/node_modules/playwright/index.mjs
```

기존 `src/stickers/catalog.ts`는 저장용 22종의 별도 카탈로그다. 이번 작업에서 DB ID 변환은 하지 않았다. 새 라이브러리를 저장소에 연결할 때 명시적인 매핑/마이그레이션이 필요하다.

## 6. 실행 및 확인 링크

인계 작성 시 `http://127.0.0.1:6006/index.json`은 200 응답이었다. 다음 세션에서는 실행 상태를 다시 확인한다. 오래된 PID/6007 포트 안내를 그대로 믿거나 기존 프로세스를 임의 종료하지 않는다.

```sh
cd /Users/eunjukim/Desktop/workspace/chagok-app
npm run storybook
```

- [8개 화면 — 적립판 홈부터](http://localhost:6006/?path=/story/screens-review-set-02--tally-home)
- [목표 설정](http://localhost:6006/?path=/story/screens-review-set-02--goal-settings)
- [새 목표](http://localhost:6006/?path=/story/screens-review-set-02--new-goal)
- [기록](http://localhost:6006/?path=/story/screens-review-set-02--sticker-record)
- [추가 공통 구성 요소](http://localhost:6006/?path=/story/components-screen-building-blocks--goal-options)
- [스티커 시안 비교](http://localhost:6006/?path=/story/stickers-asset-library--reference-comparison)
- [스티커 크기별 보기](http://localhost:6006/?path=/story/stickers-asset-library--size-matrix)
- [기존 공통 컴포넌트](http://localhost:6006/?path=/story/design-system-overview--component-board)
- [기존 v6 비교](http://localhost:6006/?path=/story/design-system-reference-match--side-by-side)

`ReferenceMatch`의 Focus/Frame/Gear/Sprout Details도 사용할 수 있다. 과거 비교 스토리 일부는 이전 큰 스탬프 crop을 보여주므로 새싹 원본은 위의 최신 작은 미리보기 기준을 따른다.

## 7. 검증 결과와 재현

최종 사진 비율 수정 후 typecheck 및 전체 Playwright 검사를 통과했다. 컴포넌트 11개 테스트와 Storybook 빌드는 그 직전 전체 화면 수정 단계에서 통과했다. 마지막 사진 비율/샘플 크롭 수정 후 정적 빌드는 재실행하지 않았다. 이번 문서 작성에서는 코드나 디자인을 추가 수정하지 않았다.

```sh
npm run typecheck
npm run test:components
npm run build-storybook
node scripts/check-screen-compositions.mjs /private/tmp/chagok-preview-tools/node_modules/playwright/index.mjs
```

Playwright 검사는 목표 생성/사용자 지정 칸 수, 스티커 변경/저장, 월 이동/날짜 선택, 붙이기/떼기, 사진 업로드/삭제, 메모 저장, 튜토리얼 3단계/종료/Tab/Escape 및 8개 화면×390/320px를 확인한다. 최종 결과는 browser error와 가로 overflow 없음이다. 이미지는 Vite 재로딩 간섭을 막기 위해 전체 탐색 후 기록한다.

- [최종 verification.json](design/retro-pocket-v1/review-set-02/implementation-review/verification.json)
- [최종 render-errors.json](design/retro-pocket-v1/review-set-02/implementation-review/render-errors.json)
- [기존 프레임/선/새싹 검수 기록](design/retro-pocket-v1/revisions/v6/browser-review/README.md)

Playwright 모듈은 프로젝트 의존성이 아닌 임시 설치다. 경로 존재 여부를 확인한다. macOS 샌드박스의 `MachPortRendezvousServer Permission denied`가 나오면 필요한 Chromium 실행 권한을 요청하며 우회하지 않는다.

Storybook의 RN Web 번들 지시문/번들 크기 경고는 남아 있다. 과거 SVG 개발 서버 무한 로딩 수정은 유지한다: RN→RN Web alias, SVG 웹 진입점 alias, `.web.*` 우선, SVG/RN Web optimizeDeps 포함. SVG를 optimizeDeps.exclude로 돌리지 않는다. 생성 폴더는 watcher 및 TS 검사에서 제외한다.

## 7-1. 화면 적응성 정비 (2026-09-23)

사용성 점검에서 찾은 네 가지를 고쳤다. 디자인 토큰과 프레임 값은 건드리지 않았고 추가만 했다.

| 문제 | 조치 | 위치 |
| --- | --- | --- |
| 스크롤 컨테이너가 없어 적립판 30칸부터 화면 밖으로 잘림 (복구 불가) | `RetroScreen`을 `ScrollView`로 감싸고 `minHeight:760` 제거 | `composition-controls.tsx` |
| 노치·홈 인디케이터 침범 (`SafeArea` 호출 0건) | `SafeAreaProvider`를 루트에 두고 `RetroScreen`이 inset을 padding으로 적용 | `app/_layout.tsx`, `composition-controls.tsx` |
| 네비게이터 헤더와 화면 자체 헤더가 겹쳐 제목·뒤로가기가 두 벌 | `headerShown:false`. 레트로 헤더를 남기는 쪽을 택함 | `app/_layout.tsx` |
| 기록 화면 메모 입력창을 키보드가 가림 | `avoidKeyboard` prop → `KeyboardAvoidingView` | `screen-compositions.tsx:73` |
| `RetroScreen`이 넓은 화면에서 좌측 정렬 | `alignItems:'center'` + `maxWidth` | `composition-controls.tsx` |
| 측정 전 첫 프레임이 하드코딩 294로 그려져 깜빡임 | `useContentWidth(measured)` 훅으로 실제 폭 추정 | `components.tsx`, `calendar.tsx` |

**`useSafeAreaInsets()`를 쓰지 않은 이유.** 그 훅은 `SafeAreaProvider`가 없으면 예외를 던진다.
컴포넌트 테스트와 Storybook은 Provider 없이 화면을 렌더하므로 `SafeAreaInsetsContext`를
`useContext`로 직접 읽고 `null`이면 0으로 둔다. 바꾸면 테스트가 깨진다.

**래퍼에 높이가 필요하다.** `RetroScreen`은 `flex:1` + `ScrollView`라 부모에 확정된 높이가 없으면
0으로 접혀 **화면이 통째로 비어 보인다.** 실제로 「목표 만들기」가 빈 흰 시트로 떴다.
`HomeScreen`·`GoalEditorScreen`의 `<View ref={root}>` 래퍼와 `TutorialScreen` 루트에 `flex:1`을 줬다.
앞으로 `RetroScreen`을 감싸는 래퍼를 새로 만들면 **반드시 높이를 이어줘야 한다.**

**키보드를 내릴 방법을 넣었다.** 「칸 수 직접 입력」은 `number-pad`라 iOS에 리턴 키가 없고, 메모는
`multiline`이라 리턴이 줄바꿈이다. 둘 다 스스로 내릴 수 없었다. 세 가지를 더했다 —
빈 곳 탭(`Pressable`+`Keyboard.dismiss`), 드래그(iOS `interactive` / Android `on-drag`),
단일행 입력의 리턴 키(`PixelInput`의 `returnKeyType` 기본값 `done`).
탭 처리는 자식 `Pressable`이 먼저 응답자가 되므로 버튼 탭을 가로채지 않는다.

**훅은 조건부 return보다 위에 모은다.** `app/index.tsx`의 누적 총계 `useEffect`가 분기 세 개
(`loading` / `showTutorial` / `goals.length===0`) 아래에 있어 `Rendered more hooks than during the
previous render`로 죽었다. 시뮬레이터에는 목표와 `tutorialDone` 플래그가 이미 있어 항상 끝까지
내려가므로 재현되지 않고, **새로 설치한 실기기에서만** 터진다. 화면 코드는 이 분기 구조를 그대로
쓰므로 훅을 추가할 때 위치를 반드시 확인한다. 이 저장소에는 ESLint가 없어 자동으로 잡히지 않는다.

## 7-2. ESLint 도입과 그것이 찾아낸 것 (2026-09-28)

`eslint` + `eslint-config-expo@57` (flat config, `eslint.config.js`). `npm run lint`. 현재 **0 에러 0 경고**.

`react-dom` override 때문에 설치 전 `package.json`·`package-lock.json`을 백업하고 `--dry-run`으로
확인한 뒤 설치했다. 설치 후 `npm ls react-dom --all`이 `19.2.3` 하나만 내놓는 것을 확인했다.
eslint 계열은 `react-dom`에 의존하지 않아 실제 충돌은 없었다. 위험은 패키지가 아니라
`npm install`이 트리를 다시 푸는 동작 쪽이다.

린트가 찾아낸 **실제 버그 두 개** —

1. **스와이프 월 이동이 한 번만 동작했다.** `screen-compositions.tsx`에서
   `useRef(PanResponder.create(...)).current`가 첫 렌더의 `year`/`month`를 가둬서, 두 번째
   스와이프부터 늘 같은 달로 갔다. `useCallback`+`useMemo`로 바꿨다 (`react-hooks/refs`).
2. **응답 경쟁과 언마운트 후 setState.** `app/index.tsx`의 누적 총계와
   `app/sticker/[id].tsx`의 초기 로드가 늦게 도착한 응답으로 값을 덮거나, 화면을 떠난 뒤
   `setState`/`router.back()`을 부를 수 있었다. 둘 다 `alive` 가드를 넣었다
   (`react-hooks/set-state-in-effect`).

그 밖에 `__tests__/support/setup.ts`의 `useFreshDb`를 `withFreshDb`로 바꿨다. 훅이 아닌데
`use` 접두사라 린트와 사람 모두를 오해시켰다. `.cjs` 빌드 스크립트에는 Node 전역을 선언했다.

**vitest와 Storybook 설정이 각각 하나 늘었다.** `react-native-safe-area-context`를 `src/index.tsx`로 별칭했다.
패키지 기본 진입점(`lib/module`)을 타면 네이티브 변형이 잡혀 RN 원본의 Flow 문법에서
`SyntaxError: Unexpected token 'typeof'`로 죽는다. `.web.tsx` 변형이 잡히도록 하는 것이 목적이다.

검증: `npm run typecheck` 통과, `npm test` 53개 통과, `npm run test:components` 11개 통과,
`npx expo export --platform ios` 번들 성공(2.8MB).

**스크롤은 렌더해서 확인했다.** Storybook을 정적 빌드하고 Playwright로 320×568(iPhone SE)에서 쟀다.
주의할 점: Storybook 래퍼 div는 `display:block`·높이 auto라 `flex:1` 사슬이 거기서 끊긴다.
그대로 재면 스크롤 컨테이너가 0개로 나오는데 **버그가 아니라 측정 환경 문제다.**
조상에 높이를 주고(실제 화면 컨테이너와 같은 조건) 다시 재면 새 목표 568/738,
기록 568/869로 스크롤이 확인된다. 재현 스크립트는 세션 스크래치패드에 있었다.

---

## 8. 한계와 다음 작업 시 주의

- **구현 범위는 공통 RN 컴포넌트 + Storybook 메모리 데모다.** 실제 Expo Router 화면/DB/네이티브 사진 선택기 연결은 하지 않았다. 네이티브 실기기 검수도 미수행이다.
- 기록 사진/메모 상태는 데모용이며 실제 기록별 영속 모델이 아니다. 새로고침하면 데모 상태가 초기화된다.
- 시안과 픽셀 단위 일치/최종 사용자 승인은 아니다. 현재 폰트·프레임 치수·공통 focus·단색 asset 때문에 남는 차이를 설명해야 한다.
- 긴 제목/메모, 네이티브 접근성은 제품 통합 시 추가 검증한다. 스크롤·세이프에어리어·키보드·화면 폭 대응은 7-1에서 처리했으나 **실기기 검수는 아직이다.**
- **튜토리얼 스포트라이트는 스크롤 중에 좌표가 어긋난다.** 좌표를 `onLayout`에서만 다시 재고 스크롤 이벤트는 듣지 않는다. 첫 실행 시 스크롤 0에서 뜨므로 실사용에는 문제가 없지만, 스크롤한 뒤 튜토리얼을 다시 열면 구멍이 엉뚱한 곳에 생긴다.
- 새 세션은 이 문서와 관련 기준 이미지를 읽고 현재 브라우저부터 확인한다. 사용자 추가 요청 없이 기존 DS를 다시 재해석하지 않는다.
- 루트 AGENTS.md에 따라 **코드 작성 전 Expo 57 버전 문서** `https://docs.expo.dev/versions/v57.0.0/`를 읽는다. 현재 Expo ~57.0.24 / RN 0.86.3 / React·React DOM 19.2.3, React DOM override 유지.
- 커밋되지 않은 사용자/기존 작업이 많다. 일괄 reset/복원/삭제 금지. 관련 없는 `.omc`, 앱 설정, 기존 계획 등을 건드리지 않는다. 이 작업에서 커밋·푸시는 하지 않았다.

과거 인계는 [작업 이력 보관본](archive/HANDOFF-design-system-history-2026-09-23.md)에 보존했다. 그 안의 오래된 ‘최신’ 지시, 24×24 새싹, 2px 선, 브라우저 미검수/6007 안내는 현재 상태가 아니다. 제품 요구사항은 [PRD.md](PRD.md)를 참고한다.
