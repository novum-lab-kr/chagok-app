import { generateKeyPairSync, sign } from 'node:crypto';
import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { deleteAccountOnServer } from '../../src/sync/account';
import { goal } from '../support/syncServerContract';
import { adminClient, anonClient, describeIfServer, newUser } from './support';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

describeIfServer('delete-account', () => {
  it('사진·행·인증 계정을 모두 지운다', async () => {
    const a = await newUser();
    await new SupabaseSyncServer({ rpc: (fn, args) => a.client.rpc(fn, args) })
      .push('d1', [{ entity: 'goal', op: 'upsert', row: goal('g1') }]);
    await a.client.storage.from('record-photos').upload(`${a.userId}/r1.jpg`, jpeg, { contentType: 'image/jpeg' });

    await deleteAccountOnServer(a.client);

    const admin = adminClient();
    expect((await admin.from('goals').select('id').eq('user_id', a.userId)).data).toEqual([]);
    expect((await admin.storage.from('record-photos').list(a.userId)).data).toEqual([]);
    expect((await admin.auth.admin.getUserById(a.userId)).data.user).toBeNull();
  });

  it('두 번 불러도 성공한다 (중간 실패 뒤 다시 누름)', async () => {
    const a = await newUser();
    await deleteAccountOnServer(a.client);
    await expect(deleteAccountOnServer(a.client)).resolves.toBeUndefined();
  });

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

  it('로그인 없이는 부를 수 없다', async () => {
    await expect(deleteAccountOnServer(anonClient())).rejects.toThrow();
  });

  // 함수가 직접 서명을 검증한다(게이트웨이 설정에 기대지 않는다). 남의 id를 넣은 가짜 토큰은 모두 거부돼야 한다.
  it('서명이 틀린 토큰으로는 남의 계정을 지울 수 없다', async () => {
    const victim = await newUser();
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const claims = { sub: victim.userId, role: 'authenticated', aud: 'authenticated', iss: `${process.env.SUPABASE_TEST_URL}/auth/v1`, exp };
    // 진짜 토큰과 같은 머리(알고리즘·키 id)에, 공격자가 만든 다른 키로 서명한다.
    const real = (await victim.client.auth.getSession()).data.session!.access_token;
    const header = real.split('.')[0];
    const signingInput = `${header}.${b64(claims)}`;
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const otherKey = sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    const tokens = [
      `${signingInput}.${otherKey}`,
      `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.${Buffer.from('forged').toString('base64url')}`,
      `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`,
    ];
    for (const token of tokens) {
      const res = await fetch(`${process.env.SUPABASE_TEST_URL}/functions/v1/delete-account`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_TEST_ANON_KEY! },
      });
      expect(res.status).toBe(401);
    }
    expect((await adminClient().auth.admin.getUserById(victim.userId)).data.user?.id).toBe(victim.userId);
  });
});
