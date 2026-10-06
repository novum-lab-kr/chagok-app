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
const MIDNIGHTS_AHEAD = 7;

const uniq = (list: unknown[]): WidgetRequest[] => {
  const seen = new Map<string, WidgetRequest>();
  for (const v of list) if (isWidgetRequest(v) && !seen.has(v.id)) seen.set(v.id, v);
  return [...seen.values()];
};

/**
 * 위젯 요청 처리 + 스냅샷 쓰기 한 번 (위젯 설계 ③⑤).
 * 쓰기 직전에 요청을 다시 읽어, 처리하지 못했거나 그 사이 들어온 요청을 새 props에 남긴다 — 덮어써서 잃지 않게.
 *
 * 타임라인은 지금 + 앞으로 7번의 자정(8개 항목)을 쓴다. 위젯은 자기 항목의 시각을 "오늘"로 삼으므로,
 * 마지막 항목 뒤에는 그 날짜에 멈춘다. 앱을 이틀 넘게 열지 않아도 사흘째 탭이 "오늘"로 인식되도록 일주일 치를 미리 깐다.
 */
export async function syncWidgetsOnce(deps: SyncDeps): Promise<void> {
  const kinds = ['goal', 'month', 'tally'] as const;
  const first = uniq((await Promise.all(kinds.map((k) => deps.widgets[k].readRequests()))).flat());
  const { handled } = await deps.apply(first);
  const done = new Set(handled);
  const now = deps.now();
  const dates = [now];
  for (let i = 0; i < MIDNIGHTS_AHEAD; i += 1) dates.push(nextMidnight(dates[dates.length - 1]));
  const props = await Promise.all(dates.map((d) => deps.props(d)));
  for (const k of kinds) {
    const left = uniq(await deps.widgets[k].readRequests()).filter((q) => !done.has(q.id));
    deps.widgets[k].write(dates.map((date, i) => ({ date, props: { ...props[i][k], requests: left } })));
  }
}
