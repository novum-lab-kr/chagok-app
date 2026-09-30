import { getDb } from '../db/client';
import { newId } from './ids';

export type AppFlag = 'tutorialDone';

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
export type SettingKey = 'deviceId' | 'accountUserId' | 'lastSyncedAt' | 'syncCursor' | 'pendingPhotoDownloads';

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
