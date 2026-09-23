# 로컬 개발환경 실행 가이드

이 맥(2026-09-23 확인)에 실제로 있는 것 기준으로 쓴 문서다.

| | 상태 |
|---|---|
| Android SDK | ✅ `~/Library/Android/sdk` |
| Android AVD | ✅ `Pixel_7` 이미 생성됨 |
| 시스템 이미지 | ✅ android-35, android-36 |
| Xcode.app | ❌ 없음 (커맨드라인 도구만) → **iOS 시뮬레이터 불가** |
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
3. 개발 서버 실행

   ```sh
   cd ~/Desktop/workspace/chagok-app
   npx expo start
   ```

4. 터미널의 QR을 찍는다
   - iPhone: 기본 카메라 앱으로 스캔
   - Android: Expo Go 앱 안에서 스캔

회사 Wi-Fi 등에서 기기 간 통신이 막혀 연결이 안 되면 터널을 쓴다.

```sh
npx expo start --tunnel
```

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

## iOS 시뮬레이터를 쓰려면

Xcode를 설치해야 한다. **15GB 이상이고 다운로드에 시간이 꽤 걸린다.**

```sh
# App Store에서 Xcode 설치 후
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
npx expo start --ios
```

**폰이 있다면 방법 1이 더 낫다.** 시뮬레이터도 햅틱이 없어서, Xcode를 깔아도 지금 확인하려는 것을
확인하지 못한다.

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
