# App Store 제출 문안 초안

작성: 2026-10-28. 상태: **초안, 사용자 확인 전.** 확정되면 App Store Connect에 넣고, 이 문서는 다음 출시 때 고쳐 쓴다.

개인정보 라벨과 연령 등급 답안은 [스토어 개인정보 신고 초안](release-store-privacy-draft.md)에 있다. 제출 직전 확인 목록은 [출시 전 최종 점검](RELEASE-CHECKLIST.md) 5절.

## 1. 원문에서 확인한 제출 조건 (2026-10-28)

| 조건 | 원문 | 우리 상태 |
| --- | --- | --- |
| 인앱 상품은 첫 앱 버전과 함께 낸다 | "The first consumable, non-consumable, auto-renewable subscription, and non-renewing subscription In-App Purchase of each type must be submitted with a new app version." ([Submit an In-App Purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase)) | 상품 5개(아래 3절)를 1.0.0 버전 페이지에 붙여 같이 낸다 |
| 유료 앱 계약이 활성이어야 한다 | "This agreement must be active in order for you to submit or update paid apps and In-App Purchases." ([Sign and update agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements)) | 2026-10-28 동의 메일을 받음. 계약 탭에서 「활성」인지 확인한다 |
| 인앱 상품이 심사자에게 보이고 동작한다 | 2.1(b) "make sure they are complete, up-to-date, visible to the reviewer and functional. If any configured in-app purchase items cannot be found or reviewed in your app, explain the reason in your review notes." | 2절 심사 메모에 찾는 곳을 적는다 |
| 로그인이 있으면 데모 계정 또는 설명 | 2.1(a) "include demo account info (and turn on your back-end service!) if your app includes a login." | 로그인 없이 다 쓸 수 있고 Apple로 로그인할 수 있다고 적는다. Google 동의 화면은 게시해야 한다(지금 「테스트 중」) |
| 스크린샷은 앱을 쓰는 화면 | 2.3.3 "Screenshots should show the app in use, and not merely the title art, login page, or splash screen." 2.3.2 유료 항목은 표시. 2.3.8 스크린샷은 4+에 맞게 | 4절 |
| iPhone 스크린샷 | 「Dynamic Island 큰 화면」 또는 「중간 화면」 중 하나 이상, 크기당 최대 10장, 투명 없음 ([Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)) | 큰 화면 1320×2868(iPhone 17 Pro Max 시뮬레이터)로 찍는 것을 추천 |
| Apple Watch 스크린샷 | "Required for Apple Watch apps", 모든 언어에서 같은 크기 (같은 문서) | 빌드에 워치 앱이 있어 필요하다. 416×496(Series 10, 11, 12) 추천 |
| 지원 URL에 연락처 | 1.5 "Make sure your app and its Support URL include an easy way to contact you" | 정책 사이트 첫 화면에 문의 메일이 있다. 앱 안은 설정 「도움말과 정보」 → 문의하기(2026-10-28) |
| 처리방침 URL | 5.1.1(i), App Store Connect 앱 정보 "Required for iOS and macOS apps" | `https://chagok-app-terms.netlify.app/privacy/` |
| 광고 신고 | 2.5.18 "Apps that contain ads must also include the ability for users to report any inappropriate or age-inappropriate ads." | 설정 「도움말과 정보」 → 광고 신고하기(2026-10-28, 광고 제거를 산 사람에게는 숨김). 심사 메모에 적는다 |
| 수출 규정 | Info.plist로 답하면 제출마다 묻지 않는다 | `ITSAppUsesNonExemptEncryption: false` |

도움말 일부(스크린샷 크기, 워치 문장, 연령 등급)는 읽은 도구가 앞부분만 원문으로 주고 나머지를 요약했다. 낼 때 화면에서 다시 본다.

## 2. 심사 메모 (App Review Information → Notes)

심사자가 읽기 쉽게 영어로 쓴다.

```text
Chagok is a personal sticker log. All recording features work without signing in. Signing in is optional and only used to back up records; you can use Sign in with Apple.

In-app purchases (non-consumable):
- Sticker packs "Sports", "Snacks", "Objects", "Weather & Seasons" (KRW 2,200 each): open the Stickers tab, tap a locked pack card, then tap "2,200원에 열기".
- Remove ads (KRW 5,500): Settings tab > Purchases > "5,500원에 광고 없애기" (the price comes from the App Store).
- Restore purchases: Settings tab > Purchases > "구매 복원".

Report an ad (Guideline 2.5.18): Settings tab > "도움말과 정보" > "광고 신고하기" opens a pre-filled email to our support address. Contact: Settings tab > "도움말과 정보" > "문의하기".

Ads: banner ads are shown with Google AdMob (non-personalized requests only, no tracking, no ATT prompt). AdMob only starts reviewing an app after it is published on the App Store, so during App Review no ads may be served. In that case the banner is hidden and "광고 보고 하루 써 보기" (watch an ad for a one-day trial) shows "지금은 광고를 볼 수 없어요" (no ad available right now). This is expected until AdMob approves the app.

"3일 무료로 써 보기" (3-day trial) unlocks only after the user has added stickers on 7 different days, so it is disabled on a new install.

Apple Watch: the watch app shows the goals created on the iPhone and lets you add today's sticker. Create a goal on the iPhone first, then open the watch app with the iPhone app nearby.
```

묶음 영어 이름은 심사자 안내용이다. 앱 화면은 한국어뿐이다.

## 3. 인앱 상품 심사 메모

상품마다 「심사 정보」에 스크린샷 한 장(그 상품을 여는 화면)과 메모를 넣는다. 도움말은 "include review notes and a screenshot"이라고 권한다([View and edit In-App Purchase information](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/view-and-edit-in-app-purchase-information)).

| 상품 ID | 이름 | 스크린샷 | 메모 |
| --- | --- | --- | --- |
| `com.novumlab.chagok.pack.sports_normal` | 운동 묶음 | 「운동 묶음」 묶음 화면 | `Stickers tab > "운동" pack card > "2,200원에 열기". Unlocks 10 stickers permanently.` |
| `com.novumlab.chagok.pack.snack_normal` | 간식 묶음 | 「간식 묶음」 묶음 화면 | `Stickers tab > "간식" pack card > "2,200원에 열기". Unlocks 10 stickers permanently.` |
| `com.novumlab.chagok.pack.objects_normal` | 사물 묶음 | 「사물 묶음」 묶음 화면 | `Stickers tab > "사물" pack card > "2,200원에 열기". Unlocks 10 stickers permanently.` |
| `com.novumlab.chagok.pack.weather_normal` | 날씨와 계절 묶음 | 「날씨와 계절 묶음」 묶음 화면 | `Stickers tab > "날씨와 계절" pack card > "2,200원에 열기". Unlocks 10 stickers permanently.` |
| `com.novumlab.chagok.adfree` | 광고 제거 | 설정 탭 「구매」 블럭 | `Settings tab > Purchases > "5,500원에 광고 없애기" (the price comes from the App Store). Removes the banner ad permanently. Restore with "구매 복원".` |

## 4. 스크린샷 계획

- iPhone 큰 화면(1320×2868) 5~6장: 목표 목록, 판에 스티커 붙이기, 기록(사진과 메모), 달력판, 스티커 묶음 화면(유료 묶음에는 가격 배지가 보이게, 2.3.2), 위젯.
- Apple Watch(416×496) 2~3장: 목표 목록, 붙이기, 차곡이와 블록.
- 개발용 표시(Expo 톱니, 개발 계정 버튼)가 없는 출시 빌드로 찍는다. 배너 광고 자리는 비어 있어도 된다.
- 시안은 `chagok-wt-store-shots` worktree에서 진행 중(커밋 전). 문구를 넣은 스크린샷이면 그 시안을 따른다.

## 5. 스토어 등록정보 초안

제품 원칙(PRD 2절)대로 평가, 판정, 연속 기록, 재촉하는 말을 쓰지 않는다.

- **이름:** 차곡차곡: 스티커로 쌓는 기록 (등록됨)
- **부제목(30자 이내):** 내가 정한 목표에 스티커 한 장
- **키워드(100자 이내, 쉼표로 구분):** `스티커,기록,목표,습관,다이어리,달력,칭찬스티커,위젯,워치,사진일기`
- **설명:**

```text
스스로 정한 목표에 스티커를 한 장씩 붙여 보세요.
쌓인 판을 다시 보면 해 온 날들이 한눈에 보여요.

■ 판에 스티커 붙이기
빈칸 아무 데나 톡 누르면 붙어요. 칸 수를 정하는 적립판, 날짜에 붙이는 달력판 중에 골라요.

■ 사진과 메모
붙인 스티커에 그날의 사진과 메모를 남길 수 있어요.

■ 위젯과 Apple Watch
홈 화면 위젯과 워치에서 바로 붙여요.

■ 스티커 묶음
기본, 동물, 감정 묶음은 무료예요. 운동, 간식, 사물, 날씨와 계절 묶음은 따로 살 수 있어요.

■ 백업
로그인하면 기록이 자동으로 백업돼 새 기기에서도 이어 쓸 수 있어요. 로그인하지 않아도 모든 기록 기능을 쓸 수 있어요.

목표 화면 아래에 광고가 있어요. 광고 제거를 사면 사라져요.
```

- **카테고리:** 주 「생산성」, 보조 「라이프스타일」(추천, 사용자 결정)
- **저작권:** `2026 노붐랩`
- **지원 URL:** `https://chagok-app-terms.netlify.app/`
- **처리방침 URL:** `https://chagok-app-terms.netlify.app/privacy/`
- **마케팅 URL:** 비움(선택 항목)
