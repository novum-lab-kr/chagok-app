import { listGoals } from '../repositories/goalRepository';
import { listStickers, listStickersInMonth } from '../repositories/stickerRepository';
import { listRecordedStickerIds } from '../repositories/recordRepository';
import { isCompleted } from '../domain/board';
import { localDateKey } from '../domain/dates';
import type { Sticker } from '../domain/types';
import { buildWidgetSnapshot } from './snapshot';
import { listPackAccess } from '../repositories/packRepository';
import { stickerUsableUntil } from '../app-data/placeGate';
import type { WidgetInput, WidgetSnapshot } from './snapshot';

/** 진행 중인 목표의 위젯 입력. 종료일 없는 달력판은 이번 달만 읽는다 (PRD 6.3). */
export async function loadWidgetInputs(now: Date): Promise<WidgetInput[]> {
  const goals = (await listGoals()).filter((g) => !isCompleted(g));
  const today = localDateKey(now.getTime());
  const inputs: WidgetInput[] = [];
  const access = await listPackAccess();
  for (const goal of goals) {
    const usableUntil = stickerUsableUntil(goal, access, now.getTime());
    const recorded = await listRecordedStickerIds(goal.id);
    const todaySticker = (list: readonly Sticker[]) => {
      const mine = list.filter((s) => s.dateKey === today);
      if (mine.length === 0) return null;
      const last = mine.reduce((a, b) => (b.placedAt > a.placedAt ? b : a));
      return { dateKey: today, hasRecord: recorded.has(last.id) };
    };
    if (goal.boardType === 'tally') {
      const stickers = await listStickers(goal.id);
      const mine = stickers.filter((s) => s.dateKey === today);
      const todaySlots = { dateKey: today, slots: mine.map((s) => s.slotIndex), removable: mine.filter((s) => !recorded.has(s.id)).map((s) => s.slotIndex) };
      inputs.push({ goal, placedAll: stickers.length, placedDates: [], slotIndexes: stickers.map((s) => s.slotIndex), todaySticker: todaySticker(stickers), todaySlots, usableUntil });
      continue;
    }
    const month = await listStickersInMonth(goal.id, now.getFullYear(), now.getMonth() + 1);
    const placedAll = goal.endDate === null ? month.length : (await listStickers(goal.id)).length;
    inputs.push({ goal, placedAll, placedDates: month.map((s) => s.dateKey), slotIndexes: [], todaySticker: todaySticker(month), usableUntil });
  }
  return inputs;
}

export async function loadWidgetSnapshot(now: Date): Promise<WidgetSnapshot> {
  return buildWidgetSnapshot(await loadWidgetInputs(now), now);
}
