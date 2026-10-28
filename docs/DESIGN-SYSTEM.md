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

`Components / Dialog`에서 튜토리얼용 스토리 3개와 일반 화면용 기본형 1개를 확인할 수 있다. Docs는 별도로 자동 생성된다. 브라우저 외곽 Storybook 메뉴는 도구 UI이며 앱 폰트 규칙 적용 대상이 아니다.

PRD 시안에서 보강한 공통 컴포넌트(사진 프레임의 세 상태, 기록 표식 칸, 설정 목록 행, 짧은 알림과 로딩 표시)도 Storybook에서 확인한다.

정적 배포 파일은 `npm run build-storybook`으로 `storybook-static/`에 생성한다. `file://`로 열지 말고 HTTP 정적 서버에서 제공해야 한다. 개발 서버는 로컬 주소에만 바인딩한다.

## 시각 기준

- **기존 디자인 시스템으로 화면을 조립한다.** 팔레트·폰트·공통 프레임·포커스를 새로 바꾸지 않는다. 토큰은 추가만 하고 기존 값은 바꾸지 않는다(사용자 승인 기준). 앱 연결은 기존 컴포넌트에 선택(optional) prop을 더하는 방식으로 한다.
- **기준은 Storybook이다**(2026-09-29 확정). 원본 이미지 시안과 픽셀 단위로 같다는 뜻은 아니다 — 폰트·프레임 치수·포커스·단색 자산에서 오는 차이는 남아 있다. 테스트 통과나 토큰 버전을 사용자 승인으로 보지 않는다.
- 새 화면 시안은 아티팩트로 먼저 보여 주고, 확정되면 Storybook에 반영한다. 아직 열려 있는 시안의 원본은 [design/proposals-2026-10/](design/proposals-2026-10/README.md), 확정된 시안의 원본은 git 기록(`402913e`)에 있다.
- 판 종류 카드는 사용자가 첨부한 [상세 시안](design/retro-pocket-v1/review-set-02/references/board-type-detail-user.png)이 기준이다(달력 요일/빈칸, 적립판 첫 칸 체크, 주황 외곽 선택).
- 시안의 폰 목업·OS 상태바·광원·질감은 구현 대상이 아니다. `review-set-01`, `screen-preview`의 거절된 실험과 종이 테마를 되살리지 않는다.
- 확대 화면만 보고 끝내지 않는다. 100% 배율, DPR 1, 390px와 320px에서 본다.

## 화면 수치

- 패널 계단 단위 6px, 컨트롤 5px, 기본 셀 3px. 컨트롤·패널·칸 테두리와 패널 제목 구분선은 3px.
- `PixelFocusRing`: cornerSize 15, cornerThickness 8, cornerCut 2, lineWidth 3, lineInset 2, gap 3. 달력판 오늘 칸은 같은 링을 칸 밖으로 격자선 두께(3)만큼 넓혀 격자선 위에 겹쳐 그리고 그 칸을 `zIndex: 1`로 올린다(2026-10-09, 달력 포커스 시안).
- 탭 대상은 iOS 44pt · Android 48dp 이상(2026-10-12). 모양이 작은 버튼은 `touchSlop`(`hitSlop`)으로 누르는 영역만 넓힌다. 달력 날짜 칸(7열)은 옆 칸과 겹쳐 넓히지 않는다. 로그인 버튼은 각 회사의 표준 버튼을 판 너비로 쌓는다(2026-10-21 시안 2안, 이전: 지름 52 동그라미). 높이 40(누르는 영역은 hitSlop으로 44), 모서리 12, 사이 10(2026-10-22 시안 T3, 이전: 높이 48, 사이 12). Apple은 HIG 「직접 만든 버튼」 규칙으로 만든다(`AppleLoginButton`, 2026-10-22): Apple 디자인 리소스 Left-aligned Black Medium 로고(파일 높이 = 버튼 높이, 사과 높이 약 17로 카카오 18, Google 20과 맞춤), 글자는 시스템 글꼴로 높이의 43%(17.2), 흰 바탕, 검정 테두리. 로고 파일은 사용권상 공개 저장소에 두지 않고 `scripts/apple-logo.mjs`가 git 밖 파일에서 만든다. 파일이 없으면 기본 `AppleAuthenticationButton`으로 돌아간다(기본 버튼도 글자가 높이의 43%라 40이면 17). 회사 색과 글꼴은 디자인 시스템의 예외다. 첫 화면은 머리글 없이 판을 세로 가운데에 두고 판 위 가운데에 차곡이(grin, 96)를 얹는다. 제목 「반가워요」, 안내 「어떤 걸로 시작해 볼까요? / 로그인하면 기록을 자동으로 백업해요.」(「사라지지 않게」는 걱정을 먼저 꺼내서 뺐다)(가운데 정렬, 판 안 여백 위 36, 아래 28, 사이 20). 앱 설정에서 열면 「계정 연결」 머리글이 있고 제목은 뺀다(2026-10-22 시안 3판). Apple은 네이티브 `AppleAuthenticationButton`(밝은 바탕이라 WHITE_OUTLINE, `cornerRadius` 12, 글자는 기기 언어를 따르게 `CFBundleAllowMixedLocalizations`)이고 style로 배경과 모서리를 바꾸지 않는다. 카카오(#FEE500, 말풍선 심볼)와 Google(흰 바탕, #747775 테두리, 4색 G)은 각 가이드 모양대로 만든다. 글자는 셋 다 「계속하기」로 맞춘다: Apple은 `CONTINUE` 종류, 「카카오로 계속하기」, 「Google로 계속하기」(2026-10-22 사용자 결정. 카카오 가이드의 기본 글자는 「카카오 로그인」이지만 국내 앱에서 흔히 바꿔 쓴다). 순서 카카오 → Google → Apple(2026-10-22 사용자 결정, Apple은 덜 쓰여 맨 아래. 이전: 카카오 → Apple → Google), Android는 Apple 없이.
- 화면 내용 최대 폭 `SCREEN_MAX_WIDTH` 440pt, 양옆 `SCREEN_PADDING` 20pt. 더 넓은 화면은 가운데로 모은다.
- 제목 줄(`RetroScreen header`)과 본문 사이 24pt, 모든 화면(2026-10-10). 제목 아래에 탭이 붙는 「기본 스티커」는 제목–탭 24, 탭–본문 14(`headerGap`).
- iOS 시트(`presentation: 'modal'` — 새 목표, 기본 스티커, 묶음)는 위쪽 안전 영역을 비우지 않는다(`SheetSafeArea`, 2026-10-10). Android 모달은 화면 전체라 그대로 둔다.
- `StickerGrid`: 3열, 좌우 안쪽 6px, 열 간격 15px, 행 간격 10px. 칸 숫자 28/32px.
- 컬러 스티커는 24의 정수배 크기로 그린다. 판 칸·목록 카드 48pt.
- 확인 다이얼로그는 `PixelDialog variant="basic"`을 화면 가운데에 둔다(앱은 `PixelDialogModal`). 삭제·떼기 같은 위험 동작도 같은 primary 버튼을 쓴다.
- 톱니바퀴는 v6 원본 윤곽 `assets/gear.ts`를 쓴다.

## 스티커 자산

- **컬러 스티커(앱이 쓰는 것):** `src/stickers/color/`. 24×24 도트 66종 — 기본 6(무료), 운동·간식·사물·동물·감정·날씨계절 각 10. ID는 `묶음.이름`. 원본은 `source/sticker-packs-24.json`, 고친 뒤 `node scripts/build-color-stickers.mjs`로 `stickers.generated.ts`를 다시 만든다. 위젯용 그림은 `widgetStickerArt.generated.ts`. 검토는 Storybook `Stickers / Color Assets`. [README](../src/stickers/color/README.md).
- **흑백 스티커:** `src/stickers/pocket/`(6종, 56×56 SVG path). 앱 저장값은 스키마 v6에서 컬러로 옮겼다. `node scripts/trace-pocket-stickers.mjs`는 추가 5종 파일을 덮어쓰니 자산을 다시 만들 때만 쓴다.
- `src/stickers/catalog.ts`(22종)는 쓰는 코드가 없지만 옛 마이그레이션 매핑 근거라 지우지 않는다.

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
| SproutSticker | 스티커 라이브러리의 56×56 새싹 경로, 투명 얼굴 |
| StickerSlot | 빈칸/붙일 수 있음/붙임 |
| PixelDialog | `tutorial`은 단계 숫자·구분선과 왼쪽 정렬 텍스트를, `basic`은 숫자·구분선 없는 중앙 정렬 텍스트를 사용. 제목·설명·버튼 스타일은 동일. `single`이면 버튼 하나(primary)가 다이얼로그 너비를 채운다 — 저장 실패 같은 알림용 (2026-09-30) |
| GoalStickerCell | 붙인 칸의 사진·메모 기록 표식 B안. 비어 있거나 기록이 없으면 표식 없음 |
| PhotoAttachment | 사진 프레임 안 추가 버튼과 첨부 사진 오른쪽 위 삭제 버튼 (`actionsInFrame`) |
| SettingRow | 앱 설정·약관의 이동 행, 값 표시, 비활성 상태 |
| ShortNotice / PixelLoadingIndicator | 백업·저장 알림 표면과 복원·로그아웃 로딩 표시. 로딩 점(`PixelLoadingDots`)은 진한 점이 250ms마다 오른쪽으로 옮겨 가고, 기기의 모션 감소 설정이면 가운데 점에 멈춘다 |
| PixelDialogModal | `basic` 다이얼로그의 앱용 호스트. 네이티브 `Modal`, 배경 차단(scrim), 화면 중앙 배치, Android 뒤로가기 닫기. 삭제·떼기 같은 위험 동작도 같은 primary 버튼을 쓴다 (2026-09-29 확정) |
| PixelBottomSheet | 화면 아래에 붙는 시트. 다이얼로그 틀(`PixelFrame` dialog)과 `dialogPadding`을 그대로 쓰고 제목은 22/30, 위 여백 24, 줄 사이 16. 양옆 12, 아래는 기기 여백(최소 12). 끌어 닫기는 없고 배경 누르기와 Android 뒤로가기가 `onRequestClose`를 부른다. 첫 사용처는 로그인 뒤 새 계정 동의 (2026-10-21) |
| PixelBadge | 짧은 글자 배지. `tone`: `ink`(판 종류), `primary`(완성). `badge` 글씨 |
| PixelTabs | 작은 채움 탭. 선택은 잉크 채움 + LCD 글씨 |
| CompletionSticker | 판의 기본 스티커 + `primary` 「완성」 배지. `tilted`는 붙인 듯 비스듬히 |
| AppHeader / GoalListHeader | 앱 최상단(차곡이·차곡차곡. 앱은 톱니바퀴 없이 쓴다) / 목록 탭 `내 목표 n · 완성한 판 n` + 오른쪽 끝 `+` |
| FloatingTabBar / TabIcon / TabTitle | 하단 탭(2026-10-12): 화면 가장자리에서 16pt 떨어진 `dialog` 판 모양 바, 탭마다 아이콘 32(16칸 그림의 2배)만, 이름은 화면 낭독용으로만(2026-10-15, 이전: 아이콘 24 + 이름 13). 고른 탭은 아이콘 `primary`(살구) + 바탕 `screen`(민트) `selection` 도트 칸, 나머지는 0.45 투명도 — 위 PixelTabs의 잉크 채움과 겹쳐 보이지 않게 잉크로 채우지 않는다. 누르는 높이 48. 누른 채 끌면 칸이 손가락을 따라오고(누르는 동안 칸 세로 1.12·가로 1.06배, 지나가는 아이콘 위로 4·1.2배), 놓으면 스프링으로 제자리. `onTick`은 누를 때·탭 경계마다(앱은 `Haptics.selectionAsync`). 「동작 줄이기」면 움직임 없이 바로 옮겨 간다. `position`(화면 넘김 위치, 소수)을 주면 화면을 밀 때 칸이 그 값을 따라간다(2026-10-17, 앱은 expo-router `js-top-tabs`를 아래 탭으로 쓴다). 탭 화면 제목은 `TabTitle`(brand 글씨). 탭 안 화면은 `TabSafeArea`로 아래 안전 영역을 탭 바에 맡긴다 |
| RecordTimelineScreen / RecordFeedScreen / StickerCollectionScreen | 기록 탭(2026-10-17: 제목 옆 보기 바꾸기 아이콘 44 두 개, 목표 칩은 스티커 28만 두고 고른 칩만 이름(최대 150)을 펼침. 타임라인은 잉크 날짜 띠 「10월 12일」+작은 요일, 기록 줄은 스티커 40 · 민트 배지 목표 이름 · 잉크 메모 16/22 2줄 · 사진 72. 피드는 3열 정사각형 칸, 간격 3, 메모 칸은 13/18 4줄) / 펼친 화면(기록마다 스티커 32 · 아이보리 배지 목표 이름 · 날짜, 사진 틀 586:494, 메모 16/22 전체, 메모만이면 큰 글씨 카드 18/26, 기록 사이 28) / 스티커 탭(기본 스티커 화면에서 고르기 줄을 뺀 둘러보기, `PackCard selectable={false}`) |
| TrialReadyCard / CompletionNudge | 목표 탭 맨 위 체험 열림 카드 / 판 완성 뒤 판 아래에 뜨는 「다음 판은 새 스티커로」. 둘 다 `dialog` 판 + 차곡이 sparkle + 오른쪽 위 모서리 ×(44pt, 글자 폭을 빼앗지 않게 겹쳐 둔다) |
| GoalSummaryCard | 목록 카드: 스티커, 이름 2줄, 판 종류 배지, 요약 글자 조각, 진행 막대 |
| BoardProgressRow | 판 상세 `n / nn [여백] m% 달성중`, 완성하면 완성 스티커 |
| EmptyState | 목록이 비었을 때의 안내 상자 |
| OptionButtons | 둘 이상 중 하나를 고르는 버튼 줄 |
| EndDatePicker / PeriodField | 종료일 고르기(앞선 날짜 비활성) / 달력판 기간(시작일 고정, 종료일 정하기·바꾸기·지우기) |
| DeleteSection | 화면 맨 아래 구분선 + [삭제하기] + 안내 |
| LoadingScreen / ScreenFailed | 화면을 열 때 읽는 동안 로딩 점, 못 보여 주면 차곡이 갸웃 + 상황별 문구(`kind`: records·goals·stickers·screen) + [다시 시도] [홈으로]. 앱 대기 화면과 ErrorBoundary가 같이 쓴다. 다시 시도 상태는 `useLoadRetry` (2026-10-10) |

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

[PRD](PRD.md) 4.1–4.7의 2026-09-29 결정을 그린 시안(당시 `Screens / Home structure · proposals`, 지금 `Screens / Board & goal`)에서 공통 부분을 추출했다. 개별 상태는 Storybook `Components / Goal list & board`에서 본다. 시안 화면도 이 컴포넌트로 다시 조립했고, 기존 캡처와 같은지 대조했다.

**배지 색을 늘리는 방법.** `badgeTones`(`components.tsx`)에 tone을 **추가**한다. `fill`과 `text` 두 색을 토큰에서 고른다. 기존 `ink`·`primary` 조합은 바꾸지 않는다. 지금은 시안에 있는 두 가지만 있다.

**판 조작 (PRD 4.1).** 빈칸 한 번 = 붙이기, 붙인 칸 한 번 = 기록 열기, 붙인 칸 꾹 = 떼기. 스크린리더에는 같은 칸에 '스티커 떼기' 접근성 동작을 붙인다.

**기존 컴포넌트에 추가한 선택 props.** 넘기지 않으면 기존 동작·모양과 같다.

| 컴포넌트 | 추가 props |
| --- | --- |
| `StickerSlot` | `onLongPress` |
| `GoalStickerCell` | `onOpenRecord` |
| `CalendarBoard` | `isDateEnabled`, `canGoPrev`, `canGoNext` (기간 밖 날짜·달), `onOpenRecord` |
| `ShortNotice` | `emphasis` (제목을 크게, 화면 맨 위 안내) |
| `TutorialSpotlight` | `content` (첫 실행 1–3단계 밖 문구) |

**화면 조합 (2026-09-30).** 목록·판 상세·목표 설정·완성한 판 설정·새 목표·칸/종료일 늘리기는 `board-screens.tsx`, 5단계 첫 실행 튜토리얼은 `first-run-tutorial.tsx`에 있고 Storybook과 앱이 같은 소스를 쓴다. 옛 `HomeScreen`·`GoalEditorScreen`·3단계 `TutorialScreen`·`GoalChip`·`GoalStickerLink`/`DefaultStickerLink`는 지웠다. 모션은 `StickMotion`(붙이기, 모션 감소 설정이면 생략). `SettingRow`는 앱 설정 구현 때 쓸 컴포넌트로 남겼고 스토리는 지웠다.

**스티커 묶음·구매 (2026-10-08, PRD 4.12).** `sticker-shop.tsx`에 `PackViewSwitch`·`FoldToggle`·`StickerChoice`·`RewardProgress`·`PickedStickerBar`·`PackCard`·`StickerChooserScreen`(「기본 스티커」)·`PackScreen`(묶음 화면)·`PurchasePanel`(앱 설정 「구매」, 그 아래 「도움말과 정보」는 `policy-screens.tsx`의 `HelpInfoPanel`과 `contactDialogs`)·`stickerShopDialogs`·`colorPack`이 있다. 스토리는 `Screens/Sticker Shop`. `composition-controls.tsx`의 `InfoRow`는 누를 수 없는 「항목 · 값」 줄이다. 디자인 시스템은 스티커로 `StickerId`(흑백 + 컬러 `묶음.이름`)를 받고, `StickerGlyph`는 컬러를 24의 배수 크기로 그린다(판 칸·목록 카드 48). 묶음 카드의 접힌 줄은 재어 본 폭에 들어가는 만큼만 보이고(`packRowCount`, 최대 5) 나머지는 「+n」이다 — 폴드 커버(344dp)에서 5개 + 「+n」이 카드 밖으로 넘쳤다(2026-10-12).

