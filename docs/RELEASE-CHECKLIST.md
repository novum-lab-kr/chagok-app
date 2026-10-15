# 출시 전 최종 점검

스토어에 심사를 내기 직전에 위에서부터 차례로 확인한다. 한 항목이라도 비면 내지 않는다.
결정 내용은 [출시 준비 결정](RELEASE-DECISIONS.md), 번호 규칙은 [버전 규칙](RELEASE-VERSIONING.md)에 있다. 여기는 **확인 목록만** 둔다.

처음 만듦: 2026-10-11. 이미 끝난 항목은 `[x]`와 날짜. 출시 때마다 「출시할 때마다」 절은 다시 비운다.

## 1. 정해져 있어야 하는 것

- [ ] [출시 준비 결정](RELEASE-DECISIONS.md)과 [PRD 11절](PRD.md#11-남은-결정)에 출시를 막는 「열림」이 없다. 특히 운영 서버, 날짜·시간대 처리, 출시 묶음 수·주제.
- [ ] 스토어 앱 이름이 쓸 수 있는 이름이다(KIPRIS 9류·42류 상표 확인).
- [ ] 스티커 그림 원본 권리가 정리돼 있다.
- [ ] 저장소 `LICENSE` 종류를 정했다.

## 2. 코드

- [ ] main이 깨끗하고, 합치지 않은 출시 관련 브랜치가 없다(HANDOFF 「진행 중인 브랜치」).
- [ ] `npm test`, `npm run test:components`, `npm run typecheck`, `npm run lint`(오류 0), `npx expo export --platform ios`·`android`가 모두 통과한다.
- [ ] 개발용 대역이 남아 있지 않다:
  - 결제·광고가 `src/purchases`의 개발용 대역이 아니라 RevenueCat·AdMob이다.
  - RevenueCat 키가 Test Store 키(`test_`로 시작)가 아니라 iOS·Android 스토어 키다. Test Store 키로 만든 출시 빌드는 SDK가 일부러 멈춘다.
  - AdMob 앱 ID(`app.json` 플러그인 `react-native-google-mobile-ads`)와 광고 단위 ID(`src/purchases/admob.ts` `adUnits`)가 Google 테스트 ID(`ca-app-pub-3940256099942544`)가 아니다.
  - 연결 화면의 [개발 계정으로 계속], `/dev/sync`가 출시 빌드에 보이지 않는다(`__DEV__`).
- [x] 다크 모드 막기·글자 크기 고정이 들어가 있다(`app.json` `userInterfaceStyle: "light"`, `allowFontScaling={false}`, PRD 6.2). 2026-10-12 실기기 확인.
- [ ] 한 번에 한 기기, 동기화 버전·최소 앱 버전이 서버와 앱에 들어가 있다(PRD 4.8, [버전 규칙](RELEASE-VERSIONING.md) 「가끔」).
- [ ] 오픈소스 라이선스 목록이 지금 의존성과 맞다: `npm run licenses`를 돌려 `src/policy/oss-licenses.generated.ts`가 바뀌지 않는다. 바뀌면 커밋한다. 「LICENSE 파일이 없는 패키지」로 멈추면 원래 저장소의 LICENSE를 확인해 `scripts/licenses/packages.json`에 더한다. 네이티브 라이브러리(`scripts/licenses/native.json`)는 React Native를 올렸을 때 버전을 맞춘다.
- [ ] Android 앱 라이선스 목록에 AndroidX 등 Android 네이티브 라이브러리가 들어가 있다(아직 없음 — Android 위젯 작업 때).

## 3. 빌드 설정

- [ ] `app.json` `version`을 올렸다([버전 규칙](RELEASE-VERSIONING.md)).
- [ ] 운영 서버 주소·키가 EAS 환경 변수에 있다. 클라우드 빌드는 `.env.local`을 읽지 않는다. 2026-10-15부터 preview·production에 **개발 서버 `chagok-dev` 값과 RevenueCat Test Store 키**가 들어 있다 — 운영 서버 값과 스토어 키로 바꾼다(`npx eas-cli env:list --environment production`).
- [x] `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`가 있다(2026-10-10).
- [x] 개인정보 매니페스트(Privacy Manifest)가 앱과 위젯 양쪽에 있다(2026-10-15 prebuild 결과로 확인). 새 네이티브 라이브러리를 더했으면 다시 본다.
- [ ] 로컬에서 빌드한다면 `npx expo prebuild --clean`을 먼저 했다(옛 `ios/` 문제, [PITFALLS](PITFALLS.md)).

## 4. 출시 빌드로 실기기 점검

개발 빌드가 아니라 **TestFlight·Play 내부 테스트 빌드**로 iPhone과 Android 폰에서 본다. 개발 빌드에서는 재현되지 않는 것이 있다.

- [ ] 새로 설치: 시작 → 약관 동의 → 튜토리얼 → 계정 연결 → 첫 목표.
- [ ] 판: 스티커 붙이기·떼기, 기록 메모·사진, 다 채운 판, 칸이 많은 판 스크롤.
- [ ] 위젯 3종 추가와 탭. **앱이 꺼진 상태에서 위젯 「목표 만들기」로 켜기**(새 목표 헤더가 시계와 겹치지 않는다), 자정 넘김, 앱을 이틀 넘게 안 열었을 때.
- [ ] 결제: 묶음 구매, 광고 제거 구매, 구매 복원, 결제 취소·실패 문구.
- [ ] 광고: 홈 배너, 보상형 광고, 광고 제거 뒤 사라짐.
- [ ] 계정: 로그인(Apple, Android는 Google), 다른 기기에서 복원, 로그아웃, 계정 삭제.
- [ ] 오프라인에서 기록 → 다시 연결되면 동기화.
- [ ] 앱 설정 → 약관과 라이선스: 이용약관·처리방침이 공개 주소로 열리고, 오픈소스 라이선스 본문이 열린다.
- [ ] 큰 글자·스크린리더·모션 줄이기(PRD 6.1).

## 5. 스토어 제출물

- [ ] 이용약관·개인정보 처리방침이 정식 주소에 게시돼 있고 앱 안 링크와 같다. 결제·광고 조항이 들어간 1판이다(정식 출시 전 변경은 모두 1판에, 2026-10-14).
- [ ] 통신판매업 신고가 필요한지 확인했다(필요하면 신고 번호를 약관·스토어에). 면제 기준은 [법령 검토](LEGAL-REVIEW.md) 1절.
- [ ] 판매 지역: 첫 출시는 **한국만**(2026-10-15). EU를 빼면 「EU 거래자 자격(DSA)」 입력이 필요 없다. 중국 본토는 제외한다. 넓힐 때는 [출시 준비 결정](RELEASE-DECISIONS.md) 「해외 확장」을 본다.
- [ ] App Store Connect(앱 등록 2026-10-15, Apple ID `6822964802`): 앱 정보, 설명·키워드·스크린샷, 개인정보 라벨, 연령 등급, 인앱 상품(묶음·광고 제거)과 유료 앱 계약. 유료 앱 계약·세금·은행 정보가 빠지면 스토어가 가격을 돌려주지 않아 화면에 가격이 안 나온다(PRD 4.12).
- [ ] Google Play Console: 스토어 등록정보, 데이터 보안, 콘텐츠 등급, 인앱 상품. 개인 계정이면 **테스터 12명·14일 비공개 테스트**를 마쳤다.
- [ ] `app-ads.txt`를 개발자 웹사이트에 올렸다(AdMob).
- [ ] 심사용 메모: 로그인 없이 쓸 수 있다는 설명, 필요하면 테스트 계정.

## 6. 출시할 때마다

- [ ] **법령 검토**: [법령 검토](LEGAL-REVIEW.md) 2절대로 약관·처리방침이 기대는 법령에 개정·시행예정이 없는지 보고, 3절에 기록했다.
- [ ] **약관·처리방침이 여전히 맞다**: 이번 업데이트의 새 정보 수집·외부 회사·유료 상품·가격·환불 방식이 문서에 있다(같은 문서 2절 4번). 고쳤으면 새 판을 게시하고 앱의 동의 판 번호를 올렸다.
- [ ] 스토어 「새로운 기능」 문구(한국어, iOS·Android 각각).
- [ ] 낸 커밋에 git 태그(`v1.0.0`).
- [ ] 출시 뒤 HANDOFF의 「지금 상태」를 고친다.
