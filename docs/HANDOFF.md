# 인계

갱신: 2026-10-16

다음 세션이 바로 이어서 일할 수 있게 **지금 상태, 진행 중인 것, 다음 할 일, 아직 확인 못 한 것**만 둔다. 끝난 일은 지운다(git 기록에 있다).

- 기능이 어떻게 동작해야 하는지: [PRD](PRD.md)
- 화면 수치·시각 기준: [디자인 시스템](DESIGN-SYSTEM.md)
- 되풀이되는 함정과 테스트 방법: [PITFALLS](PITFALLS.md)
- 작업 규칙: [작업 방식](WORKING-AGREEMENT.md)

## 지금 상태

PRD 4절 기능은 대부분 앱에 연결돼 있다(스키마 v6, 개발 빌드로 실행, 개발 서버 `chagok-dev`). PRD와 다른 곳은 아래뿐이다.

| 기능 | 지금 | PRD |
| --- | --- | --- |
| 결제·광고 | RevenueCat **Test Store**(가짜 결제, 키는 `.env.local` `EXPO_PUBLIC_REVENUECAT_KEY`)와 AdMob **Google 테스트 광고 ID**로 연결(2026-10-13). 키나 네이티브 모듈이 없는 빌드는 개발용 대역(누르면 바로 성공)으로 돈다. 가격은 스토어에서 받아 온다(원화는 「2,200원」, 다른 통화는 스토어 글자 그대로, 못 받아 오면 가격만 뺀다 — 2026-10-13). 지금은 Test Store에 넣은 가격 | 스토어 키·실제 광고 단위 ID (4.12) |
| 로그인 | 연결 화면의 [개발 계정으로 계속]만(`__DEV__`). 시작·동의·복원·로그아웃·계정 삭제 화면은 연결됨 | Apple·Google (4.8) |
| 한 번에 한 기기 | 없음 | 4.8 |
| 위젯 | iOS 세 종류만 | Android도 (4.10) |
| 앱 설정 | 하단 「설정」 탭(2026-10-12). 계정·구매·도움말(사용법 다시 보기)·정보(약관과 라이선스). 문의하기·앱 버전 줄 없음. 구역은 판(`PixelPanel`) 배치 | 4.9 |
| 위젯 미리보기 | Storybook에 없다(예전 링 위젯 미리보기는 2026-10-10 지움). 흐름도 위젯 노드는 스토리 없이 둔다 | 4.10 |
| `/dev/sync` | 개발 전용 동기화 화면(`__DEV__`). 실제 계정 화면이 붙으면 없앤다 | — |

## 진행 중인 브랜치와 worktree

| 위치 | 브랜치 | 상태 |
| --- | --- | --- |
| `chagok-wt-apple-login` | `feat/apple-login` | 다른 세션. 계획 문서(`docs/superpowers/plans/2026-10-08-apple-login.md`)가 커밋되지 않은 채 있어 남겨 둠 |
| (worktree 없음) | `fix/light-mode-font-scale` | 2026-10-01 옛 브랜치. 같은 내용을 최신 main에 `fix/fixed-text-size`로 다시 넣어 필요 없다. 지울지 사용자 확인 |
| (worktree 없음) | `spike/widgets` | 위젯 시험 구현. 코드는 합치지 않는다(결과 문서는 main `docs/superpowers/specs/2026-10-05-widget-spike-results.md`) |
| (worktree 없음) | `docs/scope-decisions`, `integration/expo-go-phase` | 내용이 main에 있다. 합치지 않는다. 지울지는 사용자 확인 |
| `chagok-wt-watch-spike` | `spike/watch` | 워치 시험 구현. 커밋하지 않았고 합치지 않는다. 지울지 사용자 확인 |

## 다음 할 일

사용자 방침(2026-10-10): **계정·외부 설정이 필요한 일은 뒤로 미루고, 지금 개발할 수 있는 것부터.** 실기기 테스트는 맨 뒤. Google 로그인은 OAuth가 준비됐다는 말이 있을 때까지 제안하지 않는다.

**지금 개발할 수 있는 것**

1. **전수 테스트(2026-10-10)에서 나온 것** — 새 목표의 「칸 수 직접 입력」에 고른 값(15)이 미리 들어 있는 것은 그대로 두기로 했다(2026-10-12). 오픈소스 라이선스는 2026-10-11 앱에 들어가는 라이브러리 전부(91개, 원문 포함)로 채웠다 — `npm run licenses`로 다시 만든다. Android 네이티브 라이브러리 목록은 아직 없다.
2. **Android 점검** — 화면 QA는 2026-10-11 에뮬레이터(Android 16)에서 했다: 키보드가 기록 메모·칸 수 직접 입력을 가리는 문제를 고쳐 main에 합쳤다(`def1b33`, 사용자가 에뮬레이터에서 확인). 나머지 화면(홈·판·달력 스와이프·뒤로가기 확인 창·앱 설정·약관 시트·스티커 고르기·튜토리얼 스포트라이트·사진 고르기 취소)은 문제없음. 남은 것: Android 위젯(계획 2: 새 모양·목표 고르기·앱이 꺼졌을 때 첫 탭 유실 문제).
3. **앱 설정 마무리** — 전체 배치 시안 확정(배지 크기 12·14·18), 문의하기·앱 버전 줄.
4. **접근성** — 스크린리더 레이블(문안 사용자 확인). 로그인 버튼 높이 33·38·44 고르기(Storybook `Screens / Account consent`). 탭 대상 크기는 2026-10-11 Android에서 쟀다(dp): 홈 [앱 설정] 36×40, 판 [목표 설정] 40×40, 달력 날짜 칸 41×55(7열이라 폭 한계), [이전 달]·[접기]·홈 탭·[스티커 떼기] 높이 44. 기준(iOS 44 / Android 48)과 넓히는 방법(`hitSlop`이면 모양은 그대로) 사용자 결정 대기.
5. **출시 준비 문서** — 개인정보 라벨·데이터 보안·연령 등급·Privacy Manifest 답안 초안: [스토어 개인정보 신고 초안](release-store-privacy-draft.md)(2026-10-11 두 스토어 공식 정의와 대조 완료, 사용자 승인). Privacy Manifest는 `app.json`과 `plugins/widget-goal`로 앱·위젯 확장 둘 다에 들어간다(2026-10-15 prebuild 결과에서 두 `PrivacyInfo.xcprivacy`가 각 타깃 Resources에 있는 것 확인, ITMS-91053). 처리방침 5절 수탁자·보관 위치는 운영 서버를 고를 때 함께 정한다(서울 지역이면 지금 문구 그대로). 2026-10-11 기록에 **카메라 촬영**이 들어갔다 — 찍은 사진도 스토어 라벨의 「사진」이라 답안은 그대로이고, 처리방침 9절(사진 접근 권한)에 카메라 접근을 더한다. 남은 것: 스티커 원본 권리, KIPRIS 상표(9류·42류), 스토어 이름·설명·스크린샷 초안, `LICENSE` 종류(사용자 결정).
6. **워치** — 설계 승인(2026-10-16, PRD 4.14). 계획 1: 폰 쪽 TS(완성 요청, 성장 수, 블록 색, 스냅샷, 동기화)와 시험 구현(watchOS 타깃, WatchConnectivity, 글꼴과 그림, 시뮬레이터 짝짓기). 계획 1과 계획 2를 2026-10-17 main에 합쳤다. 계획 2(워치 앱 본 구현): 폰 네이티브 모듈 `modules/chagok-watch`, 워치 SwiftUI 앱 `targets/watch`(Logic은 `sh scripts/test-watch-logic.sh`로 테스트). 사용자가 정할 것과 임시로 정한 것은 [워치 앱 질문](superpowers/specs/2026-10-16-watch-app-questions.md). 워치 → 폰 요청은 시뮬레이터에서 폰 앱이 켜져 있을 때 도착했다. 실기기는 개발 빌드로 워치 등록(UDID)이 막혀서 TestFlight로 확인한다(2026-10-17, Xcode 27과 26.6 모두 워치를 못 알아봄).

**계정·외부 준비가 끝난 뒤**

- **결제·광고 출시 연결** — 코드는 Test Store·테스트 광고로 붙어 있다(2026-10-13). 남은 것: App Store Connect·Google Play 상품 등록과 RevenueCat 스토어 키, AdMob 가입(남편 명의)과 실제 앱 ID·광고 단위 ID, `app-ads.txt`, 약관·처리방침 1판의 결제·광고 조항 게시(정책 저장소 main에 있다, `[클라우드 사업자]` 빈칸을 채운 뒤 `publish`에 합친다), 통신판매업 신고 확인.
- **Apple 로그인**(다른 세션 진행 중), `apple-link`, Apple 토큰 폐기(그전에는 토큰이 있으면 계정 삭제가 멈춘다). 버튼은 연결 화면의 [개발 계정으로 계속] 자리에. 버튼 높이 44, Google 버튼 글자 19·로고 24·여백 19·14·19, 좁은 화면에서는 Google 버튼 안 전체를 같은 비율로 줄인다(2026-10-12 사용자 결정, Storybook `Screens/Account consent`·[시안](https://claude.ai/artifact/Masmo48AjPKNvZihxUobwR)).
- **출시 전에만 넣을 수 있는 것** — 한 번에 한 기기(서버 RPC `push_changes`·`replace_all`에서 확인·거절, 앱은 안내 후 다시 연결 — 문구 사용자 확인), 동기화 버전·최소 앱 버전(구버전 앱이 서버 기록을 망가뜨리지 않게, [버전 규칙](RELEASE-VERSIONING.md)).
- **TestFlight** — 2026-10-15 준비: EAS 환경 변수(preview·production)에 `EXPO_PUBLIC_SUPABASE_URL`·`EXPO_PUBLIC_SUPABASE_ANON_KEY`(개발 서버 `chagok-dev`)와 `EXPO_PUBLIC_REVENUECAT_KEY`(Test Store)를 `sensitive`로 넣었다. 개발 계정 이메일·비밀번호는 넣지 않는다. 운영 서버를 정하면 서버 값을, 정식 심사 전에는 결제 키를 실제 키로 바꾼다. **2026-10-17: 워치 TestFlight 확인용으로 `EXPO_PUBLIC_REVENUECAT_KEY`를 `production`에서 뺐다(`preview`에만 남음).** Release 빌드는 Test Store 키를 보면 「Wrong API Key」를 띄우고 앱을 닫는다(시뮬레이터에서 확인). 지금 `production` 빌드는 결제가 꺼져 있다. 실제 결제 키를 넣을 때 `production`에 다시 넣는다. App Store Connect에 앱을 등록했다(「차곡차곡: 스티커로 쌓는 기록」, Apple ID `6822964802` — `eas.json` `submit.production.ios.ascAppId`). 아직 업로드하지 않았다(사용자 결정). 올릴 때: `eas build --platform ios --profile production`(EAS 비용, 사용자에게 먼저 묻는다) → `eas submit --platform ios --profile production`. 판매 지역은 한국만으로 둔다(EU 거래자 입력 불필요). 셀룰러로 개발 빌드 보기는 [개발 설정](DEV-SETUP.md) 「Tailscale」. 출시 빌드에는 Apple 로그인이 main에 들어오기 전까지 로그인이 없다.
- **로그인 계획**(2026-10-15 확정) — Apple → 카카오 → Google 순. iOS는 Apple·카카오·Google, Android는 카카오·Google. Google은 무료 라이브러리 + nonce 확인 끄기, OAuth 준비 뒤. 조사 `docs/superpowers/specs/2026-10-15-social-login-research.md`, 계획 `docs/superpowers/plans/2026-10-15-social-login.md`. 로그인 버튼은 동그라미 아이콘(`LoginCircles`, 2026-10-15 틀4) — Apple 기본 버튼(`AppleAuthenticationButton`) 대신 이것을 쓴다. Apple 로고는 Apple 서버가 내려 주는 공식 로고 버튼 그림이다(`src/design-system/apple-logo.ts`, 2026-10-15).

**출시 직전에는** [출시 전 최종 점검](RELEASE-CHECKLIST.md)을 위에서부터 확인한다.

**사용자 결정이 필요한 것**은 [PRD 11절](PRD.md#11-남은-결정)과 [출시 준비 결정](RELEASE-DECISIONS.md) 「열림」에 있다. 운영 서버와 날짜·시간대 처리가 출시 전에 먼저 필요하다.

## 계정과 외부 준비

- Apple Developer Program: 남편 명의 개인 계정(노붐(NOVUM) · 대표 성민창, 개인사업자). 2026-10-05 승인, App Store Connect 열림. 상품·계약 등록 기록은 아직 없다.
- Google Cloud OAuth: 없다. Google Play는 개인 계정을 추천(개인 계정은 출시 전 테스터 12명·14일 비공개 테스트 필요).
- AdMob 계정: 아직 없다(스토어 계정과 같은 명의 추천).
- Expo 조직 `novum-lab`(EAS `@novum-lab/chagok`). 저장소 `nol-meok/chagok-app`.

## 아직 확인하지 못한 것

**실기기(사용자의 iPhone 15 Pro, iOS 26.6.2 · 개발 빌드 설치됨 — [개발 설정](DEV-SETUP.md) 「실기기 iPhone 개발 빌드」)**

- 새 목표 헤더가 시계와 겹치던 것(2026-10-10 고침: `app/_layout.tsx` `unstable_settings.anchor = 'index'`). 원인은 앱이 다시 불러와지거나 링크로 켜질 때 새 목표가 첫 화면이 되어 전체 화면으로 뜨는데, 시트용으로 위쪽 여백을 0으로 둔 것. 2026-10-12 실기기에서 고쳐진 것 확인. **출시 빌드에서 앱이 꺼진 상태로 위젯 「목표 만들기」를 눌러 켜는 경우는 개발 빌드로 재현이 안 돼 미확인.**
- 판 진입 스크롤(칸이 많은 판을 다시 열면 칸 테두리 없이 2열로 보이던 것 — 칸만 판 안에서 스크롤하게 고침).
- 기록 화면 첫 진입 때 스타일이 빠지던 것(재현 대기. 2026-10-09 `useLayoutSize`로 고친 것과 같은 원인일 가능성이 높다).
- 한글 키보드로 목표 이름 20번째 글자 조합.
- 위젯: 자정 넘김(시뮬레이터는 시각을 못 바꾼다), 탭 속도, 앱을 이틀 넘게 안 열었을 때 위젯 탭.
- 탭 조작·모션·햅틱 느낌, 모션 줄이기, 320pt 네이티브 폭.
- 하단 탭(2026-10-12): iOS 26.5 시뮬레이터·Android 에뮬레이터에서 탭 전환, 기록 탭 → 기록 화면, 스티커 탭 → 묶음 화면, 판 완성 뒤 권하기 → 스티커 탭, 체험 열림 카드 닫기를 확인. 실기기와 폴드 커버(344dp) 실기기는 미확인 — 폴드 폭은 Storybook 캡처로만 봤다. 개발 빌드에서는 Expo 개발 도구 톱니가 설정 탭 일부와 기록 화면 [저장]을 가린다(출시 빌드에는 없다).

**계정 화면**

- 계정 삭제, "이 기기 기록 사용하기"(서버 테스트 기록을 덮어씀 — 하기 전에 묻는다), 남은 기록이 있는 로그아웃 경고, 만 14세 미만 안내, 사진 복원, iOS 가장자리 스와이프, iOS 오프라인.
- 개발 서버 기록 "10분 독서"에 테스트로 붙인 스티커 1개(42번 칸)를 뗀다.

**그 밖**

- 백업 전송과 판 저장이 실제로 겹칠 때(2026-10-10 WAL + 대기 5초로 잠금 충돌은 기다리게 했다).
- 위젯의 알려진 한계: 위젯에서 쌓인 요청은 앱을 열기 전까지 다른 위젯 종류에 보이지 않는다. 앱이 요청을 읽은 직후부터 새 타임라인을 쓰기까지의 아주 짧은 틈에 누른 탭은 사라질 수 있다(다시 누르면 된다).
- 튜토리얼 스포트라이트 어긋남은 2026-10-10 iPhone에서 재현되지 않아 닫았다(예시 화면이 터치를 받지 않는다). Android는 Android 점검 때 같이 본다.

**시뮬레이터** — 확인은 기본으로 **iOS 26.5**(사용자 폰과 가장 가까운 버전, Xcode 27이 주는 최신)에서 한다. `iPhone 15 Pro (iOS 26.5)` `679C5118-84D9-4DA6-93FC-8486E90EAC89`, iPhone 17 Pro·Pro Max(26.5)도 있다. iOS 18.3은 비교용으로만(2026-06 Apple 집계로 iOS 26이 79%, 18이 약 14%). 앱 최소 지원은 iOS 16.4.

**개발 데이터 초기화(2026-10-12)** — 출시 전이라 기기 DB(v1)와 서버 마이그레이션을 최종 구조 하나로 합쳤다(DEV-SETUP 「개발 서버」). 개발 서버를 비우고 개발 계정을 다시 만들었고, 시뮬레이터 3대(iPhone 15 Pro 26.5 · 16 Pro · 16 Pro Max)와 에뮬레이터 `Chagok_Pixel_7`의 앱 데이터를 지웠다. **사용자 iPhone 개발 빌드는 앱을 지우고 다시 설치해야 한다**(옛 DB 구조로는 새 코드가 열지 못한다). `Pixel_7` AVD는 확인하지 않았다.
