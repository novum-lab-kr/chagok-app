/**
 * 진행 중인 작업이 끝날 때까지 새 작업을 무시한다.
 *
 * 빈칸을 빠르게 두 번 누르면 두 번째 탭이 아직 갱신되지 않은 목록으로 같은 칸을 다시 계산해
 * 스티커가 두 개 붙는다. 저장과 다시 읽기가 모두 끝난 뒤에 다음 탭을 받는다.
 */
export function createSingleFlight(): (task: () => Promise<void>) => Promise<void> {
  let busy = false;
  return async (task) => {
    if (busy) return;
    busy = true;
    try {
      await task();
    } finally {
      busy = false;
    }
  };
}
