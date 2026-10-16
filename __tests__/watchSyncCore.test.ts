import { syncWatchOnce } from '../src/watch/syncCore';
import type { WatchPort, WatchSyncDeps } from '../src/watch/syncCore';
import type { WatchSnapshot } from '../src/watch/snapshot';
import type { WidgetRequest } from '../src/widgets/requests';

const req = (id: string): WidgetRequest => ({ id, goalId: 'g', kind: 'add', at: 1, dateKey: '2026-10-16' });
const snap = (growth: number) => ({ v: 1, growth } as unknown as WatchSnapshot);

function fakePort(queue: unknown[]) {
  const sent: WatchSnapshot[] = [];
  const acked: string[][] = [];
  const port: WatchPort = {
    readRequests: async () => queue,
    ack: async (ids) => { acked.push(ids); },
    send: async (s) => { sent.push(s); },
  };
  return { port, sent, acked };
}

function deps(over: Partial<WatchSyncDeps>): WatchSyncDeps {
  return {
    port: null,
    apply: async (rs) => ({ handled: rs.map((r) => r.id), changed: rs.length > 0 }),
    growth: async () => 5,
    snapshot: async (_d, g) => snap(g),
    now: () => new Date(2026, 9, 16),
    ...over,
  };
}

describe('syncWatchOnce', () => {
  it('요청을 처리하고 처리한 것만 지운 뒤, 성장 수를 담은 스냅샷을 보낸다', async () => {
    const { port, sent, acked } = fakePort([req('w1'), req('w2')]);
    const apply = jest.fn(async () => ({ handled: ['w1'], changed: true }));
    const out = await syncWatchOnce(deps({ port, apply }));
    expect(apply).toHaveBeenCalledWith([req('w1'), req('w2')]);
    expect(acked).toEqual([['w1']]);
    expect(sent.map((s) => s.growth)).toEqual([5]);
    expect(out).toEqual({ changed: true });
  });

  it('모양이 틀린 요청은 버리고 같은 id는 한 번만 넘긴다 (Review Focus 5)', async () => {
    const { port } = fakePort([req('w1'), req('w1'), { id: 'bad' }, { ...req('w3'), complete: 'yes' }]);
    const apply = jest.fn(async (rs: WidgetRequest[]) => ({ handled: rs.map((r) => r.id), changed: true }));
    await syncWatchOnce(deps({ port, apply }));
    expect(apply).toHaveBeenCalledWith([req('w1')]);
  });

  it('모양이 틀린 요청도 id가 있으면 큐에서 지운다 (최종 검토 2)', async () => {
    const { port, acked } = fakePort([req('w1'), { id: 'bad' }, { ...req('w3'), complete: 'yes' }, 42]);
    await syncWatchOnce(deps({ port }));
    expect(acked.flat().sort()).toEqual(['bad', 'w1', 'w3']);
  });

  it('요청 처리 뒤에 성장 수를 센다 — 방금 붙인 것이 들어간다', async () => {
    const order: string[] = [];
    const { port } = fakePort([req('w1')]);
    await syncWatchOnce(deps({
      port,
      apply: async (rs) => { order.push('apply'); return { handled: rs.map((r) => r.id), changed: true }; },
      growth: async () => { order.push('growth'); return 6; },
    }));
    expect(order).toEqual(['apply', 'growth']);
  });

  it('워치가 없어도 성장 수는 갱신하고 아무것도 보내지 않는다', async () => {
    const growth = jest.fn(async () => 3);
    const snapshot = jest.fn(async (_d: Date, g: number) => snap(g));
    expect(await syncWatchOnce(deps({ port: null, growth, snapshot }))).toEqual({ changed: false });
    expect(growth).toHaveBeenCalledTimes(1);
    expect(snapshot).not.toHaveBeenCalled();
  });

  it('요청이 없으면 apply를 부르지 않고 스냅샷만 보낸다', async () => {
    const { port, sent } = fakePort([]);
    const apply = jest.fn();
    await syncWatchOnce(deps({ port, apply }));
    expect(apply).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
  });
});
