# 되풀이되는 함정과 확인 방법

한 번 크게 헤맨 뒤 알게 된 것만 적는다. 새로 헤맨 일이 생기면 여기에 더한다.

## 코드

- **`RetroScreen`을 감싸는 래퍼에는 높이가 필요하다.** `flex:1` + `ScrollView`라 부모 높이가 없으면 0으로 접혀 화면이 통째로 빈다.
- **`useSafeAreaInsets()`를 쓰지 않는다.** Provider 없이 렌더하는 테스트·Storybook에서 예외를 던진다. `SafeAreaInsetsContext`를 직접 읽고 없으면 0으로 둔다. iOS 시트 안은 `SheetSafeArea`가 위쪽을 0으로 준다(`app/_layout.tsx` `screenLayout`).
- **훅은 조건부 return보다 위에 둔다.** `app/index.tsx`는 로딩 / 튜토리얼 / 목표 없음 분기가 있어, 아래에 둔 훅은 새로 설치한 기기에서만 터진다. `npm run lint`가 잡는다.
- **PanResponder를 `useRef(...).current`로 만들지 않는다.** 첫 렌더 값을 가둔다. `useMemo`로 만든다.
- **네이티브 한 줄 입력에 `lineHeight`를 주지 않는다.** iOS가 글자를 아래로 붙인다. `PixelInput`이 처리한다.
- **뒤로가기는 `goBackOrHome`을 쓴다.** 딥링크로 연 화면은 스택이 없어 `router.back()`이 동작하지 않는다.
- **처음 크기를 `onLayout`에만 맡기지 않는다.** 새 아키텍처(Fabric)는 뷰가 화면에 붙기 전에 처리한 layout 이벤트를 버리고 같은 크기로는 다시 보내지 않는다. 기기가 바쁠 때(빌드 직후 첫 실행) 테두리·판이 크기 0으로 남았다. 크기를 받아야 그리는 뷰는 `useLayoutSize`(`components.tsx`)를 쓴다. 확인은 CPU 부하(`yes > /dev/null`를 코어 수만큼)를 건 채 콜드 스타트를 여러 번.
- **달력 키는 로컬 시간으로 만든다.** `toISOString()`은 자정 근처에서 하루를 민다. 칸 번호는 1부터, `slotIndex`는 0부터다.
- **SQLite는 WAL + `busy_timeout` 5초다** (`src/db/expoDriver.ts`). expo-sqlite의 배타 트랜잭션은 새 연결을 연다. 저널이 delete이고 대기가 0이면 위젯 동기화 읽기와 판 저장이 겹칠 때 「database is locked」로 판이 「···」에서 멈췄다. 트랜잭션 연결도 첫 쿼리 전에 `busy_timeout`을 건다.
- **위젯 props에 `null`을 넣지 않는다.** UserDefaults가 못 담아 `updateTimeline`이 던진다(`syncCore`의 `withoutNulls`가 막는다).
- RN Web의 `AccessibilityInfo.addEventListener`는 구독 객체를 돌려주지 않는다. 정리할 때 `?.remove?.()`로 부른다.
- 복원 뒤 아직 받지 못한 사진(기기 경로 없음, 서버 경로만 있음)에 photo 항목이 생기면 서버의 하나뿐인 사본이 지워진다. 지금은 그런 경로가 없다. 사진 지우기·바꾸기를 "사진 유실" 화면에 붙일 때 `src/sync/push.ts`의 `pushPhoto` 주석을 다시 본다.

## 의존성과 빌드

- **`package.json`의 `overrides: { "react-dom": "19.2.3" }`를 지우지 않는다.** 지우면 모든 설치가 ERESOLVE로 실패한다. `jest-expo`도 같은 충돌이라 `jest` + `ts-jest`를 쓴다. 의존성을 더할 때는 `package.json`·`package-lock.json`을 백업하고, 설치 뒤 `npm ls react-dom --all`이 `19.2.3` 하나인지 본다.
- **`ios/`가 이미 있는 체크아웃에서 빌드하면 옛 네이티브 프로젝트를 그대로 쓴다.** `ios/`는 git에 없고 `expo run:ios`는 폴더가 없을 때만 prebuild한다. 2026-10-10 main 체크아웃의 옛 `ios/`(위젯 타깃 없음)로 빌드하자 앱은 떴지만 위젯 동기화가 매번 `ExponentAsset-….png doesn't exist`로 실패했다. 빌드 전에 `npx expo prebuild --platform ios --clean`, 빌드 뒤 Metro 로그에서 `widget sync failed`를 찾는다.
- **expo-widgets를 올릴 때:** `npx expo prebuild --platform ios --clean` → iOS 빌드 → 위젯 편집 「목표」 확인. prebuild가 `widget-goal: … 자리를 못 찾았어요`로 멈추면 expo-widgets가 만드는 Swift 모양이 바뀐 것이니 `plugins/widget-goal/patch.js`와 fixture를 맞춘다.
- **expo-widgets 패치:** `patches/expo-widgets+57.0.22.patch`가 `WidgetUserInteraction.perform`의 `reloadTimelines(ofKind:)`를 뺀다(위젯 탭 속도). 버전을 올리면 `postinstall`의 patch-package가 실패하니, 새 버전 `ios/Widgets/AppIntent.swift`에서 같은 줄을 빼고 `npx patch-package expo-widgets`로 다시 만든다.
- **폰트 연결은 콜드 스타트로 확인한다.** Fast Refresh로 반영하면 이전 글자 폭이 재사용되어 끝 글자가 잘려 보인다. 시트 화면도 Fast Refresh 뒤 화면 전체로 펼쳐져 보인 적이 있다 — 레이아웃은 앱을 새로 켜서 본다.
- **워치 타깃이 있는 앱은 `-sdk iphonesimulator`로 빌드하지 않는다.** 워치 타깃까지 iOS용으로 빌드해 실패한다. `-destination 'generic/platform=iOS Simulator'`(또는 기기)만 준다(2026-10-16 워치 시험 구현).
- **시뮬레이터에서 폰 앱을 다시 설치하면 워치 앱도 다시 넣는다.** 안 그러면 폰의 WCSession이 `appInstalled: NO`로 남아 스냅샷을 보내지 않는다(2026-10-16).
- **Release 빌드는 RevenueCat 테스트 키를 보면 「Wrong API Key」 창을 띄우고 앱을 닫는다.** 시뮬레이터에서 Release로 확인할 때는 `EXPO_PUBLIC_REVENUECAT_KEY= xcodebuild …`처럼 키를 비워 빌드한다(결제는 꺼진다).
- **워치 컴플리케이션 번들 id는 워치 앱 id 아래여야 한다.** `@bacons/apple-targets`의 `watch-widget` 기본값(`com.novum.chagok.watch-widget`)은 설치 때 「does not have expected identifier prefix」로 거부된다. `targets/watch-widget/expo-target.config.js`에 `bundleIdentifier: 'com.novum.chagok.watch.widgets'`(2026-10-16).
- **EAS 빌드 Node는 이 Mac과 같게 둔다(`eas.json` `"node": "24.18.0"`).** EAS 기본은 Node 22(npm 10)인데, `@bacons/apple-targets` 안의 typescript 5 선택 의존성을 npm 10은 「잠금 파일에 없다」(`Missing: typescript@5.9.3 from lock file`)로 실패시키고 npm 11은 넘어간다(2026-10-17). 의존성을 바꾼 뒤 올리기 전에 깨끗한 복사본에서 `npm ci`로 확인한다.
- 개발 빌드는 Metro 주소를 기억한다. 다른 포트로 띄웠으면 `xcrun simctl openurl <UDID> "com.novum.chagok://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A<포트>"`로 연다.
- **탭 화면 밀기에 기기 쪽 모듈이 들어갔다(2026-10-17):** 아래 탭이 `expo-router/js-top-tabs` + `react-native-tab-view` + `react-native-pager-view`다. pager-view는 기기 쪽 코드라 이 변경 전에 만든 개발 빌드(폰, 시뮬레이터)로는 앱이 뜨지 않는다. 개발 빌드를 다시 만든다.
- **Animated: 기기 쪽 값과 JS 값을 한 뷰에 섞지 않는다(2026-10-17):** 탭 넘김 위치(`position`)는 기기 쪽에서 움직인다. 같은 뷰의 transform에 JS로 움직이는 값(`useNativeDriver: false`)을 같이 걸면, 그 값을 움직이는 순간 "Attempting to run JS driven animation on animated node that has been moved to native" 오류가 난다. 겹친 두 뷰로 나눈다(FloatingTabBar).
- **탭 넘김에서 옆 탭이 비어 보였다(2026-10-17):** 탭 화면이 `useFocusEffect`에서만 데이터를 읽으면, 미리 그려 둬도 처음 밀 때는 불러오는 중 화면이다. 기록, 스티커 탭은 처음 그릴 때도 한 번 읽는다.

## Storybook

- Storybook·vitest는 `react-native-safe-area-context`를 `src/index.tsx`로 별칭한다. 기본 진입점을 타면 RN Flow 문법에서 죽는다. SVG를 `optimizeDeps.exclude`로 돌리지 않는다.
- Storybook 래퍼 div는 높이가 auto라 `flex:1` 사슬이 끊긴다. 스크롤을 잴 때는 조상에 높이를 준다.
- **Docs는 한 파일의 스토리를 한 페이지에 모두 그린다.** 포커스를 옮기거나 위치를 재는 스토리는 반복 렌더링·스크롤 끌림을 일으킨다. 튜토리얼 스토리는 Docs에서 `autoFocus={false}`로 그리고, 측정 결과를 담는 context 값은 `useMemo`로 고정하고 같은 좌표면 상태를 바꾸지 않는다. 확인은 3초 동안의 DOM 변경 수(MutationObserver)와 스크롤 위치 — 정상이면 0, 0.
- 시안 캡처는 `scripts/review-*.mjs` 패턴을 따른다(`index.json`에서 스토리를 찾아 390·320px로 찍고 렌더 오류·가로 넘침을 기록). 제목에 `·`가 든 스토리 ID는 URL 인코딩해서 연다. 100% 배율, DPR 1로 본다.
- Playwright 모듈은 프로젝트 의존성이 아니라 임시 설치다. `MachPortRendezvousServer Permission denied`가 나오면 우회하지 말고 Chromium 실행 권한을 요청한다.
- 모든 Docs 페이지에 `props.pointerEvents is deprecated` 경고가 나온다. 동작에는 영향이 없다.

## 기기 테스트

- **실행 중인 Storybook·Metro를 임의로 끄지 않는다.** 다른 세션이 쓰고 있을 수 있다. 포트와 프로세스는 세션마다 다시 확인한다.
- **iPhone 시뮬레이터:** Maestro(`--device`로 UDID 지정). 카드·버튼 안 글자는 못 찾을 때가 많아 `point` 좌표로 누른다. iOS 가장자리 스와이프는 제스처로 인식되지 않는다. 시뮬레이터는 Mac 네트워크를 써서 iOS 오프라인은 볼 수 없다. Debug 빌드는 Expo 톱니 버튼이 화면 오른쪽 가운데에 떠 있다.
- **Maestro로 iOS 위젯 추가:** 홈 화면 메뉴 글자가 잡히지 않는다. 길게 누르기(50%,85%) → 편집 → 18%,10% → "위젯 검색"을 기다린다. home 키 뒤에는 두 번째 페이지에 서므로 오른쪽으로 넘긴 뒤 위젯을 누른다.
- **위젯 탭 속도:** chronod 로그로 단계별로 잰다. Release 빌드로 잰다.
- **Android:** 이 저장소 전용 에뮬레이터 `Chagok_Pixel_7`(포트 5556). `Pixel_7`은 다른 프로젝트와 같이 쓴다. 조작은 `adb shell input tap`·`screencap`, 비행기 모드는 `cmd connectivity airplane-mode enable`.
- **개발 서버 계정:** 계정을 지우면 `npm run server:dev-user`로 개발 계정을 다시 만든다. "이 기기 기록 사용하기"는 서버 테스트 기록을 덮어쓰므로 하기 전에 묻는다.
- **시간대 바꿔 보기 (2026-10-12):** iOS 시뮬레이터는 `SIMCTL_CHILD_TZ=Pacific/Kiritimati xcrun simctl launch --terminate-running-process <UDID> com.novum.chagok` 뒤 개발 서버 주소를 `openurl`로 연다(시뮬레이터 전체 시간대는 Mac을 따른다). Android 에뮬레이터는 `adb shell service call alarm 3 s16 Pacific/Kiritimati`, 끝나면 `Asia/Seoul`로 되돌리고 `settings put global auto_time_zone 1`. 한국 밤 시각에 날짜가 바뀌는 곳은 키리바시(UTC+14), 낮이면 LA.
- **기기 DB 구조가 다른 코드끼리 섞지 않는다:** 출시 전에는 구조를 바꿀 때 v1을 고치고 앱 데이터를 지운다(DEV-SETUP 「개발 서버」). 구조를 바꾼 브랜치로 연 기기를 다른 브랜치·main 코드로 열면 테이블이 맞지 않아 깨진다 — 앱 데이터를 지우고 연다(iOS 시뮬레이터: `simctl get_app_container <UDID> com.novum.chagok data`의 Documents·Library를 비움, Android: `adb shell pm clear com.novum.chagok`, 실기기: 앱 삭제 후 다시 설치).
- **`supabase db reset --linked`가 `public.change_seq` 시퀀스를 남긴다(2026-10-12):** 첫 마이그레이션이 `create sequence if not exists`라 다시 적용해도 된다. 예전처럼 "already exists"가 나면 `supabase db query --linked "drop sequence public.change_seq"` 뒤 다시 리셋한다.
- **`deno check`는 저장소 안에서 돌리면 끝나지 않는다(2026-10-15):** 루트 `package.json`·`node_modules`를 읽으려다 멈춘다(import 없는 파일도 4분 넘게). `supabase/functions`의 `_shared`와 확인할 함수 폴더를 빈 임시 폴더에 복사해서 그 안에서 `deno check <함수>/index.ts`를 돌리면 1분 안에 끝난다.
- **Apple 코드 교환의 `invalid_client` (2026-10-17):** 서버 secret 네 개와 키 설정(Keys → Sign In with Apple → `AQUDD2QFNC.com.novum.chagok`)이 맞는데도 첫 로그인에서 `apple-link`가 `invalid_client`로 실패했다가, 몇 분 뒤 같은 설정으로 성공했다. 키를 만들거나 고친 직후라면 잠시 뒤 다시 해 본다. 가짜 코드나 가짜 토큰으로는 서명이 맞는지 가릴 수 없다 — Apple은 키 ID가 틀려도 가짜 코드에 `invalid_grant`, 폐기에 200을 준다. 확인은 진짜 코드로만 된다. 실패 이유는 개발 빌드의 Metro 로그 `[connect] failed`에 함수 응답 본문째 나온다.
