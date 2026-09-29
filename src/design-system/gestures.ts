import {useCallback, useEffect, useRef} from 'react';

/** 두 번 누르기로 인정하는 간격. 한 번 누르기 동작은 이 시간만큼 기다린 뒤 실행된다. */
export const DOUBLE_PRESS_MS = 250;

/**
 * 한 번 누르기와 두 번 누르기를 가른다. `onDoublePress`가 없으면 기다리지 않고 바로 `onPress`를 부른다.
 * 붙인 칸에서 한 번 = 떼기, 두 번 = 기록 열기 (PRD 4.5). 꾹 누르기는 호스트가 `onLongPress`로 따로 연결한다.
 */
export function useSinglePressOrDouble(onPress: (() => void) | undefined, onDoublePress: (() => void) | undefined) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {if (timer.current) clearTimeout(timer.current);}, []);
  return useCallback(() => {
    if (!onDoublePress) {onPress?.(); return;}
    if (timer.current) {clearTimeout(timer.current); timer.current = null; onDoublePress(); return;}
    timer.current = setTimeout(() => {timer.current = null; onPress?.();}, DOUBLE_PRESS_MS);
  }, [onPress, onDoublePress]);
}
