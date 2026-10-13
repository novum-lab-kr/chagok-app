import { TurboModuleRegistry } from 'react-native';
import { getSetting, setSetting } from '../repositories/appSettingsRepository';
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

/** 출시 전에 AdMob에서 받은 실제 광고 단위 ID로 바꾼다(출시 전 최종 점검). 지금은 Google 테스트 ID. */
export function adUnits(ads: AdsLib) {
  return { banner: ads.TestIds.ADAPTIVE_BANNER, rewarded: ads.TestIds.REWARDED };
}
export const AD_REQUEST = { requestNonPersonalizedAdsOnly: true } as const;

async function applyAudience(ads: AdsLib): Promise<void> {
  const child = (await getSetting('adChildDirected')) === '1';
  await ads.default().setRequestConfiguration({
    ageRestrictedTreatment: child ? ads.AgeRestrictedTreatment.CHILD : ads.AgeRestrictedTreatment.UNSPECIFIED,
  });
}

let configured = false;

/** 앱을 켤 때 한 번. 아동 처리 여부를 먼저 정하고 SDK를 시작한다 — 첫 광고 요청부터 붙게. */
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
    await applyAudience(ads);
    await ads.default().initialize();
  } catch {
    // 시작에 실패해도 광고 요청이 각자 실패로 끝난다 — 앱은 그대로 쓴다
  }
  return true;
}

/**
 * 동의 화면의 「만 14세 미만이에요」(on) · 만 14세 이상 확인 뒤 계정 연결(off).
 * 미만이라고 답한 사실은 이 기기에만 둔다 — 서버로 보내지 않는다.
 */
export async function setChildDirectedAds(on: boolean): Promise<void> {
  await setSetting('adChildDirected', on ? '1' : null);
  const ads = configured ? adsLib() : null;
  if (ads) await applyAudience(ads).catch(() => {});
}
