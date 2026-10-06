/** iOS 밖에서는 아직 위젯이 없다 (Android는 계획 2). */
export function startWidgetSync(): () => void {
  return () => {};
}

/** 반영할 위젯 요청이 없으니 바로 풀린다. */
export function syncWidgetsNow(): Promise<void> {
  return Promise.resolve();
}
