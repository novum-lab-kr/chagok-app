# 로컬 개발환경 실행 가이드

이 맥(2026-09-23 확인)에 실제로 있는 것 기준으로 쓴 문서다.

| | 상태 |
|---|---|
| Android SDK | ✅ `~/Library/Android/sdk` |
| Android AVD | ✅ `Pixel_7` 이미 생성됨 |
| 시스템 이미지 | ✅ android-35, android-36 |
| Xcode.app | ✅ `/Applications/Xcode.app` → **iOS 시뮬레이터 동작 확인됨** ([설정](#처음-한-번만--라이선스-동의와-초기-설정)) |
| cmdline-tools | ❌ 없음 → `sdkmanager`/`avdmanager` 사용 불가 (새 AVD를 만들 때만 필요) |

앱이 쓰는 네이티브 모듈(expo-router, expo-sqlite, expo-image-picker, expo-haptics,
expo-font, react-native-svg, reanimated, screens, safe-area-context)은 **전부 Expo Go에
기본 포함**이라 개발 빌드 없이 Expo Go로 바로 돌아간다.

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
   npx expo start --lan
   ```

5. 터미널의 QR을 찍는다
   - iPhone: 기본 카메라 앱으로 스캔
   - Android: Expo Go 앱 안에서 스캔

회사 Wi-Fi 등에서 기기 간 통신이 막혀 연결이 안 되면 터널을 쓴다. 그 외에는 쓰지 않는다 —
느리고, 아래에 적은 함정이 있다.

```sh
npx expo start --tunnel
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
npx expo start --android
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
자세한 이유는 [HANDOFF.md](HANDOFF.md)와 [PRD.md](PRD.md)를 참고한다.

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
npx expo start --lan --port 8081
```

### 개발 서버는 사람이 직접 터미널에서 돌린다

에이전트가 백그라운드 작업으로 띄운 개발 서버는 장시간 실행 프로세스 정리 대상이라
시스템 메모리에 여유가 있어도 중간에 죽는다. Metro는 사용자 터미널에서 돌리는 것이 맞다.
QR과 `r`(리로드) 같은 단축키도 그래야 쓸 수 있다.
