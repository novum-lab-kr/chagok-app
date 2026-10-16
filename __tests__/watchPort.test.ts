import { createWatchPort } from '../src/watch/watchPortCore';
import type { ChagokWatchNative } from '../src/watch/watchPortCore';

function native(over: Partial<ChagokWatchNative> = {}): ChagokWatchNative & { sent: string[]; acked: string[][] } {
  const sent: string[] = [];
  const acked: string[][] = [];
  return {
    sent, acked,
    isReady: () => true,
    readRequests: () => [],
    ack: (ids) => { acked.push(ids); },
    send: (json) => { sent.push(json); },
    ...over,
  };
}

describe('createWatchPort (워치 계획 2 Task 4)', () => {
  it('네이티브 모듈이 없으면 null — Android와 테스트', () => {
    expect(createWatchPort(null)).toBeNull();
  });

  it('짝지은 워치나 워치 앱이 없으면 null', () => {
    expect(createWatchPort(native({ isReady: () => false }))).toBeNull();
  });

  it('요청 JSON을 풀고, 풀 수 없는 것은 뺀다', async () => {
    const port = createWatchPort(native({ readRequests: () => ['{"id":"a","kind":"add"}', 'not json', '{"id":"b"}'] }))!;
    expect(await port.readRequests()).toEqual([{ id: 'a', kind: 'add' }, { id: 'b' }]);
  });

  it('ack와 send를 네이티브에 넘긴다 — 스냅샷은 JSON 문자열로', async () => {
    const n = native();
    const port = createWatchPort(n)!;
    await port.ack(['a']);
    await port.send({ v: 1, growth: 3 } as never);
    expect(n.acked).toEqual([['a']]);
    expect(JSON.parse(n.sent[0])).toEqual({ v: 1, growth: 3 });
  });
});
