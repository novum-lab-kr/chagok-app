# 버전 규칙

2026-10-04 사용자와 정했다. 스토어 빌드는 **EAS Build**로 만들고 빌드 번호는 EAS가 관리한다는 전제다.
다른 출시 준비 결정은 [출시 준비 결정](RELEASE-DECISIONS.md).
아직 `eas.json`이 없다 — 처음 EAS를 설정할 때 아래 「처음 한 번」부터 한다.

## 번호 두 가지

| | 사용자 버전 | 빌드 번호 |
|---|---|---|
| 필드 | `app.json` `version` (iOS 버전·Android `versionName`) | iOS `buildNumber`·Android `versionCode` |
| 형식 | `MAJOR.MINOR.PATCH` | 정수 |
| 누가 | **사람이 올린다** | **EAS가 자동으로 +1** (iOS·Android 따로 센다) |

- PATCH = 버그 수정, MINOR = 기능 추가(워치 출시·스티커 팩 등), MAJOR = 판 구조가 바뀌는 큰 개편.
- 첫 출시는 `1.0.0`. 출시 전 테스트 빌드도 `1.0.0`에 빌드 번호만 올린다.
- iOS는 한 버전이 출시되면 다음 심사에 더 높은 `version`을 내야 한다. 같은 버전으로는 TestFlight 재업로드만 된다.

## 출시할 때마다

1. `app.json` `version` 올리기
2. 스토어 「새로운 기능」 문구(한국어, iOS·Android 각각)
3. 스토어에 낸 커밋에 git 태그 `v1.1.0`

## 처음 한 번 (EAS 설정 때)

- `eas.json`에 `"cli": { "appVersionSource": "remote" }`, 출시 프로필에 `"autoIncrement": true`.
- `app.json`에 `ios.buildNumber`·`android.versionCode`를 **넣지 않는다**(원격 관리면 무시되고 헷갈린다).
- 확인: `eas build:version:get`, 맞출 때: `eas build:version:set`.

## 워치

- **Apple Watch**: 워치 앱의 버전·빌드 번호는 iOS 앱과 **같아야** 한다(다르면 업로드 거절). iOS 값을 따르게 설정하고 첫 EAS 빌드에서 일치를 확인한다 — 아직 확인하지 않았다.
- **Wear OS**: EAS는 `wear/`(독립 Gradle 프로젝트)를 빌드하지 않으므로 `versionCode`를 직접 관리한다.
  폰과 겹치면 안 되므로 **워치는 `1000001`부터** 시작해 워치를 낼 때마다 +1. 폰(EAS 1, 2, 3…)과 번호대가 갈린다.
  폰과 워치는 따로 업데이트·심사된다.

## 가끔

- **최소 앱 버전**(HANDOFF 0절 나-2): 구버전 앱의 동기화를 막아야 하는 스키마 변경 때만 서버의 최소 빌드 번호를 올린다. EAS가 iOS·Android 번호를 따로 세므로 **플랫폼별로** 둔다.
- **약관 판**(`chagok-app-policy`의 `versions.json`): 앱 버전과 별개. 약관을 바꿀 때만.
- JS만 바꾸는 업데이트(`expo-updates`)를 도입하면 `runtimeVersion` 정책은 `appVersion`.
