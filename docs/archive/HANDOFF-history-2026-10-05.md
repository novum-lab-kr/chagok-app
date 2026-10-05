# HANDOFF 정리 보관본 (2026-10-05)

2026-10-05 [HANDOFF.md](../HANDOFF.md)를 정리하면서 뺀 내용이다. 끝난 일·바뀐 상태·오래된 우선순위를 그대로 옮겼다. 현재 상태는 HANDOFF를 본다.

## 0절 — 다음 세션 시작점 (2026-10-04 판, 우선순위 2026-10-03 갱신)

## 0. 다음 세션 시작점 (2026-10-04)

**레포 이전 준비 (2026-10-04).** 옮기기 전·후에 할 일과 git에 없는 것(키 파일, 커밋 안 한 작업 패치, 메모리 사본)은 [migration/README.md](migration/README.md). 확정한 캐릭터 데이터는 [design/character/](design/character/README.md), 시안 원본·고른 안·메모는 [design/proposals-2026-10/](design/proposals-2026-10/README.md).

**상태.** 홈 구조 전환(목록 / 판 상세 / 목표 설정 / 완성 흐름 / 5단계 튜토리얼, 스키마 v4)과 Expo Go 단계(약관 화면, 백업 기기 쪽, 위젯 스냅샷, 스키마 v5)가 main에 들어갔다. 홈 구조의 구현 기록·미확인 항목은 [DEV-DESIGN-home-structure.md](DEV-DESIGN-home-structure.md) 10절, Expo Go 단계의 범위와 결정은 [계획](superpowers/plans/2026-09-30-expo-go-phase.md)과 설계 문서 3개([약관](superpowers/specs/2026-09-30-policy-terms-design.md) · [계정·백업](superpowers/specs/2026-09-30-account-backup-design.md) · [위젯](superpowers/specs/2026-09-30-home-widget-design.md))가 단일 출처다.
2026-10-02 계정 화면 연결(개발 로그인: 시작·동의·연결·복원·충돌·로그아웃·계정 삭제·로그인 풀림 안내)이 main에 들어갔다([계획](superpowers/plans/2026-10-01-account-wiring.md), 확인 범위는 9절 위 「화면에 연결되지 않은 것」의 계정·백업 줄).

**계정 상태 (2026-10-05).** Apple Developer Program: 남편 명의 개인 계정으로 등록·결제 완료, **승인 대기**. Google Cloud OAuth: 아직 없음. Expo 조직 `novum-lab`(EAS 프로젝트 `@novum-lab/chagok`). 준비되지 않은 계정에 걸린 일(Apple 로그인·TestFlight·Google 로그인)은 다음 할 일로 제안하지 않는다(사용자 지시). 개발 빌드는 2026-10-05 전환했다([계획](superpowers/plans/2026-10-05-dev-build.md)).

**작업 방식 (2026-09-30 사용자 지시).**

- 작업 단위마다 main에서 브랜치를 딴다. 브랜치 이름과 맞지 않는 작업을 한 브랜치에 섞지 않는다.
- 계획·설계·코드는 사용자가 확인·승인하기 전에 커밋하지 않는다. 앱 저장소는 로컬 커밋까지만 하고 push는 사용자가 요청할 때 한다.

**다음에 할 일 — 우선순위 (2026-10-03 갱신, 위에서부터).** 작업마다 main에서 브랜치를 딴다. 실기기 테스트와 계정이 필요한 일은 맨 뒤다(사용자 지시).

**가. 사용자 결정 — 계정을 만들기 전에**

1. **시안 마무리** — 기록: [design/proposals-2026-10/](design/proposals-2026-10/README.md)(링크·원본·고른 안·메모). 확정한 것은 PRD 4.9·4.11, 캐릭터 데이터는 [design/character/](design/character/README.md).
   - **확정**: 메인 캐릭터 「차곡이」(책 모양 판 세 장, 기본 팔 없음, 표정 10가지와 쓰는 순간), 앱 아이콘 1안(민트 바탕 전신) + Android 적응형 A1, 스플래시 S2-B(윤곽선 → 색 채우기 → 좌우로 판 받기 → 커서 글자, 약 2.7초 — 캐릭터 README; 아이콘·스플래시는 2026-10-04 `app.json`·`app/_layout.tsx`에 연결, OS 그림은 개발 빌드에서 확인), 홈 화면 위젯(링 + 달력, 2026-10-04 — PRD 4.10, Storybook 반영), 진행 문구 `n% 채웠어요`, 목표 없음 = 졸린 표정, 앱 설정에 [문의하기]·[앱 버전].
   - **남음**: 앱 설정 배치(3안 프레임 없는 목록 + `PixelBadge` 머리글 유력, 배지 크기 12·14·18).
   - 모두 확정되면 Storybook·앱에 반영한다(시안은 아티팩트로 먼저 — WORKING-AGREEMENT 11절).
2. ~~**앱 식별자**~~ — 출시 준비 결정(확정·열린 항목)은 [RELEASE-DECISIONS.md](RELEASE-DECISIONS.md)에 모은다. **2026-10-04 확정: `com.novum.chagok`** (iOS 번들 ID·Android 패키지 이름 모두, `app.json` 반영). 스토어에 올리면 바꿀 수 없다. App Group은 `group.com.novum.chagok`(위젯 `expo-widgets`가 자동 설정), 워치 앱은 `com.novum.chagok.watchkitapp`처럼 아래에 붙는다. 커스텀 스킴 `chagok://`는 별개라 영향 없음. Google Play 계정 유형(개인/조직)은 따로 정한다(0절 아래 「수익화」 줄).
3. **수익 모델** — A 스티커 팩 판매(추천) / B 무료+배너 광고, 광고 제거 판매 / C 구독. 모델이 정해지면 4번 「수익화 기반」을 한다.
4. **운영 서버** — Supabase 클라우드 서울 별도 프로젝트(1순위, 무료면 매일 DB 내보내기) / VPS 셀프 호스팅(국외 이전 기재). 정해지면 처리방침 `[클라우드 사업자]`를 채운다.
5. **입력 길이 제한·날짜/시간대 정책** (PRD 11절 미확정) — 서버 컬럼 제약과 동기화 날짜 키에 걸리므로 운영 서버 전에 정한다.
6. **약관 변경 안내 범위** — `feat/terms-change-notice`는 로그인과 무관하게 모두에게, 약관만 알린다(약관 설계 「재동의」 2026-10-01 문장 그대로). 처리방침 개정도 알릴지, 쓰지 않게 된 `needsReconsent`·`requiresConsent`를 지울지 묻는다.
7. **`fix/light-mode-font-scale` 합치기** — 다크 모드 막기(`userInterfaceStyle: "light"`)와 글자 크기 고정(`allowFontScaling={false}`). 둘 다 2026-09-30 결정이고 PRD 6.1·6.2에 반영했다(2026-10-04). 사용자가 실기기에서 확인하면 main에 합친다. 같은 날짜의 범위 결정 기록 `docs/scope-decisions`(b06564f)는 내용을 PRD·HANDOFF에 옮겼으니 합치지 않아도 된다.

**나. 개발 — 계정 없이 (Expo Go·jest·Storybook)**

1. **약관 변경 안내 기기 확인** (2026-10-03 구현, 2026-10-04 사용자 요청으로 기기 확인 전에 main에 합침 — 오류는 기기 테스트에서 잡는다) — `upcomingChange`(게시일 ≤ 오늘 < 시행일, 처음 게시 제외, 한 번만)와 홈 연결. 로그인 풀림 안내가 끝난 뒤에 묻고, 시작 화면·튜토리얼 중에는 띄우지 않는다. 본 판 번호는 `app_settings.termsNoticeSeen`. jest·타입·린트·iOS 번들 통과. 정책 사이트에 v2를 올려야 화면에서 보이므로 기기 확인은 못 했다.
2. **한 번에 한 기기** (PRD 4.8, 2026-10-05 확정) — 계정마다 지금 쓰는 기기를 서버에 두고, 새 기기 로그인 때 복원보다 먼저 넘겨받는다. 서버 RPC 모든 쓰기(`push_changes`·`replace_all`)에서 확인·거절, 앱은 거절을 받으면 안내하고 다시 연결을 묻는다(문구 사용자 확인). 계기: 두 기기가 같은 개발 계정으로 같은 칸에 붙여 복원 뒤 카운트가 틀어짐(2026-10-05 에뮬레이터).
3. **동기화 버전·최소 앱 버전** (PRD에 없음) — 출시 뒤 스키마가 바뀌어도 구버전 앱이 서버 기록을 망가뜨리지 않게. 출시 전에만 넣을 수 있다. 업데이트 안내 문구는 사용자 확인. 플랫폼별 최소 빌드 번호로 둔다([버전 규칙](RELEASE-VERSIONING.md)).
4. **접근성** — 스크린리더 레이블 점검(PRD 6.1, 문안은 사용자 확인), 탭 대상 최소 크기.
5. **튜토리얼 안에서 스크롤하면 스포트라이트가 어긋나는 문제** (9절).
6. **출시 준비 문서** — 스티커 5종 원본 권리, KIPRIS 상표(9류·42류), 스토어 이름·설명·스크린샷 초안, 개인정보 라벨·연령 등급 답안. `LICENSE`(Expo 템플릿 MIT 그대로)는 라이선스 종류를 사용자가 정한다. Privacy Manifest는 Expo가 모아 주지 않는다 — 개발 빌드 때 `node_modules`의 PrivacyInfo를 보고 `app.json` `ios.privacyManifests`에 옮긴다(Expo 문서 「Apple privacy」).
7. **수익화 기반** (가-3 결정 뒤) — 기능 잠금 계층(`entitlements`, 지금은 모두 열림), 스티커 카탈로그에 팩 메타데이터 추가(기존 값 불변), 잠긴 스티커·구매·구매 복원 시안(아티팩트), 서버 `entitlements` 테이블·RLS(서버만 쓰기), 처리방침 제2판·약관 유료 조항 초안(청약철회·환불·미성년자 결제), 통신판매업 신고 필요 여부 확인. SDK는 RevenueCat `react-native-purchases`가 Expo Go에서 가짜 구매 모드로 돈다(expo-iap는 개발 빌드만). 광고(AdMob)는 개발 빌드가 필요하고 Expo 57에서 `react-native-google-mobile-ads` 설정 플러그인 문제가 보고돼 있다.
8. 로그인 버튼 높이 33·38·44 (Storybook `Screens / Account consent`).

**다. 후순위 — 실기기·계정 연동**

1. **실기기 확인이 밀린 수정 건** — 판 진입 스크롤(main에 있음), 기록 화면 첫 진입 스타일 빠짐(재현 대기), `fix/light-mode-font-scale`의 다크 모드·글자 크기. 사용자가 iPhone 15 Pro로 본다. 고정 헤더는 2026-10-01 실기기에서 확인됐다.
2. **계정 화면 남은 테스트** — 계정 삭제(개발 계정과 서버 테스트 기록이 지워짐 → `npm run server:dev-user`로 다시 만듦), "이 기기 기록 사용하기"(서버 테스트 기록을 덮어씀 — 하기 전에 묻는다), 남은 기록이 있는 로그아웃 경고, 만 14세 미만 안내, 사진 복원, iOS 가장자리 스와이프·iOS 오프라인. 개발 서버 기록 "10분 독서"에 테스트로 붙인 스티커 1개(42번 칸)를 뗀다.
3. **계정이 생긴 뒤:** ~~개발 빌드 전환(+`expo-system-ui`)~~ 2026-10-05 완료 → Google 로그인(Android) → Apple 로그인·`apple-link`·Apple 토큰 폐기 → 위젯 spike·네이티브 → 광고·결제 SDK. 로그인 버튼은 연결 화면의 [개발 계정으로 계속] 자리에 끼운다.

**나중에 정할 것 (설계 전에 범위부터 묻는다):** 푸시 알림, 이용 분석·오류 추적, 워치 아이디어(캐릭터 키우기 + 빠른 스티커 붙이기 — PRD 2절 제외 범위와 부딪침, PRD 11절).

**기기 테스트 방법 (2026-10-02).** Android 에뮬레이터 `Chagok_Pixel_7`(`adb shell input tap`·`screencap`, 비행기 모드 `cmd connectivity airplane-mode enable`), iPhone 16 Pro 시뮬레이터(Maestro `brew install mobile-dev-inc/tap/maestro`, `--device` UDID 지정, 글자로 `tapOn`). 이 Mac의 Xcode 27에는 Simulator 앱이 없어 시뮬레이터가 창 없이 돈다. Expo Go 개발 도구 버튼(톱니)이 앱 설정 버튼 위에 겹치므로 앱 설정은 `exp://…/--/settings` 링크로 연다.

**개발 중에 만나면 사용자에게 묻는 것 (아직 열린 결정).**

- ~~튜토리얼 다시 보기 진입 위치~~ → 2026-09-30 A안 확정: 앱 설정 → 도움말 → 사용법 다시 보기(`/tutorial`).
- ~~수동 완성 확인 문구~~ → 2026-09-30 확정: "완성해도 계속하기로 다시 이어 쓸 수 있어요".
- 앱 이름: "차곡차곡" 유지, 스토어 이름에 설명을 붙인다(2026-09-30). 스토어 문구와 상표 확인은 출시 때.
- ~~목표 설정에서 칸 수 변경~~ → 2026-09-30 확정: 진행 중인 적립판은 늘리기만(`feat/tally-slot-edit`). 판 종류 변경은 할 수 없다(2026-09-30 확정, PRD 4.4).
- 약관 게시와 Google 로그인 도메인: 스토어 제출 전 약관 게시, OAuth 승인 도메인·브랜드 인증에서 `netlify.app` 주소가 통하는지 확인(나중에 처리, [약관 설계](superpowers/specs/2026-09-30-policy-terms-design.md) 「게시 상태」).
- 수익화(광고·인앱 결제): 미확정 — 들어갈 수 있으니 없다고 확정하지 않는다(2026-09-30). 스토어 계정은 남편 명의(노붐(NOVUM) · 대표 성민창, 개인사업자). Apple은 개인사업자라 개인 계정(판매자 = 실명)만 된다. Google Play도 **개인 계정**을 추천했다 — 개인사업자 조직 계정은 판매 대금용 결제 프로필을 만들 수 없다고 알려져 있어(국내 도움말·경험담, 공식 확인 전) 인앱 결제를 넣으면 계정을 옮겨야 할 수 있다. 대신 개인 계정은 출시 전 테스터 12명·14일 비공개 테스트가 필요하다. 광고(AdMob) 수익은 Play 결제 프로필과 별개다.
- 푸시 알림: 나중에 개발한다(2026-09-30 사용자 요청, 기록만). 범위·종류가 모두 미확정이라 설계 전에 묻는다. 메모는 9절 「나중에 개발할 것」.

**정한 값 (다시 묻지 않는다).** 완성 모션은 [완성] 스티커 붙이기 모션 하나, 칸 수 상한 없음(칸 늘리기 기본값은 처음 칸 수만큼 더하기), 기간 없는 달력판은 미래 달 이동 가능, 삭제·떼기 확인은 기존 `basic` 다이얼로그, 판 조작은 빈칸 한 번 = 붙이기, 붙인 칸 한 번 = 기록 열기 / 꾹 = 떼기(2026-10-05 변경). 로그인·약관·위젯·백업의 결정은 PRD 확정 이력 2026-09-30 행들.

## 9절 — 끝났거나 상태가 바뀐 항목

**Expo Go로 할 수 있는 것**

- ~~계정 관련 화면 Storybook 구성~~ 2026-10-01 완료, 2026-10-02 앱 연결(개발 로그인).
- ~~사진 줄이기~~ 완료: `SupabasePhotoStore`가 긴 변 1600px·JPEG 80%로 줄여 올린다(`expo-image-manipulator`).
- ~~튜토리얼 다시 보기~~ 2026-09-30 완료(`/tutorial`). 튜토리얼이 단계마다 자기 예시 화면을 새로 그려서 목록 스크롤과 무관하다. 튜토리얼 화면 안에서 스크롤하면 스포트라이트가 어긋나는 문제는 첫 실행과 같이 남아 있다.
**준비물이 필요한 것** (Docker Desktop, Apple Developer Program, Google Cloud OAuth — 2026-09-30 기준 없음)

- **2026-09-30 정정: Apple Developer Program(유료)이 꼭 필요한 것은 Apple 로그인, TestFlight, 심사 제출뿐이다.** 개발 빌드 전환과 iOS 위젯 개발은 시뮬레이터에서 계정 없이 된다. 실기기는 무료 Apple ID로 설치할 수 있을 것으로 보지만(7일마다 재설치, Apple 로그인 권한이 들어가면 빌드 불가) 직접 확인하지 않았다 — 위젯 spike에서 먼저 확인한다. 계정을 먼저 만들라고 권하지 않는다.
- ~~개발 빌드 전환(`npx expo run:ios`/`run:android`, prebuild 폴더는 커밋하지 않음)과 `docs/DEV-SETUP.md` 갱신.~~ 2026-10-05 완료(`feat/dev-build`): `expo-dev-client`·`expo-system-ui`·`react-native-worklets`(reanimated 필수 peer — Expo Go 밖에서 빠지면 죽을 수 있음), iOS 시뮬레이터·Android 에뮬레이터 빌드 확인, OS 앱 아이콘(iOS·Android 런처)·스플래시 확인, EAS 프로젝트 연결과 `eas.json`. EAS 클라우드 빌드는 아직 돌리지 않았다 — 그전에 서버 주소·키를 EAS 환경 변수로 넣는다.
- ~~서버~~ 2026-09-30 완료(`feat/server-local`): 개발 서버는 Supabase 클라우드 무료 프로젝트 `chagok-dev`(서울, Docker 불필요). 테이블·RLS·RPC 5개·`record-photos` 버킷·`delete-account`를 올렸고, 가짜 서버와 같은 계약 테스트를 실제 서버에도 돌린다(`npm run test:server`). 남은 것: **운영 서버 결정**(Supabase 클라우드 서울 별도 프로젝트 1순위 — 무료면 매일 DB 백업 작업 필수 / VPS 셀프 호스팅은 국외 이전 기재), `apple-link`와 **Apple 토큰 폐기**(그전에는 토큰이 있으면 계정 삭제가 멈춘다).
- ~~앱 연결~~ 2026-09-30 완료: `SupabaseSyncServer`·`SupabasePhotoStore`(1600px·JPEG 80%), 로그인해 있는 동안 자동 전송(`connectSync`, 기록 2초 뒤·앱이 앞으로 올 때). 개발용 이메일 로그인과 `/dev/sync` 화면으로 Expo Go에서 확인한다. ~~남은 것: 앱 설정의 백업 상태, 계정 화면·실제 로그아웃·계정 삭제 흐름 연결, 복원 충돌 선택.~~ 2026-10-02 완료(`feat/account-wiring`).
- 로그인: Google(Android) 먼저, Apple은 계정 승인 뒤. 시작·동의·복원 분기·로그아웃·계정 삭제 화면은 2026-10-02 개발 로그인으로 연결해 두었다 — 연결 화면의 [개발 계정으로 계속] 자리에 Apple·Google 버튼을 끼운다. 재동의 화면은 두지 않는다(약관 변경 안내로 대신, 0절 우선순위 1).
- 위젯: spike(글꼴·PNG 스티커·딥링크·목표 선택 + **2026-10-04 추가:** 위젯 안 버튼으로 앱을 열지 않고 붙이기 — iOS App Intent·App Group 저장과 앱 DB 합치기, Android `widgetTaskHandler`에서 expo-sqlite 쓰기 가능 여부 / 링 중간 목표 세 개 고르기 / iOS 투명·틴트 모드에서 글자·스티커·캐릭터 표시(`widgetAccentedRenderingMode`) / 기본 모드에서 유리 바탕을 직접 고를 수 있는지) → iOS `expo-widgets`, Android `react-native-android-widget`. `expo-widgets` 버튼은 위젯 props만 바꾸고 앱 기록에는 쓰지 못한다(문서 확인 2026-10-04) — 붙이기는 Swift 쪽이 필요하다.
- 스토어 빌드: EAS Build, 빌드 번호는 EAS 원격 자동 증가. 사용자 버전·태그·Wear OS 번호대는 [버전 규칙](RELEASE-VERSIONING.md)(2026-10-04).


**나중에 따로 고칠 것**

- **~~(수정 건)~~ 2026-09-30 `fix/board-entry-scroll`에서 고침 — 실기기 확인 대기.** 칸이 많은 판(100칸)을 다시 열면 화면이 넘어오는 동안 칸 테두리 없이 2열로 보였다(실기기 녹화 16:11). 판 안의 첫 프레임 폭 추정(`useContentWidth`)이 판 안쪽 여백을 빼지 않아 칸이 넘쳤고, 픽셀 테두리는 크기를 잰 다음 프레임에 그려진다. `PixelPanel`이 안쪽 여백을 컨텍스트로 넘기고, 판 상세는 크기를 재고 빈칸으로 스크롤할 때까지 판을 가린다(`board-panel`, 제목 줄은 바로 보인다). Storybook에서 판이 처음 보이는 프레임에 테두리가 모두 그려져 있고 칸 폭이 84인 것을 확인했다. 같은 브랜치에서 판 윗부분(테두리·목표 이름·진행 줄)을 고정하고 칸만 판 안에서 스크롤하게 바꿨다(사용자 결정 — 빈칸으로 옮기면 목표가 가려져 어색했다). `RetroScreen scrollable={false}` + `CenteringScrollView`(`board-scroll`). 칸이 적은 판은 높이가 그대로다.
- **~~(다음 수정 건)~~ 2026-09-30 `fix/fixed-header-scroll`에서 고침 — 사용자가 실기기(iPhone 15 Pro)에서 확인함(2026-10-01).** `RetroScreen`의 `header` prop에 넣은 헤더는 스크롤 밖에 고정되고, 상태 표시줄 여백도 스크롤 밖으로 옮겼다. 목록은 탭·`+` 줄까지 고정했다. Storybook 첫 화면은 전후가 같다(74장 중 1장만 3픽셀 차이). 아래는 당시 기록.
- 헤더는 고정하고 아래 내용만 스크롤되게 화면 구조를 바꾼다 (2026-09-30 사용자 요청, 실기기 녹화 15:15·15:16).
  - 증상: 칸이 많은 판 상세(적립판 30칸)나 긴 라이선스 본문을 스크롤하면 헤더(뒤로가기·화면 제목)까지 함께 올라가고, 내용이 상태 표시줄(시계) 영역에 겹친다. 약관과 라이선스 화면도 같다.
  - 원인: `RetroScreen`(`src/design-system/composition-controls.tsx`)이 `insets.top` 여백과 헤더를 모두 `ScrollView` 내용 안에 둔다.
  - 방향: `RetroScreen`에 고정 영역(헤더) 자리를 선택 prop으로 추가한다. 상태 표시줄 여백과 헤더는 스크롤 밖에 고정하고, 내용만 스크롤한다. 스크롤한 내용은 헤더 아래에서 잘리고 시계 영역에 비치지 않아야 한다. 대상은 `ScreenHeader`·`AppHeader`를 쓰는 모든 화면(목록, 판 상세, 목표 설정, 새 목표, 칸 늘리기, 기록, 앱 설정, 약관과 라이선스, 라이선스 상세)이다. 목록 화면에서 `GoalListHeader`(탭·`+`)까지 고정할지는 그때 정한다.
  - 함께 고칠 것: 라이선스 상세(`LicenseDetailScreen`)가 `RetroScreen` 스크롤 안에 `ScrollView`를 하나 더 둬서 스크롤이 두 겹이다. 바깥 스크롤 하나로 합친다.
  - 지킬 것: `RetroScreen`의 키보드 처리(포커스한 입력칸을 키보드 위로 올림)는 스크롤 위치를 쓰므로 그대로 동작해야 한다. 튜토리얼 스포트라이트는 대상 위치를 재서 그리므로 헤더가 고정된 뒤에도 맞는지 확인한다. 토큰·프레임 값은 바꾸지 않는다.
  - 검증: 390·320 Storybook 캡처를 전후로 비교해 스크롤 전 첫 화면이 같은지 보고, 실기기에서 30칸 적립판과 Neo둥근모 라이선스 본문을 스크롤해 확인한다.
