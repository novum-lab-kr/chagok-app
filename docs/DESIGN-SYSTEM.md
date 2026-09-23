# 차곡차곡 디자인 시스템

형태 1.2.0 · 컬러 1.1.0 · Neo둥근모 v1.601 · 공통 컴포넌트 검토 단계

## Storybook

프로젝트 루트에서 실행한다.

```sh
npm install
npm run storybook
```

[공통 컴포넌트 한눈에 보기](http://localhost:6006/?path=/story/design-system-overview--component-board)

왼쪽 목록의 Foundations에서 컬러·글씨·프레임·새싹을 비교하고, Components에서 개별 상태를 확인한다. Text의 Controls에서 한글 문구와 글씨 역할을 바꿀 수 있다. 버튼은 누르거나 Tab으로 포커스하고, 입력창은 직접 입력하며, 필터와 목표 칩은 선택을 바꿀 수 있다. 붙이기 데모는 칸을 눌러 상태를 전환한다. 데모 상태는 저장하지 않는다.

32개 스토리: Reference Match 2개, Overview 2개, Foundations 4개, Button 5개, Text 4개, Input 3개, Goal chip 4개, Stickers 5개, Dialog 3개. Docs는 별도로 자동 생성된다. 브라우저 외곽 Storybook 메뉴는 도구 UI이며 앱 폰트 규칙 적용 대상이 아니다.

정적 배포 파일은 `npm run build-storybook`으로 `storybook-static/`에 생성한다. `file://`로 열지 말고 HTTP 정적 서버에서 제공해야 한다. 개발 서버는 로컬 주소에만 바인딩한다.

## 시안 형태 비교

`Design System / Reference Match`에 390px 홈 구성과 시안 나란히 비교를 추가했다. 폰트와 팔레트는 유지하고, 프레임·버튼·새싹·선택 칸·아이콘을 보정했다. 홈은 공통 컴포넌트 검토용이며 목표 설정/추가 버튼은 프레임 확인 팝업을 연다. 제품 화면이나 설정 흐름 구현 완료를 의미하지 않는다.

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
| PixelButton | primary/secondary, 눌림, 포커스, disabled, loading |
| PixelInput | Neo둥근모 입력·메모, 라벨, 포커스 |
| ProgressBar | 진행 비율과 접근성 값 |
| GoalChip | 이름+진행 막대, 선택 상태 |
| StickerFilters | 전체/친구/모양/사물, 외곽·개별 border 0, 세로 구분선 |
| SproutSticker | 스티커 라이브러리의 56×56 새싹 경로, 투명 얼굴 |
| DefaultStickerLink | 새싹+기본 스티커+화살표 |
| StickerSlot | 빈칸/붙일 수 있음/붙임 |
| PixelDialog | 진행·제목·한 문장·두 버튼으로 된 표면 |

다이얼로그는 **표면 컴포넌트**다. 실제 Modal 호스트의 포커스 관리·배경 차단·Escape/뒤로가기 등은 화면 통합 단계에서 구현한다. 데모의 붙인 칸 재클릭은 데모 리셋이며 제품의 스티커 삭제 정책을 정의하지 않는다. 새싹 픽셀 원본은 공통화한 초안으로, 이미지 시안과 픽셀 단위 일치를 확정한 자산이 아니다.

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

검토는 `Reference Match / Focus Details`와 `Controls Actual Size`의 **100% 표시를 먼저** 사용한다. 3배 화면은 모서리 구조 확인용이다. 기존 폰트의 획 굵기 차이는 별도 미해결 사항이다.


타이틀 하단 선은 `retro.shape.panelTitleBorder = 3`, 적립판 모든 칸 테두리는 `retro.shape.cellBorder = 3`으로 관리한다. 포커스의 가는 연결선도 `retro.focus.lineWidth = 3`으로 맞췄다. 홀수 굵기 SVG 선의 중심을 반 픽셀에 놓아 실제 가장자리는 정수 픽셀에 맞춘다.

톱니바퀴는 `assets/gear.ts`의 v6 원본 윤곽을 `PixelIcon name="gear"`가 공통 사용한다. 홈 설정 아이콘은 36px SVG 안에 약 30px 실제 윤곽으로 표시한다. 임의 16×16 톱니 초안은 제거했다.

## 새싹과 적립판 여백 (2026-09-22)

공통 새싹 원본은 지정 시안의 **기본 스티커 옆 작은 미리보기**로 갱신했다. `SproutSticker`는 모든 크기에서 같은56×56 viewBox 경로를 사용한다. 큰 스탬프 윤곽을 줄이던 이전 자산은 더 이상 사용하지 않는다.

2026-09-23: 스티커 자산 소유 위치는 `src/stickers/pocket/`로 분리했다. `catalog.ts`에서 6종과 메타데이터를 관리하며 `StickerGlyph`가 현재 디자인 시스템의 ink를 전달한다. 새싹 경로는 그대로 유지했다. 추가 5종은 review-set-02 설정 시안 윤곽을 추출했고 꽃은 헤더용 `PixelIcon`과 다른 자산이다. [확장 방법](../src/stickers/pocket/README.md), [시안 비교](design/retro-pocket-v1/review-set-02/asset-review/README.md).

`StickerGrid`가 3열 배치와 여백을 관리한다. 자식 `StickerSlot`에는 width/height를 `100%`로 전달한다. `retro.layout`에 boardInset6, boardGap15, boardRowGap10, stickerSize54, stickerBottomInset2, progressGridGap2, stickerPreviewSize32를 정의했다. 칸의 새싹은 아래 정렬하며, 숫자는 slotNumber28/32를 사용한다.
