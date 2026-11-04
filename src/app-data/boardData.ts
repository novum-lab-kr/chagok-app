import { getGoal, settleExpiredPeriods } from '../repositories/goalRepository';
import { countStickers, listBoardStickers, listStickers, listStickersInMonth } from '../repositories/stickerRepository';
import { listMembers } from '../repositories/memberRepository';
import { listRecordedStickerIds } from '../repositories/recordRepository';
import { progressBasis } from '../domain/board';
import type { Goal, GoalMember, Sticker } from '../domain/types';

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
  /** 함께 목표의 사람(나 포함, 보기만 하는 사람 빼고, 들어온 순서). 혼자 목표는 빈 배열 */
  members: GoalMember[];
  /** 각자 판만: 친구 userId → 그 사람 판의 칸. 그 밖에는 빈 객체 */
  friendStickers: Record<string, Sticker[]>;
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
    : await listStickersInMonth(goal.id, year, month);
  const placedAll = await countStickers(goal.id);
  const basis = progressBasis(goal, now);
  const placedInBasis = basis.kind === 'all'
    ? placedAll
    : (await listStickersInMonth(goal.id, basis.year, basis.month)).length;
  const recordedIds = await listRecordedStickerIds(goal.id);
  const members = goal.mode === 'solo' ? [] : (await listMembers(goal.id)).filter((m) => m.role !== 'viewer');
  const friendStickers: Record<string, Sticker[]> = {};
  if (goal.mode === 'each') {
    for (const m of members) if (!m.isMe) friendStickers[m.userId] = await listBoardStickers(goal.id, m.userId);
  }
  return { goal, stickers, placedAll, placedInBasis, recordedIds, members, friendStickers };
}
