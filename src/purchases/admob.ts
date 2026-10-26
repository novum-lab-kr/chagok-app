import { Platform, TurboModuleRegistry } from 'react-native';
import { setAdStore } from './index';
import { playRewardedAd, type RewardedAdLike } from './rewardedAd';

type AdsLib = typeof import('react-native-google-mobile-ads');

/**
 * AdMob (2026-10-13 결정 — 테스트 광고 ID로 개발). 광고는 모두 비맞춤으로 요청한다(PRD 4.12).
 * 라이브러리는 불러오는 순간 네이티브 모듈을 찾고 없으면 멈춘다 — 광고 모듈이 없는 예전 개발 빌드·Expo Go가
 * 깨지지 않게 모듈이 있을 때만 불러온다.
 */
let lib: AdsLib | null | undefined;
export function adsLib(): AdsLib | null {
  if (lib === undefined) {
    lib = TurboModuleRegistry.get('RNGoogleMobileAdsModule')
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- 모듈이 있을 때만 불러와야 한다
      ? (require('react-native-google-mobile-ads') as AdsLib)
      : null;
  }
  return lib;
}

/** AdMob 앱 「차곡차곡」(iOS)의 광고 단위. 앱 ID는 app.json 플러그인에 있다. */
const IOS_AD_UNITS = {
  banner: 'ca-app-pub-3557389923784580/2081299973',
  rewarded: 'ca-app-pub-3557389923784580/3747850844',
};

/**
 * 개발 빌드는 Google 테스트 ID — 실제 광고를 개발 중에 띄우면 무효 트래픽으로 계정이 제한될 수 있다.
 * Android는 AdMob에 앱을 등록하기 전까지 테스트 ID(출시 전 최종 점검).
 */
export function adUnits(ads: AdsLib) {
  if (__DEV__ || Platform.OS !== 'ios') return { banner: ads.TestIds.ADAPTIVE_BANNER, rewarded: ads.TestIds.REWARDED };
  return IOS_AD_UNITS;
}
export const AD_REQUEST = { requestNonPersonalizedAdsOnly: true } as const;

let configured = false;

/** 앱을 켤 때 한 번. */
export async function configureAds(): Promise<boolean> {
  if (configured) return true;
  const ads = adsLib();
  if (!ads) return false;
  configured = true;
  setAdStore({
    showRewardedAd: () => playRewardedAd(
      ads.RewardedAd.createForAdRequest(adUnits(ads).rewarded, AD_REQUEST) as unknown as RewardedAdLike,
    ),
  });
  try {
    await ads.default().initialize();
  } catch {
    // 시작에 실패해도 광고 요청이 각자 실패로 끝난다 — 앱은 그대로 쓴다
  }
  return true;
}
