import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { cachedPrices, loadPrices } from '../purchases';
import type { PriceLabels } from '../purchases/price';

/**
 * 묶음·광고 제거 가격 글자 (2026-10-13). 화면이 보일 때마다 스토어에 다시 묻는다.
 * 처음에는 앱을 켤 때 받아 둔 값으로 그려서, 가격이 빈 채로 깜빡이지 않는다.
 */
export function usePrices(): PriceLabels {
  const [prices, setPrices] = useState<PriceLabels>(cachedPrices);
  useFocusEffect(useCallback(() => {
    let alive = true;
    void loadPrices().then((p) => { if (alive) setPrices(p); });
    return () => { alive = false; };
  }, []));
  return prices;
}
