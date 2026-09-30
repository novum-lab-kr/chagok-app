import { SyncRejected } from '../src/sync/contract';
import { isRejection, SupabaseSyncServer } from '../src/sync/supabaseServer';

const serverReturning = (error: { code?: string; message: string } | null, data: unknown = null) => {
  const calls: { fn: string; args?: Record<string, unknown> }[] = [];
  const server = new SupabaseSyncServer({ rpc: async (fn, args) => { calls.push({ fn, args }); return { data, error }; } });
  return { server, calls };
};

describe('SupabaseSyncServer', () => {
  it('형식·무결성 오류만 보류 대상이다', () => {
    expect(isRejection('22023')).toBe(true);
    expect(isRejection('22P02')).toBe(true);
    expect(isRejection('23503')).toBe(true);
    expect(isRejection('42501')).toBe(false); // 로그인 안 됨 → 재시도
    expect(isRejection('PGRST301')).toBe(false); // JWT 만료 → 재시도
    expect(isRejection('')).toBe(false); // 네트워크
    expect(isRejection(undefined)).toBe(false);
  });

  it('거부는 SyncRejected, 나머지는 일반 오류로 던진다', async () => {
    await expect(serverReturning({ code: '23503', message: 'fk' }).server.push('d', [])).rejects.toBeInstanceOf(SyncRejected);
    const other = await serverReturning({ code: '42501', message: 'not signed in' }).server.push('d', []).catch((e: unknown) => e);
    expect(other).toBeInstanceOf(Error);
    expect(other).not.toBeInstanceOf(SyncRejected);
  });

  it('RPC 이름과 인자 이름이 서버 함수와 같다', async () => {
    const { server, calls } = serverReturning(null, { rows: [], cursor: 0, more: false });
    await server.push('dev', []);
    await server.pull(3, 50);
    await server.replaceAll('dev', { goals: [], stickers: [], records: [] });
    expect(calls).toEqual([
      { fn: 'push_changes', args: { p_device_id: 'dev', p_changes: [] } },
      { fn: 'pull_changes', args: { p_since: 3, p_limit: 50 } },
      { fn: 'replace_all', args: { p_device_id: 'dev', p_rows: { goals: [], stickers: [], records: [] } } },
    ]);
  });
});
