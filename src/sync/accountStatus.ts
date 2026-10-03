import type { AccountProvider } from '../design-system/account-screens';
import { getSetting, setSetting } from '../repositories/appSettingsRepository';
import { pendingCount } from './outbox';
import { notifySyncStatus } from './syncGate';

export type AccountState =
  | { state: 'local' }
  | { state: 'synced'; provider: AccountProvider; lastSyncedAt: number }
  | { state: 'pending' | 'firstBackup' | 'needsLogin'; provider: AccountProvider };

export function providerFromAuth(provider: string | undefined): AccountProvider {
  if (provider === 'apple') return 'Apple';
  if (provider === 'google') return 'Google';
  return '개발';
}

/** 앱 설정 계정 칸 (시안 2C). 복원 중 표시는 연결 화면이 다이얼로그로 덮으므로 여기서 다루지 않는다. */
export async function readAccountState(sessionUserId: string | null): Promise<AccountState> {
  const userId = await getSetting('accountUserId');
  if (!userId) return { state: 'local' };
  const provider = ((await getSetting('accountProvider')) ?? '개발') as AccountProvider;
  if (sessionUserId !== userId) return { state: 'needsLogin', provider };
  if (await getSetting('firstBackup')) return { state: 'firstBackup', provider };
  if (await getSetting('syncProblem')) return { state: 'pending', provider };
  const last = await getSetting('lastSyncedAt');
  // 연결 직후 아직 한 번도 보내지 않았으면 첫 백업 중이다 — "모두 백업했어요"라고 하지 않는다 (2026-10-02 테스트)
  if (!last) return { state: 'firstBackup', provider };
  return { state: 'synced', provider, lastSyncedAt: Number(last) };
}

/** 전송이 끝났다. 보류가 남으면 "백업하지 못한 기록"으로 두고 마지막 백업 시각은 바꾸지 않는다 (2026-10-01). */
export async function recordSyncSuccess(now = Date.now()): Promise<void> {
  const { held } = await pendingCount();
  await setSetting('firstBackup', null);
  if (held > 0) {
    await setSetting('syncProblem', '1');
  } else {
    await setSetting('syncProblem', null);
    await setSetting('lastSyncedAt', String(now));
  }
  notifySyncStatus();
}

/** 전송이 실패했다(네트워크 등). 첫 백업 중이면 첫 백업 표시를 그대로 둔다. */
export async function recordSyncFailure(): Promise<void> {
  await setSetting('syncProblem', '1');
  notifySyncStatus();
}

/** 아직 서버에 없는 기록 수. 로그인이 풀린 채 로그아웃할 때 경고에 쓴다. */
export async function localOnlyCount(): Promise<number> {
  const { pending, held } = await pendingCount();
  return pending + held;
}

const hm = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
/** 앱 설정 "오늘 9:20에 모두 백업했어요"의 앞부분. */
export function formatBackedUpAt(ms: number, now: Date): string {
  const d = new Date(ms);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return `오늘 ${hm(d)}`;
  if (diff === 1) return `어제 ${hm(d)}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
