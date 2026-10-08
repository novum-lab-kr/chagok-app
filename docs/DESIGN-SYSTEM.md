# 차곡차곡 디자인 시스템

형태 1.3.0 · 컬러 1.1.0 · Neo둥근모 v1.601 · Storybook 확정 (2026-09-29, 새 기능은 그때 보완)

## Storybook

프로젝트 루트에서 실행한다.

```sh
npm install
npm run storybook
```

[공통 컴포넌트 한눈에 보기](http://localhost:6006/?path=/story/design-system-overview--component-board)

왼쪽 목록의 Foundations에서 컬러·글씨·프레임·새싹을 비교하고, Components에서 개별 상태를 확인한다. Text의 Controls에서 한글 문구와 글씨 역할을 바꿀 수 있다. 버튼은 누르거나 Tab으로 포커스하고, 입력창은 직접 입력하며, 필터는 선택을 바꿀 수 있다. 붙이기 데모는 칸을 눌러 상태를 전환한다. 데모 상태는 저장하지 않는다.

`Components / Dialog`에서 튜토리얼용 스토리 3개와 [일반 화면용 기본형 시안](design/retro-pocket-v1/basic-dialog-review/README.md) 1개를 확인할 수 있다. Docs는 별도로 자동 생성된다. 브라우저 외곽 Storybook 메뉴는 도구 UI이며 앱 폰트 규칙 적용 대상이 아니다.

[PRD 시안에서 보강한 공통 컴포넌트](design/retro-pocket-v1/component-additions-review/README.md)는 사진 프레임의 세 상태, 기록 표식 칸, 설정 목록 행, 짧은 알림과 로딩 표시로 나눠 확인할 수 있다.

정적 배포 파일은 `npm run build-storybook`으로 `storybook-static/`에 생성한다. `file://`로 열지 말고 HTTP 정적 서버에서 제공해야 한다. 개발 서버는 로컬 주소에만 바인딩한다.

## 시안 형태 비교

~~`Design System / Reference Match`~~ — 옛 v6 홈(칩 + 판) 시안과의 비교 페이지였다. 홈 구조가 바뀌어 2026-09-30에 지웠다. 기준 이미지는 `docs/design/`에 남아 있다.

## 색상: 사용자 지정값

| 역할 | 값 |
| --- | --- |
| Viewport background | `#AFE1CB` |
| Main frame / LCD background | `#C7DE94` |
| Primary button | `#FD855F` |
| Secondary button / dialog / input | `#FEF1D1` |
| Main text / frame / sticker ink | `#06261C` |
| Button text | `#01241C` |

[JSON 토큰](design/retro-pocket-v1/system/tokens.json)을 단일 원본으로 두고 `src/design-system/tokens.ts`가 직접 읽는다. 화면별로 색을 복사해서 변경하지 않는다. 버튼 글씨색과 본문색은 서로 다른 토큰이다. 투명 얼굴에는 별도 피부색을 채우지 않는다. 세부 프레임·간격·상태 규칙은 [토큰 명세](design/retro-pocket-v1/system/DESIGN-TOKENS.md)를 따른다.

## 실제 폰트

- 폰트: NeoDunggeunmo / Neo둥근모 1.601, Regular 400.
- 파일: `src/design-system/assets/neodgm-1.601.ttf`.
- SHA-256: `77305267996073aae07bad9313dad2e306a4128e55bfafbed4c41558fee57b4d`.
- SIL OFL 1.1: 동일 assets 폴더의 `OFL.txt`.
- 브랜드 32/40, 제목·진행 숫자 24/32, 본문·버튼·필터·입력 16/24.
- 1.3.0 추가: 보조 글씨 `caption` 14/20(목록 요약, 안내 문장), 배지 `badge` 12/18. 기존 값은 그대로다.
- 합성 bold, 외곽선, 글자 가로 늘리기는 사용하지 않는다. 글자 확대 접근성은 유지한다.
- Storybook은 로컬 파일을 `@font-face`로 등록하고 로딩 후 스토리를 표시한다.
- Native는 `RetroFontProvider`의 expo-font로 동일 파일을 로드한 후 children을 표시한다. 로딩 오류는 숨기지 않는다.

생성 이미지 속 가상의 굵은 글씨와 실제 폰트가 동일하다는 뜻은 아니다. 이제 Storybook에서 보이는 실제 폰트를 검토 기준으로 삼는다.

## 공통 컴포넌트

| 컴포넌트 | 책임과 상태 |
| --- | --- |
| PixelText | 모든 앱 글씨 역할, 한글·영문·숫자 |
| PixelFrame | 정수 좌표 SVG 계단형 프레임; panel/button/input/dialog/slot |
| PixelPanel | LCD 겹테두리와 선택적 제목 |
| PixelButton | primary/secondary, 눌림, 포커스, disabled, loading. loading은 원래 글자를 투명하게 남겨 폭을 유지하고 그 위에 움직이는 로딩 점을 겹친다. 접근성 이름은 `저장 중` |
| PixelInput | Neo둥근모 입력·메모, 라벨, 포커스 |
| ProgressBar | 진행 비율과 접근성 값 |
| StickerFilters | 전체/친구/모양/사물, 외곽·개별 border 0, 세로 구분선 |
| SproutSticker | 스티커 라이브러리의 56×56 새싹 경로, 투명 얼굴 |
| StickerSlot | 빈칸/붙일 수 있음/붙임 |
| PixelDialog | `tutorial`은 단계 숫자·구분선과 왼쪽 정렬 텍스트를, `basic`은 숫자·구분선 없는 중앙 정렬 텍스트를 사용. 제목·설명·버튼 스타일은 동일. `single`이면 버튼 하나(primary)가 다이얼로그 너비를 채운다 — 저장 실패 같은 알림용 (2026-09-30) |
| GoalStickerCell | 붙인 칸의 사진·메모 기록 표식 B안. 비어 있거나 기록이 없으면 표식 없음 |
| PhotoAttachment | 사진 프레임 안 추가 버튼과 첨부 사진 오른쪽 위 삭제 버튼 (`actionsInFrame`) |
| SettingRow | 앱 설정·약관의 이동 행, 값 표시, 비활성 상태 |
| ShortNotice / PixelLoadingIndicator | 백업·저장 알림 표면과 복원·로그아웃 로딩 표시. 로딩 점(`PixelLoadingDots`)은 진한 점이 250ms마다 오른쪽으로 옮겨 가고, 기기의 모션 감소 설정이면 가운데 점에 멈춘다 |
| PixelDialogModal | `basic` 다이얼로그의 앱용 호스트. 네이티브 `Modal`, 배경 차단(scrim), 화면 중앙 배치, Android 뒤로가기 닫기. 삭제·떼기 같은 위험 동작도 같은 primary 버튼을 쓴다 (2026-09-29 확정) |
| PixelBadge | 짧은 글자 배지. `tone`: `ink`(판 종류), `primary`(완성). `badge` 글씨 |
| PixelTabs | 작은 채움 탭. 선택은 잉크 채움 + LCD 글씨 |
| CompletionSticker | 판의 기본 스티커 + `primary` 「완성」 배지. `tilted`는 붙인 듯 비스듬히 |
| AppHeader / GoalListHeader | 앱 최상단(꽃·차곡차곡·앱 설정) / 목록 탭 `내 목표 n · 완성한 판 n` + 오른쪽 끝 `+` |
| GoalSummaryCard | 목록 카드: 스티커, 이름 2줄, 판 종류 배지, 요약 글자 조각, 진행 막대 |
| BoardProgressRow | 판 상세 `n / nn [여백] m% 달성중`, 완성하면 완성 스티커 |
| EmptyState | 목록이 비었을 때의 안내 상자 |
| OptionButtons | 둘 이상 중 하나를 고르는 버튼 줄 |
| EndDatePicker / PeriodField | 종료일 고르기(앞선 날짜 비활성) / 달력판 기간(시작일 고정, 종료일 정하기·바꾸기·지우기) |
| DeleteSection | 화면 맨 아래 구분선 + [삭제하기] + 안내 |

다이얼로그는 **표면 컴포넌트**다. 일반 화면용 호스트는 `PixelDialog variant="basic"`을 화면의 가로·세로 중앙에 놓는다. 실제 Modal 호스트의 포커스 관리·배경 차단·Escape/뒤로가기 등은 화면 통합 단계에서 구현한다. 데모의 붙인 칸 재클릭은 데모 리셋이며 제품의 스티커 삭제 정책을 정의하지 않는다. 새싹 픽셀 원본은 공통화한 초안으로, 이미지 시안과 픽셀 단위 일치를 확정한 자산이 아니다.

## 앱에서 사용

```tsx
import { RetroFontProvider } from '../src/design-system/RetroFontProvider';
import { PixelButton, PixelPanel, PixelText } from '../src/design-system';

export function Example() {
  return (
    <RetroFontProvider>
      <PixelPanel title="책 읽기">
        <PixelText variant="number">6 / 15</PixelText>
        <PixelButton label="저장하기" onPress={() => { /* 화면의 저장 동작 연결 */ }} />
      </PixelPanel>
    </RetroFontProvider>
  );
}
```

컴포넌트는 React Native 기본 요소와 react-native-svg로 작성했다. Storybook은 React Native Web으로 **같은 소스**를 렌더링한다. 기존 Expo Router 화면, DB, 레거시 종이 테마는 이 작업에서 통합하지 않았다. 앱에 새 컴포넌트를 연결할 때 루트에서 폰트 provider를 한 번 사용한다.

## 검증

```sh
npm run typecheck
npm run test:components
npm test -- --runInBand
npm run build-storybook
# 개발 서버를 켠 상태에서 브라우저에 전달되는 모듈 연결 확인
npm run check:storybook
# 다른 포트로 실행했다면:
# npm run check:storybook -- http://127.0.0.1:6007
```

컴포넌트 DOM 테스트는 활성/비활성/저장 중 동작, 한글 입력, 폰트 이름, 필터 선택, 진행 접근성 값, 빈칸과 배치 가능 칸, 본문/버튼색 분리를 확인한다. DOM 테스트가 실제 브라우저·실기기의 시각 확인을 대신하지는 않는다.

개발 서버 무한 로딩 원인으로 SVG 내부 CommonJS 모듈의 `parse` export 연결 오류를 재현했다. `.storybook/main.ts`에서 SVG 웹 진입점을 사전 번들링하도록 수정했다. `check:storybook`은 개발 서버가 실제 제공하는 진입점과 모든 스토리의 ESM import/export 연결을 검사한다. 정적 빌드만으로 놓쳤던 오류를 잡지만, 브라우저 렌더링·상호작용 검증은 별도로 필요하다.

이 환경에서 자동 브라우저 프로세스가 종료되고 Computer Use의 Chrome 접근도 허용되지 않아 캡처 기반 시각 검수는 수행하지 못했다. 로컬 Storybook 서버·스토리 인덱스·폰트 응답과 파일 해시, 정적 빌드는 확인했다. 실기기 렌더링은 미확인이다.

## 제품 문서

제품의 목적·기능·사용 흐름·미결정 정책은 별도 [PRD](PRD.md)에서 관리한다. 색상이나 컴포넌트 변경이 제품 정책 변경을 의미하지 않는다.

구성 참고: [Storybook React Vite 공식 문서](https://storybook.js.org/docs/get-started/frameworks/react-vite), [Expo 57 Font 공식 문서](https://docs.expo.dev/versions/v57.0.0/sdk/font/).


## 공통 PixelFocusRing · 2026-09-21

7번째 칸의 활성 표시를 공통 `PixelFocusRing`으로 분리했다. `src/design-system`에서 import하며, 위치와 크기가 정해진 부모 안에 넣으면 전체 영역에 맞춰진다. 다른 컴포넌트에서 좌표나 모서리를 다시 그리지 않는다.

```tsx
<View style={{width:160,height:96,backgroundColor:retro.color.lcd}}>
  <PixelText>내용</PixelText>
  <PixelFocusRing />
</View>
```

`retro.focus`가 단일 기준이다: cornerSize 15, cornerThickness 8, cornerCut 2, lineWidth 3, lineInset 2, gap 3 (모두 논리 px). 크기가 늘어나도 모서리와 선은 늘리지 않고 직선 구간만 확장한다. 표면색을 덮지 않는 투명한 표시이며 터치를 가로채지 않는다. 호스트가 활성 상태, 키보드 포커스와 접근성 의미를 관리한다. `StickerSlot`의 available 상태가 이 컴포넌트를 사용한다.

검토는 **100% 표시를 먼저** 사용한다(옛 `Reference Match` 페이지는 2026-09-30에 지웠다). 3배 화면은 모서리 구조 확인용이다. 기존 폰트의 획 굵기 차이는 별도 미해결 사항이다.


타이틀 하단 선은 `retro.shape.panelTitleBorder = 3`, 적립판 모든 칸 테두리는 `retro.shape.cellBorder = 3`으로 관리한다. 포커스의 가는 연결선도 `retro.focus.lineWidth = 3`으로 맞췄다. 홀수 굵기 SVG 선의 중심을 반 픽셀에 놓아 실제 가장자리는 정수 픽셀에 맞춘다.

톱니바퀴는 `assets/gear.ts`의 v6 원본 윤곽을 `PixelIcon name="gear"`가 공통 사용한다. 홈 설정 아이콘은 36px SVG 안에 약 30px 실제 윤곽으로 표시한다. 임의 16×16 톱니 초안은 제거했다.

## 새싹과 적립판 여백 (2026-09-22)

공통 새싹 원본은 지정 시안의 **기본 스티커 옆 작은 미리보기**로 갱신했다. `SproutSticker`는 모든 크기에서 같은56×56 viewBox 경로를 사용한다. 큰 스탬프 윤곽을 줄이던 이전 자산은 더 이상 사용하지 않는다.

2026-09-23: 스티커 자산 소유 위치는 `src/stickers/pocket/`로 분리했다. `catalog.ts`에서 6종과 메타데이터를 관리하며 `StickerGlyph`가 현재 디자인 시스템의 ink를 전달한다. 새싹 경로는 그대로 유지했다. 추가 5종은 review-set-02 설정 시안 윤곽을 추출했고 꽃은 헤더용 `PixelIcon`과 다른 자산이다. [확장 방법](../src/stickers/pocket/README.md), [시안 비교](design/retro-pocket-v1/review-set-02/asset-review/README.md).

`StickerGrid`가 3열 배치와 여백을 관리한다. 자식 `StickerSlot`에는 width/height를 `100%`로 전달한다. `retro.layout`에 boardInset6, boardGap15, boardRowGap10, stickerSize54, stickerBottomInset2, progressGridGap2, stickerPreviewSize32를 정의했다. 칸의 새싹은 아래 정렬하며, 숫자는 slotNumber28/32를 사용한다.

## 홈 목록·판 상세 컴포넌트 (2026-09-29)

[PRD](PRD.md) 4.1–4.7의 2026-09-29 결정을 그린 시안(`Screens / Home structure · proposals`)에서 공통 부분을 추출했다. 개별 상태는 Storybook `Components / Goal list & board`에서 본다. 시안 화면도 이 컴포넌트로 다시 조립했고, 기존 캡처와 같은지 대조했다.

**배지 색을 늘리는 방법.** `badgeTones`(`components.tsx`)에 tone을 **추가**한다. `fill`과 `text` 두 색을 토큰에서 고른다. 기존 `ink`·`primary` 조합은 바꾸지 않는다. 지금은 시안에 있는 두 가지만 있다.

**판 조작 (PRD 4.5).** 빈칸 한 번 누르기 = 붙이기, 붙인 칸 한 번 누르기 = 떼기, 붙인 칸 두 번 누르기·꾹 누르기 = 기록 열기. `GoalStickerCell`과 `CalendarBoard`에 `onOpenRecord`를 주면 이 구분이 켜지고, 주지 않으면 지금처럼 누르는 즉시 `onPress`/`onSelect`가 불린다. 두 번 누르기를 가르기 위해 한 번 누르기는 250ms(`DOUBLE_PRESS_MS`, `gestures.ts`) 뒤에 실행된다. 스크린리더에는 같은 칸에 `기록 열기` 접근성 동작(`openRecordAction`)을 붙인다.

**기존 컴포넌트에 추가한 선택 props.** 넘기지 않으면 기존 동작·모양과 같다.

| 컴포넌트 | 추가 props |
| --- | --- |
| `StickerSlot` | `onLongPress` |
| `GoalStickerCell` | `onOpenRecord`, `readonly` (완성한 판: 붙이기·떼기 막고 기록 열기만) |
| `CalendarBoard` | `isDateEnabled`, `canGoPrev`, `canGoNext` (기간 밖 날짜·달), `onOpenRecord`, `readonly` |
| `RecordScreen` · `PhotoAttachment` · `MemoEditor` | `readonly` (저장·사진 바꾸기·떼기 숨김, 메모 읽기 전용) |
| `ShortNotice` | `emphasis` (제목을 크게, 화면 맨 위 안내) |
| `TutorialSpotlight` | `content` (첫 실행 1–3단계 밖 문구) |

**화면 조합 (2026-09-30).** 목록·판 상세·목표 설정·완성한 판 설정·새 목표·칸/종료일 늘리기는 `board-screens.tsx`, 5단계 첫 실행 튜토리얼은 `first-run-tutorial.tsx`에 있고 Storybook과 앱이 같은 소스를 쓴다. 옛 `HomeScreen`·`GoalEditorScreen`·3단계 `TutorialScreen`·`GoalChip`·`GoalStickerLink`/`DefaultStickerLink`는 지웠다. 모션은 `StickMotion`(붙이기, 모션 감소 설정이면 생략). `SettingRow`는 앱 설정 구현 때 쓸 컴포넌트로 남겼고 스토리는 지웠다.

**스티커 묶음·구매 (2026-10-08, PRD 4.12).** `sticker-shop.tsx`에 `PackViewSwitch`·`FoldToggle`·`StickerChoice`·`RewardProgress`·`PickedStickerBar`·`PackCard`·`StickerChooserScreen`(「기본 스티커」)·`PackScreen`(묶음 화면)·`PurchasePanel`(앱 설정 「구매」)·`stickerShopDialogs`·`colorPack`이 있다. 스토리는 `Screens/Sticker Shop`. `composition-controls.tsx`의 `InfoRow`는 누를 수 없는 「항목 · 값」 줄이다. 디자인 시스템은 스티커로 `StickerId`(흑백 + 컬러 `묶음.이름`)를 받고, `StickerGlyph`는 컬러를 24의 배수 크기로 그린다(판 칸·목록 카드 48). 화면 안 흑백 고르기(`StickerPicker`)는 앱이 스키마 v6 전까지 쓰므로 흑백 그대로다.

