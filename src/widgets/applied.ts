/**
 * 위젯 요청을 기록에 반영했다는 신호. 이미 열려 있는 판 화면이 구독해 다시 읽는다 —
 * 앱이 앞으로 올 때 위젯 탭이 반영되어도, 포커스가 바뀌지 않은 화면은 스스로 다시 읽지 않기 때문이다.
 * 플랫폼과 무관한 모듈이라 iOS·기타 동기화 모듈과 화면이 함께 쓴다.
 */
const listeners = new Set<() => void>();

export function subscribeWidgetApplied(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function notifyWidgetApplied(): void {
  for (const fn of listeners) fn();
}
