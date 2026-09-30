import type { SupabaseClient } from '@supabase/supabase-js';
import { SyncRejected } from '../../src/sync/contract';
import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { goal, liveIds, record, snapshot, sticker } from '../support/syncServerContract';
import { anonClient, describeIfServer, newUser } from './support';

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
});
