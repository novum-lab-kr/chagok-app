import { AppState } from 'react-native';
import { subscribeLocalChange } from '../sync/changes';
import ChagokGoal from '../../widgets/ios/ChagokGoal';
import ChagokMonth from '../../widgets/ios/ChagokMonth';
import ChagokTally from '../../widgets/ios/ChagokTally';
import { applyWidgetRequests } from './applyRequests';
import { buildWidgetSnapshot } from './snapshot';
import { loadWidgetInputs } from './loadSnapshot';
import { goalWidgetProps, monthWidgetProps, tallyWidgetProps } from './widgetProps';
import { syncWidgetsOnce } from './syncCore';
import type { WidgetPort } from './syncCore';
import { widgetArt } from './widgetArt.ios'; // tsc는 플랫폼 확장자를 풀지 못해 명시한다

type AnyWidget = { getTimeline(): Promise<{ props?: { requests?: unknown[] } }[]>; updateTimeline(e: { date: Date; props: never }[]): void };
const port = (w: unknown): WidgetPort => {
  const widget = w as AnyWidget;
  return {
    readRequests: async () => (await widget.getTimeline()).flatMap((t) => t.props?.requests ?? []),
    write: (entries) => widget.updateTimeline(entries as never),
  };
};

let running: Promise<void> | null = null;
let again = false;

/** 한 번에 하나만 돈다. 도는 중에 또 불리면 끝난 뒤 한 번 더. */
function run(): void {
  if (running) { again = true; return; }
  // 8개 항목이 걸치는 달은 많아야 둘이다 — 달마다 한 번만 읽는다. 날짜를 오름차순으로 부르므로
  // 각 달의 첫 날짜(이번 달은 지금)가 입력을 읽는다. 미래 자정의 "오늘 스티커"는 buildWidgetSnapshot이 무시한다.
  const inputsByMonth = new Map<string, ReturnType<typeof loadWidgetInputs>>();
  const inputsFor = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!inputsByMonth.has(key)) inputsByMonth.set(key, loadWidgetInputs(date));
    return inputsByMonth.get(key)!;
  };
  running = syncWidgetsOnce({
    widgets: { goal: port(ChagokGoal), month: port(ChagokMonth), tally: port(ChagokTally) },
    apply: applyWidgetRequests,
    props: async (date) => {
      const [inputs, art] = await Promise.all([inputsFor(date), widgetArt()]);
      const s = buildWidgetSnapshot(inputs, date);
      return { goal: goalWidgetProps(s, art), month: monthWidgetProps(s, art, date), tally: tallyWidgetProps(s, art) };
    },
    now: () => new Date(),
  })
    .catch(() => { /* 다음 계기에 다시 한다. 위젯은 이전 화면을 보여 준다 */ })
    .finally(() => { running = null; if (again) { again = false; run(); } });
}

/** 앱을 열 때·앞으로 올 때·기록이 바뀔 때(1초 모아서) 위젯을 맞춘다 (위젯 설계 「갱신 시점」). */
export function startWidgetSync(): () => void {
  run();
  const app = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });
  let timer: ReturnType<typeof setTimeout> | null = null;
  const off = subscribeLocalChange(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; run(); }, 1000);
  });
  return () => { app.remove(); off(); if (timer) clearTimeout(timer); };
}
