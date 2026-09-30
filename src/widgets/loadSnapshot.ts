import { listGoals } from '../repositories/goalRepository';
import { listStickers, listStickersInRange } from '../repositories/stickerRepository';
import { monthRange } from '../app-data/boardData';
import { isCompleted } from '../domain/board';
import { localDateKey } from '../domain/dates';
import { buildWidgetSnapshot } from './snapshot';
import type { WidgetInput, WidgetSnapshot } from './snapshot';

/** 진행 중인 목표만 읽는다. 종료일 없는 달력판은 이번 달만 읽는다 (PRD 6.3). */
export async function loadWidgetSnapshot(now: Date): Promise<WidgetSnapshot> {
  const goals = (await listGoals()).filter((g) => !isCompleted(g));
  const [from, to] = monthRange(now.getFullYear(), now.getMonth() + 1);
  const inputs: WidgetInput[] = [];
  for (const goal of goals) {
    if (goal.boardType === 'tally') {
      const stickers = await listStickers(goal.id);
      inputs.push({ goal, placedAll: stickers.length, placedDates: [], slotIndexes: stickers.map((s) => s.slotIndex) });
      continue;
    }
    const month = await listStickersInRange(goal.id, from, to);
    const placedAll = goal.endDate === null ? month.length : (await listStickers(goal.id)).length;
    inputs.push({ goal, placedAll, placedDates: month.map((s) => localDateKey(s.placedAt)), slotIndexes: [] });
  }
  return buildWidgetSnapshot(inputs, now);
}
