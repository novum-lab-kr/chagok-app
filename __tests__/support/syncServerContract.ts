import type { GoalRow, PulledRow, RecordRow, StickerRow, SyncServer } from '../../src/sync/contract';

export const goal = (id: string, updatedAt = 1, name = `목표 ${id}`): GoalRow => ({
  id, name, board_type: 'tally', total_slots: 10, default_sticker_id: 'sprout', created_at: 1, end_date: null,
  completed_at: null, completion_seen: 0, last_placed_at: null, initial_slots: 10, updated_at: updatedAt,
});
export const sticker = (id: string, goalId: string, updatedAt = 1): StickerRow => ({
  id, goal_id: goalId, placed_at: 1, slot_index: 0, sticker_type: 'sprout', updated_at: updatedAt,
});
export const record = (id: string, stickerId: string, updatedAt = 1): RecordRow => ({
  id, sticker_id: stickerId, memo: '메모', photo_remote_path: null, created_at: 1, updated_at: updatedAt,
});

async function pullAll(server: SyncServer, pageSize = 100): Promise<PulledRow[]> {
  const out: PulledRow[] = [];
  let cursor = 0;
  for (;;) {
    const page = await server.pull(cursor, pageSize);
    out.push(...page.rows);
    cursor = page.cursor;
    if (!page.more) return out;
  }
}

/** 행마다 마지막 상태. 키는 'entity:id'. */
export async function snapshot(server: SyncServer): Promise<Map<string, { deletedAt: number | null; row: unknown }>> {
  const m = new Map<string, { deletedAt: number | null; row: unknown }>();
  for (const p of await pullAll(server)) m.set(`${p.entity}:${p.row.id}`, { deletedAt: p.deletedAt, row: p.row });
  return m;
}
export function liveIds(m: Map<string, { deletedAt: number | null }>, entity: string): string[] {
  return [...m].filter(([k, v]) => k.startsWith(`${entity}:`) && v.deletedAt === null).map(([k]) => k.slice(entity.length + 1)).sort();
}

/** 가짜 서버와 실제 서버가 같은 규칙인지 (계정·백업 설계 테스트 표 "계약 일치"). */
export function describeSyncServerContract(label: string, make: () => Promise<SyncServer>, wrap: jest.Describe = describe): void {
  wrap(`SyncServer 계약: ${label}`, () => {
    it('빈 서버는 목표 0개, 마지막 수정 없음', async () => {
      expect(await (await make()).state()).toEqual({ goals: 0, lastUpdatedAt: null });
    });

    it('올린 행을 그대로 돌려준다', async () => {
      const s = await make();
      await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal('g1', 5) },
        { entity: 'sticker', op: 'upsert', row: sticker('s1', 'g1', 6) },
        { entity: 'record', op: 'upsert', row: record('r1', 's1', 7) },
      ]);
      const m = await snapshot(s);
      expect(m.get('goal:g1')).toEqual({ deletedAt: null, row: goal('g1', 5) });
      expect(m.get('sticker:s1')).toEqual({ deletedAt: null, row: sticker('s1', 'g1', 6) });
      expect(m.get('record:r1')).toEqual({ deletedAt: null, row: record('r1', 's1', 7) });
      expect(await s.state()).toEqual({ goals: 1, lastUpdatedAt: 7 });
    });

    it('더 오래된 updated_at은 덮어쓰지 않는다', async () => {
      const s = await make();
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal('g1', 10, '새 이름') }]);
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal('g1', 5, '옛 이름') }]);
      expect((await snapshot(s)).get('goal:g1')?.row).toEqual(goal('g1', 10, '새 이름'));
    });

    it('목표를 지우면 딸린 스티커·기록까지 표식한다', async () => {
      const s = await make();
      await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal('g1') },
        { entity: 'sticker', op: 'upsert', row: sticker('s1', 'g1') },
        { entity: 'record', op: 'upsert', row: record('r1', 's1') },
      ]);
      await s.push('d1', [{ entity: 'goal', op: 'delete', id: 'g1', deletedAt: 20 }]);
      const m = await snapshot(s);
      expect([liveIds(m, 'goal'), liveIds(m, 'sticker'), liveIds(m, 'record')]).toEqual([[], [], []]);
      expect(m.get('record:r1')?.deletedAt).toBe(20);
      expect((await s.state()).goals).toBe(0);
    });

    it('스티커를 지우면 딸린 기록까지 표식한다', async () => {
      const s = await make();
      await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal('g1') },
        { entity: 'sticker', op: 'upsert', row: sticker('s1', 'g1') },
        { entity: 'record', op: 'upsert', row: record('r1', 's1') },
      ]);
      await s.push('d1', [{ entity: 'sticker', op: 'delete', id: 's1', deletedAt: 9 }]);
      const m = await snapshot(s);
      expect([liveIds(m, 'goal'), liveIds(m, 'sticker'), liveIds(m, 'record')]).toEqual([['g1'], [], []]);
    });

    it('같은 변경을 다시 보내도 결과가 같다 (멱등)', async () => {
      const s = await make();
      const batch = [
        { entity: 'goal', op: 'upsert', row: goal('g1', 3) },
        { entity: 'goal', op: 'upsert', row: goal('g2', 3) },
        { entity: 'goal', op: 'delete', id: 'g2', deletedAt: 4 },
        { entity: 'record', op: 'delete', id: '없는-기록', deletedAt: 4 },
      ] as const;
      await s.push('d1', [...batch]);
      const first = await snapshot(s);
      await s.push('d1', [...batch]);
      const second = await snapshot(s);
      expect(liveIds(first, 'goal')).toEqual(['g1']);
      expect(liveIds(second, 'goal')).toEqual(['g1']);
      expect(second.get('goal:g1')?.row).toEqual(first.get('goal:g1')?.row);
    });

    it('나눠 받아도 모든 행을 한 번씩 받는다', async () => {
      const s = await make();
      await s.push('d1', ['a', 'b', 'c', 'd', 'e'].map((id) => ({ entity: 'goal' as const, op: 'upsert' as const, row: goal(id) })));
      await s.push('d1', [{ entity: 'goal', op: 'upsert', row: goal('c', 2) }]);
      const ids: string[] = [];
      let cursor = 0;
      for (;;) {
        const page = await s.pull(cursor, 2);
        ids.push(...page.rows.map((r) => r.row.id));
        cursor = page.cursor;
        if (!page.more) break;
      }
      expect(ids.sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('replaceAll은 기존 행을 표식하고 보낸 행만 남긴다 — 같은 id는 더 오래된 updated_at이어도 살아난다', async () => {
      const s = await make();
      await s.push('d1', [
        { entity: 'goal', op: 'upsert', row: goal('old', 50) },
        { entity: 'goal', op: 'upsert', row: goal('same', 50, '서버 것') },
      ]);
      await s.replaceAll('d2', { goals: [goal('same', 1, '기기 것'), goal('new', 1)], stickers: [], records: [] });
      const m = await snapshot(s);
      expect(liveIds(m, 'goal')).toEqual(['new', 'same']);
      expect(m.get('goal:same')?.row).toEqual(goal('same', 1, '기기 것'));
    });
  });
}
