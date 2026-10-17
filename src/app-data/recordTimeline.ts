import { parseDateKey } from '../domain/dates';
import type { TimelineEntry } from '../repositories/recordRepository';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/** 기록 모아보기의 날짜 머리글: 「10월 12일 월요일」. 붙인 날짜(dateKey)다. */
export function dayLabel(key: string): string {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}`;
}

export type TimelineDay = { key: string; label: string; entries: TimelineEntry[] };

/** 붙인 날별로 묶는다. 목록 순서(최근 순)를 그대로 지킨다. goalId를 주면 그 목표만. */
export function groupTimeline(entries: readonly TimelineEntry[], goalId: string | null): TimelineDay[] {
  const days: TimelineDay[] = [];
  for (const entry of entries) {
    if (goalId && entry.goalId !== goalId) continue;
    const key = entry.dateKey;
    const last = days[days.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else days.push({ key, label: dayLabel(key), entries: [entry] });
  }
  return days;
}

/** 목표 칩: 기록이 하나라도 있는 목표만, 최근 기록 순으로 한 번씩 (완성한 판 포함, 2026-10-12). 칩은 목표의 기본 스티커로 그린다 (2026-10-17). */
export function timelineGoals(entries: readonly TimelineEntry[]): { id: string; name: string; sticker: string }[] {
  const seen = new Map<string, { id: string; name: string; sticker: string }>();
  for (const entry of entries) if (!seen.has(entry.goalId)) seen.set(entry.goalId, { id: entry.goalId, name: entry.goalName, sticker: entry.goalSticker });
  return [...seen.values()];
}

/** 펼친 화면 (2026-10-17): 피드에서 누른 기록부터 끝까지, 최근 순. 누른 기록이 사라졌으면 처음부터. goalId를 주면 그 목표만. */
export function feedFrom(entries: readonly TimelineEntry[], goalId: string | null, fromId: string): TimelineEntry[] {
  const list = goalId ? entries.filter((e) => e.goalId === goalId) : [...entries];
  const at = list.findIndex((e) => e.stickerId === fromId);
  return at > 0 ? list.slice(at) : list;
}
