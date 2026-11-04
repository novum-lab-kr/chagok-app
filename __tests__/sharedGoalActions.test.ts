import { Share } from 'react-native';
import { getDb } from '../src/db/client';
import { getGoal, listGoals } from '../src/repositories/goalRepository';
import { listMembers } from '../src/repositories/memberRepository';
import { listBoardStickers, listStickers, placeSticker } from '../src/repositories/stickerRepository';
import { pendingCount } from '../src/sync/outbox';
import { pullOnce, refetchGoal } from '../src/sync/pull';
import { subscribeResume } from '../src/sync/syncGate';
import type { SharedClient } from '../src/sync/sharedGoals';
import { getSupabase } from '../src/sync/supabaseClient';
import { actionDeps, block, createAndFetch, leave, removeAsOwner, shareInvite, unblock } from '../src/app-data/sharedGoalActions';
import type { ActionDeps } from '../src/app-data/sharedGoalActions';
import { FakePhotos, FakeServer } from './support/fakeServer';
import { withFreshDb } from './support/setup';

jest.mock('react-native', () => ({ Share: { share: jest.fn() } }));
jest.mock('../src/sync/supabaseClient', () => ({ getSupabase: jest.fn() }));
jest.mock('../src/sync/appSync', () => ({ syncDepsFor: jest.fn() }));
jest.mock('../src/app-data/recordPhotos', () => ({ removeManagedRecordPhoto: jest.fn() }));

withFreshDb();

const FRIEND = 'friend-id';

/** FakeServer의 시험 도우미를 서버 RPC처럼 부르게 한다. 도우미가 던진 낱말은 P0001 오류로 바꾼다 */
function rpcOf(server: FakeServer, log: string[]): SharedClient {
  const handlers: Record<string, (a: Record<string, string>) => unknown> = {
    leave_goal: (a) => ({ solo_goal_id: server.leave(a.p_goal_id) }),
    block_user: (a) => { server.block(a.p_user_id); return null; },
    unblock_user: (a) => { server.unblock(a.p_user_id); return null; },
    create_shared_goal: (a) => {
      const r = server.createSharedGoal({ mode: a.p_mode as 'each' | 'one', name: a.p_name, displayName: a.p_display_name, stickerId: a.p_sticker_id });
      return { goal_id: r.goalId, invite_code: r.inviteCode };
    },
  };
  return {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      log.push(fn);
      try {
        return { data: handlers[fn](args as Record<string, string>), error: null };
      } catch (error) {
        return { data: null, error: { code: 'P0001', message: (error as Error).message } };
      }
    },
    from: () => { throw new Error('표 읽기는 이 시험에서 쓰지 않는다'); },
  } as unknown as SharedClient;
}

function setup() {
  const server = new FakeServer();
  const log: string[] = [];
  const d: ActionDeps = {
    client: rpcOf(server, log),
    userId: server.userId,
    currentUserId: async () => server.userId,
    sync: { server, photos: new FakePhotos(), deviceId: 'phone', userId: server.userId, currentUserId: async () => server.userId },
  };
  return { server, log, d };
}

/** 친구가 만든 함께 목표에 내가 들어가 기기로 받아 둔다 */
async function joined(server: FakeServer, mode: 'each' | 'one') {
  const friend = server.as(FRIEND);
  const { goalId, inviteCode } = friend.createSharedGoal({ mode, displayName: '은주', stickerId: 'basic.clover' });
  server.join(inviteCode, '지우', 'basic.star');
  await refetchGoal({ server, userId: server.userId }, goalId);
  return { friend, goalId };
}

const friendCell = (goalId: string, id = 'c1') => ({
  entity: 'sticker' as const, op: 'upsert' as const, row: {
    id, goal_id: goalId, placed_at: 1, slot_index: 0, sticker_type: 'basic.clover', updated_at: 1,
    date_key: '2026-11-05', tz_offset_min: 540,
  },
});

describe('leave', () => {
  it('pushOnce가 끝난 뒤 leave_goal을 부른다', async () => {
    const { server, log, d } = setup();
    const { goalId } = await joined(server, 'each');
    await placeSticker(goalId, 0);
    const push = server.push.bind(server);
    server.push = async (id, changes) => { log.push('push'); return push(id, changes); };
    await leave(d, goalId);
    expect(log.indexOf('push')).toBeGreaterThanOrEqual(0);
    expect(log.indexOf('push')).toBeLessThan(log.indexOf('leave_goal'));
  });

  it('올리기가 실패하면 leave_goal을 부르지 않고 던진다', async () => {
    const { server, log, d } = setup();
    const { goalId } = await joined(server, 'each');
    await placeSticker(goalId, 0);
    server.failNext = 1;
    await expect(leave(d, goalId)).rejects.toThrow('network');
    expect(log).not.toContain('leave_goal');
    expect(await getGoal(goalId)).not.toBeNull();
  });

  it('각자 판을 나가면 옛 목표는 기기에서 사라지고 새 혼자 목표에 올리지 않은 내 칸이 있다', async () => {
    const { server, d } = setup();
    const { goalId } = await joined(server, 'each');
    const mine = await placeSticker(goalId, 0); // 아직 올리지 않았다
    const { soloGoalId } = await leave(d, goalId);
    expect(soloGoalId).not.toBeNull();
    expect(await getGoal(goalId)).toBeNull();
    expect((await listGoals()).map((g) => [g.id, g.mode])).toEqual([[soloGoalId, 'solo']]);
    expect((await listStickers(soloGoalId!)).map((s) => s.id)).toEqual([mine.id]);
  });

  it('한 판을 나가면 목표가 사라지고 새 혼자 목표는 없다', async () => {
    const { server, d } = setup();
    const { goalId } = await joined(server, 'one');
    expect(await leave(d, goalId)).toEqual({ soloGoalId: null });
    expect(await getGoal(goalId)).toBeNull();
    expect(await listGoals()).toEqual([]);
  });
});

describe('removeAsOwner', () => {
  it('나간 뒤 새 혼자 목표를 지우고 outbox에 목표 삭제를 남긴다', async () => {
    const { server, d } = setup();
    const { goalId } = await joined(server, 'each');
    await placeSticker(goalId, 0);
    expect(await removeAsOwner(d, goalId)).toEqual([]);
    expect(await listGoals()).toEqual([]);
    const queued = await (await getDb()).all<{ entity: string }>("SELECT entity FROM outbox WHERE entity = 'goal'");
    expect(queued).toEqual([{ entity: 'goal' }]);
  });
});

describe('block, unblock', () => {
  it('차단하면 그 사람 멤버 행과 판이 사라지고, 한 판의 칸은 가려진 칸(sticker_type null)으로 남는다', async () => {
    const { server, d } = setup();
    const each = await joined(server, 'each');
    const one = await joined(server, 'one');
    await each.friend.push('d', [friendCell(each.goalId, 'c-each')]);
    await one.friend.push('d', [friendCell(one.goalId, 'c-one')]);
    await refetchGoal({ server, userId: server.userId }, each.goalId);
    await refetchGoal({ server, userId: server.userId }, one.goalId);
    expect(await listBoardStickers(each.goalId, FRIEND)).toHaveLength(1);

    await block(d, FRIEND);

    for (const g of [each.goalId, one.goalId]) expect((await listMembers(g)).map((m) => m.userId)).toEqual(['me']);
    expect(await listBoardStickers(each.goalId, FRIEND)).toEqual([]);
    const hidden = await (await getDb()).all<{ sticker_type: string | null; placed_by: string | null }>(
      'SELECT sticker_type, placed_by FROM stickers WHERE goal_id = ?', one.goalId,
    );
    expect(hidden).toEqual([{ sticker_type: null, placed_by: null }]);
  });

  it('풀면 다음 회차를 깨우고, 회차가 다시 받으면 돌아온다', async () => {
    const { server, d } = setup();
    const { friend, goalId } = await joined(server, 'each');
    await friend.push('d', [friendCell(goalId)]);
    await refetchGoal({ server, userId: server.userId }, goalId);
    await block(d, FRIEND);
    let woke = 0;
    const off = subscribeResume(() => { woke += 1; });
    await unblock(d, FRIEND);
    off();
    expect(woke).toBe(1);
    await pullOnce({ server, userId: server.userId });
    expect((await listMembers(goalId)).map((m) => m.userId)).toEqual([FRIEND, 'me']);
  });
});

describe('createAndFetch', () => {
  const input = {
    goalId: 'g-new', mode: 'each' as const, name: '걷기', boardType: 'tally' as const, totalSlots: 10, endDate: null,
    displayName: '은주', stickerId: 'basic.clover',
  };

  it('만든 뒤 다시 받아 기기에 목표가 있다', async () => {
    const { d } = setup();
    const r = await createAndFetch(d, input);
    expect(r.onDevice).toBe(true);
    expect(r.inviteUrl).toMatch(/^https:\/\/chagok\.novum-lab\.com\/invite\/CODE\d+$/);
    expect(await getGoal(r.goalId)).toMatchObject({ name: '걷기', mode: 'each' });
  });

  it('다시 받기에 실패하면 onDevice가 false이고 다음 회차를 깨운다', async () => {
    const { server, d } = setup();
    server.pullGoal = async () => { throw new Error('network'); };
    let woke = 0;
    const off = subscribeResume(() => { woke += 1; });
    const r = await createAndFetch(d, input);
    off();
    expect(r.onDevice).toBe(false);
    expect(woke).toBe(1);
    expect(await getGoal(r.goalId)).toBeNull();
  });

  it('서버가 거절하면 낱말로 던지고 기기에는 아무것도 만들지 않는다', async () => {
    const { d } = setup();
    d.client = { rpc: async () => ({ data: null, error: { code: 'P0001', message: 'name_not_allowed' } }) } as unknown as SharedClient;
    await expect(createAndFetch(d, input)).rejects.toMatchObject({ word: 'name_not_allowed' });
    expect(await listGoals()).toEqual([]);
    expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  });
});

describe('shareInvite', () => {
  const withCode = (code: string | null) => ({
    rpc: async () => ({ data: null, error: null }),
    from: () => ({ select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: code ? { code } : null, error: null }) }) }) }) }),
  }) as unknown as SharedClient;

  it('코드를 읽어 메시지에 초대 주소를 담아 공유 창을 연다', async () => {
    const { d } = setup();
    d.client = withCode('K7Q2MXAB');
    expect(await shareInvite(d, 'g1', '걷기')).toBe(true);
    expect(Share.share).toHaveBeenCalledWith({ message: '「걷기」 같이 채워요\nhttps://chagok.novum-lab.com/invite/K7Q2MXAB' });
  });

  it('쓰는 코드가 없으면 공유 창을 열지 않고 false', async () => {
    const { d } = setup();
    d.client = withCode(null);
    (Share.share as jest.Mock).mockClear();
    expect(await shareInvite(d, 'g1', '걷기')).toBe(false);
    expect(Share.share).not.toHaveBeenCalled();
  });
});

describe('actionDeps', () => {
  it('서버 설정이 없거나 세션이 없으면 null', async () => {
    (getSupabase as jest.Mock).mockReturnValueOnce(null);
    expect(await actionDeps()).toBeNull();
    (getSupabase as jest.Mock).mockReturnValueOnce({ auth: { getSession: async () => ({ data: { session: null } }) } });
    expect(await actionDeps()).toBeNull();
  });
});
