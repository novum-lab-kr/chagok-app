import type { User } from '@supabase/supabase-js';
import { linkAppleToken } from '../src/sync/account';
import { signInWithApple, type AppleSignInDeps } from '../src/sync/signIn/apple';

const user = { id: 'u1', app_metadata: { provider: 'apple' } } as unknown as User;

function deps(over: Partial<AppleSignInDeps> = {}) {
  const seen: Record<string, string> = {};
  const d: AppleSignInDeps = {
    makeNonce: async () => ({ raw: 'raw-nonce', hashed: 'sha(raw-nonce)' }),
    requestApple: async (hashed) => { seen.apple = hashed; return { identityToken: 'id-token', authorizationCode: 'code-1' }; },
    signInWithIdToken: async (token, nonce) => { seen.token = token; seen.nonce = nonce; return { user, error: null }; },
    linkToken: async (code) => { seen.linked = code; },
    ...over,
  };
  return { d, seen };
}

describe('signInWithApple', () => {
  it('Apple에는 해시한 nonce를, Supabase에는 원래 nonce를 주고, 코드를 서버에 맡긴다', async () => {
    const { d, seen } = deps();
    await expect(signInWithApple(d)).resolves.toEqual({ user });
    expect(seen).toEqual({ apple: 'sha(raw-nonce)', token: 'id-token', nonce: 'raw-nonce', linked: 'code-1' });
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
  it('Supabase가 거절하면 던지고 코드를 맡기지 않는다', async () => {
    const { d, seen } = deps({ signInWithIdToken: async () => ({ user: null, error: { message: 'Nonces mismatch' } }) });
    await expect(signInWithApple(d)).rejects.toThrow('Nonces mismatch');
    expect(seen.linked).toBeUndefined();
  });
  it('코드를 맡기지 못하면 던진다 — 폐기할 수 없는 계정으로 연결하지 않는다', async () => {
    const { d } = deps({ linkToken: async () => { throw new Error('exchange failed'); } });
    await expect(signInWithApple(d)).rejects.toThrow('exchange failed');
  });
});

describe('linkAppleToken', () => {
  it('apple-link에 코드를 보낸다', async () => {
    const calls: unknown[] = [];
    const client = { functions: { invoke: async (name: string, options: { body: Record<string, string> }) => { calls.push([name, options.body]); return { error: null }; } } };
    await linkAppleToken(client, 'code-1');
    expect(calls).toEqual([['apple-link', { code: 'code-1' }]]);
  });
  it('서버가 거절하면 던진다', async () => {
    const client = { functions: { invoke: async () => ({ error: { message: 'exchange failed' } }) } };
    await expect(linkAppleToken(client, 'old')).rejects.toThrow('exchange failed');
  });
});
