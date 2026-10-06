import { listGoals } from '../repositories/goalRepository';
import { listStickers, listStickersInRange } from '../repositories/stickerRepository';
import { listRecordedStickerIds } from '../repositories/recordRepository';
import { monthRange } from '../app-data/boardData';
import { isCompleted } from '../domain/board';
import { localDateKey } from '../domain/dates';
import type { Sticker } from '../domain/types';
import { buildWidgetSnapshot } from './snapshot';
import type { WidgetInput, WidgetSnapshot } from './snapshot';

/** 진행 중인 목표의 위젯 입력. 종료일 없는 달력판은 이번 달만 읽는다 (PRD 6.3). */
export async function loadWidgetInputs(now: Date): Promise<WidgetInput[]> {
  const goals = (await listGoals()).filter((g) => !isCompleted(g));
  const [from, to] = monthRange(now.getFullYear(), now.getMonth() + 1);
  const today = localDateKey(now.getTime());
  const inputs: WidgetInput[] = [];
  for (const goal of goals) {
    const recorded = await listRecordedStickerIds(goal.id);
    const todaySticker = (list: readonly Sticker[]) => {
      const mine = list.filter((s) => localDateKey(s.placedAt) === today);
      if (mine.length === 0) return null;
      const last = mine.reduce((a, b) => (b.placedAt > a.placedAt ? b : a));
      return { dateKey: today, hasRecord: recorded.has(last.id) };
    };
    if (goal.boardType === 'tally') {
      const stickers = await listStickers(goal.id);
      inputs.push({ goal, placedAll: stickers.length, placedDates: [], slotIndexes: stickers.map((s) => s.slotIndex), todaySticker: todaySticker(stickers) });
      continue;
    }
    const month = await listStickersInRange(goal.id, from, to);
    const placedAll = goal.endDate === null ? month.length : (await listStickers(goal.id)).length;
    inputs.push({ goal, placedAll, placedDates: month.map((s) => localDateKey(s.placedAt)), slotIndexes: [], todaySticker: todaySticker(month) });
  }
  return inputs;
}

export async function loadWidgetSnapshot(now: Date): Promise<WidgetSnapshot> {
  return buildWidgetSnapshot(await loadWidgetInputs(now), now);
}
