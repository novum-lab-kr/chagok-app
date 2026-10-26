# Apple·Google·카카오 로그인 개발 계획 (상위 계획)

> 이 문서는 세 로그인 수단을 **어떤 순서로, 무엇을 준비해서, 어디까지** 만들지 정한다.
> 코드 단위의 세부 계획(TDD 단계와 코드)은 단계를 시작할 때 따로 쓴다.
> Apple(1단계)은 2026-10-17 main에 합쳤다. 세부 계획 `2026-10-08-apple-login.md`는 끝나서 2026-10-18 지웠다(`402913e`에 있다).
> 세부 계획을 실행할 때는 superpowers:executing-plans 또는 superpowers:subagent-driven-development를 쓴다.

**목표:** 연결 화면의 [개발 계정으로 계속] 자리를 실제 로그인으로 바꾼다. iOS는 Apple·카카오·Google, Android는 카카오·Google로 한다(0단계 결정 1).

**구조:**
- 세 수단 모두 「앱이 ID 토큰을 받는다 → `supabase.auth.signInWithIdToken`」이라는 같은 길을 탄다.
- 수단마다 다른 곳은 두 군데뿐이다. 앱의 `src/sync/signIn/<수단>.ts`, 그리고 서버 `delete-account`의 「외부 연결 해제」 단계다.
- 연결 화면의 분기(연결만·첫 백업·복원·충돌 선택)는 지금 코드를 그대로 쓴다.

**쓰는 것:**
- 앱: Expo ~57 / RN 0.86 / React 19.2.3
- 서버: Supabase Auth·Edge Functions(Deno)
- 라이브러리:
  - `expo-apple-authentication`
  - `expo-crypto`
  - `@react-native-kakao/core`·`user` 2.4.x
  - `@react-native-google-signin/google-signin` 무료판(0단계 결정 2)

**근거 문서:** [자료 조사](../specs/2026-10-15-social-login-research.md), [계정·백업 설계](../specs/2026-09-30-account-backup-design.md), PRD 4.8.

## 지킬 것 (모든 단계)

- **브랜치와 커밋**
  - 작업마다 새 worktree와 브랜치를 쓴다.
  - 코드는 사용자가 직접 돌려 본 뒤 커밋한다. main에는 `--no-ff`로 합친다. push는 요청할 때만 한다.
- **의존성**
  - 의존성을 더하기 전에 `package.json`·`package-lock.json`을 백업한다. 설치 뒤 `npm ls react-dom --all`이 `19.2.3` 하나인지 본다. `overrides`는 건드리지 않는다.
  - 라이브러리는 **나온 지 2주가 지난 판으로 고정**한다(`~`·`^` 없이).
- **비밀 값**
  - 대상: `.p8`, Apple client secret, 카카오 어드민 키·클라이언트 시크릿, Google 웹 secret.
  - 앱 번들과 git에 넣지 않는다. Edge Function secret이나 git-ignore된 `.secrets/`에만 둔다.
- **스키마:** 출시 전 스키마 변경은 기존 마이그레이션 파일을 고친 뒤 dev 서버를 리셋해 반영한다. 단계마다 새 파일을 만들지 않는다.
- **화면 문구와 버튼**
  - 화면 문구는 사용자 관점으로 쓴다.
  - 로그인 버튼 글자는 각 회사 가이드를 따른다: 「Apple로 계속하기」, 「카카오 로그인」, 「Google로 계속하기」.
  - 버튼 높이는 44로 한다(2026-10-12 결정). Google 버튼 치수는 HANDOFF에 적힌 결정값을 따른다.
- **화면을 바꾸면**
  - `npx expo export --platform ios`와 `--platform android`를 둘 다 돌린다.
  - Storybook `Screens/Account login`와 흐름도 `Flows/앱 전체`도 맞춘다.
- **실기기 확인**은 각 단계의 맨 끝에 한다.

## 살필 점 (테스트가 놓치기 쉬운 것)

1. **창 닫기:** 어느 수단이든 사용자가 로그인 창을 닫으면 알림 없이 동의 화면으로 돌아와야 한다. 전송 잠금(`pauseSync`)도 풀려야 한다. 단계마다 수단별 `'canceled'` 변환 테스트를 둔다.
2. **이미 끊긴 연결로 계정 삭제**
   - 사용자가 Apple·카카오 설정에서 먼저 연결을 끊었다면, 폐기·연결 끊기 API가 오류를 낸다.
   - 이 오류는 「이미 끝남」으로 보고 삭제를 마쳐야 한다. 그러지 않으면 그 계정은 영영 지울 수 없다.
   - Apple은 `invalid_grant`로 알 수 있고, 카카오의 오류 코드는 시험 구현에서 확인한다.
3. **삭제 도중 실패한 뒤 다시 시도:** 연결 해제는 성공했는데 사진 삭제에서 실패할 수 있다. 다음 시도에서 연결 해제를 다시 불러도 오류 없이 넘어가야 한다.
4. **Android에서 Apple 모듈:** Android 번들에서 `expo-apple-authentication`을 불러와도 앱이 죽지 않아야 한다. Android에서는 Apple 버튼을 아예 그리지 않는다.
5. **카카오톡 없는 기기와 릴리스 서명**
   - 카카오톡이 없으면 카카오 계정 웹 로그인으로 넘어가야 한다.
   - EAS 릴리스 빌드에서도 키 해시 오류 없이 로그인돼야 한다. 디버그 빌드만 확인하고 끝내지 않는다.

---

## 0단계: 사용자 결정 — 2026-10-15 확정

결정 1·3·4는 추천안, **결정 2는 B(무료판)**. 사용자: 「유료는 쓰지 말고 일단 무료로」. 예전 Android API가 실제로 막히면 그때 유료판이나 다른 방법을 다시 고른다.

| # | 결정 | 선택지 | 추천 |
| --- | --- | --- | --- |
| 1 | 수단과 플랫폼 | A. iOS: Apple·카카오·Google / Android: 카카오·Google<br>B. iOS: Apple·카카오 / Android: 카카오 (Google은 나중에)<br>C. PRD대로 Apple·Google만 (카카오 빼기) | **A**. 국내 사용자에게는 카카오가 가장 익숙하다. 고르면 PRD 4.8의 「Android에는 Google만」을 고쳐야 한다 |
| 2 | Google 라이브러리 | A. 유료판 Universal. EAS 무료 라이선스를 먼저 신청하고, 안 되면 $79/년<br>B. 무료판 16.1.5 + Supabase 「Skip nonce check」<br>C. 브라우저 방식(`signInWithOAuth`) | **A**. 무료판이 쓰는 Android의 예전 API는 지원 중단 예정이다. 유료판은 nonce도 넣을 수 있다. 비용이 부담되면 B. C는 낯선 서버 주소가 보여서 권하지 않는다 |
| 3 | 만드는 순서 | A. Apple → 카카오 → Google<br>B. Apple → Google → 카카오<br>C. 셋을 한 번에 | **A**. Apple은 계정이 이미 있고, 카카오는 콘솔을 바로 만들 수 있다. Google은 OAuth 준비가 가장 늦다 |
| 4 | 카카오 버튼의 순서·모양 | 시안 아티팩트로 2~3안을 보여 드리고 고른다 | 시안을 먼저 만든다(작업 방식: 시안은 아티팩트로) |

결정 1에 따라 같은 작업에서 PRD 4.8 「로그인」 항목과 약관 설계(`2026-09-30-policy-terms-design.md`)의 「Android는 Google만」을 고쳤다.

---

## 1단계: Apple 로그인 (계정이 있어서 지금 시작 가능)

### 1.1 세부 계획 고치기

기존 Apple 세부 계획을 최신 main에 맞춰 고친 뒤 이 브랜치로 옮긴다.

- **마이그레이션:** 새 파일 `20261008000001_apple_token_admin.sql`을 만들지 않고 `20260930000004_account_admin.sql`을 고친다. `admin_save/get/delete_apple_token`을 더하고 `admin_has_apple_token`을 뺀 뒤 리셋한다.
- **열린 결정:** 「버튼 높이」를 지운다(44로 확정).
- **로그인 함수 위치:** `src/sync/signIn/apple.ts`에 두고, 아래 「공통 틀」을 이 단계에서 만든다. 카카오·Google도 같은 틀에 들어간다.
- **삭제 단계 이름:** `delete-account` 1단계를 「외부 연결 해제」로 바꾸고, 수단별 함수를 부르는 모양으로 만든다. 그러면 2단계에서 카카오는 더하기만 하면 된다.
- **충돌 확인:** main에 새로 들어온 TestFlight 준비 변경(`2c87ccc`)이 `app.json`과 부딪히지 않는지 본다.

### 1.2 공통 틀 (1단계에서 만든다)

```ts
// src/sync/signIn/types.ts
export type SignInMethod = 'apple' | 'kakao' | 'google' | 'dev';
export type SignInResult = { kind: 'ok'; provider: SignInMethod } | { kind: 'canceled' };
/** 수단별 로그인. 성공하면 Supabase 세션이 생긴 뒤 돌아온다. 창을 닫으면 canceled. 그 밖의 실패는 throw. */
export type SignInFn = (supabase: SupabaseClient) => Promise<SignInResult>;

// src/sync/signIn/nonce.ts — Apple·카카오 공통
export async function makeNonce(): Promise<{ raw: string; hashed: string }>;
```

- `connect.tsx`는 `signInWith(method)`만 부른다. 결과가 `'canceled'`이면 알림 없이 `cancel()`한다.
- 설정 화면에 보이는 수단 이름은 `providerFromAuth`가 정한다.
  - `AccountProvider` 타입에 `'카카오'`를 더한다. `src/design-system/`은 「추가만 한다」 규칙이 있는데, 이 변경은 그 규칙에 맞는다.
  - `src/sync/accountStatus.ts`의 `providerFromAuth`에 `'kakao' → '카카오'`를 더한다.

### 1.3 사용자 준비물

세부 계획의 Task 0과 같다.

- App ID에서 Sign in with Apple 켜기
- `.p8` 키 만들기
- Supabase Apple 공급자 켜기
- `supabase secrets set`으로 secret 4개 넣기
- iPhone 개발자 모드 켜기

### 1.4 완료 기준

- **자동 확인 다섯 가지가 통과한다.** `npm test`, `npm run test:components`, `npm run typecheck`, `npm run lint`, `expo export`(ios·android).
- **사용자가 iPhone에서 직접 확인한다.**
  - Apple로 연결한 뒤 백업·복원
  - 로그인 창 닫기
  - 로그아웃
  - 계정 삭제. 삭제 뒤 iPhone 설정의 「Apple로 로그인」 목록에서 빠지는지 본다.
  - 설정에서 먼저 연결을 끊은 뒤 계정 삭제

---

## 2단계: 카카오 로그인

### 2.1 시험 구현 (먼저, 반나절)

본 구현 전에, 조사에서 확인하지 못한 것을 직접 확인한다. 시험 구현 코드는 버리고 결과만 이 문서와 조사 문서 6절에 적는다.

- [ ] 카카오 라이브러리(`core`·`user`, 나온 지 2주 지난 판)를 설치하고 `npx expo prebuild --clean`을 돌린다. iOS·Android 개발 빌드가 RN 0.86에서 되는지 본다.
- [ ] `login({ scopes: ['openid'], nonce })`이 동의 항목 없이 되는지, `idToken`이 오는지 본다.
- [ ] `signInWithIdToken({ provider: 'kakao', token, nonce: raw })`로 세션이 생기는지 본다. Supabase Client IDs에는 네이티브 앱 키를 넣는다.
- [ ] Supabase `auth.identities`에서 카카오 회원번호가 어느 칸에 있는지 확인한다.
- [ ] 로그인 창을 닫았을 때의 오류 코드를 확인한다.
- [ ] 어드민 키로 연결을 끊은 뒤 한 번 더 끊을 때의 오류 코드를 확인한다.
- [ ] 카카오톡이 없는 iOS 시뮬레이터와 카카오톡이 있는 실기기에서 로그인 창이 어떻게 뜨는지 본다.

### 2.2 사용자 준비물

1. Kakao Developers에서 앱을 만든다. 명의는 사용자가 정한다.
2. 플랫폼을 등록한다.
   - iOS: 번들 ID
   - Android: 패키지와 키 해시(디버그 + EAS)
   - Play 앱 서명 키의 해시는 Play Console이 생긴 뒤에 더한다.
3. 카카오 로그인과 OpenID Connect를 켠다. 동의 항목은 설정하지 않는다. 시험 결과에 따라 닉네임을 「선택」으로 둘 수도 있다.
4. 키를 둔다.
   - `.env.local`: `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`
   - Supabase 카카오 공급자:
     - Client IDs = 네이티브 앱 키
     - REST API 키·시크릿
     - 「Allow users without an email」 켜기
   - 서버 secret: `supabase secrets set KAKAO_ADMIN_KEY=…`

### 2.3 작업 (세부 계획에서 TDD로 쪼갠다)

| 파일 | 할 일 |
| --- | --- |
| `app.json` | `@react-native-kakao/core` 플러그인을 더한다. `nativeAppKey`를 env에서 읽을지(`app.config`)는 세부 계획에서 정한다 |
| `src/sync/signIn/kakao.ts` | `makeNonce` → `login` → `idToken`이 없으면 throw → `signInWithIdToken`. 창 닫기 오류 코드는 `canceled`로 바꾼다 |
| `src/sync/signIn/kakao.test.ts` | 성공, 창 닫기, `idToken` 없음, Supabase 오류. SDK는 가짜로 넣는다(Apple의 `expoApple.ts`처럼 얇은 어댑터를 따로 둔다) |
| `supabase/functions/_shared/kakao.ts` | `unlinkKakaoUser(adminKey, kakaoId): Promise<'unlinked' \| 'already'>`. 외부 라이브러리 없이 `fetch`만 쓴다 |
| `supabase/functions/__tests__/kakaoServer.test.ts` | 성공(`{id}`), 이미 끊김 → `'already'`, 그 밖의 오류 → throw, 요청 헤더·본문 모양 |
| `supabase/functions/delete-account/index.ts` | 「외부 연결 해제」 단계에서, 카카오 사용자면 회원번호로 `unlinkKakaoUser`를 부른다. 어드민 키가 없으면 조용히 건너뛰지 않고 멈춘다 |
| `supabase/functions/__tests__/deleteAccount.test.ts` | 카카오 사용자 삭제, 이미 끊긴 사용자, 연결 해제 뒤 사진 단계 실패 → 다시 시도 |
| `src/design-system/` | 카카오 버튼(시안 확정 뒤). 카카오 가이드: 배경 `#FEE500`, 말풍선 기호, 글자 「카카오 로그인」 |
| `app/account/connect.tsx` | 버튼 목록에 카카오를 더한다. 플랫폼별 목록은 결정 1을 따른다 |
| Storybook·흐름도 | `Screens/Account login`에 카카오 버튼을 더하고, `Flows/앱 전체`를 확인한다 |

### 2.4 완료 기준

- 자동 확인 다섯 가지가 통과한다(1단계와 같다).
- 사용자가 두 기기에서 직접 확인한다.
  - 기기: iPhone(카카오톡 있음), Android 에뮬레이터(카카오톡 없음)
  - 항목: 연결, 백업·복원, 창 닫기, 로그아웃, 계정 삭제
  - 삭제 뒤 카카오톡 「설정 → 카카오계정 → 연결된 서비스 관리」에서 차곡차곡이 빠졌는지 본다.
- EAS 릴리스(preview) 빌드에서 로그인해 본다. 키 해시가 맞는지 확인하는 단계다.

---

## 3단계: Google 로그인 (OAuth 준비 뒤)

사용자가 「Google OAuth 준비됐다」고 할 때 시작한다.

### 3.1 사용자 준비물

1. **Google Cloud:** 프로젝트와 OAuth 동의 화면을 만든다.
   - 범위는 `openid`·`email`·`profile`만 쓴다.
   - 「테스트」 상태로 두고 테스트 사용자를 등록한다.
2. **클라이언트 ID:** 웹 1개, iOS 1개, Android(디버그·EAS의 SHA-1)를 만든다.
3. **Supabase Google 공급자:** Client IDs에 웹 ID와 iOS ID를 넣고 「Skip nonce check」를 켠다(무료판은 nonce를 넣을 수 없다).
4. **앱 설정:** `.env.local`에 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`와 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`를 넣는다.

### 3.2 작업

| 파일 | 할 일 |
| --- | --- |
| `app.json` | `@react-native-google-signin/google-signin` 플러그인과 `iosUrlScheme` |
| `src/sync/signIn/google.ts` | `configure` → `signIn` → `isCancelledResponse`면 `canceled` → `signInWithIdToken`(nonce 없음) |
| `src/sync/signIn/google.test.ts` | 성공, 창 닫기, `IN_PROGRESS`, Play 서비스 없음, `idToken` 없음 |
| `app/account/delete.tsx` 또는 `src/sync/account.ts` | Google 사용자면 서버 삭제를 부르기 직전에 `revokeAccess()`를 부른다. 실패해도 삭제는 계속한다 |
| `app/account/connect.tsx` | 버튼 목록에 Google을 더한다. 로그아웃 때 `GoogleSignin.signOut()`을 부른다 |
| Storybook·흐름도 | Google 버튼은 시안과 치수가 이미 확정돼 있다(HANDOFF). 화면에 연결만 한다 |

### 3.3 완료 기준

- 자동 확인 다섯 가지가 통과한다.
- 사용자가 두 기기에서 직접 확인한다.
  - 기기: Android 에뮬레이터(Google Play 이미지), iPhone
  - 항목: 연결, 창 닫기, 로그아웃, 계정 삭제
  - 삭제 뒤 Google 계정의 「서드파티 연결」 목록에서 차곡차곡이 빠졌는지 본다.
- EAS 릴리스 빌드에서 `DEVELOPER_ERROR`가 나지 않는지 본다. SHA-1 지문이 맞는지 확인하는 단계다.

---

## 4단계: 출시 전 마무리 (스토어 제출 직전)

아래 항목은 `docs/RELEASE-CHECKLIST.md`로 옮긴다.

- [ ] **운영 서버:** 운영 Supabase 프로젝트에 세 공급자 설정과 secret을 다시 넣는다. 키 자체(.p8, 카카오 앱, Google 클라이언트)는 dev와 같은 것을 쓴다.
- [ ] **Play 앱 서명 키:** 그 키의 SHA-1을 Google Android 클라이언트에, 키 해시를 카카오에 더한다.
- [ ] **Google:** 브랜드 확인을 받고 「프로덕션」으로 바꾼다. 처리방침의 정식 도메인과 승인된 도메인 확인이 먼저 필요하다.
- [ ] **카카오:** 앱 아이콘·이름·사업자 정보를 확인하고, 동의 항목이 실제로 쓰는 것과 같은지 본다.
- [ ] **알림 받기(선택이지만 권장)**
  - 카카오: 2026-10-26 정함, 지운다. `kakao-unlink` 함수(구현 계획은 끝나서 지웠다, git 기록에 있다).
  - Apple 서버 알림(`consent-revoked`, `account-delete`)은 아직. 지울지, 로그인만 풀지는 그때 사용자가 정한다.
- [ ] **처리방침 1판과 스토어 개인정보 답안:** Google·카카오를 수집 경로에 더하고, 이메일 칸을 수단별로 적는다.
- [ ] **심사 메모:** App Review 노트에 「Apple 로그인을 Google·카카오와 같은 크기로 제공한다」고 적는다(심사 기준 4.8).

---

## 남은 열린 결정

- 4단계: Apple 서버 알림이 왔을 때 데이터를 지울지, 로그인만 풀지(카카오는 지우기로 정함, 2026-10-26)
- 같은 사람이 여러 수단으로 들어와 계정이 둘로 나뉠 때의 안내 문구. 지금은 만들지 않는다(조사 문서 1.4절).
