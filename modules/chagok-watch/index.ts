import { requireOptionalNativeModule } from 'expo-modules-core';
import type { ChagokWatchNative } from '../../src/watch/watchPortCore';

/** iOS 폰 앱에만 있다. Android, 웹, 테스트에서는 null */
export default requireOptionalNativeModule<ChagokWatchNative>('ChagokWatch');
