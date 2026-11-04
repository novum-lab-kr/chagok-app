import { getDb } from '../../db/client';
import { getDeviceId } from '../appSettingsRepository';

jest.mock('../../db/client', () => ({ getDb: jest.fn() }));

function fakeSettings() {
  const rows = new Map<string, string>();
  (getDb as jest.Mock).mockResolvedValue({
    first: async (_sql: string, key: string) => {
      const value = rows.get(key);
      return value === undefined ? null : { value };
    },
    run: async (_sql: string, key: string, value: string) => { rows.set(key, value); },
  });
  return rows;
}

describe('getDeviceId', () => {
  it('첫 실행에 동시에 불러도 ID가 하나다', async () => {
    fakeSettings();
    const [first, second, third] = await Promise.all([getDeviceId(), getDeviceId(), getDeviceId()]);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(await getDeviceId()).toBe(first);
  });

  it('실패하면 다음 호출에서 다시 시도한다', async () => {
    (getDb as jest.Mock).mockRejectedValueOnce(new Error('db'));
    await expect(getDeviceId()).rejects.toThrow('db');
    fakeSettings();
    await expect(getDeviceId()).resolves.toEqual(expect.any(String));
  });
});
