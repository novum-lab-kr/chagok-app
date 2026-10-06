import { syncWidgetsOnce } from '../src/widgets/syncCore';
import type { SyncDeps, TimelineEntry } from '../src/widgets/syncCore';
import type { WidgetRequest } from '../src/widgets/requests';

const r = (id: string): WidgetRequest => ({ id, goalId: 'g', kind: 'add', at: 1, dateKey: '2026-10-06' });

function port(batches: unknown[][]) {
  const written: TimelineEntry<Record<string, unknown>>[][] = [];
  let call = 0;
  return {
    written,
    readRequests: async () => batches[Math.min(call++, batches.length - 1)],
    write: (e: TimelineEntry<Record<string, unknown>>[]) => { written.push(e); },
  };
}

function deps(goal: ReturnType<typeof port>, applied: string[][] = []): SyncDeps {
  return {
    widgets: { goal, month: port([[]]), tally: port([[]]) },
    apply: async (reqs) => { applied.push(reqs.map((x) => x.id)); return { handled: reqs.map((x) => x.id), changed: reqs.length > 0 }; },
    props: async (date) => ({ goal: { at: date.getTime(), requests: [] }, month: { requests: [] }, tally: { requests: [] } }),
    now: () => new Date(2026, 9, 6, 12),
  };
}

describe('syncWidgetsOnce', () => {
  it('요청을 반영하고 지금 + 앞으로 7번의 자정, 8개 항목을 쓴다 (항목마다 그 날짜의 props)', async () => {
    const goal = port([[r('a')], []]);
    const applied: string[][] = [];
    await syncWidgetsOnce(deps(goal, applied));
    expect(applied).toEqual([['a']]);
    const expected = [new Date(2026, 9, 6, 12), ...[7, 8, 9, 10, 11, 12, 13].map((d) => new Date(2026, 9, d))];
    expect(goal.written[0].map((e) => e.date)).toEqual(expected);
    expect(goal.written[0].map((e) => e.props.at)).toEqual(expected.map((d) => d.getTime()));
    expect(goal.written[0][0].props.requests).toEqual([]);
  });

  it('읽은 뒤 들어온 요청은 모든 항목에 남긴다 (Review Focus 5)', async () => {
    const goal = port([[r('a')], [r('a'), r('b')]]);
    await syncWidgetsOnce(deps(goal));
    expect(goal.written[0]).toHaveLength(8);
    for (const e of goal.written[0]) expect(e.props.requests).toEqual([r('b')]);
  });

  it('모양이 틀린 요청은 버린다', async () => {
    const goal = port([[{ id: 'x' }, r('a')], []]);
    const applied: string[][] = [];
    await syncWidgetsOnce(deps(goal, applied));
    expect(applied).toEqual([['a']]);
  });
  it('null은 빼고 쓴다 — UserDefaults가 null을 못 담아 updateTimeline이 던진다 (목표 0개의 defaultId, 종료일 없는 판의 remaining)', async () => {
    const goal = port([[]]);
    const d = deps(goal);
    d.props = async () => ({ goal: { defaultId: null, goals: { a: { remaining: null, placed: 1 } }, requests: [] }, month: { requests: [] }, tally: { requests: [] } });
    await syncWidgetsOnce(d);
    expect(goal.written[0][0].props).toEqual({ goals: { a: { placed: 1 } }, requests: [] });
    expect('defaultId' in goal.written[0][0].props).toBe(false);
  });

  it('기록을 바꿨는지 돌려준다', async () => {
    expect(await syncWidgetsOnce(deps(port([[r('a')], []])))).toEqual({ changed: true });
    expect(await syncWidgetsOnce(deps(port([[]])))).toEqual({ changed: false });
  });
});
