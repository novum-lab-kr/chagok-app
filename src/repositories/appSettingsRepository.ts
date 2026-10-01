import { getDb } from '../db/client';
import { newId } from './ids';

export type AppFlag = 'tutorialDone' | 'startDone';

/** 정해둔 적 없으면 false. 첫 실행에서 튜토리얼이 뜨도록 한다. */
export async function getFlag(key: AppFlag): Promise<boolean> {
  const db = await getDb();
  const row = await db.first<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key,
  );
  return row?.value === '1';
}

export async function setFlag(key: AppFlag, on: boolean): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key, on ? '1' : '0',
  );
}

/** 문자열 값. 계정·동기화 상태를 담는다 (계정·백업 설계 ②). 동기화하지 않는다. */
export type SettingKey =
  | 'deviceId' | 'accountUserId' | 'lastSyncedAt' | 'syncCursor' | 'pendingPhotoDownloads'
  /** 'Apple' | 'Google' | '개발' — 앱 설정 계정 칸 문구 */
  | 'accountProvider'
  /** '1'이면 마지막 전송이 실패했거나 보류가 남았다 */
  | 'syncProblem'
  /** '1'이면 첫 백업을 올리는 중 */
  | 'firstBackup'
  /** 로그인 풀림 안내를 한 번 보여준 계정 id */
  | 'sessionPrompted';

export async function getSetting(key: SettingKey): Promise<string | null> {
  const db = await getDb();
  const row = await db.first<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  return row?.value ?? null;
}

/** null이면 지운다. */
export async function setSetting(key: SettingKey, value: string | null): Promise<void> {
  const db = await getDb();
  if (value === null) {
    await db.run('DELETE FROM app_settings WHERE key = ?', key);
    return;
  }
  await db.run(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key, value,
  );
}

/** 설치마다 한 번 만든다. 서버 행의 "마지막으로 쓴 기기"다. */
export async function getDeviceId(): Promise<string> {
  const existing = await getSetting('deviceId');
  if (existing) return existing;
  const id = newId();
  await setSetting('deviceId', id);
  return id;
}
