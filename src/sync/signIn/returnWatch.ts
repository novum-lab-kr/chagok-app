/** 앱 상태('active', 'inactive', 'background')를 읽고 바뀔 때 알려 주는 곳. 실제로는 React Native AppState. */
export type AppStateSource = {
  current(): string;
  subscribe(onChange: (state: string) => void): () => void;
};

/**
 * 로그인 창이나 다른 앱(카카오톡)에 갔다가 돌아왔는데 graceMs 안에 결과가 없으면 'returned'로 끝낸다.
 * SDK가 돌아온 주소를 받지 못하면 로그인 약속이 끝나지 않아 연결 화면이 잠긴 채 남았다(2026-11-04).
 * 앱을 떠나지 않은 동안과, 돌아왔다 다시 나간 동안은 기다린다.
 */
export function settleOnReturn<T>(work: Promise<T>, app: AppStateSource, graceMs: number): Promise<T | 'returned'> {
  return new Promise((resolve, reject) => {
    let left = app.current() !== 'active';
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stopTimer = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
    const unsubscribe = app.subscribe((state) => {
      if (state !== 'active') {
        left = true;
        stopTimer();
        return;
      }
      if (!left || timer !== null) return;
      timer = setTimeout(() => { done(); resolve('returned'); }, graceMs);
    });
    const done = () => { stopTimer(); unsubscribe(); };
    work.then(
      (value) => { done(); resolve(value); },
      (error) => { done(); reject(error); },
    );
  });
}
