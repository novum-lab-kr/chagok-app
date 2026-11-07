import { NotMember, SyncRejected } from '../src/sync/contract';
import { isRejection, SupabaseSyncServer } from '../src/sync/supabaseServer';

const serverReturning = (error: { code?: string; message: string } | null, data: unknown = null) => {
  const calls: { fn: string; args?: Record<string, unknown> }[] = [];
  const server = new SupabaseSyncServer({ rpc: async (fn, args) => { calls.push({ fn, args }); return { data, error }; } });
  return { server, calls };
};

describe('SupabaseSyncServer', () => {
  it('형식, 무결성 오류만 보류 대상이다', () => {
    expect(isRejection('22023')).toBe(true);
    expect(isRejection('22P02')).toBe(true);
    expect(isRejection('23503')).toBe(true);
    expect(isRejection('42501')).toBe(false); // 로그인 안 됨 → 재시도
    expect(isRejection('PGRST301')).toBe(false); // JWT 만료 → 재시도
    expect(isRejection('P0001')).toBe(false); // 2판 RPC의 이유 낱말
    expect(isRejection('')).toBe(false); // 네트워크
    expect(isRejection(undefined)).toBe(false);
  });

  it('거부는 SyncRejected, 멤버가 아니면 NotMember, 나머지는 일반 오류로 던진다', async () => {
    await expect(serverReturning({ code: '23503', message: 'fk' }).server.push('d', [])).rejects.toBeInstanceOf(SyncRejected);
    await expect(serverReturning({ code: '22P02', message: 'uuid' }).server.pull(0, 1)).rejects.toBeInstanceOf(SyncRejected);
    await expect(serverReturning({ code: 'P0001', message: 'not_member' }).server.pullGoal('g')).rejects.toBeInstanceOf(NotMember);
    const other = await serverReturning({ code: '42501', message: 'not signed in' }).server.push('d', []).catch((e: unknown) => e);
    expect(other).toBeInstanceOf(Error);
    expect(other).not.toBeInstanceOf(SyncRejected);
    expect(other).not.toBeInstanceOf(NotMember);
  });

  it('sync_push의 rejected를 그대로 돌려준다', async () => {
    const rejected = [{ entity: 'sticker', id: 's1', reason: 'slot_taken' }];
    expect(await serverReturning(null, { rejected }).server.push('d', [])).toEqual({ rejected });
  });

  it('RPC 이름과 인자 이름이 서버 함수와 같다', async () => {
    const { server, calls } = serverReturning(null, { rows: [], cursor: 0, more: false, rejected: [] });
    await server.push('dev', []);
    await server.pull(3, 50);
    await server.pullGoal('g1');
    await server.state();
    await server.replaceAll('dev', { goals: [], stickers: [], records: [] });
    expect(calls).toEqual([
      { fn: 'sync_push', args: { p_device_id: 'dev', p_changes: [] } },
      { fn: 'sync_pull', args: { p_since: 3, p_limit: 50 } },
      { fn: 'pull_goal', args: { p_goal_id: 'g1' } },
      { fn: 'server_state', args: undefined },
      { fn: 'replace_all', args: { p_device_id: 'dev', p_rows: { goals: [], stickers: [], records: [] } } },
    ]);
  });
});
