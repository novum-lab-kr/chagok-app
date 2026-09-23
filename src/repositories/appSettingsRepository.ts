import { getDb } from '../db/client';

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
