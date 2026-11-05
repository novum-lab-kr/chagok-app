import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteAccountOnServer } from '../../src/sync/account';
import { goal, V1Server } from './v1';
import { adminClient, anonClient, describeIfServer, newUser } from './support';

// 서버 2판: 목표는 하나, 사람은 멤버로 (docs/superpowers/specs/2026-11-04-server-v2-plan.md, PRD 4.15).
// 2판 RPC의 실패는 메시지가 이유 낱말이다(not_member, not_owner, sticker_taken, name_not_allowed 등).
// join_goal만 실패를 값 {error}로 돌려준다(closed, full, rate_limited, sticker_taken, name_not_allowed, invalid_name, invalid_sticker).
// 다른 사람의 멤버 행과 칸은 표로 직접 읽지 못하고 sync_pull, pull_goal로만 받는다.

type User = { client: SupabaseClient; userId: string };

async function call<T = unknown>(client: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
/** 실패하면 이유 낱말, 성공하면 'ok' */
const outcome = (p: Promise<unknown>) => p.then(() => 'ok', (e: Error) => e.message);

async function createGoal(owner: User, mode: 'each' | 'one', sticker = 'basic.clover', name = '은주') {
  return call<{ goal_id: string; invite_code: string }>(owner.client, 'create_shared_goal', {
    p_mode: mode, p_name: '같이 걷기', p_board_type: 'tally', p_total_slots: 10, p_end_date: null,
    p_display_name: name, p_sticker_id: sticker,
  });
}
async function join(u: User, code: string, name: string, sticker: string): Promise<{ goal_id: string }> {
  const data = await call<{ goal_id?: string; error?: string }>(u.client, 'join_goal', { p_code: code, p_display_name: name, p_sticker_id: sticker });
  if (data.error) throw new Error(data.error);
  return { goal_id: data.goal_id! };
}

const stickerRow = (goalId: string, slot: number, id: string = randomUUID()) => ({
  id, goal_id: goalId, slot_index: slot, date_key: '2026-11-04', tz_offset_min: 540, sticker_type: 'basic.clover',
  placed_at: 1, updated_at: 1,
});
const place = (u: User, goalId: string, slot: number, id?: string) =>
  call<{ rejected: { entity: string; id: string; reason: string }[] }>(u.client, 'sync_push', {
    p_device_id: 'd', p_changes: [{ entity: 'sticker', op: 'upsert', row: stickerRow(goalId, slot, id) }],
  });

type Member = { user_id: string; display_name: string | null; role: string };
type GoalState = { members: Member[]; stickers: { id: string; goal_id: string; placed_by: string | null; sticker_type: string | null }[]; records: unknown[] };
const pullGoal = (u: User, goalId: string) => call<GoalState>(u.client, 'pull_goal', { p_goal_id: goalId });
const visibleMemberIds = async (u: User, goalId: string) => (await pullGoal(u, goalId)).members.map((m) => m.user_id).sort();
type Pulled = { rows: { entity: string; row: Record<string, unknown>; deletedAt: number | null }[]; cursor: number };
const syncPull = (u: User, since = 0) => call<Pulled>(u.client, 'sync_pull', { p_since: since, p_limit: 1000 });
/** 표 직접 읽기는 거부되거나 아무것도 돌려주지 않아야 한다 */
const deniedOrEmpty = (res: { data: unknown[] | null; error: unknown }) => res.error !== null || (res.data ?? []).length === 0;

describeIfServer('함께 목표 (서버 2판)', () => {
  it('멤버가 아니면 목표, 멤버, 칸, 지금 상태를 읽을 수 없다', async () => {
    const a = await newUser(); const c = await newUser();
    const { goal_id } = await createGoal(a, 'one');
    await place(a, goal_id, 0);
    expect((await c.client.from('goals').select('id').eq('id', goal_id)).data).toEqual([]);
    expect(await outcome(call(c.client, 'pull_goal', { p_goal_id: goal_id }))).toBe('not_member');
    expect((await pullGoal(a, goal_id)).stickers).toHaveLength(1);
  });

  it('같은 목표의 멤버도 다른 사람의 멤버 행과 칸을 표로 직접 읽지 못한다', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    await place(a, goal_id, 0);
    expect(deniedOrEmpty(await b.client.from('goal_members').select('*'))).toBe(true);
    expect(deniedOrEmpty(await b.client.from('stickers').select('*'))).toBe(true);
    expect(deniedOrEmpty(await b.client.from('goal_members').select('*').eq('user_id', a.userId))).toBe(true);
    expect(deniedOrEmpty(await b.client.from('stickers').select('*').eq('goal_id', goal_id))).toBe(true);
    // 같은 내용은 RPC로 받는다
    expect((await pullGoal(b, goal_id)).stickers).toHaveLength(1);
  });

  it('초대 미리보기는 로그인 없이 최소한만 보이고, 없는 코드는 closed', async () => {
    const a = await newUser();
    const { invite_code } = await createGoal(a, 'each');
    expect(await call(anonClient(), 'preview_invite', { p_code: invite_code.toLowerCase() })).toEqual({
      status: 'open',
      goal: { name: '같이 걷기', mode: 'each', board_type: 'tally', total_slots: 10, end_date: null },
      owner_name: '은주', member_count: 1, max_members: 6, taken_stickers: ['basic.clover'],
    });
    expect(await call(anonClient(), 'preview_invite', { p_code: 'ZZZZZZZZ' })).toEqual({ status: 'closed' });
    expect(await outcome(join({ client: anonClient(), userId: '' }, invite_code, '지우', 'basic.star'))).not.toBe('ok');
  });

  it('같은 목표에서 쓰는 스티커는 고를 수 없다 (sticker_taken)', async () => {
    const a = await newUser(); const b = await newUser();
    const { invite_code } = await createGoal(a, 'each', 'basic.clover');
    expect(await outcome(join(b, invite_code, '지우', 'basic.clover'))).toBe('sticker_taken');
    expect(await outcome(join(b, invite_code, '지우', 'basic.star'))).toBe('ok');
  });

  it('이름은 앞뒤 공백을 빼고 1~10자, 금칙어는 대소문자와 공백, 문장부호를 무시하고 거른다', async () => {
    const a = await newUser(); const b = await newUser();
    const { invite_code } = await createGoal(a, 'each');
    const n = Date.now() % 1000;
    const word = `금지${n}`;
    const admin = adminClient();
    expect((await admin.from('banned_words').insert({ word })).error).toBeNull();
    try {
      expect(await outcome(join(b, invite_code, '   ', 'basic.star'))).toBe('invalid_name');
      expect(await outcome(join(b, invite_code, '가나다라마바사아자차카', 'basic.star'))).toBe('invalid_name');
      expect(await outcome(join(b, invite_code, `금 지-${n}!`, 'basic.star'))).toBe('name_not_allowed');
      const { goal_id } = await join(b, invite_code, ' 지우 ', 'basic.star');
      expect((await pullGoal(b, goal_id)).members.find((m) => m.user_id === b.userId)?.display_name).toBe('지우');
    } finally {
      await admin.from('banned_words').delete().eq('word', word);
    }
  });

  it('6명이 차면 일곱째는 full', async () => {
    const owner = await newUser();
    const ids = ['basic.clover', 'basic.water', 'basic.book', 'basic.flower', 'basic.star', 'basic.cat', 'basic.moon'];
    const { invite_code } = await createGoal(owner, 'each', ids[0]);
    for (let i = 1; i <= 5; i++) await join(await newUser(), invite_code, `친구${i}`, ids[i]);
    expect(await outcome(join(await newUser(), invite_code, '일곱째', ids[6]))).toBe('full');
    expect(await call(anonClient(), 'preview_invite', { p_code: invite_code })).toEqual({ status: 'full' });
  });

  it('한 판에서 같은 칸에 두 번째로 붙이면 그 행만 slot_taken', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    expect((await place(a, goal_id, 0)).rejected).toEqual([]);
    const taken = randomUUID();
    const result = await call<{ rejected: unknown[] }>(b.client, 'sync_push', {
      p_device_id: 'd', p_changes: [
        { entity: 'sticker', op: 'upsert', row: stickerRow(goal_id, 0, taken) },
        { entity: 'sticker', op: 'upsert', row: stickerRow(goal_id, 1) },
      ],
    });
    expect(result.rejected).toEqual([{ entity: 'sticker', id: taken, reason: 'slot_taken' }]);
    expect((await pullGoal(a, goal_id)).stickers).toHaveLength(2);
  });

  it('각자 판은 사람마다 같은 칸 번호에 붙일 수 있다', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'each');
    await join(b, invite_code, '지우', 'basic.star');
    expect((await place(a, goal_id, 0)).rejected).toEqual([]);
    expect((await place(b, goal_id, 0)).rejected).toEqual([]);
  });

  it('차단하면 양쪽 모두 서로의 멤버 행이 가려지고, 한 판의 칸은 이름 없는 칸이 된다', async () => {
    const a = await newUser(); const b = await newUser(); const c = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    await join(c, invite_code, '세나', 'basic.sun');
    const bSticker = randomUUID();
    await place(b, goal_id, 3, bSticker);
    await call(b.client, 'block_user', { p_user_id: c.userId }); // 만든 사람이 아닌 B가 C를 차단: 내보내기 없음
    expect(await visibleMemberIds(b, goal_id)).toEqual([a.userId, b.userId].sort());
    expect(await visibleMemberIds(c, goal_id)).toEqual([a.userId, c.userId].sort());
    expect(await visibleMemberIds(a, goal_id)).toEqual([a.userId, b.userId, c.userId].sort());
    const seen = (await pullGoal(c, goal_id)).stickers.find((s) => s.id === bSticker);
    expect(seen).toMatchObject({ placed_by: null, sticker_type: null });
    expect(await call(b.client, 'my_blocks')).toEqual([expect.objectContaining({ user_id: c.userId, display_name: '세나' })]);
    expect(await call(c.client, 'my_blocks')).toEqual([]); // 차단당한 쪽에는 알리지 않는다
    // 차단당한 사람이 미리보기를 열어도 다른 사람과 같다
    expect((await call<{ status: string }>(c.client, 'preview_invite', { p_code: invite_code })).status).toBe('open');
    await call(b.client, 'unblock_user', { p_user_id: c.userId });
    expect(await visibleMemberIds(b, goal_id)).toEqual([a.userId, b.userId, c.userId].sort());
  });

  it('차단당한 쪽에는 상대가 나간 것과 같은 모양으로 보이고, 자기 멤버 행은 바뀌지 않는다', async () => {
    const a = await newUser(); const b = await newUser(); const c = await newUser(); const d = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'each');
    await join(b, invite_code, '지우', 'basic.star');
    await join(c, invite_code, '세나', 'basic.sun');
    await join(d, invite_code, '디디', 'basic.moon');
    const since = (await syncPull(c)).cursor;
    await call(b.client, 'block_user', { p_user_id: c.userId }); // B가 C를 차단
    await call(d.client, 'leave_goal', { p_goal_id: goal_id }); // D는 그냥 나감
    const rows = (await syncPull(c, since)).rows;
    const memberRow = (userId: string) => rows.find((r) => r.entity === 'member' && r.row.user_id === userId)?.row;
    expect(memberRow(b.userId)).toEqual({ goal_id, user_id: b.userId, gone: true });
    expect(memberRow(d.userId)).toEqual({ goal_id, user_id: d.userId, gone: true });
    expect(memberRow(c.userId)).toBeUndefined();
    expect(rows.some((r) => r.entity === 'goal' && r.row.id === goal_id)).toBe(true); // 목표 행이 오면 pull_goal
  });

  it('만든 사람이 차단하면 내보내지고, 나간 행에는 이름과 스티커가 남지 않으며, 차단 때문에 같은 목표에 다시 들어올 수 없다', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    const bSticker = randomUUID();
    await place(b, goal_id, 2, bSticker);
    await call(a.client, 'block_user', { p_user_id: b.userId });
    const mine = (await syncPull(b)).rows.find((r) => r.entity === 'member' && r.row.goal_id === goal_id)?.row;
    expect(mine).toMatchObject({ left_reason: 'kicked', display_name: null, sticker_id: null, joined_at: null });
    expect(mine?.left_at).not.toBeNull();
    expect((await b.client.from('goals').select('id').eq('id', goal_id)).data).toEqual([]);
    expect((await adminClient().from('stickers').select('id').eq('id', bSticker)).data).toEqual([]); // 한 판 칸은 행째 지운다
    expect(await outcome(join(b, invite_code, '지우', 'basic.star'))).toBe('closed');
    expect((await place(b, goal_id, 3)).rejected).toEqual([expect.objectContaining({ reason: 'not_allowed' })]);
    expect(await call(a.client, 'my_blocks')).toEqual([expect.objectContaining({ user_id: b.userId, display_name: '지우' })]);
  });

  it('만든 사람과 차단 관계면 그 사람의 목표에 들어갈 수 없다 (closed, 차단을 드러내지 않음)', async () => {
    const a = await newUser(); const b = await newUser();
    const first = await createGoal(a, 'each');
    await join(b, first.invite_code, '지우', 'basic.star');
    await call(b.client, 'block_user', { p_user_id: a.userId });
    const second = await createGoal(a, 'each');
    expect(await outcome(join(b, second.invite_code, '지우', 'basic.star'))).toBe('closed');
  });

  it('바꾼 초대 코드의 옛 코드로는 들어올 수 없다', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'each');
    const { invite_code: fresh } = await call<{ invite_code: string }>(a.client, 'rotate_invite', { p_goal_id: goal_id });
    expect(fresh).not.toBe(invite_code);
    expect(await call(anonClient(), 'preview_invite', { p_code: invite_code })).toEqual({ status: 'closed' });
    expect(await outcome(join(b, invite_code, '지우', 'basic.star'))).toBe('closed');
    expect(await outcome(join(b, fresh, '지우', 'basic.star'))).toBe('ok');
  });

  it('이름, 칸 수, 초대, 내보내기는 만든 사람만', async () => {
    const a = await newUser(); const b = await newUser(); const c = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'each');
    await join(b, invite_code, '지우', 'basic.star');
    await join(c, invite_code, '세나', 'basic.sun');
    expect(await outcome(call(b.client, 'update_goal', { p_goal_id: goal_id, p_name: '새 이름', p_total_slots: 12, p_end_date: null }))).toBe('not_owner');
    expect(await outcome(call(b.client, 'rotate_invite', { p_goal_id: goal_id }))).toBe('not_owner');
    expect(await outcome(call(b.client, 'kick_member', { p_goal_id: goal_id, p_user_id: c.userId }))).toBe('not_owner');
    expect(await outcome(call(a.client, 'update_goal', { p_goal_id: goal_id, p_name: '새 이름', p_total_slots: 12, p_end_date: null }))).toBe('ok');
    expect(await outcome(call(a.client, 'kick_member', { p_goal_id: goal_id, p_user_id: c.userId }))).toBe('ok');
    // 내 이름과 스티커는 각자 고친다
    expect(await outcome(call(b.client, 'update_member', { p_goal_id: goal_id, p_display_name: '지우', p_sticker_id: 'basic.clover' }))).toBe('sticker_taken');
    expect(await outcome(call(b.client, 'update_member', { p_goal_id: goal_id, p_display_name: '지우2', p_sticker_id: 'basic.moon' }))).toBe('ok');
  });

  it('내보낸 사람도 유효한 초대 링크로 다시 들어온다 (차단은 그대로 막는다)', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    await call(a.client, 'kick_member', { p_goal_id: goal_id, p_user_id: b.userId });
    expect(await outcome(join(b, invite_code, '지우', 'basic.star'))).toBe('ok');
    expect(await visibleMemberIds(a, goal_id)).toEqual([a.userId, b.userId].sort());
    // 새 링크를 만들면 옛 링크로는 들어오지 못한다(앱의 내보내기 설명이 이 방법을 알려 준다)
    await call(a.client, 'kick_member', { p_goal_id: goal_id, p_user_id: b.userId });
    const { invite_code: fresh } = await call<{ invite_code: string }>(a.client, 'rotate_invite', { p_goal_id: goal_id });
    expect(await outcome(join(b, invite_code, '지우', 'basic.star'))).toBe('closed');
    expect(await outcome(join(b, fresh, '지우', 'basic.star'))).toBe('ok');
  });

  it('각자 판에서 나가면 내 판이 내 혼자 목표로 남고, 만든 사람이 나가면 가장 먼저 들어온 사람이 이어받는다', async () => {
    const a = await newUser(); const b = await newUser(); const c = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'each');
    await join(b, invite_code, '지우', 'basic.star');
    await join(c, invite_code, '세나', 'basic.sun');
    const aSticker = randomUUID();
    await place(a, goal_id, 0, aSticker);
    const { solo_goal_id } = await call<{ solo_goal_id: string }>(a.client, 'leave_goal', { p_goal_id: goal_id });
    expect((await pullGoal(a, solo_goal_id)).stickers.map((s) => s.id)).toEqual([aSticker]);
    expect((await pullGoal(b, goal_id)).stickers.map((s) => s.id)).not.toContain(aSticker);
    expect((await b.client.from('goals').select('owner_id').eq('id', goal_id)).data).toEqual([{ owner_id: b.userId }]);
    // 1.1.0도 새 혼자 목표를 받는다
    const v1 = await new V1Server({ rpc: (fn, args) => a.client.rpc(fn, args) }).pull(0, 100);
    expect(v1.rows.find((r) => r.entity === 'goal' && r.row.id === solo_goal_id)?.row).toMatchObject({ name: '같이 걷기' });
  });

  it('마지막 사람이 나가면 목표와 초대를 지운다', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    await call(a.client, 'leave_goal', { p_goal_id: goal_id });
    await call(b.client, 'leave_goal', { p_goal_id: goal_id });
    expect((await adminClient().from('goals').select('id').eq('id', goal_id)).data).toEqual([]);
    expect((await adminClient().from('invites').select('code').eq('goal_id', goal_id)).data).toEqual([]);
    expect(await call(anonClient(), 'preview_invite', { p_code: invite_code })).toEqual({ status: 'closed' });
  });

  it('마지막 사람이 나가면 같은 계정의 다른 기기는 sync_pull로 내 멤버 행의 나감 표시를 받는다', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    await call(b.client, 'leave_goal', { p_goal_id: goal_id });
    const before = (await syncPull(a)).cursor; // a의 다른 기기는 여기까지 받았다
    await call(a.client, 'leave_goal', { p_goal_id: goal_id }); // a가 이 기기에서 마지막으로 나간다
    const after = await syncPull(a, before);
    const mine = after.rows.find((r) => r.entity === 'member' && r.row.goal_id === goal_id)?.row;
    expect(mine).toMatchObject({ goal_id, user_id: a.userId, left_reason: 'left', display_name: null, sticker_id: null });
    expect(mine?.left_at).not.toBeNull();
    // 먼저 나간 b의 다른 기기도 받는다(b의 나간 행은 목표와 함께 지워졌다)
    expect((await syncPull(b)).rows.find((r) => r.entity === 'member' && r.row.goal_id === goal_id)?.row)
      .toMatchObject({ user_id: b.userId, left_reason: 'left' });
    expect(after.rows.filter((r) => r.entity === 'goal' && r.row.id === goal_id)).toEqual([]);
  });

  it('만든 사람이 계정을 지우면 가장 먼저 들어온 사람이 이어받고, 지운 사람의 칸과 멤버 행은 남지 않는다', async () => {
    const a = await newUser(); const b = await newUser(); const c = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    await join(c, invite_code, '세나', 'basic.sun');
    await place(a, goal_id, 0);
    await deleteAccountOnServer(a.client);
    const admin = adminClient();
    expect((await admin.from('goals').select('owner_id').eq('id', goal_id)).data).toEqual([{ owner_id: b.userId }]);
    expect((await admin.from('goal_members').select('user_id').eq('user_id', a.userId)).data).toEqual([]);
    expect((await admin.from('stickers').select('id').eq('placed_by', a.userId)).data).toEqual([]);
    expect((await call<{ status: string }>(anonClient(), 'preview_invite', { p_code: invite_code })).status).toBe('open');
  });

  it('1.1.0(push_changes)로 올린 혼자 목표가 sync_pull에 보인다', async () => {
    const a = await newUser();
    await new V1Server({ rpc: (fn, args) => a.client.rpc(fn, args) })
      .push('phone', [{ entity: 'goal', op: 'upsert', row: { ...goal('1730000000000-ab12cd34', 5, '산책'), sort_order: 2 } }]);
    const { rows } = await syncPull(a);
    const g = rows.find((r) => r.entity === 'goal')?.row;
    expect(g).toMatchObject({ client_id: '1730000000000-ab12cd34', mode: 'solo', name: '산책', owner_id: a.userId });
    expect(rows.find((r) => r.entity === 'member')?.row).toMatchObject({ goal_id: g?.id, sort_order: 2, sticker_id: 'sprout', role: 'owner' });
  });

  // 처리방침의 파기 약속: 서버에서 기록 행이 지워지면 그 사진 파일도 지운다. 저장소 파일은 SQL로 지울 수 없어(파일이 남는다)
  // 서버가 경로를 모아 두고 purge-photos 함수가 저장소 API로 지운다(20261105000006_together_fixes.sql).
  it('한 판에서 내보내져 기록이 지워지면 purge-photos가 그 사진 파일을 지우고, 남의 폴더 경로는 건드리지 않는다', async () => {
    const a = await newUser(); const b = await newUser();
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    const victim = `${a.userId}/victim.jpg`;
    expect((await a.client.storage.from('record-photos').upload(victim, jpeg, { contentType: 'image/jpeg' })).error).toBeNull();
    const [s1, s2, r1, r2] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const own = `${b.userId}/${r1}.jpg`;
    expect((await b.client.storage.from('record-photos').upload(own, jpeg, { contentType: 'image/jpeg' })).error).toBeNull();
    const record = (id: string, sticker: string, path: string) =>
      ({ entity: 'record', op: 'upsert', row: { id, sticker_id: sticker, memo: null, photo_remote_path: path, created_at: 1, updated_at: 1 } });
    await call(b.client, 'sync_push', {
      p_device_id: 'd', p_changes: [
        { entity: 'sticker', op: 'upsert', row: stickerRow(goal_id, 0, s1) }, record(r1, s1, own),
        { entity: 'sticker', op: 'upsert', row: stickerRow(goal_id, 1, s2) }, record(r2, s2, victim), // 남의 경로를 적어 둔 기록
      ],
    });
    await call(a.client, 'kick_member', { p_goal_id: goal_id, p_user_id: b.userId });
    const purged = await a.client.functions.invoke('purge-photos');
    expect(purged.error).toBeNull();
    const names = async (u: User) => ((await adminClient().storage.from('record-photos').list(u.userId)).data ?? []).map((f) => f.name);
    expect(await names(b)).not.toContain(`${r1}.jpg`);
    expect(await names(a)).toContain('victim.jpg');
    // 모은 경로를 읽고 지우는 함수는 service_role만 부른다
    expect((await a.client.rpc('admin_take_photo_trash', { p_limit: 1 })).error).not.toBeNull();
    expect((await a.client.rpc('admin_clear_photo_trash', { p_paths: [own] })).error).not.toBeNull();
  });

  it('purge-photos는 로그인해야 부를 수 있다', async () => {
    const res = await anonClient().functions.invoke('purge-photos');
    expect(res.error).not.toBeNull();
  });

  it('기록은 같은 목표의 다른 멤버에게도 보이지 않는다', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    const stickerId = randomUUID();
    const recordId = randomUUID();
    await call(b.client, 'sync_push', {
      p_device_id: 'd', p_changes: [
        { entity: 'sticker', op: 'upsert', row: stickerRow(goal_id, 0, stickerId) },
        { entity: 'record', op: 'upsert', row: { id: recordId, sticker_id: stickerId, memo: '비밀', photo_remote_path: null, created_at: 1, updated_at: 1 } },
      ],
    });
    expect((await b.client.from('records').select('memo').eq('id', recordId)).data).toEqual([{ memo: '비밀' }]);
    expect((await a.client.from('records').select('id').eq('id', recordId)).data).toEqual([]);
    expect((await syncPull(a)).rows.filter((r) => r.entity === 'record')).toEqual([]);
    expect((await pullGoal(a, goal_id)).records).toEqual([]);
  });

  it('입력 검사: 종료일, 칸 수, 스티커 길이, 칸 번호 범위', async () => {
    const a = await newUser();
    const make = (board: string, slots: number | null, end: string | null, sticker = 'basic.clover') => outcome(call(a.client, 'create_shared_goal', {
      p_mode: 'each', p_name: '검사', p_board_type: board, p_total_slots: slots, p_end_date: end, p_display_name: '은주', p_sticker_id: sticker,
    }));
    expect(await make('calendar', null, '2026-02-30')).toBe('invalid_input');
    expect(await make('calendar', null, '2026/12/01')).toBe('invalid_input');
    expect(await make('tally', 1001, null)).toBe('invalid_input');
    expect(await make('tally', 0, null)).toBe('invalid_input');
    expect(await make('tally', 5, null, 's'.repeat(41))).toBe('invalid_sticker');
    const { goal_id } = await createGoal(a, 'each'); // 적립판 10칸, 칸 번호는 0~9
    expect(await outcome(place(a, goal_id, 10))).toBe('invalid_input');
    expect((await place(a, goal_id, 9)).rejected).toEqual([]);
    expect(await outcome(call(a.client, 'update_goal', { p_goal_id: goal_id, p_name: '검사', p_total_slots: 9, p_end_date: null }))).toBe('invalid_input');
  });

  it('앱 스티커 목록 규칙(묶음.이름, 옛 흑백 id)에 없는 스티커 id는 만들기, 들어가기, 내 스티커 바꾸기 모두 invalid_sticker', async () => {
    const a = await newUser(); const b = await newUser();
    const make = (sticker: string) => outcome(createGoal(a, 'each', sticker));
    expect(await make('sticker-heart')).toBe('invalid_sticker');
    expect(await make('basic.')).toBe('invalid_sticker');
    expect(await make('unknownpack.cat')).toBe('invalid_sticker');
    expect(await make('Basic.Clover')).toBe('invalid_sticker');
    expect(await make('animals_normal.whale')).toBe('ok');
    expect(await make('sprout')).toBe('ok'); // 1.0 흑백 id. 앱이 basic.sprout으로 읽는다(normalizeStickerId)
    const { goal_id, invite_code } = await createGoal(a, 'each', 'basic.flame');
    expect(await outcome(join(b, invite_code, '지우', 'sticker-heart'))).toBe('invalid_sticker');
    await join(b, invite_code, '지우', 'basic.star');
    expect(await outcome(call(b.client, 'update_member', { p_goal_id: goal_id, p_display_name: '지우', p_sticker_id: 'sticker-heart' })))
      .toBe('invalid_sticker');
  });

  it('함께 목표 달력판은 기간 밖 날짜의 스티커를 그 행만 out_of_period로 거절한다 (시간대 하루 여유)', async () => {
    const a = await newUser(); const b = await newUser();
    // 서버는 UTC 날짜로 본다. 앱은 기기 시간대 날짜라 시작일과 오늘에 하루씩 여유를 둔다.
    const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const calendarGoal = (mode: 'each' | 'one', end: string | null) => call<{ goal_id: string; invite_code: string }>(a.client, 'create_shared_goal', {
      p_mode: mode, p_name: '물 마시기', p_board_type: 'calendar', p_total_slots: null, p_end_date: end, p_display_name: '은주', p_sticker_id: 'basic.clover',
    });
    const push = (u: User, goalId: string, date: string, id = randomUUID()) => call<{ rejected: { entity: string; id: string; reason: string }[] }>(u.client, 'sync_push', {
      p_device_id: 'd', p_changes: [{ entity: 'sticker', op: 'upsert', row: { ...stickerRow(goalId, Number(date.slice(8, 10)) - 1, id), date_key: date } }],
    }).then((r) => r.rejected.map((x) => x.reason).join(',') || 'ok');
    const one = await calendarGoal('one', null);
    await join(b, one.invite_code, '지우', 'basic.star');
    expect(await push(b, one.goal_id, day(-2))).toBe('out_of_period'); // 시작 전
    expect(await push(b, one.goal_id, day(-1))).toBe('ok'); // 시작일 하루 여유
    expect(await push(b, one.goal_id, day(0))).toBe('ok');
    expect(await push(a, one.goal_id, day(1))).toBe('ok'); // 오늘 하루 여유(UTC보다 앞선 시간대)
    expect(await push(a, one.goal_id, day(2))).toBe('out_of_period'); // 미래
    const each = await calendarGoal('each', day(0)); // 종료일 오늘
    expect(await push(a, each.goal_id, day(0))).toBe('ok');
    expect(await push(a, each.goal_id, day(1))).toBe('out_of_period'); // 종료일 다음 날
    // 다른 행과 한 묶음이어도 거절된 행만 빠진다
    const okId = randomUUID(); const badId = randomUUID();
    const mixed = await call<{ rejected: { id: string; reason: string }[] }>(a.client, 'sync_push', { p_device_id: 'd', p_changes: [
      { entity: 'sticker', op: 'upsert', row: { ...stickerRow(each.goal_id, 0, badId), date_key: day(-5) } },
      { entity: 'sticker', op: 'upsert', row: { ...stickerRow(one.goal_id, 0, okId), date_key: day(0) } },
    ] });
    expect(mixed.rejected).toEqual([{ entity: 'sticker', id: badId, reason: 'out_of_period' }]);
    expect((await pullGoal(a, one.goal_id)).stickers.map((x) => x.id)).toContain(okId);
    expect((await pullGoal(a, each.goal_id)).stickers.map((x) => x.id)).not.toContain(badId);
    // 적립판은 날짜를 보지 않는다
    const tally = await createGoal(a, 'each');
    expect(await push(a, tally.goal_id, '2020-01-01')).toBe('ok');
  });

  it('신고하면 그때의 대상 이름(사람 이름이나 목표 이름)을 신고 행에 남긴다', async () => {
    const a = await newUser(); const b = await newUser();
    const { goal_id, invite_code } = await createGoal(a, 'one');
    await join(b, invite_code, '지우', 'basic.star');
    await call(a.client, 'report', { p_goal_id: goal_id, p_target_user_id: b.userId, p_reason: 'name' });
    await call(b.client, 'report', { p_goal_id: goal_id, p_target_user_id: null, p_reason: 'name' });
    await call(b.client, 'update_member', { p_goal_id: goal_id, p_display_name: '바뀐이름', p_sticker_id: 'basic.star' });
    const { data } = await adminClient().from('reports').select('reporter_id, target_user_id, target_name').eq('goal_id', goal_id);
    expect(data).toEqual(expect.arrayContaining([
      { reporter_id: a.userId, target_user_id: b.userId, target_name: '지우' },
      { reporter_id: b.userId, target_user_id: null, target_name: '같이 걷기' },
    ]));
    expect(data).toHaveLength(2);
  });

  it('들어가기는 한 사람이 1시간에 20번까지 (넘으면 rate_limited)', async () => {
    const a = await newUser(); const b = await newUser();
    const { invite_code } = await createGoal(a, 'each');
    for (let i = 0; i < 20; i++) expect(await outcome(join(b, 'ZZZZZZZZ', '지우', 'basic.star'))).toBe('closed');
    expect(await outcome(join(b, invite_code, '지우', 'basic.star'))).toBe('rate_limited');
  });
});
