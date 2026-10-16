import { AppState } from 'react-native';
import { subscribeLocalChange } from '../sync/changes';
import { applyWidgetRequests } from '../widgets/applyRequests';
import { createSyncRunner } from '../widgets/syncRunner';
import { updateGrowth } from './growth';
import { loadWatchSnapshot } from './loadSnapshot';
import { syncWatchOnce } from './syncCore';
import { watchPort } from './watchPort';

/** 한 번에 하나만 돈다. 워치 요청을 반영했으면 열린 판 화면이 다시 읽는다(notifyWidgetApplied, 위젯과 같은 신호). */
const runner = createSyncRunner(
  () => syncWatchOnce({ port: watchPort(), apply: applyWidgetRequests, growth: updateGrowth, snapshot: loadWatchSnapshot, now: () => new Date() }),
  (e) => { console.warn('watch sync failed', e); },
);

/** 앱을 열 때, 앞으로 올 때, 기록이 바뀔 때(1초 모아서) 워치를 맞춘다. 위젯 동기화와 같은 계기다 (PRD 4.14). */
export function startWatchSync(): () => void {
  runner.run();
  const app = AppState.addEventListener('change', (s) => { if (s === 'active') runner.run(); });
  let timer: ReturnType<typeof setTimeout> | null = null;
  const off = subscribeLocalChange(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; runner.run(); }, 1000);
  });
  return () => { app.remove(); off(); if (timer) clearTimeout(timer); };
}
