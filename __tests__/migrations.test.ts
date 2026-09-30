import { setDriverFactory, getDb, currentSchemaVersion } from '../src/db/client';
import { MIGRATIONS, SCHEMA_VERSION } from '../src/db/schema';
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

/** v3까지만 적용한 DB. 옛 버전 앱이 남긴 데이터를 흉내 낸다. */
async function driverAtV3(): Promise<DbDriver> {
  const driver = createNodeDriver();
  for (const sql of MIGRATIONS.slice(0, 3).flat()) await driver.exec(sql);
  await driver.exec('PRAGMA user_version = 3');
  return driver;
}

describe('v4 — 기간·완성·정렬 (DEV-DESIGN 1절)', () => {
  it('v3 데이터를 올리면 last_placed_at·initial_slots를 채우고 다 찬 적립판을 완성으로 옮긴다', async () => {
    const driver = await driverAtV3();
    await driver.exec(`
      INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES
        ('full', '다 찬 적립판', 'tally', 2, 100),
        ('half', '반 찬 적립판', 'tally', 3, 100),
        ('cal',  '달력판', 'calendar', NULL, 100),
        ('none', '빈 적립판', 'tally', 5, 100);
      INSERT INTO stickers (id, goal_id, placed_at, slot_index) VALUES
        ('a', 'full', 200, 0), ('b', 'full', 300, 1),
        ('c', 'half', 250, 0),
        ('d', 'cal', 400, 0);
    `);
    setDriverFactory(async () => driver);
    const db = await getDb();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);

    const rows = await db.all<{
      id: string; end_date: string | null; completed_at: number | null;
      completion_seen: number; last_placed_at: number | null; initial_slots: number | null;
    }>('SELECT id, end_date, completed_at, completion_seen, last_placed_at, initial_slots FROM goals ORDER BY id');
    expect(rows).toEqual([
      { id: 'cal', end_date: null, completed_at: null, completion_seen: 0, last_placed_at: 400, initial_slots: null },
      { id: 'full', end_date: null, completed_at: 300, completion_seen: 0, last_placed_at: 300, initial_slots: 2 },
      { id: 'half', end_date: null, completed_at: null, completion_seen: 0, last_placed_at: 250, initial_slots: 3 },
      { id: 'none', end_date: null, completed_at: null, completion_seen: 0, last_placed_at: null, initial_slots: 5 },
    ]);
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

/** v4까지만 적용한 DB. */
async function driverAtV4(): Promise<DbDriver> {
  const driver = createNodeDriver();
  for (const sql of MIGRATIONS.slice(0, 4).flat()) await driver.exec(sql);
  await driver.exec('PRAGMA user_version = 4');
  return driver;
}

describe('v5 — 백업 (계정·백업 설계 ②)', () => {
  it('v4 데이터에 updated_at을 채우고 outbox를 만든다', async () => {
    const driver = await driverAtV4();
    await driver.exec(`
      INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('g', '목표', 'tally', 3, 100);
      INSERT INTO stickers (id, goal_id, placed_at, slot_index) VALUES ('s', 'g', 200, 0);
      INSERT INTO records (id, sticker_id, memo, created_at) VALUES ('r', 's', '메모', 300);
    `);
    setDriverFactory(async () => driver);
    const db = await getDb();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);
    expect((await db.first<{ updated_at: number }>('SELECT updated_at FROM goals'))?.updated_at).toBe(100);
    expect((await db.first<{ updated_at: number }>('SELECT updated_at FROM stickers'))?.updated_at).toBe(200);
    expect((await db.first<{ updated_at: number }>('SELECT updated_at FROM records'))?.updated_at).toBe(300);
    const cols = (await db.all<{ name: string }>('PRAGMA table_info(records)')).map((c) => c.name);
    expect(cols).toContain('photo_remote_path');
    const outbox = (await db.all<{ name: string }>('PRAGMA table_info(outbox)')).map((c) => c.name);
    expect(outbox).toEqual(['entity', 'row_id', 'queued_at', 'attempts', 'last_error']);
  });
});

describe('마이그레이션 원자성 (리뷰 #7)', () => {
  it('버전 중간에 실패하면 그 버전은 통째로 되돌려지고, 다음 실행에서 다시 적용된다', async () => {
    const base = await driverAtV4();
    let failOnce = true;
    const flaky: DbDriver = {
      ...base,
      async exec(sql) {
        if (failOnce && sql.includes('photo_remote_path')) { failOnce = false; throw new Error('앱 종료'); }
        return base.exec(sql);
      },
    };
    setDriverFactory(async () => flaky);
    await expect(getDb()).rejects.toThrow('앱 종료');
    const cols = (await base.all<{ name: string }>('PRAGMA table_info(goals)')).map((c) => c.name);
    expect(cols).not.toContain('updated_at');
    expect((await base.first<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(4);
    setDriverFactory(async () => flaky);
    await getDb();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);
  });
});
