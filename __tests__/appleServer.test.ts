import { generateKeyPairSync, verify } from 'node:crypto';
import { appleConfigFrom, clientSecret, exchangeCode, revokeToken, type Fetch } from '../supabase/functions/_shared/apple';

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const config = { teamId: 'TEAM123456', keyId: 'KEY1234567', clientId: 'com.novumlab.chagok', privateKey };

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
    expect(part(jwt, 1)).toEqual({ iss: 'TEAM123456', iat: 1_700_000_000, exp: 1_700_000_300, aud: 'https://appleid.apple.com', sub: 'com.novumlab.chagok' });
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
    expect(calls[0].form.get('client_id')).toBe('com.novumlab.chagok');
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
