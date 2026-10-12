# 로컬 개발환경 실행 가이드

이 맥(2026-09-23 확인)에 실제로 있는 것 기준으로 쓴 문서다.

| | 상태 |
|---|---|
| Android SDK | ✅ `~/Library/Android/sdk` |
| Android AVD | ✅ `Pixel_7` 이미 생성됨 |
| 시스템 이미지 | ✅ android-35, android-36 |
| Xcode.app | ✅ `/Applications/Xcode.app` → **iOS 시뮬레이터 동작 확인됨** ([설정](#처음-한-번만--라이선스-동의와-초기-설정)) |
| cmdline-tools | ❌ 없음 → `sdkmanager`/`avdmanager` 사용 불가 (새 AVD를 만들 때만 필요) |

2026-10-05부터 **개발 빌드**(`expo-dev-client`)가 기본이다 — 아래 「개발 빌드」.
지금 앱이 쓰는 네이티브 모듈은 아직 전부 Expo Go에도 들어 있어서 `npx expo start --go`로 Expo Go를
계속 쓸 수 있다. 로그인·위젯처럼 Expo Go에 없는 모듈이 들어오면 개발 빌드로만 돈다.

---

## 개발 빌드 (2026-10-05~)

Expo Go 대신 이 앱만의 개발용 앱을 시뮬레이터·에뮬레이터에 깔아 쓴다. 네이티브 폴더(`ios/`·`android/`)는
빌드할 때마다 `app.json`에서 만들고 **커밋하지 않는다**(`.gitignore`). 설정은 `app.json`·`eas.json`에만 둔다.

**iOS 시뮬레이터** — Xcode와 CocoaPods가 필요하다. CocoaPods가 없으면 첫 빌드가 Homebrew로 설치한다(2026-10-05 이 맥에 설치됨).

```sh
npx expo run:ios --no-bundler   # 첫 빌드는 pod 내려받기 때문에 10분 넘게 걸릴 수 있다
```

**Android 에뮬레이터** — 기본 `java`가 21이라 **JDK 17로 고정**한다.

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
emulator -avd Pixel_7 &
npx expo run:android --no-bundler   # 첫 Gradle 빌드 약 8분
```

**실행** — 설치한 뒤에는 Metro만 띄우면 된다. `npx expo start`가 이제 개발 빌드를 기본으로 연다.
앱을 열었는데 「Searching for development servers...」 런처 화면이면 Metro가 꺼져 있는 것이다.
개발 메뉴는 iOS `Cmd+D`, Android `Cmd+M`.

**다시 빌드해야 할 때** — 네이티브 라이브러리를 추가·업데이트했거나 `app.json`(아이콘·스플래시·플러그인·권한)을
바꿨을 때만. JS·화면 코드는 Metro 리로드로 충분하다.

```sh
npx expo prebuild --clean && npx expo run:ios --no-bundler   # Android도 같은 방식
```

**알아 둘 것**

- 개발 빌드와 Expo Go는 **다른 앱**이라 기록(SQLite)이 따로다. Expo Go에 쌓인 기록은 넘어오지 않는다.
- Expo Go를 계속 쓰려면 `npx expo start --go`. 실기기 iPhone은 2026-10-10부터 개발 빌드로 본다(아래 「실기기 iPhone 개발 빌드」).
- Android 첫 실행에서 `Can't perform a React state update on a component that hasn't mounted yet`
  (`expo-router` `useLinking.native.js`) 경고가 가끔 뜬다. 개발 빌드가 주소를 붙여 앱을 여는 타이밍 문제로,
  앱 코드 문제가 아니고 출시 빌드에는 없다. 닫으면 된다(2026-10-05, expo-router 57.0.22).

**EAS** — 프로젝트는 Expo 조직 `novum-lab` 아래 `@novum-lab/chagok`이다(두 사람이 멤버). 빌드 프로필은
`eas.json`: `development`(실기기 개발 빌드), `development-simulator`, `preview`(내부 배포), `production`(빌드 번호 자동 증가 —
[버전 규칙](RELEASE-VERSIONING.md)). iOS 실기기·스토어 빌드는 Apple Developer Program 승인 뒤에 한다.
**클라우드 빌드는 `.env.local`을 읽지 않는다** — `preview`·`production`을 빌드하기 전에 서버 주소·키를 EAS 환경 변수로 넣어야 한다.

**실기기 iPhone 개발 빌드** (2026-10-10 설치, iPhone 15 Pro · iOS 26.6.2)

- 빌드: `npx eas-cli@latest build --profile development --platform ios`. 전역 `eas`(16.17.4)는 오래돼서 Apple 로그인 단계가
  「iTunes service key is empty」로 실패한다. Apple 로그인·인증서 질문이 대화형이라 **사용자의 터미널 앱에서** 돌린다(Claude의 `!`로는 안 된다).
- 기기는 EAS에 등록돼 있고 배포 인증서도 있다. 네이티브 쪽(`app.json`·플러그인·네이티브 라이브러리)을 바꿨을 때만 다시 빌드한다.
- 실행: Mac에서 `npx expo start --dev-client --port 8082`. 폰과 Mac이 **같은 Wi-Fi**여야 하고, 폰 앱에서 `http://<Mac LAN IP>:8082`로 연다.
  JS·위젯 레이아웃 변경은 Metro 리로드로 폰에 반영된다.
- worktree에서 Metro를 띄우면 `.env.local`을 링크하고, 다른 worktree에서 띄웠던 직후라면 `--clear`를 붙인다
  ([PITFALLS](PITFALLS.md)).
- Metro를 다시 띄우면 폰 앱도 다시 불러와져 마지막 화면부터 열린다. 그때 이상하게 보이면 재시작 직후인지 먼저 본다.

---

## 방법 1 — 실제 폰 (권장, 설치 거의 없음)

**햅틱과 스와이프 감각은 실기기에서만 알 수 있다.** 지금 미검증으로 남은 항목이 정확히 그것이므로
이 방법이 가장 값지다.

1. 폰에 **Expo Go** 설치 (App Store / Play 스토어)
2. **맥과 폰을 같은 Wi-Fi**에 연결
3. **Expo 계정으로 양쪽 모두 로그인** — SDK 57부터 필수다. 아래 「실기기 iOS는 로그인이
   필요하다」를 먼저 읽는다.
4. 개발 서버 실행

   ```sh
   cd ~/Desktop/workspace/chagok-app
   npx expo start --go --lan   # 개발 빌드 도입 뒤로 Expo Go는 --go가 필요하다
   ```

5. 터미널의 QR을 찍는다
   - iPhone: 기본 카메라 앱으로 스캔
   - Android: Expo Go 앱 안에서 스캔

회사 Wi-Fi 등에서 기기 간 통신이 막혀 연결이 안 되면 터널을 쓴다. 그 외에는 쓰지 않는다 —
느리고, 아래에 적은 함정이 있다.

```sh
npx expo start --go --tunnel
```

### 실기기 iOS는 로그인이 필요하다

Expo SDK 57부터 **개발 서버로 실기기 iOS에 앱을 열려면 Expo CLI와 Expo Go 양쪽이 같은
계정으로 로그인**되어 있어야 한다. 안 되어 있으면 이 화면이 뜬다.

> There was a problem running the requested project.
> You need to be signed in to Expo Go and Expo CLI to open your project.

```sh
npx expo login     # 계정이 없으면 npx expo register
```

그다음 **Expo Go 앱 → Account 탭**에서 같은 계정으로 로그인한다. 서버를 재시작할 필요 없이
에러 화면의 **Try again**을 누르면 된다.

적용 범위는 좁다. 헷갈리지 않도록 표로 둔다.

| 대상 | 로그인 |
| --- | --- |
| 실기기 iOS + 개발 서버 | **필요** |
| Android 기기·에뮬레이터 | 불필요 |
| iOS 시뮬레이터 | 불필요 |
| development build | 불필요 |

근거: [Expo 트러블슈팅 문서](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/),
[changelog](https://expo.dev/changelog/expo-go-57-login).

Expo Go iOS에서 로그인이 곧바로 풀리는 버그가 보고되어 있다
([#50085](https://github.com/expo/expo/issues/50085),
[#50246](https://github.com/expo/expo/issues/50246)).
로그인했는데도 같은 에러가 반복되면 이 버그를 의심하고, 방법 2(Android 에뮬레이터)로 우회한다.

---

## 방법 2 — Android 에뮬레이터 (이미 준비됨)

`Pixel_7` AVD가 있으므로 추가 설치가 필요 없다.

```sh
# 1) 에뮬레이터 먼저 띄운다 (별도 터미널)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
emulator -avd Pixel_7 &

# 2) 부팅되면 확인
adb devices          # emulator-5554  device 가 보여야 한다

# 3) 앱 실행
cd ~/Desktop/workspace/chagok-app
npx expo start --go --android   # 개발 빌드를 깔았으면 --go 없이(위 「개발 빌드」)
```

에뮬레이터에서는 **햅틱이 나지 않고** 마우스 드래그라 스와이프 감각도 실제와 다르다.
레이아웃·동작 확인용으로 쓴다.

### 환경변수를 매번 치기 싫다면

`~/.zshrc`에 한 번 넣어둔다.

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
```

---

## 방법 3 — 웹 (가장 빠르지만 한계 큼)

```sh
npx expo start --web
```

레이아웃과 흐름만 훑을 때 쓴다. 다음은 **웹에서 동작하지 않거나 다르게 동작한다.**

- 햅틱 (`expo-haptics`) — 아무 일도 일어나지 않음
- 사진 선택기 — 브라우저 파일 선택으로 대체됨
- `expo-sqlite` — 웹 구현이 네이티브와 달라 저장 동작이 다를 수 있음
- 스와이프 — 마우스 드래그로만 가능

---

## iOS 시뮬레이터 (Xcode 설치됨, 검증 완료)

이 맥에는 `/Applications/Xcode.app`이 이미 있고 시뮬레이터가 동작한다. **실기기 iOS와 달리
Expo 계정 로그인이 필요 없다.**

```sh
npx expo start --go --ios
```

### 처음 한 번만 — 라이선스 동의와 초기 설정

Xcode를 설치만 하고 한 번도 열지 않았으면 아래 에러가 난다. 서버 시작 로그에 섞여 나오는데,
**무시하면 안 된다.** 시뮬레이터를 못 쓰게 만드는 실제 원인이다.

```
Unable to run simctl:
Error: xcrun simctl help exited with non-zero code: 69
```

`69`는 EX_UNAVAILABLE — Xcode 라이선스에 동의하지 않았다는 뜻이다. 순서대로 실행한다.

```sh
sudo xcodebuild -license          # 약관을 읽고 agree 입력. 비밀번호는 화면에 안 보인다
sudo xcodebuild -runFirstLaunch   # 초기 컴포넌트 설치
xcrun simctl list devices available   # 기기 목록이 나오면 성공
```

그다음 Expo에서 `i`를 누르거나 `npx expo start --go --ios`로 다시 시작한다.

**햅틱은 시뮬레이터에서 확인할 수 없다.** 그 항목만은 실기기가 필요하다.

---

## 개발 서버 (백업·복원 개발)

백업 서버는 Supabase 클라우드의 개발용 무료 프로젝트 `chagok-dev`(서울 리전)에 있다. 맥을 켜 두거나 Docker를 돌릴 필요가 없다.
서버 설정(테이블·함수)은 이 저장소의 `supabase/`에 있고, 테스트 데이터만 둔다. 설계: [계정·백업 설계](superpowers/specs/2026-09-30-account-backup-design.md).

**한 번만 하는 준비**

```sh
brew install supabase/tap/supabase
supabase login                                   # 브라우저로 로그인
supabase link --project-ref cmkmhrzvxbtuxbgixqoo
```

커밋하지 않는 파일 두 개를 만든다(`.env.example` 참고). 키는 대시보드 → Project Settings → API Keys.

| 파일 | 내용 | 쓰는 곳 |
| --- | --- | --- |
| `.env.local` | 서버 주소, publishable(anon) 키, 개발 계정 이메일·비밀번호 | 앱 |
| `.secrets/server-test.env` | 서버 주소, publishable 키, **secret(service_role) 키** | 서버 테스트·개발 계정 만들기 |

secret 키는 관리자 권한이다. 앱에 넣지 않고 커밋하지 않는다. 이 파일 이름을 `.env`로 시작하게 두면 안 된다 — Expo 개발 서버가 `.env.*` 파일을 앱 번들에 넣으려다 빌드가 깨진다(2026-09-30).

**명령**

```sh
supabase db query --linked "select 1"              # 연결 확인
supabase db reset --linked                         # 개발 서버를 비우고 supabase/migrations를 처음부터 다시 적용한다
supabase functions deploy delete-account --use-api # 계정 삭제 함수 (Docker 없이)
npm run test:server                                # 실제 서버 테스트 (만든 테스트 사용자는 끝나면 지운다)
npm run server:dev-user                            # 개발용 계정 만들기
```

**출시 전(2026-10-12~):** 서버 구조를 바꿀 때 새 파일을 더하지 않고 `supabase/migrations`의 파일을 최종 구조로 고친 뒤 `db reset --linked`로 개발 서버를 비운다. 기기 DB(`src/db/schema.ts`)도 v1을 고치고 개발 기기의 앱 데이터를 지운다. 리셋하면 로그인 사용자도 지워지므로 `npm run server:dev-user`로 개발 계정을 다시 만들고, 사진 저장소(`record-photos`)에 남은 파일은 service 키로 지운다. **출시 뒤에는** 올린 파일을 고치지 않고 새 파일을 더한다(`db push`).

**앱에서 확인** — `.env.local`을 바꿨으면 `npx expo start`를 다시 시작한다. 앱 설정 → 개발 → 서버 동기화 (개발)에서
개발 계정으로 로그인하고 올리기·복원을 한다. 로그인해 있으면 기록이 바뀐 뒤 2초쯤 지나 자동으로 올라간다.
올라간 행과 사진은 대시보드의 Table Editor·Storage(`record-photos`)에서 본다. 이 화면은 개발 빌드(`__DEV__`)에서만 보인다.

무료 프로젝트는 일주일 동안 요청이 없으면 멈춘다. 대시보드에서 다시 켜면 된다.

## 실행 후 확인할 것

지금 코드에서 **실기기 검증이 안 된 항목**이다.

- [ ] 스티커를 붙일 때 햅틱이 적절한 세기인지 (`ImpactFeedbackStyle.Medium`)
- [ ] 달력판 좌우 스와이프가 **칸 탭과 싸우지 않는지** — 현재 임계값은 가로 24px 이동 + 세로의 1.5배 + 48px에서 월 전환. 너무 민감하거나 둔하면 `src/design-system/screen-compositions.tsx`의 `PanResponder` 수치를 조정한다
- [ ] 사진 권한 거부 후에도 메모·스티커 붙이기가 계속 되는지
- [ ] 첫 실행 튜토리얼이 한 번만 뜨고 다시 안 뜨는지
- [ ] 320px 폭에서 레이아웃이 깨지지 않는지

## 문제가 생기면

```sh
# 캐시를 비우고 다시 시작
npx expo start -c

# 의존성이 꼬였을 때 (react-dom override 때문에 npm install이 까다롭다)
rm -rf node_modules package-lock.json && npm install
```

`package.json`의 `overrides: { "react-dom": "19.2.3" }`를 **지우면 모든 설치가 ERESOLVE로 실패한다.**
자세한 내용은 [PITFALLS.md](PITFALLS.md) 「의존성과 빌드」.

### 터널이 8081을 잡고 있으면 LAN 주소도 터널로 간다

`--tunnel`로 띄운 서버가 8081을 점유한 채 남아 있으면, LAN 주소(`http://<맥IP>:8081`)로
접속해도 그 터널 서버가 응답한다. 매니페스트의 `launchAsset.url`이 `...exp.direct`를 가리켜
결국 터널을 타게 된다. 서버를 두 개 띄우면 QR이 어느 쪽인지도 불투명해진다.

무엇이 서빙되고 있는지는 매니페스트를 직접 열어 확인한다. 추측하지 않는다.

```sh
curl -s -H 'expo-platform: ios' http://<맥IP>:8081 | grep -o '"launchAsset":{[^}]*}'
```

정리하고 다시 시작한다.

```sh
pkill -f "expo start"
npx expo start --go --lan --port 8081   # 개발 빌드로 볼 때는 --go를 뺀다
```

### 개발 서버는 사람이 직접 터미널에서 돌린다

에이전트가 백그라운드 작업으로 띄운 개발 서버는 장시간 실행 프로세스 정리 대상이라
시스템 메모리에 여유가 있어도 중간에 죽는다. Metro는 사용자 터미널에서 돌리는 것이 맞다.
QR과 `r`(리로드) 같은 단축키도 그래야 쓸 수 있다.
