import { setDriverFactory, getDb, currentSchemaVersion } from '../src/db/client';
import { SCHEMA_VERSION } from '../src/db/schema';
import { createNodeDriver } from './support/nodeDriver';
import type { DbDriver } from '../src/db/driver';

/** 같은 드라이버를 유지해야 마이그레이션 누적을 검증할 수 있다 */
function pinned(): { use: () => void } {
  let driver: DbDriver | null = null;
  return {
    use() {
      setDriverFactory(async () => (driver ??= createNodeDriver()));
    },
  };
}

describe('스키마 마이그레이션', () => {
  it('빈 DB를 최신 버전까지 올린다', async () => {
    setDriverFactory(async () => createNodeDriver());
    await getDb();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);
  });

  it('두 번 실행해도 깨지지 않는다 (멱등)', async () => {
    const p = pinned();
    p.use();
    await getDb();
    p.use(); // 같은 DB로 다시 초기화
    await expect(getDb()).resolves.toBeDefined();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);
  });

  it('goals에 default_sticker_id 컬럼이 있다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    const cols = await db.all<{ name: string }>(`PRAGMA table_info(goals)`);
    expect(cols.map((c) => c.name)).toContain('default_sticker_id');
  });

  it('stickers 기본 스티커 종류가 폐기된 stamp가 아니다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    const col = (await db.all<{ name: string; dflt_value: string | null }>(
      `PRAGMA table_info(stickers)`,
    )).find((c) => c.name === 'sticker_type');
    expect(col?.dflt_value).not.toContain('stamp');
  });

  it('외래키 CASCADE가 켜져 있다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    const r = await db.first<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(r?.foreign_keys).toBe(1);
  });
});
