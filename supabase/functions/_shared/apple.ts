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
