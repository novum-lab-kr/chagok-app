import { getDb } from '../db/client';

/**
 * 성장 수 = 지금 붙어 있는 스티커 전체 수 (워치 설계 「성장 수」, PRD 4.14). 완성한 판의 스티커도 센다.
 * 떼거나 판을 지우면 줄고, 다시 붙이면 다시 는다 (2026-10-17). 예전 판이 저장한 최고치(app_settings 'watchGrowth')는 쓰지 않는다.
 */
export async function updateGrowth(): Promise<number> {
  const db = await getDb();
  const row = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM stickers');
  return Number(row?.n ?? 0);
}
