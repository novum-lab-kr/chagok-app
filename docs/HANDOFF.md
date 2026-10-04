# 차곡차곡 디자인 시스템 인계

갱신: 2026-10-04 · 프로젝트: `chagok-app` 저장소 루트 (로컬 경로는 레포 이전 때 바뀔 수 있다 — [migration/README.md](migration/README.md))

구현 현황과 시각 기준의 단일 출처다. 제품 요구사항은 [PRD.md](PRD.md), 작업 방식은 [WORKING-AGREEMENT.md](WORKING-AGREEMENT.md)를 따른다. 이미 끝난 수정 이력은 git 기록과 [보관본](archive/HANDOFF-design-system-history-2026-09-23.md)에 있다.

## 0. 다음 세션 시작점 (2026-10-04)

**레포 이전 준비 (2026-10-04).** 옮기기 전·후에 할 일과 git에 없는 것(키 파일, 커밋 안 한 작업 패치, 메모리 사본)은 [migration/README.md](migration/README.md). 확정한 캐릭터 데이터는 [design/character/](design/character/README.md), 시안 원본·고른 안·메모는 [design/proposals-2026-10/](design/proposals-2026-10/README.md).

**상태.** 홈 구조 전환(목록 / 판 상세 / 목표 설정 / 완성 흐름 / 5단계 튜토리얼, 스키마 v4)과 Expo Go 단계(약관 화면, 백업 기기 쪽, 위젯 스냅샷, 스키마 v5)가 main에 들어갔다. 홈 구조의 구현 기록·미확인 항목은 [DEV-DESIGN-home-structure.md](DEV-DESIGN-home-structure.md) 10절, Expo Go 단계의 범위와 결정은 [계획](superpowers/plans/2026-09-30-expo-go-phase.md)과 설계 문서 3개([약관](superpowers/specs/2026-09-30-policy-terms-design.md) · [계정·백업](superpowers/specs/2026-09-30-account-backup-design.md) · [위젯](superpowers/specs/2026-09-30-home-widget-design.md))가 단일 출처다.
2026-10-02 계정 화면 연결(개발 로그인: 시작·동의·연결·복원·충돌·로그아웃·계정 삭제·로그인 풀림 안내)이 main에 들어갔다([계획](superpowers/plans/2026-10-01-account-wiring.md), 확인 범위는 9절 위 「화면에 연결되지 않은 것」의 계정·백업 줄).

**계정이 아직 없다 (2026-10-03).** Apple Developer Program·Google Cloud OAuth가 준비되기 전에는 개발 빌드 전환·실제 로그인·위젯 네이티브처럼 계정이 걸린 일을 다음 할 일로 제안하지 않는다. Expo Go·Storybook·개발 계정 로그인으로 할 수 있는 일부터 한다(사용자 지시).

**작업 방식 (2026-09-30 사용자 지시).**

- 작업 단위마다 main에서 브랜치를 딴다. 브랜치 이름과 맞지 않는 작업을 한 브랜치에 섞지 않는다.
- 계획·설계·코드는 사용자가 확인·승인하기 전에 커밋하지 않는다. 앱 저장소는 로컬 커밋까지만 하고 push는 사용자가 요청할 때 한다.

**다음에 할 일 — 우선순위 (2026-10-03 갱신, 위에서부터).** 작업마다 main에서 브랜치를 딴다. 실기기 테스트와 계정이 필요한 일은 맨 뒤다(사용자 지시).

**가. 사용자 결정 — 계정을 만들기 전에**

1. **시안 마무리** — 기록: [design/proposals-2026-10/](design/proposals-2026-10/README.md)(링크·원본·고른 안·메모). 확정한 것은 PRD 4.9·4.11, 캐릭터 데이터는 [design/character/](design/character/README.md).
   - **확정**: 메인 캐릭터 「이고지고」(책 모양 판 세 장, 기본 팔 없음, 표정 10가지), 앱 아이콘 1안(민트 바탕 전신), 앱 설정에 [문의하기]·[앱 버전].
   - **남음**: 앱 설정 배치(3안 프레임 없는 목록 + `PixelBadge` 머리글 유력, 배지 크기 12·14·18), 스플래시(후보 「2+」 쌓이는 애니메이션 약 2.4초), 캐릭터 이름, 표정 쓰임새(초안).
   - 모두 확정되면 Storybook·앱에 반영한다(시안은 아티팩트로 먼저 — WORKING-AGREEMENT 11절).
2. **앱 식별자** — 지금 `com.eunjukim.chagok`. 관례는 `회사.앱` 순서의 역도메인이라 사용자 후보 중 `com.novum.chagok`을 추천했다(`com.chagok.novum`은 "chagok 회사의 novum 앱"으로 읽힌다). 스토어에 올리면 바꿀 수 없다. **Google Play 계정 유형(개인/조직)**과 함께 정한다 — 인앱 결제를 하면 개인사업자 조직 계정은 결제 프로필이 막힐 수 있다(0절 아래 「수익화」 줄).
3. **수익 모델** — A 스티커 팩 판매(추천) / B 무료+배너 광고, 광고 제거 판매 / C 구독. 모델이 정해지면 4번 「수익화 기반」을 한다.
4. **운영 서버** — Supabase 클라우드 서울 별도 프로젝트(1순위, 무료면 매일 DB 내보내기) / VPS 셀프 호스팅(국외 이전 기재). 정해지면 처리방침 `[클라우드 사업자]`를 채운다.
5. **입력 길이 제한·날짜/시간대 정책** (PRD 11절 미확정) — 서버 컬럼 제약과 동기화 날짜 키에 걸리므로 운영 서버 전에 정한다.
6. **약관 변경 안내 범위** — `feat/terms-change-notice`는 로그인과 무관하게 모두에게, 약관만 알린다(약관 설계 「재동의」 2026-10-01 문장 그대로). 처리방침 개정도 알릴지, 쓰지 않게 된 `needsReconsent`·`requiresConsent`를 지울지 묻는다.
7. **`fix/light-mode-font-scale` 합치기** — 다크 모드 막기(`userInterfaceStyle: "light"`)와 글자 크기 고정(`allowFontScaling={false}`). 둘 다 2026-09-30 결정이고 PRD 6.1·6.2에 반영했다(2026-10-04). 사용자가 실기기에서 확인하면 main에 합친다. 같은 날짜의 범위 결정 기록 `docs/scope-decisions`(b06564f)는 내용을 PRD·HANDOFF에 옮겼으니 합치지 않아도 된다.

**나. 개발 — 계정 없이 (Expo Go·jest·Storybook)**

1. **`feat/terms-change-notice` 확인** (2026-10-03 구현, 커밋 전, 작업 공간 `../chagok-wt-terms`) — `upcomingChange`(게시일 ≤ 오늘 < 시행일, 처음 게시 제외, 한 번만)와 홈 연결. 로그인 풀림 안내가 끝난 뒤에 묻고, 시작 화면·튜토리얼 중에는 띄우지 않는다. 본 판 번호는 `app_settings.termsNoticeSeen`. jest·타입·린트·iOS 번들 통과. 정책 사이트에 v2를 올려야 화면에서 보이므로 기기 확인은 못 했다.
2. **동기화 버전·최소 앱 버전** (PRD에 없음) — 출시 뒤 스키마가 바뀌어도 구버전 앱이 서버 기록을 망가뜨리지 않게. 출시 전에만 넣을 수 있다. 업데이트 안내 문구는 사용자 확인.
3. **접근성** — 스크린리더 레이블 점검(PRD 6.1, 문안은 사용자 확인), 탭 대상 최소 크기.
4. **튜토리얼 안에서 스크롤하면 스포트라이트가 어긋나는 문제** (9절).
5. **출시 준비 문서** — 스티커 5종 원본 권리, KIPRIS 상표(9류·42류), 스토어 이름·설명·스크린샷 초안, 개인정보 라벨·연령 등급 답안. `LICENSE`(Expo 템플릿 MIT 그대로)는 라이선스 종류를 사용자가 정한다. Privacy Manifest는 Expo가 모아 주지 않는다 — 개발 빌드 때 `node_modules`의 PrivacyInfo를 보고 `app.json` `ios.privacyManifests`에 옮긴다(Expo 문서 「Apple privacy」).
6. **수익화 기반** (가-3 결정 뒤) — 기능 잠금 계층(`entitlements`, 지금은 모두 열림), 스티커 카탈로그에 팩 메타데이터 추가(기존 값 불변), 잠긴 스티커·구매·구매 복원 시안(아티팩트), 서버 `entitlements` 테이블·RLS(서버만 쓰기), 처리방침 제2판·약관 유료 조항 초안(청약철회·환불·미성년자 결제), 통신판매업 신고 필요 여부 확인. SDK는 RevenueCat `react-native-purchases`가 Expo Go에서 가짜 구매 모드로 돈다(expo-iap는 개발 빌드만). 광고(AdMob)는 개발 빌드가 필요하고 Expo 57에서 `react-native-google-mobile-ads` 설정 플러그인 문제가 보고돼 있다.
7. 로그인 버튼 높이 33·38·44 (Storybook `Screens / Account consent`).

**다. 후순위 — 실기기·계정 연동**

1. **실기기 확인이 밀린 수정 건** — 판 진입 스크롤(main에 있음), 기록 화면 첫 진입 스타일 빠짐(재현 대기), `fix/light-mode-font-scale`의 다크 모드·글자 크기. 사용자가 iPhone 15 Pro로 본다. 고정 헤더는 2026-10-01 실기기에서 확인됐다.
2. **계정 화면 남은 테스트** — 계정 삭제(개발 계정과 서버 테스트 기록이 지워짐 → `npm run server:dev-user`로 다시 만듦), "이 기기 기록 사용하기"(서버 테스트 기록을 덮어씀 — 하기 전에 묻는다), 남은 기록이 있는 로그아웃 경고, 만 14세 미만 안내, 사진 복원, iOS 가장자리 스와이프·iOS 오프라인. 개발 서버 기록 "10분 독서"에 테스트로 붙인 스티커 1개(42번 칸)를 뗀다.
3. **계정이 생긴 뒤:** 개발 빌드 전환(+`expo-system-ui`) → Google 로그인(Android) → Apple 로그인·`apple-link`·Apple 토큰 폐기 → 위젯 spike·네이티브 → 광고·결제 SDK. 로그인 버튼은 연결 화면의 [개발 계정으로 계속] 자리에 끼운다.

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

**정한 값 (다시 묻지 않는다).** 완성 모션은 [완성] 스티커 붙이기 모션 하나, 칸 수 상한 없음(칸 늘리기 기본값은 처음 칸 수만큼 더하기), 기간 없는 달력판은 미래 달 이동 가능, 삭제·떼기 확인은 기존 `basic` 다이얼로그, 판 조작은 한 번 = 붙이기·떼기 / 두 번·꾹 = 기록 열기. 로그인·약관·위젯·백업의 결정은 PRD 확정 이력 2026-09-30 행들.

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
| `src/design-system/gestures.ts` | 한 번 누르기와 두 번 누르기 구분(250ms). 공개 export 아님 |
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

## 5. 스티커 라이브러리

`src/stickers/pocket/`가 새 스티커의 관리 위치다.

- `catalog.ts`: ID·이름·분류·asset의 단일 등록 위치. 현재 sprout/cat/star/flower/book/shoe 6종. `PocketStickerId` 타입은 여기서 파생된다.
- `assets/<id>.ts`: 투명 단색 SVG path, 56×56 viewBox, revision, 원본 파일/crop, 추가 5종은 원본 SHA256.
- `StickerArtwork.tsx`: DS에 의존하지 않고 크기/색상을 받아 렌더한다.
- 새싹 path는 `src/stickers/pocket/assets/sprout.ts` 한 곳에 있다. 꽃 스티커는 헤더의 꽃 아이콘과 별도 자산이다. 밝은 내부는 투명이다.

[추가·수정 절차](../src/stickers/pocket/README.md), [자산 검수](design/retro-pocket-v1/review-set-02/asset-review/README.md).

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
- 붙인 칸의 한 번 누르기(떼기)는 두 번 누르기와 가르느라 250ms 늦게 실행된다(`gestures.ts`). 의도된 동작이다.

## 8. 현재 앱 상태

Expo Router 라우트가 SQLite 저장소(스키마 v5)에 연결돼 있다. Expo Go로 실행한다(개발 빌드 전환 전).

| 라우트 | 동작 |
| --- | --- |
| `/` | 목표 목록(`내 목표 / 완성한 판` 탭, `+`), 목표 없음 안내, 첫 실행 튜토리얼 5단계 |
| `/goal/new` | 이름·판 종류·칸 수(상한 없음)·기본 스티커·종료일로 만들고 그 판 상세로 |
| `/goal/[id]` | 판 상세. 붙이기·떼기(한 번), 기록 열기(두 번·꾹), 완성 확인·모션·`닫기 / 계속하기`. 적립판은 열 때와 칸 수가 바뀌었을 때 다음 빈칸을 화면 가운데로 스크롤한다(붙일 때는 옮기지 않는다) |
| `/goal/[id]/settings` | 이름 → 기본 스티커 → 기간, [삭제하기]. 완성한 판은 삭제만 |
| `/goal/[id]/extend` | 칸 늘리기 |
| `/sticker/[id]` | 사진·메모. 완성한 판이면 읽기 전용 |
| `/settings` | 이 기기 기록 안내, 약관과 라이선스 |
| `/policies`, `/policies/[license]` | 이용약관·처리방침은 웹 시트(오프라인·실패 알림), 오픈소스 라이선스는 앱 내장 |
| `/dev/sync` | **개발 전용(`__DEV__`).** 개발 계정 로그인, 올리기·전부 올리기·서버에서 복원. 실제 계정 화면이 붙으면 없앤다 |

**화면에 연결되지 않은 것 (코드만 있음).**

- 백업: `src/sync/` — outbox(모든 저장 함수가 같은 트랜잭션에서 기록), 전송기 `pushOnce`, 복원 `restoreAll`, 스케줄러. 서버 계약 `SyncServer`/`PhotoStore`의 실구현은 없고 메모리 가짜 서버(`__tests__/support/fakeServer.ts`)로만 검증했다.
- 위젯: `src/widgets/` 스냅샷 생성과 DB 읽기, `src/design-system/widget-preview.tsx` 미리보기(Storybook `Widgets / Preview`).
- 동의 화면: `ConsentScreen`(Storybook `Screens / Account consent`). 2026-10-01 시안 2안 배치(판 없는 동의 목록 + 바로 아래 버튼, [약관 설계](superpowers/specs/2026-09-30-policy-terms-design.md) 「동의 화면」). 로그인 단계에서 연결한다.
- 계정·백업 화면 (2026-10-01 확정 시안, Storybook `Screens / Account backup`): `AccountStartScreen`(시작), `AccountBackupPanel`(앱 설정 칸, 상태 6가지), `RestoreConflictScreen`(복원 충돌), `DeleteAccountScreen`·`AccountDeletedScreen`, 다이얼로그 문구 `accountDialogs`. 진행 중 표시는 `PixelDialog`·`PixelDialogModal`의 `loading`(주 버튼 로딩·보조 비활성·뒤로가기 무시)과 `PixelBusyDialog`·`PixelBusyModal`(버튼 없음, 뒤로가기 무시). **2026-10-01 앱에 연결했다(개발 로그인)**: 시작 화면(`app/index.tsx`), 연결(`app/account/connect.tsx` — 동의 → 로그인 → 연결만·첫 백업·복원·충돌), 앱 설정 계정 칸과 로그아웃(`app/settings.tsx`), 계정 삭제(`app/account/delete.tsx`), 로그인 풀림 안내 한 번. 로그인 자리는 `__DEV__`의 [개발 계정으로 계속]뿐이라, Apple·Google 버튼만 그 자리에 끼우면 된다.
  - **2026-10-02 기기 확인** (Android 에뮬레이터 `Chagok_Pixel_7` adb 조작, iPhone 16 Pro 시뮬레이터 Maestro 조작, 개발 서버 `chagok-dev`): 첫 실행·연결·충돌 취소(헤더 뒤로, Android 뒤로)·서버 백업으로 복원·로그아웃 뒤 시작 화면·복원 후 튜토리얼 생략·로그인 풀림 안내 한 번·체크된 동의 화면 — 두 플랫폼 통과. 오프라인 기록 → "백업하지 못한 기록" → 자동 복구는 Android만 통과.
  - **확인하지 못한 것**: 계정 삭제(사용자가 나중으로 미룸 — 지우면 `npm run server:dev-user`로 개발 계정을 다시 만든다), "이 기기 기록 사용하기"(서버 테스트 기록을 덮어씀), 남은 기록이 있는 로그아웃 경고, 만 14세 미만 안내, 사진 복원, iOS 가장자리 스와이프(Maestro 스와이프가 제스처로 인식되지 않음), iOS 오프라인(시뮬레이터는 Mac 네트워크를 씀), iPhone 실기기.
  - **견고성 (리뷰 7회, 2026-10-02)**: 연결 중에는 전송 잠금(`syncGate`)과 디스크 표시(`connectMarker` — 앱이 꺼져도 다음 실행 때 되돌림, 복원을 적용했으면 그 계정으로 되돌림). 로그아웃은 저장된 세션을 직접 지운다(`signOutLocal`, 세션 키 `chagok-auth` 고정 — 오프라인·지운 계정에서 supabase가 세션을 남김). 오프라인 토큰 갱신 실패는 로그인 풀림이 아니라 전송 실패로 본다. 첫 전송 전에는 "처음 백업하고 있어요".
- 약관 재동의 판단 `needsReconsent`. **2026-10-01 재동의 화면을 두지 않기로 해서 쓸 곳이 없다 — 정리 대상(지우기 전 사용자 확인, 0절 가-6).** 정책 사이트(`~/Desktop/workspace/chagok-app-policy`)는 Netlify `https://chagok-app-terms.netlify.app`에 연결했고(2026-09-30) 앱도 그 주소를 본다. 초안을 검색 차단(noindex) 상태로 공개해 두어 앱의 약관 링크가 열린다(2026-09-30). 공식 게시 전 남은 것은 클라우드 사업자·판 날짜·`_headers` 제거. 게시 절차는 [약관 설계](superpowers/specs/2026-09-30-policy-terms-design.md) 「게시 상태」.

화면 조합은 `src/design-system/board-screens.tsx`·`first-run-tutorial.tsx`·`policy-screens.tsx`·`account-screens.tsx`, 규칙은 `src/domain/board.ts`·`dates.ts`, 확인·실패 알림은 `src/app-data/useDialog.ts`(OS `Alert` 없음). **실기기는 iPhone 15 Pro 한 대뿐이고, 사용자가 이 기기로만 확인했다(2026-09-30). 다른 기기와 Android 실기기는 확인하지 못했다.**

## 9. 남은 구현 과제

**Expo Go로 할 수 있는 것**

- ~~계정 관련 화면 Storybook 구성~~ 2026-10-01 완료, 2026-10-02 앱 연결(개발 로그인).
- ~~사진 줄이기~~ 완료: `SupabasePhotoStore`가 긴 변 1600px·JPEG 80%로 줄여 올린다(`expo-image-manipulator`).
- ~~튜토리얼 다시 보기~~ 2026-09-30 완료(`/tutorial`). 튜토리얼이 단계마다 자기 예시 화면을 새로 그려서 목록 스크롤과 무관하다. 튜토리얼 화면 안에서 스크롤하면 스포트라이트가 어긋나는 문제는 첫 실행과 같이 남아 있다.

**준비물이 필요한 것** (Docker Desktop, Apple Developer Program, Google Cloud OAuth — 2026-09-30 기준 없음)

- **2026-09-30 정정: Apple Developer Program(유료)이 꼭 필요한 것은 Apple 로그인, TestFlight, 심사 제출뿐이다.** 개발 빌드 전환과 iOS 위젯 개발은 시뮬레이터에서 계정 없이 된다. 실기기는 무료 Apple ID로 설치할 수 있을 것으로 보지만(7일마다 재설치, Apple 로그인 권한이 들어가면 빌드 불가) 직접 확인하지 않았다 — 위젯 spike에서 먼저 확인한다. 계정을 먼저 만들라고 권하지 않는다.
- 개발 빌드 전환(`npx expo run:ios`/`run:android`, prebuild 폴더는 커밋하지 않음)과 `docs/DEV-SETUP.md` 갱신. 로그인·위젯 모두 Expo Go로는 안 된다.
- ~~서버~~ 2026-09-30 완료(`feat/server-local`): 개발 서버는 Supabase 클라우드 무료 프로젝트 `chagok-dev`(서울, Docker 불필요). 테이블·RLS·RPC 5개·`record-photos` 버킷·`delete-account`를 올렸고, 가짜 서버와 같은 계약 테스트를 실제 서버에도 돌린다(`npm run test:server`). 남은 것: **운영 서버 결정**(Supabase 클라우드 서울 별도 프로젝트 1순위 — 무료면 매일 DB 백업 작업 필수 / VPS 셀프 호스팅은 국외 이전 기재), `apple-link`와 **Apple 토큰 폐기**(그전에는 토큰이 있으면 계정 삭제가 멈춘다).
- ~~앱 연결~~ 2026-09-30 완료: `SupabaseSyncServer`·`SupabasePhotoStore`(1600px·JPEG 80%), 로그인해 있는 동안 자동 전송(`connectSync`, 기록 2초 뒤·앱이 앞으로 올 때). 개발용 이메일 로그인과 `/dev/sync` 화면으로 Expo Go에서 확인한다. ~~남은 것: 앱 설정의 백업 상태, 계정 화면·실제 로그아웃·계정 삭제 흐름 연결, 복원 충돌 선택.~~ 2026-10-02 완료(`feat/account-wiring`).
- 로그인: Google(Android) 먼저, Apple은 계정 승인 뒤. 시작·동의·복원 분기·로그아웃·계정 삭제 화면은 2026-10-02 개발 로그인으로 연결해 두었다 — 연결 화면의 [개발 계정으로 계속] 자리에 Apple·Google 버튼을 끼운다. 재동의 화면은 두지 않는다(약관 변경 안내로 대신, 0절 우선순위 1).
- 위젯: spike(글꼴·PNG 스티커·딥링크·목표 선택) → iOS `expo-widgets`, Android `react-native-android-widget`.

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

- 탭 조작 전부(붙이기·떼기·두 번·꾹·스와이프), 모션·햅틱 느낌, 모션 줄이기, Android, 실기기, 320px 네이티브 폭.
- 스키마 v5 마이그레이션을 실제 기기 DB에서 올리는 것. 버전마다 BEGIN/COMMIT으로 묶었다(`src/db/client.ts`).
- 백업 전송을 백그라운드로 돌릴 때 트랜잭션 연결끼리 `SQLITE_BUSY`가 나는지(expo 트랜잭션은 별도 연결이고 외래키가 꺼져 있을 수 있다).

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
- 모든 Docs 페이지에 `props.pointerEvents is deprecated` 경고가 나온다. 동작에는 영향이 없다.
- **(낮음, 재현 대기) 기록 화면 첫 진입 시 스타일이 빠진 채 그려짐 (2026-09-30 사용자 보고).** 시뮬레이터 콜드 스타트와 09:34 녹화에서는 재현되지 않았다. 후보: ① Fast Refresh 잔상, ② `PixelFrame`이 `onLayout`으로 크기를 받은 뒤에만 테두리·채움을 그림, ③ 폰트 대체. 재현되면 스크린샷으로 가린다. ②면 크기 전에도 배경을 먼저 칠한다.
- 복원 뒤 아직 받지 못한 사진(기기 경로 없음, 서버 경로만 있음)에 photo 항목이 생기면 서버의 하나뿐인 사본이 지워진다. 지금은 그런 경로가 없다. "사진 유실" 화면에 사진 지우기·바꾸기를 붙일 때 `src/sync/push.ts`의 `pushPhoto` 주석을 다시 본다.

**PRD 미확정인데 코드에 값이 들어간 것:** 튜토리얼 상태를 DB(사용자 범위)에 저장. (`userInterfaceStyle`은 2026-09-30 다크 모드 미지원 결정으로 `"light"`가 맞다 — `fix/light-mode-font-scale`에서 바꿨고 main에는 아직 `"automatic"`.)

## 10. 다음 작업 시 주의

- 코드 작성 전 [Expo 57 문서](https://docs.expo.dev/versions/v57.0.0/)를 읽는다. 현재 Expo ~57.0.24 / RN 0.86.3 / React·React DOM 19.2.3, React DOM override 유지.
- 의존성을 추가할 때는 `package.json`·`package-lock.json`을 백업하고, 설치 후 `npm ls react-dom --all`이 `19.2.3` 하나인지 확인한다.
- 작업 단위마다 main에서 브랜치를 따고(0절), main 기록은 브랜치 단위 `--no-ff` 병합으로 남긴다(2026-09-30에 이전 기록도 이 형태로 다시 정리했다. 정리 전 main은 태그 `backup/main-before-split`). 일괄 reset/복원/삭제 금지. 관련 없는 `.omc`, 앱 설정, 기존 계획을 건드리지 않는다.
- Storybook은 확정했지만 원본 이미지 시안(`review-set-02` 등)과 픽셀 단위로 일치한다는 뜻은 아니다. 폰트·프레임 치수·focus·단색 asset에서 오는 차이는 남아 있다.
