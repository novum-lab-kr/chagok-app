import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { retro } from '../design-system';
import { loadPackState } from '../repositories/packRepository';
import { AD_REQUEST, adUnits, adsLib } from './admob';

/**
 * 목표 탭의 탭 바 바로 위(8pt 띄움) 비맞춤 배너 (PRD 4.12). 다른 탭에서는 숨기기만 해서 탭을 오갈 때마다 다시 받지 않는다.
 * 불러오기 전·실패하면 높이 0 — 자리를 비워 두지 않는다. 광고 제거를 샀으면 그리지 않는다.
 */
export function GoalsAdBanner({ visible }: { visible: boolean }) {
  const ads = adsLib();
  const [adFree, setAdFree] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // 앱 설정에서 광고 제거를 사고 돌아오면 사라지도록 목표 탭에 올 때마다 다시 본다
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    loadPackState().then((s) => { if (alive) setAdFree(s.adFree); }, () => {});
    return () => { alive = false; };
  }, [visible]);

  if (!ads || adFree !== false || failed) return null;
  return (
    <View style={{ display: visible ? 'flex' : 'none', alignItems: 'center', paddingBottom: loaded ? 8 : 0, backgroundColor: retro.color.screen }}>
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
