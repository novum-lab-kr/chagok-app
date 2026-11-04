import { SyncRejected } from '../../src/sync/contract';
import type { GoalRow, RecordRow, StickerRow } from '../../src/sync/contract';
import { isRejection } from '../../src/sync/supabaseServer';
import type { RpcClient } from '../../src/sync/supabaseServer';

// 1.1.0 호환 RPC(20261105000003_api_v1.sql push_changes, pull_changes). 앱은 더 부르지 않지만 서버에 남아 있어
// 서버 시험이 그 규칙을 계속 붙잡는다. id는 기기 글자 그대로(서버가 private.v1_id로 uuid를 정한다).

type V1Entity = 'goal' | 'sticker' | 'record';
type V1Row = GoalRow | StickerRow | RecordRow;
export type V1Change =
  | { entity: 'goal'; op: 'upsert'; row: GoalRow }
  | { entity: 'sticker'; op: 'upsert'; row: StickerRow }
  | { entity: 'record'; op: 'upsert'; row: RecordRow }
  | { entity: V1Entity; op: 'delete'; id: string; deletedAt: number };
export type V1Pulled = { entity: V1Entity; row: V1Row; deletedAt: number | null };

export class V1Server {
  constructor(private readonly client: RpcClient) {}

  private async call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw isRejection(error.code) ? new SyncRejected(error.message) : new Error(error.message);
    return data as T;
  }

  async push(deviceId: string, changes: V1Change[]): Promise<void> {
    await this.call('push_changes', { p_device_id: deviceId, p_changes: changes });
  }

  pull(since: number, limit: number): Promise<{ rows: V1Pulled[]; cursor: number; more: boolean }> {
    return this.call('pull_changes', { p_since: since, p_limit: limit });
  }

  state(): Promise<{ goals: number; lastUpdatedAt: number | null }> {
    return this.call('server_state');
  }
}

export const goal = (id: string, updatedAt = 1, name = `목표 ${id}`): GoalRow => ({
  id, name, board_type: 'tally', total_slots: 10, default_sticker_id: 'sprout', created_at: 1, end_date: null,
  completed_at: null, completion_seen: 0, last_placed_at: null, initial_slots: 10, updated_at: updatedAt, sort_order: null,
});
export const sticker = (id: string, goalId: string, updatedAt = 1): StickerRow => ({
  id, goal_id: goalId, placed_at: 1, slot_index: 0, sticker_type: 'sprout', updated_at: updatedAt,
  date_key: '2026-10-12', tz_offset_min: 540,
});
export const record = (id: string, stickerId: string, updatedAt = 1): RecordRow => ({
  id, sticker_id: stickerId, memo: '메모', photo_remote_path: null, created_at: 1, updated_at: updatedAt,
});

/** 행마다 마지막 상태. 키는 'entity:id'. */
export async function snapshot(server: V1Server): Promise<Map<string, { deletedAt: number | null; row: unknown }>> {
  const m = new Map<string, { deletedAt: number | null; row: unknown }>();
  let cursor = 0;
  for (;;) {
    const page = await server.pull(cursor, 100);
    for (const p of page.rows) m.set(`${p.entity}:${p.row.id}`, { deletedAt: p.deletedAt, row: p.row });
    cursor = page.cursor;
    if (!page.more) return m;
  }
}
export function liveIds(m: Map<string, { deletedAt: number | null }>, entity: string): string[] {
  return [...m].filter(([k, v]) => k.startsWith(`${entity}:`) && v.deletedAt === null).map(([k]) => k.slice(entity.length + 1)).sort();
}
