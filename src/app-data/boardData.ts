import { getGoal, settleExpiredPeriods } from '../repositories/goalRepository';
import { countStickers, listStickers, listStickersInRange } from '../repositories/stickerRepository';
import { listRecordedStickerIds } from '../repositories/recordRepository';
import { progressBasis } from '../domain/board';
import type { Goal, Sticker } from '../domain/types';

/** 그 달 1일 0시(로컬)부터 다음 달 1일 0시 전까지. month는 1–12. */
export function monthRange(year: number, month: number): [number, number] {
  return [new Date(year, month - 1, 1).getTime(), new Date(year, month, 1).getTime()];
}

export type BoardData = {
  goal: Goal;
  /** 적립판은 전부, 달력판은 보고 있는 달의 스티커 */
  stickers: Sticker[];
  /** 지금 붙어 있는 전체 수. 마지막 칸 판정에 쓴다 */
  placedAll: number;
  /** 진행률 기준 안의 수. 기간 없는 달력판만 전체와 다르다 */
  placedInBasis: number;
  /** 사진 또는 비어 있지 않은 메모가 있는 스티커 */
  recordedIds: ReadonlySet<string>;
};

/**
 * 판 상세 한 화면 분량을 읽는다. 종료일이 지난 판을 먼저 완성 처리한다 (PRD 4.7).
 * 달력판은 보고 있는 달만 읽는다 (PRD 6.3).
 */
export async function loadBoard(goalId: string, year: number, month: number, now: Date): Promise<BoardData | null> {
  await settleExpiredPeriods(now);
  const goal = await getGoal(goalId);
  if (!goal) return null;
  const stickers = goal.boardType === 'tally'
    ? await listStickers(goal.id)
    : await listStickersInRange(goal.id, ...monthRange(year, month));
  const placedAll = await countStickers(goal.id);
  const basis = progressBasis(goal, now);
  const placedInBasis = basis.kind === 'all'
    ? placedAll
    : (await listStickersInRange(goal.id, ...monthRange(basis.year, basis.month))).length;
  const recordedIds = await listRecordedStickerIds(goal.id);
  return { goal, stickers, placedAll, placedInBasis, recordedIds };
}
