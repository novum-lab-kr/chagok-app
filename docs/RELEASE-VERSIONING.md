# 버전 규칙

2026-10-04 사용자와 정했다. 스토어 빌드는 **EAS Build**로 만들고 빌드 번호는 EAS가 관리한다는 전제다.
다른 출시 준비 결정은 [출시 준비 결정](RELEASE-DECISIONS.md).
`eas.json`은 2026-10-05 만들었다(「처음 한 번」 적용 — 원격 버전, `production` 자동 증가). 원격 번호는 첫 EAS 빌드 때 생긴다.

## 번호 두 가지

| | 사용자 버전 | 빌드 번호 |
|---|---|---|
| 필드 | `app.json` `version` (iOS 버전·Android `versionName`) | iOS `buildNumber`·Android `versionCode` |
| 형식 | `MAJOR.MINOR.PATCH` | 정수 |
| 누가 | **사람이 올린다** | **EAS가 자동으로 +1** (iOS·Android 따로 센다) |

- PATCH = 버그 수정, MINOR = 기능 추가(워치 출시·스티커 팩 등), MAJOR = 판 구조가 바뀌는 큰 개편.
- 첫 출시는 `1.0.0`(2026-11-03 공개). 같은 버전의 테스트 빌드는 빌드 번호만 올린다.
- iOS는 한 버전이 출시되면 다음 심사에 더 높은 `version`을 내야 한다. 같은 버전으로는 TestFlight 재업로드만 된다.

## 출시할 때마다

1. `app.json` `version` 올리기
2. 스토어 「새로운 기능」 문구(한국어, iOS·Android 각각)
3. 스토어에 낸 커밋에 git 태그 `v1.1.0`(release 병합 때 Actions가 붙인다. 아래 「브랜치」)

## 브랜치 (2026-11-07 사용자)

- **판 작업:** `release/<버전>`에 모은다. 심사에 낸 뒤 PR로 main에 합치면 GitHub Actions가 그 병합 커밋에 `v<버전>` 태그를 붙인다(`.github/workflows/release-tag.yml`). 다음 판 브랜치는 대화에서 사용자에게 버전을 묻고 `start-release.yml`로 main 끝에서 딴다([ship 스킬](../.claude/skills/ship/SKILL.md)).
- **심사 반려나 출시한 판의 급한 수정:** main에서 `hotfix/<버전>`(예: `hotfix/1.1.0`)을 따서 고치고 main에 합친다. 다시 내는 빌드는 그 main에서 만든다. 그다음 main을 다음 판 브랜치(예: `release/1.1.1`)에 합쳐 최신으로 맞춘다. 지난 `release/<버전>` 브랜치에서 고치지 않는다.
- **자동 태그는 PR로 합칠 때만 붙는다.** PR 없이 main에 직접 push한 병합은 잡지 않는다(hotfix도 PR로 합친다). 2026-11-07 기준으로 워크플로가 도는 것과 release가 아닌 PR을 건너뛰는 것(PR #32)만 확인했고, 태그를 실제로 붙이거나 옮기는 것은 아직 확인하지 못했다. 첫 대상(hotfix나 `release/1.1.1`) 병합 때 `git ls-remote --tags origin v1.1.1`로 확인하고 이 문장을 지운다.
- **태그:** `hotfix/<버전>` PR이 main에 합쳐지면 태그 워크플로가 `v<버전>`을 그 병합 커밋으로 옮긴다(없으면 붙인다). `release/*` 병합은 이미 있는 태그를 건드리지 않는다.

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

- **최소 앱 버전**(HANDOFF 「다음 할 일」): 구버전 앱의 동기화를 막아야 하는 스키마 변경 때만 서버의 최소 빌드 번호를 올린다. EAS가 iOS·Android 번호를 따로 세므로 **플랫폼별로** 둔다.
- **약관 판**(novum-web `chagok/versions.json`): 앱 버전과 별개. 약관을 바꿀 때만.
- JS만 바꾸는 업데이트(`expo-updates`)를 도입하면 `runtimeVersion` 정책은 `appVersion`.
