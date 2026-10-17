import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { retro } from '../design-system';
import { loadPackState } from '../repositories/packRepository';
import { AD_REQUEST, adUnits, adsLib } from './admob';

/**
 * 목표 탭 맨 아래, 탭 바 바로 위(8pt 띄움) 비맞춤 배너 (PRD 4.12). 목표 화면 안에 있어 화면을 밀면 함께 밀려 나간다.
 * 2026-10-17: 탭 바 묶음에서 옮겼다 — 거기 있으면 밀다가 탭이 바뀌는 순간 배너가 생기거나 사라지며 화면 높이가 바뀌어 1, 2번 탭 넘김이 끊겼다.
 * 불러오기 전·실패하면 높이 0 — 자리를 비워 두지 않는다. 광고 제거를 샀으면 그리지 않는다.
 */
export function GoalsAdBanner() {
  const ads = adsLib();
  const [adFree, setAdFree] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // 앱 설정에서 광고 제거를 사고 돌아오면 사라지도록 목표 탭에 올 때마다 다시 본다
  useFocusEffect(useCallback(() => {
    let alive = true;
    loadPackState().then((s) => { if (alive) setAdFree(s.adFree); }, () => {});
    return () => { alive = false; };
  }, []));

  if (!ads || adFree !== false || failed) return null;
  return (
    <View style={{ alignItems: 'center', paddingBottom: loaded ? 8 : 0, backgroundColor: retro.color.screen }}>
      <ads.BannerAd
        unitId={adUnits(ads).banner}
        size={ads.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={AD_REQUEST}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
