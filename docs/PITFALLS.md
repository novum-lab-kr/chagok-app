# 되풀이되는 함정과 확인 방법

한 번 크게 헤맨 뒤 알게 된 것만 적는다. 새로 헤맨 일이 생기면 여기에 더한다.

## 코드

- **한 화면 안에서 다른 화면으로 바꿔 끼우면 `useFocusEffect`가 다시 돌지 않는다**(2026-10-22). 목표 탭은 시작 화면을 같은 자리에 띄우는데, 그동안 탭은 계속 포커스 상태라 복원이 끝나도 목록을 다시 읽지 않아 빈 목록이 남았다(다른 탭에 갔다 와야 보임). 바꿔 끼운 화면이 데이터를 바꾸면 끝날 때 다시 읽게 신호를 준다(`reload`).

- **`RetroScreen`을 감싸는 래퍼에는 높이가 필요하다.** `flex:1` + `ScrollView`라 부모 높이가 없으면 0으로 접혀 화면이 통째로 빈다.
- **`useSafeAreaInsets()`를 쓰지 않는다.** Provider 없이 렌더하는 테스트·Storybook에서 예외를 던진다. `SafeAreaInsetsContext`를 직접 읽고 없으면 0으로 둔다. iOS 시트 안은 `SheetSafeArea`가 위쪽을 0으로 준다(`app/_layout.tsx` `screenLayout`).
- **훅은 조건부 return보다 위에 둔다.** `app/(tabs)/index.tsx`는 로딩 / 튜토리얼 / 목표 없음 분기가 있어, 아래에 둔 훅은 새로 설치한 기기에서만 터진다. `npm run lint`가 잡는다.
- **PanResponder를 `useRef(...).current`로 만들지 않는다.** 첫 렌더 값을 가둔다. `useMemo`로 만든다.
- **네이티브 한 줄 입력에 `lineHeight`를 주지 않는다.** iOS가 글자를 아래로 붙인다. `PixelInput`이 처리한다.
- **뒤로가기는 `goBackOrHome`을 쓴다.** 딥링크로 연 화면은 스택이 없어 `router.back()`이 동작하지 않는다.
- **처음 크기를 `onLayout`에만 맡기지 않는다.** 새 아키텍처(Fabric)는 뷰가 화면에 붙기 전에 처리한 layout 이벤트를 버리고 같은 크기로는 다시 보내지 않는다. 기기가 바쁠 때(빌드 직후 첫 실행) 테두리·판이 크기 0으로 남았다. 크기를 받아야 그리는 뷰는 `useLayoutSize`(`components.tsx`)를 쓴다. 확인은 CPU 부하(`yes > /dev/null`를 코어 수만큼)를 건 채 콜드 스타트를 여러 번.
- **달력 키는 로컬 시간으로 만든다.** `toISOString()`은 자정 근처에서 하루를 민다. 칸 번호는 1부터, `slotIndex`는 0부터다.
- **SQLite는 WAL + `busy_timeout` 5초다** (`src/db/expoDriver.ts`). expo-sqlite의 배타 트랜잭션은 새 연결을 연다. 저널이 delete이고 대기가 0이면 위젯 동기화 읽기와 판 저장이 겹칠 때 「database is locked」로 판이 「···」에서 멈췄다. 트랜잭션 연결도 첫 쿼리 전에 `busy_timeout`을 건다.
- **로그아웃과 계정 삭제는 결제 계정을 익명으로 돌린 뒤 기기를 비운다**(보안 검토 2026-11-02 L1). 반대로 하면 비운 기기에 앞 계정의 구독이 다시 적힌다. 순서는 `src/app-data/signOut.ts`의 `signOutAndWipe` 한곳에만 있고 `__tests__/signOut.test.ts`가 지킨다. 화면에서 단계를 따로 부르지 않는다.
- **위젯과 워치는 같은 계산을 따로 한다.** `src/widgets`와 `src/watch`에 앱 상태 감지, 요청 중복 제거, 달력 칸, 잠김 계산이 두 벌 있다. 한쪽만 고치면 위젯과 워치가 다르게 보인다.
- **위젯 props에 `null`을 넣지 않는다.** UserDefaults가 못 담아 `updateTimeline`이 던진다(`syncCore`의 `withoutNulls`가 막는다).
- RN Web의 `AccessibilityInfo.addEventListener`는 구독 객체를 돌려주지 않는다. 정리할 때 `?.remove?.()`로 부른다.
- 복원 뒤 아직 받지 못한 사진(기기 경로 없음, 서버 경로만 있음)에 photo 항목이 생기면 서버의 하나뿐인 사본이 지워진다. 지금은 그런 경로가 없다. 사진 지우기·바꾸기를 "사진 유실" 화면에 붙일 때 `src/sync/push.ts`의 `pushPhoto` 주석을 다시 본다.
- **iOS는 떠 있는 Modal 옆에 둔 Modal을 띄우지 못한다(2026-10-21).** 조용히 아무것도 안 뜬다. 시트(`PixelBottomSheet`) 위에 다이얼로그를 띄우려면 `overlay`로 시트 Modal 안에 그린다. 닫히는 중인 창 위에 띄우는 것도 같은 이유로 실패한다(`useDialog`).
- **마이그레이션 끝의 `revoke execute on all functions in schema private`는 정책이 쓰는 함수 권한까지 거둬 간다**(2026-11-06). `goals`, `invites` 정책이 `private.can_see_goal`, `private.is_owner`를 부르므로 이 줄 바로 뒤에 `grant execute on function private.can_see_goal(uuid), private.is_owner(uuid) to authenticated;`를 늘 붙인다. 빠뜨리면 로그인 사용자가 목표를 읽을 때 permission denied가 난다(`20261106000003`에서 고침).
- **IP로 세는 서버 제한은 앞단 구성에 기댄다**(2026-11-06). 운영 API는 CDN 없이 Caddy가 맨 앞이라 `X-Forwarded-For` 첫 값이 실제 접속 주소다. CDN 프록시를 켜거나 웹 서버가 대신 부르게 바꾸면 모두가 몇 개 주소로 묶여 초대 미리보기 제한이 모두를 막는다. 개발 서버(Supabase 클라우드)는 이 머리글을 꾸밀 수 있다.

## 의존성과 빌드

- **새 worktree에는 git 밖 파일이 없다.** `src/design-system/apple-siwa-logo.generated.ts`가 없으면 타입 검사(TS2307), 린트(import/no-unresolved), 컴포넌트 테스트 3개가 실패한다. 다른 체크아웃에서 복사하거나 [개발 설정](DEV-SETUP.md) 「Apple 로그인 버튼 로고」대로 만든다. `.env.local`과 `node_modules`도 링크한다.
- **새 고정 라우트를 더하면 `.expo/types/router.d.ts`를 다시 만들어야 타입 검사가 통과한다(2026-11-05, `app/settings/blocked.tsx`).** 이 파일은 git이 무시하고 Metro가 만든다. 이미 `.expo/types`가 있는 체크아웃(main 등)은 Metro를 한 번 띄우거나 Expo 타입 생성을 돌리기 전까지 `router.push('/settings/blocked')` 같은 줄에서 TS2345로 실패한다. `[id]` 같은 동적 라우트 아래로 들어가는 주소(`/goal/together`)는 이미 맞는 꼴이 있어 실패하지 않는다.
- **`package.json`의 `overrides: { "react-dom": "19.2.3" }`를 지우지 않는다.** 지우면 모든 설치가 ERESOLVE로 실패한다. `jest-expo`도 같은 충돌이라 `jest` + `ts-jest`를 쓴다. 의존성을 더할 때는 `package.json`·`package-lock.json`을 백업하고, 설치 뒤 `npm ls react-dom --all`이 `19.2.3` 하나인지 본다.
- **`ios/`가 이미 있는 체크아웃에서 빌드하면 옛 네이티브 프로젝트를 그대로 쓴다.** `ios/`는 git에 없고 `expo run:ios`는 폴더가 없을 때만 prebuild한다. 2026-10-10 main 체크아웃의 옛 `ios/`(위젯 타깃 없음)로 빌드하자 앱은 떴지만 위젯 동기화가 매번 `ExponentAsset-….png doesn't exist`로 실패했다. 빌드 전에 `npx expo prebuild --platform ios --clean`, 빌드 뒤 Metro 로그에서 `widget sync failed`를 찾는다.
- **expo-widgets를 올릴 때:** `npx expo prebuild --platform ios --clean` → iOS 빌드 → 위젯 편집 「목표」 확인. prebuild가 `widget-goal: … 자리를 못 찾았어요`로 멈추면 expo-widgets가 만드는 Swift 모양이 바뀐 것이니 `plugins/widget-goal/patch.js`와 fixture를 맞춘다.
- **expo-widgets 패치:** `patches/expo-widgets+57.0.22.patch`가 `WidgetUserInteraction.perform`의 `reloadTimelines(ofKind:)`를 뺀다(위젯 탭 속도). 버전을 올리면 `postinstall`의 patch-package가 실패하니, 새 버전 `ios/Widgets/AppIntent.swift`에서 같은 줄을 빼고 `npx patch-package expo-widgets`로 다시 만든다.
- **폰트 연결은 콜드 스타트로 확인한다.** Fast Refresh로 반영하면 이전 글자 폭이 재사용되어 끝 글자가 잘려 보인다. 시트 화면도 Fast Refresh 뒤 화면 전체로 펼쳐져 보인 적이 있다 — 레이아웃은 앱을 새로 켜서 본다.
- **워치 타깃이 있는 앱은 `-sdk iphonesimulator`로 빌드하지 않는다.** 워치 타깃까지 iOS용으로 빌드해 실패한다. `-destination 'generic/platform=iOS Simulator'`(또는 기기)만 준다(2026-10-16 워치 시험 구현).
- **시뮬레이터에서 폰 앱을 다시 설치하면 워치 앱도 다시 넣는다.** 안 그러면 폰의 WCSession이 `appInstalled: NO`로 남아 스냅샷을 보내지 않는다(2026-10-16).
- **Release 빌드는 RevenueCat 테스트 키를 보면 「Wrong API Key」 창을 띄우고 앱을 닫는다.** 시뮬레이터에서 Release로 확인할 때는 `EXPO_PUBLIC_REVENUECAT_KEY= xcodebuild …`처럼 키를 비워 빌드한다. 그러면 결제는 개발용 대역이 맡고, 누를 때마다 성공, 실패, 보호자 승인 대기, 취소를 고르는 「시험 결제」 창이 뜬다(2026-11-02, 전에는 바로 성공했다).
- **개발 모드 Metro는 `.env*` 파일 값이 셸 환경 변수보다 앞선다(2026-11-02).** `KEY= npx expo start`로는 `.env.local`의 결제 키를 비우지 못한다. 키 없이 띄우려면 그 worktree에 `EXPO_PUBLIC_REVENUECAT_KEY=` 한 줄만 든 `.env.development.local`을 두고(git이 무시한다), 끝나면 지운다. Metro 로그에 `[RevenueCat]`이 보이면 아직 키가 들어간 것이다.
- **Debug `expo run:ios`와 실기기 `xcodebuild`도 `SENTRY_DISABLE_AUTO_UPLOAD=true`가 있어야 끝까지 빌드된다(2026-11-02).** 없으면 소스맵 올리기에서 실패한다.
- **새 번들 id로 폰에 처음 깔면 위젯 추가 목록에 안 나올 수 있다(2026-11-04, 차곡 개발).** 빌드 안 위젯 확장과 서명이 맞으면 폰을 재시동한다. 재시동 뒤 바로 나왔다.
- **워치 컴플리케이션 번들 id는 워치 앱 id 아래여야 한다.** `@bacons/apple-targets`의 `watch-widget` 기본값(`com.novumlab.chagok.watch-widget`)은 설치 때 「does not have expected identifier prefix」로 거부된다. `targets/watch-widget/expo-target.config.js`에 `bundleIdentifier: 'com.novumlab.chagok.watch.widgets'`(2026-10-16).
- **EAS 빌드 Node는 이 Mac과 같게 둔다(`eas.json` `"node": "24.18.0"`).** EAS 기본은 Node 22(npm 10)인데, `@bacons/apple-targets` 안의 typescript 5 선택 의존성을 npm 10은 「잠금 파일에 없다」(`Missing: typescript@5.9.3 from lock file`)로 실패시키고 npm 11은 넘어간다(2026-10-17). 의존성을 바꾼 뒤 올리기 전에 깨끗한 복사본에서 `npm ci`로 확인한다.
- 개발 빌드는 Metro 주소를 기억한다. 다른 포트로 띄웠으면 `xcrun simctl openurl <UDID> "exp+chagok://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A<포트>"`로 연다.
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

- **Maestro로 웹 로그인 창(카카오, Google)을 다룬 뒤 맥에 「SafariViewService 응용 프로그램이 예기치 않게 종료」가 뜰 수 있다**(2026-10-22). 충돌 지점이 `XCTAutomationSupport`라 자동 조작 도구 때문이고 앱 문제가 아니다. [무시]로 닫는다. 충돌 기록은 `~/Library/Logs/DiagnosticReports/SafariViewService-*.ips`.
- **시뮬레이터에 Apple 계정이 없으면 Apple 로그인이 「Apple 계정에 로그인」 안내를 띄우고, [닫기]는 취소가 아니라 `ERR_REQUEST_UNKNOWN`으로 온다**(2026-10-22). 연결 화면은 이때 「연결하지 못했어요 / 다시 시도해 주세요.」를 띄운다. 실제 Apple 로그인 확인은 실기기로 한다.

- **실행 중인 Storybook·Metro를 임의로 끄지 않는다.** 다른 세션이 쓰고 있을 수 있다. 포트와 프로세스는 세션마다 다시 확인한다.
- **worktree를 바꿔 Metro를 띄우면 `--clear`를 붙인다(2026-10-21).** worktree들이 `node_modules`를 같이 쓰면 Metro가 다른 worktree에서 만든 캐시를 그대로 써서 `./chagok-wt-<다른 이름>/src/db/expoDriver`를 찾다가 「목표를 불러오지 못했어요」가 뜬다. 첫 번들이 2초 안에 끝나면 캐시를 쓴 것이다.
- **`npx expo run:ios`는 빌드 뒤에도 끝나지 않는다.** Metro를 계속 띄워 두기 때문이다. 끝나기를 기다리지 말고 로그의 `Build Succeeded`, `iOS Bundled`로 확인한다.
- **iPhone 시뮬레이터:** Maestro(`--device`로 UDID 지정). 카드·버튼 안 글자는 못 찾을 때가 많아 `point` 좌표로 누른다. iOS 가장자리 스와이프는 제스처로 인식되지 않는다. 시뮬레이터는 Mac 네트워크를 써서 iOS 오프라인은 볼 수 없다. Debug 빌드는 Expo 톱니 버튼이 화면 오른쪽 가운데에 떠 있다. 홈의 [+] 위쪽을 가려 누르면 아무 일도 없을 때가 있다 — `xcrun simctl openurl <UDID> chagok://goal/new`로 연다(「열겠습니까?」에서 「열기」).
- **Maestro로 iOS 위젯 추가:** 홈 화면 메뉴 글자가 잡히지 않는다. 길게 누르기(50%,85%) → 편집 → 18%,10% → "위젯 검색"을 기다린다. home 키 뒤에는 두 번째 페이지에 서므로 오른쪽으로 넘긴 뒤 위젯을 누른다.
- **위젯 탭 속도:** chronod 로그로 단계별로 잰다. Release 빌드로 잰다.
- **Android:** 이 저장소 전용 에뮬레이터 `Chagok_Pixel_7`(포트 5556). `Pixel_7`은 다른 프로젝트와 같이 쓴다. 조작은 `adb shell input tap`·`screencap`, 비행기 모드는 `cmd connectivity airplane-mode enable`. `adb devices`가 `unauthorized`면 콜드 부팅(`-no-snapshot-load`). `expo run:android --device`는 AVD 이름을 받고 `--port`와 `--no-bundler`를 같이 못 쓴다 — Metro를 따로 띄우고 `adb reverse tcp:<포트> tcp:<포트>`. Debug 빌드의 Expo 「Tools」 버튼이 홈 [앱 설정]을 가리면 `adb shell am start -a android.intent.action.VIEW -d chagok://settings com.novumlab.chagok`. 키보드 대신 세로 도구 막대가 뜨면 Gboard 손글씨 모드라 `adb shell settings put secure stylus_handwriting_enabled 0`. 탭 크기는 `uiautomator dump`의 px ÷ 2.625 = dp. 에뮬레이터는 개발 계정으로 로그인돼 있어 붙인 것이 `chagok-dev`에 백업된다 — 시험한 것은 되돌린다.
- **개발 서버 계정:** 계정을 지우면 `npm run server:dev-user`로 개발 계정을 다시 만든다. "이 기기 기록 사용하기"는 서버 테스트 기록을 덮어쓰므로 하기 전에 묻는다.
- **시간대 바꿔 보기 (2026-10-12):** iOS 시뮬레이터는 `SIMCTL_CHILD_TZ=Pacific/Kiritimati xcrun simctl launch --terminate-running-process <UDID> com.novumlab.chagok` 뒤 개발 서버 주소를 `openurl`로 연다(시뮬레이터 전체 시간대는 Mac을 따른다). Android 에뮬레이터는 `adb shell service call alarm 3 s16 Pacific/Kiritimati`, 끝나면 `Asia/Seoul`로 되돌리고 `settings put global auto_time_zone 1`. 한국 밤 시각에 날짜가 바뀌는 곳은 키리바시(UTC+14), 낮이면 LA.
- **기기 DB 구조가 다른 코드끼리 섞지 않는다:** 2026-11-05 함께 목표를 1.1.0에 넣으면서 `MIGRATIONS`의 v1을 다시 썼고, 옛 구조 기기 DB는 `client.ts`가 지우고 새로 만든다. 1.0이 이미 공개돼 있어 이 지우기는 1.0 설치 수 확인을 거친다([1.1.0 출시 순서](RELEASE-1.1.0.md) 「1.0 기기 DB 관문」). 1.1.0부터는 `MIGRATIONS` 끝에 새 판을 더한다(DEV-SETUP 「개발 서버」). 구조를 바꾼 브랜치로 연 기기를 다른 브랜치·main 코드로 열면 테이블이 맞지 않아 깨진다 — 앱 데이터를 지우고 연다(iOS 시뮬레이터: `simctl get_app_container <UDID> com.novumlab.chagok data`의 Documents·Library를 비움, Android: `adb shell pm clear com.novumlab.chagok`, 실기기: 앱 삭제 후 다시 설치).
- **`npm run test:server`를 한 번에 다 돌리면 `AuthApiError: Request rate limit reached`로 무더기 실패한다(2026-11-04):** 개발 서버의 로그인과 가입 한도가 5분에 30번인데, 서버 시험은 사용자를 80명쯤 만들고 로그인한다. SQL 문제가 아니다. 파일을 묶어 30번 안쪽으로 나눠 돌리고 사이에 5분 반을 쉰다(`sharedGoals.test.ts`는 `-t`로 네 개씩). Management API의 `rate_limit_verify`, `rate_limit_otp`를 올려도 이 한도는 풀리지 않았다(바로 되돌림).
- **`npm run test:server -- <파일>`도 `__tests__/server` 전체를 돌린다(2026-11-05):** 스크립트가 폴더를 먼저 넘겨서 파일 인자를 붙여도 모든 서버 시험이 돌아 위 로그인 한도에 걸린다. 파일 하나만 돌리려면 env를 직접 읽고 jest를 부른다: `set -a; . ./.secrets/server-test.env; set +a; npx jest --runInBand __tests__/server/<파일>`. 한 파일이 커서 한도를 넘으면(`sharedGoals.test.ts`) 5분 기다린 뒤 `-t`로 나눠 돌린다.
- **`supabase db reset --linked`가 `public.change_seq` 시퀀스를 남긴다(2026-10-12):** 서버 리셋은 2026-11-05가 마지막이라 이제 만날 일이 드물다. 새 기준 파일(`20261105000001_core.sql`)도 `create sequence if not exists`라 다시 적용해도 된다.
- **`deno check`는 저장소 안에서 돌리면 끝나지 않는다(2026-10-15):** 루트 `package.json`·`node_modules`를 읽으려다 멈춘다(import 없는 파일도 4분 넘게). `supabase/functions`의 `_shared`와 확인할 함수 폴더를 빈 임시 폴더에 복사해서 그 안에서 `deno check <함수>/index.ts`를 돌리면 1분 안에 끝난다.
- **Apple 코드 교환의 `invalid_client` (2026-10-17):** 서버 secret 네 개와 키 설정(Keys → Sign In with Apple → `AJ7LJPM82M.com.novumlab.chagok`)이 맞는데도 첫 로그인에서 `apple-link`가 `invalid_client`로 실패했다가, 몇 분 뒤 같은 설정으로 성공했다. 키를 만들거나 고친 직후라면 잠시 뒤 다시 해 본다. 가짜 코드나 가짜 토큰으로는 서명이 맞는지 가릴 수 없다 — Apple은 키 ID가 틀려도 가짜 코드에 `invalid_grant`, 폐기에 200을 준다. 확인은 진짜 코드로만 된다. 실패 이유는 개발 빌드의 Metro 로그 `[connect] failed`에 함수 응답 본문째 나온다.

## iOS에서 모달을 겹치면 터치만 막힌다

다른 모달이 떠 있거나 닫히는 중에 새 모달을 띄우면 빨간 화면 없이 화면이 터치를 받지 않는다(2026-11-01, 동의 시트와 판 완성 창). 로그에서 `Attempt to present`를 찾으면 드러난다. 띄우기 전에 `useDialog`의 `dialogOpen`을 본다. Maestro로는 0.6초 안의 연타가 재현되지 않으니, 타이머로 뜨는 모달은 연타 경로까지 확인한다.

## 판 상세는 flex:1로 남은 높이를 잴 수 없다

`RetroScreen scrollable={false}`의 본문 열은 `flexShrink:1`뿐이라 높이가 내용만큼이다. 그 안에 `flex:1` View를 두면 높이 0으로 접혀 판 전체가 사라진다(2026-11-03, 쪽 넘기기 첫 구현). 남은 높이는 화면 루트와 판을 `measureInWindow`로 재서 계산한다. jsdom 컴포넌트 테스트에는 레이아웃이 없어 이런 붕괴가 통과하니, 레이아웃을 바꾸면 시뮬레이터 첫 화면에서 `maestro hierarchy`로 칸 요소가 있는지 본다.

## 앱에 새 권한(entitlement)을 넣으면 출시 빌드가 프로필에서 막힌다 (2026-11-06)

`app.json`에 `ios.associatedDomains`(초대 링크)를 넣은 뒤 `eas build --non-interactive`가 「Provisioning profile ... doesn't include the Associated Domains capability」로 2분 만에 실패했다. EAS는 Apple 계정에 로그인한 대화형 빌드에서만 App ID 권한을 맞추고 프로필을 새로 만든다. 저장된 App Store Connect API 키(제출용)로는 하지 않는다.

- 새 권한을 더한 첫 출시 빌드는 사용자가 터미널에서 `npx eas-cli build -p ios --profile production --auto-submit`을 대화형으로 돌리고 Apple ID로 로그인한다.
- 그 뒤 빌드는 다시 `--non-interactive`로 돌려도 된다.
