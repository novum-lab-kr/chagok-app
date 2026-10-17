# Apple 로그인 연결 계획

> 상태(2026-10-17): Task 0~4 끝, main에 합침. Task 5 실기기 확인은 연결, 창 닫기, 로그아웃 뒤 다시 로그인까지 했고 계정 삭제는 아직이다(HANDOFF).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **2026-10-15 실행 때 바꾼 점** ([상위 계획](2026-10-15-social-login.md) 1단계)
> - 마이그레이션은 새 파일 대신 `20260930000004_account_admin.sql`을 고쳤다(출시 전 방침). 배포는 `db push`가 아니라 `db reset --linked`.
> - 앱 코드는 `src/sync/signIn/`(`apple.ts`·`expoApple.ts`·`nonce.ts`)에 둔다. nonce는 카카오와 같이 쓰는 `makeNonce`로, `apple-link` 호출(`linkToken`)은 `signInWithApple` 안으로 옮겼다 — 연결 화면은 `{ user } | 'canceled'`만 받는다.
> - 버튼 높이 44 확정(2026-10-12). `appleTeamId`를 `app.json`에 넣었다.

**Goal:** iOS 계정 연결 화면에 Apple 로그인을 붙이고, 로그인할 때 Apple refresh token을 서버에 맡겨(`apple-link`), 계정을 삭제할 때 그 토큰으로 Apple 연결을 폐기한다(`delete-account` 1단계).

**Architecture:** 앱은 `expo-apple-authentication`으로 Apple 창을 띄우고, 받은 ID 토큰을 `supabase.auth.signInWithIdToken`으로 넘긴다(nonce는 Apple에 SHA-256 값, Supabase에 원래 값). 로그인 직후 `authorizationCode`를 새 Edge Function `apple-link`에 보내면, 함수가 Apple에서 refresh token으로 바꿔 `private.apple_tokens`에 저장한다. `delete-account`는 지금 "토큰이 있으면 멈춤"인 1단계를 실제 폐기로 바꾼다. Apple 요청(client secret 서명·코드 교환·폐기)은 import 없는 `supabase/functions/_shared/apple.ts` 하나에 모아 Deno와 jest 둘 다에서 돌게 한다. 연결 화면의 흐름(동의 → 로그인 → 분기)은 그대로고, 로그인 한 단계만 방법별로 갈린다.

**Tech Stack:** Expo 57 / React Native 0.86, `expo-apple-authentication ~57.0.2`, `expo-crypto ~57.0.3`, `@supabase/supabase-js` 2, Supabase Edge Functions(Deno 2), Web Crypto(ES256), jest + ts-jest, 실제 서버 테스트(`npm run test:server`), iPhone 15 Pro 실기기.

**Spec:** [계정·백업 설계](../specs/2026-09-30-account-backup-design.md) ③ `apple-link`·`delete-account`, [PRD](../../PRD.md) 4.8 로그인·계정 삭제, [HANDOFF](../../HANDOFF.md) 5 「Apple 계정으로 이제 할 수 있는 것」. 참고 문서: [Expo 57 AppleAuthentication](https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/), [Supabase Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## Global Constraints

- 작업 위치: worktree `/Users/eunjukim/Desktop/workspace/chagok-wt-apple-login`, 브랜치 `feat/apple-login`. main 작업 트리(`chagok-app`)에는 쓰지 않는다.
- 번들 ID(= Apple Client ID): `com.novum.chagok`. Team ID: `AQUDD2QFNC`.
- Apple에는 이름을 요청하지 않는다. `requestedScopes`는 `EMAIL`만.
- Apple 버튼은 iOS에서 `isAvailableAsync()`가 `true`일 때만 보인다. Android에는 보이지 않는다.
- 버튼은 디자인 시스템 예외 — Apple 시스템 버튼(`AppleAuthenticationButton`)을 그대로 쓴다. 종류 `CONTINUE`("Apple로 계속하기"), 색 `WHITE_OUTLINE`(2026-10-01 사용자 결정 「흰색 테두리」). `style`에 너비·높이를 꼭 주고 `backgroundColor`·`borderRadius`는 주지 않는다(Expo 문서).
- 버튼 높이는 **사용자 결정 대기**(HANDOFF 7, 33·38·44). 코드에는 상수 하나(`APPLE_BUTTON_HEIGHT`)로 두고 44(Apple 기본)로 시작한다. 정해지면 그 값만 바꾼다.
- `.p8` 키·client secret은 앱에 넣지 않는다. `.p8`은 `.secrets/`(git-ignore)에 두고, 서버에는 Supabase 함수 secret으로만 넣는다.
- 이미 올린 마이그레이션 파일은 고치지 않는다. 새 파일을 더한다.
- 의존성 추가 전 `package.json`·`package-lock.json`을 백업하고, 설치 뒤 `npm ls react-dom --all`이 `19.2.3` 하나만 내놓는지 확인한다(AGENTS.md).
- Apple 토큰을 맡기지 못하면 연결하지 않는다 — 폐기할 수 없는 계정을 만들지 않는다. 폐기하지 못하면 계정 삭제를 멈춘다(기존 원칙: 조용히 건너뛰지 않는다).
- 사용자에게 보이는 새 문구는 없다. 실패는 기존 「연결하지 못했어요」 다이얼로그를 쓴다. Apple 창을 사용자가 닫으면 알림 없이 동의 화면에 남는다.
- 개발 계정 버튼(`__DEV__` 전용)은 Apple 버튼 아래에 남긴다 — Android(Google 로그인 전)와 개발 확인에 계속 쓴다.
- 화면 구조와 이동 경로는 바뀌지 않으므로 화면 흐름도(`Flows/앱 전체`)는 고치지 않는다.
- 코드 스타일은 주변 파일을 따른다(`app/`·`src/sync/`는 일반 TS 서식, 주석은 한국어 한두 줄).
- 커밋은 사용자가 실기기에서 확인한 뒤에만 한다. 각 Task의 「커밋」 단계는 사용자 확인 뒤 실행한다. push는 하지 않는다.

## Review Focus

1. **Android에서 연결 화면 열기** — `expo-apple-authentication`은 iOS 전용이다. Android 앱에서 연결 화면을 열 때 이 모듈 import가 앱을 죽이지 않고, Apple 버튼이 보이지 않아야 한다. Task 5 에뮬레이터 확인. 죽으면 멈추고 알린다(`require`를 iOS 분기 안으로 옮기는 것이 대안).
2. **Apple 창을 닫음** — 오류 알림 없이 동의 화면에 남고, 전송 잠금이 풀리고, 다시 누를 수 있다. Task 3 테스트(`'canceled'`) + Task 4(`CANCELED` 처리) + Task 5 확인.
3. **사용자가 iPhone 설정에서 먼저 「Apple로 로그인」 연결을 끊은 뒤 계정 삭제** — refresh token이 이미 무효라 Apple이 `invalid_grant`를 돌려준다. 이것은 폐기된 것과 같으니 삭제가 막히지 않아야 한다. Task 1 테스트 + Task 2 가짜 토큰 서버 테스트.
4. **`apple-link` 실패**(오프라인, 5분 지난 코드, 서버 secret 누락) — 연결이 취소되고 세션이 남지 않으며 「연결하지 못했어요」가 뜬다. 같은 Apple 계정으로 다시 누르면 새 코드로 성공한다. Task 2 서버 테스트(잘못된 코드 → 저장 안 됨) + Task 4 흐름.
5. **Supabase가 Apple 신원의 `sub`를 `identity_data.sub`에 둔다는 가정** — `apple-link`는 다른 Apple 계정의 코드를 막으려 이 값과 Apple이 돌려준 `sub`를 맞춰 본다. 가정이 틀리면 모든 연결이 403으로 실패한다. Task 5 실기기 첫 연결에서 바로 드러난다. 실패하면 대시보드 Authentication → 사용자 → Identities의 실제 필드를 보고 고친다.

---

## 파일 구조

| 파일 | 하는 일 |
| --- | --- |
| `supabase/functions/_shared/apple.ts` (새) | Apple 서버 요청: 설정 읽기, client secret 서명, 코드 교환, 토큰 폐기. import 없음 — Deno와 jest 둘 다 |
| `supabase/functions/_shared/auth.ts` (새) | `delete-account`에 있던 `json`·`userIdFrom`을 옮겨 두 함수가 같이 쓴다 |
| `supabase/functions/apple-link/index.ts` (새) | 코드 → refresh token 교환, Apple 계정 일치 확인, 저장 |
| `supabase/functions/delete-account/index.ts` | 1단계: 토큰이 있으면 폐기 → 토큰 행 삭제 |
| `supabase/migrations/20261008000001_apple_token_admin.sql` (새) | 토큰 저장·읽기·삭제 관리자 함수, 안 쓰게 된 `admin_has_apple_token` 제거 |
| `supabase/config.toml` | `[functions.apple-link] verify_jwt = false` (함수가 직접 서명 검증) |
| `src/sync/account.ts` | `linkAppleToken` 추가 |
| `src/sync/appleSignIn.ts` (새) | Apple 창 → Supabase 로그인 순서(의존성 주입, 테스트 가능) |
| `src/sync/expoApple.ts` (새) | 실제 Expo 모듈로 위 의존성을 채운다, 사용 가능 여부 |
| `app/account/connect.tsx` | Apple 버튼, 로그인 방법 분기, 토큰 맡기기, 창 닫기 처리 |
| `app.json` | `ios.usesAppleSignIn`, `ios.appleTeamId`, 플러그인 |
| `__tests__/appleServer.test.ts` (새) | `_shared/apple.ts` |
| `__tests__/appleSignIn.test.ts` (새) | `appleSignIn.ts`, `linkAppleToken` |
| `__tests__/server/appleLink.test.ts` (새) | 실제 서버 `apple-link` |
| `__tests__/server/deleteAccount.test.ts`, `__tests__/server/security.test.ts` | 폐기 경로, 관리자 함수 권한 |
| `docs/DEV-SETUP.md`, `docs/HANDOFF.md`, 설계 문서 | Apple 설정법과 현황 |

---

### Task 0: 준비물 (사용자가 직접 — 코드 작업 전)

계정 주인(Apple Developer 계정 소유자) 권한이 필요한 일이다. 에이전트는 이 단계를 대신하지 않고, 끝났다는 확인을 받은 뒤 Task 2 배포로 넘어간다. Task 1·3은 이 단계 없이 시작할 수 있다.

- [ ] **Step 1: App ID에 Sign in with Apple 켜기** — developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → `com.novum.chagok`(없으면 App IDs로 새로 만든다, Explicit) → Capabilities에서 **Sign In with Apple** 체크 → Save.
- [ ] **Step 2: 키 만들기** — Keys → ＋ → 이름 `chagok-siwa` → **Sign in with Apple** 체크 → Configure에서 Primary App ID `com.novum.chagok` → 등록 → `.p8` 내려받기(**한 번만 받을 수 있다**). 화면의 **Key ID**(10자)를 적어 둔다. 파일은 `chagok-app/.secrets/AuthKey_<KeyID>.p8`에 둔다.
- [ ] **Step 3: Supabase Apple 공급자** — 대시보드 `chagok-dev` → Authentication → Sign In / Providers → Apple → Enable, **Client IDs**에 `com.novum.chagok`. Secret Key(OAuth용)는 비워 둔다 — 네이티브 전용은 필요 없다(Supabase 문서).
- [ ] **Step 4: 함수 secret** — 저장소 루트에서:

```sh
supabase secrets set APPLE_TEAM_ID=AQUDD2QFNC APPLE_KEY_ID=<KeyID> APPLE_CLIENT_ID=com.novum.chagok
supabase secrets set APPLE_PRIVATE_KEY="$(cat .secrets/AuthKey_<KeyID>.p8)"
supabase secrets list   # 네 이름이 보이면 된다
```

- [ ] **Step 5: Xcode 계정** — Xcode → Settings → Accounts에 팀 `AQUDD2QFNC`가 보이는 Apple ID를 추가한다(계정 주인의 Apple ID). Sign in with Apple 권한이 들어간 앱은 팀 서명 없이 빌드되지 않는다. iPhone 15 Pro는 개발자 모드를 켜 둔다(설정 → 개인정보 보호 및 보안 → 개발자 모드, 재시동).

---

### Task 1: Apple 서버 요청 모듈

**Files:**
- Create: `supabase/functions/_shared/apple.ts`
- Test: `__tests__/appleServer.test.ts`

**Interfaces:**
- Produces:
  - `type AppleConfig = { teamId: string; keyId: string; clientId: string; privateKey: string }`
  - `type Fetch = (url: string, init: { method: 'POST'; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>`
  - `appleConfigFrom(env: (name: string) => string | undefined): AppleConfig` — 없으면 `"<이름> not set"`을 던진다
  - `clientSecret(c: AppleConfig, now?: number): Promise<string>`
  - `exchangeCode(c: AppleConfig, code: string, f?: Fetch): Promise<{ refreshToken: string; sub: string }>`
  - `revokeToken(c: AppleConfig, refreshToken: string, f?: Fetch): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 쓰기** — `__tests__/appleServer.test.ts`

```ts
import { generateKeyPairSync, verify } from 'node:crypto';
import { appleConfigFrom, clientSecret, exchangeCode, revokeToken, type Fetch } from '../supabase/functions/_shared/apple';

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const config = { teamId: 'TEAM123456', keyId: 'KEY1234567', clientId: 'com.novum.chagok', privateKey };

const part = (jwt: string, i: number) => JSON.parse(Buffer.from(jwt.split('.')[i], 'base64url').toString());
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

function fakeFetch(status: number, body: string) {
  const calls: { url: string; form: URLSearchParams }[] = [];
  const f: Fetch = async (url, init) => {
    calls.push({ url, form: new URLSearchParams(init.body) });
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
  return { f, calls };
}

describe('appleConfigFrom', () => {
  it('네 값을 읽는다', () => {
    const env: Record<string, string> = { APPLE_TEAM_ID: 't', APPLE_KEY_ID: 'k', APPLE_CLIENT_ID: 'c', APPLE_PRIVATE_KEY: 'p' };
    expect(appleConfigFrom((n) => env[n])).toEqual({ teamId: 't', keyId: 'k', clientId: 'c', privateKey: 'p' });
  });
  it('빠진 값이 있으면 이름을 알려 주며 멈춘다', () => {
    expect(() => appleConfigFrom(() => undefined)).toThrow('APPLE_TEAM_ID not set');
  });
});

describe('clientSecret', () => {
  it('.p8 키로 ES256 서명한 5분짜리 토큰을 만든다', async () => {
    const jwt = await clientSecret(config, 1_700_000_000_000);
    expect(part(jwt, 0)).toEqual({ alg: 'ES256', kid: 'KEY1234567' });
    expect(part(jwt, 1)).toEqual({ iss: 'TEAM123456', iat: 1_700_000_000, exp: 1_700_000_300, aud: 'https://appleid.apple.com', sub: 'com.novum.chagok' });
    const [h, p, s] = jwt.split('.');
    expect(verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'))).toBe(true);
  });
});

describe('exchangeCode', () => {
  it('코드를 refresh token으로 바꾸고 id_token의 sub를 돌려준다', async () => {
    const { f, calls } = fakeFetch(200, JSON.stringify({ refresh_token: 'r1', id_token: `${b64({})}.${b64({ sub: 'apple-sub-1' })}.sig` }));
    await expect(exchangeCode(config, 'code-1', f)).resolves.toEqual({ refreshToken: 'r1', sub: 'apple-sub-1' });
    expect(calls[0].url).toBe('https://appleid.apple.com/auth/token');
    expect(calls[0].form.get('code')).toBe('code-1');
    expect(calls[0].form.get('grant_type')).toBe('authorization_code');
    expect(calls[0].form.get('client_id')).toBe('com.novum.chagok');
    expect(calls[0].form.get('client_secret')?.split('.')).toHaveLength(3);
  });
  it('Apple이 거절하면 상태와 본문을 담아 던진다', async () => {
    const { f } = fakeFetch(400, '{"error":"invalid_grant"}');
    await expect(exchangeCode(config, 'old', f)).rejects.toThrow('apple token 400: {"error":"invalid_grant"}');
  });
  it('refresh_token이 없으면 던진다', async () => {
    const { f } = fakeFetch(200, JSON.stringify({ id_token: `${b64({})}.${b64({ sub: 's' })}.sig` }));
    await expect(exchangeCode(config, 'c', f)).rejects.toThrow('missing refresh_token');
  });
});

describe('revokeToken', () => {
  it('refresh token 폐기를 요청한다', async () => {
    const { f, calls } = fakeFetch(200, '');
    await revokeToken(config, 'r1', f);
    expect(calls[0].url).toBe('https://appleid.apple.com/auth/revoke');
    expect(calls[0].form.get('token')).toBe('r1');
    expect(calls[0].form.get('token_type_hint')).toBe('refresh_token');
  });
  it('이미 무효인 토큰(invalid_grant)은 폐기된 것으로 본다 — 사용자가 설정에서 먼저 끊은 경우', async () => {
    const { f } = fakeFetch(400, '{"error":"invalid_grant"}');
    await expect(revokeToken(config, 'r1', f)).resolves.toBeUndefined();
  });
  it('설정이 틀리면(invalid_client) 멈춘다', async () => {
    const { f } = fakeFetch(400, '{"error":"invalid_client"}');
    await expect(revokeToken(config, 'r1', f)).rejects.toThrow('apple revoke 400');
  });
  it('Apple 서버 오류면 멈춘다', async () => {
    const { f } = fakeFetch(503, 'down');
    await expect(revokeToken(config, 'r1', f)).rejects.toThrow('apple revoke 503');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/appleServer.test.ts`
Expected: FAIL — `Cannot find module '../supabase/functions/_shared/apple'`

- [ ] **Step 3: 구현** — `supabase/functions/_shared/apple.ts`

```ts
// Sign in with Apple 서버 요청 (계정·백업 설계 ③ apple-link·delete-account).
// Deno(Edge Function)와 Node(jest) 둘 다에서 돈다 — 표준 Web API(fetch·crypto.subtle·atob·btoa)만 쓰고 import가 없다.

export type AppleConfig = { teamId: string; keyId: string; clientId: string; privateKey: string };

export type Fetch = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

const APPLE = 'https://appleid.apple.com';

/** 함수 secret에서 읽는다. 빠졌으면 멈춘다 — 폐기를 조용히 건너뛰지 않게. */
export function appleConfigFrom(env: (name: string) => string | undefined): AppleConfig {
  const get = (name: string) => {
    const value = env(name);
    if (!value) throw new Error(`${name} not set`);
    return value;
  };
  return { teamId: get('APPLE_TEAM_ID'), keyId: get('APPLE_KEY_ID'), clientId: get('APPLE_CLIENT_ID'), privateKey: get('APPLE_PRIVATE_KEY') };
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** client secret: .p8 키로 요청마다 서명한다(ES256, 5분). 6개월마다 손으로 바꿀 일이 없다. */
export async function clientSecret(c: AppleConfig, now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000);
  const input = `${b64urlJson({ alg: 'ES256', kid: c.keyId })}.${b64urlJson({ iss: c.teamId, iat, exp: iat + 300, aud: APPLE, sub: c.clientId })}`;
  const der = fromB64(c.privateKey.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // Web Crypto의 ECDSA 서명은 r||s 64바이트라 JWS 형식 그대로다.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input));
  return `${input}.${b64url(new Uint8Array(sig))}`;
}

async function post(c: AppleConfig, path: string, fields: Record<string, string>, f: Fetch) {
  const body = new URLSearchParams({ client_id: c.clientId, client_secret: await clientSecret(c), ...fields }).toString();
  const res = await f(`${APPLE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

/** 로그인 직후의 authorizationCode(5분, 한 번만 쓸 수 있다)를 refresh token으로 바꾼다. sub는 이 코드의 Apple 사용자다. */
export async function exchangeCode(c: AppleConfig, code: string, f: Fetch = fetch): Promise<{ refreshToken: string; sub: string }> {
  const res = await post(c, '/auth/token', { code, grant_type: 'authorization_code' }, f);
  if (!res.ok) throw new Error(`apple token ${res.status}: ${res.text}`);
  const body = JSON.parse(res.text) as { refresh_token?: string; id_token?: string };
  if (!body.refresh_token || !body.id_token) throw new Error('apple token: missing refresh_token or id_token');
  // id_token은 Apple에서 TLS로 직접 받은 것이라 서명을 다시 검증하지 않고 sub만 읽는다.
  const payload = JSON.parse(new TextDecoder().decode(fromB64(body.id_token.split('.')[1]))) as { sub?: unknown };
  if (typeof payload.sub !== 'string') throw new Error('apple token: missing sub');
  return { refreshToken: body.refresh_token, sub: payload.sub };
}

/** refresh token을 폐기한다(App Store 5.1.1(v)). 이미 무효인 토큰(invalid_grant)은 폐기된 것과 같다. */
export async function revokeToken(c: AppleConfig, refreshToken: string, f: Fetch = fetch): Promise<void> {
  const res = await post(c, '/auth/revoke', { token: refreshToken, token_type_hint: 'refresh_token' }, f);
  if (res.ok) return;
  if (res.status === 400 && res.text.includes('invalid_grant')) return;
  throw new Error(`apple revoke ${res.status}: ${res.text}`);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/appleServer.test.ts && npm run typecheck`
Expected: 10개 PASS, 타입 오류 없음. 타입 체크가 `crypto`·`btoa`를 모른다고 하면 `@types/node`의 전역 선언이 있는지 확인하고, 없을 때만 파일 맨 위에 `/// <reference lib="dom" />`를 더한다.

- [ ] **Step 5: 커밋 (사용자 실기기 확인 뒤)**

```bash
git add supabase/functions/_shared/apple.ts __tests__/appleServer.test.ts
git commit -m "feat(server): Apple token exchange and revoke helpers"
```

---

### Task 2: 서버 — `apple-link`, 계정 삭제 폐기, 관리자 함수

**Files:**
- Create: `supabase/migrations/20261008000001_apple_token_admin.sql`
- Create: `supabase/functions/_shared/auth.ts`
- Create: `supabase/functions/apple-link/index.ts`
- Modify: `supabase/functions/delete-account/index.ts`
- Modify: `supabase/config.toml` (`[functions.delete-account]` 아래)
- Modify: `src/sync/account.ts`
- Test: `__tests__/appleSignIn.test.ts` (이 Task에서는 `linkAppleToken` 부분만 만든다), `__tests__/server/appleLink.test.ts`, `__tests__/server/deleteAccount.test.ts`, `__tests__/server/security.test.ts`

**Interfaces:**
- Consumes: Task 1의 `appleConfigFrom`, `exchangeCode`, `revokeToken`
- Produces:
  - SQL: `public.admin_save_apple_token(p_user uuid, p_token text) returns void`, `public.admin_get_apple_token(p_user uuid) returns text`, `public.admin_delete_apple_token(p_user uuid) returns void` (service_role만)
  - Edge Function `apple-link`: `POST { code: string }` → `200 {ok:true}` | `400` 코드 없음 | `401` 로그인 없음 | `403` Apple 계정 불일치 | `502 {step:'exchange'}` Apple 거절·설정 누락 | `500`
  - `linkAppleToken(client: FunctionsBodyClient, authorizationCode: string): Promise<void>` (`src/sync/account.ts`)
  - `type FunctionsBodyClient = { functions: { invoke(name: string, options: { body: unknown }): PromiseLike<{ error: { message: string } | null }> } }`

- [ ] **Step 1: `linkAppleToken` 실패하는 테스트** — `__tests__/appleSignIn.test.ts`

```ts
import { linkAppleToken } from '../src/sync/account';

describe('linkAppleToken', () => {
  it('apple-link에 코드를 보낸다', async () => {
    const calls: unknown[] = [];
    const client = { functions: { invoke: async (name: string, options: { body: unknown }) => { calls.push([name, options.body]); return { error: null }; } } };
    await linkAppleToken(client, 'code-1');
    expect(calls).toEqual([['apple-link', { code: 'code-1' }]]);
  });
  it('서버가 거절하면 던진다 — 연결 화면이 연결을 취소한다', async () => {
    const client = { functions: { invoke: async () => ({ error: { message: 'exchange failed' } }) } };
    await expect(linkAppleToken(client, 'old')).rejects.toThrow('exchange failed');
  });
});
```

Run: `npx jest __tests__/appleSignIn.test.ts` → FAIL (`linkAppleToken` 없음)

- [ ] **Step 2: `linkAppleToken` 구현** — `src/sync/account.ts`의 `deleteAccountOnServer` 아래에 더한다

```ts
export type FunctionsBodyClient = { functions: { invoke(name: string, options: { body: unknown }): PromiseLike<{ error: { message: string } | null }> } };

/** Apple 로그인 직후 refresh token을 서버에 맡긴다 — 계정 삭제 때 Apple 연결을 폐기하는 데 쓴다. 실패하면 던진다. */
export async function linkAppleToken(client: FunctionsBodyClient, authorizationCode: string): Promise<void> {
  const { error } = await client.functions.invoke('apple-link', { body: { code: authorizationCode } });
  if (error) throw new Error(error.message);
}
```

Run: `npx jest __tests__/appleSignIn.test.ts && npm run typecheck` → PASS

- [ ] **Step 3: 마이그레이션** — `supabase/migrations/20261008000001_apple_token_admin.sql`

```sql
-- Apple refresh token 저장·읽기·삭제. apple-link·delete-account Edge Function만 service_role로 부른다.
-- private 스키마는 API로 노출하지 않으므로 함수로만 다룬다.
create function public.admin_save_apple_token(p_user uuid, p_token text) returns void
language sql security definer set search_path = '' as $$
  insert into private.apple_tokens (user_id, refresh_token) values (p_user, p_token)
  on conflict (user_id) do update set refresh_token = excluded.refresh_token;
$$;

create function public.admin_get_apple_token(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select refresh_token from private.apple_tokens where user_id = p_user;
$$;

create function public.admin_delete_apple_token(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  delete from private.apple_tokens where user_id = p_user;
$$;

revoke execute on function public.admin_save_apple_token(uuid, text), public.admin_get_apple_token(uuid), public.admin_delete_apple_token(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_save_apple_token(uuid, text), public.admin_get_apple_token(uuid), public.admin_delete_apple_token(uuid)
  to service_role;

-- 있는지만 보던 함수는 admin_get_apple_token이 대신한다 (delete-account가 폐기를 구현하면서 안 쓰게 됐다).
drop function public.admin_has_apple_token(uuid);
```

- [ ] **Step 4: 인증 도우미 옮기기** — `supabase/functions/_shared/auth.ts` (내용은 지금 `delete-account/index.ts`의 `json`·`jwks`·`userIdFrom` 그대로, 주석 포함)

```ts
// Edge Function 공용: JSON 응답과 로그인 사용자 확인.
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const jwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

/**
 * 토큰의 서명을 서버 공개 키로 직접 검증하고 사용자 id를 돌려준다. 게이트웨이 설정(verify_jwt)에 기대지 않는다 —
 * 배포 옵션이나 셀프 호스팅 기본값에 따라 꺼져 있을 수 있다. `auth.getUser()`를 쓰지 않는 이유는
 * 인증 계정이 이미 지워진 뒤의 재시도(남은 단계 이어 하기)도 받아야 해서다.
 * 대칭 키(HS256)만 쓰는 서버에서는 공개 키가 없어 모두 거부된다(안전한 쪽으로 실패).
 */
export async function userIdFrom(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${SUPABASE_URL}/auth/v1`, audience: 'authenticated', algorithms: ['ES256', 'RS256'],
    });
    return payload.role === 'authenticated' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: `delete-account` 고치기** — `supabase/functions/delete-account/index.ts`
  - 파일 위쪽의 `json`·`jwks`·`userIdFrom` 정의와 `jose` import를 지우고 아래 import로 바꾼다. `SUPABASE_URL`은 `createClient`에 계속 쓰므로 남긴다.

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { appleConfigFrom, revokeToken } from '../_shared/apple.ts';
import { json, userIdFrom } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
```

  - 1단계(지금 `// 1. Apple 토큰 폐기 — ...`부터 `apple revoke not configured` 줄까지)를 바꾼다:

```ts
  // 1. Apple 토큰 폐기. 폐기한 뒤 토큰 행을 지워, 다시 부르면 이 단계를 건너뛴다.
  //    폐기하지 못하면(설정 누락·Apple 오류) 멈춘다 — 데이터를 지운 뒤에는 되돌릴 수 없다.
  const apple = await admin.rpc('admin_get_apple_token', { p_user: uid });
  if (apple.error) return json({ error: apple.error.message, step: 'apple' }, 500);
  if (typeof apple.data === 'string') {
    try {
      await revokeToken(appleConfigFrom((name) => Deno.env.get(name)), apple.data);
    } catch (e) {
      return json({ error: String(e), step: 'apple' }, 500);
    }
    const cleared = await admin.rpc('admin_delete_apple_token', { p_user: uid });
    if (cleared.error) return json({ error: cleared.error.message, step: 'apple' }, 500);
  }
```

- [ ] **Step 6: `apple-link` 만들기** — `supabase/functions/apple-link/index.ts`

```ts
// Apple 로그인 직후 authorizationCode를 refresh token으로 바꿔 저장한다 (계정·백업 설계 ③).
// 계정 삭제 때 delete-account가 이 토큰으로 Apple 연결을 폐기한다 (App Store 5.1.1(v)).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { appleConfigFrom, exchangeCode } from '../_shared/apple.ts';
import { json, userIdFrom } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const uid = await userIdFrom(req);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = body?.code;
  if (typeof code !== 'string' || !code) return json({ error: 'code required' }, 400);

  let token: { refreshToken: string; sub: string };
  try {
    token = await exchangeCode(appleConfigFrom((name) => Deno.env.get(name)), code);
  } catch (e) {
    return json({ error: String(e), step: 'exchange' }, 502);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // 다른 Apple 계정의 코드로 이 계정에 토큰을 붙이지 못하게, 로그인한 Apple 계정과 같은지 본다.
  const user = await admin.auth.admin.getUserById(uid);
  if (user.error) return json({ error: user.error.message, step: 'user' }, 500);
  const identity = user.data.user?.identities?.find((i) => i.provider === 'apple');
  if (identity?.identity_data?.sub !== token.sub) return json({ error: 'apple account mismatch' }, 403);

  const saved = await admin.rpc('admin_save_apple_token', { p_user: uid, p_token: token.refreshToken });
  if (saved.error) return json({ error: saved.error.message, step: 'save' }, 500);
  return json({ ok: true });
});
```

- [ ] **Step 7: `config.toml`** — `[functions.delete-account]` 블록 바로 아래에 더한다

```toml
[functions.apple-link]
verify_jwt = false
```

- [ ] **Step 8: 서버 테스트 쓰기**

`__tests__/server/appleLink.test.ts`:

```ts
import { linkAppleToken } from '../../src/sync/account';
import { adminClient, anonClient, describeIfServer, newUser } from './support';

const call = (token: string | null, body: unknown) => fetch(`${process.env.SUPABASE_TEST_URL}/functions/v1/apple-link`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: process.env.SUPABASE_TEST_ANON_KEY!, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});

describeIfServer('apple-link', () => {
  it('로그인 없이는 부를 수 없다', async () => {
    await expect(linkAppleToken(anonClient(), 'code')).rejects.toThrow();
  });

  it('코드가 없으면 400', async () => {
    const a = await newUser();
    const token = (await a.client.auth.getSession()).data.session!.access_token;
    expect((await call(token, {})).status).toBe(400);
  });

  // Apple이 모르는 코드를 거절한다(invalid_grant). secret이 빠져 있어도 502라 이 테스트만으로 secret을 확인하지는 않는다 — deleteAccount 테스트가 확인한다.
  it('Apple이 거절한 코드는 저장하지 않는다', async () => {
    const a = await newUser();
    const token = (await a.client.auth.getSession()).data.session!.access_token;
    expect((await call(token, { code: 'not-a-real-code' })).status).toBe(502);
    expect((await adminClient().rpc('admin_get_apple_token', { p_user: a.userId })).data).toBeNull();
  });
});
```

`__tests__/server/deleteAccount.test.ts` — `'두 번 불러도 성공한다'` 테스트 아래에 더한다:

```ts
  // 가짜 토큰이라 Apple은 200 또는 invalid_grant를 돌려준다 — 둘 다 폐기된 것으로 본다.
  // 함수 secret(APPLE_*)이 빠졌거나 틀리면 여기서 실패한다(설정 확인을 겸한다).
  it('Apple 토큰이 있으면 폐기하고 계정을 지운다', async () => {
    const a = await newUser();
    const admin = adminClient();
    expect((await admin.rpc('admin_save_apple_token', { p_user: a.userId, p_token: 'fake-refresh-token' })).error).toBeNull();

    await deleteAccountOnServer(a.client);

    expect((await admin.rpc('admin_get_apple_token', { p_user: a.userId })).data).toBeNull();
    expect((await admin.auth.admin.getUserById(a.userId)).data.user).toBeNull();
  });
```

`__tests__/server/security.test.ts` — `describeIfServer('서버 보안·경계', ...)` 안 마지막에 더한다:

```ts
  it('로그인 사용자는 Apple 토큰 관리자 함수를 부를 수 없다', async () => {
    const a = await newUser();
    const calls = [
      a.client.rpc('admin_save_apple_token', { p_user: a.userId, p_token: 'x' }),
      a.client.rpc('admin_get_apple_token', { p_user: a.userId }),
      a.client.rpc('admin_delete_apple_token', { p_user: a.userId }),
    ];
    for (const { error } of await Promise.all(calls)) expect(error).not.toBeNull();
  });
```

- [ ] **Step 9: 배포 (Task 0 Step 3·4가 끝난 뒤)** — 저장소 루트(worktree)에서

```sh
supabase db push
supabase functions deploy apple-link --use-api
supabase functions deploy delete-account --use-api
```

Expected: 마이그레이션 1개 적용, 두 함수 배포 완료. `db push` 뒤 `delete-account` 배포 전까지는 옛 함수가 없는 `admin_has_apple_token`을 불러 `step:'apple'` 500으로 멈춘다(안전한 쪽, 개발 서버만).

- [ ] **Step 10: 서버 테스트 실행**

Run: `npm run test:server`
Expected: 기존 서버 테스트 + 새 5개 모두 PASS. `Apple 토큰이 있으면 폐기하고...`가 `apple revoke 400 ... invalid_client`로 실패하면 Task 0 Step 2·4(Key ID·키 내용·Client ID)를 다시 확인한다. `APPLE_... not set`이면 secret이 빠진 것이다.

- [ ] **Step 11: 평소 테스트**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 모두 통과(서버 테스트는 건너뜀).

- [ ] **Step 12: 커밋 (사용자 실기기 확인 뒤)**

```bash
git add supabase/ src/sync/account.ts __tests__/appleSignIn.test.ts __tests__/server/
git commit -m "feat(server): apple-link and Apple token revoke on account deletion"
```

---

### Task 3: 앱 — 의존성, 설정, Apple 로그인 순서

**Files:**
- Modify: `package.json`, `package-lock.json`, `app.json`
- Create: `src/sync/appleSignIn.ts`, `src/sync/expoApple.ts`
- Test: `__tests__/appleSignIn.test.ts` (Task 2에서 만든 파일에 더한다)

**Interfaces:**
- Produces:
  - `type AppleCredential = { identityToken: string | null; authorizationCode: string | null }`
  - `type AppleSignInDeps = { randomNonce(): string; sha256(text: string): Promise<string>; requestApple(hashedNonce: string): Promise<AppleCredential>; signInWithIdToken(idToken: string, rawNonce: string): Promise<{ user: User | null; error: { message: string } | null }> }` (`User`는 `@supabase/supabase-js`)
  - `signInWithApple(deps: AppleSignInDeps): Promise<{ user: User; authorizationCode: string } | 'canceled'>`
  - `appleSignInAvailable(): Promise<boolean>`, `expoAppleDeps(client: SupabaseClient): AppleSignInDeps` (`src/sync/expoApple.ts`)

- [ ] **Step 1: 백업과 설치**

```sh
SP=/private/tmp/claude-501/-Users-eunjukim-Desktop-workspace-chagok-app/apple-login-backup && mkdir -p $SP
cp package.json package-lock.json $SP/
npx expo install expo-apple-authentication expo-crypto
npm ls react-dom --all
```

Expected: `package.json`에 `expo-apple-authentication ~57.0.2`, `expo-crypto ~57.0.3`. `npm ls react-dom --all`의 모든 줄이 `19.2.3`. 아니면 백업으로 되돌리고 멈춰 알린다.

- [ ] **Step 2: `app.json`** — `ios`에 두 줄, `plugins` 배열에 한 줄(`expo install`이 이미 넣었으면 그대로 둔다)

```json
    "ios": {
      "bundleIdentifier": "com.novum.chagok",
      "supportsTablet": false,
      "usesAppleSignIn": true,
      "appleTeamId": "AQUDD2QFNC"
    },
```

```json
      "expo-web-browser",
      "expo-apple-authentication",
```

- [ ] **Step 3: 실패하는 테스트 더하기** — `__tests__/appleSignIn.test.ts` 맨 위 import와 파일 끝에

```ts
import type { User } from '@supabase/supabase-js';
import { signInWithApple, type AppleSignInDeps } from '../src/sync/appleSignIn';

const user = { id: 'u1', app_metadata: { provider: 'apple' } } as unknown as User;

function deps(over: Partial<AppleSignInDeps> = {}) {
  const seen: Record<string, string> = {};
  const d: AppleSignInDeps = {
    randomNonce: () => 'raw-nonce',
    sha256: async (t) => `sha(${t})`,
    requestApple: async (hashed) => { seen.apple = hashed; return { identityToken: 'id-token', authorizationCode: 'code-1' }; },
    signInWithIdToken: async (token, nonce) => { seen.token = token; seen.nonce = nonce; return { user, error: null }; },
    ...over,
  };
  return { d, seen };
}

describe('signInWithApple', () => {
  it('Apple에는 해시한 nonce를, Supabase에는 원래 nonce를 준다', async () => {
    const { d, seen } = deps();
    await expect(signInWithApple(d)).resolves.toEqual({ user, authorizationCode: 'code-1' });
    expect(seen).toEqual({ apple: 'sha(raw-nonce)', token: 'id-token', nonce: 'raw-nonce' });
  });
  it('사용자가 Apple 창을 닫으면 canceled — 오류로 보지 않는다', async () => {
    const { d, seen } = deps({ requestApple: async () => { throw Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }); } });
    await expect(signInWithApple(d)).resolves.toBe('canceled');
    expect(seen.token).toBeUndefined();
  });
  it('그 밖의 Apple 오류는 던진다', async () => {
    const { d } = deps({ requestApple: async () => { throw Object.assign(new Error('failed'), { code: 'ERR_REQUEST_FAILED' }); } });
    await expect(signInWithApple(d)).rejects.toThrow('failed');
  });
  it('토큰이나 코드가 비어 있으면 Supabase에 보내지 않고 던진다', async () => {
    const { d, seen } = deps({ requestApple: async () => ({ identityToken: 'id-token', authorizationCode: null }) });
    await expect(signInWithApple(d)).rejects.toThrow('apple: missing');
    expect(seen.token).toBeUndefined();
  });
  it('Supabase가 거절하면 던진다', async () => {
    const { d } = deps({ signInWithIdToken: async () => ({ user: null, error: { message: 'Nonces mismatch' } }) });
    await expect(signInWithApple(d)).rejects.toThrow('Nonces mismatch');
  });
});
```

Run: `npx jest __tests__/appleSignIn.test.ts` → FAIL (모듈 없음)

- [ ] **Step 4: 구현** — `src/sync/appleSignIn.ts`

```ts
import type { User } from '@supabase/supabase-js';

// Apple 로그인 (계정·백업 설계 ①): Apple 창 → Supabase ID 토큰 로그인.
// nonce는 Apple에 SHA-256 값을, Supabase에 원래 값을 준다. Supabase가 둘을 맞춰 보고 가로챈 토큰의 재사용을 막는다.

export type AppleCredential = { identityToken: string | null; authorizationCode: string | null };

export type AppleSignInDeps = {
  randomNonce(): string;
  sha256(text: string): Promise<string>;
  /** Apple 창. 사용자가 닫으면 code 'ERR_REQUEST_CANCELED'로 던진다. */
  requestApple(hashedNonce: string): Promise<AppleCredential>;
  signInWithIdToken(idToken: string, rawNonce: string): Promise<{ user: User | null; error: { message: string } | null }>;
};

/** 로그인한 사용자와, 서버에 맡길 authorizationCode(apple-link). 사용자가 창을 닫으면 'canceled'. */
export async function signInWithApple(deps: AppleSignInDeps): Promise<{ user: User; authorizationCode: string } | 'canceled'> {
  const rawNonce = deps.randomNonce();
  let credential: AppleCredential;
  try {
    credential = await deps.requestApple(await deps.sha256(rawNonce));
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === 'ERR_REQUEST_CANCELED') return 'canceled';
    throw e;
  }
  if (!credential.identityToken || !credential.authorizationCode) throw new Error('apple: missing identityToken or authorizationCode');
  const { user, error } = await deps.signInWithIdToken(credential.identityToken, rawNonce);
  if (error || !user) throw new Error(error?.message ?? 'no user');
  return { user, authorizationCode: credential.authorizationCode };
}
```

`src/sync/expoApple.ts`:

```ts
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppleSignInDeps } from './appleSignIn';

/** Apple 버튼을 보일지. Android에는 없다 (PRD 4.8). */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

/** 실제 Apple 창과 Supabase로 signInWithApple의 의존성을 채운다. 이름은 요청하지 않는다 (PRD 4.8). */
export function expoAppleDeps(client: SupabaseClient): AppleSignInDeps {
  return {
    randomNonce: () => Crypto.randomUUID(),
    sha256: (text) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text),
    requestApple: (nonce) => AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce }),
    signInWithIdToken: async (token, nonce) => {
      const { data, error } = await client.auth.signInWithIdToken({ provider: 'apple', token, nonce });
      return { user: data.user, error };
    },
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx jest __tests__/appleSignIn.test.ts && npm run typecheck && npm run lint`
Expected: 7개 PASS(Task 2의 2개 포함), 타입·린트 통과.

- [ ] **Step 6: 커밋 (사용자 실기기 확인 뒤)**

```bash
git add package.json package-lock.json app.json src/sync/appleSignIn.ts src/sync/expoApple.ts __tests__/appleSignIn.test.ts
git commit -m "feat(account): Apple sign-in flow and native config"
```

---

### Task 4: 연결 화면에 Apple 버튼 연결

**Files:**
- Modify: `app/account/connect.tsx`

**Interfaces:**
- Consumes: `signInWithApple` (Task 3), `appleSignInAvailable`·`expoAppleDeps` (Task 3), `linkAppleToken` (Task 2)

이 화면은 로직 단위 테스트가 없다(기존과 같음). 로직은 Task 2·3 테스트가 지키고, 이 Task는 타입·린트·번들과 Task 5 실기기로 확인한다.

- [ ] **Step 1: import와 상수**

다음 두 줄을

```ts
import { recordConsent, signOutLocal } from '../../src/sync/account';
import type { SupabaseClient } from '@supabase/supabase-js';
```

이렇게 바꾸고 import 셋을 더한다:

```ts
import { linkAppleToken, recordConsent, signOutLocal } from '../../src/sync/account';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { signInWithApple } from '../../src/sync/appleSignIn';
import { appleSignInAvailable, expoAppleDeps } from '../../src/sync/expoApple';
```

`ABORTED` 정의 아래에:

```ts
/** 사용자가 Apple 창을 닫았다. 알림 없이 동의 화면으로 돌아간다. */
const CANCELED = new Error('canceled');

/** Apple 로그인 버튼 높이. 33·38·44 중 사용자 결정 대기(HANDOFF 7). 정해지면 이 값만 바꾼다. */
const APPLE_BUTTON_HEIGHT = 44;

type Method = 'apple' | 'dev';
```

- [ ] **Step 2: 버튼 표시 여부** — `Connect` 안, `cancelRef` 선언 아래

```ts
  const [appleReady, setAppleReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void appleSignInAvailable().then((ok) => { if (alive) setAppleReady(ok); });
    return () => { alive = false; };
  }, []);
```

- [ ] **Step 3: 방법별 로그인** — `link` 정의 아래

```ts
  /** 고른 방법으로 로그인한다. Apple이면 서버에 맡길 코드도 돌려준다. 사용자가 Apple 창을 닫으면 'canceled'. */
  const signInWith = async (method: Method): Promise<{ user: User; appleCode: string | null } | 'canceled'> => {
    if (method === 'apple') {
      const signedIn = await signInWithApple(expoAppleDeps(supabase));
      return signedIn === 'canceled' ? signedIn : { user: signedIn.user, appleCode: signedIn.authorizationCode };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: DEV_EMAIL!, password: DEV_PASSWORD! });
    if (error || !data.user) throw error ?? new Error('no user');
    return { user: data.user, appleCode: null };
  };
```

- [ ] **Step 4: `connect` 고치기**

시그니처와 첫 줄(`if (!DEV_EMAIL || !DEV_PASSWORD) return;`을 바꾼다. Apple 버튼은 `loading`이 없어 두 번 누르기를 여기서 막는다):

```ts
  const connect = async (method: Method) => {
    if (method === 'dev' && (!DEV_EMAIL || !DEV_PASSWORD)) return;
    if (busy) return;
    setBusy(true);
```

`signingIn.current = true;`부터 `const user = data.user;`까지를 바꾼다(로그인 실패도 `check()` 뒤에 던져, 화면을 떠난 시도가 다이얼로그를 띄우지 않게 지금 순서를 지킨다):

```ts
        signingIn.current = true;
        let signIn: Awaited<ReturnType<typeof signInWith>> | { failed: unknown };
        try {
          signIn = await signInWith(method);
        } catch (e) {
          signIn = { failed: e };
        } finally {
          signingIn.current = false;
        }
        check();
        if (signIn === 'canceled') throw CANCELED;
        if ('failed' in signIn) throw signIn.failed;
        const { user, appleCode } = signIn;
        // 계정 삭제 때 Apple 연결을 폐기할 토큰을 서버에 맡긴다. 못 맡기면 연결하지 않는다 — 폐기할 수 없는 계정을 만들지 않게.
        if (appleCode) {
          await linkAppleToken(supabase, appleCode);
          check();
        }
```

`catch (e)`의 `ABORTED` 처리 블록 바로 아래, `await cancel();` 앞에:

```ts
        if (e === CANCELED) {
          await cancel();
          return;
        }
```

- [ ] **Step 5: 버튼** — `ConsentScreen`의 `loginButtons`를 바꾼다

```tsx
        loginButtons={<>
          {appleReady && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
              style={{ width: '100%', height: APPLE_BUTTON_HEIGHT }}
              onPress={() => void connect('apple')}
            />
          )}
          {__DEV__ && DEV_EMAIL && DEV_PASSWORD
            ? <PixelButton label="개발 계정으로 계속" loading={busy} onPress={() => void connect('dev')} />
            : null}
        </>}
```

- [ ] **Step 6: 주석 고치기** — `ConnectAccount` 위 주석의 「계정 준비 전에는 로그인 자리에 개발 계정 버튼만 둔다 (2026-10-01). 그 자리에 Apple·Google 버튼이 들어간다.」를 「로그인 자리에는 iOS면 Apple 버튼(2026-10-08), 개발 빌드면 개발 계정 버튼을 둔다. Google 버튼은 Google 로그인 때 더한다.」로 바꾼다.

- [ ] **Step 7: 검사와 번들**

```sh
npm run typecheck && npm run lint && npm test
npx expo export --platform ios --output-dir /tmp/check-ios && rm -rf /tmp/check-ios
npx expo export --platform android --output-dir /tmp/check-android && rm -rf /tmp/check-android
```

Expected: 모두 통과, 두 번들 모두 오류 없음.

- [ ] **Step 8: 커밋 (사용자 실기기 확인 뒤)**

```bash
git add app/account/connect.tsx
git commit -m "feat(account): Apple button on the connect screen"
```

---

### Task 5: 실기기 확인과 문서

**Files:**
- Modify: `docs/DEV-SETUP.md`, `docs/HANDOFF.md`, `docs/superpowers/specs/2026-09-30-account-backup-design.md`

- [ ] **Step 1: 개발 빌드 다시 만들기** (새 네이티브 모듈·권한이 들어갔다). 빌드는 에이전트가 하고, 앱 조작은 사용자가 한다.

```sh
npx expo run:ios --device   # iPhone 15 Pro 연결, Task 0 Step 5 필요
```

빌드가 서명 오류(`requires a development team`, `Sign in with Apple capability`)로 멈추면 Task 0 Step 1·5를 다시 확인한다.

- [ ] **Step 2: 사용자 확인 목록** (각 줄의 결과를 받는다)
  1. 앱 설정 → 계정 연결하기 → 두 체크 → **Apple로 계속하기**(흰색 테두리 버튼) → Face ID → 앱 설정에 「Apple 계정으로 연결했어요」. 대시보드 Authentication → Users에 공급자 apple 사용자, SQL Editor `select user_id from private.apple_tokens;`에 그 사용자.
  2. 다시 연결 화면에서 Apple 창을 띄웠다가 닫기 → 알림 없이 동의 화면, 다시 누를 수 있다.
  3. 로그아웃 → 같은 Apple 계정으로 다시 연결 → 기록 복원 또는 이어 보내기가 평소대로.
  4. 계정 삭제 → 완료 → 시작 화면. 대시보드에서 사용자·토큰 행 없음. iPhone 설정 → [이름] → 로그인 및 보안 → Apple로 로그인 목록에서 「차곡차곡」이 사라짐(폐기 확인).
  5. 삭제 뒤 같은 Apple ID로 다시 연결 → 새 계정으로 연결(Apple이 이메일 공유를 다시 묻는다).
  6. 「나의 이메일 가리기」를 골라도 연결된다.
  7. Android 에뮬레이터(`npx expo run:android`) → 연결 화면에 Apple 버튼이 없고 앱이 죽지 않는다(개발 계정 버튼만).
  8. 버튼 높이 44가 화면에서 어떤지 보고 33·38·44 중 정한다(정하면 `APPLE_BUTTON_HEIGHT`만 바꾼다).

- [ ] **Step 3: `docs/DEV-SETUP.md`** — 「개발 서버」 절의 **명령** 블록에 `supabase functions deploy apple-link --use-api`를 더하고, 그 절 끝에 소절을 더한다:

```markdown
**Apple 로그인 (2026-10-08~)** — 개발 빌드에서만 된다(Expo Go는 번들 ID가 달라 Supabase가 거절한다).

- Supabase Authentication → Providers → Apple: Client IDs `com.novum.chagok`. Secret Key는 비운다(네이티브 전용).
- 함수 secret 네 개: `APPLE_TEAM_ID`(AQUDD2QFNC), `APPLE_KEY_ID`, `APPLE_CLIENT_ID`(com.novum.chagok), `APPLE_PRIVATE_KEY`(`.secrets/AuthKey_<KeyID>.p8` 내용). `supabase secrets list`로 확인.
- `.p8`은 Apple에서 한 번만 내려받을 수 있다. 잃어버리면 새 키를 만들고 두 secret을 바꾼다.
- 빌드에는 Xcode Accounts에 팀 AQUDD2QFNC 계정이 있어야 한다.
```

- [ ] **Step 4: `docs/HANDOFF.md`** — 5 「Apple 계정으로 이제 할 수 있는 것」의 첫 줄을 「~~Apple 로그인, `apple-link`, Apple 토큰 폐기~~ 2026-10-08 구현(`feat/apple-login`, 계획 `docs/superpowers/plans/2026-10-08-apple-login.md`). 운영 서버를 만들 때 Supabase Apple 공급자·함수 secret을 다시 넣는다.」로 바꾼다. 7의 「로그인 버튼 높이」 줄은 Step 2-8에서 정했으면 지우고 결정 값을 5에 적는다.

- [ ] **Step 5: 설계 문서** — `2026-09-30-account-backup-design.md` ③ `delete-account` 항목의 「Apple 토큰 폐기 단계는 `apple-link`와 함께 구현한다. 그전에는 토큰이 있으면 삭제를 멈춘다(2026-09-30).」 뒤에 「— 2026-10-08 구현. 이미 무효인 토큰(`invalid_grant`)은 폐기된 것으로 본다. `apple-link`는 Apple이 돌려준 `sub`가 로그인한 Apple 신원과 같을 때만 저장한다.」를 더한다.

- [ ] **Step 6: 커밋 (사용자 확인 뒤)**

```bash
git add docs/
git commit -m "docs: Apple sign-in setup and status"
```

---

## 범위 밖

- Google 로그인(Android) — Google Cloud OAuth 준비 뒤 별도 계획.
- Apple 서버 간 알림(사용자가 설정에서 연결을 끊었을 때 서버가 알기) — Supabase Auth가 지원하지 않는다. 끊긴 뒤에는 세션 갱신이 실패하면 기존 「로그인 풀림」 안내가 나온다.
- 앱이 켜질 때 `getCredentialStateAsync`로 Apple 연결 상태 확인 — 설계에 없다. 필요하면 따로 정한다.
- 운영 서버 설정 — 운영 서버가 정해진 뒤 같은 마이그레이션·함수·secret을 올린다.
- TestFlight·EAS 클라우드 빌드.
