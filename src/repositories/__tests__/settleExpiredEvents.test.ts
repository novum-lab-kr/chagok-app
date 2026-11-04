import { __resetAnalyticsForTest, setAnalyticsClient } from '../../analytics';
import { getDb } from '../../db/client';
import { settleExpiredPeriods } from '../goalRepository';

jest.mock('../../db/client', () => ({ getDb: jest.fn() }));
jest.mock('../../sync/outbox', () => ({ enqueue: jest.fn(async () => {}) }));

describe('settleExpiredPeriods 이벤트', () => {
  it('자동으로 완성한 판마다 period_end로 남긴다', async () => {
    __resetAnalyticsForTest();
    const events: unknown[][] = [];
    setAnalyticsClient({
      capture: (name, properties) => { events.push([name, properties]); },
      screen: () => {},
      identify: () => {},
      isIdentified: () => false,
    clearQueue: () => {},
      reset: () => {},
      setEnabled: () => {},
    });
    const tx = { run: jest.fn(async () => {}) };
    (getDb as jest.Mock).mockResolvedValue({
      all: async () => [{ id: 'first', end_date: '2026-10-01' }, { id: 'second', end_date: '2026-10-02' }],
      transaction: async (run: (active: typeof tx) => Promise<void>) => run(tx),
    });

    await settleExpiredPeriods(new Date(2026, 9, 31));

    expect(events).toEqual([
      ['goal_complete', { source: 'period_end' }],
      ['goal_complete', { source: 'period_end' }],
    ]);
  });
});
