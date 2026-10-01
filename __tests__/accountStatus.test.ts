import { createGoal } from '../src/repositories/goalRepository';
import { getSetting, setSetting } from '../src/repositories/appSettingsRepository';
import { hold, takeBatch } from '../src/sync/outbox';
import { formatBackedUpAt, localOnlyCount, providerFromAuth, readAccountState, recordSyncFailure, recordSyncSuccess } from '../src/sync/accountStatus';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('계정 상태', () => {
  it('연결한 적 없으면 local', async () => {
    expect(await readAccountState(null)).toEqual({ state: 'local' });
  });
  it('연결한 계정과 세션이 다르면(없으면) 로그인이 필요하다', async () => {
    await setSetting('accountUserId', 'u1'); await setSetting('accountProvider', 'Google');
    expect(await readAccountState(null)).toEqual({ state: 'needsLogin', provider: 'Google' });
  });
  it('첫 백업 중 → 실패 표시 → 성공 순서로 바뀐다', async () => {
    await setSetting('accountUserId', 'u1'); await setSetting('accountProvider', '개발');
    await setSetting('firstBackup', '1');
    expect((await readAccountState('u1')).state).toBe('firstBackup');
    await recordSyncFailure();
    expect((await readAccountState('u1')).state).toBe('firstBackup'); // 첫 백업이 끝나기 전에는 그대로
    await recordSyncSuccess(1000);
    expect(await readAccountState('u1')).toEqual({ state: 'synced', provider: '개발', lastSyncedAt: 1000 });
    await recordSyncFailure();
    expect((await readAccountState('u1')).state).toBe('pending');
  });
  it('보류가 남으면 성공해도 pending이고 마지막 백업 시각은 그대로다', async () => {
    await setSetting('accountUserId', 'u1'); await setSetting('accountProvider', 'Apple');
    await setSetting('lastSyncedAt', '500');
    await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    const [e] = await takeBatch(1);
    await hold(e, '거부');
    await recordSyncSuccess(1000);
    expect((await readAccountState('u1')).state).toBe('pending');
    expect(await getSetting('lastSyncedAt')).toBe('500');
    expect(await localOnlyCount()).toBe(1);
  });
  it('로그인 방식 표시', () => {
    expect(providerFromAuth('apple')).toBe('Apple');
    expect(providerFromAuth('google')).toBe('Google');
    expect(providerFromAuth('email')).toBe('개발');
  });
  it('백업 시각 표기', () => {
    const now = new Date(2026, 9, 1, 15, 0);
    expect(formatBackedUpAt(new Date(2026, 9, 1, 9, 5).getTime(), now)).toBe('오늘 9:05');
    expect(formatBackedUpAt(new Date(2026, 8, 30, 21, 40).getTime(), now)).toBe('어제 21:40');
    expect(formatBackedUpAt(new Date(2026, 8, 27, 8, 0).getTime(), now)).toBe('9월 27일');
  });
});
