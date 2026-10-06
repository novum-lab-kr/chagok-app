# 위젯 시험 구현(spike) 결과

2026-10-05 · [계획](../plans/2026-10-05-widget-spike.md) · 관련: [PRD 4.10](../../PRD.md), [위젯 설계](2026-09-30-home-widget-design.md)

spike 코드는 브랜치 `spike/widgets`(worktree `chagok-wt-widgets`)에 있고 main에 합치지 않는다. 이 문서와 스크린샷(`docs/design/widget-spike/`)만 남긴다.
환경: iPhone 16 Pro 시뮬레이터(iOS 26, Xcode 27), Android `Pixel_7` 에뮬레이터(API 36). `expo-widgets` 57.0.22(+`@expo/ui` 57.0.21), `react-native-android-widget` 0.22.1. 실기기는 보지 않았다.

## 한 줄 요약

**Swift를 직접 쓰지 않아도 된다.** iOS는 `expo-widgets`의 버튼이 위젯 안 JS로 새 값을 계산해 App Group에 저장하고, 앱은 나중에 `getTimeline()`으로 그것을 읽는다 — 앱이 꺼져 있어도. Android는 `widgetTaskHandler`가 같은 일을 JS로 한다. 픽셀 글꼴은 두 플랫폼 모두 들어가지만 iOS는 **설정 플러그인 하나**(글꼴 파일을 위젯 확장에 넣기)가 필요하다. 위젯마다 **목표 고르기는 iOS에서 그대로는 안 된다**(선택지가 빌드 때 고정) — 결정이 필요하다.

## iOS (`expo-widgets`)

| # | 확인 | 판정 | 근거 |
|---|---|---|---|
| I1 | 링(작은)·달력(중간) 위젯이 실제 스냅샷으로 그려지는가 | **된다** | `i1-ring-gallery.png`, `i1-ring-home.png`, `i1-board-home.png`. 앱이 `loadWidgetSnapshot` → `updateSnapshot`/`updateTimeline`. 위젯 레이아웃은 앱이 한 번 실행될 때 App Group에 등록된다(설치 직후 앱을 열기 전에는 빈 위젯). |
| I2 | 글꼴 | **조건부** | 글꼴 이름만 주면 시스템 글꼴로 대체된다(`i2-font-system.png`). 위젯 확장 타깃에 `neodgm-1.601.ttf`를 리소스로 넣고 확장 `Info.plist`에 `UIAppFonts`를 추가하면 `font({ family: 'NeoDunggeunmo' })`가 **Neo둥근모로 그려진다**(`i2-font-neodgm.png`, `i5-ring-ivory-neodgm.png`). spike는 `ios/`를 손으로 고쳤다 — 본 구현은 이 두 가지를 하는 **로컬 설정 플러그인**으로 만든다(Swift 아님). Expo 문서의 "No custom fonts"는 플러그인이 해 주지 않는다는 뜻이다. |
| I3 | PNG 스티커 | **된다** | 앱이 PNG를 `widgetsDirectory`(App Group)에 복사 → `Image uiImage`로 그림. 크기 조절에 `resizable()` 필수(없으면 원본 크기로 넘침). 스티커 SVG path(1px 사각형)는 **외부 도구 없이 Node `zlib`만으로 PNG로 굽는 스크립트**로 충분했다(`scripts/spike-sticker-png.mjs`, 56px × 4). 새싹이는 `src/design-system/assets/sprout.ts` 형식이 달라 따로 처리해야 한다. |
| I4 | 딥링크 | **된다**(조건부) | 판 밖을 누르면 `widgetURL('chagok://goal/{id}')`로 판 상세가 열린다(앱이 켜져 있을 때, `i4-deeplink-goal.png`). 앱이 꺼진 상태에서는 개발 빌드 런처가 먼저 떠서 확인하지 못했다 — 출시 빌드(TestFlight)에서 다시 본다. |
| I5 | 위젯마다 목표 고르기 | **조건부 — 결정 필요** | 위젯 편집(길게 누르기 → 위젯 편집)에 설정 항목이 나오고 값이 위젯에 반영된다(`i5-edit.png`, `i5-ring-ivory-neodgm.png` — 바탕 아이보리·글꼴). 하지만 `expo-widgets` 설정 항목은 `string`·`number`·`boolean`·`enum`뿐이고 **enum 값은 빌드 때 고정**이다. 사용자의 목표 목록을 보여 주려면 `AppEntity`+`EntityQuery`(Swift)가 필요하고, 플러그인이 위젯 Swift 파일을 매번 생성하므로 그 파일을 고치는 설정 플러그인까지 필요하다. |
| I6 | 위젯에서 붙이기 — 앱이 나중에 읽을 수 있나 | **된다 (Swift 불필요)** | 버튼 `onPress`는 위젯 확장 안의 JS에서 돌고(`new Date()` 사용 가능), 돌려준 props가 App Group의 타임라인(`__expo_widgets_<이름>_timeline`)에 저장되며 위젯이 바로 다시 그려진다. **앱 프로세스가 없는 상태**에서 링을 두 번 눌러 요청 2개(`{goalId, at, dateKey}`)가 쌓였고, 앱을 열자 `getTimeline()`으로 둘 다 읽었다(`i6-ring-after-tap.png`, `i6-ring-app-off.png`, `i6-board-tap.png` — 오늘 칸 즉시 채움). 소스 근거: `expo-widgets/ios/Widgets/AppIntent.swift` `WidgetUserInteraction`. |
| I7 | 투명·틴트 모드, 기본 모드 유리 | **틴트: 된다 / 유리 직접 선택: 안 된다** | 홈 화면 「사용자화 → 틴트 처리됨」에서 시스템이 바탕을 바꾸고 링·스티커·글자가 보인다(`widgetRenderingMode = accented`, `i7-tinted.png`). 스티커에 `widgetAccentedRenderingMode('accentedDesaturated')` — 단 버튼 안에서는 탭을 막는다(아래 2026-10-06). 기본 모드에서 `containerBackground({ type: 'material' })`는 비치는 유리가 아니라 **불투명한 연회색**으로 그려진다(`i7-glass.png`). 이 iOS의 사용자화 메뉴에는 라이트·다크·자동·틴트만 있었다. |
| I8 | 갱신 | **된다** | 앱을 열면 1초 안에 위젯이 바뀐다. `updateTimeline`으로 자정 항목을 함께 넣을 수 있다(타임라인 2개 저장 확인). |

**iOS에서 본 구현에 넘길 주의점**

- **버튼은 지금 보이는 타임라인 항목만 고친다.** 자정 항목은 그대로라, 붙인 뒤 자정이 지나면 앱을 열 때까지 붙이기 전 모습으로 돌아갈 수 있다. 앱을 열 때 다시 맞추거나, 버튼이 쌓는 요청을 모든 항목에 반영하는 방식을 정해야 한다.
- **앱이 타임라인을 덮어쓰기 전에 먼저 읽어야 한다.** `getTimeline()`(요청 읽기) → 기록 저장 → `updateTimeline()`(새 스냅샷) 사이에 사용자가 위젯을 누르면 그 요청이 덮여 사라진다. 창은 짧지만, 읽은 요청 id를 새 스냅샷에도 남기거나 쓰기 직전에 한 번 더 읽는 식으로 막는다.
- 위젯 안 JS는 함수 하나 안에서만 돈다. 바깥 상수·함수를 참조할 수 없다(색 값은 위젯 함수 안에 다시 쓴다).
- 자동화: Maestro로 홈 화면 편집·위젯 추가·위젯 버튼 누르기·위젯 편집까지 된다(짧게 길게 누르기는 `swipe` 같은 점 `duration: 900`). `tapOn point`의 퍼센트는 **정수만** 받는다(`27.6%`는 실패).

### 2026-10-06 확정 스타일 적용 (PRD 4.10)

목표 하나(작은)·이번 달(중간)에 확정 스타일을 넣었다 — 큰 %, 차곡이 + 말풍선(`Ready?`/`Nice!`/`Done!`), 이름 두 줄, 컬러 스티커(48pt, 안 붙인 날은 흐린 회색). 그림은 `scripts/spike-widget-art.mjs`가 PNG로 굽는다(컬러 스티커·차곡이 얼굴·말풍선 틀 4벌). 위젯 설정 바탕은 아이보리/흰색.

| 확인 | 결과 |
|---|---|
| 스티커 누르기 | **된다** — 목표 하나 60%→61%·`Nice!`·컬러 스티커(`i8-style-ring-after-tap.png`), 이번 달은 오늘 칸에 붙음(`i8-style-board-after-tap.png`). 연속 5번 모두 앱이 열리지 않았다. |
| 말풍선 글자 | 픽셀로 재서 맞춤: 글자 `offset({ x: 0.5, y: -1.5 })` → 테두리와의 간격 좌우 54/55px, 위아래 20/24px(`Nice!`, @3x). |
| 이번 달 폭 | 칸 24pt면 달력이 넓어 왼쪽(%·이름)이 잘린다. 칸 22×20pt·간격 2pt·왼쪽은 남는 폭(`maxWidth`)으로 맞췄다. 6주짜리 달도 높이 안에 든다(계산). |

- **버튼 안 이미지에 `widgetAccentedRenderingMode`를 걸면 버튼이 탭을 받지 못한다.** 탭이 아래로 빠져 `widgetURL`(없으면 기본 "앱 열기")이 실행된다. 로그로는 `Launching from widgetURL`만 보인다. 버튼만 남긴 위젯 → 효과를 하나씩 넣고 빼서 확인했다(`opacity`·`grayscale`는 괜찮음). 틴트 모드의 스티커 색 처리는 이 설정 없이 다시 봐야 한다(I7).
- 전날 "누르면 가끔 앱이 열린다"를 `contentShape`로 고쳤다고 본 것은 잘못된 진단이었다. `contentShape`는 투명한 귀퉁이를 누를 영역으로 넣는 데만 필요하다.

### 2026-10-06 위젯 편집에서 목표 고르기 (I5 → 가안 확정)

사용자 결정: 위젯 편집 화면에 내 목표 목록을 띄운다([위젯 목표 고르기 시안](https://claude.ai/artifact/LnSzZfVvD5MV1Kpvh47VjL) 가안). spike에서 **된다**를 확인했다(목표 하나 → 이어서 이번 달 위젯도 같은 방식으로 넣음, 이번 달은 달력판 목표만 목록에). 손으로 고친 Swift 사본: `spike-native/ios-widgets/`(`ios/`는 git이 무시한다). 같은 날 바탕을 **아이보리·흰색·먹색 고정**(홈 화면 라이트·다크를 따르지 않음)으로 바꾸고 「글꼴 시험」 설정을 뺐다(PRD 4.10).

- **Swift(생성 파일 `ios/ExpoWidgetsTarget/ChagokRing.swift`를 손으로 고침, 약 30줄):** `ChagokGoalEntity: AppEntity`(id·이름) + `ChagokGoalQuery: EntityQuery`(위젯 타임라인 첫 항목의 `props.order`를 `WidgetsStorage`로 읽음) + 설정 의도에 `@Parameter(title: "목표") var goal: ChagokGoalEntity?` + 위젯 JS로 넘기는 `configuration`에 `"goal": goal?.id ?? ""`. 별도 목록 파일 없이 앱이 쓰는 타임라인을 그대로 읽는다.
- **TS:** 타임라인은 위젯 종류마다 하나라, 앱이 모든 목표를 `goals`(id → 그릴 값)와 `order`(id·이름)로 넣고, 위젯은 `env.configuration.goal`(없으면 `defaultId`)로 자기 목표를 꺼낸다. 버튼은 `goals[고른 id]`만 고친다.
- **확인:** 빌드 후 앱 번들 `Metadata.appintents`에 `ChagokGoalEntity`·`ChagokGoalQuery`가 들어감 → 위젯 편집에 「목표」 줄이 생기고, 누르면 내 목표 3개(ㅋㅋ·런닝 30분·스트레칭 5분)가 뜸 → 「런닝 30분」을 고르자 위젯이 25%·신발 스티커로 바뀜 → 스티커를 누르자 26%·`Nice!`, 저장된 값은 런닝 30분만 `done 26, today true`로 바뀌고 다른 목표는 그대로, 요청의 `goalId`도 런닝 30분.
- **본 구현:** 위 Swift를 생성 파일에 끼워 넣는 로컬 설정 플러그인으로 만든다. 끼워 넣을 자리를 못 찾으면 prebuild를 실패시키고, 생성 파일 사본으로 jest 테스트를 둔다. expo-widgets를 올릴 때는 iOS 빌드 + 위젯 편집 확인을 한 번씩 한다. 이번 달·적립판 위젯도 같은 방식.
- 확인 못 한 것: 같은 종류 위젯 두 개에 다른 목표(데이터 구조상 되지만 화면으로는 안 봄), 고른 목표를 지웠을 때 편집 화면 표시, 실기기.

## Android (`react-native-android-widget`)

| # | 확인 | 판정 | 근거 |
|---|---|---|---|
| A1 | 링·달력 위젯 | **된다** | `a1-home.png`. 링은 `SvgWidget`에 원 두 개(`stroke-dasharray`)로 그렸다. 앱이 `requestPinWidget`으로 시스템 추가 창을 띄울 수 있다. |
| A2 | 글꼴 | **된다** | 플러그인 `fonts`에 ttf를 주고 `fontFamily: 'neodgm-1.601'`(파일 이름). |
| A3 | 스티커 | **된다 (PNG 불필요)** | 스티커 SVG path를 그대로 `SvgWidget`에 넣는다. |
| A4 | 딥링크 | **된다** | `clickAction: 'OPEN_URI'` → 판 상세(`a4-deeplink.png`, release 빌드, 앱이 꺼진 상태). 단 아래 A7의 「첫 탭 유실」 때문에 프로세스가 없을 때 첫 탭은 무시되고 두 번째 탭에 열렸다. |
| A5 | 목표 고르기 | **조건부(미확인)** | `widgetFeatures: 'reconfigurable'` + `registerWidgetConfigurationScreen`으로 일반 RN 화면을 띄우는 코드는 넣었고 빌드도 됐다(`widgets/android/configuration-screen.tsx`). 런처의 「Widget settings」 대상으로 끌어 놓는 자동화가 실패해(위젯이 다른 페이지로 옮겨짐) 화면이 뜨는 것은 보지 못했다. 확인 방법: 에뮬레이터에서 링 위젯을 길게 눌러 위로 끌어 「Widget settings」에 놓기 → 목표 목록 화면이 뜨는지. |
| A6 | 위젯에서 붙이기 | **된다** | `PLACE` 클릭 → 핸들러가 `{goalId, at, dateKey}`를 `widget-requests.json`에 쌓고 위젯을 바로 다시 그림(「대기 1」, 오늘 칸 채움 — `a6-after-tap.png`). 앱을 열면 `read-requests` 로그로 그대로 읽힘. **핸들러에서 expo-sqlite 쓰기는 됐지만(`ok: true`), 그 뒤 앱을 열자 앱의 DB 초기화가 `NativeDatabase.execAsync ... NullPointerException`으로 실패해 로딩 화면에 멈췄다** → 설계대로 핸들러는 DB를 열지 않고 요청 파일만 쓴다. |
| A7 | 앱이 꺼진 상태에서 핸들러 | **조건부** | release 빌드에서 앱 프로세스가 없을 때 위젯을 누르면 시스템이 프로세스를 띄워 headless JS로 핸들러가 돈다(`appState: background`). **그러나 프로세스가 없는 상태의 첫 탭은 두 번 모두 유실됐다**(링 2번+판 1번 → 요청 2개, 링 2번 → 1개). 번들 로드 전에 들어온 클릭이 버려지는 것으로 보인다. 본 구현에서 원인 확인 또는 라이브러리 이슈 확인 필요. debug 빌드는 headless 번들을 8081 Metro에서 받는다. |

**Android 빌드에서 만난 것**

- `expo-widgets`의 Android 부분은 아직 위젯 이름만 그리는 스텁(Glance)이고, `react-native-android-widget`과 같이 넣으면 `androidx.work` 중복 클래스로 빌드가 깨진다. `package.json` `expo.autolinking.android.exclude: ["expo-widgets"]`로 뺐다.
- 진입점: `package.json` `main`을 `index.ts`로 바꾸고 `expo-router/entry` 다음에 `registerWidgetTaskHandler`·`registerWidgetConfigurationScreen`.
- debug 빌드의 위젯 headless 작업은 `10.0.2.2:8081`의 Metro에서 번들을 받는다. Metro를 다른 포트로 띄우면 위젯 핸들러가 엉뚱한 번들로 돈다(이번 spike에서 "No task registered for key RNWidgetBackgroundTask"). 핸들러 확인은 release 빌드로 했다.

## 본 구현 방향 (제안)

1. **iOS는 `expo-widgets`, Android는 `react-native-android-widget`.** 위젯에서 붙이기는 설계 「위젯에서 붙이기」대로 "위젯은 요청만 쌓고 앱의 TS가 처리" — iOS는 요청을 위젯 props(타임라인)에, Android는 파일에 쌓는다. 앱 쪽 처리(`placeSticker`·outbox·스냅샷 다시 쓰기)는 공통 TS 한 벌.
2. **Swift 코드는 쓰지 않는다.** 로컬 설정 플러그인 하나: iOS 위젯 확장에 글꼴 넣기(+필요하면 아래 목표 고르기).
3. **스티커 PNG 스크립트**(iOS용): spike 스크립트를 다듬어 `scripts/`에 두고 빌드 전에 돌린다. 새싹이 형식 처리 추가.

4. **Android 첫 탭 유실(A7)** — 본 구현 첫 작업으로 원인을 본다(라이브러리 이슈·`WorkManager` 지연). 안 풀리면 "누르면 한 박자 늦게 반영될 수 있음"을 받아들일지 결정.

## 사용자 결정이 필요한 것

1. **iOS 위젯마다 목표 고르기** — (가) Swift `AppEntity`를 생성 파일에 끼워 넣는 설정 플러그인을 만든다(목표 목록이 위젯 편집에 나옴, 작업 큼) / (나) 앱 안에서 "위젯에 보일 목표"를 고른다(위젯 편집에는 바탕만) / (다) 고르지 않고 가장 최근에 붙인 목표만. Android는 (가)에 해당하는 것이 일반 RN 화면이라 쉽다.
2. **기본 모드의 유리 바탕** — 직접 고르는 항목은 빼고 민트·아이보리만 둔다(틴트 모드의 유리는 시스템이 해 준다). PRD 4.10 「기본 모드에서 유리를 직접 고르는 항목」을 "넣지 않음"으로 정할지.
3. **위젯 글자 크기** — Neo둥근모는 작은 크기(8~12pt)에서 획이 뭉개진다. 진행 문구·이름 최소 크기를 시안에서 정한다.

## 확인하지 못한 것

- 실기기(iOS·Android), 출시 빌드에서 앱이 꺼진 상태의 딥링크(iOS).
- iOS 「투명」 홈 화면 모드(이 시뮬레이터 메뉴에 없었다), 다크 모드 위젯 바탕(PRD 6.2 — 단일 팔레트 유지).
- 위젯 되돌리기(undo) 버튼, 빈 상태 위젯.
- Android 위젯 설정 화면(A5) 실제 표시.
