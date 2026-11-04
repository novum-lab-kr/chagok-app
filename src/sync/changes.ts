/**
 * 로컬 데이터가 바뀌었다는 신호. 전송 스케줄러와 위젯 갱신이 구독한다.
 * outbox에 넣을 때(트랜잭션 안) 보내므로 커밋 전일 수 있다. 구독자는 1초 이상 모아서 처리한다.
 * 트랜잭션이 되돌려져도 구독자는 새로 보낼 것이 없음을 확인하고 끝난다.
 */
const listeners = new Set<() => void>();

export function subscribeLocalChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** 신호를 ms 동안 모아 마지막 신호 뒤 한 번 부른다. 화면이 기기 DB를 다시 읽을 때 쓴다(커밋 전 신호를 건너뛰게). */
export function subscribeLocalChangeGathered(fn: () => void, ms = 1000): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const off = subscribeLocalChange(() => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  });
  return () => { off(); clearTimeout(timer); };
}

export function notifyLocalChange(): void {
  for (const fn of listeners) fn();
}
