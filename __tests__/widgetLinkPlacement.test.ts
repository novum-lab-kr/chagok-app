import { placementFromWidgetLink } from '../src/widgets/linkPlacement';
import { applyWidgetRequests } from '../src/widgets/applyRequests';
import { loadBoard } from '../src/app-data/boardData';
import { completesBoard } from '../src/domain/board';
import { localDateKey } from '../src/domain/dates';
import { createGoal } from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import type { Goal, Sticker } from '../src/domain/types';
import { withFreshDb } from './support/setup';

withFreshDb();

const t = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'sprout',
  createdAt: t(2026, 10, 1), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: null, ...over,
});
const st = (id: string, placedAt: number, slotIndex: number): Sticker => ({ id, goalId: 'g', placedAt, slotIndex, stickerType: 'sprout' });
const now = new Date(2026, 9, 6, 9);

describe('placementFromWidgetLink (위젯 링크로 열렸을 때 붙일 곳)', () => {
  it('적립판은 번호가 가장 작은 빈칸', () => {
    const g = goal({ boardType: 'tally', totalSlots: 3 });
    expect(placementFromWidgetLink(g, [st('a', t(2026, 10, 5), 0)], now)).toEqual({ slotIndex: 1, at: { slot: 2 } });
  });

  it('달력판은 오늘 칸', () => {
    expect(placementFromWidgetLink(goal(), [], now)).toEqual({ slotIndex: 5, at: { date: '2026-10-06' } });
  });

  it('붙일 곳이 없으면 아무것도 하지 않는다 — 완성한 판, 가득 찬 적립판, 오늘 이미 붙인 달력판, 기간 밖', () => {
    expect(placementFromWidgetLink(goal({ completedAt: t(2026, 10, 5) }), [], now)).toBeNull();
    expect(placementFromWidgetLink(goal({ boardType: 'tally', totalSlots: 1 }), [st('a', t(2026, 10, 5), 0)], now)).toBeNull();
    expect(placementFromWidgetLink(goal(), [st('a', t(2026, 10, 6, 8), 5)], now)).toBeNull();
    expect(placementFromWidgetLink(goal({ endDate: '2026-10-05' }), [], now)).toBeNull();
  });

  it('쌓인 위젯 탭을 먼저 반영한 뒤 판단하면 늘어난 수로 마지막 칸을 고르고 완성 확인을 받는다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 3 });
    await placeSticker(g.id, 0);
    const tap = Date.now();
    await applyWidgetRequests([{ id: 'w1', goalId: g.id, kind: 'add', at: tap, dateKey: localDateKey(tap) }]);
    const at = new Date();
    const board = (await loadBoard(g.id, at.getFullYear(), at.getMonth() + 1, at))!;
    expect(placementFromWidgetLink(board.goal, board.stickers, at)).toEqual({ slotIndex: 2, at: { slot: 3 } });
    expect(completesBoard(board.goal, board.placedAll)).toBe(true);
  });
});
