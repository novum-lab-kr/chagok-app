import {
  blockUser, createSharedGoal, errorMessage, errorWordOf, inviteUrl, kickMember, leaveSharedGoal, myBlocks, readInviteCode,
  readMemberDefaults, reportGoal, rotateInvite, SharedGoalError, unblockUser, updateMember, updateSharedGoal,
} from '../src/sync/sharedGoals';
import type { SharedClient } from '../src/sync/sharedGoals';

type Reply = { data?: unknown; error?: { code?: string; message: string } | null };

/** 부른 RPC 이름과 인자를 적고, 정해 둔 답을 준다 */
function fake(reply: Reply = { data: null }) {
  const calls: [string, Record<string, unknown> | undefined][] = [];
  const client = {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      calls.push([fn, args]);
      return { data: reply.data ?? null, error: reply.error ?? null };
    },
  } as unknown as SharedClient;
  return { client, calls };
}

describe('함께 목표 RPC', () => {
  it('create_shared_goal: 인자 이름은 서버 그대로, 돌려받은 키는 camelCase', async () => {
    const { client, calls } = fake({ data: { goal_id: 'g1', invite_code: 'K7Q2MXAB' } });
    const result = await createSharedGoal(client, {
      goalId: 'g1', mode: 'each', name: '걷기', boardType: 'tally', totalSlots: 30, endDate: null, displayName: '지우', stickerId: 'basic.star',
    });
    expect(result).toEqual({ goalId: 'g1', inviteCode: 'K7Q2MXAB' });
    expect(calls).toEqual([['create_shared_goal', {
      p_mode: 'each', p_name: '걷기', p_board_type: 'tally', p_total_slots: 30, p_end_date: null,
      p_display_name: '지우', p_sticker_id: 'basic.star', p_goal_id: 'g1',
    }]]);
  });

  it('update_member, update_goal, rotate_invite, kick_member, block_user, unblock_user, report', async () => {
    const { client, calls } = fake({ data: { invite_code: 'NEWCODE2' } });
    await updateMember(client, 'g1', '지우', 'basic.star');
    await updateSharedGoal(client, 'g1', { name: '걷기', totalSlots: 40, endDate: '2026-12-31' });
    expect(await rotateInvite(client, 'g1')).toBe('NEWCODE2');
    await kickMember(client, 'g1', 'u2');
    await blockUser(client, 'u2');
    await unblockUser(client, 'u2');
    await reportGoal(client, 'g1', null, 'name');
    expect(calls).toEqual([
      ['update_member', { p_goal_id: 'g1', p_display_name: '지우', p_sticker_id: 'basic.star' }],
      ['update_goal', { p_goal_id: 'g1', p_name: '걷기', p_total_slots: 40, p_end_date: '2026-12-31' }],
      ['rotate_invite', { p_goal_id: 'g1' }],
      ['kick_member', { p_goal_id: 'g1', p_user_id: 'u2' }],
      ['block_user', { p_user_id: 'u2' }],
      ['unblock_user', { p_user_id: 'u2' }],
      ['report', { p_goal_id: 'g1', p_target_user_id: null, p_reason: 'name' }],
    ]);
  });

  it('leave_goal: solo_goal_id를 soloGoalId로 (한 판이면 null)', async () => {
    expect(await leaveSharedGoal(fake({ data: { solo_goal_id: 's1' } }).client, 'g1')).toEqual({ soloGoalId: 's1' });
    expect(await leaveSharedGoal(fake({ data: { solo_goal_id: null } }).client, 'g1')).toEqual({ soloGoalId: null });
  });

  it('my_blocks: 키를 camelCase로, 이름은 null일 수 있다', async () => {
    const { client } = fake({ data: [{ user_id: 'u2', display_name: '민', created_at: 5 }, { user_id: 'u3', display_name: null, created_at: 4 }] });
    expect(await myBlocks(client)).toEqual([
      { userId: 'u2', displayName: '민', createdAt: 5 },
      { userId: 'u3', displayName: null, createdAt: 4 },
    ]);
  });
});

describe('실패 낱말', () => {
  it('P0001 메시지는 그 낱말', async () => {
    const { client } = fake({ error: { code: 'P0001', message: 'sticker_taken' } });
    await expect(updateMember(client, 'g1', '지우', 'x')).rejects.toEqual(new SharedGoalError('sticker_taken'));
    await expect(updateMember(client, 'g1', '지우', 'x')).rejects.toMatchObject({ word: 'sticker_taken' });
  });

  it('22023 메시지(invalid_name, invalid_sticker, invalid_input)도 그 낱말', () => {
    for (const word of ['invalid_name', 'invalid_sticker', 'invalid_input']) {
      expect(errorWordOf({ code: '22023', message: word })).toBe(word);
    }
  });

  it('42501은 needs_login, 그 밖은 network', () => {
    expect(errorWordOf({ code: '42501', message: 'permission denied' })).toBe('needs_login');
    expect(errorWordOf({ code: 'P0001', message: 'something_new' })).toBe('network');
    expect(errorWordOf({ code: '57014', message: 'timeout' })).toBe('network');
    expect(errorWordOf({ message: 'Failed to fetch' })).toBe('network');
  });

  it('요청이 서버에 닿기 전에 던져도 network', async () => {
    const client = { rpc: async () => { throw new Error('offline'); } } as unknown as SharedClient;
    await expect(blockUser(client, 'u2')).rejects.toMatchObject({ word: 'network' });
  });

  it('낱말을 화면 문구로 푼다', () => {
    expect(errorMessage('name_not_allowed')).toBe('다른 이름을 써 주세요.');
    expect(errorMessage('sticker_taken')).toBe('이 목표에서 이미 누가 쓰는 스티커예요.');
    expect(errorMessage('rate_limited')).toBe('잠시 뒤 다시 해 주세요');
    expect(errorMessage('not_member')).toBe('이 목표를 볼 수 없어요');
    expect(errorMessage('not_shared')).toBe('이 목표를 볼 수 없어요');
    expect(errorMessage('not_owner')).toBe('만든 사람만 바꿀 수 있어요');
    expect(errorMessage('network')).toBe('인터넷 연결을 확인하고 다시 시도해 주세요.');
    expect(errorMessage('needs_login')).toBe('인터넷 연결을 확인하고 다시 시도해 주세요.');
  });
});

describe('초대 주소', () => {
  it('고정 주소 뒤에 코드를 붙인다', () => {
    expect(inviteUrl('K7Q2MXAB')).toBe('https://chagok.novum-lab.com/invite/K7Q2MXAB');
  });
});

describe('표 읽기', () => {
  /** select, eq, is를 적고 maybeSingle에서 답을 준다 */
  function table(reply: Reply) {
    const log: string[] = [];
    const filter: Record<string, unknown> = {
      eq: (c: string, v: string) => { log.push(`eq ${c} ${v}`); return filter; },
      is: (c: string, v: null) => { log.push(`is ${c} ${v}`); return filter; },
      maybeSingle: async () => ({ data: reply.data ?? null, error: reply.error ?? null }),
    };
    const client = {
      from: (name: string) => ({ select: (cols: string) => { log.push(`from ${name} select ${cols}`); return filter; } }),
    } as unknown as SharedClient;
    return { client, log };
  }

  it('member_defaults: 지난번 이름과 스티커, 없으면 null', async () => {
    const { client, log } = table({ data: { display_name: '지우', sticker_id: 'basic.star' } });
    expect(await readMemberDefaults(client)).toEqual({ displayName: '지우', stickerId: 'basic.star' });
    expect(log).toEqual(['from member_defaults select display_name, sticker_id']);
    expect(await readMemberDefaults(table({ data: null }).client)).toBeNull();
  });

  it('invites: 끄지 않은 코드만, 없으면 null', async () => {
    const { client, log } = table({ data: { code: 'K7Q2MXAB' } });
    expect(await readInviteCode(client, 'g1')).toBe('K7Q2MXAB');
    expect(log).toEqual(['from invites select code', 'eq goal_id g1', 'is revoked_at null']);
    expect(await readInviteCode(table({ data: null }).client, 'g1')).toBeNull();
  });

  it('읽다 실패하면 낱말로 던진다', async () => {
    await expect(readInviteCode(table({ error: { code: '42501', message: 'x' } }).client, 'g1')).rejects.toMatchObject({ word: 'needs_login' });
  });
});
