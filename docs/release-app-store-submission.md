# App Store 제출 문안 초안

작성: 2026-10-28(1.0). **1.1.0 제출본으로 다시 씀: 2026-11-06.** 1.0 제출본은 git 기록에 있다.

함께 목표를 1.1.0에 낼지는 사용자 확인 대기다(초대 받는 화면이 아직 없다, [1.1.0 출시 순서](RELEASE-1.1.0.md) 「제출 전에 고칠 것」). 아래에서 「함께 목표를 내면」이라고 표시한 부분은 정해지면 넣거나 지운다.

개인정보 라벨과 연령 등급 답안은 [스토어 개인정보 신고 초안](release-store-privacy-draft.md)에 있다. 제출 직전 확인 목록은 [출시 전 최종 점검](RELEASE-CHECKLIST.md) 5절.

## 1. 원문에서 확인한 제출 조건 (2026-10-28, 1.1.0 기준으로 상태 고침 2026-11-06)

| 조건 | 원문 | 우리 상태 |
| --- | --- | --- |
| 인앱 상품은 첫 앱 버전과 함께 낸다 | "The first consumable, non-consumable, auto-renewable subscription, and non-renewing subscription In-App Purchase of each type must be submitted with a new app version." ([Submit an In-App Purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase)) | 1.0 상품 5개는 1.0과 함께 승인됐다. 1.1.0은 새 비소모성 3개와 처음 내는 자동 갱신 구독 2개를 1.1.0 버전 페이지에 붙여 같이 낸다(아래 3절) |
| 유료 앱 계약이 활성이어야 한다 | "This agreement must be active in order for you to submit or update paid apps and In-App Purchases." ([Sign and update agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements)) | 1.0 판매로 활성. 1.1.0 제출 전에 계약 탭에서 다시 본다 |
| 인앱 상품이 심사자에게 보이고 동작한다 | 2.1(b) "make sure they are complete, up-to-date, visible to the reviewer and functional. If any configured in-app purchase items cannot be found or reviewed in your app, explain the reason in your review notes." | 2절 심사 메모에 찾는 곳을 적는다 |
| 로그인이 있으면 데모 계정 또는 설명 | 2.1(a) "include demo account info (and turn on your back-end service!) if your app includes a login." | 혼자 쓰는 기능은 로그인 없이 다 쓴다. 함께 목표는 로그인이 필요해 내면 심사 계정 두 개를 준다(2절). Google 동의 화면은 게시해야 한다(2026-11-05 「테스트 중」) |
| 스크린샷은 앱을 쓰는 화면 | 2.3.3 "Screenshots should show the app in use, and not merely the title art, login page, or splash screen." 2.3.2 유료 항목은 표시. 2.3.8 스크린샷은 4+에 맞게 | 4절 |
| iPhone 스크린샷 | 「Dynamic Island 큰 화면」 또는 「중간 화면」 중 하나 이상, 크기당 최대 10장, 투명 없음 ([Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)) | 큰 화면 1320×2868(iPhone 17 Pro Max 시뮬레이터)로 찍는 것을 추천 |
| Apple Watch 스크린샷 | "Required for Apple Watch apps", 모든 언어에서 같은 크기 (같은 문서) | 빌드에 워치 앱이 있어 필요하다. 416×496(Series 10, 11, 12) 추천 |
| 지원 URL에 연락처 | 1.5 "Make sure your app and its Support URL include an easy way to contact you" | 지원 URL(`https://chagok.novum-lab.com/support/`)에 문의 메일이 있다. 앱 안은 설정 「도움말과 정보」 → 문의하기(2026-10-28) |
| 처리방침 URL | 5.1.1(i), App Store Connect 앱 정보 "Required for iOS and macOS apps" | `https://chagok.novum-lab.com/privacy/` |
| 광고 신고 | 2.5.18 "Apps that contain ads must also include the ability for users to report any inappropriate or age-inappropriate ads." | 설정 「도움말과 정보」 → 광고 신고하기(2026-10-28, 광고 제거를 산 사람에게는 숨김). 심사 메모에 적는다 |
| 자동 갱신 구독 안내 | 3.1.2 앱 안에 구독 이름, 기간, 가격과 이용약관, 처리방침 링크. 개발자 계약 Schedule 2 제3.8(b) | 구독 화면(`app/subscription.tsx`)에 월과 연 가격, 자동 갱신 고지, [이용약관] [처리방침]이 있다. 스토어 설명 끝에 이용약관 주소를 둔다(5절) |
| 사용자끼리 보는 내용 | 1.2 신고, 차단, 걸러 내기, 연락처 | 함께 목표를 낼 때만. 앱에 이름 신고와 차단이 있다. 금칙어 표가 운영 DB에서 비어 있다(2026-11-05) |
| 수출 규정 | Info.plist로 답하면 제출마다 묻지 않는다 | `ITSAppUsesNonExemptEncryption: false` |

도움말 일부(스크린샷 크기, 워치 문장, 연령 등급)는 읽은 도구가 앞부분만 원문으로 주고 나머지를 요약했다. 낼 때 화면에서 다시 본다.

## 2. 심사 메모 (App Review Information → Notes)

심사자가 읽기 쉽게 영어로 쓴다. 1.1.0은 기기 언어가 한국어면 한국어, 나머지는 영어 화면이라 버튼 이름을 둘 다 적는다(영어 / 한국어). 이름은 `src/i18n/en.ts`, `ko.ts`에서 옮겼다(2026-11-06). 가격은 App Store에서 받아 그 나라 형식으로 보인다.

```text
Chagok is a personal sticker log. You set your own goals and place a sticker each time. The app follows the device language: Korean on a Korean device, English otherwise. Button names below are given as English / Korean.

All solo features work without signing in. Signing in is optional and backs up records; Sign in with Apple is available.

What's new in 1.1.0: auto-renewable subscription (monthly, yearly), three new sticker packs, English screens, optional usage analytics and crash reports.

Subscription (auto-renewable, monthly KRW 4,900 / yearly KRW 24,900, one subscription group): unlocks every sticker pack, unlimited goals and no ads.
- Settings tab > Purchases > Subscription > "See subscription" / "구독 보기".
- Free users can own up to 5 goals. Creating a 6th goal from the Goals tab [+] opens the same subscription screen.
- The subscription screen shows price, period, auto-renewal terms, and links to the Terms of Use and Privacy Policy.
- Manage or cancel: Settings tab > Purchases > "Manage subscription" / "구독 관리" (opens App Store subscriptions).

Sticker packs (non-consumable, KRW 2,200 each): Stickers tab > tap a locked pack card > "Unlock for ₩2,200" / "2,200원에 열기". Packs: Workout / 운동, Snacks / 간식, Things / 사물, Weather and seasons / 날씨와 계절, and new in 1.1.0: Christmas / 크리스마스, Study and work / 공부와 일, Cafe and food / 카페와 음식. Each unlocks 10 stickers permanently.

Remove ads (non-consumable, KRW 5,500): Settings tab > Purchases > "Remove ads for ₩5,500" / "5,500원에 광고 없애기". Hidden while subscribed.

Restore purchases: Settings tab > Purchases > "Restore purchases" / "구매 복원" (restores the subscription, packs and ad removal).

"Try free for 3 days" / "3일 무료로 써 보기" unlocks only after stickers have been placed on 7 different days, so it is not available on a new install.

Ads: banner ads via Google AdMob (non-personalized requests only, no tracking, no ATT prompt). If no ad is available, the banner is hidden and "Watch an ad, try for a day" / "광고 보고 하루 써 보기" shows "Ads aren't available right now" / "지금은 광고를 볼 수 없어요".

Report an ad (Guideline 2.5.18): Settings tab > "Help and info" / "도움말과 정보" > "Report an ad" / "광고 신고하기" opens a pre-filled email. Contact: same menu > "Contact us" / "문의하기".

Usage analytics (PostHog) is off until the user agrees on a sheet shown after placing a sticker. Crash reports (Sentry) can be turned off in Settings. Neither is used for tracking or advertising.

Apple Watch: the watch app shows the goals created on the iPhone and lets you add today's sticker. Create a goal on the iPhone first, then open the watch app with the iPhone app nearby.
```

**함께 목표를 내면 메모 끝에 더한다.** 심사 계정 두 개를 미리 만들어 「Sign-in information」에는 하나를, 메모에는 두 번째 계정과 초대 순서를 적는다. 영어 이름은 `together.*` 문구에서 옮긴다. 초대를 받는 화면이 생긴 뒤 실제 순서로 쓴다(지금 쓰면 없는 화면을 적게 된다).

```text
Goals with friends (sign-in required): Goals tab [+] > "With friends" / "친구와 함께" > "Create and invite" / "만들고 초대하기" shares an invite link. Open the link on a second device signed in with the second demo account to join. Members can "Report a hurtful name" / "불쾌한 이름 신고하기" and "Block someone" / "사람 차단하기" from the goal's "If something is wrong" / "문제가 있을 때" menu (Guideline 1.2).
```

## 3. 인앱 상품 심사 메모

상품마다 「심사 정보」에 스크린샷 한 장(그 상품을 여는 화면)과 메모를 넣는다. 도움말은 "include review notes and a screenshot"이라고 권한다([View and edit In-App Purchase information](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/view-and-edit-in-app-purchase-information)). 1.0 상품 5개(운동, 간식, 사물, 날씨와 계절 묶음, 광고 제거)는 이미 승인돼 다시 내지 않는다. 버튼 문구가 1.0과 같아 메모는 그대로 둔다. 1.1.0에 새로 붙이는 5개:

| 상품 ID | 이름 | 스크린샷 | 메모 |
| --- | --- | --- | --- |
| `com.novumlab.chagok.pack.christmas_normal` | 크리스마스 | 「크리스마스」 스티커 팩 화면 | `Stickers tab > "Christmas" / "크리스마스" pack card > "Unlock for ₩2,200" / "2,200원에 열기". Unlocks 10 stickers permanently.` |
| `com.novumlab.chagok.pack.study_normal` | 공부와 일 | 「공부와 일」 스티커 팩 화면 | `Stickers tab > "Study and work" / "공부와 일" pack card > "Unlock for ₩2,200" / "2,200원에 열기". Unlocks 10 stickers permanently.` |
| `com.novumlab.chagok.pack.food_normal` | 카페와 음식 | 「카페와 음식」 스티커 팩 화면 | `Stickers tab > "Cafe and food" / "카페와 음식" pack card > "Unlock for ₩2,200" / "2,200원에 열기". Unlocks 10 stickers permanently.` |
| `com.novumlab.chagok.sub.monthly` | 월 구독 | 구독 화면 | `Settings tab > Purchases > "See subscription" / "구독 보기" > "Subscribe monthly" / "월 구독하기". Unlocks all sticker packs, unlimited goals and no ads while active.` |
| `com.novumlab.chagok.sub.yearly` | 연 구독 | 구독 화면 | `Settings tab > Purchases > "See subscription" / "구독 보기" > "Subscribe yearly" / "연 구독하기". Unlocks all sticker packs, unlimited goals and no ads while active.` |

구독 그룹 이름과 그룹 표시 이름도 정해 넣는다(추천: 「차곡차곡 구독」). 상품 등록 순서는 [1.1.0 출시 순서](RELEASE-1.1.0.md) 「스토어 상품과 결제」.

## 4. 스크린샷

- 1.1.0 제출본(2026-11-05 확정): `docs/design/proposals-2026-10/store-shots/final-1.1.0/`의 iPhone 6.9와 6.3 각 10장, Watch 4장은 1.0 그대로. 바뀐 장과 새 장만 `changed/`.
- 이 가운데 함께 목표 2장은 함께 목표를 낼 때만 올린다. 내지 않으면 빼고 8장으로 낸다.
- 유료 스티커 팩에는 가격 배지가 보여야 한다(2.3.2). 개발용 표시(Expo 톱니, 개발 계정 버튼)가 없는 출시 빌드 화면인지 다시 본다.
- 판매 지역은 대한민국 그대로라 영어 스크린샷과 영어 등록정보는 1.1.0에서 내지 않는다. 해외 판매를 열 때 1차 6개국 기준으로 만든다([출시 준비 결정](RELEASE-DECISIONS.md) 2026-11-05).

## 5. 스토어 등록정보

제품 원칙(PRD 2절)대로 평가, 판정, 연속 기록, 재촉하는 말을 쓰지 않는다. 앱 화면 용어에 맞춰 「묶음」을 「스티커 팩」으로 바꿨다.

- **이름:** 차곡차곡: 스티커로 쌓는 기록 (등록됨)
- **부제목(30자 이내):** 내가 정한 목표에 스티커 한 장
- **키워드(100자 이내, 쉼표로 구분):** `스티커,기록,목표,습관,다이어리,달력,칭찬스티커,위젯,워치,사진일기`
- **이번 버전의 새로운 기능:**

```text
구독이 생겼어요. 구독하면 모든 스티커 팩을 쓰고, 목표를 개수 제한 없이 만들고, 광고 없이 쓸 수 있어요.
새 스티커 팩 크리스마스, 공부와 일, 카페와 음식이 나왔어요.
기기 언어가 영어면 영어 화면으로 보여요.
```

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

■ 스티커 팩
기본, 동물, 감정 스티커 팩은 무료예요. 운동, 간식, 사물, 날씨와 계절, 크리스마스, 공부와 일, 카페와 음식 스티커 팩은 따로 살 수 있어요.

■ 구독
구독하면 모든 스티커 팩을 쓰고, 목표를 개수 제한 없이 만들고, 광고 없이 쓸 수 있어요. 구독하지 않아도 목표를 5개까지 만들 수 있어요.

■ 백업
로그인하면 기록이 자동으로 백업돼 새 기기에서도 이어 쓸 수 있어요. 로그인하지 않아도 모든 기록 기능을 쓸 수 있어요.

목표 화면 아래에 광고가 있어요. 광고 제거를 사거나 구독하면 사라져요.

구독은 해지할 때까지 고른 기간마다 자동으로 결제되고, App Store 구독 관리에서 해지할 수 있어요.
이용약관: https://chagok.novum-lab.com/terms/
개인정보 처리방침: https://chagok.novum-lab.com/privacy/
```

**함께 목표를 내면** 「■ 백업」 앞에 더한다:

```text
■ 친구와 함께
로그인하고 친구를 초대해 같은 목표를 각자의 판이나 한 판에 함께 채워요.
```

- **카테고리:** 주 「생산성」, 보조 「라이프스타일」(1.0과 같음)
- **저작권:** `2026 노붐랩`
- **지원 URL:** `https://chagok.novum-lab.com/support/`
- **처리방침 URL:** `https://chagok.novum-lab.com/privacy/`
- **이용약관:** 위 설명 끝 주소. Apple 표준 EULA 대신 쓰려면 App Store Connect 「라이선스 계약」 칸에 넣는다. 둘 중 무엇으로 할지는 2판 게시 뒤 정한다.
- **마케팅 URL:** 비움(선택 항목)
