import type { DateKey } from '../domain/dates';
import type { Goal, Sticker } from '../domain/types';
import { completesBoard, inPeriod, isCompleted, nextEmptySlot, placedAtFor, stickerDate } from '../domain/board';

/**
 * 위젯이 "눌렀다"고 남긴 요청 (위젯 설계 「위젯에서 붙이기」). 위젯 타임라인 props.requests에 쌓인다.
 * dateKey는 누른 순간의 기기 날짜다 — 다음 날 처리해도 누른 날에 붙인다.
 * remove는 적립판 위젯에서 오늘 붙인 칸을 눌러 그 칸을 뗀다(slotIndex, 2026-10-07 결정).
 * complete는 워치가 마지막 칸에서 완성 확인을 받았을 때만 붙는다 (워치 설계, PRD 4.14). 위젯은 쓰지 않는다.
 */
export type WidgetRequest = { id: string; goalId: string; kind: 'add' | 'undo' | 'remove'; at: number; dateKey: DateKey; slotIndex?: number; complete?: true };

export type RequestPlan =
  | { action: 'place'; slotIndex: number; placedAt: number; complete?: true }
  | { action: 'remove'; stickerId: string }
  | { action: 'skip'; reason: 'gone' | 'completed' | 'done' | 'outside' | 'full' | 'last' | 'nothing' | 'record' };

export function isWidgetRequest(v: unknown): v is WidgetRequest {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.goalId === 'string'
    && (r.kind === 'add' || r.kind === 'undo' || (r.kind === 'remove' && Number.isInteger(r.slotIndex) && (r.slotIndex as number) >= 0))
    && typeof r.at === 'number' && typeof r.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.dateKey)
    && (r.complete === undefined || r.complete === true);
}

/**
 * 요청 하나를 어떻게 처리할지 정한다. 판단은 모두 여기서 하고 저장은 applyWidgetRequests가 한다.
 * 마지막 칸은 붙이지 않는다 — 위젯은 그 칸을 앱의 판 화면으로 열어 완성 확인을 받는다 (2026-10-06 결정, PRD 4.7). 워치가 완성 확인을 받은 요청(complete)만 붙이고 완성한다.
 * 기록(사진·메모)이 있는 스티커는 떼지 않는다 — 위젯은 그때 판 화면을 연다.
 */
export function planRequest(goal: Goal | null, stickers: readonly Sticker[], recorded: ReadonlySet<string>, req: WidgetRequest): RequestPlan {
  if (!goal) return { action: 'skip', reason: 'gone' };
  if (isCompleted(goal)) return { action: 'skip', reason: 'completed' };
  const that = stickers.filter((s) => stickerDate(s) === req.dateKey);

  if (req.kind === 'remove') {
    // 누른 칸이 누른 날, 누른 순간까지 붙어 있던 스티커일 때만 뗀다 — 위젯은 확인 창 없이 떼므로 지난 기록은 건드리지 않는다.
    const hit = that.find((s) => s.slotIndex === req.slotIndex && s.placedAt <= req.at);
    if (!hit) return { action: 'skip', reason: 'nothing' };
    if (recorded.has(hit.id)) return { action: 'skip', reason: 'record' };
    return { action: 'remove', stickerId: hit.id };
  }

  if (req.kind === 'undo') {
    // 위젯에서 누른 뒤 앱에서 붙인 스티커는 떼지 않는다 — 되돌리기는 누른 순간까지 붙어 있던 것만 대상이다.
    const before = that.filter((s) => s.placedAt <= req.at);
    if (before.length === 0) return { action: 'skip', reason: 'nothing' };
    const latest = before.reduce((a, b) => (b.placedAt > a.placedAt ? b : a));
    if (recorded.has(latest.id)) return { action: 'skip', reason: 'record' };
    return { action: 'remove', stickerId: latest.id };
  }

  if (stickers.some((s) => s.id === req.id)) return { action: 'skip', reason: 'done' };
  if (goal.boardType === 'calendar') {
    if (!inPeriod(goal, req.dateKey)) return { action: 'skip', reason: 'outside' };
    if (that.length > 0) return { action: 'skip', reason: 'done' };
    if (completesBoard(goal, stickers.length)) {
      if (!req.complete) return { action: 'skip', reason: 'last' };
      return { action: 'place', slotIndex: Number(req.dateKey.slice(8, 10)) - 1, placedAt: placedAtFor(req.dateKey, req.at), complete: true };
    }
    // 지난 날짜를 누른 요청은 그 날짜에 누른 시각의 시·분으로 둔다 — 스티커 날짜는 붙인 시각에서 정해진다 (2026-10-08).
    return { action: 'place', slotIndex: Number(req.dateKey.slice(8, 10)) - 1, placedAt: placedAtFor(req.dateKey, req.at) };
  }
  const slot = nextEmptySlot(goal, stickers);
  if (slot === null) return { action: 'skip', reason: 'full' };
  if (completesBoard(goal, stickers.length)) {
    if (!req.complete) return { action: 'skip', reason: 'last' };
    return { action: 'place', slotIndex: slot, placedAt: req.at, complete: true };
  }
  return { action: 'place', slotIndex: slot, placedAt: req.at };
}
