import { MIGRATIONS, SCHEMA_VERSION } from './schema';
import type { DbDriver } from './driver';

let driverPromise: Promise<DbDriver> | null = null;
let factory: (() => Promise<DbDriver>) | null = null;

/** 테스트에서 node:sqlite 드라이버를 꽂을 때 쓴다. */
export function setDriverFactory(f: () => Promise<DbDriver>): void {
  factory = f;
  driverPromise = null;
}

async function readVersion(driver: DbDriver): Promise<number> {
  const row = await driver.first<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * 함께 목표 이전 구조(goal_members 표가 없는 DB)를 비운다. 1.0.0 사용자가 없어 옮기지 않고 새로 만든다(2026-11-05).
 * 이 기기의 선택(deviceId, 사용 기록 동의, 오류 보고 끄기)만 app_settings에 남기고, 버전을 0으로 되돌려 새 구조를 적용하게 한다.
 */
async function dropLegacy(driver: DbDriver): Promise<{ key: string; value: string }[]> {
  const keep = await driver.all<{ key: string; value: string }>(
    "SELECT key, value FROM app_settings WHERE key IN ('deviceId', 'analyticsOff', 'errorReportOff')",
  );
  await driver.exec('BEGIN');
  try {
    for (const table of ['records', 'stickers', 'goals', 'outbox', 'pack_access', 'placed_days', 'app_settings']) {
      await driver.exec(`DROP TABLE IF EXISTS ${table}`);
    }
    await driver.exec('PRAGMA user_version = 0');
    await driver.exec('COMMIT');
  } catch (error) {
    await driver.exec('ROLLBACK');
    throw error;
  }
  return keep;
}

/**
 * 현재 버전부터 최신까지만 적용한다. 이미 적용된 버전은 건너뛰므로
 * 여러 번 호출해도 안전하다.
 */
async function migrate(driver: DbDriver): Promise<void> {
  let version = await readVersion(driver);
  let kept: { key: string; value: string }[] = []; // 옛 DB에서 남긴 설정. 새 표가 만들어진 뒤 되돌려 넣는다.
  if (version > 0) {
    const members = await driver.first("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'goal_members'");
    if (!members) {
      kept = await dropLegacy(driver);
      version = 0;
    }
  }
  if (version >= SCHEMA_VERSION) return;

  for (let i = version; i < MIGRATIONS.length; i++) {
    // 버전 하나를 통째로 적용한다. 중간에 앱이 끝나면 ALTER 일부만 남아 다음 실행이
    // "duplicate column"으로 멈추므로, 같은 연결에서 BEGIN/COMMIT으로 묶는다.
    await driver.exec('BEGIN');
    try {
      for (const sql of MIGRATIONS[i]) await driver.exec(sql);
      // PRAGMA는 바인딩을 받지 않아 값을 직접 넣는다. version은 내부 계산값이다.
      await driver.exec(`PRAGMA user_version = ${i + 1}`);
      await driver.exec('COMMIT');
    } catch (error) {
      await driver.exec('ROLLBACK');
      throw error;
    }
    version = i + 1;
  }
  for (const { key, value } of kept) {
    await driver.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', key, value);
  }
}

async function init(): Promise<DbDriver> {
  // 기본값은 expo-sqlite. 테스트 환경에서는 setDriverFactory로 교체되므로
  // 여기까지 오지 않고, 따라서 node에서 expo-sqlite를 import하지 않는다.
  const make =
    factory ??
    (async () => {
      const { createExpoDriver } = await import('./expoDriver');
      return createExpoDriver();
    });
  const driver = await make();
  await driver.exec('PRAGMA foreign_keys = ON;');
  await migrate(driver);
  return driver;
}

export function getDb(): Promise<DbDriver> {
  if (!driverPromise) driverPromise = init();
  return driverPromise;
}

/** 진단·테스트용. 적용된 스키마 버전을 읽는다. */
export async function currentSchemaVersion(): Promise<number> {
  return readVersion(await getDb());
}
