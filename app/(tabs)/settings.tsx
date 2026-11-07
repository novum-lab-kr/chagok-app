import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useRouter } from 'expo-router';
import { track } from '../../src/analytics';
import {
  AccountBackupPanel, HelpInfoPanel, PixelDialogModal, PixelPanel, PixelText, PurchasePanel, RetroScreen, SettingRow, TabSafeArea, TabTitle, accountDialogs,
  stickerShopDialogs,
  type AccountBackupStatus, type SubscriptionSummary,
} from '../../src/design-system';
import { signOutAndWipe } from '../../src/app-data/signOut';
import { afterSignedOut, signOutDeps } from '../../src/app-data/signOutDeps';
import { formatBackedUpAt, localOnlyCount, readAccountState } from '../../src/sync/accountStatus';
import { syncDepsFor } from '../../src/sync/appSync';
import { pendingCount } from '../../src/sync/outbox';
import { pushOnce } from '../../src/sync/push';
import { getSupabase } from '../../src/sync/supabaseClient';
import { pauseSync, resumeSync, subscribeSyncStatus } from '../../src/sync/syncGate';
import { confirmWithTerms } from '../../src/policy/openPolicy';
import { getSetting } from '../../src/repositories/appSettingsRepository';
import { loadPackState } from '../../src/repositories/packRepository';
import { subscriptionSummary } from '../../src/app-data/subscriptionViews';
import { openSubscriptionManagement } from '../../src/app-data/manageSubscription';
import { buyAdFree, refreshSubscription, usingDevStore } from '../../src/purchases';
import { devChangeSubscription } from '../../src/purchases/devStore';
import { notifyBuyFailure, restoreWithDialog } from '../../src/app-data/purchaseDialogs';
import { useDialog } from '../../src/app-data/useDialog';
import { usePrices } from '../../src/app-data/usePrices';
import { createSingleFlight } from '../../src/app-data/singleFlight';
import { appVersion, openContactMail } from '../../src/support/openContactMail';
import { t } from '../../src/i18n';

type Logout = null | { step: 'confirm' | 'busy' | 'failed' } | { step: 'held'; count: number };

/** 앱 설정 (하단 탭 「설정」, 2026-10-12). 서버 설정이 있으면 「계정과 백업」 칸(시안 2C), 없으면 기기 저장 안내만. */
export default function AppSettings() {
  const nav = useRouter();
  const supabase = getSupabase();
  const [status, setStatus] = useState<AccountBackupStatus | null>(null);
  /** 세션이 있다. 「차단한 사람」 줄은 로그인해 있을 때만 보인다(차단은 서버에 있다) */
  const [signedIn, setSignedIn] = useState(false);
  const [logout, setLogout] = useState<Logout>(null);
  /** 「구매」 블럭 (PRD 4.9·4.12). 키가 있으면 RevenueCat, 없으면 개발용 대역 (src/purchases). */
  const [adFree, setAdFree] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionSummary>({ state: 'none' });
  const prices = usePrices();
  const [buyOnce] = useState(createSingleFlight);
  /** 기다리는 동안 누른 버튼에 로딩 점 (2026-10-13) */
  const [purchaseBusy, setPurchaseBusy] = useState<'adFree' | 'restore'>();
  const { ask, dialog: purchaseDialog } = useDialog();
  useFocusEffect(useCallback(() => {
    let alive = true;
    const read = () => loadPackState().then((p) => {
      if (!alive) return;
      setAdFree(p.adFree);
      setSubscription(subscriptionSummary(p.subscription, Date.now()));
    });
    void read().then(() => refreshSubscription()).then(read);
    return () => { alive = false; };
  }, []));
  /** 사기 전에 환불 안내 확인 창을 먼저 띄운다([약관 보기]를 누르면 약관을 본 뒤 다시 묻는다). 결제 창을 닫은 취소에는 알리지 않는다. */
  async function removeAds() {
    if (!(await confirmWithTerms(ask, stickerShopDialogs.confirmAdFree))) return;
    setPurchaseBusy('adFree');
    const r = await buyAdFree().finally(() => setPurchaseBusy(undefined));
    if (r.ok) setAdFree(true);
    else await notifyBuyFailure(ask, r, stickerShopDialogs.adFreeFailed);
  }
  async function restore() {
    setPurchaseBusy('restore');
    await restoreWithDialog(ask, () => setPurchaseBusy(undefined), async () => {
      const p = await loadPackState();
      setAdFree(p.adFree);
      setSubscription(subscriptionSummary(p.subscription, Date.now()));
    });
  }
  /** 시험용 (개발 빌드, 결제 키 없을 때만): 구독 해지 예약과 끝내기 (2026-11-02) */
  async function devSubscription(change: 'cancel' | 'expire') {
    await devChangeSubscription(change);
    await refreshSubscription();
    const p = await loadPackState();
    setAdFree(p.adFree);
    setSubscription(subscriptionSummary(p.subscription, Date.now()));
  }

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.getSession();
    // 오프라인에서 토큰을 갱신하지 못한 것은 로그인이 풀린 게 아니다 — 연결한 계정 그대로 보여준다
    const sessionUser = error ? await getSetting('accountUserId') : data.session?.user.id ?? null;
    const s = await readAccountState(sessionUser);
    setSignedIn(s.state !== 'local' && s.state !== 'needsLogin');
    setStatus(s.state === 'synced'
      ? { state: 'synced', provider: s.provider, backedUpAt: formatBackedUpAt(s.lastSyncedAt, new Date()) }
      : s);
  }, [supabase]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => subscribeSyncStatus(() => { void load(); }), [load]);
  // 서버에서 계정이 지워져 토큰 갱신이 실패하면 세션이 풀린다 — 보고 있는 중에도 바로 「로그인이 필요해요」로 바꾼다 (2026-10-26)
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => data.subscription.unsubscribe();
  }, [supabase, load]);

  /** 서버 쪽 일이 끝난 뒤에만 기기를 비운다 (계정·백업 설계 ①). */
  const finishLogout = async () => {
    try {
      await signOutAndWipe(signOutDeps(supabase));
    } catch {
      setLogout({ step: 'failed' });
      return;
    }
    track('logout');
    afterSignedOut();
    setLogout(null);
    router.replace('/');
  };

  /** 보내고 나서 남은 기록을 센다. 로그인이 풀렸으면 보낼 수 없으니 남은 기록 전부로 경고한다. */
  const runLogout = async () => {
    if (!supabase) return;
    setLogout({ step: 'busy' });
    pauseSync();
    let left: number;
    try {
      const { data, error } = await supabase.auth.getSession();
      // 오프라인이라 확인하지 못했으면 실패로 알린다 — 남은 기록을 전부 지운다고 잘못 경고하지 않게
      if (error) throw error;
      const user = data.session?.user;
      if (user) {
        await pushOnce(await syncDepsFor(supabase, user.id));
        left = (await pendingCount()).held;
      } else {
        left = await localOnlyCount();
      }
    } catch {
      // 실패 다이얼로그의 [닫기]가 잠금을 푼다 — 진행 중 다이얼로그에 갇히지 않게
      setLogout({ step: 'failed' });
      return;
    }
    if (left > 0) setLogout({ step: 'held', count: left });
    else await finishLogout();
  };

  const closeLogout = () => { resumeSync(); setLogout(null); };

  const logoutDialog = (() => {
    if (!logout) return null;
    if (logout.step === 'failed') {
      return { ...accountDialogs.logoutFailed, onPrimary: () => void runLogout(), onSecondary: closeLogout, onRequestClose: closeLogout };
    }
    if (logout.step === 'held') {
      return { ...accountDialogs.logoutHeld(logout.count), onPrimary: () => void finishLogout(), onSecondary: closeLogout, onRequestClose: closeLogout };
    }
    return {
      ...accountDialogs.logout, loading: logout.step === 'busy',
      onPrimary: () => void runLogout(), onSecondary: () => setLogout(null), onRequestClose: () => setLogout(null),
    };
  })();

  return (
    <TabSafeArea>
      <RetroScreen style={{ gap: 16 }} header={<TabTitle title={t('tabs.settings')} />}>
        {supabase ? (
          status && (
            <AccountBackupPanel
              status={status}
              onConnect={() => nav.push({ pathname: '/account/connect', params: { from: 'settings' } })}
              onLogin={() => nav.push({ pathname: '/account/connect', params: { from: 'relogin' } })}
              onLogout={() => setLogout({ step: 'confirm' })}
              onDelete={() => nav.push('/account/delete')}
              onBlocked={signedIn ? () => nav.push('/settings/blocked') : undefined}
            />
          )
        ) : (
          <PixelPanel title={t('settings.deviceOnlyTitle')}>
            <PixelText>{t('settings.deviceOnlyBody')}</PixelText>
          </PixelPanel>
        )}
        <PurchasePanel adFree={adFree} price={prices.adFree} busy={purchaseBusy} onRemoveAds={() => { void buyOnce(removeAds); }} onRestore={() => { void buyOnce(restore); }} subscription={subscription} onSubscribe={() => nav.push('/subscription')} onManageSubscription={() => { void openSubscriptionManagement(); }} />
        <HelpInfoPanel
          adFree={adFree}
          version={appVersion()}
          onTutorial={() => nav.push('/tutorial')}
          onContact={() => { void openContactMail('question', ask); }}
          onReportAd={() => { void openContactMail('adReport', ask); }}
          onPolicies={() => nav.push('/policies')}
          onSendInfo={() => nav.push('/send-info')}
        />
        {__DEV__ && (supabase || usingDevStore()) && (
          <PixelPanel title="개발">
            {supabase && <SettingRow label="서버 동기화 (개발)" onPress={() => nav.push('/dev/sync')} />}
            {usingDevStore() && <SettingRow label="시험: 구독 해지 예약" onPress={() => { void devSubscription('cancel'); }} />}
            {usingDevStore() && <SettingRow label="시험: 구독 끝내기" onPress={() => { void devSubscription('expire'); }} />}
          </PixelPanel>
        )}
      </RetroScreen>
      {logoutDialog && <PixelDialogModal visible {...logoutDialog} />}
      {purchaseDialog}
    </TabSafeArea>
  );
}
