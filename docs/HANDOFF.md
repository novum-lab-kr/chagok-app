# 차곡차곡 디자인 시스템 인계

갱신: 2026-10-05 · 프로젝트: `chagok-app` 저장소 루트 (로컬 경로는 레포 이전 때 바뀔 수 있다 — [migration/README.md](migration/README.md))

구현 현황과 시각 기준의 단일 출처다. 제품 요구사항은 [PRD.md](PRD.md), 작업 방식은 [WORKING-AGREEMENT.md](WORKING-AGREEMENT.md)를 따른다. 이미 끝난 수정 이력은 git 기록과 [보관본](archive/HANDOFF-design-system-history-2026-09-23.md)에 있다.

## 0. 다음 세션 시작점 (2026-10-05)

정리 전 0절(2026-10-03 우선순위)과 끝난 9절 항목은 [보관본](archive/HANDOFF-history-2026-10-05.md)에 있다. 레포 이전 절차는 [migration/README.md](migration/README.md), 캐릭터 데이터는 [design/character/](design/character/README.md), 시안 원본·고른 안·메모는 [design/proposals-2026-10/](design/proposals-2026-10/README.md).

**상태 (2026-10-05).** main에 들어간 것:

- 홈 구조
- Expo Go 단계: 약관, 백업, 위젯 스냅샷, 스키마 v5
- 계정 화면 연결(개발 로그인)
- 차곡이 아이콘·스플래시·헤더
- 약관 변경 안내
- 개발 빌드 전환
- 판 조작 변경: 붙인 칸 한 번 = 기록, 꾹 = 떼기
- 적립판 다시 그리기 최적화
- 컬러 스티커 자산(5절)

구현 기록: [DEV-DESIGN-home-structure.md](DEV-DESIGN-home-structure.md) 10절, [Expo Go 단계 계획](superpowers/plans/2026-09-30-expo-go-phase.md), [계정 연결 계획](superpowers/plans/2026-10-01-account-wiring.md), [개발 빌드 계획](superpowers/plans/2026-10-05-dev-build.md).

**main에 합치지 않은 브랜치.**

| 브랜치 | 내용 | 할 일 |
| --- | --- | --- |
| `spike/widgets` (worktree `chagok-wt-widgets`) | 위젯 spike 코드, 결과 문서 `docs/superpowers/specs/2026-10-05-widget-spike-results.md` | 코드는 합치지 않는다. 사용자 결정 뒤 결과 문서와 스크린샷만 main으로 옮긴다 |
| `fix/light-mode-font-scale` | 다크 모드 막기, 글자 크기 고정 (PRD 6.1·6.2) | 사용자가 실기기에서 확인하면 합친다 |
| `docs/scope-decisions` | 2026-09-30 범위 결정 | 내용을 PRD·HANDOFF로 옮겼으니 합치지 않는다 |

**계정 상태 (2026-10-05).**

- Apple Developer Program: 남편 명의 개인 계정, **2026-10-05 승인**(App Store Connect 열림).
- Google Cloud OAuth: 아직 없다. 준비됐다는 말이 있을 때까지 Google 로그인을 다음 할 일로 제안하지 않는다(사용자 지시).
- Expo 조직 `novum-lab`(EAS `@novum-lab/chagok`).

**작업 방식 (2026-09-30 사용자 지시).**

- 작업 단위마다 main에서 브랜치를 딴다. 브랜치 이름과 맞지 않는 작업을 한 브랜치에 섞지 않는다.
- 계획·설계·코드는 사용자가 확인·승인하기 전에 커밋하지 않는다. 앱 저장소는 로컬 커밋까지만 하고 push는 사용자가 요청할 때 한다.
- 시안은 아티팩트로 먼저 보여 주고, 모두 확정되면 Storybook·앱에 반영한다(WORKING-AGREEMENT 11절).

**다음에 할 일 — 우선순위 (2026-10-05 갱신, 위에서부터).** 실기기 테스트는 맨 뒤다(사용자 지시).

1. **위젯** (2026-10-05 `docs/monetization-decisions`는 main에 합쳤다)
   - **모양은 2026-10-05 다시 확정했다** — PRD 4.10, [위젯 스타일 시안](https://claude.ai/artifact/47ZmtU8SZbzWQSNb8sDkXM) 11차. 세 종류(목표 하나 · 이번 달 · 적립판), 큰 % + 차곡이 말풍선 `Ready?`/`Nice!` + 이름, 색은 아이보리·흰색(라이트·다크는 홈 화면을 따름).
   - spike에서 찾은 버그: 링 가운데(스티커)를 누르면 붙지 않고 앱이 열린다(iPhone 16 Pro 시뮬레이터 재현). 버튼 모양이 그림의 불투명한 부분뿐이라 투명한 곳의 탭이 위젯 전체의 `widgetURL`로 넘어간다 → 버튼에 `contentShape`(누르는 곳 전체)를 주고, 붙이기 영역과 앱 열기 영역을 겹치지 않게 나눈다.
   - 다음: spike 코드에 새 모양과 탭 수정을 넣어 iPhone 16 Pro에서 다시 확인 → 남은 spike 결정(iOS 위젯마다 목표 고르기 가/나/다, Android 앱이 꺼져 있을 때 첫 탭 유실) → 결과 문서만 main으로 옮기고 본 구현.
   - 위젯은 컬러 스티커로 그렸다. 앱 스티커를 컬러로 바꿀지(2번)와 함께 정한다.
2. **스티커 화면 다시 설계.** 사용자가 요청할 때 시작한다(2026-10-05 "스토리북 에셋이 다 확인되면 화면 설계 다시 하자고 할게").
   - 대상: 묶음별 스티커 선택기, 잠긴 묶음, 묶음 상세·구매, 구매 복원, 광고 제거 진입, 구독이 끝난 뒤 보이는 모습.
   - 먼저 정할 것:
     - 출시 때 낼 유료 묶음(후보 6개 중)과 팩당 개수 — 처음 정한 「6종 팩 3개」를 다시 정한다
     - 10개 묶음의 가격
     - 흑백 스티커를 컬러로 바꿀지(바꾸면 저장된 `stickerType` 마이그레이션이 필요하다)
     - 판 칸 스티커 크기: 지금 44px이다. 컬러 24칸 그림은 24의 정수배인 48px이어야 선명하다.
3. **수익화 기반**
   - 권한 계층(RevenueCat entitlements): 팩은 구매 또는 구독이면 쓸 수 있고, 광고는 광고 제거 구매 또는 구독이면 꺼진다.
   - 카탈로그에 팩 정보 연결
   - RevenueCat `react-native-purchases`
   - 서버 `entitlements` 테이블·RLS(서버만 쓰기)
   - 비맞춤 배너(AdMob): 홈 `내 목표`·`완성한 판` 아래 고정(광고 위치 시안 p1). Expo 57에서 `react-native-google-mobile-ads` 설정 플러그인 문제가 보고돼 있다.
   - 처리방침 제2판, 약관 유료 조항(청약철회·환불·미성년자 결제)
   - 통신판매업 신고가 필요한지 확인
4. **출시 전에만 넣을 수 있는 것**
   - **한 번에 한 기기** (PRD 4.8, 2026-10-05 확정, 구현 브랜치 없음)
     - 계정마다 지금 쓰는 기기를 서버에 두고, 새 기기에서 로그인하면 복원보다 먼저 넘겨받는다.
     - 서버 RPC의 모든 쓰기(`push_changes`·`replace_all`)에서 확인하고 거절한다.
     - 앱은 거절을 받으면 안내하고 다시 연결할지 묻는다(문구 사용자 확인).
   - **동기화 버전·최소 앱 버전** (PRD에 없음)
     - 출시 뒤 스키마가 바뀌어도 구버전 앱이 서버 기록을 망가뜨리지 않게 한다.
     - 플랫폼별 최소 빌드 번호로 둔다([버전 규칙](RELEASE-VERSIONING.md)). 업데이트 안내 문구는 사용자 확인.
5. **Apple 계정으로 이제 할 수 있는 것**
   - Apple 로그인, `apple-link`, Apple 토큰 폐기(그전에는 토큰이 있으면 계정 삭제가 멈춘다). 로그인 버튼은 연결 화면의 [개발 계정으로 계속] 자리에 끼운다.
   - TestFlight. EAS 클라우드 빌드 전에 서버 주소·키를 EAS 환경 변수로 넣는다.
   - 위젯 본 구현(1번 결정 뒤): iOS `expo-widgets` + 글꼴 설정 플러그인, Android `react-native-android-widget`.
6. **사용자 결정 — 출시 전에 필요**
   - 앱 설정 배치: 시안 마무리의 마지막 항목. 3안(프레임 없는 목록 + `PixelBadge` 머리글)이 유력하고, 배지 크기는 12·14·18 중에서 고른다.
   - 운영 서버: Supabase 클라우드 서울 별도 프로젝트(1순위, 무료면 매일 DB 내보내기) 또는 VPS 셀프 호스팅(국외 이전 기재). 정해지면 처리방침 `[클라우드 사업자]`를 채운다.
   - 입력 길이 제한·날짜/시간대 정책(PRD 11절): 서버 컬럼 제약과 동기화 날짜 키에 걸리므로 운영 서버보다 먼저 정한다.
   - 약관 변경 안내 범위: 처리방침 개정도 알릴지, 쓰지 않게 된 `needsReconsent`·`requiresConsent`를 지울지.
   - Google Play 계정 유형: 개인을 추천한다. 개인 계정은 출시 전 테스터 12명·14일 비공개 테스트가 필요하다.
7. **개발 — 언제든**
   - 약관 변경 안내 기기 확인: 코드는 main에 있다. 정책 사이트에 v2를 올려야 화면에서 보인다.
   - 접근성: 스크린리더 레이블(문안 사용자 확인), 탭 대상 최소 크기.
   - 튜토리얼 안에서 스크롤하면 스포트라이트가 어긋나는 문제(9절).
   - 출시 준비 문서
     - 스티커 원본 권리
     - KIPRIS 상표(9류·42류)
     - 스토어 이름·설명·스크린샷 초안
     - 개인정보 라벨·연령 등급 답안
     - `LICENSE` 종류(사용자 결정)
     - Privacy Manifest: 개발 빌드의 `node_modules` PrivacyInfo를 보고 `app.json` `ios.privacyManifests`에 옮긴다.
   - 로그인 버튼 높이 33·38·44 (Storybook `Screens / Account consent`).
8. **후순위 — 실기기**
   - 실기기 확인이 밀린 수정 건(사용자가 iPhone 15 Pro로 본다)
     - 판 진입 스크롤
     - 기록 화면 첫 진입 때 스타일이 빠지는 문제(재현 대기)
     - `fix/light-mode-font-scale`
   - 계정 화면 남은 테스트
     - 계정 삭제: 지우면 `npm run server:dev-user`로 개발 계정을 다시 만든다.
     - "이 기기 기록 사용하기": 서버 테스트 기록을 덮어쓰므로 하기 전에 묻는다.
     - 남은 기록이 있는 로그아웃 경고, 만 14세 미만 안내, 사진 복원
     - iOS 가장자리 스와이프, iOS 오프라인
     - 개발 서버 기록 "10분 독서"에 테스트로 붙인 스티커 1개(42번 칸)를 뗀다.
   - Google 로그인(Android): OAuth 준비 뒤.

**나중에 정할 것 (설계 전에 범위부터 묻는다):** 푸시 알림, 이용 분석·오류 추적, 구독 플랜(모든 팩 + 광고 제거), 맞춤 광고 전환, 해외 출시, 워치 아이디어(캐릭터 키우기 + 빠른 스티커 붙이기 — PRD 2절 제외 범위와 부딪침, PRD 11절).

**기기 테스트 방법 (2026-10-02).**

- Android 에뮬레이터 `Chagok_Pixel_7`: 조작은 `adb shell input tap`·`screencap`, 비행기 모드는 `cmd connectivity airplane-mode enable`.
- iPhone 16 Pro 시뮬레이터: Maestro(`brew install mobile-dev-inc/tap/maestro`), `--device`로 UDID 지정, 글자로 `tapOn`. 이 Mac의 Xcode 27에는 Simulator 앱이 없어 시뮬레이터가 창 없이 돈다.
- 개발 빌드는 [DEV-SETUP](DEV-SETUP.md) 「개발 빌드」.

**개발 중에 만나면 사용자에게 묻는 것 (아직 열린 결정).**

- 앱 이름: "차곡차곡"을 유지하고 스토어 이름에 설명을 붙인다(2026-09-30). 스토어 문구와 상표 확인은 출시 때 한다.
- 약관 게시와 Google 로그인 도메인: 스토어 제출 전에 약관을 게시한다. OAuth 승인 도메인·브랜드 인증에서 `netlify.app` 주소가 통하는지 확인한다([약관 설계](superpowers/specs/2026-09-30-policy-terms-design.md) 「게시 상태」).
- 스토어 계정은 남편 명의다(노붐(NOVUM) · 대표 성민창, 개인사업자).
  - Apple은 개인 계정(판매자 = 실명)만 된다.
  - Google Play는 개인 계정을 추천한다. 개인사업자 조직 계정은 판매 대금용 결제 프로필을 만들 수 없다고 알려져 있다(공식 확인 전).
  - 광고(AdMob) 수익은 Play 결제 프로필과 별개다.

**정한 값 (다시 묻지 않는다).**

- 완성 모션은 [완성] 스티커 붙이기 모션 하나다.
- 칸 수 상한은 없다. 칸 늘리기 기본값은 처음 칸 수만큼 더하기다.
- 진행 중인 적립판은 칸을 늘리기만 할 수 있고, 판 종류는 바꿀 수 없다.
- 기간 없는 달력판은 미래 달로 이동할 수 있다.
- 삭제·떼기 확인은 기존 `basic` 다이얼로그를 쓴다.
- 판 조작: 빈칸 한 번 = 붙이기, 붙인 칸 한 번 = 기록 열기, 꾹 = 떼기(2026-10-05 변경).
- 튜토리얼 다시 보기: 앱 설정 → 도움말 → 사용법 다시 보기(`/tutorial`).
- 수동 완성 확인 문구: "완성해도 계속하기로 다시 이어 쓸 수 있어요".
- 앱 식별자: `com.novum.chagok`(2026-10-04, [RELEASE-DECISIONS](RELEASE-DECISIONS.md)).
- 수익화(2026-10-05, [RELEASE-DECISIONS](RELEASE-DECISIONS.md)):
  - 첫 출시는 스티커 팩 판매 + 비맞춤 배너 광고. 광고 제거는 따로 판다. 구독은 나중이다.
  - 가격: 팩 2,200원, 광고 제거 5,500원. 한 번 사면 계속 쓴다.
  - 구독이 끝나도 붙인 스티커는 남는다. 잠긴 팩의 스티커는 새로 고를 수 없다.
  - 한국 먼저 출시한다.
- 로그인·약관·위젯·백업의 결정은 PRD 확정 이력의 2026-09-30 행들에 있다.

## 1. 현재 유효한 사용자 지시

- **기존 디자인 시스템으로 시안의 화면과 컴포넌트를 구성한다.** 팔레트·폰트·공통 프레임·포커스를 새로 바꾸지 않는다.
- 스티커는 앞으로 계속 추가된다. 화면 코드와 분리해 자산·메타데이터를 관리한다 (5절).
- 판 종류 선택은 사용자가 첨부한 [상세 시안](design/retro-pocket-v1/review-set-02/references/board-type-detail-user.png)이 기존 03-new-goal 이미지보다 우선한다.
- 확대 화면만 보고 완료 처리하지 않는다. Playwright로 **100% 배율, DPR 1, 390px와 320px**에서 실제 렌더링을 확인한다.
- **Storybook 확정 (2026-09-29).** 현재 Storybook(`Screens / Home structure · proposals`, `Components / Goal list & board` 포함)을 앱 전환의 기준으로 확정했다. 새 기능이 생기면 그때 보완한다. 안 쓰게 된 부분과 버그는 별도로 고친다 (9절 끝).
- 테스트 통과, 토큰 버전, 문서의 baseline 표기만으로 사용자 승인을 추정하지 않는다. 폰트 차이도 해결됐다고 말하지 않는다.
- 디자인 시스템을 사용자 요청 없이 다시 해석하거나 바꾸지 않는다. 앱 연결 작업은 기존 컴포넌트에 선택(optional) prop을 더하는 방식으로 한다.

## 2. 시각 기준

| 범위 | 기준 |
| --- | --- |
| 공통 시스템 | [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [tokens.json](design/retro-pocket-v1/system/tokens.json), 실제 공통 컴포넌트 |
| 홈 목록·판 상세·완성 흐름·튜토리얼 (2026-09-29) | Storybook `Screens / Home structure · proposals` |
| 확인 다이얼로그·계정·설정 등 추가 화면 | [PRD 추가 화면 시안](design/retro-pocket-v1/prd-additions-review/README.md), [추가 공통 컴포넌트](design/retro-pocket-v1/component-additions-review/README.md) |
| 새싹 단일 원본 | [지정 작은 미리보기](design/retro-pocket-v1/revisions/v6/references/sprout-and-label-source.png), x540:591/y530:586 |
| 추가 스티커·기존 화면 구성 | [review-set-02/screens](design/retro-pocket-v1/review-set-02/screens) |
| 판 종류 카드 | [사용자 추가 첨부](design/retro-pocket-v1/review-set-02/references/board-type-detail-user.png) |

홈 구조는 2026-09-29 결정으로 바뀌었다. `review-set-02`의 01·02 홈(목표 칩 + 판)과 PRD 추가 시안의 "판 흐림 + 큰 중앙 도장 + 3개 선택지"는 더 이상 기준이 아니다. 시안의 폰 목업·OS 상태바·광원·질감은 구현 대상이 아니다. `review-set-01`, `screen-preview`의 거절된 실험이나 과거 종이 테마를 되살리지 않는다.

색상은 이미지 샘플링보다 아래 값이 우선한다.

| 용도 | 값 |
| --- | --- |
| 화면 | `#AFE1CB` |
| LCD | `#C7DE94` |
| Primary | `#FD855F` |
| Secondary / dialog / input | `#FEF1D1` |
| 텍스트 / 프레임 / 스티커 | `#06261C` |
| 버튼 텍스트 | `#01241C` |

Neo둥근모 1.601을 사용한다. 대체 폰트는 선택되지 않았다. 임의 교체, 가짜 bold/그림자로 획 덧칠, 한글 텍스트를 이미지로 대체하지 않는다.

## 3. 공통 시스템 수치

- RN + react-native-svg 공통 컴포넌트를 Storybook RN Web에서 같은 소스로 렌더한다.
- 패널 계단 단위 6px, 컨트롤 5px, 기본 셀 3px. 컨트롤/패널/칸 border와 패널 제목 구분선은 3px. 과거의 2px 수치는 폐기됐다.
- `PixelFocusRing`: cornerSize 15, cornerThickness 8, cornerCut 2, lineWidth 3, lineInset 2, gap 3.
- 톱니바퀴는 v6 원본 윤곽을 추출한 `assets/gear.ts`를 쓴다. 임의 16×16 아이콘으로 되돌리지 않는다.
- `StickerGrid`: 3열, 좌우 안쪽 6px, 열 간격 15px, 행 간격 10px. 390px에서 칸 약 84×64px.
- 붙인 새싹 최대 54px, 아래 여백 2px. 기본 스티커 미리보기 32px. 칸 숫자 28px/32px.
- 전체/친구/모양/사물 필터는 개별 테두리 없이 선택 채움과 세로 구분선만 쓴다.
- 확인 다이얼로그는 `PixelDialog variant="basic"`을 화면 가운데에 둔다(앱은 `PixelDialogModal`). 위험 동작도 같은 primary 버튼을 쓰며 별도 destructive 스타일은 만들지 않는다 (2026-09-29 확정).

## 4. 파일 구조

| 파일 | 역할 |
| --- | --- |
| `src/design-system/components.tsx` | 텍스트, 프레임, 버튼, 입력, 패널, 진행률, 목표 칩, 필터, 슬롯, 그리드, focus, 다이얼로그, 아이콘, 배지(`badgeTones`), 탭, 완성 스티커 |
| `src/design-system/tokens.ts`, `geometry.ts` | 문서 토큰 연결, 픽셀 외곽 경로 |
| `src/design-system/composition-controls.tsx` | 화면 헤더, 판/칸 수 선택, 스티커 요약/선택, 기록, 설정 행, 짧은 알림, 로딩, `RetroScreen`, 앱·목록 헤더, 목록 카드, 진행 줄, 빈 목록, 선택 버튼 줄, 종료일·기간, 삭제 영역 |
| `src/design-system/calendar.tsx` | 월 이동, 날짜 그리드. 선택 prop `isDateEnabled`·`canGoPrev`·`canGoNext` (기간 밖 날짜) |
| `src/design-system/tutorial.tsx` | 타깃 실측 스포트라이트. 선택 prop `content`로 1–3단계 밖 문구를 넘긴다 |
| `src/design-system/screen-compositions.tsx` | 판 칸(`GoalStickerCell`), 기록 화면(`RecordScreen`), 예시 데이터(`exampleGoals`) |
| `src/design-system/board-screens.tsx` | 목록·판 상세·목표 설정·완성한 판 설정·새 목표·칸/종료일 늘리기 화면 조합 (앱과 Storybook 공용) |
| `src/design-system/first-run-tutorial.tsx` | 5단계 첫 실행 튜토리얼과 예시 화면 |
| `src/domain/board.ts`, `dates.ts` | 판 규칙(진행률·정렬·완성·붙이기/떼기·기간)과 로컬 날짜 |
| `src/design-system/sticker-glyphs.tsx` | 스티커 라이브러리 어댑터, 액션 아이콘 |
| `src/app-data/` | 도메인↔화면 어댑터·문구(`pocketAdapter.ts`), 판 읽기(`boardData.ts`), 확인·알림 다이얼로그(`useDialog.ts`), 연속 탭 방지(`singleFlight.ts`), 사진 보관(`recordPhotos.ts`), 뒤로가기(`goBack.ts`, `useUnsavedBack.ts`) |
| `stories/HomeStructure.stories.tsx` | 홈 구조 30개 장면. `board-screens.tsx`로 그린다 |
| `stories/EmptyGoalList.stories.tsx` | 목표 없음 화면 (2026-09-30 A안) |
| `stories/GoalListBoard.stories.tsx` | 위 시안에서 추출한 공통 컴포넌트 개별 상태 17개 |
| `stories/flows/` | 화면 흐름도 `Flows/앱 전체`(`app-flow.json` 화면·이동, `appFlow.ts` 배치, `AppFlow.mdx`). 화면을 바꾸면 같이 맞춘다 — [README](../stories/flows/README.md) |

## 5. 스티커 라이브러리

`src/stickers/pocket/`가 새 스티커의 관리 위치다.

- `catalog.ts`: ID·이름·분류·asset의 단일 등록 위치. 현재 sprout/cat/star/flower/book/shoe 6종. `PocketStickerId` 타입은 여기서 파생된다.
- `assets/<id>.ts`: 투명 단색 SVG path, 56×56 viewBox, revision, 원본 파일/crop, 추가 5종은 원본 SHA256.
- `StickerArtwork.tsx`: DS에 의존하지 않고 크기/색상을 받아 렌더한다.
- 새싹 path는 `src/stickers/pocket/assets/sprout.ts` 한 곳에 있다. 꽃 스티커는 헤더의 꽃 아이콘과 별도 자산이다. 밝은 내부는 투명이다.

[추가·수정 절차](../src/stickers/pocket/README.md), [자산 검수](design/retro-pocket-v1/review-set-02/asset-review/README.md).

**컬러 스티커 (2026-10-05, 화면에는 아직 쓰지 않음).** `src/stickers/color/`는 흑백과 별도인 24×24 도트 컬러 스티커 66종이다.

- 묶음: 기본 6(무료), 운동·간식·사물·동물·감정·날씨계절 각 10.
- ID는 `묶음.이름`(예: `snack.cheese`)이다. 흑백 ID와 겹치지 않는다.
- 원본은 `source/sticker-packs-24.json`이다. 고친 뒤 `node scripts/build-color-stickers.mjs`로 `stickers.generated.ts`를 다시 만든다.
- `ColorStickerArtwork`는 색별 path로 그린다. 크기는 24의 정수배를 쓴다.
- 검토는 Storybook `Stickers / Color Assets`. 화면 적용은 0절 2(스티커 화면 다시 설계)에서 한다. [README](../src/stickers/color/README.md).

아래 명령은 **추가 5종 파일을 덮어쓴다.** 자산 재생성 때만 실행한다. 새싹은 바꾸지 않는다.

```sh
node scripts/trace-pocket-stickers.mjs /private/tmp/chagok-preview-tools/node_modules/playwright/index.mjs
```

`src/stickers/catalog.ts`(22종)는 참조하는 코드가 없지만 스키마 v2 마이그레이션(6종에 없는 id → `sprout`)의 매핑 근거다. 지우지 않는다.

## 6. 실행과 검증

```sh
npm run storybook        # http://localhost:6006
npm test                 # 도메인·저장소
npm run test:components
npm run test:server      # 실제 개발 서버(Supabase chagok-dev)에 대고. docs/DEV-SETUP.md 「개발 서버」
npm run typecheck
npm run lint
npx expo export --platform ios --output-dir /tmp/check && rm -rf /tmp/check
```

- 실행 중인 Storybook·Metro를 임의로 종료하지 않는다. 포트와 프로세스는 세션마다 다시 확인한다.
- 화면 스토리를 추가·변경·삭제했으면 `Flows/앱 전체`를 열어 보고, [stories/flows/README.md](../stories/flows/README.md) 「확인」의 스토리 ID 검사를 돌린다.
- 시안 캡처는 `scripts/review-*.mjs` 패턴을 따른다(Storybook `index.json`에서 스토리를 찾아 390·320px로 찍고 렌더 오류·가로 넘침을 기록). 제목에 `·`가 든 스토리 ID는 URL 인코딩해서 연다.
- Docs 페이지의 반복 렌더링은 3초 동안의 DOM 변경 수(MutationObserver)와 스크롤 위치로 확인한다. 정상이면 0, 0이다.
- Playwright 모듈은 프로젝트 의존성이 아니라 임시 설치다. 경로를 확인한다. `MachPortRendezvousServer Permission denied`가 나오면 우회하지 말고 Chromium 실행 권한을 요청한다.
- Android 확인은 이 저장소 전용 에뮬레이터 `Chagok_Pixel_7`(포트 5556)을 쓴다. `Pixel_7`은 다른 프로젝트와 함께 쓴다.

## 7. 되풀이될 함정

- **`RetroScreen`을 감싸는 래퍼에는 높이가 필요하다.** `flex:1` + `ScrollView`라 부모 높이가 없으면 0으로 접혀 화면이 통째로 빈다.
- **`useSafeAreaInsets()`를 쓰지 않는다.** Provider 없이 렌더하는 테스트·Storybook에서 예외를 던진다. `SafeAreaInsetsContext`를 직접 읽고 없으면 0으로 둔다.
- **훅은 조건부 return보다 위에 둔다.** `app/index.tsx`는 `loading` / 튜토리얼 / 목표 없음 분기가 있어, 아래에 둔 훅은 새로 설치한 기기에서만 터진다. `npm run lint`가 잡는다.
- **PanResponder를 `useRef(...).current`로 만들지 않는다.** 첫 렌더 값을 가둔다. `useMemo`로 만든다.
- **네이티브 한 줄 입력에 `lineHeight`를 주지 않는다.** iOS가 글자를 아래로 붙인다. `PixelInput`이 처리한다.
- **뒤로가기는 `goBackOrHome`을 쓴다.** 딥링크로 연 화면은 스택이 없어 `router.back()`이 동작하지 않는다.
- **폰트 연결은 콜드 스타트로 확인한다.** Fast Refresh로 반영하면 이전 글자 폭이 재사용되어 끝 글자가 잘려 보인다.
- Storybook·vitest는 `react-native-safe-area-context`를 `src/index.tsx`로 별칭한다. 기본 진입점을 타면 RN Flow 문법에서 죽는다. SVG를 `optimizeDeps.exclude`로 돌리지 않는다.
- Storybook 래퍼 div는 높이가 auto라 `flex:1` 사슬이 끊긴다. 스크롤을 잴 때는 조상에 높이를 준다.
- 달력 키는 로컬 시간으로 만든다. `toISOString()`은 자정 근처에서 하루를 민다.
- **Storybook Docs는 한 파일의 스토리를 한 페이지에 모두 그린다.** 포커스를 옮기거나 위치를 재는 스토리는 Docs에서 반복 렌더링·스크롤 끌림을 일으킨다. 튜토리얼 스토리는 Docs에서 `autoFocus={false}`로 그리고, 측정 결과를 담는 context 값은 `useMemo`로 고정하고 같은 좌표면 상태를 바꾸지 않는다.
- RN Web의 `AccessibilityInfo.addEventListener`는 구독 객체를 돌려주지 않는다. 정리할 때 `?.remove?.()`로 부른다.

## 8. 현재 앱 상태

Expo Router 라우트가 SQLite 저장소(스키마 v5)에 연결돼 있다. 개발 빌드로 실행한다(2026-10-05~, [DEV-SETUP](DEV-SETUP.md) 「개발 빌드」). Expo Go도 `--go`로 아직 돈다.

| 라우트 | 동작 |
| --- | --- |
| `/` | 목표 목록(`내 목표 / 완성한 판` 탭, `+`), 목표 없음 안내, 첫 실행 튜토리얼 5단계 |
| `/goal/new` | 이름·판 종류·칸 수(상한 없음)·기본 스티커·종료일로 만들고 그 판 상세로 |
| `/goal/[id]` | 판 상세. 붙이기(빈칸 한 번), 기록 열기(붙인 칸 한 번), 떼기(꾹), 완성 확인·모션·`닫기 / 계속하기`. 적립판은 열 때와 칸 수가 바뀌었을 때 다음 빈칸을 화면 가운데로 스크롤한다(붙일 때는 옮기지 않는다) |
| `/goal/[id]/settings` | 이름 → 기본 스티커 → 기간, [삭제하기]. 완성한 판은 삭제만 |
| `/goal/[id]/extend` | 칸 늘리기 |
| `/sticker/[id]` | 사진·메모. 완성한 판이면 읽기 전용 |
| `/settings` | 이 기기 기록 안내, 약관과 라이선스 |
| `/policies`, `/policies/[license]` | 이용약관·처리방침은 웹 시트(오프라인·실패 알림), 오픈소스 라이선스는 앱 내장 |
| `/dev/sync` | **개발 전용(`__DEV__`).** 개발 계정 로그인, 올리기·전부 올리기·서버에서 복원. 실제 계정 화면이 붙으면 없앤다 |

**화면에 연결되지 않은 것 (코드만 있음).**

- 백업: `src/sync/` — outbox(모든 저장 함수가 같은 트랜잭션에서 기록), 전송기 `pushOnce`, 복원 `restoreAll`, 스케줄러. 서버 계약 `SyncServer`/`PhotoStore`의 실구현은 없고 메모리 가짜 서버(`__tests__/support/fakeServer.ts`)로만 검증했다.
- 위젯: `src/widgets/` 스냅샷 생성과 DB 읽기, `src/design-system/widget-preview.tsx` 미리보기(Storybook `Widgets / Preview`). **미리보기는 9월 30일 모양(테두리 판, 읽기 전용)이라 낡았다.** 2026-10-04 확정 모양(링 위젯 + 달력 위젯, 꽉 채움, 바로 붙이기)은 PRD 4.10과 [위젯 시안](https://claude.ai/artifact/K5qfAcqRA2vyLZVxY2oqD3) — 원본 `docs/design/proposals-2026-10/widget.template.html`.
- 동의 화면: `ConsentScreen`(Storybook `Screens / Account consent`). 2026-10-01 시안 2안 배치(판 없는 동의 목록 + 바로 아래 버튼, [약관 설계](superpowers/specs/2026-09-30-policy-terms-design.md) 「동의 화면」). 로그인 단계에서 연결한다.
- 계정·백업 화면 (2026-10-01 확정 시안, Storybook `Screens / Account backup`): `AccountStartScreen`(시작), `AccountBackupPanel`(앱 설정 칸, 상태 6가지), `RestoreConflictScreen`(복원 충돌), `DeleteAccountScreen`·`AccountDeletedScreen`, 다이얼로그 문구 `accountDialogs`. 진행 중 표시는 `PixelDialog`·`PixelDialogModal`의 `loading`(주 버튼 로딩·보조 비활성·뒤로가기 무시)과 `PixelBusyDialog`·`PixelBusyModal`(버튼 없음, 뒤로가기 무시). **2026-10-01 앱에 연결했다(개발 로그인)**: 시작 화면(`app/index.tsx`), 연결(`app/account/connect.tsx` — 동의 → 로그인 → 연결만·첫 백업·복원·충돌), 앱 설정 계정 칸과 로그아웃(`app/settings.tsx`), 계정 삭제(`app/account/delete.tsx`), 로그인 풀림 안내 한 번. 로그인 자리는 `__DEV__`의 [개발 계정으로 계속]뿐이라, Apple·Google 버튼만 그 자리에 끼우면 된다.
  - **2026-10-02 기기 확인** (Android 에뮬레이터 `Chagok_Pixel_7` adb 조작, iPhone 16 Pro 시뮬레이터 Maestro 조작, 개발 서버 `chagok-dev`): 첫 실행·연결·충돌 취소(헤더 뒤로, Android 뒤로)·서버 백업으로 복원·로그아웃 뒤 시작 화면·복원 후 튜토리얼 생략·로그인 풀림 안내 한 번·체크된 동의 화면 — 두 플랫폼 통과. 오프라인 기록 → "백업하지 못한 기록" → 자동 복구는 Android만 통과.
  - **확인하지 못한 것**: 계정 삭제(사용자가 나중으로 미룸 — 지우면 `npm run server:dev-user`로 개발 계정을 다시 만든다), "이 기기 기록 사용하기"(서버 테스트 기록을 덮어씀), 남은 기록이 있는 로그아웃 경고, 만 14세 미만 안내, 사진 복원, iOS 가장자리 스와이프(Maestro 스와이프가 제스처로 인식되지 않음), iOS 오프라인(시뮬레이터는 Mac 네트워크를 씀), iPhone 실기기.
  - **견고성 (리뷰 7회, 2026-10-02)**: 연결 중에는 전송 잠금(`syncGate`)과 디스크 표시(`connectMarker` — 앱이 꺼져도 다음 실행 때 되돌림, 복원을 적용했으면 그 계정으로 되돌림). 로그아웃은 저장된 세션을 직접 지운다(`signOutLocal`, 세션 키 `chagok-auth` 고정 — 오프라인·지운 계정에서 supabase가 세션을 남김). 오프라인 토큰 갱신 실패는 로그인 풀림이 아니라 전송 실패로 본다. 첫 전송 전에는 "처음 백업하고 있어요".
- 약관 재동의 판단 `needsReconsent`. **2026-10-01 재동의 화면을 두지 않기로 해서 쓸 곳이 없다 — 정리 대상(지우기 전 사용자 확인, 0절 6).** 정책 사이트(`~/Desktop/workspace/chagok-app-policy`)는 Netlify `https://chagok-app-terms.netlify.app`에 연결했고(2026-09-30) 앱도 그 주소를 본다. 초안을 검색 차단(noindex) 상태로 공개해 두어 앱의 약관 링크가 열린다(2026-09-30). 공식 게시 전 남은 것은 클라우드 사업자·판 날짜·`_headers` 제거. 게시 절차는 [약관 설계](superpowers/specs/2026-09-30-policy-terms-design.md) 「게시 상태」.

화면 조합은 `src/design-system/board-screens.tsx`·`first-run-tutorial.tsx`·`policy-screens.tsx`·`account-screens.tsx`, 규칙은 `src/domain/board.ts`·`dates.ts`, 확인·실패 알림은 `src/app-data/useDialog.ts`(OS `Alert` 없음). **실기기는 iPhone 15 Pro 한 대뿐이고, 사용자가 이 기기로만 확인했다(2026-09-30). 다른 기기와 Android 실기기는 확인하지 못했다.**

## 9. 남은 구현 과제

**Expo Go로 할 수 있는 것**

- 튜토리얼 화면 안에서 스크롤하면 스포트라이트가 어긋나는 문제(첫 실행·다시 보기 모두).

**계정·외부 준비가 필요한 것**

- **로그인**
  - Google(Android)은 OAuth 준비 뒤에 한다. Apple은 2026-10-05 승인으로 시작할 수 있다.
  - 시작·동의·복원 분기·로그아웃·계정 삭제 화면은 개발 로그인으로 연결해 두었다. 연결 화면의 [개발 계정으로 계속] 자리에 Apple·Google 버튼을 끼운다.
  - 재동의 화면은 두지 않는다(약관 변경 안내로 대신).
- **서버**: 개발 서버는 Supabase 클라우드 `chagok-dev`(서울). 남은 것은 **운영 서버 결정**(0절 6)과 `apple-link`·**Apple 토큰 폐기**.
- **위젯 (iOS 구현됨, 2026-10-06)**: 세 종류(목표 하나 · 이번 달 · 적립판), 위젯 편집으로 바탕·목표 고르기, 위젯에서 붙이기·떼기, 마지막 칸은 앱의 완성 확인으로. 설계는 [위젯 설계 「2026-10-06 본 구현」](superpowers/specs/2026-09-30-home-widget-design.md), 시뮬레이터 스크린샷은 `docs/design/widgets/`. 코드는 `src/widgets/`, `widgets/ios/`, 설정 플러그인 `plugins/widget-goal/`.
  - **아직 안 한 것:** 자정 넘김 실기기 확인(시뮬레이터 시각을 못 바꾼다), Android, 판 화면을 연 채 앱을 뒤로 보냈다가 위젯에서 붙이고 돌아오면, 그 화면은 이전 값 그대로라 나갔다 다시 들어가야 바뀐다(시뮬레이터에서 본 것, 원인은 확인 전), 다른 위젯 종류에는 요청이 앱을 열기 전까지 보이지 않는다(요청은 누른 위젯의 타임라인에만 쌓인다).
  - **expo-widgets를 올릴 때:** `npx expo prebuild --platform ios --clean` → iOS 빌드 → 위젯 편집 「목표」 확인. prebuild가 `widget-goal: … 자리를 못 찾았어요`로 멈추면 expo-widgets가 만드는 Swift 모양이 바뀐 것이니 `plugins/widget-goal/patch.js`와 fixture를 새 모양에 맞춘다.
  - 위젯 props에 `null`을 넣지 않는다 — UserDefaults가 못 담아 `updateTimeline`이 던진다(`syncCore`의 `withoutNulls`가 막는다).
  - (spike 기록) 옛 메모:
  - iOS `expo-widgets`: Swift는 필요 없다. 글꼴은 로컬 설정 플러그인으로 넣는다. 위젯마다 목표 고르기는 결정이 필요하다.
  - Android `react-native-android-widget`: 앱이 꺼져 있으면 첫 탭이 사라진다.
- **스토어 빌드**: EAS Build를 쓰고, 빌드 번호는 EAS 원격 자동 증가다.
  - 사용자 버전·태그·Wear OS 번호대는 [버전 규칙](RELEASE-VERSIONING.md)(2026-10-04).
  - EAS 클라우드 빌드 전에 서버 주소·키를 EAS 환경 변수로 넣는다.

**나중에 셋팅할 것 — 이용 분석·오류 추적(트래킹)** (2026-09-30 사용자 요청, 기록만. 도구·범위 미정)

- 운영자가 보는 이용 분석(화면·기능 사용, 유지율)과 오류·크래시 추적이다. 이용자에게 보여주는 통계 대시보드(PRD 2절 제외 범위)와는 다르다.
- 정할 것(사용자에게 묻는다): 무엇을 잴지(이벤트 목록), 도구(예: Firebase Analytics·Crashlytics, PostHog, Sentry), 로그인 안 한 사용자도 잴지, 목표 이름·메모 같은 기록 내용은 보내지 않는다는 원칙.
- 따라오는 것: 개인정보처리방침 개정(지금 "현재 광고나 이용 분석 도구가 없다"고 적었다 — 도입 전 제2판 게시·사전 고지), 수집 항목·위탁(제3자) 표, 스토어 개인정보 라벨(App Privacy, Data safety). 다른 앱·웹과 엮는 추적이면 iOS 추적 동의(ATT)가 필요하다. 대부분의 도구는 네이티브 모듈이라 개발 빌드가 필요하다.

**나중에 개발할 것 — 푸시 알림** (2026-09-30 사용자 요청, 기록만. 아직 설계하지 않았다)

- 정할 것(사용자에게 묻는다): 로컬 알림(기기 안에서 예약)인지 원격 푸시(서버가 보냄)인지, 어떤 알림인지(예: 목표별 리마인더, 기간 끝 임박, 백업 실패), 시간을 목표별로 둘지 앱 전체로 둘지, 권한을 언제 물을지, 문구.
- 제품 원칙(PRD 2절)과 부딪치지 않게: 연속일수·판정·재촉은 제외 범위다. 알림 문구가 "연속 기록이 끊겨요" 같은 압박이 되지 않는지 설계 때 확인한다.
- 기술(Expo 57 문서 확인): `expo-notifications`. 로컬 알림은 Expo Go에서도 된다. 원격 푸시는 SDK 53부터 Android Expo Go에서 안 되므로 개발 빌드, FCM(Android)·APNs(iOS) 자격 증명, EAS `projectId`가 필요하다.
- 원격 푸시를 고르면: 푸시 토큰을 서버에 저장하므로 개인정보처리방침(정책 사이트 초안)에 항목을 더하고, 로그아웃·계정 삭제 때 토큰을 지운다.

**확인하지 못한 것**

- 탭 조작 전부(붙이기·기록 열기·꾹 떼기·스와이프), 모션·햅틱 느낌, 모션 줄이기, Android, 실기기, 320px 네이티브 폭.
- 스키마 v5 마이그레이션을 실제 기기 DB에서 올리는 것. 버전마다 BEGIN/COMMIT으로 묶었다(`src/db/client.ts`).
- 백업 전송을 백그라운드로 돌릴 때 트랜잭션 연결끼리 `SQLITE_BUSY`가 나는지(expo 트랜잭션은 별도 연결이고 외래키가 꺼져 있을 수 있다).

**나중에 따로 고칠 것**

- **판 진입 스크롤: 실기기 확인 대기.** 2026-09-30 `fix/board-entry-scroll`에서 고쳤고 main에 있다.
  - 증상: 칸이 많은 판을 다시 열면 칸 테두리 없이 2열로 보였다.
  - 고친 방법: 판 윗부분을 고정하고 칸만 판 안에서 스크롤한다(`RetroScreen scrollable={false}` + `CenteringScrollView`).
  - 자세한 기록은 [보관본](archive/HANDOFF-history-2026-10-05.md).
- 모든 Docs 페이지에 `props.pointerEvents is deprecated` 경고가 나온다. 동작에는 영향이 없다.
- **(낮음, 재현 대기) 기록 화면 첫 진입 시 스타일이 빠진 채 그려짐 (2026-09-30 사용자 보고).** 시뮬레이터 콜드 스타트와 09:34 녹화에서는 재현되지 않았다. 후보: ① Fast Refresh 잔상, ② `PixelFrame`이 `onLayout`으로 크기를 받은 뒤에만 테두리·채움을 그림, ③ 폰트 대체. 재현되면 스크린샷으로 가린다. ②면 크기 전에도 배경을 먼저 칠한다.
- 복원 뒤 아직 받지 못한 사진(기기 경로 없음, 서버 경로만 있음)에 photo 항목이 생기면 서버의 하나뿐인 사본이 지워진다. 지금은 그런 경로가 없다. "사진 유실" 화면에 사진 지우기·바꾸기를 붙일 때 `src/sync/push.ts`의 `pushPhoto` 주석을 다시 본다.

**PRD 미확정인데 코드에 값이 들어간 것:** 튜토리얼 상태를 DB(사용자 범위)에 저장. (`userInterfaceStyle`은 2026-09-30 다크 모드 미지원 결정으로 `"light"`가 맞다 — `fix/light-mode-font-scale`에서 바꿨고 main에는 아직 `"automatic"`.)

## 10. 다음 작업 시 주의

- 코드 작성 전 [Expo 57 문서](https://docs.expo.dev/versions/v57.0.0/)를 읽는다. 현재 Expo ~57.0.24 / RN 0.86.3 / React·React DOM 19.2.3, React DOM override 유지.
- 의존성을 추가할 때는 `package.json`·`package-lock.json`을 백업하고, 설치 후 `npm ls react-dom --all`이 `19.2.3` 하나인지 확인한다.
- 작업 단위마다 main에서 브랜치를 따고(0절), main 기록은 브랜치 단위 `--no-ff` 병합으로 남긴다(2026-09-30에 이전 기록도 이 형태로 다시 정리했다. 정리 전 main은 태그 `backup/main-before-split`). 일괄 reset/복원/삭제 금지. 관련 없는 `.omc`, 앱 설정, 기존 계획을 건드리지 않는다.
- Storybook은 확정했지만 원본 이미지 시안(`review-set-02` 등)과 픽셀 단위로 일치한다는 뜻은 아니다. 폰트·프레임 치수·focus·단색 asset에서 오는 차이는 남아 있다.
