# 카카오 로그인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연결 화면에 카카오 로그인을 더하고, 계정 삭제 때 카카오 연결을 끊는다(상위 계획 2단계).

**Architecture:** Apple과 같은 길이다. 앱이 카카오 SDK로 ID 토큰을 받고 `signInWithIdToken({ provider: 'kakao' })`로 세션을 만든다. 순수 로직(`signIn/kakao.ts`)과 SDK 어댑터(`signIn/expoKakao.ts`)를 나눠 로직만 jest로 시험한다. 서버는 카카오 토큰을 저장하지 않고, `delete-account`가 identity의 회원번호와 어드민 키로 연결을 끊는다.

**Tech Stack:** Expo ~57 / RN 0.86, `@react-native-kakao/core`와 `user` 2.4.10, Supabase Auth, Edge Functions(Deno), jest + ts-jest, vitest(컴포넌트).

**Spec:** [상위 계획](2026-10-15-social-login.md) 2단계, [자료 조사](../specs/2026-10-15-social-login-research.md) 4절, PRD 4.8.

## Global Constraints

- 받는 정보는 카카오 회원번호뿐이다. 동의항목은 설정하지 않고 scope는 `['openid']`만 쓴다(PRD 4.8).
- 플랫폼: iOS는 Apple과 카카오, Android는 카카오(상위 계획 결정 1).
- 라이브러리는 나온 지 2주가 지난 판을 `~`나 `^` 없이 고정한다. 2.4.10은 2026-10-08에 나왔다.
- 설치 전에 `package.json`과 `package-lock.json`을 백업하고, 설치 뒤 `npm ls react-dom --all`이 `19.2.3` 하나인지 본다.
- 어드민 키, 클라이언트 시크릿은 앱과 git에 넣지 않는다(`.secrets/kakao.env`, 함수 secret `KAKAO_ADMIN_KEY`).
- 카카오 버튼은 카카오 가이드 그대로 쓴다: 바탕 `#FEE500`, 말풍선 심볼 `#000000`(모양과 비율 변경 금지), 글자 「카카오 로그인」 `#000000` 85%, 모서리 12. 높이는 Apple 버튼과 같은 48.
- 화면을 바꾸면 `npx expo export --platform ios`와 `--platform android`를 둘 다 돌리고, Storybook `Screens/Account login`과 흐름도 `Flows/앱 전체`를 맞춘다.
- 커밋은 사용자가 직접 돌려 본 뒤에 한다(AGENTS.md가 이 스킬의 「태스크마다 커밋」보다 먼저다).

## Review Focus

1. **창 닫기:** 카카오톡 앱이나 웹 로그인 창을 닫으면 알림 없이 로그인 화면으로 돌아와야 하고, 전송 잠금이 풀려야 한다 → Task 2의 `canceled` 테스트, Task 3에서 시뮬레이터로 오류 코드 확인.
2. **이미 끊긴 연결로 삭제:** 사용자가 카카오 설정에서 먼저 끊었으면 연결 끊기 API가 `-101`을 돌려준다. 이것은 끝난 것으로 보고 삭제를 이어 가야 한다 → Task 4 테스트.
3. **삭제 도중 실패 뒤 다시 시도:** 연결 끊기는 됐고 사진 단계에서 실패한 뒤 다시 누르면 `-101`로 넘어가야 한다 → Task 4 테스트(같은 경로).
4. **어드민 키 누락:** 함수 secret이 없으면 조용히 건너뛰지 않고 멈춘다 → Task 4 테스트.
5. **Android에서 Apple 모듈과 카카오 버튼:** Android에서는 카카오 버튼만 보이고 Apple 모듈을 불러도 죽지 않는다 → Task 6 수동 확인.

---

### Task 1: 라이브러리와 설정

**Files:**
- Modify: `package.json`, `package-lock.json`, `app.json`(plugins)
- Create: `src/sync/signIn/kakaoKey.ts`
- Test: `__tests__/kakaoKey.test.ts`

**Interfaces:**
- Produces: `KAKAO_NATIVE_APP_KEY: string`(`kakaoKey.ts`). 네이티브 앱 키는 앱에 들어가는 공개 값이라 코드에 둔다. 개발과 운영이 같은 카카오 앱을 쓴다(상위 계획 4단계).

- [ ] `npm i -E @react-native-kakao/core@2.4.10 @react-native-kakao/user@2.4.10`, `npm ls react-dom --all` 확인.
- [ ] `app.json` plugins에 `["@react-native-kakao/core", { "nativeAppKey": "<키>", "android": { "authCodeHandlerActivity": true }, "ios": { "handleKakaoOpenUrl": true } }]`.
- [ ] 테스트: `app.json`의 플러그인 `nativeAppKey`와 `KAKAO_NATIVE_APP_KEY`가 같다(두 곳이 어긋나면 iOS URL 스킴과 SDK 초기화가 서로 다른 앱을 본다).
- [ ] `npx expo prebuild --clean` 뒤 iOS 시뮬레이터(iOS 26.5) 개발 빌드가 되는지 본다.

### Task 2: 로그인 로직

**Files:**
- Create: `src/sync/signIn/kakao.ts`
- Test: `__tests__/kakaoSignIn.test.ts`

**Interfaces:**
- Consumes: `makeNonce()`(`signIn/nonce.ts`)
- Produces:
  ```ts
  export type KakaoSignInDeps = {
    makeNonce(): Promise<{ raw: string; hashed: string }>;
    /** 카카오 창. 사용자가 닫으면 'canceled'를 돌려준다(어댑터가 SDK 오류를 바꾼다). */
    requestKakao(hashedNonce: string): Promise<{ idToken: string | null } | 'canceled'>;
    signInWithIdToken(idToken: string, rawNonce: string): Promise<{ user: User | null; error: { message: string } | null }>;
  };
  export function signInWithKakao(deps: KakaoSignInDeps): Promise<{ user: User } | 'canceled'>;
  ```

- [ ] 테스트(`appleSignIn.test.ts`와 같은 모양): 카카오에는 해시한 nonce, Supabase에는 원래 nonce / 창을 닫으면 `'canceled'`이고 Supabase를 부르지 않는다 / `idToken`이 없으면 `'kakao: no id token'`으로 던진다 / Supabase 거절은 그 메시지로 던진다 / 그 밖의 SDK 오류는 그대로 던진다.
- [ ] 구현 뒤 `npx jest __tests__/kakaoSignIn.test.ts` 통과.

### Task 3: SDK 어댑터

**Files:**
- Create: `src/sync/signIn/expoKakao.ts`

**Interfaces:**
- Produces: `expoKakaoDeps(client: SupabaseClient): KakaoSignInDeps`, `signOutKakao(): Promise<void>`(실패해도 던지지 않는다).

- [ ] `initializeKakaoSDK(KAKAO_NATIVE_APP_KEY)`는 처음 부를 때 한 번만.
- [ ] `login({ scopes: ['openid'], nonce })`. 창 닫기 오류는 라이브러리 소스에서 코드를 찾아 `'canceled'`로 바꾸고, 시뮬레이터에서 실제로 닫아 확인한다.
- [ ] 로그아웃 때 카카오 SDK 토큰도 지운다(`logout()`, 실패 무시) — 다음 로그인에서 다른 카카오 계정을 고를 수 있게.

### Task 4: 서버 연결 끊기

**Files:**
- Create: `supabase/functions/_shared/kakao.ts`
- Modify: `supabase/functions/delete-account/index.ts`
- Test: `__tests__/kakaoServer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function kakaoIdFrom(identities: { provider: string; id?: string; identity_data?: Record<string, unknown> }[] | undefined): string | null;
  export function unlinkKakaoUser(adminKey: string, kakaoId: string, f?: Fetch): Promise<'unlinked' | 'already'>;
  ```
  `Fetch` 타입은 `_shared/apple.ts`와 같은 모양으로, import 없이 표준 Web API만 쓴다(Deno와 jest 둘 다에서 돈다).

- [ ] 테스트: `POST https://kapi.kakao.com/v1/user/unlink`, 헤더 `Authorization: KakaoAK <키>`와 form 본문 `target_id_type=user_id&target_id=<번호>` / 200 → `'unlinked'` / 400 `{"code":-101}` → `'already'` / 그 밖(401 등) → 던진다 / `kakaoIdFrom`은 provider가 `kakao`인 identity의 `identity_data.sub`, 없으면 `id`, 카카오 identity가 없으면 `null`.
- [ ] `delete-account` 1단계에 더한다: `admin.auth.admin.getUserById(uid)`의 identities에서 회원번호를 읽고, 있으면 `KAKAO_ADMIN_KEY`가 없을 때 `step: 'kakao'` 500, 있으면 `unlinkKakaoUser`. 사용자가 이미 없으면(404) 건너뛴다.
- [ ] `supabase functions deploy delete-account`(개발 서버).

### Task 5: 계정 표시

**Files:**
- Modify: `src/design-system/account-screens.tsx`(`AccountProvider`에 `'카카오'` 추가), `src/sync/accountStatus.ts`(`'kakao'` → `'카카오'`)
- Test: `__tests__/accountStatus.test.ts`

- [ ] 테스트: `providerFromAuth('kakao')`가 `'카카오'`.

### Task 6: 카카오 버튼과 연결 화면

**Files:**
- Create: `src/design-system/KakaoLoginButton.tsx`(카카오 가이드의 공식 심볼 경로를 `react-native-svg`로)
- Modify: `app/account/connect.tsx`(`Method`에 `'kakao'`, 버튼 목록, 로그아웃 때 `signOutKakao`), `stories/Account.stories.tsx`(`Screens/Account login`)
- Test: `src/design-system/KakaoLoginButton.test.tsx`(vitest: 글자 「카카오 로그인」, 누르면 `onPress`, `loading`이면 막힘)

- [ ] 버튼 순서: iOS는 Apple 위, 카카오 아래(Apple과 같은 크기). Android는 카카오만. 순서는 시안으로 사용자 확인을 받는다.
- [ ] Storybook과 흐름도 `Flows/앱 전체`를 렌더해서 본다.

### Task 7: 확인

- [ ] `npm test`, `npm run test:components`, `npm run typecheck`, `npm run lint`, `npx expo export --platform ios`와 `--platform android`.
- [ ] `qa`(시뮬레이터: 버튼 모양, 카카오 창 열림, 창 닫기)와 `security`(어드민 키, 로그, 외부 전송)를 동시에 돌린다.
- [ ] 사용자 확인(카카오 계정 로그인이 필요한 것): 연결과 첫 백업, 창 닫기, 로그아웃 뒤 다시 로그인과 복원, 계정 삭제 뒤 카카오톡 「연결된 서비스 관리」에서 빠졌는지, Supabase `auth.identities`에서 회원번호 칸.
