# 차곡차곡 디자인 시스템 인계

갱신: 2026-09-30 · 프로젝트: `/Users/eunjukim/Desktop/workspace/chagok-app`

구현 현황과 시각 기준의 단일 출처다. 제품 요구사항은 [PRD.md](PRD.md), 작업 방식은 [WORKING-AGREEMENT.md](WORKING-AGREEMENT.md)를 따른다. 이미 끝난 수정 이력은 git 기록과 [보관본](archive/HANDOFF-design-system-history-2026-09-23.md)에 있다.

## 0. 다음 세션 시작점 (2026-09-30)

**상태.** 홈 구조 전환(목록 / 판 상세 / 목표 설정 / 완성 흐름 / 5단계 튜토리얼, 스키마 v4)과 Expo Go 단계(약관 화면, 백업 기기 쪽, 위젯 스냅샷, 스키마 v5)가 main에 들어갔다. 홈 구조의 구현 기록·미확인 항목은 [DEV-DESIGN-home-structure.md](DEV-DESIGN-home-structure.md) 10절, Expo Go 단계의 범위와 결정은 [계획](superpowers/plans/2026-09-30-expo-go-phase.md)과 설계 문서 3개([약관](superpowers/specs/2026-09-30-policy-terms-design.md) · [계정·백업](superpowers/specs/2026-09-30-account-backup-design.md) · [위젯](superpowers/specs/2026-09-30-home-widget-design.md))가 단일 출처다.

**작업 방식 (2026-09-30 사용자 지시).**

- 작업 단위마다 main에서 브랜치를 딴다. 브랜치 이름과 맞지 않는 작업을 한 브랜치에 섞지 않는다.
- 계획·설계·코드는 사용자가 확인·승인하기 전에 커밋하지 않는다. 앱 저장소는 로컬 커밋까지만 하고 push는 사용자가 요청할 때 한다.

**다음에 할 일** (9절에 자세히).

1. 사용자 확인: 약관 화면과 v5 이후 기존 흐름을 Expo Go로, 동의 화면·위젯 미리보기를 Storybook으로.
2. 계정 화면 Storybook 구성, 튜토리얼 다시 보기 시안 3개.
3. 준비물(Docker, Apple Developer Program, Google OAuth)이 갖춰지면 개발 빌드 전환 → 서버 → 로그인 → 위젯 네이티브.

**개발 중에 만나면 사용자에게 묻는 것 (아직 열린 결정).**

- ~~튜토리얼 다시 보기 진입 위치~~ → 2026-09-30 A안 확정: 앱 설정 → 도움말 → 사용법 다시 보기(`/tutorial`).
- ~~수동 완성 확인 문구~~ → 2026-09-30 확정: "완성해도 계속하기로 다시 이어 쓸 수 있어요".
- 앱 이름: "차곡차곡" 유지, 스토어 이름에 설명을 붙인다(2026-09-30). 스토어 문구와 상표 확인은 출시 때.
- 목표 설정에서 칸 수·판 종류 변경은 미확정이다. 확정 Storybook의 목표 설정에 없으므로 넣지 않는다.

**정한 값 (다시 묻지 않는다).** 완성 모션은 [완성] 스티커 붙이기 모션 하나, 칸 수 상한 없음(칸 늘리기 기본값은 처음 칸 수만큼 더하기), 기간 없는 달력판은 미래 달 이동 가능, 삭제·떼기 확인은 기존 `basic` 다이얼로그, 판 조작은 한 번 = 붙이기·떼기 / 두 번·꾹 = 기록 열기. 로그인·약관·위젯·백업의 결정은 PRD 확정 이력 2026-09-30 행들.

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

Expo Router 라우트가 SQLite 저장소(스키마 v5)에 연결돼 있다. Expo Go로 실행한다(개발 빌드 전환 전).

| 라우트 | 동작 |
| --- | --- |
| `/` | 목표 목록(`내 목표 / 완성한 판` 탭, `+`), 목표 없음 안내, 첫 실행 튜토리얼 5단계 |
| `/goal/new` | 이름·판 종류·칸 수(상한 없음)·기본 스티커·종료일로 만들고 그 판 상세로 |
| `/goal/[id]` | 판 상세. 붙이기·떼기(한 번), 기록 열기(두 번·꾹), 완성 확인·모션·`닫기 / 계속하기` |
| `/goal/[id]/settings` | 이름 → 기본 스티커 → 기간, [삭제하기]. 완성한 판은 삭제만 |
| `/goal/[id]/extend` | 칸 늘리기 |
| `/sticker/[id]` | 사진·메모. 완성한 판이면 읽기 전용 |
| `/settings` | 이 기기 기록 안내, 약관과 라이선스 |
| `/policies`, `/policies/[license]` | 이용약관·처리방침은 웹 시트(오프라인·실패 알림), 오픈소스 라이선스는 앱 내장 |

**화면에 연결되지 않은 것 (코드만 있음).**

- 백업: `src/sync/` — outbox(모든 저장 함수가 같은 트랜잭션에서 기록), 전송기 `pushOnce`, 복원 `restoreAll`, 스케줄러. 서버 계약 `SyncServer`/`PhotoStore`의 실구현은 없고 메모리 가짜 서버(`__tests__/support/fakeServer.ts`)로만 검증했다.
- 위젯: `src/widgets/` 스냅샷 생성과 DB 읽기, `src/design-system/widget-preview.tsx` 미리보기(Storybook `Widgets / Preview`).
- 동의 화면: `ConsentScreen`(Storybook `Screens / Account consent`). 로그인 단계에서 연결한다.
- 약관 재동의 판단 `needsReconsent`. 정책 사이트(`~/Desktop/workspace/chagok-app-policy`)는 로컬 커밋만 했고 게시 전이라 앱의 약관 링크는 지금 404다.

화면 조합은 `src/design-system/board-screens.tsx`·`first-run-tutorial.tsx`·`policy-screens.tsx`·`account-screens.tsx`, 규칙은 `src/domain/board.ts`·`dates.ts`, 확인·실패 알림은 `src/app-data/useDialog.ts`(OS `Alert` 없음). **실기기 검수는 하지 않았다.**

## 9. 남은 구현 과제

**Expo Go로 할 수 있는 것**

- 계정 관련 화면 Storybook 구성: 시작 화면(로그인 권유), 앱 설정 계정·백업 상태, 복원 충돌·진행·실패, 로그아웃, 계정 삭제 3단계. 시안은 `docs/design/retro-pocket-v1/prd-additions-review/` 캡처.
- 사진 줄이기(긴 변 1600px, JPEG 80%, `expo-image-manipulator`). 올리기는 서버 단계.
- ~~튜토리얼 다시 보기~~ 2026-09-30 완료(`/tutorial`). 튜토리얼이 단계마다 자기 예시 화면을 새로 그려서 목록 스크롤과 무관하다. 튜토리얼 화면 안에서 스크롤하면 스포트라이트가 어긋나는 문제는 첫 실행과 같이 남아 있다.

**준비물이 필요한 것** (Docker Desktop, Apple Developer Program, Google Cloud OAuth — 2026-09-30 기준 없음)

- 개발 빌드 전환(`npx expo run:ios`/`run:android`, prebuild 폴더는 커밋하지 않음)과 `docs/DEV-SETUP.md` 갱신. 로그인·위젯 모두 Expo Go로는 안 된다.
- 서버: 로컬 Supabase에 테이블·RLS·RPC(`push_changes`·`pull_changes`·`server_state`·`replace_all`·`record_consent`), Edge Functions(`delete-account`, `apple-link`). 가짜 서버와 같은 시나리오를 실제 서버에도 돌린다. 테이블 순서는 부모 먼저로 보낸다(외래키 전제).
- 앱 연결: `SyncServer`·`PhotoStore` 실구현, 스케줄러를 AppState·`subscribeLocalChange`에 연결, 앱 설정의 백업 상태.
- 로그인: Google(Android) 먼저, Apple은 계정 승인 뒤. 시작·동의·복원 분기·로그아웃·계정 삭제·재동의.
- 위젯: spike(글꼴·PNG 스티커·딥링크·목표 선택) → iOS `expo-widgets`, Android `react-native-android-widget`.

**확인하지 못한 것**

- 탭 조작 전부(붙이기·떼기·두 번·꾹·스와이프), 모션·햅틱 느낌, 모션 줄이기, Android, 실기기, 320px 네이티브 폭.
- 스키마 v5 마이그레이션을 실제 기기 DB에서 올리는 것. 버전마다 BEGIN/COMMIT으로 묶었다(`src/db/client.ts`).
- 백업 전송을 백그라운드로 돌릴 때 트랜잭션 연결끼리 `SQLITE_BUSY`가 나는지(expo 트랜잭션은 별도 연결이고 외래키가 꺼져 있을 수 있다).

**나중에 따로 고칠 것**

- **~~(다음 수정 건)~~ 2026-09-30 `fix/fixed-header-scroll`에서 고침 — 실기기 확인 대기.** `RetroScreen`의 `header` prop에 넣은 헤더는 스크롤 밖에 고정되고, 상태 표시줄 여백도 스크롤 밖으로 옮겼다. 목록은 탭·`+` 줄까지 고정했다. Storybook 첫 화면은 전후가 같다(74장 중 1장만 3픽셀 차이). 아래는 당시 기록.
- 헤더는 고정하고 아래 내용만 스크롤되게 화면 구조를 바꾼다 (2026-09-30 사용자 요청, 실기기 녹화 15:15·15:16).
  - 증상: 칸이 많은 판 상세(적립판 30칸)나 긴 라이선스 본문을 스크롤하면 헤더(뒤로가기·화면 제목)까지 함께 올라가고, 내용이 상태 표시줄(시계) 영역에 겹친다. 약관과 라이선스 화면도 같다.
  - 원인: `RetroScreen`(`src/design-system/composition-controls.tsx`)이 `insets.top` 여백과 헤더를 모두 `ScrollView` 내용 안에 둔다.
  - 방향: `RetroScreen`에 고정 영역(헤더) 자리를 선택 prop으로 추가한다. 상태 표시줄 여백과 헤더는 스크롤 밖에 고정하고, 내용만 스크롤한다. 스크롤한 내용은 헤더 아래에서 잘리고 시계 영역에 비치지 않아야 한다. 대상은 `ScreenHeader`·`AppHeader`를 쓰는 모든 화면(목록, 판 상세, 목표 설정, 새 목표, 칸 늘리기, 기록, 앱 설정, 약관과 라이선스, 라이선스 상세)이다. 목록 화면에서 `GoalListHeader`(탭·`+`)까지 고정할지는 그때 정한다.
  - 함께 고칠 것: 라이선스 상세(`LicenseDetailScreen`)가 `RetroScreen` 스크롤 안에 `ScrollView`를 하나 더 둬서 스크롤이 두 겹이다. 바깥 스크롤 하나로 합친다.
  - 지킬 것: `RetroScreen`의 키보드 처리(포커스한 입력칸을 키보드 위로 올림)는 스크롤 위치를 쓰므로 그대로 동작해야 한다. 튜토리얼 스포트라이트는 대상 위치를 재서 그리므로 헤더가 고정된 뒤에도 맞는지 확인한다. 토큰·프레임 값은 바꾸지 않는다.
  - 검증: 390·320 Storybook 캡처를 전후로 비교해 스크롤 전 첫 화면이 같은지 보고, 실기기에서 30칸 적립판과 Neo둥근모 라이선스 본문을 스크롤해 확인한다.
- 모든 Docs 페이지에 `props.pointerEvents is deprecated` 경고가 나온다. 동작에는 영향이 없다.
- **(낮음, 재현 대기) 기록 화면 첫 진입 시 스타일이 빠진 채 그려짐 (2026-09-30 사용자 보고).** 시뮬레이터 콜드 스타트와 09:34 녹화에서는 재현되지 않았다. 후보: ① Fast Refresh 잔상, ② `PixelFrame`이 `onLayout`으로 크기를 받은 뒤에만 테두리·채움을 그림, ③ 폰트 대체. 재현되면 스크린샷으로 가린다. ②면 크기 전에도 배경을 먼저 칠한다.
- 복원 뒤 아직 받지 못한 사진(기기 경로 없음, 서버 경로만 있음)에 photo 항목이 생기면 서버의 하나뿐인 사본이 지워진다. 지금은 그런 경로가 없다. "사진 유실" 화면에 사진 지우기·바꾸기를 붙일 때 `src/sync/push.ts`의 `pushPhoto` 주석을 다시 본다.

**PRD 미확정인데 코드에 값이 들어간 것:** 튜토리얼 상태를 DB(사용자 범위)에 저장, `app.json`의 `userInterfaceStyle: "automatic"`.

## 10. 다음 작업 시 주의

- 코드 작성 전 [Expo 57 문서](https://docs.expo.dev/versions/v57.0.0/)를 읽는다. 현재 Expo ~57.0.24 / RN 0.86.3 / React·React DOM 19.2.3, React DOM override 유지.
- 의존성을 추가할 때는 `package.json`·`package-lock.json`을 백업하고, 설치 후 `npm ls react-dom --all`이 `19.2.3` 하나인지 확인한다.
- 작업 단위마다 main에서 브랜치를 따고(0절), main 기록은 브랜치 단위 `--no-ff` 병합으로 남긴다(2026-09-30에 이전 기록도 이 형태로 다시 정리했다. 정리 전 main은 태그 `backup/main-before-split`). 일괄 reset/복원/삭제 금지. 관련 없는 `.omc`, 앱 설정, 기존 계획을 건드리지 않는다.
- Storybook은 확정했지만 원본 이미지 시안(`review-set-02` 등)과 픽셀 단위로 일치한다는 뜻은 아니다. 폰트·프레임 치수·focus·단색 asset에서 오는 차이는 남아 있다.
