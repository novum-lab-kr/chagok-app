/**
 * expo-sqlite 연결 설정 (2026-10-09). 배타 트랜잭션은 새 연결을 열어 쓰는데, 저널이 delete이고
 * busy_timeout이 0이면 그동안 본 연결의 읽기가 바로 "database is locked"로 실패했다(iPhone 16 Pro 재현).
 * 본 연결은 WAL + busy_timeout, 트랜잭션 연결은 첫 쿼리 전에 busy_timeout을 건다.
 */
import { createExpoDriver } from '../src/db/expoDriver';

const mockCalls: { conn: string; sql: string }[] = [];
const mockConnection = (conn: string) => ({
  execAsync: jest.fn(async (sql: string) => { mockCalls.push({ conn, sql }); }),
  runAsync: jest.fn(async (sql: string) => { mockCalls.push({ conn, sql }); }),
  getAllAsync: jest.fn(async () => []),
  getFirstAsync: jest.fn(async () => null),
  withExclusiveTransactionAsync: jest.fn(async (task: (txn: unknown) => Promise<void>) => { await task(mockConnection('txn')); }),
});
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockConnection('main')) }));

beforeEach(() => { mockCalls.length = 0; });

test('본 연결은 열자마자 WAL로 바꾸고 잠겨 있으면 5초까지 기다린다', async () => {
  await createExpoDriver();
  const main = mockCalls.filter((c) => c.conn === 'main').map((c) => c.sql).join('\n');
  expect(main).toMatch(/PRAGMA journal_mode = WAL/);
  expect(main).toMatch(/PRAGMA busy_timeout = 5000/);
});

test('트랜잭션 연결도 첫 쿼리 전에 busy_timeout을 건다', async () => {
  const driver = await createExpoDriver();
  mockCalls.length = 0;
  await driver.transaction(async (tx) => { await tx.run('UPDATE goals SET name = ?', 'x'); });
  expect(mockCalls.map((c) => `${c.conn}: ${c.sql}`)).toEqual([
    'txn: PRAGMA busy_timeout = 5000',
    'txn: UPDATE goals SET name = ?',
  ]);
});
