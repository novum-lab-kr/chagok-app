import type { SupabaseClient } from '@supabase/supabase-js';
import { SyncRejected } from '../../src/sync/contract';
import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { goal, liveIds, record, snapshot, sticker } from '../support/syncServerContract';
import { adminClient, anonClient, describeIfServer, newUser } from './support';

const serverOf = (client: SupabaseClient) => new SupabaseSyncServer({ rpc: (fn, args) => client.rpc(fn, args) });

describeIfServer('서버 보안·경계', () => {
  it('다른 사용자의 행은 받을 수 없다', async () => {
    const a = await newUser(); const b = await newUser();
    await serverOf(a.client).push('d1', [{ entity: 'goal', op: 'upsert', row: goal('g1') }]);
    expect(liveIds(await snapshot(serverOf(b.client)), 'goal')).toEqual([]);
    expect((await b.client.from('goals').select('id')).data).toEqual([]);
  });

  it('같은 id를 다른 사용자가 보내도 서로 영향 없다', async () => {
    const a = await newUser(); const b = await newUser();
    await serverOf(a.client).push('d1', [{ entity: 'goal', op: 'upsert', row: goal('same', 1, 'A 것') }]);
    await serverOf(b.client).push('d2', [{ entity: 'goal', op: 'upsert', row: goal('same', 99, 'B 것') }]);
    await serverOf(b.client).push('d2', [{ entity: 'goal', op: 'delete', id: 'same', deletedAt: 100 }]);
    expect((await snapshot(serverOf(a.client))).get('goal:same')).toEqual({ deletedAt: null, row: goal('same', 1, 'A 것') });
  });

  it('부모 목표가 서버에 없는 스티커는 거부된다 (SyncRejected, 보류 대상)', async () => {
    const a = await newUser();
    await expect(serverOf(a.client).push('d1', [{ entity: 'sticker', op: 'upsert', row: sticker('s1', '없는-목표') }]))
      .rejects.toBeInstanceOf(SyncRejected);
    expect(liveIds(await snapshot(serverOf(a.client)), 'sticker')).toEqual([]);
  });

  it('형식이 틀린 행은 거부되고 묶음 전체가 반영되지 않는다', async () => {
    const a = await newUser();
    const bad = { ...record('r1', 's1'), created_at: '어제' } as unknown as ReturnType<typeof record>;
    await expect(serverOf(a.client).push('d1', [
      { entity: 'goal', op: 'upsert', row: goal('g1') },
      { entity: 'record', op: 'upsert', row: bad },
    ])).rejects.toBeInstanceOf(SyncRejected);
    expect(liveIds(await snapshot(serverOf(a.client)), 'goal')).toEqual([]);
  });

  it('로그인 없이 부르면 거부(보류)가 아닌 일반 오류다', async () => {
    const err = await serverOf(anonClient()).state().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(SyncRejected);
  });

  it('record_consent는 자기 동의 이력만 남긴다', async () => {
    const a = await newUser();
    expect((await a.client.rpc('record_consent', { p_terms_version: 1, p_privacy_version: 1 })).error).toBeNull();
    const { data } = await a.client.from('accounts').select('user_id, terms_version, privacy_version');
    expect(data).toEqual([{ user_id: a.userId, terms_version: 1, privacy_version: 1 }]);
  });

  it('로그인 사용자는 Apple 토큰 관리자 함수를 부를 수 없다', async () => {
    const a = await newUser();
    const calls = [
      a.client.rpc('admin_save_apple_token', { p_user: a.userId, p_token: 'x' }),
      a.client.rpc('admin_get_apple_token', { p_user: a.userId }),
      a.client.rpc('admin_delete_apple_token', { p_user: a.userId }),
    ];
    for (const { error } of await Promise.all(calls)) expect(error).not.toBeNull();
  });

  it('로그인 없이도, 로그인 사용자도 회원번호로 사용자를 찾을 수 없다', async () => {
    const a = await newUser();
    const args = { p_provider: 'email', p_provider_id: a.userId };
    const calls = [anonClient().rpc('admin_find_user_by_identity', args), a.client.rpc('admin_find_user_by_identity', args)];
    for (const { error } of await Promise.all(calls)) expect(error).not.toBeNull();
    // 서버 함수(service_role)는 찾는다. 이메일 identity의 provider_id는 사용자 id다.
    expect(await adminClient().rpc('admin_find_user_by_identity', args)).toMatchObject({ data: a.userId, error: null });
  });

  it('카카오 삭제 실패 기록은 서버 함수만 남기고 지운다', async () => {
    const a = await newUser();
    const record = { p_kakao_id: '999000111', p_referrer: 'UNLINK_FROM_APPS', p_step: 'photos' };
    const clear = { p_kakao_id: '999000111' };
    const calls = [
      anonClient().rpc('admin_record_kakao_unlink_failure', record), a.client.rpc('admin_record_kakao_unlink_failure', record),
      anonClient().rpc('admin_clear_kakao_unlink_failure', clear), a.client.rpc('admin_clear_kakao_unlink_failure', clear),
    ];
    for (const { error } of await Promise.all(calls)) expect(error).not.toBeNull();
    // 같은 회원번호로 두 번 실패해도 한 줄, 지우기는 여러 번 불러도 된다
    expect((await adminClient().rpc('admin_record_kakao_unlink_failure', record)).error).toBeNull();
    expect((await adminClient().rpc('admin_record_kakao_unlink_failure', { ...record, p_step: 'rows' })).error).toBeNull();
    expect((await adminClient().rpc('admin_clear_kakao_unlink_failure', clear)).error).toBeNull();
    expect((await adminClient().rpc('admin_clear_kakao_unlink_failure', clear)).error).toBeNull();
  });

  it('파기 기록과 감사 기록 정리는 서버 함수만 부른다', async () => {
    const a = await newUser();
    const record = { p_user: a.userId, p_requested_at: new Date().toISOString(), p_route: 'app', p_result: 'failed' };
    const scrub = { p_user: a.userId };
    const calls = [
      anonClient().rpc('admin_record_account_deletion', record), a.client.rpc('admin_record_account_deletion', record),
      anonClient().rpc('admin_scrub_user_audit_log', scrub), a.client.rpc('admin_scrub_user_audit_log', scrub),
    ];
    for (const { error } of await Promise.all(calls)) expect(error).not.toBeNull();
    // 정해진 경로와 결과만 받는다
    expect((await adminClient().rpc('admin_record_account_deletion', { ...record, p_route: 'web' })).error).not.toBeNull();
    expect((await adminClient().rpc('admin_scrub_user_audit_log', scrub)).error).toBeNull();
  });
});
