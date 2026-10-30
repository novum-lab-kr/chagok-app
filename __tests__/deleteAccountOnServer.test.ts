import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { deleteAccountOnServer, NeedsLoginError } from '../src/sync/account';

type SessionResult = { data: { session: { access_token: string } | null }; error: Error | null };

const client = (session: SessionResult) => {
  const invoked: string[] = [];
  return {
    invoked,
    auth: { getSession: () => Promise.resolve(session) },
    functions: { invoke: (name: string) => { invoked.push(name); return Promise.resolve({ error: null }); } },
  };
};

describe('deleteAccountOnServer', () => {
  it('세션이 있으면 삭제 함수를 부른다', async () => {
    const c = client({ data: { session: { access_token: 'user-token' } }, error: null });
    await deleteAccountOnServer(c);
    expect(c.invoked).toEqual(['delete-account']);
  });

  it('세션이 없으면 보내지 않고 로그인이 필요하다고 던진다 — 보내면 anon 키로 가서 401 (2026-10-29 TestFlight 6)', async () => {
    const c = client({ data: { session: null }, error: null });
    await expect(deleteAccountOnServer(c)).rejects.toBeInstanceOf(NeedsLoginError);
    expect(c.invoked).toEqual([]);
  });

  it('서버에 없는 refresh token 으로 갱신이 실패해 세션이 지워졌으면 로그인이 필요하다', async () => {
    const c = client({ data: { session: null }, error: new AuthApiError('Invalid Refresh Token: Refresh Token Not Found', 400, 'refresh_token_not_found') });
    await expect(deleteAccountOnServer(c)).rejects.toBeInstanceOf(NeedsLoginError);
    expect(c.invoked).toEqual([]);
  });

  it('오프라인이라 세션을 확인하지 못했으면 연결 실패로 던진다 — 로그인을 다시 하라고 하지 않는다', async () => {
    const c = client({ data: { session: null }, error: new AuthRetryableFetchError('fetch failed', 0) });
    const failure = deleteAccountOnServer(c);
    await expect(failure).rejects.toThrow('fetch failed');
    await expect(failure).rejects.not.toBeInstanceOf(NeedsLoginError);
    expect(c.invoked).toEqual([]);
  });

  it('함수가 실패하면 던진다', async () => {
    const c = { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 't' } }, error: null }) }, functions: { invoke: () => Promise.resolve({ error: { message: 'boom' } }) } };
    await expect(deleteAccountOnServer(c)).rejects.toThrow('boom');
  });
});
