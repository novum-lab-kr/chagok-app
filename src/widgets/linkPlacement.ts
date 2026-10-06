import { canPlace, isCompleted, nextEmptySlot } from '../domain/board';
import { localDateKey } from '../domain/dates';
import type { Goal, Sticker } from '../domain/types';

/** 붙일 칸(slotIndex)과 판 화면 모션에 넘길 위치(적립판 칸 번호 1부터 / 달력판 날짜) */
export type LinkPlacement = { slotIndex: number; at: { slot?: number; date?: string } };

/**
 * 위젯에서 마지막 칸을 눌러 판 화면이 열렸을 때 붙일 곳 (2026-10-06 결정, PRD 4.7).
 * 적립판은 번호가 가장 작은 빈칸, 달력판은 오늘 칸. 완성한 판이거나 붙일 곳이 없으면 null — 아무것도 하지 않는다.
 * 쌓인 위젯 탭을 먼저 반영하고 다시 읽은 목록으로 부른다. 완성 확인은 붙이는 쪽(판 화면 place)이 그 목록의 수로 정한다.
 * 달력판의 stickers는 오늘이 든 달을 담고 있어야 한다.
 */
export function placementFromWidgetLink(goal: Goal, stickers: readonly Sticker[], now: Date): LinkPlacement | null {
  if (isCompleted(goal)) return null;
  if (goal.boardType === 'tally') {
    const slot = nextEmptySlot(goal, stickers);
    return slot === null ? null : { slotIndex: slot, at: { slot: slot + 1 } };
  }
  const date = localDateKey(now.getTime());
  return canPlace(goal, stickers, { date }, now) ? { slotIndex: now.getDate() - 1, at: { date } } : null;
}
