import { dayLabel, feedFrom, groupTimeline, timelineGoals } from '../src/app-data/recordTimeline';
import type { TimelineEntry } from '../src/repositories/recordRepository';
import { localDateKey } from '../src/domain/dates';

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).getTime();
const entry = (id: string, goalId: string, goalName: string, placedAt: number): TimelineEntry =>
  ({ stickerId: id, goalId, goalName, goalSticker: `goal.${goalId}`, sticker: 'basic.sprout', placedAt, dateKey: localDateKey(placedAt), memo: id, photoUri: null });

describe('기록 모아보기 (2026-10-12)', () => {
  it('날짜는 「10월 12일 월요일」', () => {
    expect(dayLabel('2026-10-12')).toBe('10월 12일 월요일');
    expect(dayLabel('2026-10-11')).toBe('10월 11일 일요일');
  });

  it('붙인 날(로컬)별로 묶고 순서를 지킨다', () => {
    const list = [entry('a', 'read', '책 읽기', at(2026, 10, 12, 21)), entry('b', 'walk', '걷기', at(2026, 10, 12, 8)), entry('c', 'read', '책 읽기', at(2026, 10, 9))];
    expect(groupTimeline(list, null)).toEqual([
      { key: '2026-10-12', label: '10월 12일 월요일', entries: [list[0], list[1]] },
      { key: '2026-10-09', label: '10월 9일 금요일', entries: [list[2]] },
    ]);
  });

  it('붙인 시각이 아니라 저장된 붙인 날짜로 묶는다 — 다른 시간대에서 붙인 기록 (PRD 4.5)', () => {
    const far = { ...entry('a', 'read', '책 읽기', at(2026, 10, 11, 12)), dateKey: '2026-10-12' };
    expect(groupTimeline([far], null)).toEqual([{ key: '2026-10-12', label: '10월 12일 월요일', entries: [far] }]);
  });

  it('목표를 고르면 그 목표만, 빈 날은 뺀다', () => {
    const list = [entry('a', 'read', '책 읽기', at(2026, 10, 12)), entry('b', 'walk', '걷기', at(2026, 10, 11))];
    expect(groupTimeline(list, 'walk').map((d) => d.key)).toEqual(['2026-10-11']);
  });

  it('칩은 기록이 있는 목표만, 최근 기록 순으로 한 번씩. 목표의 기본 스티커를 함께 준다 (2026-10-17)', () => {
    const list = [entry('a', 'read', '책 읽기', 3), entry('b', 'walk', '걷기', 2), entry('c', 'read', '책 읽기', 1)];
    expect(timelineGoals(list)).toEqual([{ id: 'read', name: '책 읽기', sticker: 'goal.read' }, { id: 'walk', name: '걷기', sticker: 'goal.walk' }]);
  });

  it('펼친 화면은 누른 기록부터 끝까지, 고른 목표만. 누른 기록이 사라졌으면 처음부터 (2026-10-17)', () => {
    const list = [entry('a', 'read', '책 읽기', 4), entry('b', 'walk', '걷기', 3), entry('c', 'read', '책 읽기', 2), entry('d', 'walk', '걷기', 1)];
    expect(feedFrom(list, null, 'b').map((e) => e.stickerId)).toEqual(['b', 'c', 'd']);
    expect(feedFrom(list, 'walk', 'b').map((e) => e.stickerId)).toEqual(['b', 'd']);
    expect(feedFrom(list, 'read', 'gone').map((e) => e.stickerId)).toEqual(['a', 'c']);
  });
});
