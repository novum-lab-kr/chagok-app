import { getDb } from '../db/client';

/**
 * 성장 수 = max(저장된 최고치, 지금 붙어 있는 스티커 전체 수)를 계산해 저장하고 돌려준다 (워치 설계 「성장 수」, PRD 4.14).
 * 떼거나 판을 지워도 줄지 않고, 뗀 칸에 다시 붙여도 늘지 않는다. 완성한 판의 스티커도 센다.
 * 읽기, 세기, 쓰기를 한 문장으로 한다 — 사이에 로그아웃이나 복원이 끼어 비우기 전의 수를 다시 쓰지 않게.
 * 저장된 값이 깨졌으면(숫자가 아니면) 0으로 본다. 기록이 바뀔 때마다 부른다 — 지우기 전에 센 값이 남아야 줄지 않는다.
 */
export async function updateGrowth(): Promise<number> {
  const db = await getDb();
  await db.run(
    `INSERT INTO app_settings (key, value)
     SELECT 'watchGrowth', CAST(MAX(
       COALESCE((SELECT CAST(value AS INTEGER) FROM app_settings WHERE key = 'watchGrowth'), 0),
       (SELECT COUNT(*) FROM stickers)) AS TEXT)
     WHERE true
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  const row = await db.first<{ value: string }>("SELECT value FROM app_settings WHERE key = 'watchGrowth'");
  return Number(row?.value ?? 0);
}
