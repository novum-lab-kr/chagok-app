# 스토어 개인정보 신고 초안

작성: 2026-10-11 · 상태: **답안 확정(2026-10-11 공식 정의 대조, 사용자 승인)** · 근거: PRD 8절, 출시 준비 결정, `node_modules`의 `PrivacyInfo.xcprivacy`

스토어에 낼 때 채우는 세 가지 — iOS Privacy Manifest, App Store 개인정보 라벨, Google Play 데이터 보안·연령 등급 — 의 답안 초안이다. **결제(RevenueCat)·광고(AdMob)를 붙이기 전 기준**이고, 붙인 뒤 늘어나는 항목은 각 절 끝에 따로 적었다.

## 1. iOS Privacy Manifest (`app.json` `ios.privacyManifests`)

라이브러리가 낸 선언을 모은 것(2026-10-11, Expo 57.0.24 / RN 0.86.3).

| API 종류 | 이유 코드 | 누가 쓰나 |
| --- | --- | --- |
| UserDefaults | `CA92.1` | react-native, expo-constants, expo-system-ui |
| UserDefaults | `1C8F.1` (같은 App Group) | **expo-widgets** `WidgetsStorage` — 앱과 위젯이 App Group으로 주고받는다. expo-widgets는 자체 선언 파일이 없다 |
| 파일 시각 | `C617.1`, `0A2A.1`, `3B52.1` | react-native, Folly, boost, glog, expo-file-system |
| 시스템 부팅 시각 | `35F9.1` | react-native(timing), boost |
| 디스크 공간 | `E174.1`, `85F4.1` | expo-file-system |

```json
"privacyManifests": {
  "NSPrivacyTracking": false,
  "NSPrivacyAccessedAPITypes": [
    { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults", "NSPrivacyAccessedAPITypeReasons": ["CA92.1", "1C8F.1"] },
    { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp", "NSPrivacyAccessedAPITypeReasons": ["C617.1", "0A2A.1", "3B52.1"] },
    { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategorySystemBootTime", "NSPrivacyAccessedAPITypeReasons": ["35F9.1"] },
    { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryDiskSpace", "NSPrivacyAccessedAPITypeReasons": ["E174.1", "85F4.1"] }
  ]
}
```

**넣은 방법 (2026-10-12)** — 위 값이 `app.json` `ios.privacyManifests`에 있다. Expo와 RN Pods 모으기는 **앱 타깃에만** 넣고 위젯 확장(App Extension)에는 넣지 않는다(RN `privacy_manifest_utils.rb`가 application 타깃만 고른다). 위젯도 RN·expo-widgets(App Group UserDefaults)를 링크하므로 로컬 플러그인 `plugins/widget-goal`이 같은 선언을 `ExpoWidgetsTarget/PrivacyInfo.xcprivacy`로 써서 위젯 리소스에 넣는다. 시뮬레이터 Debug 빌드에서 `app.app/PrivacyInfo.xcprivacy`와 `app.app/PlugIns/ExpoWidgetsTarget.appex/PrivacyInfo.xcprivacy` 둘 다 들어간 것을 확인했다.

**확인 못 한 것**

- Xcode Archive의 「Generate Privacy Report」(서명이 필요해 첫 TestFlight 빌드 때). 업로드가 ITMS-91053 없이 통과하는지.
- `NSPrivacyCollectedDataTypes`(수집 데이터)는 넣지 않았다. Expo 57 문서는 다루지 않는다. App Store 라벨(아래 2절)은 App Store Connect에서 따로 답한다.

## 2. App Store 개인정보 라벨 (App Privacy)

- **추적:** 하지 않음.
- **로그인하지 않은 사용자:** 기록이 기기 밖으로 나가지 않으므로 「수집」이 아니다.
- **로그인한 사용자** (백업용, 모두 「사용자와 연결됨」, 목적은 「앱 기능」):

| 데이터 유형 | 무엇 |
| --- | --- |
| 연락처 정보 › 이메일 주소 | 계정 이메일(Apple 가리기면 중계 주소) |
| 식별자 › 사용자 ID | 계정 식별자 |
| 식별자 › 기기 ID | 앱 설치 때 만든 무작위 값. 동기화할 때 어느 기기에서 바뀐 기록인지 구분하려고 보낸다(`src/sync/push.ts`, 처리방침 2절) |
| 사용자 콘텐츠 › 사진 또는 동영상 | 기록에 붙인 사진(줄인 것) |
| 사용자 콘텐츠 › 기타 사용자 콘텐츠 | 목표·스티커·메모 |

- 진단(충돌 기록)·사용 데이터: 지금은 수집하는 SDK가 없다.

**결제·광고를 붙인 뒤 더할 것 (확인 필요)**

- 구매 › 구매 내역 — RevenueCat(앱 기능).
- 광고: AdMob이 수집하는 항목(기기 ID·광고 데이터·대략 위치·진단 등)을 Google의 「App Store 개인정보 공개 안내」에서 확인해 「제3자 광고」 목적으로 적는다. 비맞춤이어도 수집 항목은 있다.

## 3. Google Play 데이터 보안

| 항목 | 답 |
| --- | --- |
| 수집 | 개인 정보 › 이메일 주소·사용자 ID, 기기 또는 기타 ID(설치 때 만든 무작위 값), 사진, 기타 사용자 생성 콘텐츠(목표·메모) — 로그인할 때만 |
| 공유(제3자 전달) | 없음 (서버는 처리 위탁 — 공유로 보지 않는다) |
| 목적 | 앱 기능, 계정 관리 |
| 필수/선택 | 선택(로그인하지 않아도 쓴다) |
| 전송 중 암호화 | 예 |
| 삭제 요청 | 예 — 앱 안 계정 삭제 + 웹 요청 경로 `https://chagok-app-terms.netlify.app/delete-account/`(이미 있음. 앱 이름·앱 안 삭제 방법·메일 요청·지워지는 정보와 30일 백업 보관을 적어 둠 — Google 요건 충족) |

**광고를 붙인 뒤:** 기기 또는 기타 ID(광고 ID) — 광고 목적, Google과 공유. 출시 준비 결정(2026-10-05)대로 비맞춤이어도 처음부터 적는다. 구매 내역 — 앱 기능.

## 4. 연령 등급

| 스토어 | 예상 | 근거 |
| --- | --- | --- |
| App Store | 4+ | 폭력·성·도박 없음. 사용자 콘텐츠가 다른 사람에게 보이지 않음(공유·소통 기능 없음) |
| Google Play (IARC) | 전체이용가 | 같은 이유. 「사용자 간 소통」 없음, 「위치 공유」 없음 |

**함께 답할 것:** 앱 내 구매 있음(묶음·광고 제거), 광고 있음(홈 배너·보상형). Apple의 새 설문(2025)에 광고·사용자 콘텐츠 질문이 있으니 제출할 때 문항을 다시 본다. 동의 화면의 만 14세 이상 확인(PRD 4.8)은 등급과 별개다.

## 공식 정의와 대조한 결과 (2026-10-11)

사용자가 직접 판단하기 어렵다고 해서, 처음에 「정할 것」으로 남긴 세 가지를 스토어 공식 문서와 대조해 정했다. 법률 자문은 아니다.

1. **「로그인하지 않으면 수집 아님」 — 맞다.** Apple은 「기기 밖으로 보내 요청 처리에 필요한 시간보다 오래 읽을 수 있게 두는 것」을 수집으로 본다. Google도 「기기 안에서만 처리하고 밖으로 보내지 않는 데이터는 적지 않아도 된다」고 한다.
2. **「서버 위탁은 공유 아님」 — 맞다.** Google은 개발자 대신 데이터를 처리하는 서비스 제공업체로 보내는 것을 공유의 예외로 둔다. Apple 라벨에는 「공유」 칸이 따로 없고, 우리와 서버 업체가 수집하는 것을 모두 적으면 된다(위 표).
3. **계정 삭제 웹 경로 — 이미 있다.** Google 요건은 「열리고, 삭제 요청 방법이 잘 보이고, 앱이나 개발자 이름을 적을 것」이고 메일 접수도 인정한다. 정책 사이트의 `/delete-account/`가 모두 갖췄다.
4. **Privacy Manifest — 첫 TestFlight 업로드 전에 넣어야 한다.** 이유를 밝혀야 하는 API를 쓰는데 선언이 없으면 업로드 단계에서 ITMS-91053으로 막힌다. 위젯 같은 확장도 자기 선언이 필요하다는 안내가 있어, 넣고 빌드해 위젯 쪽에 들어가는지 확인한다.
5. **빠졌던 항목 — 기기 ID.** 처리방침 2절과 동기화 코드대로 설치 때 만든 무작위 값을 서버에 보내므로 두 스토어 모두 적는다(위 표에 더함).

**남는 것 (스토어 신고가 아니라 처리방침 쪽)**

- 처리방침 5절 수탁자가 `[클라우드 사업자]`로 비어 있고, 「보관 위치 대한민국」 「국외로 옮기지 않습니다」라고 적혀 있다. 운영 서버를 고를 때 **서울 지역에 두면 그대로**, 다른 나라 지역이면 국외 이전 조항을 써야 한다. 수탁자 칸에는 실제 업체(예: Supabase)를 적는다. 정책 사이트 공식 게시 때 함께 정한다.
- 서버 접속 기록에 IP 주소가 며칠 남을 수 있다(서버 업체의 운영 기록). 운영 목적 외에 쓰지 않으면 보통 따로 신고하지 않지만, 운영 서버를 정할 때 보관 기간을 확인한다.
