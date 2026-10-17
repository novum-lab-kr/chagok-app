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
