import { getDb } from '../db/client';
import type { DbDriver } from '../db/driver';
import { ME, newId } from './ids';
import { deleteRecordRow } from './recordRepository';
import type { RemovedRecord } from './recordRepository';
import { DEFAULT_STICKER_ID } from '../domain/types';
import type { Sticker } from '../domain/types';
import { localDateKey, monthKeyOf, tzOffsetMinutes } from '../domain/dates';
import { enqueue } from '../sync/outbox';

type StickerRow = {
  id: string;
  goal_id: string;
  placed_at: number;
  slot_index: number;
  /** 차단으로 가려진 친구 칸은 null */
  sticker_type: string | null;
  date_key: string;
  tz_offset_min: number;
  board_user_id: string | null;
  placed_by: string | null;
};

function toSticker(r: StickerRow): Sticker {
  return {
    id: r.id,
    goalId: r.goal_id,
    placedAt: r.placed_at,
    slotIndex: r.slot_index,
    stickerType: r.sticker_type ?? '', // 가려진 칸은 빈 문자열
    dateKey: r.date_key,
    tzOffsetMin: r.tz_offset_min,
    boardUserId: r.board_user_id,
    placedBy: r.placed_by,
  };
}

const TAKEN = '이미 붙인 칸입니다.';
/** 내가 보는 판: 내 판과 한 판. 친구 판의 칸은 위젯, 워치, 완성 계산에 섞이지 않는다. */
const MY_BOARD = `(board_user_id = '${ME}' OR board_user_id IS NULL)`;

/**
 * 붙인다. 목표의 마지막으로 붙인 시각도 함께 바꾼다 (PRD 4.1) — 더 늦은 시각일 때만.
 * complete면 같은 트랜잭션에서 완성한다. 마지막 칸 확인을 받은 뒤에만 쓴다 (PRD 4.7).
 * 완성한 판에도 붙인다(2026-10-08). 달력판의 slotIndex는 그 달의 날짜 - 1이며, 날짜는 placedAt의 기기 날짜로 정해 dateKey로 저장한다.
 * id·placedAt은 위젯 요청을 처리할 때 준다: 요청 id를 스티커 id로 써서 두 번 붙지 않게 하고, 누른 시각으로 붙인다.
 * 이미 붙인 칸이면 거부한다 — 적립판은 같은 칸 번호, 달력판은 같은 dateKey(달력판의 칸은 날짜다). 같은 판 안에서만 따진다.
 * 한 판(one) 달력판은 판 하나를 여럿이 쓰므로 그날 내가 이미 붙였거나 그날 두 장이 붙었으면 막는다(서버 트리거와 같은 규칙).
 * 판 주인은 방식으로 정한다: 한 판이면 null, 아니면 나. 붙인 사람은 늘 나다.
 * 화면이 위젯 요청을 반영하기 전의 목록으로 계산해도 두 장이 붙지 않게 하는 마지막 방어다.
 */
export async function placeSticker(
  goalId: string,
  slotIndex: number,
  stickerType: string = DEFAULT_STICKER_ID,
  /** pressedAt: 누른 시각(기본 지금). 붙인 날(placed_days)은 이 날짜로 남긴다 — 위젯 요청은 누른 때를 넘긴다 */
  options: { complete?: boolean; id?: string; placedAt?: number; pressedAt?: number } = {},
): Promise<Sticker> {
  const db = await getDb();
  const now = Date.now();
  const placedAt = options.placedAt ?? now;
  const sticker: Sticker = {
    id: options.id ?? newId(),
    goalId,
    placedAt,
    slotIndex,
    stickerType,
    dateKey: localDateKey(placedAt),
    tzOffsetMin: tzOffsetMinutes(placedAt),
    boardUserId: ME,
    placedBy: ME,
  };
  await db.transaction(async (tx) => {
    const goal = await tx.first<{ mode: string; board_type: string; completed_at: number | null }>(
      `SELECT g.mode, g.board_type, m.completed_at FROM goals g
         JOIN goal_members m ON m.goal_id = g.id AND m.user_id = ? WHERE g.id = ?`,
      ME, goalId,
    );
    if (!goal) throw new Error('목표가 없습니다.');
    const shared = goal.mode === 'one';
    sticker.boardUserId = shared ? null : ME;
    const taken = goal.board_type === 'tally'
      ? await tx.first('SELECT 1 AS x FROM stickers WHERE goal_id = ? AND board_user_id IS ? AND slot_index = ?', goalId, sticker.boardUserId, slotIndex)
      : shared
        ? await tx.first(
          `SELECT 1 AS x FROM stickers WHERE goal_id = ? AND board_user_id IS NULL AND date_key = ?
             AND (placed_by = ? OR (SELECT COUNT(*) FROM stickers WHERE goal_id = ? AND board_user_id IS NULL AND date_key = ?) >= 2)`,
          goalId, sticker.dateKey, ME, goalId, sticker.dateKey,
        )
        : await tx.first('SELECT 1 AS x FROM stickers WHERE goal_id = ? AND board_user_id IS ? AND date_key = ?', goalId, sticker.boardUserId, sticker.dateKey);
    if (taken) throw new Error(TAKEN);
    await tx.run(
      `INSERT INTO stickers (id, goal_id, placed_at, slot_index, sticker_type, updated_at, date_key, tz_offset_min, board_user_id, placed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sticker.id, sticker.goalId, sticker.placedAt, sticker.slotIndex, sticker.stickerType, now, sticker.dateKey, sticker.tzOffsetMin,
      sticker.boardUserId, ME,
    );
    await tx.run(
      'UPDATE goal_members SET last_placed_at = MAX(COALESCE(last_placed_at, 0), ?), updated_at = ? WHERE goal_id = ? AND user_id = ?',
      sticker.placedAt, now, goalId, ME,
    );
    await tx.run('INSERT OR IGNORE INTO placed_days (date_key) VALUES (?)', localDateKey(options.pressedAt ?? now));
    if (options.complete && goal.completed_at === null) { // 완성은 한 번만 — 완성한 판에 붙여도 완성 시각은 그대로 (2026-10-08)
      await tx.run('UPDATE goal_members SET completed_at = ?, completion_seen = 0 WHERE goal_id = ? AND user_id = ?', sticker.placedAt, goalId, ME);
    }
    await enqueue(tx, 'sticker', sticker.id, now);
    await enqueue(tx, 'member', goalId, now);
  });
  return sticker;
}

export async function listStickers(goalId: string): Promise<Sticker[]> {
  const db = await getDb();
  const rows = await db.all<StickerRow>(
    `SELECT * FROM stickers WHERE goal_id = ? AND ${MY_BOARD} ORDER BY slot_index ASC`,
    goalId,
  );
  return rows.map(toSticker);
}

/** 달력판 상세는 보고 있는 달만 읽는다 (PRD 6.3). 붙인 날짜(dateKey)가 그 달인 스티커. month는 1–12. */
export async function listStickersInMonth(goalId: string, year: number, month: number): Promise<Sticker[]> {
  const db = await getDb();
  const rows = await db.all<StickerRow>(
    `SELECT * FROM stickers WHERE goal_id = ? AND ${MY_BOARD} AND substr(date_key, 1, 7) = ? ORDER BY date_key ASC, placed_at ASC`,
    goalId, monthKeyOf(year, month),
  );
  return rows.map(toSticker);
}

/** 친구 판 화면용: 그 사람의 판에 붙은 칸. 내 판은 ME를 준다. */
export async function listBoardStickers(goalId: string, boardUserId: string): Promise<Sticker[]> {
  const db = await getDb();
  const rows = await db.all<StickerRow>(
    'SELECT * FROM stickers WHERE goal_id = ? AND board_user_id = ? ORDER BY slot_index ASC',
    goalId, boardUserId,
  );
  return rows.map(toSticker);
}

export async function getSticker(id: string): Promise<Sticker | null> {
  const db = await getDb();
  const row = await db.first<StickerRow>('SELECT * FROM stickers WHERE id = ?', id);
  return row ? toSticker(row) : null;
}

/**
 * 스티커와 그 기록을 뗀다. 트랜잭션 연결에서는 CASCADE가 꺼져 있을 수 있어 기록도 직접 지운다. 지운 기록의 사진 경로를 돌려준다. 파일은 호출자가 정리한다.
 * 완성한 판에서도 뗀다(2026-10-08) — 완성은 그대로다. 마지막으로 붙인 시각은 바꾸지 않는다.
 * 내가 붙인 칸만 뗀다. 친구가 붙인 칸이면 던진다.
 */
export async function removeSticker(id: string): Promise<string | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const row = await tx.first<{ placed_by: string | null }>('SELECT placed_by FROM stickers WHERE id = ?', id);
    if (!row) return null;
    if (row.placed_by !== ME) throw new Error('내가 붙인 칸만 뗄 수 있습니다.');
    const record = await deleteStickerRow(tx, id);
    // 기록은 서버가 스티커와 함께 표식한다. 사진 파일은 기록 id로 따로 지운다.
    const now = Date.now();
    await enqueue(tx, 'sticker', id, now);
    if (record && (record.photoUri || record.photoRemotePath)) await enqueue(tx, 'photo', record.recordId, now);
    return record?.photoUri ?? null;
  });
}

/**
 * 칸 하나와 그 기록을 기기에서만 지운다(outbox를 만들지 않는다). 지운 기록을 돌려준다.
 * 칸 떼기, 목표 지우기, 올리기의 칸 겹침(slot_taken), 받아 오기가 함께 쓴다.
 * 트랜잭션 연결에서는 CASCADE가 꺼져 있을 수 있어 기록도 직접 지운다.
 */
export async function deleteStickerRow(tx: DbDriver, id: string): Promise<RemovedRecord | null> {
  const record = await deleteRecordRow(tx, 'sticker_id', id);
  await tx.run('DELETE FROM stickers WHERE id = ?', id);
  return record;
}

/** 앱 전체에 내가 붙인 스티커 수(함께 목표에서 내가 붙인 칸 포함, 친구가 붙인 칸 제외). 첫 스티커 안내와 워치 성장 수에 쓴다. */
export async function countAllStickers(): Promise<number> {
  const db = await getDb();
  const row = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM stickers WHERE placed_by = ?', ME);
  return row?.n ?? 0;
}

/**
 * 차단으로 가려진 칸(붙인 사람 null)이 있는가. 한 판에서 차단한 사람은 멤버 행이 기기에 없어도 서버에는 남아 있다는 표시다
 * (목표 설정 [삭제하기]가 혼자 목표 안내를 쓸지 고를 때).
 */
export async function hasHiddenStickers(goalId: string): Promise<boolean> {
  const db = await getDb();
  return (await db.first<{ x: number }>('SELECT 1 AS x FROM stickers WHERE goal_id = ? AND placed_by IS NULL LIMIT 1', goalId)) !== null;
}
