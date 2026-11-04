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

  it('목표는 goals, 사람마다 값은 goal_members에 있다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    const names = async (table: string) => (await db.all<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name);
    expect(await names('goals')).toEqual(expect.arrayContaining(['mode', 'owner_id', 'max_members']));
    expect(await names('goals')).not.toContain('default_sticker_id');
    expect(await names('goal_members')).toEqual(expect.arrayContaining(
      ['goal_id', 'user_id', 'role', 'display_name', 'sticker_id', 'sort_order', 'completed_at', 'completion_seen', 'last_placed_at', 'joined_at', 'updated_at'],
    ));
  });

  it('goal_members의 기본키는 (goal_id, user_id)다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    await db.run(`INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('g', 'x', 'tally', 1, 1)`);
    await db.run(`INSERT INTO goal_members (goal_id, user_id, role) VALUES ('g', 'me', 'owner')`);
    await db.run(`INSERT INTO goal_members (goal_id, user_id, role) VALUES ('g', 'u2', 'member')`);
    await expect(db.run(`INSERT INTO goal_members (goal_id, user_id, role) VALUES ('g', 'me', 'member')`)).rejects.toThrow(/UNIQUE|PRIMARY/);
  });

  it('스티커에 판 주인과 붙인 사람이 있고, 가려진 칸은 종류가 없을 수 있다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    const cols = await db.all<{ name: string; notnull: number; dflt_value: string | null }>(`PRAGMA table_info(stickers)`);
    expect(cols.map((c) => c.name)).toEqual(expect.arrayContaining(['board_user_id', 'placed_by']));
    expect(cols.find((c) => c.name === 'sticker_type')?.notnull).toBe(0);
    expect(cols.find((c) => c.name === 'sticker_type')?.dflt_value).toBe("'basic.sprout'");
  });

  it('기록의 공개 범위 기본값은 self다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    await db.run(`INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('g', 'x', 'tally', 1, 1)`);
    await db.run(`INSERT INTO stickers (id, goal_id, placed_at, slot_index, date_key, tz_offset_min) VALUES ('s', 'g', 1, 0, '2026-11-05', 540)`);
    await db.run(`INSERT INTO records (id, sticker_id, created_at) VALUES ('r', 's', 1)`);
    expect((await db.first<{ visibility: string }>('SELECT visibility FROM records'))?.visibility).toBe('self');
  });

  it('outbox는 member 종류를 받는다', async () => {
    setDriverFactory(async () => createNodeDriver());
    const db = await getDb();
    await expect(db.run(`INSERT INTO outbox (entity, row_id, queued_at) VALUES ('member', 'g', 1)`)).resolves.toBeUndefined();
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

describe('옛 구조 기기 (함께 목표 이전, 2026-11-05)', () => {
  /** 1.0.0 기기를 흉내 낸다: goal_members 없이 user_version 1 또는 2까지 올린 DB. */
  async function legacyDb(version: number): Promise<DbDriver> {
    const driver = createNodeDriver();
    await driver.exec(`CREATE TABLE goals (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, board_type TEXT NOT NULL, total_slots INTEGER,
      created_at INTEGER NOT NULL, default_sticker_id TEXT NOT NULL DEFAULT 'basic.sprout', end_date TEXT, completed_at INTEGER,
      completion_seen INTEGER NOT NULL DEFAULT 0, last_placed_at INTEGER, initial_slots INTEGER, updated_at INTEGER NOT NULL DEFAULT 0, sort_order INTEGER);
      CREATE TABLE stickers (id TEXT PRIMARY KEY NOT NULL, goal_id TEXT NOT NULL, placed_at INTEGER NOT NULL, slot_index INTEGER NOT NULL);
      CREATE TABLE records (id TEXT PRIMARY KEY NOT NULL, sticker_id TEXT NOT NULL);
      CREATE TABLE app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE outbox (entity TEXT NOT NULL, row_id TEXT NOT NULL, queued_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, PRIMARY KEY (entity, row_id));
      CREATE TABLE pack_access (pack_id TEXT PRIMARY KEY, source TEXT NOT NULL, granted_at INTEGER NOT NULL, expires_at INTEGER);
      CREATE TABLE placed_days (date_key TEXT PRIMARY KEY);`);
    await driver.run("INSERT INTO goals (id, name, board_type, total_slots, created_at) VALUES ('old', '옛 목표', 'tally', 3, 1)");
    await driver.run("INSERT INTO app_settings (key, value) VALUES ('deviceId', 'dev-1'), ('analyticsOff', '1'), ('errorReportOff', '1'), ('tutorialDone', '1'), ('accountUserId', 'u1')");
    await driver.run("INSERT INTO outbox (entity, row_id, queued_at) VALUES ('goal', 'old', 1)");
    await driver.run("INSERT INTO placed_days (date_key) VALUES ('2026-10-01')");
    await driver.exec(`PRAGMA user_version = ${version}`);
    return driver;
  }

  it.each([1, 2])('user_version %i인 기기는 지우고 새로 만든다 (deviceId 같은 기기 선택만 남는다)', async (version) => {
    const driver = await legacyDb(version);
    setDriverFactory(async () => driver);
    const db = await getDb();
    expect(await currentSchemaVersion()).toBe(SCHEMA_VERSION);
    expect(await db.all('SELECT * FROM goals')).toEqual([]);
    expect(await db.all('SELECT * FROM outbox')).toEqual([]);
    expect(await db.all('SELECT * FROM placed_days')).toEqual([]);
    expect(await db.all('SELECT name FROM sqlite_master WHERE type = \'table\' AND name = \'goal_members\'')).toHaveLength(1);
    const settings = await db.all<{ key: string; value: string }>('SELECT key, value FROM app_settings ORDER BY key');
    expect(settings).toEqual([
      { key: 'analyticsOff', value: '1' },
      { key: 'deviceId', value: 'dev-1' },
      { key: 'errorReportOff', value: '1' },
    ]);
  });

  it('새 구조 기기는 다시 열어도 지우지 않는다', async () => {
    const driver = createNodeDriver();
    setDriverFactory(async () => driver);
    const db = await getDb();
    await db.run("INSERT INTO app_settings (key, value) VALUES ('tutorialDone', '1')");
    setDriverFactory(async () => driver);
    expect((await (await getDb()).first<{ value: string }>("SELECT value FROM app_settings WHERE key = 'tutorialDone'"))?.value).toBe('1');
  });
});
