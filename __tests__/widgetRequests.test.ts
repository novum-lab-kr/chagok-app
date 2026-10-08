import { isWidgetRequest, planRequest } from '../src/widgets/requests';
import type { WidgetRequest } from '../src/widgets/requests';
import type { Goal, Sticker } from '../src/domain/types';

const t = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'sprout',
  createdAt: t(2026, 10, 1), endDate: null, completedAt: null, completionSeen: false,
  lastPlacedAt: null, initialSlots: null, ...over,
});
const tally = (over: Partial<Goal> = {}) => goal({ boardType: 'tally', totalSlots: 5, ...over });
const st = (id: string, placedAt: number, slotIndex: number): Sticker =>
  ({ id, goalId: 'g', placedAt, slotIndex, stickerType: 'sprout' });
const req = (over: Partial<WidgetRequest> = {}): WidgetRequest =>
  ({ id: 'r1', goalId: 'g', kind: 'add', at: t(2026, 10, 6, 9), dateKey: '2026-10-06', ...over });
const none = new Set<string>();

describe('planRequest · 붙이기', () => {
  it('달력판은 요청 날짜 칸에 누른 시각으로 붙인다', () => {
    expect(planRequest(goal(), [], none, req())).toEqual({ action: 'place', slotIndex: 5, placedAt: t(2026, 10, 6, 9) });
  });

  it('어제 누른 요청은 어제 칸에 붙인다 (Review Focus 1)', () => {
    const r = req({ at: t(2026, 10, 5, 23, 59), dateKey: '2026-10-05' });
    expect(planRequest(goal(), [], none, r)).toEqual({ action: 'place', slotIndex: 4, placedAt: t(2026, 10, 5, 23, 59) });
  });

  it('그날 이미 붙어 있으면 건너뛴다', () => {
    expect(planRequest(goal(), [st('s', t(2026, 10, 6, 8), 5)], none, req())).toEqual({ action: 'skip', reason: 'done' });
  });

  it('같은 요청 id의 스티커가 있으면 건너뛴다 (Review Focus 3)', () => {
    expect(planRequest(tally(), [st('r1', t(2026, 10, 6, 9), 0)], none, req())).toEqual({ action: 'skip', reason: 'done' });
  });

  it('기간 밖 날짜는 건너뛴다', () => {
    expect(planRequest(goal({ endDate: '2026-10-05' }), [], none, req())).toEqual({ action: 'skip', reason: 'outside' });
  });

  it('적립판은 번호가 가장 작은 빈칸에 붙인다', () => {
    expect(planRequest(tally(), [st('a', t(2026, 10, 2), 0), st('b', t(2026, 10, 3), 2)], none, req()))
      .toEqual({ action: 'place', slotIndex: 1, placedAt: t(2026, 10, 6, 9) });
  });

  it('마지막 칸은 위젯에서 붙이지 않는다 (앱에서 완성 확인)', () => {
    const four = [0, 1, 2, 3].map((i) => st(`s${i}`, t(2026, 10, 2), i));
    expect(planRequest(tally(), four, none, req())).toEqual({ action: 'skip', reason: 'last' });
    const cal = goal({ createdAt: t(2026, 10, 5), endDate: '2026-10-06' });
    expect(planRequest(cal, [st('a', t(2026, 10, 5), 4)], none, req())).toEqual({ action: 'skip', reason: 'last' });
  });

  it('지운 목표·완성한 판은 건너뛴다 (Review Focus 4)', () => {
    expect(planRequest(null, [], none, req())).toEqual({ action: 'skip', reason: 'gone' });
    expect(planRequest(goal({ completedAt: t(2026, 10, 6, 8) }), [], none, req())).toEqual({ action: 'skip', reason: 'completed' });
  });
});

describe('planRequest · 되돌리기', () => {
  it('달력판은 요청 날짜의 스티커를 뗀다', () => {
    expect(planRequest(goal(), [st('s', t(2026, 10, 6, 8), 5)], none, req({ kind: 'undo' })))
      .toEqual({ action: 'remove', stickerId: 's' });
  });

  it('적립판은 그날 마지막으로 붙인 스티커를 뗀다', () => {
    const list = [st('old', t(2026, 10, 5), 0), st('a', t(2026, 10, 6, 8), 1), st('b', t(2026, 10, 6, 10), 2)];
    expect(planRequest(tally(), list, none, req({ kind: 'undo', at: t(2026, 10, 6, 11) }))).toEqual({ action: 'remove', stickerId: 'b' });
  });

  it('위젯에서 누른 뒤 앱에서 붙인 스티커는 떼지 않는다', () => {
    const list = [st('a', t(2026, 10, 6, 8), 0), st('app', t(2026, 10, 6, 10), 1)];
    expect(planRequest(tally(), list, none, req({ kind: 'undo', at: t(2026, 10, 6, 9) }))).toEqual({ action: 'remove', stickerId: 'a' });
    expect(planRequest(goal(), [st('app', t(2026, 10, 6, 10), 5)], none, req({ kind: 'undo', at: t(2026, 10, 6, 9) })))
      .toEqual({ action: 'skip', reason: 'nothing' });
  });

  it('기록이 있으면 떼지 않는다 (Review Focus 6)', () => {
    expect(planRequest(goal(), [st('s', t(2026, 10, 6, 8), 5)], new Set(['s']), req({ kind: 'undo' })))
      .toEqual({ action: 'skip', reason: 'record' });
  });

  it('그날 붙인 것이 없으면 건너뛴다', () => {
    expect(planRequest(goal(), [], none, req({ kind: 'undo' }))).toEqual({ action: 'skip', reason: 'nothing' });
  });
});

describe('planRequest · 칸 떼기 (적립판 위젯, 2026-10-07)', () => {
  const remove = (slotIndex: number, over: Partial<WidgetRequest> = {}) => req({ kind: 'remove', slotIndex, at: t(2026, 10, 6, 11), ...over });

  it('누른 칸의 스티커를 뗀다', () => {
    const list = [st('a', t(2026, 10, 6, 8), 0), st('b', t(2026, 10, 6, 10), 1)];
    expect(planRequest(tally(), list, none, remove(0))).toEqual({ action: 'remove', stickerId: 'a' });
  });

  it('요청 날짜가 아닌 날 붙인 칸은 떼지 않는다', () => {
    expect(planRequest(tally(), [st('old', t(2026, 10, 5), 0)], none, remove(0))).toEqual({ action: 'skip', reason: 'nothing' });
  });

  it('누른 뒤 앱에서 붙인 칸은 떼지 않는다', () => {
    expect(planRequest(tally(), [st('app', t(2026, 10, 6, 12), 0)], none, remove(0))).toEqual({ action: 'skip', reason: 'nothing' });
  });

  it('빈칸이면 건너뛰고, 기록이 있으면 떼지 않는다', () => {
    expect(planRequest(tally(), [], none, remove(3))).toEqual({ action: 'skip', reason: 'nothing' });
    expect(planRequest(tally(), [st('s', t(2026, 10, 6, 8), 0)], new Set(['s']), remove(0))).toEqual({ action: 'skip', reason: 'record' });
  });
});

describe('isWidgetRequest', () => {
  it('칸 떼기는 칸 번호가 있어야 한다', () => {
    expect(isWidgetRequest(req({ kind: 'remove', slotIndex: 2 }))).toBe(true);
    expect(isWidgetRequest(req({ kind: 'remove' }))).toBe(false);
    expect(isWidgetRequest(req({ kind: 'remove', slotIndex: -1 }))).toBe(false);
    expect(isWidgetRequest(req({ kind: 'remove', slotIndex: 1.5 }))).toBe(false);
  });

  it('위젯이 쌓은 모양만 받는다', () => {
    expect(isWidgetRequest(req())).toBe(true);
    expect(isWidgetRequest({ ...req(), kind: 'move' })).toBe(false);
    expect(isWidgetRequest({ ...req(), dateKey: '2026-10-6' })).toBe(false);
    expect(isWidgetRequest(null)).toBe(false);
  });
});
