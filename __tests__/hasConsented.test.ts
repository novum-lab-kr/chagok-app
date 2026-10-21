import { hasConsented } from '../src/sync/account';

const row = (data: { agreed_at: number | null } | null, error: { message: string } | null = null) => Promise.resolve({ data, error });

describe('hasConsented', () => {
  it('동의 시각이 있으면 동의한 계정이다', async () => {
    await expect(hasConsented(row({ agreed_at: 1_760_000_000_000 }))).resolves.toBe(true);
  });
  it('행이 없으면 처음 만든 계정이다', async () => {
    await expect(hasConsented(row(null))).resolves.toBe(false);
  });
  it('행은 있는데 동의 시각이 비어 있으면 동의하지 않은 계정이다', async () => {
    await expect(hasConsented(row({ agreed_at: null }))).resolves.toBe(false);
  });
  it('읽지 못하면 던진다 — 모르는 채로 동의를 건너뛰지 않게', async () => {
    await expect(hasConsented(row(null, { message: 'offline' }))).rejects.toThrow('offline');
  });
});
