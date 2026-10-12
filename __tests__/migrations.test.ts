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

  it('기본 스티커 기본값은 컬러 새싹이다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    const dflt = async (table: string, col: string) => (await db.all<{ name: string; dflt_value: string | null }>(
      `PRAGMA table_info(${table})`,
    )).find((c) => c.name === col)?.dflt_value;
    expect(await dflt('stickers', 'sticker_type')).toBe("'basic.sprout'");
    expect(await dflt('goals', 'default_sticker_id')).toBe("'basic.sprout'");
  });

  it('스티커는 붙인 날짜 없이 저장되지 않는다 (PRD 4.5)', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    await db.run(`INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('g', 'x', 'calendar', NULL, 1)`);
    await expect(db.run(`INSERT INTO stickers (id, goal_id, placed_at, slot_index, tz_offset_min) VALUES ('s', 'g', 1, 0, 540)`))
      .rejects.toThrow(/NOT NULL/);
  });

  it('외래키 CASCADE가 켜져 있다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    const r = await db.first<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(r?.foreign_keys).toBe(1);
  });
});

describe('트랜잭션', () => {
  it('중간에 실패하면 앞선 쓰기도 되돌린다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    await expect(db.transaction(async (tx) => {
      await tx.run(`INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('g', 'x', 'tally', 1, 1)`);
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(await db.first('SELECT id FROM goals')).toBeNull();
  });

  it('성공하면 함수의 반환값을 돌려주고 쓰기를 남긴다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    const value = await db.transaction(async (tx) => {
      await tx.run(`INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('g', 'x', 'tally', 1, 1)`);
      return 7;
    });
    expect(value).toBe(7);
    expect(await db.first<{ id: string }>('SELECT id FROM goals')).toEqual({ id: 'g' });
  });
});

describe('마이그레이션 원자성 (리뷰 #7)', () => {
  it('버전 중간에 실패하면 그 버전은 통째로 되돌려지고, 다음 실행에서 다시 적용된다', async () => {
    const base = createNodeDriver();
    let failOnce = true;
    const flaky: DbDriver = {
      ...base,
      async exec(sql) {
        if (failOnce && sql.includes('placed_days')) { failOnce = false; throw new Error('앱 종료'); }
        return base.exec(sql);
      },
    };
    setDriverFactory(async () => flaky);
    await expect(getDb()).rejects.toThrow('앱 종료');
    expect(await base.all(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'goals'`)).toEqual([]);
    expect((await base.first<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(0);
    setDriverFactory(async () => flaky);
    await getDb();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);
  });
});
