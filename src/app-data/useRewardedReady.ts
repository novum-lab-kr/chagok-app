import { useEffect, useSyncExternalStore } from 'react';
import { rewardedReadiness } from '../purchases';

const subscribe = (onChange: () => void) => rewardedReadiness().subscribe(onChange);
const snapshot = () => rewardedReadiness().ready();

/**
 * 보상형 광고를 지금 띄울 수 있는가. 화면이 열리면 미리 불러오기를 시작하고, 준비되면 true로 바뀐다 (2026-11-04).
 * 광고를 못 불러오는 동안(AdMob 승인 전, 오프라인 등) [광고 보고 하루]를 숨기는 데 쓴다.
 */
export function useRewardedReady(enabled: boolean): boolean {
  const ready = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    if (enabled) rewardedReadiness().preload();
  }, [enabled]);
  return ready;
}
