import { MIGRATIONS } from './schema';
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

async function init(): Promise<DbDriver> {
  // 기본값은 expo-sqlite. 테스트 환경에서는 setDriverFactory로 교체되므로
  // 여기까지 오지 않고, 따라서 node에서 expo-sqlite를 import하지 않는다.
  const make = factory ?? (async () => {
    const { createExpoDriver } = await import('./expoDriver');
    return createExpoDriver();
  });
  const driver = await make();
  await driver.exec('PRAGMA foreign_keys = ON;');
  for (const sql of MIGRATIONS) await driver.exec(sql);
  return driver;
}

export function getDb(): Promise<DbDriver> {
  if (!driverPromise) driverPromise = init();
  return driverPromise;
}
