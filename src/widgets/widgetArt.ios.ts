import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { widgetsDirectory } from 'expo-widgets';
import type { WidgetArt } from './widgetProps';

// 그림을 고치면 파일 이름도 바꾼다 — 이미 복사된 같은 이름의 파일은 다시 복사하지 않는다.
const ART = {
  'color-sprout': require('../../assets/widget-art/color-sprout.png'),
  'color-shoe': require('../../assets/widget-art/color-shoe.png'),
  'color-book': require('../../assets/widget-art/color-book.png'),
  'color-flower': require('../../assets/widget-art/color-flower.png'),
  'color-star': require('../../assets/widget-art/color-star.png'),
  'color-cat': require('../../assets/widget-art/color-cat.png'),
  'mascot-curious': require('../../assets/widget-art/mascot-curious.png'),
  'mascot-excited': require('../../assets/widget-art/mascot-excited.png'),
  'mascot-sleepy': require('../../assets/widget-art/mascot-sleepy.png'),
  'bubble-ivory': require('../../assets/widget-art/bubble-ivory.png'),
  'bubble-white': require('../../assets/widget-art/bubble-white.png'),
  'bubble-ink': require('../../assets/widget-art/bubble-ink.png'),
} as const;

/** 위젯은 App Group 안의 파일만 그린다. 앱 번들 그림을 widgetsDirectory로 복사한다. */
async function uri(key: keyof typeof ART): Promise<string> {
  const target = new File(`${widgetsDirectory}/${key}.png`);
  if (!target.exists) {
    const asset = Asset.fromModule(ART[key]);
    await asset.downloadAsync();
    await new File(asset.localUri!).copy(target);
  }
  return target.uri;
}

let cached: Promise<WidgetArt> | null = null;
export function widgetArt(): Promise<WidgetArt> {
  cached ??= (async () => ({
    mascotYet: await uri('mascot-curious'),
    mascotDone: await uri('mascot-excited'),
    mascotSleepy: await uri('mascot-sleepy'),
    bubbles: { ivory: await uri('bubble-ivory'), white: await uri('bubble-white'), ink: await uri('bubble-ink') },
    stickers: Object.fromEntries(await Promise.all(
      (['sprout', 'shoe', 'book', 'flower', 'star', 'cat'] as const).map(async (id) => [id, await uri(`color-${id}`)] as const),
    )),
  }))().catch((e) => {
    cached = null; // 일시적인 복사 실패가 앱을 다시 켤 때까지 남지 않게 — 다음 호출에서 다시 시도한다
    throw e;
  });
  return cached;
}
