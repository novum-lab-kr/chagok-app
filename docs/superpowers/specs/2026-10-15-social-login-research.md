# Apple·Google·카카오 로그인 자료 조사

조사일 2026-10-15. 개발 계획은 [plans/2026-10-15-social-login.md](../plans/2026-10-15-social-login.md).
라이브러리 버전과 콘솔 메뉴 이름은 조사일 기준이다. 구현을 시작할 때 다시 확인한다.

## 0. 한눈에

| | Apple | Google | 카카오 |
| --- | --- | --- | --- |
| 앱에서 쓰는 것 | `expo-apple-authentication` 57.0.2 (Expo 공식) | `@react-native-google-signin/google-signin` 16.1.5 (무료판) 또는 유료판(Universal) | `@react-native-kakao/core`·`user` 2.4.x (커뮤니티, Expo 플러그인 있음) |
| Supabase에 넘기는 것 | ID 토큰 + nonce 원래값 | ID 토큰 (+ nonce는 유료판만) | ID 토큰(OIDC) + nonce 원래값 |
| Supabase 호출 | `signInWithIdToken({ provider: 'apple' })` | `signInWithIdToken({ provider: 'google' })` | `signInWithIdToken({ provider: 'kakao' })` |
| 계정 콘솔 | Apple Developer (있음, 2026-10-05 승인) | Google Cloud Console (**없음**) | Kakao Developers (**없음**. 카카오 계정만 있으면 바로 만든다) |
| 계정 삭제 때 | **토큰 폐기 필수**(App Store 요구) | 연결 해제 권장(필수 아님) | 연결 끊기 권장 |
| 버튼이 보이는 곳 | iOS만 | iOS·Android | iOS·Android |
| Expo Go | 됨 | 안 됨(개발 빌드만) | 안 됨(개발 빌드만) |

세 수단 모두 **ID 토큰 방식**으로 간다. PRD 4.8의 「Apple·Google 로그인은 ID 토큰 방식」을 카카오에도 그대로 적용한다.
- 흐름: 앱이 각 회사의 로그인 창을 띄워 ID 토큰을 받는다 → 그 토큰을 Supabase에 넘긴다 → Supabase가 서명·발급자·대상(`aud`)·nonce를 확인하고 세션을 만든다.
- 그 뒤 `app/account/connect.tsx`의 분기(연결만·첫 백업·복원·충돌 선택)는 수단과 상관없이 지금 코드를 그대로 쓴다.
- 연결 화면은 이미 로그인 버튼을 슬롯(`AccountLoginScreen`의 `loginButtons`, 2026-10-21 전에는 `ConsentScreen`)으로 받는다. 약관 설계(2026-09-30)에서 「카카오·네이버가 붙어도 아래로 쌓인다」고 미리 정해 두었다.

## 1. 세 수단에 공통인 것

### 1.1 nonce (한 번만 쓰는 무작위 값)

ID 토큰을 가로채 다시 쓰는 것을 막는 값이다. Supabase auth 서버(`token_oidc.go`)는 이렇게 확인한다.

- 앱이 넘긴 nonce **원래값**을 SHA-256으로 바꿔 16진수 글자로 만든다. 그 값이 토큰 안의 `nonce`와 같아야 통과한다.
- 토큰에는 nonce가 있는데 앱이 넘기지 않으면(또는 그 반대면) 거부한다.
- 그래서 로그인 창(Apple·카카오)에는 **해시값**을 주고, Supabase에는 **원래값**을 준다. 해시는 `expo-crypto`로 만든다.
- 공급자 설정의 「Skip nonce check」로 끌 수 있다. Google 무료판처럼 nonce를 넣을 수 없는 라이브러리를 쓸 때만 켠다.

### 1.2 `aud` (이 토큰을 받을 앱)

Supabase는 토큰의 `aud`가 그 공급자 설정의 **Client IDs** 목록에 들어 있는지 본다.

- Apple: 번들 ID `com.novumlab.chagok`.
- Google: 앱의 `webClientId`에 넣은 **웹** 클라이언트 ID다. iOS 클라이언트 ID도 함께 넣는다. 로컬 설정에서 여러 개를 쓸 때는 웹 ID를 맨 앞에 쓴다.
- 카카오: 토큰을 받을 때 쓴 앱 키다. 네이티브 SDK면 **네이티브 앱 키**, 웹 흐름이면 REST API 키다. 두 흐름을 같이 쓰면 둘 다 넣는데, 같은 카카오 앱의 키여야 한다.

### 1.3 App Store 심사 4.8 (로그인 서비스)

- Google·카카오처럼 외부 회사 로그인을 주 계정으로 쓰면, **같은 무게의 다른 선택지**를 함께 둬야 한다.
- 그 선택지는 세 조건을 채워야 한다.
  1. 이름·이메일만 받는다.
  2. 이메일을 가릴 수 있다.
  3. 동의 없이 광고 목적으로 쓰지 않는다.
- Apple 로그인이 이 조건을 채운다. 그래서 **iOS에 Google·카카오를 넣으면 Apple 버튼도 같은 크기로 함께 둔다.** 이미 그렇게 할 계획이다.

### 1.4 같은 사람이 여러 수단으로 들어올 때

- Supabase는 **확인된 같은 이메일**로 들어오면 한 계정으로 묶는다.
- 그러나 Apple은 「이메일 가리기」를 고르면 중계 주소가 오고, 카카오는 이메일을 요청하지 않을 계획이다. 그래서 같은 사람이 Apple로 한 번, 카카오로 한 번 들어오면 **계정이 따로 생기고 백업도 따로다.**
- 처음에는 「다른 로그인 추가」 같은 수동 연결 기능을 만들지 않는다. 앱 설정의 「연결한 계정 · Apple」 표시로 어떤 수단으로 들어왔는지 볼 수 있다. 문의가 생기면 그때 검토한다.

### 1.5 처리방침·스토어 표기

- 처리방침 1판의 「수집 경로」에 Google과 카카오를 더한다. 출시 전에는 판을 새로 만들지 않고 1판에 고친다(정책 결정 2026-10-14).
  - 카카오에서 받는 것: 회원번호. 닉네임은 요청하지 않는다.
- `docs/release-store-privacy-draft.md`의 「사용자 ID」 항목은 그대로 맞다. 이메일 칸은 수단마다 다르게 적는다.
  - Apple: 가리기를 고르면 중계 주소
  - Google: 실제 주소
  - 카카오: 받지 않음
- 로그인 버튼은 각 회사의 공식 모양을 따른다. 디자인 시스템의 예외로 이미 HANDOFF에 적혀 있다.
  - 카카오 버튼은 카카오의 「로그인 버튼 디자인 가이드」(노란 배경 `#FEE500`, 말풍선 기호)를 따라 새로 만든다.

## 2. Apple

자세한 구현은 기존 계획 [2026-10-08-apple-login.md](../plans/2026-10-08-apple-login.md)에 있다. 이 계획은 `chagok-wt-apple-login`에 커밋하지 않은 채 남아 있다. 여기서는 그 뒤에 바뀐 점과 이번에 확인한 점만 적는다.

### 2.1 앱

- `expo-apple-authentication` 57.0.2를 쓴다. `signInAsync({ requestedScopes: [EMAIL], nonce: sha256(원래값) })`로 부른다.
- 이름은 받지 않는다(PRD 4.8).
- 사용자가 창을 닫으면 `ERR_REQUEST_CANCELED`가 난다. 이 경우 알림 없이 연결 화면으로 돌아간다.
- `app.json`에는 `ios.usesAppleSignIn: true`와 플러그인을 넣는다.

### 2.2 Supabase

- Apple 공급자를 켜고 Client IDs에 `com.novumlab.chagok`을 넣는다.
- 네이티브 방식만 쓰면 **OAuth Secret Key가 필요 없다.** 「6개월마다 키 다시 만들기」도 하지 않아도 된다(Supabase 문서).

### 2.3 계정 삭제 때 토큰 폐기

- Apple REST API `POST https://appleid.apple.com/auth/revoke`로 폐기한다. 폐기하려면 refresh token이 있어야 한다.
- refresh token을 얻는 순서:
  1. 로그인 때 받은 `authorizationCode`를 앱이 서버 함수 `apple-link`에 보낸다.
  2. `apple-link`가 그 코드를 Apple과 교환해 refresh token을 받는다.
  3. 받은 토큰을 `private.apple_tokens`에 저장한다.
- 이 교환에는 `.p8` 키로 만든 client secret(ES256 서명값)이 필요하다. `.p8` 키는 Edge Function secret으로만 둔다.

### 2.4 Apple 서버 알림 (선택)

- 사용자가 연결을 끊거나(`consent-revoked`) Apple 계정을 지우면(`account-delete`) Apple이 우리 서버로 알림을 보낸다. 받을 주소는 App ID 설정에서 등록한다.
- 심사에서 의무라는 근거는 찾지 못했다.
- 그래도 Apple 계정이 지워지면 앱에는 아무 신호가 오지 않는다. 그러면 우리 서버에 남은 데이터를 알 방법이 이 알림뿐이다. 그래서 출시 전에 할 일로 둔다(계획 4단계).

### 2.5 기존 계획에서 고칠 것

1. **마이그레이션 방식:** 새 파일을 더하지 않고 `20260930000004_account_admin.sql`을 고친 뒤 `db reset`한다. 출시 전 방침이 「최종 스키마를 고치고 리셋」이기 때문이다. main에서도 이미 0005 파일을 0003에 합쳤다.
2. **버튼 높이:** 44로 확정됐다(2026-10-12 사용자 결정). 열린 결정에서 뺀다.
3. **삭제 단계:** `delete-account` 1단계는 지금 「토큰이 있으면 멈춤」이다. 이것을 실제 폐기로 바꾸고, 카카오 연결 끊기도 같은 자리에 더한다(4.5절).

## 3. Google

### 3.1 지금 상태

Google Cloud 계정과 OAuth 설정이 **없다**(HANDOFF). 아래 내용은 준비가 끝난 뒤에 할 일이다. 작업 방식에 따라 사용자가 「OAuth 준비됐다」고 하기 전에는 구현을 시작하지 않는다.

### 3.2 콘솔 준비

1. **Google Cloud 프로젝트**를 만든다. 명의는 다른 출시 계정에 맞춰 사용자가 정한다.
2. **OAuth 동의 화면(Branding):** 앱 이름 「차곡차곡」, 지원 이메일, 홈페이지, 처리방침 주소, 승인된 도메인을 넣는다. 범위는 `openid`·`email`·`profile`만 쓴다.
   - 이 기본 범위는 민감 범위 심사를 받지 않는다.
   - 다만 Google 문서는 앱 이름·로고를 보이려면 **브랜드 확인**을 받으라고 하고, 확인에는 며칠이 걸린다.
   - 승인된 도메인은 Search Console에서 소유를 증명해야 한다. 처리방침은 아직 Netlify 초안 주소(`chagok-app-terms.netlify.app`)에 있다. **정식 도메인을 정하기 전에는 브랜드 확인을 끝내기 어려울 수 있다.**
   - 「테스트」 상태에서는 등록한 테스트 사용자(최대 100명)만 로그인할 수 있다.
3. **클라이언트 ID 세 종류**
   - **웹:** ID 토큰의 `aud`가 된다. 앱의 `webClientId`와 Supabase에 넣는다. 네이티브 방식만 쓰면 secret은 쓰지 않는다.
   - **iOS:** 번들 ID `com.novumlab.chagok`으로 만든다. 앱 플러그인의 `iosUrlScheme`에는 이 ID를 거꾸로 쓴 값(`com.googleusercontent.apps.…`)을 넣는다.
   - **Android:** 패키지 `com.novumlab.chagok`과 **SHA-1 지문**으로 만든다. 지문은 서명 키마다 달라서 보통 세 개를 등록한다.
     - 로컬 디버그 키
     - EAS 빌드 키(`eas credentials`로 확인)
     - Play 앱 서명 키(Play Console에서 확인)
     - 하나라도 빠지면 그 빌드에서 `DEVELOPER_ERROR`가 난다.
4. **Supabase:** Google 공급자를 켜고 Client IDs에 웹 ID와 iOS ID를 넣는다.

### 3.3 라이브러리 고르기 — 무료판으로 결정 (2026-10-15)

| | 무료판 16.1.5 | 유료판 Universal | 브라우저 방식 |
| --- | --- | --- | --- |
| Android에서 쓰는 것 | **예전 Google Sign-In API** | Credential Manager (Google 권장) | Chrome 탭 |
| nonce | 넣을 수 없다 → Supabase 「Skip nonce check」를 켜야 한다 | 넣을 수 있다(「Supabase용」이라고 적혀 있음) | 필요 없다(PKCE) |
| 비용 | 무료 | 개인 $79/년. EAS 고객은 무료 라이선스를 신청할 수 있다(조건은 공개 안 됨) | 무료 |
| 설치 | npm | GitHub 패키지 저장소 + 접근 토큰 | `expo-web-browser` |
| 사용자가 보는 화면 | 기기 계정 고르기 | 아래에서 올라오는 계정 고르기 | 브라우저 창. **주소가 `cmkmhrzvxbtuxbgixqoo.supabase.co`로 보인다** |

- Google은 Android의 예전 Sign-In API를 **지원 중단 예정(deprecated)**으로 표시했다. 제거 시점은 처음에 「2025년」이었다가 지금은 「향후 버전」으로 바뀌었다. 무료판은 지금은 동작하지만, 언제 막힐지 모르는 API에 기대게 된다.
- 브라우저 방식은 맞춤 도메인(Supabase 유료)을 쓰기 전까지 낯선 서버 주소가 보인다. 사용자가 피싱으로 오해할 수 있다.

### 3.4 앱 코드의 큰 틀 (무료판·유료판 공통)

```ts
GoogleSignin.configure({ webClientId: WEB_ID, iosClientId: IOS_ID });
const res = await GoogleSignin.signIn();
if (isCancelledResponse(res)) return 'canceled';
await supabase.auth.signInWithIdToken({ provider: 'google', token: res.data.idToken });
```

- 취소는 오류로 던지지 않고 응답의 `type === 'cancelled'`로 알려 준다.
- `IN_PROGRESS`는 이미 로그인 중이라는 뜻이다. `PLAY_SERVICES_NOT_AVAILABLE`는 Android에서 Play 서비스가 없을 때 난다.
- 에뮬레이터는 **Google Play가 들어 있는 이미지**여야 한다.

### 3.5 계정 삭제 때

- ID 토큰 방식은 서버에 Google 토큰이 남지 않아서, 서버에서 폐기할 것이 없다.
- 앱이 삭제 직전에 `GoogleSignin.revokeAccess()`를 부른다. 그러면 사용자 Google 계정의 「연결된 앱」 목록에서 빠진다.
- 이 단계가 실패해도 삭제는 계속한다. Google이 요구하는 단계는 아니다.

## 4. 카카오

### 4.1 콘솔 준비 (Kakao Developers)

1. 카카오 계정으로 가입하고 **앱을 만든다.** 앱 이름은 「차곡차곡」, 사업자명은 노붐이다.
2. **플랫폼 등록**
   - iOS: 번들 ID `com.novumlab.chagok`.
   - Android: 패키지 `com.novumlab.chagok`과 **키 해시**(SHA-1을 Base64로 바꾼 값)를 넣는다. Google과 똑같이 디버그·EAS·Play 앱 서명 키 세 개를 넣는다.
   - 릴리스 빌드에서 키 해시가 빠져 로그인이 실패한 사례가 많다(Kakao DevTalk).
3. **카카오 로그인 켜기**(State ON)와 **OpenID Connect 켜기.** OpenID Connect가 꺼져 있으면 ID 토큰이 나오지 않는다.
4. **동의 항목**
   - 차곡차곡은 이름·이메일이 필요 없다.
   - 이메일(`account_email`)은 **비즈 앱**(사업자 정보 등록)이어야 받을 수 있다. 받지 않을 계획이니 Supabase 카카오 공급자에서 **「Allow users without an email」을 켠다.**
   - 닉네임도 화면에 쓰지 않으니 요청하지 않는 쪽으로 먼저 시험한다.
   - 동의 항목 없이 `openid`만으로 로그인되는지는 **확인하지 못했다.** 시험 구현에서 확인한다.
5. **키 네 가지**

   | 키 | 어디에 | 비밀인가 |
   | --- | --- | --- |
   | 네이티브 앱 키 | 앱(app.json 플러그인·`.env.local`) | 아니다(앱에 들어간다) |
   | REST API 키 | Supabase 공급자 Client ID 칸 | 아니다 |
   | 클라이언트 시크릿 | Supabase 공급자 Secret 칸 | 비밀 |
   | **어드민 키** | Edge Function secret `KAKAO_ADMIN_KEY` | **비밀. 앱에 넣지 않는다** |

6. **Supabase:** 카카오 공급자의 Client IDs에 **네이티브 앱 키**를 넣는다. 네이티브 SDK로 받은 토큰의 `aud`가 이 키이기 때문이다. 브라우저 방식을 쓰지 않아도 공급자를 켜려면 REST API 키와 시크릿을 넣어야 할 수 있다.

### 4.2 라이브러리

- `@react-native-kakao/core`와 `@react-native-kakao/user`(MJ Studio)를 쓴다. Expo 설정 플러그인이 패키지 안에 들어 있다.

  ```json
  ["@react-native-kakao/core", {
    "nativeAppKey": "…",
    "android": { "authCodeHandlerActivity": true },
    "ios": { "handleKakaoOpenUrl": true }
  }]
  ```

- 로그인 함수는 `login({ scopes, nonce, useKakaoAccountLogin })`다. 돌려주는 값은 `{ accessToken, refreshToken, idToken?, … }`이다.
  - 패키지 소스를 받아 iOS·Android 모두 nonce를 카카오 SDK에 넘기는 것을 확인했다.
  - 카카오톡이 깔려 있으면 카카오톡으로 로그인하고, 없으면 카카오 계정 웹 로그인으로 넘어간다.
- **버전**
  - 3.0.0이 2026-10-11에 나왔다(조사일 기준 4일 전).
  - 2.4.10(10-08)은 iOS SDK 2.22.1을 쓰고, 2.4.7(09-06)은 Android 빌드 오류를 고쳤다.
  - 나온 지 2주가 지난 판을 고정한다. 오늘이면 2.4.7이고, 설치하는 날에는 2.4.10이 될 수도 있다.
  - 3.x는 바뀐 점을 읽은 뒤에 올린다.
  - RN 0.86 새 구조(New Architecture)에서 빌드되는지는 **확인하지 못했다.** 시험 구현에서 본다.

### 4.3 앱 코드의 큰 틀

```ts
const raw = randomNonce();
const token = await KakaoUser.login({ scopes: ['openid'], nonce: await sha256Hex(raw) });
if (!token.idToken) throw new Error('kakao: no id token (OIDC off?)');
await supabase.auth.signInWithIdToken({ provider: 'kakao', token: token.idToken, nonce: raw });
```

창을 닫았을 때 나는 오류 코드는 시험 구현에서 확인하고, Apple과 같은 `'canceled'`로 바꾼다.

### 4.4 ID 토큰 내용

| 칸 | 값 |
| --- | --- |
| `iss` | `https://kauth.kakao.com` |
| `aud` | 앱 키(4.1의 6) |
| `sub` | **카카오 회원번호** |
| 서명 | RS256 |

이 `sub`가 연결 끊기 API의 `target_id`다. Supabase에서는 `auth.identities`의 `provider_id`나 `identity_data.sub`로 읽을 수 있을 것으로 본다. 정확히 어느 칸인지는 시험 구현에서 확인한다.

### 4.5 계정 삭제 때 연결 끊기

```
POST https://kapi.kakao.com/v1/user/unlink
Authorization: KakaoAK ${KAKAO_ADMIN_KEY}
Content-Type: application/x-www-form-urlencoded

target_id_type=user_id&target_id=<회원번호>
→ {"id": <회원번호>}
```

- 사용자의 동의를 거두고, 그 사용자의 카카오 토큰을 폐기한다.
- 어드민 키로 부르므로 **카카오 토큰을 저장할 필요가 없다.** 이 점이 Apple과 다르다. `delete-account`가 identity에서 회원번호를 읽어 부르기만 하면 된다.
- 사용자가 카카오 쪽에서 이미 연결을 끊었다면 오류가 난다. 그 오류는 「이미 끝난 것」으로 보고 다음 단계로 간다. 오류 코드는 시험 구현에서 확인한다.
- **연결 끊기 알림(웹훅):** 사용자가 카카오 설정에서 직접 연결을 끊으면 카카오가 우리 서버로 알린다. 카카오는 처리방침대로 조치하라고 안내한다. Apple 서버 알림과 함께 출시 전에 할 일로 둔다.

## 5. 출처

- **Supabase:** [Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple) · [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) · [Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao) · [딥링크(브라우저 방식)](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) · [auth 서버 `token_oidc.go`](https://github.com/supabase/auth/blob/master/internal/api/token_oidc.go)
- **Google 로그인 라이브러리:** [Expo 설정](https://react-native-google-signin.github.io/docs/setting-up/expo) · [무료판](https://react-native-google-signin.github.io/docs/original) · [Universal](https://react-native-google-signin.github.io/docs/one-tap) · [설치·라이선스](https://react-native-google-signin.github.io/docs/install) · [가격](https://universal-sign-in.com/)
- **Google:** [예전 Sign-In에서 Credential Manager로 옮기기](https://developer.android.com/identity/sign-in/legacy-gsi-migration) · [OAuth 앱 확인](https://support.google.com/cloud/answer/13464321)
- **카카오:** [활용하기(OIDC)](https://developers.kakao.com/docs/latest/ko/kakaologin/utilize) · [REST API(연결 끊기)](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api) · [RN Kakao](https://rnkakao.mjstudio.net) · [DevTalk: 키 해시 오류](https://devtalk.kakao.com/t/3-validation-failed/147356) · [DevTalk: RN Expo OIDC](https://devtalk.kakao.com/t/rn-expo-oidc/136390)
- **Apple:** [App Review 4.8 (개발자 포럼)](https://developer.apple.com/forums/thread/765145) · [서버 알림 정리 (제3자 글)](https://blakecrosley.com/ko/blog/sign-in-with-apple-server-notifications)
- **패키지 버전·타입:** `npm view`와 `npm pack`으로 직접 확인(2026-10-15).

## 6. 확인하지 못한 것

- **카카오**
  - 동의 항목 없이 `openid`만으로 로그인되는지
  - 2.4.x가 RN 0.86 새 구조에서 빌드되는지
  - Supabase가 회원번호를 identity의 어느 칸에 두는지
  - 창을 닫았을 때와 이미 끊긴 사용자일 때의 오류 코드
- **Google**
  - 브랜드 확인 없이 출시해도 되는지
  - Netlify 하위 도메인으로 도메인 확인이 되는지
  - EAS 고객 무료 라이선스의 조건
  - 유료판의 nonce가 iOS에서도 동작하는지
- **Apple**
  - 서버 알림을 심사에서 요구하는지
