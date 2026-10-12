import { normalizeStickerId } from '../stickers/stickerIds';
import type { GoalCardItem, PocketGoal, StickerId } from '../design-system';
import type { Goal, Sticker } from '../domain/types';
import { parseDateKey } from '../domain/dates';
import type { DateKey } from '../domain/dates';
import { isCompleted, progressBasis, progressOf, startDate } from '../domain/board';
import type { GoalSummary } from '../repositories/goalRepository';

/**
 * 도메인 모델을 디자인 시스템의 화면 모델로 옮긴다.
 *
 * 디자인 시스템은 칸 번호가 1부터이고 도메인 `slotIndex`는 0부터다.
 * 이 함수가 그 경계를 흡수한다.
 */
export function toPocketGoal(goal: Goal, stickers: readonly Sticker[]): PocketGoal {
  const mine = stickers.filter((s) => s.goalId === goal.id);

  const filled = goal.boardType === 'tally'
    ? mine.map((s) => s.slotIndex + 1).sort((a, b) => a - b)
    : [];

  const filledStickers: Record<number, StickerId> = {};
  if (goal.boardType === 'tally') {
    for (const s of mine) filledStickers[s.slotIndex + 1] = normalizeStickerId(s.stickerType);
  }

  const calendarRecords: Record<string, StickerId> = {};
  if (goal.boardType === 'calendar') {
    for (const s of mine) {
      calendarRecords[s.dateKey] = normalizeStickerId(s.stickerType);
    }
  }

  return {
    id: goal.id,
    name: goal.name,
    kind: goal.boardType,
    total: goal.totalSlots ?? 0,
    sticker: normalizeStickerId(goal.defaultStickerId),
    filled,
    filledStickers,
    calendarRecords,
  };
}

// ── 문구 ────────────────────────────────────────────────────────────

export const kindLabel = (goal: Goal): string => (goal.boardType === 'tally' ? '적립판' : '달력판');

/** '9월 3일' */
export function longDate(key: DateKey): string {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** '9/29' */
export function shortDate(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 진행 비율 문구. 종료일 없는 달력판은 기준 달을 붙여 전체 진행으로 오해하지 않게 한다 (PRD 4.1).
 * 진행 중이면 '이번 달 m%', 완성했으면 '9월 m%'.
 */
export function percentLabel(goal: Goal, placedInBasis: number, now: Date): string {
  const { percent } = progressOf(goal, placedInBasis, now);
  const basis = progressBasis(goal, now);
  if (basis.kind === 'all') return `${percent}%`;
  return basis.current ? `이번 달 ${percent}%` : `${basis.month}월 ${percent}%`;
}

/** 목록 카드: `[판 종류] m% 채웠어요` 또는 `[판 종류] m% M/D 완성` (PRD 4.1). */
export function goalCard({ goal, placedInBasis }: GoalSummary, now: Date): GoalCardItem {
  const label = percentLabel(goal, placedInBasis, now);
  return {
    id: goal.id,
    name: goal.name,
    sticker: normalizeStickerId(goal.defaultStickerId),
    kind: kindLabel(goal),
    percent: progressOf(goal, placedInBasis, now).percent,
    status: isCompleted(goal) ? [label, `${shortDate(goal.completedAt!)} 완성`] : [`${label} 채웠어요`],
  };
}

/** 완성한 판 설정의 판 종류 줄. '적립판 · 20칸' / '달력판' */
export const boardLabel = (goal: Goal): string =>
  goal.boardType === 'tally' ? `적립판 · ${goal.totalSlots ?? 0}칸` : '달력판';

/** 달력판 기간. '9월 1일 – 9월 23일' / '9월 1일부터' */
export function periodLabel(goal: Goal): string {
  const start = longDate(startDate(goal));
  return goal.endDate ? `${start} – ${longDate(goal.endDate)}` : `${start}부터`;
}

/** 삭제 확인 문구 (PRD 4.4). 0개인 항목은 쓰지 않는다 (2026-09-30). */
export function deleteDescription({ stickers, records }: { stickers: number; records: number }): string {
  const parts = [stickers > 0 && `붙인 스티커 ${stickers}개`, records > 0 && `기록 ${records}개`].filter(Boolean);
  return parts.length ? `${parts.join('와 ')}가 함께 지워지고, 되돌릴 수 없어요.` : '이 목표가 지워지고, 되돌릴 수 없어요.';
}
