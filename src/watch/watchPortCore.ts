import type { WatchPort } from './syncCore';

/** 폰 네이티브 모듈 modules/chagok-watch (WatchConnectivity). 이벤트 onRequest는 워치 요청이 들어올 때와 세션이 준비되거나 워치 상태가 바뀔 때 온다. */
export type ChagokWatchNative = {
  /** 세션이 켜졌고, 짝지은 워치에 워치 앱이 있다 */
  isReady(): boolean;
  /** 아직 처리하지 않은 워치 요청, JSON 문자열 */
  readRequests(): string[];
  ack(ids: string[]): void;
  /** 스냅샷 JSON을 applicationContext로 보낸다. 실패하면 던진다 */
  send(json: string): void;
  addListener?(event: 'onRequest', listener: () => void): { remove(): void };
};

/** 네이티브 모듈을 계획 1의 WatchPort 모양으로 감싼다. 모듈이 없거나 워치가 준비되지 않았으면 null — 동기화는 성장 수만 센다. */
export function createWatchPort(native: ChagokWatchNative | null): WatchPort | null {
  if (!native || !native.isReady()) return null;
  return {
    readRequests: async () => native.readRequests().flatMap((json): unknown[] => {
      try { return [JSON.parse(json)]; } catch { return []; }
    }),
    ack: async (ids) => { native.ack(ids); },
    send: async (snapshot) => { native.send(JSON.stringify(snapshot)); },
  };
}
