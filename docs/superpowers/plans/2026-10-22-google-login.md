# Google 로그인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연결 화면에 Google 로그인을 더하고, 로그아웃과 계정 삭제 때 이 기기의 Google 연결을 정리한다(상위 계획 3단계).

**Architecture:** 카카오와 같은 길이다. 앱이 Google 로그인 라이브러리(무료판)로 ID 토큰을 받고 `signInWithIdToken({ provider: 'google' })`로 세션을 만든다. 순수 로직(`signIn/google.ts`)과 SDK 어댑터(`signIn/expoGoogle.ts`)를 나눠 로직만 jest로 시험한다. 서버에 Google 토큰을 두지 않으므로 서버 함수는 바꾸지 않는다. 계정 삭제 때는 앱이 `revokeAccess()`로 연결을 끊는다.

**Tech Stack:** Expo ~57 / RN 0.86, `@react-native-google-signin/google-signin` 16.1.5, Supabase Auth, jest + ts-jest, vitest(컴포넌트).

**Spec:** [상위 계획](2026-10-15-social-login.md) 3단계, [자료 조사](../specs/2026-10-15-social-login-research.md) 3절, PRD 4.8, [Google 브랜드 가이드](https://developers.google.com/identity/branding-guidelines).

## Global Constraints

- 받는 정보는 Google 계정 식별자와 이메일이다(라이브러리 기본 범위 `email`, `profile`, 처리방침 2절).
- 무료판은 nonce를 넣을 수 없다. Supabase 개발 서버는 nonce 확인을 껐다(2026-10-22).
- 플랫폼: iOS는 Apple, 카카오, Google. Android는 카카오, Google(상위 계획 결정 1).
- 라이브러리는 나온 지 2주가 지난 판을 `-E`로 고정한다. 16.1.5는 2026-09-03에 나왔다. 설치 뒤 `npm ls react-dom --all`이 `19.2.3` 하나인지 본다.
- 웹 클라이언트 시크릿은 앱과 git에 넣지 않는다(`.secrets/google.env`). 웹과 iOS 클라이언트 ID는 앱에 들어가는 공개 값이라 코드에 둔다(카카오 네이티브 앱 키와 같다).
- Google 버튼은 브랜드 가이드의 밝은 테마를 쓴다: 바탕 `#FFFFFF`, 테두리 `#747775` 1, 글자 `#1F1F1F`, 표준 4색 G 로고(모양과 색 변경 금지). 다른 로그인 버튼과 같은 크기(높이 48, 모서리 12).
- 화면을 바꾸면 `npx expo export --platform ios`와 `--platform android`를 둘 다 돌리고 Storybook `Screens/Account login`을 맞춘다.
- 커밋은 사용자가 직접 돌려 본 뒤에 한다.

## Review Focus

1. **창 닫기:** 계정 고르기 창을 닫으면 알림 없이 로그인 화면으로 돌아오고 전송 잠금이 풀린다 → Task 2 `canceled` 테스트(라이브러리가 취소를 `type: 'cancelled'`로 돌려준다).
2. **ID 토큰 없음:** `webClientId`가 빠지면 `idToken`이 `null`이다. Supabase에 보내지 않고 던진다 → Task 2 테스트.
3. **iOS URL 스킴:** `app.json`의 `iosUrlScheme`이 iOS 클라이언트 ID를 거꾸로 쓴 값과 다르면 iOS 로그인 창이 돌아오지 못한다 → Task 1 테스트.
4. **삭제 뒤 연결 해제 실패:** `revokeAccess()`가 실패해도 계정 삭제는 끝까지 간다 → Task 3 어댑터가 오류를 삼킨다.
5. **Android Play 서비스 없음:** `hasPlayServices()`가 던지면 연결 실패 안내로 끝난다(앱이 죽지 않는다) → Task 4 수동 확인.

---

### Task 1: 라이브러리와 설정

**Files:** Modify `package.json`, `package-lock.json`, `app.json`(plugins). Create `src/sync/signIn/googleKeys.ts`. Test `__tests__/googleKeys.test.ts`.

- **Produces:** `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`(`googleKeys.ts`).
- [ ] `npm i -E @react-native-google-signin/google-signin@16.1.5`.
- [ ] `app.json` plugins에 `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<iOS ID 앞부분>" }]`.
- [ ] 테스트: `iosUrlScheme`이 `GOOGLE_IOS_CLIENT_ID`를 점으로 나눠 거꾸로 이은 값과 같다.

### Task 2: 로그인 로직

**Files:** Create `src/sync/signIn/google.ts`. Test `__tests__/googleSignIn.test.ts`.

- **Produces:**
  ```ts
  export type GoogleSignInDeps = {
    /** 계정 고르기 창. 사용자가 닫으면 'canceled'. */
    requestGoogle(): Promise<{ idToken: string | null } | 'canceled'>;
    signInWithIdToken(idToken: string): Promise<{ user: User | null; error: { message: string } | null }>;
  };
  export function signInWithGoogle(deps: GoogleSignInDeps): Promise<{ user: User } | 'canceled'>;
  ```
- [ ] 테스트: 받은 ID 토큰을 Supabase에 넘긴다 / 창을 닫으면 `'canceled'`이고 Supabase를 부르지 않는다 / `idToken`이 없으면 `'google: no id token'` / Supabase 거절은 그 메시지로 / 그 밖의 오류는 그대로 던진다.

### Task 3: SDK 어댑터

**Files:** Create `src/sync/signIn/expoGoogle.ts`.

- **Produces:** `expoGoogleDeps(client): GoogleSignInDeps`, `signOutGoogle(): Promise<void>`, `revokeGoogle(): Promise<void>`(둘 다 실패해도 던지지 않는다).
- [ ] `GoogleSignin.configure({ webClientId, iosClientId })`는 처음 부를 때 한 번만.
- [ ] Android는 `hasPlayServices()` 뒤 `signIn()`. `isCancelledResponse`면 `'canceled'`.

### Task 4: 버튼과 화면 연결

**Files:** Modify `src/design-system/account-screens.tsx`(`GoogleLoginButton`), `src/design-system/account-screens.test.tsx`, `app/account/connect.tsx`(`Method`에 `'google'`, 버튼, 취소와 ABORTED 경로에 `signOutGoogle`), `app/(tabs)/settings.tsx`(로그아웃에 `signOutGoogle`), `app/account/delete.tsx`(서버 삭제가 끝난 뒤 `revokeGoogle`, 그다음 `signOutGoogle`), `stories/Account.stories.tsx`.

- [ ] 글자는 셋 다 「계속하기」(Apple `CONTINUE`, 「카카오로 계속하기」, 「Google로 계속하기」, 2026-10-22 사용자 결정). 순서는 카카오, Google, Apple(2026-10-22 사용자 결정, DESIGN-SYSTEM).
- [ ] 컴포넌트 테스트: 글자, 누르면 `onPress`, `disabled`면 막힘.
- [ ] Storybook을 렌더해서 본다.

### Task 5: 확인

- [ ] `npm test`, `npm run test:components`, `npm run typecheck`, `npm run lint`, 두 플랫폼 `expo export`.
- [ ] iOS 시뮬레이터(26.5)에서 버튼 모양과 Google 창 열림, 창 닫기.
- [ ] 사용자 확인(테스트 사용자 Google 계정 로그인이 필요한 것): 연결과 첫 백업, 로그아웃 뒤 다시 로그인과 복원, 계정 삭제 뒤 Google 계정 「서드파티 연결」에서 빠지는지, Android 에뮬레이터(Google Play 이미지).
