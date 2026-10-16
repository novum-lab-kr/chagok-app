import { listGoals } from '../repositories/goalRepository';
import { listStickers, listStickersInMonth } from '../repositories/stickerRepository';
import { listRecordedStickerIds } from '../repositories/recordRepository';
import { listPackAccess } from '../repositories/packRepository';
import { stickerUsableUntil } from '../app-data/placeGate';
import { isCompleted } from '../domain/board';
import { nextMidnight } from '../widgets/widgetProps';
import { readHandledRequestIds } from '../widgets/applyRequests';
import { buildWatchSnapshot } from './snapshot';
import type { WatchInput, WatchSnapshot } from './snapshot';

/** 진행 중인 목표의 워치 입력. 달력판은 date가 속한 달만 보이고, 남은 칸은 전체 수로 센다. */
export async function loadWatchInputs(date: Date): Promise<WatchInput[]> {
  const goals = (await listGoals()).filter((g) => !isCompleted(g));
  const access = await listPackAccess();
  const inputs: WatchInput[] = [];
  for (const goal of goals) {
    const recorded = await listRecordedStickerIds(goal.id);
    const all = await listStickers(goal.id);
    const shown = goal.boardType === 'tally' ? all : await listStickersInMonth(goal.id, date.getFullYear(), date.getMonth() + 1);
    inputs.push({
      goal,
      stickers: shown.map((s) => ({ slotIndex: s.slotIndex, dateKey: s.dateKey, recorded: recorded.has(s.id) })),
      placedAll: all.length,
      usableUntil: stickerUsableUntil(goal, access, date.getTime()),
    });
  }
  return inputs;
}

export async function loadWatchSnapshot(date: Date, growth: number): Promise<WatchSnapshot> {
  const midnight = nextMidnight(date);
  const now = await loadWatchInputs(date);
  const afterMidnight = midnight.getMonth() === date.getMonth() ? now : await loadWatchInputs(midnight);
  return buildWatchSnapshot({ now, afterMidnight, growth, handled: await readHandledRequestIds(), date });
}
