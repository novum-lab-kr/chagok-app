import { signOutLocal } from '../src/sync/account';

const calls: string[] = [];
const client = (error: { message: string } | null) => ({
  auth: { signOut: (options: { scope: 'local' }) => { calls.push(`signOut:${options.scope}`); return Promise.resolve({ error }); } },
});
const clear = () => { calls.push('clear'); };

describe('signOutLocal', () => {
  beforeEach(() => { calls.length = 0; });
  it('이 기기 세션만 지우고 저장된 세션도 지운다', async () => {
    await signOutLocal(client(null), clear);
    expect(calls).toEqual(['signOut:local', 'clear']);
  });
  it('로그아웃이 실패를 돌려받아도 저장된 세션을 지운다 — 오프라인 만료 토큰·지운 계정에서 세션이 남지 않게', async () => {
    await signOutLocal(client({ message: 'fetch failed' }), clear);
    expect(calls).toEqual(['signOut:local', 'clear']);
  });
  it('로그아웃이 던져도 저장된 세션을 지운다', async () => {
    const throwing = { auth: { signOut: () => Promise.reject(new Error('boom')) } };
    await signOutLocal(throwing, clear);
    expect(calls).toEqual(['clear']);
  });
});
