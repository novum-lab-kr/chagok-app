import fs from 'node:fs';
import type { Goal } from '../src/domain/types';
import { buildWatchSnapshot } from '../src/watch/snapshot';

// 폰 TS가 만든 스냅샷을 워치 Swift가 읽는지(워치 계획 2). 이 테스트가 fixture를 TS 결과와 맞춰 두고,
// 워치 Logic 테스트(__tests__/watch-logic/main.swift)가 같은 파일을 디코드한다.
// 스냅샷 모양을 바꿨으면 UPDATE_WATCH_FIXTURE=1 npx jest watchSnapshotContract로 다시 쓰고 Swift 테스트를 돌린다.
const FIXTURE = '__tests__/watch-logic/snapshot.fixture.json';
const t = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const base: Goal = {
  id: 'cal', name: '일기 쓰기', boardType: 'calendar', totalSlots: null, defaultStickerId: 'objects_normal.notebook',
  createdAt: t(2026, 10, 3), endDate: '2026-10-31', completedAt: null, completionSeen: false, lastPlacedAt: t(2026, 10, 15), initialSlots: null,
};
const tally: Goal = { ...base, id: 'tally', name: '산책', boardType: 'tally', totalSlots: 12, defaultStickerId: 'sports_normal.walk', endDate: null, lastPlacedAt: t(2026, 10, 16, 9) };

function snapshotJson(): string {
  const now = [
    { goal: tally, stickers: [{ slotIndex: 0, dateKey: '2026-10-15', recorded: true }, { slotIndex: 1, dateKey: '2026-10-16', recorded: false }], placedAll: 2, usableUntil: null },
    { goal: base, stickers: [{ slotIndex: 3, dateKey: '2026-10-04', recorded: false }], placedAll: 1, usableUntil: t(2026, 10, 10) },
  ];
  const s = buildWatchSnapshot({ now, afterMidnight: now, growth: 5, handled: ['r1'], date: new Date(t(2026, 10, 16, 20)) });
  return `${JSON.stringify(s, null, 2)}\n`;
}

describe('워치 스냅샷 계약', () => {
  it('fixture가 지금 TS 결과와 같다', () => {
    if (process.env.UPDATE_WATCH_FIXTURE) fs.writeFileSync(FIXTURE, snapshotJson());
    expect(fs.readFileSync(FIXTURE, 'utf8')).toBe(snapshotJson());
  });
});
