import ChagokWatch from '../../modules/chagok-watch';
import { createWatchPort } from './watchPortCore';
import type { WatchPort } from './syncCore';

/** 워치와 주고받는 네이티브 모듈 (워치 계획 2). 짝지은 워치에 워치 앱이 없으면 null */
export function watchPort(): WatchPort | null {
  return createWatchPort(ChagokWatch);
}

/** 워치 요청이 들어올 때마다 부른다 — 앱이 켜져 있으면 바로 처리해 워치에 새 스냅샷을 보낸다 */
export function subscribeWatchRequests(listener: () => void): () => void {
  const sub = ChagokWatch?.addListener?.('onRequest', listener);
  return () => sub?.remove();
}
