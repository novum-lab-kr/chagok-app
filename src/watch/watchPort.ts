import type { WatchPort } from './syncCore';

/**
 * 워치와 주고받는 네이티브 모듈. 계획 2(워치 앱 본 구현)에서 WatchConnectivity 모듈로 채운다.
 * 그 전에는 워치가 없는 것과 같다 — 동기화는 성장 수만 갱신한다.
 */
export function watchPort(): WatchPort | null {
  return null;
}
