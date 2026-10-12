import { Platform, type Insets } from 'react-native';
import { retro } from './tokens';

/** 탭 대상 최소 크기 (2026-10-12 사용자 결정): iOS 44pt · Android 48dp. */
export const minTouchTarget = Platform.OS === 'android' ? 48 : retro.layout.touch;

/** 보이는 모양은 그대로 두고 누르는 영역만 최소 크기까지 넓힌다(`hitSlop`). 내용 따라 커지는 쪽은 넘기지 않는다. */
export function touchSlop({ width, height }: { width?: number; height?: number }): Insets {
  const x = width === undefined ? 0 : Math.max(0, (minTouchTarget - width) / 2);
  const y = height === undefined ? 0 : Math.max(0, (minTouchTarget - height) / 2);
  return { left: x, right: x, top: y, bottom: y };
}
