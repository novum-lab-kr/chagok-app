import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LoadingScreen, SubscriptionScreen, stickerShopDialogs, useLoadRetry, type SubscriptionPlan } from '../src/design-system';
import { planViews } from '../src/app-data/subscriptionViews';
import { notifyBuyFailure, restoreWithDialog } from '../src/app-data/purchaseDialogs';
import { useDialog } from '../src/app-data/useDialog';
import { goBackOrHome, goHome } from '../src/app-data/goBack';
import { createSingleFlight } from '../src/app-data/singleFlight';
import { FREE_GOAL_LIMIT } from '../src/domain/subscription';
import { loadSubscriptionPrices, refreshSubscription, subscribe } from '../src/purchases';
import type { StorePrice } from '../src/purchases/price';
import { openPolicy } from '../src/policy/openPolicy';

/**
 * 구독 화면 (2026-11-02 구독 흐름 시안 확정). 앱 설정 [구독 보기], 묶음 화면 [구독하고 모든 묶음 열기],
 * 목표가 5개일 때 목표 탭 [+](from=goals)에서 연다. 구독하거나 복원해서 구독이 되면 연 화면으로 돌아간다.
 */
export default function Subscription() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [prices, setPrices] = useState<Partial<Record<SubscriptionPlan, StorePrice>> | null>(null);
  const [busy, setBusy] = useState<SubscriptionPlan | 'restore'>();
  const [once] = useState(createSingleFlight);
  const { ask, dialog } = useDialog();
  const { failed, attempt, fail, retry } = useLoadRetry();

  useFocusEffect(useCallback(() => {
    let alive = true;
    void refreshSubscription();
    void loadSubscriptionPrices()
      .then((p) => { if (alive) setPrices(p); })
      .catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  // attempt는 [다시 시도] 때 다시 읽게 하는 신호라 콜백 안에서 쓰지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, fail]));

  const views = prices ? planViews(prices, new Date()) : null;
  if (!views) {
    // 받았는데 가격이 없으면(스토어에 상품이 없음) 기다려도 소용없으니 바로 안내한다.
    return <LoadingScreen failed={failed || prices !== null} kind="screen" onRetry={retry} onHome={goHome} />;
  }

  /** 결제 창을 닫은 취소에는 아무것도 띄우지 않는다. 보호자 승인을 기다리면 그 안내 (구독 설계 4.2). */
  async function buy(plan: SubscriptionPlan) {
    setBusy(plan);
    const r = await subscribe(plan).finally(() => setBusy(undefined));
    if (!r.ok) {
      await notifyBuyFailure(ask, r, stickerShopDialogs.subscribeFailed);
      return;
    }
    await ask(stickerShopDialogs.subscribed);
    goBackOrHome();
  }

  async function restore() {
    setBusy('restore');
    if ((await restoreWithDialog(ask, () => setBusy(undefined))) === null) return;
    if (await refreshSubscription()) goBackOrHome();
  }

  return (
    <>
      <SubscriptionScreen
        month={views.month}
        year={views.year}
        goalLimit={from === 'goals' ? FREE_GOAL_LIMIT : undefined}
        busy={busy}
        onSubscribe={(plan) => { void once(() => buy(plan)); }}
        onRestore={() => { void once(restore); }}
        onTerms={() => { void openPolicy('terms', ask); }}
        onPrivacy={() => { void openPolicy('privacy', ask); }}
        onBack={goBackOrHome}
      />
      {dialog}
    </>
  );
}
