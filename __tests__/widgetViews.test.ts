import type { ReactElement } from 'react';
import type { GoalWidgetProps, MonthWidgetProps } from '../src/widgets/widgetProps';

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
const shared = { order: [{ id: 'run', name: '런닝' }], defaultId: 'run', today: '2026-10-06', mascotYet: 'y', mascotDone: 'd', mascotSleepy: 'z', bubbles: { ivory: 'bi', white: 'bw', ink: 'bk' } };
const card = { id: 'run', name: '런닝', placed: 5, total: 31, placedToday: false, undoable: false, remaining: null as number | null, sticker: 's' };
const env = (ts: number) => ({ timestamp: ts, configuration: { background: 'ivory' } });
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
    const out = (button(root).props.onPress as () => { requests: { kind: string; dateKey: string }[] })();
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
});
