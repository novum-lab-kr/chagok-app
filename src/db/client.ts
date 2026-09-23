import { MIGRATIONS, SCHEMA_VERSION } from './schema';
import type { DbDriver } from './driver';

let driverPromise: Promise<DbDriver> | null = null;
let factory: (() => Promise<DbDriver>) | null = null;

/** 테스트에서 node:sqlite 드라이버를 꽂을 때 쓴다. */
export function setDriverFactory(f: () => Promise<DbDriver>): void {
  factory = f;
  driverPromise = null;
}

export function resetDbForTest(): void {
  driverPromise = null;
}

async function readVersion(driver: DbDriver): Promise<number> {
  const row = await driver.first<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * 현재 버전부터 최신까지만 적용한다. 이미 적용된 버전은 건너뛰므로
 * 여러 번 호출해도 안전하다.
 */
async function migrate(driver: DbDriver): Promise<void> {
  let version = await readVersion(driver);
  if (version >= SCHEMA_VERSION) return;

  for (let i = version; i < MIGRATIONS.length; i++) {
    for (const sql of MIGRATIONS[i]) await driver.exec(sql);
    version = i + 1;
    // PRAGMA는 바인딩을 받지 않아 값을 직접 넣는다. version은 내부 계산값이다.
    await driver.exec(`PRAGMA user_version = ${version}`);
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
