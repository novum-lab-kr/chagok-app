import { buildWidgetSnapshot } from '../src/widgets/snapshot';
import { goalWidgetProps, monthWidgetProps, nextMidnight, tallyWidgetProps } from '../src/widgets/widgetProps';
import type { WidgetArt } from '../src/widgets/widgetProps';
import type { Goal } from '../src/domain/types';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const goal = (over: Partial<Goal>): Goal => ({
  id: 'g', name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'shoe',
  createdAt: at(2026, 10, 1).getTime(), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: null, ...over,
});
const art: WidgetArt = {
  mascotYet: 'y', mascotDone: 'd', mascotSleepy: 'z', bubbles: { ivory: 'bi', white: 'bw', ink: 'bk' },
  stickers: { sprout: 'file:///sprout.png', shoe: 'file:///shoe.png', book: 'file:///book.png' },
};
const snap = (now: Date) => buildWidgetSnapshot([
  { goal: goal({ id: 'run' }), placedAll: 1, placedDates: ['2026-10-02'], slotIndexes: [] },
  { goal: goal({ id: 'read', name: '독서', boardType: 'tally', totalSlots: 20, defaultStickerId: 'book' }), placedAll: 3, placedDates: [], slotIndexes: [0, 1, 2] },
], now);

describe('위젯 props', () => {
  it('목표 하나는 모든 목표를 id로 넣고 순서 목록을 준다', () => {
    const s = snap(at(2026, 10, 6));
    const p = goalWidgetProps(s, art);
    expect(Object.keys(p.goals).sort()).toEqual(['read', 'run']);
    expect(p.order.map((o) => o.id)).toEqual(s.goals.map((g) => g.id));
    expect(p.goals.read).toMatchObject({ sticker: 'file:///book.png', placed: 3, total: 20, remaining: 17 });
    expect(p.requests).toEqual([]);
  });

  it('이번 달은 달력판만, 오늘 칸 번호와 n월을 준다', () => {
    const p = monthWidgetProps(snap(at(2026, 10, 6)), art, at(2026, 10, 6));
    expect(Object.keys(p.goals)).toEqual(['run']);
    expect(p.order).toEqual([{ id: 'run', name: '산책' }]);
    expect(p.defaultId).toBe('run');
    expect(p.goals.run).toMatchObject({ monthLabel: '10월', todayIndex: 5 });
  });

  it('적립판은 적립판만', () => {
    expect(Object.keys(tallyWidgetProps(snap(at(2026, 10, 6)), art).goals)).toEqual(['read']);
  });

  it('고를 목표가 없으면 defaultId는 null', () => {
    expect(monthWidgetProps(buildWidgetSnapshot([], at(2026, 10, 6)), art, at(2026, 10, 6)).defaultId).toBeNull();
  });

  it('다음 자정은 기기 기준 다음 날 0시', () => {
    expect(nextMidnight(at(2026, 10, 31, 23))).toEqual(new Date(2026, 10, 1, 0, 0));
  });
});
