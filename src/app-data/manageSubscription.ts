import { Linking, Platform } from 'react-native';
import { manageSubscriptionUrl } from '../purchases';

/** 스토어 기본 구독 관리 주소. RevenueCat이 주소를 모를 때 연다 */
const FALLBACK = Platform.OS === 'android'
  ? 'https://play.google.com/store/account/subscriptions'
  : 'https://apps.apple.com/account/subscriptions';

/**
 * 앱 설정의 [구독 관리]. 변경과 해지는 앱 안에서 하지 않고 스토어 구독 관리 화면을 바로 연다 (구독 설계 4.5).
 * 가입과 같은 한 번의 누름으로 열려 해지가 가입보다 복잡하지 않다 (전자상거래법 21조의2 1항 4호).
 */
export async function openSubscriptionManagement(): Promise<void> {
  const given = await manageSubscriptionUrl();
  // 스토어 구독 관리 주소일 때만 연다. 아니면 기본 주소 (보안 검토 2026-11-02 L5)
  const url = given && /^https:\/\/(apps\.apple\.com|play\.google\.com)\//.test(given) ? given : FALLBACK;
  await Linking.openURL(url).catch(() => Linking.openURL(FALLBACK).catch(() => {}));
}
