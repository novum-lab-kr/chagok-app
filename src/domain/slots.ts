import type { Goal, Sticker, Slot } from './types';

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function slotCount(goal: Goal, now: Date): number {
  return goal.boardType === 'tally' ? (goal.totalSlots ?? 0) : daysInMonth(now);
}

export function buildSlots(goal: Goal, stickers: Sticker[], now: Date): Slot[] {
  const count = slotCount(goal, now);
  const byIndex = new Map<number, Sticker>();

  for (const s of stickers) {
    const idx =
      goal.boardType === 'tally' ? s.slotIndex : new Date(s.placedAt).getDate() - 1;
    if (idx >= 0 && idx < count) byIndex.set(idx, s);
  }

  return Array.from({ length: count }, (_, i) => ({
    index: i,
    label: String(i + 1),
    sticker: byIndex.get(i) ?? null,
  }));
}

export function nextSlotIndex(
  goal: Goal,
  stickers: Sticker[],
  now: Date,
): number | null {
  const slots = buildSlots(goal, stickers, now);

  if (goal.boardType === 'calendar') {
    const todayIdx = now.getDate() - 1;
    return slots[todayIdx]?.sticker ? null : todayIdx;
  }

  const empty = slots.find((s) => s.sticker === null);
  return empty ? empty.index : null;
}
