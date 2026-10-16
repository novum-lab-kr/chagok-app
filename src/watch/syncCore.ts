import { isWidgetRequest } from '../widgets/requests';
import type { WidgetRequest } from '../widgets/requests';
import type { WatchSnapshot } from './snapshot';

export type WatchPort = {
  /** 워치가 보낸 아직 처리하지 않은 요청 (네이티브 큐, transferUserInfo로 받은 것) */
  readRequests(): Promise<unknown[]>;
  /** 처리한 요청 id를 큐에서 지운다 */
  ack(ids: string[]): Promise<void>;
  /** 스냅샷 하나를 워치에 보낸다 (updateApplicationContext, 마지막 하나만 남는다) */
  send(snapshot: WatchSnapshot): Promise<void>;
};

export type WatchSyncDeps = {
  /** 짝지은 워치가 없거나 네이티브 모듈이 없으면 null */
  port: WatchPort | null;
  apply(requests: WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }>;
  growth(): Promise<number>;
  snapshot(date: Date, growth: number): Promise<WatchSnapshot>;
  now(): Date;
};

/** 모양이 맞는 요청(같은 id는 하나)과, 모양이 틀렸지만 id가 있어 큐에서 지울 수 있는 것 */
function split(list: unknown[]): { requests: WidgetRequest[]; invalidIds: string[] } {
  const seen = new Map<string, WidgetRequest>();
  const invalidIds: string[] = [];
  for (const v of list) {
    if (isWidgetRequest(v)) { if (!seen.has(v.id)) seen.set(v.id, v); continue; }
    const id = typeof v === 'object' && v !== null ? (v as { id?: unknown }).id : undefined;
    if (typeof id === 'string') invalidIds.push(id);
  }
  return { requests: [...seen.values()], invalidIds };
}

/**
 * 워치 요청 처리 + 성장 갱신 + 스냅샷 보내기 한 번 (워치 설계 「구조」).
 * 요청은 위젯과 같은 applyWidgetRequests로 처리한다 — 처리한 id 목록을 함께 써서 두 번 붙지 않는다.
 * 성장 수는 요청을 처리한 뒤에 센다(방금 붙인 것이 들어가게). 워치가 없어도 센다 — 기록이 바뀔 때마다 세야
 * 판을 지우기 전의 수가 남아 줄지 않는다.
 */
export async function syncWatchOnce(deps: WatchSyncDeps): Promise<{ changed: boolean }> {
  let changed = false;
  if (deps.port) {
    const { requests, invalidIds } = split(await deps.port.readRequests());
    let handled: string[] = [];
    if (requests.length > 0) {
      const out = await deps.apply(requests);
      changed = out.changed;
      handled = out.handled;
    }
    // 모양이 틀린 요청은 처리할 수 없다 — 지우지 않으면 큐에 남아 동기화마다 다시 읽힌다.
    const done = [...handled, ...invalidIds.filter((id) => !handled.includes(id))];
    if (done.length > 0) await deps.port.ack(done);
  }
  const growth = await deps.growth();
  if (deps.port) await deps.port.send(await deps.snapshot(deps.now(), growth));
  return { changed };
}
