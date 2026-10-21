---
name: sim-qa
description: 차곡차곡 앱을 iOS 시뮬레이터에 빌드하고 띄워 화면과 흐름을 확인할 때. 개발 빌드, 8081 Metro, Maestro 조작, 스크린샷 증거, 개발 서버 데이터 되돌리기까지의 순서와 함정.
---

# 시뮬레이터 QA

자세한 명령과 배경은 [DEV-SETUP](../../../docs/DEV-SETUP.md) 「개발 빌드」, 「개발 서버」와 [PITFALLS](../../../docs/PITFALLS.md) 「기기 테스트」에 있다. 이 스킬은 순서와 자주 틀리는 곳만 둔다.

## 1. 띄우기 전에

1. **8081에 무엇이 떠 있는지 본다.** `lsof -nP -iTCP:8081 -sTCP:LISTEN`. 내가 띄운 것이 아니면 끄지 않는다. 바꿔야 하면 무엇이 떠 있고 무엇으로 바꿀지 적어 **사용자 허락이 필요하다고 보고하고 멈춘다.** 다른 포트를 따로 열지 않는다.
2. **worktree면 `.env.local`을 링크한다.** `ln -s ../chagok-app/.env.local .env.local`. `node_modules`도 없으면 같은 방식으로 링크한다.
3. **시뮬레이터는 iOS 26.5가 기본이다.** `xcrun simctl list devices available`에서 26.5 기기를 고르고 UDID로 지정한다. 18.3은 비교할 때만 쓴다. 다른 세션이 켠 시뮬레이터는 끄지 않는다.

## 2. 빌드와 실행

- 네이티브(`app.json`, 플러그인, 네이티브 라이브러리)가 바뀌었거나 앱이 깔려 있지 않으면 빌드한다. `npx expo run:ios --device <UDID> --port 8081`을 백그라운드로 돌리고 로그를 파일로 남긴다.
  - 이미 `ios/`가 있는 체크아웃이면 `npx expo prebuild --clean`부터 한다.
  - **이 명령은 끝나지 않는다.** 빌드 뒤 Metro를 계속 띄워 두기 때문이다. 끝나기를 기다리지 말고 로그의 `Build Succeeded`, `iOS Bundled`를 확인한다.
- JS만 바뀌었으면 빌드하지 않는다. `npx expo start --dev-client --port 8081`만 띄운다.
- **다른 worktree에서 띄웠던 Metro 다음이면 `--clear`를 붙인다.** 안 붙이면 남의 캐시로 DB 파일을 못 찾아 「목표를 불러오지 못했어요」가 뜬다. 첫 번들이 2초 안에 끝나면 캐시를 쓴 것이다.
- 앱 열기: `xcrun simctl openurl <UDID> "exp+chagok://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"`. 다시 켜려면 먼저 `xcrun simctl terminate <UDID> com.novumlab.chagok`.
- 처음 상태로 돌리기: 앱을 끄고 `xcrun simctl get_app_container <UDID> com.novumlab.chagok data`의 `Documents`, `Library` 안을 비운다. 로그인 세션도 여기 있어서 함께 지워진다. 그 뒤 첫 실행에는 Expo 개발 메뉴 안내가 뜬다.
- Simulator 창이 까맣게 보이면 기기는 둔 채 창만 다시 연다: `osascript -e 'quit app "Simulator"'` 뒤 `open -a Simulator --args -CurrentDeviceUDID <UDID>`. 기기는 꺼지지 않는다.

## 3. 조작과 증거

- **스크래치 폴더:** 맡길 때 메인 세션이 적어 준 폴더에 흐름 파일, 로그, 스크린샷을 둔다. 적어 주지 않았으면 `"${TMPDIR:-/tmp/}chagok-qa/<날짜와 시각>"`을 만들어 쓰고 경로를 보고서에 적는다. 저장소 안에는 두지 않는다.

- **Maestro:** `/opt/homebrew/bin/maestro --device <UDID> test --test-output-dir <스크래치 폴더> flow.yaml`.
  - 흐름이 끝나면 앱이 내려간다. 확인할 화면은 흐름 안에서 `takeScreenshot: <이름>`(경로 없이 이름만)으로 찍는다.
  - 카드나 버튼 안 글자를 못 찾으면 `point` 좌표로 누른다. 화면 맨 위 상태 표시줄 근처(10% 위쪽)를 누르면 앱에 닿지 않는다.
  - 대괄호가 든 글자는 정규식이라 `"\\[필수\\] ..."`처럼 이스케이프한다.
- **스크린샷:** `xcrun simctl io <UDID> screenshot <파일>` 뒤 `sips -Z 1000 <파일>`로 줄여서 본다.
- **로그:** Metro 로그 파일에서 `WARN`, `ERROR`, `[connect] failed`를 찾는다.
- 항목마다 통과, 실패, 확인 못 함 가운데 하나로 적고, 통과와 실패에는 스크린샷 경로나 로그 줄을 붙인다.

## 4. 데이터를 건드릴 때

- 개발 서버 값을 바꾸기 전에 원래 값을 파일로 남기고, 끝나면 되돌리거나 되돌릴 필요가 없음을 확인한다(서버 조회는 `supabase-dev` 스킬).
- **누르지 않는 것:** 계정 삭제, 가입 그만하기, 구매, 로그아웃처럼 실제 데이터가 지워지거나 돈이 드는 버튼. 맡은 일이 그것을 확인하는 것이고 그렇다고 적혀 있을 때만 누른다.
- **하지 않는 것:** 비밀번호, 인증 코드 입력, Apple 로그인. 사용자가 직접 한다. 시뮬레이터 Apple 로그인은 인증 코드까지 넣어도 실패하는 일이 많다. Apple 로그인 확인은 실기기로 미룬다.

## 5. 끝낼 때

- 내가 띄운 Metro와 내가 켠 시뮬레이터, 부하 작업을 끈다. 사용자가 이어서 볼 것이면 켜 둔 것과 그 이유를 보고한다.
- 새로 겪은 함정은 보고서의 「배운 것」에 적는다. PITFALLS에 옮기는 것은 메인 세션이 한다.
