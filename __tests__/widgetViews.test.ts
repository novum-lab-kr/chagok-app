import type { ReactElement } from 'react';
import type { GoalWidgetProps, MonthWidgetProps, TallyWidgetProps } from '../src/widgets/widgetProps';

jest.mock('expo-widgets', () => ({ createWidget: (_name: string, fn: unknown) => fn }));
jest.mock('@expo/ui/swift-ui', () => new Proxy({}, { get: (_t, name) => (name === '__esModule' ? true : String(name)) }));
jest.mock('@expo/ui/swift-ui/modifiers', () => new Proxy({}, {
  get: (_t, name) => (name === '__esModule' ? true
    : name === 'shapes' ? { rectangle: () => ({ shape: 'rectangle' }) }
    : (...args: unknown[]) => ({ [String(name)]: args })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChagokGoal = require('../widgets/ios/ChagokGoal').default as (p: GoalWidgetProps, env: object) => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChagokMonth = require('../widgets/ios/ChagokMonth').default as (p: MonthWidgetProps, env: object) => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChagokTally = require('../widgets/ios/ChagokTally').default as (p: TallyWidgetProps, env: object) => ReactElement;

type El = { type: unknown; props: Record<string, unknown> };
function all(node: unknown, out: El[] = []): El[] {
  if (Array.isArray(node)) { node.forEach((n) => all(n, out)); return out; }
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as El;
    out.push(el);
    all(el.props.children, out);
  }
  return out;
}
const texts = (root: unknown) => all(root).flatMap((e) => (typeof e.props.children === 'string' ? [e.props.children] : []));
const button = (root: unknown) => all(root).find((e) => e.type === 'Button')!;
const hasPlaceLink = (root: unknown) => JSON.stringify(all(root).map((e) => e.props)).includes('?place=1');

const t = (d: number, h = 12, m = 0) => new Date(2026, 9, d, h, m).getTime();
const shared = { order: [{ id: 'run', name: '런닝' }], defaultId: 'run', today: '2026-10-06', mascotYet: 'y', mascotDone: 'd', mascotFull: 'f', mascotSleepy: 'z', bubbles: { ivory: 'bi', white: 'bw', ink: 'bk' } };
const card = { id: 'run', name: '런닝', placed: 5, total: 31, placedToday: false, undoable: false, remaining: null as number | null, sticker: 's' };
// expo-widgets는 항목 시각을 env.date(Date)로 넘긴다(timestamp는 지운다).
const env = (ts: number) => ({ date: new Date(ts), configuration: { background: 'ivory' } });
const lateTap = { id: 'w1', goalId: 'run', kind: 'add' as const, at: t(6, 23, 50), dateKey: '2026-10-06' };

describe('위젯 화면 로직', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(t(7, 0, 5)); });
  afterEach(() => jest.useRealTimers());

  it('누르면 요청만 더하고, 붙인 시각은 누른 순간이다', () => {
    const root = ChagokGoal({ ...shared, goals: { run: card }, requests: [] } as GoalWidgetProps, env(t(6)));
    const out = (button(root).props.onPress as () => { requests: { kind: string; at: number; dateKey: string }[]; goals?: unknown })();
    expect(out.goals).toBeUndefined();
    expect(out.requests).toEqual([expect.objectContaining({ kind: 'add', at: t(7, 0, 5), dateKey: '2026-10-07' })]);
  });

  it('같은 날 요청이 있으면 Nice!이고 다시 누르면 뗀다', () => {
    jest.setSystemTime(t(6, 23, 52));
    const root = ChagokGoal({ ...shared, goals: { run: card }, requests: [lateTap] } as GoalWidgetProps, env(t(6, 23, 51)));
    expect(texts(root)).toContain('Nice!');
    const out = (button(root).props.onPress as () => { requests: { kind: string }[] })();
    expect(out.requests[1].kind).toBe('undo');
  });

  it('자정 항목에서도 어젯밤 요청이 보이고 오늘 붙일 수 있다 (Review Focus 2)', () => {
    const days = Array.from({ length: 31 }, (_, i) => (i < 6 ? 'missed' : 'future')) as MonthWidgetProps['goals'][string]['days'];
    const month = { ...card, monthLabel: '10월', days, firstWeekday: 4, todayIndex: 6 };
    const root = ChagokMonth({ ...shared, goals: { run: month }, requests: [lateTap] } as MonthWidgetProps, env(t(7, 0, 0)));
    expect(all(root).filter((e) => e.type === 'Image' && e.props.uiImage === 's')).toHaveLength(1); // 10/6 칸
    expect(texts(root)).toContain('Ready?');
    const todayButton = all(root).find((e) => e.type === 'Button' && e.props.target === 'day-7')!;
    const out = (todayButton.props.onPress as () => { requests: { kind: string; dateKey: string }[] })();
    expect(out.requests[1]).toMatchObject({ kind: 'add', dateKey: '2026-10-07' });
  });

  it('처리 안 된 요청을 빼고 남은 칸이 1이면 판 화면을 연다', () => {
    const tallyLike = { ...card, remaining: 2 };
    expect(hasPlaceLink(ChagokGoal({ ...shared, goals: { run: tallyLike }, requests: [lateTap] } as GoalWidgetProps, env(t(7, 9))))).toBe(true);
    expect(hasPlaceLink(ChagokGoal({ ...shared, goals: { run: tallyLike }, requests: [] } as GoalWidgetProps, env(t(7, 9))))).toBe(false);
  });

  it('카드의 달과 항목의 달이 다르면 다른 달 요청을 칸에 합치지 않는다', () => {
    const days = Array.from({ length: 31 }, () => 'future') as MonthWidgetProps['goals'][string]['days'];
    const month = { ...card, monthLabel: '10월', days, firstWeekday: 4, todayIndex: 0 };
    const novTap = { id: 'w2', goalId: 'run', kind: 'add' as const, at: new Date(2026, 10, 1, 0, 3).getTime(), dateKey: '2026-11-01' };
    const root = ChagokMonth({ ...shared, goals: { run: month }, requests: [novTap] } as MonthWidgetProps, env(new Date(2026, 10, 1, 0, 5).getTime()));
    expect(all(root).filter((e) => e.type === 'Image' && e.props.uiImage === 's')).toHaveLength(0);
  });

  it('시스템이 자정 항목을 자정 전에 미리 그려도 그 항목 날짜로 그린다', () => {
    jest.setSystemTime(t(6, 23, 56)); // 지금은 아직 10/6 — iOS는 자정 항목을 이때 미리 그려 둔다
    const root = ChagokGoal({ ...shared, goals: { run: card }, requests: [lateTap] }, env(t(7, 0, 0)));
    expect(texts(root)).toContain('Ready?');
    expect(texts(root)).not.toContain('Nice!');
  });

  describe('장면이 바닥난 뒤 (앱을 며칠 안 열어 마지막 항목이 지난날일 때)', () => {
    beforeEach(() => { jest.setSystemTime(t(7, 9)); });
    const stale = env(t(5, 0, 0)); // 마지막 항목은 10/5, 지금은 10/7

    it('지금 날짜를 오늘로 쓰고, 그날 붙였다는 앱 값은 무시한다', () => {
      const root = ChagokGoal({ ...shared, goals: { run: { ...card, placedToday: true, undoable: true } }, requests: [] }, stale);
      expect(texts(root)).toContain('Ready?');
      const out = (button(root).props.onPress as () => { requests: { kind: string; dateKey: string }[] })();
      expect(out.requests[0]).toMatchObject({ kind: 'add', dateKey: '2026-10-07' });
    });

    it('오늘 누른 요청이 있으면 Nice!이고 다시 누르면 뗀다', () => {
      const todayTap = { id: 'w3', goalId: 'run', kind: 'add' as const, at: t(7, 8), dateKey: '2026-10-07' };
      const root = ChagokGoal({ ...shared, goals: { run: card }, requests: [todayTap] }, stale);
      expect(texts(root)).toContain('Nice!');
      const out = (button(root).props.onPress as () => { requests: { kind: string }[] })();
      expect(out.requests[1].kind).toBe('undo');
    });

    it('이번 달은 오늘 칸에 요청을 합친다', () => {
      const days = Array.from({ length: 31 }, (_, i) => (i < 4 ? 'missed' : 'future')) as MonthWidgetProps['goals'][string]['days'];
      const month = { ...card, monthLabel: '10월', days, firstWeekday: 4, todayIndex: 4 };
      const todayTap = { id: 'w3', goalId: 'run', kind: 'add' as const, at: t(7, 8), dateKey: '2026-10-07' };
      const root = ChagokMonth({ ...shared, goals: { run: month }, requests: [todayTap] } as MonthWidgetProps, stale);
      expect(all(root).filter((e) => e.type === 'Image' && e.props.uiImage === 's')).toHaveLength(1);
      expect(texts(root)).toContain('Nice!');
    });

    it('이번 달은 지난 빈 날을 눌러 그 날짜에 붙이고, 앞날은 누르지 않는다 (2026-10-08)', () => {
      const days = Array.from({ length: 31 }, (_, i) => (i < 6 ? 'missed' : 'future')) as MonthWidgetProps['goals'][string]['days'];
      const month = { ...card, monthLabel: '10월', days, firstWeekday: 4, todayIndex: 6 };
      const root = ChagokMonth({ ...shared, goals: { run: month }, requests: [] } as MonthWidgetProps, env(t(7, 9)));
      const day3 = all(root).find((e) => e.type === 'Button' && e.props.target === 'day-3')!;
      const out = (day3.props.onPress as () => { requests: { kind: string; dateKey: string }[] })();
      expect(out.requests[0]).toMatchObject({ kind: 'add', dateKey: '2026-10-03' });
      expect(all(root).some((e) => e.type === 'Button' && e.props.target === 'day-8')).toBe(false);
    });

    it('적립판은 그날 붙인 칸을 오늘 칸으로 보지 않는다 — 누르면 판 화면', () => {
      const tally = { ...card, from: 1, cells: ['filled', 'filled', 'empty'], todaySlots: [1], removableSlots: [1], remaining: 10 };
      const root = ChagokTally({ ...shared, goals: { run: tally }, requests: [] } as TallyWidgetProps, stale);
      expect(texts(root)).toContain('Ready?');
      const second = all(root).filter((e) => e.type === 'Link' || e.type === 'Button')[1];
      expect(second.type).toBe('Link');
    });
  });

  it('차곡이 표정: 아직 = 기본, 붙임 = 미소, 다 채움 = 신남', () => {
    const face = (root: unknown) => all(root).filter((e) => e.type === 'Image').map((e) => e.props.uiImage).find((u) => u === 'y' || u === 'd' || u === 'f');
    expect(face(ChagokGoal({ ...shared, goals: { run: card }, requests: [] }, env(t(7, 9))))).toBe('y');
    expect(face(ChagokGoal({ ...shared, goals: { run: { ...card, placedToday: true, undoable: true } }, requests: [] }, env(t(7, 9))))).toBe('d');
    expect(face(ChagokGoal({ ...shared, goals: { run: { ...card, placed: 31, total: 31 } }, requests: [] }, env(t(7, 9))))).toBe('f');
  });
});

describe('적립판 위젯 · 다음 묶음 (2026-10-10 실기기)', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(t(10, 21)); });
  afterEach(() => jest.useRealTimers());
  // 30칸 판, 19칸 붙임: 11~20 묶음에 20번만 비어 있다
  const tally = { ...card, placed: 19, total: 30, remaining: 11, from: 11, cells: [...Array(9).fill('filled'), 'empty'], nextCells: Array(10).fill('empty'), todaySlots: [], removableSlots: [] };
  const add = (id: string, at: number) => ({ id, goalId: 'run', kind: 'add' as const, at, dateKey: '2026-10-10' });
  // 칸 번호만. 맨 앞 숫자는 큰 %다
  const numbers = (root: unknown) => texts(root).filter((s) => /^\d+$/.test(s)).slice(1);
  it('위젯에서 묶음을 다 채우면 앱을 열지 않아도 다음 묶음을 그린다', () => {
    const root = ChagokTally({ ...shared, goals: { run: tally }, requests: [add('a', t(10, 20))] } as TallyWidgetProps, env(t(10, 9)));
    expect(numbers(root)).toEqual(['21', '22', '23', '24', '25', '26', '27', '28', '29', '30']);
  });
  it('다음 묶음의 빈칸을 누르면 붙이고, 그 칸을 다시 누르면 뗀다', () => {
    const root = ChagokTally({ ...shared, goals: { run: tally }, requests: [add('a', t(10, 20)), add('b', t(10, 20, 1))] } as TallyWidgetProps, env(t(10, 9)));
    expect(numbers(root)[0]).toBe('22');
    const first = all(root).find((e) => e.type === 'Button' && e.props.target === 'cell-0')!;
    const out = (first.props.onPress as () => { requests: { kind: string; slotIndex?: number }[] })();
    expect(out.requests[2]).toMatchObject({ kind: 'remove', slotIndex: 20 });
  });
  it('아직 빈칸이 있으면 지금 묶음 그대로다', () => {
    const root = ChagokTally({ ...shared, goals: { run: tally }, requests: [] } as TallyWidgetProps, env(t(10, 9)));
    expect(numbers(root)).toEqual(['20']);
  });
});

describe('체험이 끝난 묶음 (2026-10-08)', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(t(7, 9)); });
  afterEach(() => jest.useRealTimers());
  it('locked면 붙이는 버튼 대신 앱을 여는 링크', () => {
    const locked = { ...card, locked: true };
    expect(hasPlaceLink(ChagokGoal({ ...shared, goals: { run: locked }, requests: [] } as GoalWidgetProps, env(t(7, 9))))).toBe(true);
    const tally = { ...locked, cells: Array(10).fill('empty'), from: 1 };
    expect(hasPlaceLink(ChagokTally({ ...shared, goals: { run: tally }, requests: [] } as unknown as TallyWidgetProps, env(t(7, 9))))).toBe(true);
  });
});

describe('지금 붙일 칸 표시 (2026-10-16 결정 6 T1: 앱처럼 네 귀퉁이 괄호)', () => {
  const props = (root: unknown) => JSON.stringify(all(root).map((e) => e.props));
  const rects = (root: unknown) => all(root).filter((e) => e.type === 'Rectangle').length;
  it('달력 위젯의 오늘 빈 칸은 괄호, 살구 테두리 없음', () => {
    const days = Array.from({ length: 31 }, (_, i) => (i < 6 ? 'missed' : 'future'));
    const month = { ...card, monthLabel: '10월', days, firstWeekday: 4, todayIndex: 6 };
    const root = ChagokMonth({ ...shared, goals: { run: month }, requests: [] } as unknown as MonthWidgetProps, env(t(7, 9)));
    expect(props(root)).not.toContain('#FD855F');
    expect(rects(root)).toBe(8);
  });
  it('적립판 위젯의 다음 빈칸은 괄호, 살구 테두리 없음', () => {
    const tally = { ...card, from: 1, cells: ['filled', 'empty', 'empty'], todaySlots: [], removableSlots: [], remaining: 10 };
    const root = ChagokTally({ ...shared, goals: { run: tally }, requests: [] } as unknown as TallyWidgetProps, env(t(7, 9)));
    expect(props(root)).not.toContain('#FD855F');
    expect(rects(root)).toBe(8);
  });
});
