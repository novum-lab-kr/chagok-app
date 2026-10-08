import { isWidgetRequest } from './requests';
import type { WidgetRequest } from './requests';
import { nextMidnight } from './widgetProps';

export type TimelineEntry<P> = { date: Date; props: P };
export type WidgetPort = {
  readRequests(): Promise<unknown[]>;
  write(entries: TimelineEntry<Record<string, unknown>>[]): void;
};
type WidgetProps = { goal: Record<string, unknown>; month: Record<string, unknown>; tally: Record<string, unknown> };
export type SyncDeps = {
  widgets: { goal: WidgetPort; month: WidgetPort; tally: WidgetPort };
  apply(requests: WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }>;
  /** date 시점의 위젯 props. 타임라인 항목마다 그 항목의 날짜로 부른다. */
  props(date: Date): Promise<WidgetProps>;
  now(): Date;
};

/** 지금 말고 앞으로 채울 자정 개수 */
const MIDNIGHTS_AHEAD = 1;

/**
 * 위젯 저장소(UserDefaults)는 null을 못 담는다 — 들어 있으면 updateTimeline이 예외를 던져 위젯이 갱신되지 않는다.
 * (목표가 하나도 없을 때의 defaultId, 종료일 없는 달력판의 remaining.) null인 키는 빼고 쓴다.
 */
export function withoutNulls<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v === null ? undefined : v))) as T;
}

const uniq = (list: unknown[]): WidgetRequest[] => {
  const seen = new Map<string, WidgetRequest>();
  for (const v of list) if (isWidgetRequest(v) && !seen.has(v.id)) seen.set(v.id, v);
  return [...seen.values()];
};

/**
 * 위젯 요청 처리 + 스냅샷 쓰기 한 번 (위젯 설계 ③⑤).
 * 쓰기 직전에 요청을 다시 읽어, 처리하지 못했거나 그 사이 들어온 요청을 새 props에 남긴다 — 덮어써서 잃지 않게.
 *
 * 타임라인은 지금 + 다음 자정(2개 항목)을 쓴다. 위젯을 누를 때마다 시스템이 항목 전부를 다시 그리므로 적을수록 빠르다
 * (2026-10-07 측정: 8개일 때 이번 달 위젯 약 2.5초, 2개일 때 0.7초). 마지막 항목이 지난 뒤에는 위젯이 지금 날짜를 오늘로 쓴다(widgets/ios).
 */
export async function syncWidgetsOnce(deps: SyncDeps): Promise<{ changed: boolean }> {
  const kinds = ['goal', 'month', 'tally'] as const;
  const first = uniq((await Promise.all(kinds.map((k) => deps.widgets[k].readRequests()))).flat());
  const { handled, changed } = await deps.apply(first);
  const done = new Set(handled);
  const now = deps.now();
  const dates = [now];
  for (let i = 0; i < MIDNIGHTS_AHEAD; i += 1) dates.push(nextMidnight(dates[dates.length - 1]));
  const props = await Promise.all(dates.map((d) => deps.props(d)));
  for (const k of kinds) {
    // 다시 읽은 결과와 쓰기 사이에 await를 두지 않는다 — 그 사이 위젯이 남긴 탭을 덮어쓸 틈을 가장 작게 한다.
    // 남는 틈(읽기가 끝난 뒤 쓰기가 위젯 저장소에 닿기까지)은 HANDOFF 「아직 안 한 것」에 적었다.
    const left = uniq(await deps.widgets[k].readRequests()).filter((q) => !done.has(q.id));
    deps.widgets[k].write(dates.map((date, i) => ({ date, props: withoutNulls({ ...props[i][k], requests: left }) })));
  }
  return { changed };
}
