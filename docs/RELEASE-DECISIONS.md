# 출시 준비 결정

스토어 출시에 걸리는 식별자·계정·빌드·배포 결정을 한곳에 모은다. 2026-10-04 시작.
확정한 것은 PRD 11절 확정 이력에도 행을 남긴다. 번호 규칙 자체는 [버전 규칙](RELEASE-VERSIONING.md).
열린 항목은 임의의 값으로 채우지 않는다 — 사용자에게 묻는다.

## 확정

| 날짜 | 항목 | 결정 |
|---|---|---|
| 2026-10-04 | 앱 식별자 | `com.novum.chagok` — iOS 번들 ID·Android 패키지 이름 공통. 출시 뒤 바꿀 수 없다. App Group `group.com.novum.chagok`, Apple Watch `com.novum.chagok.watchkitapp`, Wear OS는 같은 패키지 이름. 커스텀 스킴 `chagok://`는 별개 |
| 2026-10-04 | 스토어 빌드 | EAS Build. 빌드 번호는 EAS 원격 자동 증가(`appVersionSource: remote`, `autoIncrement`) |
| 2026-10-04 | 버전 규칙 | 사용자 버전 `MAJOR.MINOR.PATCH`는 사람이 올리고, 첫 출시 `1.0.0`. 출시마다 버전·스토어 문구·git 태그. Wear OS `versionCode`는 `1000001`부터 직접 — [버전 규칙](RELEASE-VERSIONING.md) |
| 2026-10-04 | 앱 버전 표시 | 앱 설정에는 버전만(`1.0.0`). 빌드 번호는 문의하기 메일 본문에 자동(앱 버전·빌드·OS). 문구는 사용자 확인 (PRD 4.9) |
| 2026-10-04 | 코드 저장소 | GitHub `nol-meok/chagok-app`. 워치 코드도 같은 레포(`targets/watch/`, `wear/`) |

## 열림 — 계정을 만들기 전에 정할 수 있는 것

- **Expo 계정·EAS 프로젝트 소유자** — 개인 계정 / Expo 조직(예: `nol-meok`). 조직을 추천했다(GitHub 레포와 맞추고, 개발자 계정이 다른 명의라 나중에 소유권 이전을 피한다). `app.json` `owner`에 들어간다.
- **테스트 배포 단계** — 추천: 내부 테스트(TestFlight·Play 내부 테스트) → (Play 개인 계정이면 비공개 테스트) → 정식 출시.

## 열림 — 계정을 만들 때 정할 것

- **Google Play 계정 유형** (개인 / 조직) — HANDOFF 0절 가-3(수익 모델)과 함께. 새 개인 계정은 정식 출시 전 **테스터 12명 이상·14일 비공개 테스트**가 필요하다. 조직 계정은 D-U-N-S가 필요하고, 개인사업자 조직 계정은 결제 프로필이 막힐 수 있다.
- **서명 키** — 추천: Android 키는 EAS가 만들고 보관 + **Google Play 앱 서명** 사용(키를 잃어도 복구 가능). Wear OS도 같은 키. iOS 인증서도 EAS 관리.

## 열림 — 기본값으로 가도 되는 것

- **최소 OS 버전** — Expo 57 기본값. 워치는 착수할 때 watchOS·Wear OS 최소 버전을 정한다.
- **스토어 앱 이름** — 「차곡차곡」 사용 가능 여부. HANDOFF 0절 나-5(KIPRIS 상표)와 함께 확인.
