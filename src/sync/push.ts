import { getDb } from '../db/client';
import { ack, enqueue, hold, takeBatch } from './outbox';
import type { OutboxEntry } from './outbox';
import { DEFAULT_STICKER_ID } from '../domain/types';
import type { GoalMode } from '../domain/types';
import { ME } from '../repositories/ids';
import { deleteStickerRow } from '../repositories/stickerRepository';
import { PhotoRejected, SyncRejected } from './contract';
import type { GoalRow, MemberChangeRow, PhotoStore, PushRejection, RecordRow, StickerRow, SyncServer, V2Change } from './contract';

// 혼자 목표 한 줄은 기기의 goals와 내 goal_members를 합친 모양이다(api_v1.sql upsert_solo_goal). mode는 보내지 않는다.
const GOAL_SQL = `SELECT g.mode, g.id, g.name, g.board_type, g.total_slots, COALESCE(m.sticker_id, '${DEFAULT_STICKER_ID}') AS default_sticker_id,
        g.created_at, g.end_date, m.completed_at, m.completion_seen, m.last_placed_at, g.initial_slots, g.updated_at, m.sort_order
   FROM goals g JOIN goal_members m ON m.goal_id = g.id AND m.user_id = '${ME}' WHERE g.id = ?`;
// 내 멤버 행(api_v2.sql sync_push의 member). 기본 스티커는 혼자 목표만 보낸다.
const MEMBER_SQL = `SELECT g.mode, m.goal_id, m.sort_order, m.completed_at, m.completion_seen, m.last_placed_at, m.updated_at, m.sticker_id
   FROM goal_members m JOIN goals g ON g.id = m.goal_id WHERE m.goal_id = ? AND m.user_id = '${ME}'`;
const STICKER_SQL = 'SELECT id, goal_id, placed_at, slot_index, sticker_type, updated_at, date_key, tz_offset_min FROM stickers WHERE id = ?';
// 기기 경로 photo_uri는 보내지 않는다
const RECORD_SQL = 'SELECT id, sticker_id, memo, photo_remote_path, created_at, updated_at FROM records WHERE id = ?';

export type PushDeps = {
  server: SyncServer; photos: PhotoStore; deviceId: string; batchSize?: number; now?: () => number;
  /**
   * 한 판에서 다른 사람이 먼저 붙인 칸이라 기기에서 지웠다(slot_taken). 화면이 안내하고,
   * 지운 기록의 기기 사진(removedPhotoUri)이 있으면 그 파일을 지운다. DB에서는 이미 지운 뒤에 부른다.
   */
  onSlotTaken?: (stickerId: string, removedPhotoUri: string | null) => void;
};

/**
 * 지금 행 상태로 바꾼다. 행이 없으면 삭제다 — 쪽지에 내용을 담지 않아 쪽지와 DB가 어긋나지 않는다.
 * 보낼 것이 없으면 null: 함께 목표의 목표 행(update_goal로 바꾼다), 지운 목표의 멤버 행(서버가 멤버 삭제를 받지 않는다).
 * 보내는 행에는 사용자 id가 없다. 붙인 사람과 기록 주인은 서버가 로그인 사용자로 정한다.
 */
async function toChange(e: OutboxEntry, now: number): Promise<V2Change | null> {
  const db = await getDb();
  if (e.entity === 'goal') {
    const row = await db.first<GoalRow & { mode: GoalMode }>(GOAL_SQL, e.rowId);
    if (!row) return { entity: 'goal', op: 'delete', id: e.rowId, deletedAt: now };
    if (row.mode !== 'solo') return null;
    const { mode: _mode, ...goal } = row;
    return { entity: 'goal', op: 'upsert', row: goal };
  }
  if (e.entity === 'member') {
    const row = await db.first<Omit<MemberChangeRow, 'sticker_id'> & { mode: GoalMode; sticker_id: string | null }>(MEMBER_SQL, e.rowId);
    if (!row) return null;
    const { mode, sticker_id, ...member } = row;
    return { entity: 'member', op: 'upsert', row: mode === 'solo' && sticker_id ? { ...member, sticker_id } : member };
  }
  const entity = e.entity === 'sticker' ? 'sticker' : 'record';
  const row = await db.first<StickerRow | RecordRow>(entity === 'sticker' ? STICKER_SQL : RECORD_SQL, e.rowId);
  if (!row) return { entity, op: 'delete', id: e.rowId, deletedAt: now };
  return { entity, op: 'upsert', row } as V2Change;
}

/** 서버가 rejected에 싣는 id. member는 목표 id다(sync_push의 coalesce(r->>'id', c->>'id', r->>'goal_id')). */
const changeId = (c: V2Change): string => (c.op === 'delete' ? c.id : c.entity === 'member' ? c.row.goal_id : c.row.id);

/**
 * 한 판에서 다른 사람이 먼저 붙인 칸(slot_taken). 기기에서 그 칸과 기록을 지우고 다시 보내지 않는다.
 * 사진을 먼저 올렸으면 서버 파일은 지운다(기록이 없으면 pushPhoto가 지운다). 지운 기록의 기기 사진 경로를 돌려준다.
 */
async function dropTakenSticker(id: string, now: number): Promise<string | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const record = await deleteStickerRow(tx, id);
    await tx.run("DELETE FROM outbox WHERE entity = 'sticker' AND row_id = ?", id);
    if (!record) return null;
    await tx.run("DELETE FROM outbox WHERE entity IN ('record', 'photo') AND row_id = ?", record.recordId);
    if (record.photoRemotePath) await enqueue(tx, 'photo', record.recordId, now);
    return record.photoUri;
  });
}

async function setRemotePath(recordId: string, path: string | null, now: number): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.run('UPDATE records SET photo_remote_path = ?, updated_at = ? WHERE id = ?', path, now, recordId);
    await enqueue(tx, 'record', recordId, now);
  });
}

/**
 * 사진 한 건. 파일을 먼저 올리고 성공한 뒤에만 기록에 서버 경로를 남긴다 — 경로만 있고 파일이 없는 상태를 막는다.
 * 경로 기록 자체가 record 항목을 outbox에 남겨 같은 pushOnce 안에서 올라간다.
 * 기록이 없거나 사진을 뺐으면 서버 파일을 지운다. 기기 원본이 사라졌으면(사진 유실) 서버에는 사진 없음으로 둔다.
 *
 * 주의: 복원 뒤 아직 받지 못한 사진은 photo_uri = NULL, photo_remote_path = 경로다. 이 기록에 photo 항목이
 * 생기면 아래 첫 분기가 서버의 하나뿐인 사본을 지운다. 지금은 그런 경로가 없다(upsertRecord는 사진이
 * 바뀔 때만 넣고, 삭제 경로는 지우는 게 맞다). "사진 유실" 화면에 사진 지우기·바꾸기를 붙일 때 다시 본다.
 */
async function pushPhoto(e: OutboxEntry, photos: PhotoStore, now: number): Promise<void> {
  const db = await getDb();
  const rec = await db.first<{ photo_uri: string | null; photo_remote_path: string | null }>(
    'SELECT photo_uri, photo_remote_path FROM records WHERE id = ?', e.rowId,
  );
  if (!rec || !rec.photo_uri) {
    await photos.remove(e.rowId);
    if (rec && rec.photo_remote_path) await setRemotePath(e.rowId, null, now);
    return;
  }
  const path = await photos.upload(e.rowId, rec.photo_uri);
  if (path !== rec.photo_remote_path) await setRemotePath(e.rowId, path, now);
}

/**
 * 한 묶음을 보낸다. 네트워크 오류는 던진다. 보류한 수를 돌려준다.
 * 묶음 전체가 거부되면(SyncRejected) 한 건씩 나눠 문제 항목만 보류한다.
 * 행 하나만 빠진 거절(rejected)은 그 항목만: 칸 겹침(slot_taken)은 기기에서 칸을 지우고, 내 행이 아님(not_allowed)은 보류한다.
 */
async function pushRows(entries: OutboxEntry[], deps: PushDeps, now: number): Promise<number> {
  const built = await Promise.all(entries.map(async (entry) => ({ entry, change: await toChange(entry, now) })));
  const sending = built.flatMap(({ entry, change }) => (change ? [{ entry, change }] : []));
  let rejected: PushRejection[] = [];
  try {
    if (sending.length) ({ rejected } = await deps.server.push(deps.deviceId, sending.map((s) => s.change)));
  } catch (error) {
    if (!(error instanceof SyncRejected)) throw error;
    if (entries.length === 1) {
      await hold(entries[0], error.message);
      return 1;
    }
    let held = 0;
    for (const e of entries) held += await pushRows([e], deps, now);
    return held;
  }
  let held = 0;
  const handled = new Set<OutboxEntry>();
  for (const r of rejected) {
    const hit = sending.find((s) => s.change.entity === r.entity && changeId(s.change) === r.id);
    if (!hit) continue;
    handled.add(hit.entry);
    if (r.reason === 'slot_taken' && r.entity === 'sticker') {
      deps.onSlotTaken?.(r.id, await dropTakenSticker(r.id, now));
    } else {
      await hold(hit.entry, r.reason);
      held += 1;
    }
  }
  await ack(entries.filter((e) => !handled.has(e)));
  return held;
}

/**
 * outbox가 빌 때까지(보류 제외) 보낸다 (계정·백업 설계 ②·④).
 * 사진 실패는 행 백업을 막지 않는다: 사진 자체의 문제면 그 사진만 보류하고,
 * 네트워크 문제면 이번 회차에는 사진을 빼고 행만 끝까지 보낸 뒤 오류를 던져 스케줄러가 다시 시도하게 한다.
 */
export async function pushOnce(deps: PushDeps): Promise<{ sent: number; held: number }> {
  const size = deps.batchSize ?? 200;
  const clock = deps.now ?? Date.now;
  let sent = 0;
  let held = 0;
  let photoError: unknown = null;
  for (;;) {
    const batch = await takeBatch(size, { excludePhotos: photoError !== null });
    if (batch.length === 0) {
      if (photoError !== null) throw photoError;
      return { sent, held };
    }
    const now = clock();
    const photoEntries = batch.filter((x) => x.entity === 'photo');
    for (const e of photoEntries) {
      if (photoError !== null) break;
      try {
        await pushPhoto(e, deps.photos, now);
        await ack([e]);
      } catch (error) {
        if (error instanceof PhotoRejected) {
          await hold(e, error.message);
          held += 1;
        } else {
          photoError = error;
        }
      }
    }
    // 사진 경로를 기록하면 같은 묶음의 기록 항목이 새 queued_at으로 바뀐다. 행은 묶음을 다시 꺼내 한 번만 보낸다.
    if (photoEntries.length) continue;
    const rows = batch.filter((x) => x.entity !== 'photo');
    if (rows.length) {
      const h = await pushRows(rows, deps, now);
      held += h;
      sent += rows.length - h;
    }
  }
}
