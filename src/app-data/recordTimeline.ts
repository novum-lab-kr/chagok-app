import { localDateKey } from '../domain/dates';
import type { TimelineEntry } from '../repositories/recordRepository';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/** 기록 모아보기의 날짜 머리글: 「10월 12일 월요일」. 붙인 시각의 로컬 날짜다. */
export function dayLabel(at: number): string {
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}`;
}

export type TimelineDay = { key: string; label: string; entries: TimelineEntry[] };

/** 붙인 날별로 묶는다. 목록 순서(최근 순)를 그대로 지킨다. goalId를 주면 그 목표만. */
export function groupTimeline(entries: readonly TimelineEntry[], goalId: string | null): TimelineDay[] {
  const days: TimelineDay[] = [];
  for (const entry of entries) {
    if (goalId && entry.goalId !== goalId) continue;
    const key = localDateKey(entry.placedAt);
    const last = days[days.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else days.push({ key, label: dayLabel(entry.placedAt), entries: [entry] });
  }
  return days;
}

/** 목표 칩: 기록이 하나라도 있는 목표만, 최근 기록 순으로 한 번씩 (완성한 판 포함, 2026-10-12). */
export function timelineGoals(entries: readonly TimelineEntry[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const entry of entries) if (!seen.has(entry.goalId)) seen.set(entry.goalId, entry.goalName);
  return [...seen].map(([id, name]) => ({ id, name }));
}
