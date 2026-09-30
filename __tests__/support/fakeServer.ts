import { SyncRejected } from '../../src/sync/contract';
import type { Change, GoalRow, PhotoStore, PulledRow, RecordRow, RowEntity, StickerRow, SyncServer } from '../../src/sync/contract';

type AnyRow = GoalRow | StickerRow | RecordRow;
type Stored = { entity: RowEntity; row: AnyRow; deletedAt: number | null; seq: number };

/**
 * push/pull 계약을 메모리로 구현한다. 실제 RPC와 같은 규칙:
 * 더 최근 updated_at 우선, 목표·스티커 삭제는 딸린 행까지 표식, 멱등.
 */
export class FakeServer implements SyncServer {
  rows = new Map<string, Stored>();
  private seq = 0;
  failNext = 0;               // 다음 n번 push/replaceAll은 네트워크 오류
  reject = new Set<string>(); // 이 id가 들어간 push는 거부
  applyThenFail = false;      // 반영한 뒤 응답을 잃는다
  pushes = 0;

  private key = (e: RowEntity, id: string) => `${e}:${id}`;
  private put(entity: RowEntity, row: AnyRow, deletedAt: number | null) {
    this.rows.set(this.key(entity, row.id), { entity, row, deletedAt, seq: ++this.seq });
  }
  private tombstone(entity: RowEntity, id: string, at: number) {
    const s = this.rows.get(this.key(entity, id));
    if (s && s.deletedAt === null) this.rows.set(this.key(entity, id), { ...s, deletedAt: at, seq: ++this.seq });
  }
  private children(entity: 'sticker' | 'record', parentKey: 'goal_id' | 'sticker_id', parentId: string): string[] {
    return [...this.rows.values()]
      .filter((s) => s.entity === entity && (s.row as unknown as Record<string, string>)[parentKey] === parentId)
      .map((s) => s.row.id);
  }

  async push(_deviceId: string, changes: Change[]): Promise<void> {
    this.pushes++;
    if (this.failNext > 0) { this.failNext--; throw new Error('network'); }
    for (const c of changes) {
      const id = c.op === 'delete' ? c.id : c.row.id;
      if (this.reject.has(id)) throw new SyncRejected(`rejected ${id}`);
    }
    for (const c of changes) {
      if (c.op === 'upsert') {
        const cur = this.rows.get(this.key(c.entity, c.row.id));
        if (!cur || cur.row.updated_at <= c.row.updated_at) this.put(c.entity, c.row, null);
        continue;
      }
      this.tombstone(c.entity, c.id, c.deletedAt);
      if (c.entity === 'goal') {
        for (const sid of this.children('sticker', 'goal_id', c.id)) {
          this.tombstone('sticker', sid, c.deletedAt);
          for (const rid of this.children('record', 'sticker_id', sid)) this.tombstone('record', rid, c.deletedAt);
        }
      }
      if (c.entity === 'sticker') {
        for (const rid of this.children('record', 'sticker_id', c.id)) this.tombstone('record', rid, c.deletedAt);
      }
    }
    if (this.applyThenFail) { this.applyThenFail = false; throw new Error('response lost'); }
  }

  async pull(since: number, limit: number) {
    const all = [...this.rows.values()].filter((s) => s.seq > since).sort((a, b) => a.seq - b.seq);
    const page = all.slice(0, limit);
    return {
      rows: page.map((s) => ({ entity: s.entity, row: s.row, deletedAt: s.deletedAt }) as PulledRow),
      cursor: page.length ? page[page.length - 1].seq : since,
      more: all.length > limit,
    };
  }

  async state() {
    const live = [...this.rows.values()].filter((s) => s.deletedAt === null);
    return {
      goals: live.filter((s) => s.entity === 'goal').length,
      lastUpdatedAt: live.length ? Math.max(...live.map((s) => s.row.updated_at)) : null,
    };
  }

  async replaceAll(_deviceId: string, rows: { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[] }) {
    if (this.failNext > 0) { this.failNext--; throw new Error('network'); }
    const now = Date.now();
    for (const s of [...this.rows.values()]) if (s.deletedAt === null) this.tombstone(s.entity, s.row.id, now);
    for (const r of rows.goals) this.put('goal', r, null);
    for (const r of rows.stickers) this.put('sticker', r, null);
    for (const r of rows.records) this.put('record', r, null);
  }

  live(entity: RowEntity): string[] {
    return [...this.rows.values()].filter((s) => s.entity === entity && s.deletedAt === null).map((s) => s.row.id).sort();
  }
}

export class FakePhotos implements PhotoStore {
  remote = new Map<string, string>();
  missingLocal = new Set<string>();
  failDownload = new Set<string>();
  failUpload: Error | null = null;
  async upload(recordId: string, storedUri: string) {
    if (this.failUpload) throw this.failUpload;
    if (this.missingLocal.has(storedUri)) return null;
    const path = `u/${recordId}.jpg`;
    this.remote.set(path, storedUri);
    return path;
  }
  async remove(recordId: string) { this.remote.delete(`u/${recordId}.jpg`); }
  async download(_remotePath: string, recordId: string) {
    if (this.failDownload.has(recordId)) throw new Error('download failed');
    return `record-photo:${recordId}-restored.jpg`;
  }
}
