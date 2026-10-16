# 워치 시험 구현 결과

2026-10-16. 코드: 브랜치 `spike/watch`(worktree `chagok-wt-watch-spike`, 합치지 않는다). 설계: [워치 설계](2026-10-16-watch-growth-design.md), 계획: [워치 계획 1](../plans/2026-10-16-watch-growth.md) Task 2

환경: Xcode 27.0(27A266a), watchOS 27.0 시뮬레이터 런타임(이번에 받음, 3.83GB), iPhone 17 iOS 26.5 + Apple Watch Series 11 46mm watchOS 27.0 시뮬레이터 짝(시험용으로 새로 만듦, 「Spike iPhone 17」「Spike Watch 46」, 꺼 둠).

| 질문 | 결과 | 근거 |
| --- | --- | --- |
| 1. watchOS 타깃을 prebuild에서 유지 | **된다** | `@bacons/apple-targets` 5.0.0 + `targets/watch/expo-target.config.js`(`type: 'watch'`). `prebuild --clean`을 두 번 해도 `ChagokWatch` 타깃(`SDKROOT = watchos`, `WATCHOS_DEPLOYMENT_TARGET = 10.0`)과 위젯 타깃이 함께 남는다. 폰 앱 Release 빌드에 `app.app/Watch/ChagokWatch.app`으로 들어간다. `react-dom`은 19.2.3 하나 그대로 |
| 2a. 폰 → 워치 (`updateApplicationContext`) | **된다** | 폰 JS가 3초마다 보낸 스냅샷이 워치에 왔다. 목표 50개 × 300칸 JSON **약 127KB**도 한 번에 왔다(캡처 `spike-shots/A2-watch.png`) |
| 2b. 워치 → 폰 (`transferUserInfo`) | **시뮬레이터에서 확인 못 함** | 워치는 「전송 완료, 오류 없음」(`didFinish error=none`), 시스템 로그도 「handled」. 그런데 폰 앱의 `didReceiveUserInfo`가 불리지 않았다. 폰 앱이 켜져 있을 때도, 꺼 두었다 다시 켤 때도 같다 |
| 2c. 워치 → 폰 (`sendMessage`) | **시뮬레이터에서 안 됨** | 폰 앱이 앞에 있는데도 워치에서 `isReachable = false`, 「paired device is not reachable」 |
| 3. 글꼴과 그림 | **된다** | Neo둥근모(`UIAppFonts`, 이름 `NeoDunggeunmo-Regular`), 스티커 PNG와 차곡이 PNG(`interpolation(.none)`로 픽셀이 또렷), 블록 30개 떨어지기 애니메이션이 시뮬레이터에서 끊김 없이 돈다(눈으로 봄). 워치 앱 크기 **884KB**(글꼴 포함, Release) |
| 4. 시뮬레이터 짝짓기 | **된다(조건부)** | iOS 26.5 폰과 watchOS 27.0 워치가 짝지어져 「connected」. 처음 몇 초는 폰이 `installed=0`이었다가 곧 `appInstalled: YES`로 바뀐다. 워치 앱은 `simctl install`로 따로 넣어야 한다 |

## 계획 2가 따를 것

- **타깃:** `@bacons/apple-targets`로 `targets/watch/`에 둔다. 글꼴은 `targets/watch/assets/`, 그림은 `expo-target.config.js`의 `images`로. 루트 `Info.plist`(관리되지 않음)에 `UIAppFonts`. 앱 그룹과 서명 팀 ID는 실제 구현 때 정한다.
- **빌드 명령:** `-sdk iphonesimulator`를 주면 워치 타깃까지 iOS용으로 빌드되어 실패한다. `-destination 'generic/platform=iOS Simulator'`만 준다.
- **폰 네이티브 모듈:** 로컬 Expo 모듈(`modules/chagok-watch`)이 `OnCreate`에서 `WCSession`을 켜고, 받은 요청을 UserDefaults 큐에 쌓고, JS는 `readRequests`, `ack`, `send`로 쓴다. 이 모양은 빌드되고 `send`는 동작했다. 계획 1의 `WatchPort`와 그대로 맞는다.
- **워치 → 폰 전달은 실기기에서 다시 본다.** 시뮬레이터에서 `transferUserInfo`가 폰 앱까지 오지 않은 것이 시뮬레이터 한계인지 코드 문제인지 가리지 못했다. 계획 2는 `transferUserInfo`(꺼져 있어도 줄 섬)를 기본으로 하고, 연결돼 있으면 `sendMessage`도 함께 보내는 두 길로 짠다(같은 요청 id라 두 번 와도 한 번만 붙는다). 실기기 확인은 작업 방식대로 맨 뒤에 하고, 그 전에는 Xcode에서 워치 스킴을 직접 실행하는 방법으로 한 번 더 본다.
- **스냅샷 크기:** 127KB가 한 번에 갔으므로 계획 1의 스냅샷 모양(목표별 전체 칸)을 줄이지 않는다.

## 확인 못 한 것

- 워치 → 폰 요청이 폰 앱에 도착하는 것(위 2b, 2c). 폰 앱이 완전히 꺼진 상태에서 받은 요청이 다음 실행 때 남는지도 같은 이유로 확인 못 함.
- 실기기 성능과 배터리. 컴플리케이션. 모션 줄이기와 VoiceOver.
- 개발 빌드(Debug + Metro)에서 워치 타깃이 함께 도는지. 이번에는 Metro를 쓰지 않으려고 Release로만 돌렸다(사용자의 8081 Metro는 건드리지 않음).
