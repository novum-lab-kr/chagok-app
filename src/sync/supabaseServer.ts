import { NotMember, SyncRejected } from './contract';
import type { GoalRow, GoalSnapshot, PushRejection, RecordRow, StickerRow, SyncServer, V2Change, V2Pulled } from './contract';

/** supabase-js에서 쓰는 부분. 테스트에서 바꿔 끼운다. */
export type RpcClient = {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
};

/**
 * 서버가 내용 때문에 거부한 오류인가. 22xxx(형식, 값), 23xxx(무결성: 부모 없음 등)만 보류 대상이다.
 * 인증(42501 등), 네트워크, 서버 장애는 다시 시도한다 — 보류하면 로그인 뒤에도 올라가지 않는다.
 */
export function isRejection(code: string | undefined): boolean {
  return !!code && (code.startsWith('22') || code.startsWith('23'));
}

/** SyncServer를 Supabase RPC로. 규칙은 모두 서버 SQL 함수에 있다(20261105000004_api_v2.sql). */
export class SupabaseSyncServer implements SyncServer {
  constructor(private readonly client: RpcClient) {}

  private async call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) {
      if (isRejection(error.code)) throw new SyncRejected(error.message);
      // 2판 RPC의 실패 이유는 P0001의 메시지로 온다(private.fail)
      if (error.code === 'P0001' && error.message === 'not_member') throw new NotMember(error.message);
      throw new Error(error.message);
    }
    return data as T;
  }

  push(deviceId: string, changes: V2Change[]): Promise<{ rejected: PushRejection[] }> {
    return this.call('sync_push', { p_device_id: deviceId, p_changes: changes });
  }

  pull(since: number, limit: number): Promise<{ rows: V2Pulled[]; cursor: number; more: boolean }> {
    return this.call('sync_pull', { p_since: since, p_limit: limit });
  }

  pullGoal(goalId: string): Promise<GoalSnapshot> {
    return this.call('pull_goal', { p_goal_id: goalId });
  }

  state(): Promise<{ goals: number; lastUpdatedAt: number | null }> {
    return this.call('server_state');
  }

  async replaceAll(deviceId: string, rows: { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[] }): Promise<void> {
    await this.call('replace_all', { p_device_id: deviceId, p_rows: rows });
  }
}
