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

describe('v2 내 목표 순서 (PRD 4.1, 2026-10-30)', () => {
  /** 1.0 기기를 흉내 낸다: v1까지만 올린 DB에 목표를 넣어 둔다. */
  async function legacyDb(): Promise<DbDriver> {
    const driver = createNodeDriver();
    for (const sql of MIGRATIONS[0] ?? []) await driver.exec(sql);
    await driver.exec('PRAGMA user_version = 1');
    const goal = (id: string, createdAt: number, lastPlacedAt: number | null, completedAt: number | null = null) => driver.run(
      `INSERT INTO goals (id, name, board_type, total_slots, created_at, last_placed_at, completed_at, updated_at)
       VALUES (?, ?, 'tally', 10, ?, ?, ?, ?)`, id, id, createdAt, lastPlacedAt, completedAt, 5,
    );
    await goal('old', 1, null);       // 만든 지 오래, 안 붙임
    await goal('placed', 2, 50);      // 가장 최근에 붙임
    await goal('fresh', 40, null);    // 최근에 만듦
    await goal('tieB', 30, null);     // 같은 시각이면 id순
    await goal('tieA', 30, null);
    await goal('done', 3, 60, 61);    // 완성한 판에도 값을 둔다
    await driver.run("INSERT INTO outbox (entity, row_id, queued_at, attempts, last_error) VALUES ('goal', 'old', 1, 3, 'x')");
    return driver;
  }

  it('지금 보이는 순서(최근순)로 굳히고 updated_at은 그대로 둔다', async () => {
    const driver = await legacyDb();
    setDriverFactory(async () => driver);
    const db = await getDb();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);
    const rows = await db.all<{ id: string; sort_order: number; updated_at: number }>(
      'SELECT id, sort_order, updated_at FROM goals ORDER BY sort_order',
    );
    expect(rows.map((row) => row.id)).toEqual(['done', 'placed', 'fresh', 'tieA', 'tieB', 'old']);
    expect(rows.map((row) => row.sort_order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(rows.every((row) => row.updated_at === 5)).toBe(true);
  });

  it('굳힌 순서를 서버에 올리도록 모든 목표를 outbox에 넣고, 보류된 항목도 다시 보낸다', async () => {
    const driver = await legacyDb();
    setDriverFactory(async () => driver);
    const db = await getDb();
    const queued = await db.all<{ row_id: string; attempts: number; last_error: string | null }>(
      "SELECT row_id, attempts, last_error FROM outbox WHERE entity = 'goal' ORDER BY row_id",
    );
    expect(queued.map((entry) => entry.row_id)).toEqual(['done', 'fresh', 'old', 'placed', 'tieA', 'tieB']);
    expect(queued.find((entry) => entry.row_id === 'old')).toEqual({ row_id: 'old', attempts: 0, last_error: null });
  });

  it('목표가 없어도 올라간다', async () => {
    const driver = createNodeDriver();
    for (const sql of MIGRATIONS[0] ?? []) await driver.exec(sql);
    await driver.exec('PRAGMA user_version = 1');
    setDriverFactory(async () => driver);
    const db = await getDb();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);
    expect(await db.all('SELECT * FROM outbox')).toEqual([]);
  });
});
