import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { PackScreen, PixelLoadingIndicator, RetroScreen, stickerShopDialogs } from '../../../src/design-system';
import { endLabel, packViews, samplePlacement } from '../../../src/app-data/packViews';
import { offerOpenPack } from '../../../src/app-data/stickerChoice';
import { saveOrNotify, useDialog } from '../../../src/app-data/useDialog';
import { goBackOrHome } from '../../../src/app-data/goBack';
import { createSingleFlight } from '../../../src/app-data/singleFlight';
import { AD_TRIAL_MS, dayTrialThreshold } from '../../../src/domain/packs';
import { loadPackState, startDayTrial } from '../../../src/repositories/packRepository';
import { buyPack, watchAdForPack } from '../../../src/purchases';
import type { ColorStickerPackId } from '../../../src/stickers/color/catalog';

type PackState = Awaited<ReturnType<typeof loadPackState>>;

/**
 * 묶음 화면 (PRD 4.12). 「기본 스티커」의 잠긴 묶음, 판 화면 「체험이 끝났어요」의 [묶음 열기]에서 연다.
 * 열면(사기·광고 하루·붙인 날 3일) 앞 화면으로 돌아가 그 묶음을 펼친다.
 */
export default function Pack() {
  const { packId } = useLocalSearchParams<{ packId: ColorStickerPackId }>();
  const [state, setState] = useState<{ pack: PackState; now: number } | null>(null);
  const [once] = useState(createSingleFlight);
  const { ask, dialog } = useDialog();

  useFocusEffect(useCallback(() => {
    let alive = true;
    void loadPackState().then((pack) => { if (alive) setState({ pack, now: Date.now() }); });
    return () => { alive = false; };
  }, []));

  const view = state ? packViews(state.pack.access, state.now).find((p) => p.id === packId) : undefined;
  if (!state || !view) {
    return (
      <RetroScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelLoadingIndicator label="불러오는 중" />
        </View>
      </RetroScreen>
    );
  }

  const opened = () => { offerOpenPack(packId); goBackOrHome(); };

  /** 결제 팝업은 스토어가 그린다. 취소하면 아무것도 하지 않는다. */
  async function buy() {
    const r = await buyPack(packId);
    if (!r.ok) return;
    await ask(stickerShopDialogs.bought(view!.label));
    opened();
  }

  /** 광고를 끝까지 본 때부터 24시간. 닫거나 못 불러오면 아무것도 하지 않는다. */
  async function watchAd() {
    const r = await watchAdForPack(packId);
    if (!r.ok) return;
    await ask(stickerShopDialogs.adTrialStarted(endLabel(r.endsAt, r.endsAt - AD_TRIAL_MS)));
    opened();
  }

  async function trial() {
    const ok = await saveOrNotify(ask, '써 보기를 시작하지 못했어요', async () => { await startDayTrial(packId); });
    if (ok) opened();
  }

  return (
    <>
      <PackScreen
        pack={view}
        sample={samplePlacement(view)}
        adFree={state.pack.adFree}
        reward={{ days: state.pack.days, goal: dayTrialThreshold(state.pack.claimed) }}
        onBuy={() => { void once(buy); }}
        onWatchAd={() => { void once(watchAd); }}
        onTrial={() => { void once(trial); }}
        onBack={goBackOrHome}
      />
      {dialog}
    </>
  );
}
