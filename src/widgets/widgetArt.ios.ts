import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { widgetsDirectory } from 'expo-widgets';
import type { WidgetArt } from './widgetProps';
import { widgetStickerArt } from './widgetStickerArt.generated';

// 그림을 고치면 파일 이름도 바꾼다 — 이미 복사된 같은 이름의 파일은 다시 복사하지 않는다.
const ART = {
  'mascot-basic': require('../../assets/widget-art/mascot-basic.png'),
  'mascot-smile': require('../../assets/widget-art/mascot-smile.png'),
  'mascot-excited': require('../../assets/widget-art/mascot-excited.png'),
  'mascot-sleepy': require('../../assets/widget-art/mascot-sleepy.png'),
  'bubble-ivory': require('../../assets/widget-art/bubble-ivory.png'),
  'bubble-white': require('../../assets/widget-art/bubble-white.png'),
  'bubble-ink': require('../../assets/widget-art/bubble-ink.png'),
} as const;

/** 위젯은 App Group 안의 파일만 그린다. 앱 번들 그림을 widgetsDirectory로 복사한다. */
async function uri(key: keyof typeof ART): Promise<string> {
  return copied(key, ART[key]);
}
async function copied(name: string, module: number): Promise<string> {
  const target = new File(`${widgetsDirectory}/${name}.png`);
  if (!target.exists) {
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    await new File(asset.localUri!).copy(target);
  }
  return target.uri;
}

let cached: Promise<WidgetArt> | null = null;
export function widgetArt(): Promise<WidgetArt> {
  cached ??= (async () => ({
    // 차곡이 표정 (2026-10-07): 아직 = 기본, 붙임 = 미소, 다 채움 = 신남
    mascotYet: await uri('mascot-basic'),
    mascotDone: await uri('mascot-smile'),
    mascotFull: await uri('mascot-excited'),
    mascotSleepy: await uri('mascot-sleepy'),
    bubbles: { ivory: await uri('bubble-ivory'), white: await uri('bubble-white'), ink: await uri('bubble-ink') },
    stickers: Object.fromEntries(await Promise.all(
      Object.entries(widgetStickerArt).map(async ([id, module]) => [id, await copied(`color-${id.replace('.', '-')}`, module)] as const),
    )),
  }))().catch((e) => {
    cached = null; // 일시적인 복사 실패가 앱을 다시 켤 때까지 남지 않게 — 다음 호출에서 다시 시도한다
    throw e;
  });
  return cached;
}
