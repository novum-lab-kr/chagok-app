import { getDb } from '../../db/client';
import { wipeDevice } from '../wipe';

jest.mock('../../db/client', () => ({ getDb: jest.fn() }));
jest.mock('../changes', () => ({ notifyLocalChange: jest.fn() }));

describe('wipeDevice', () => {
  it('설치 ID와 사용 기록 동의, 오류 보고 끄기는 지우지 않는다', async () => {
    const exec = jest.fn(async (_sql: string) => {});
    (getDb as jest.Mock).mockResolvedValue({
      transaction: async (run: (tx: { exec: typeof exec }) => Promise<void>) => run({ exec }),
    });

    await wipeDevice(() => {});

    expect(exec.mock.calls.flat().join(' ')).toContain("key NOT IN ('deviceId', 'analyticsOff', 'errorReportOff')");
  });
});
