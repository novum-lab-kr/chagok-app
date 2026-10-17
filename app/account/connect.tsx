import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
  ConsentScreen, LoginCircles, PixelBusyModal, PixelButton, PixelDialogModal, RestoreConflictScreen, accountDialogs,
  type LoginProvider, type RecordSnapshot, type RestoreSide,
} from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { removeManagedRecordPhoto } from '../../src/app-data/recordPhotos';
import { useDialog } from '../../src/app-data/useDialog';
import { localDateKey } from '../../src/domain/dates';
import { currentVersions, fetchPolicyManifest } from '../../src/policy/manifest';
import { openPolicy } from '../../src/policy/openPolicy';
import { setChildDirectedAds } from '../../src/purchases/admob';
import { getSetting, setFlag, setSetting } from '../../src/repositories/appSettingsRepository';
import { recordConsent, signOutLocal } from '../../src/sync/account';
import { providerFromAuth } from '../../src/sync/accountStatus';
import { syncDepsFor } from '../../src/sync/appSync';
import { decideConnection } from '../../src/sync/connectAccount';
import { enqueueAll } from '../../src/sync/outbox';
import type { PushDeps } from '../../src/sync/push';
import {
  applyRestore, downloadRestoredPhotos, hasLocalData, pullAll, replaceServerWithDevice, summarizeDevice, summarizeSnapshot,
  type RecordSummary, type ServerSnapshot,
} from '../../src/sync/restore';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { signInWithApple } from '../../src/sync/signIn/apple';
import { appleSignInAvailable, expoAppleDeps } from '../../src/sync/signIn/expoApple';
import { clearStoredSession, getSupabase } from '../../src/sync/supabaseClient';
import { beginConnect, endConnect, markRestored } from '../../src/sync/connectMarker';
import { pauseSync, resumeSync } from '../../src/sync/syncGate';

const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_EMAIL;
const DEV_PASSWORD = process.env.EXPO_PUBLIC_DEV_PASSWORD;

type From = 'start' | 'settings' | 'relogin';
type Step =
  | { kind: 'consent' }
  | { kind: 'restoring' }
  | { kind: 'conflict'; snap: ServerSnapshot; server: RecordSnapshot; device: RecordSnapshot; choice: RestoreSide };

/** 화면을 떠나 취소된 로그인 시도 */
const ABORTED = new Error('aborted');

/** 사용자가 로그인 창을 닫았다. 알림 없이 동의 화면으로 돌아간다. */
const CANCELED = new Error('canceled');

/** 동의 화면 소개에 적는 로그인 수단 (2026-10-15). iOS만 Apple이 있다. */
const LOGIN_PROVIDERS: LoginProvider[] = Platform.OS === 'ios' ? ['kakao', 'apple', 'google'] : ['kakao', 'google'];

type Method = 'apple' | 'dev';

const connectFailed = { title: '연결하지 못했어요', description: '인터넷 연결을 확인하고 다시 시도해 주세요.', primaryLabel: '확인' };

function toCard(s: RecordSummary): RecordSnapshot {
  const d = s.updatedAt === null ? null : new Date(s.updatedAt);
  return { goals: s.goals, stickers: s.stickers, goalNames: s.goalNames, updatedAt: d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '없음' };
}

/**
 * 계정 연결 (계정·백업 설계 ①). 동의 → 로그인 → 분기(연결만·첫 백업·복원·충돌 선택).
 * 로그인 자리에는 iOS면 Apple 동그라미 버튼(`LoginCircles`, 2026-10-15), 개발 빌드면 개발 계정 버튼을 둔다. 카카오·Google 버튼은 그 로그인을 붙일 때 더한다.
 * 연결이 끝날 때까지 자동 전송을 잠근다 — 복원 충돌을 고르기 전에 기기 기록이 올라가지 않게.
 */
export default function ConnectAccount() {
  const supabase = getSupabase();
  return supabase ? <Connect supabase={supabase} /> : null;
}

function Connect({ supabase }: { supabase: SupabaseClient }) {
  const { from = 'settings' } = useLocalSearchParams<{ from?: From }>();
  const navigation = useNavigation();
  const { ask, dialog } = useDialog();
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'consent' });
  /** 복원 실패: [다시 시도]가 할 일 */
  const [failed, setFailed] = useState<null | (() => void)>(null);
  /** 이 기기에서 연결했던 계정. 연결을 취소하면 이 표시로 되돌린다. */
  const previous = useRef<string | null>(null);
  const session = useRef<{ userId: string; deps: PushDeps } | null>(null);
  /** 연결을 끝냈거나 취소했다. 아니면 화면을 떠날 때 취소한다. */
  const settled = useRef(true);
  /** 로그인 시도 번호. 취소하면 올라가서, 진행 중이던 시도는 await 뒤에 멈춘다. */
  const attempt = useRef(0);
  /** 로그인 요청이 아직 돌아오지 않았다. 이때 취소하면 잠금을 풀지 않는다 — 늦게 생긴 세션이 잠금 없이 보내지 않게. */
  const signingIn = useRef(false);
  /** 뒤로가기·화면 떠남에서 부를 최신 cancel */
  const cancelRef = useRef<() => Promise<void>>(async () => {});
  const [appleReady, setAppleReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void appleSignInAvailable().then((ok) => { if (alive) setAppleReady(ok); });
    return () => { alive = false; };
  }, []);

  // 다시 로그인이면(이 기기에서 연결한 적 있음) 두 체크를 켠 채로 연다 (2026-10-01)
  useEffect(() => {
    let alive = true;
    void (async () => {
      const id = await getSetting('accountUserId');
      if (!alive) return;
      previous.current = id;
      if (id) { setAge(true); setTerms(true); }
    })();
    return () => { alive = false; };
  }, []);

  // 로그인 중에는 화면을 떠나지 않는다 — 떠나면 로그인이 끝난 뒤 잠금 없이 새 계정으로 보낼 수 있다 (2026-10-02 리뷰)
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !busy });
    if (!busy) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [busy, navigation]);

  // 복원 중에는 Android 뒤로가기로 빠져나가지 않는다. 충돌 화면의 뒤로가기는 연결 취소다.
  useEffect(() => {
    if (step.kind === 'consent') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step.kind === 'conflict') void cancelRef.current();
      return true;
    });
    return () => sub.remove();
  }, [step.kind]);

  // 연결 도중 화면을 떠나면(스와이프 등) 반쯤 연결된 채로 남기지 않는다
  useEffect(() => () => { if (!settled.current) void cancelRef.current(); }, []);

  const finish = async (restored: boolean) => {
    // 플래그를 먼저 쓴다 — 실패하면 아직 잠금이 걸린 채로 취소된다
    if (from === 'start') {
      await setFlag('startDone', true);
      if (restored) await setFlag('tutorialDone', true);
    }
    settled.current = true;
    await endConnect();
    resumeSync();
    if (from === 'start') router.replace('/');
    else goBackOrHome();
  };

  /** 반쯤 연결된 채로 남기지 않는다: 로그아웃하고 이전 계정 표시로 되돌린다. 체크 상태는 그대로. */
  const cancel = async () => {
    settled.current = true;
    session.current = null;
    attempt.current += 1;
    try {
      await signOutLocal(supabase, clearStoredSession);
      await setSetting('accountUserId', previous.current);
      await endConnect();
    } finally {
      // 로그인 요청이 진행 중이면 그 시도가 돌아와 세션을 지운 뒤 잠금을 푼다 (connect의 중단 처리)
      if (!signingIn.current) resumeSync();
      setStep({ kind: 'consent' });
    }
  };
  useEffect(() => { cancelRef.current = cancel; });

  const link = async (userId: string) => { await setSetting('accountUserId', userId); };

  /** 고른 방법으로 로그인한다. 사용자가 로그인 창을 닫으면 'canceled'. */
  const signInWith = async (method: Method): Promise<{ user: User } | 'canceled'> => {
    if (method === 'apple') return signInWithApple(expoAppleDeps(supabase));
    const { data, error } = await supabase.auth.signInWithPassword({ email: DEV_EMAIL!, password: DEV_PASSWORD! });
    if (error || !data.user) throw error ?? new Error('no user');
    return { user: data.user };
  };

  const runRestore = async (snap: ServerSnapshot | null) => {
    const s = session.current!;
    setStep({ kind: 'restoring' });
    try {
      const data = snap ?? await pullAll(s.deps.server);
      const { photos, oldPhotoUris } = await applyRestore(data);
      // 기기가 이제 이 계정 기록이다. 이 뒤에서 실패해 취소해도 이전 계정 표시로 되돌리지 않게 먼저 연결한다.
      await link(s.userId);
      await markRestored(s.userId);
      previous.current = s.userId;
      oldPhotoUris.forEach(removeManagedRecordPhoto);
      await downloadRestoredPhotos(s.deps.photos, photos);
      await finish(true);
    } catch {
      setFailed(() => () => { setFailed(null); void runRestore(null); });
    }
  };

  const keepDevice = async () => {
    const s = session.current!;
    setStep({ kind: 'restoring' });
    try {
      await replaceServerWithDevice(s.deps.server, s.deps.deviceId);
      await link(s.userId);
      await finish(false); // 사진은 잠금이 풀린 뒤 자동 전송이 올린다
    } catch {
      setFailed(() => () => { setFailed(null); void keepDevice(); });
    }
  };

  const connect = async (method: Method) => {
    if (method === 'dev' && (!DEV_EMAIL || !DEV_PASSWORD)) return;
    // Apple 버튼에는 진행 표시가 없어 두 번 누르기를 여기서 막는다
    if (busy) return;
    setBusy(true);
    try {
      let versions: { terms: number; privacy: number };
      try {
        versions = currentVersions(await fetchPolicyManifest(), localDateKey(Date.now()));
      } catch {
        await ask(connectFailed);
        return;
      }
      // 여기서부터 끝나거나 취소될 때까지 전송을 잠근다. 앱이 꺼져도 다음 실행에서 되돌린다 (connectMarker).
      settled.current = false;
      pauseSync();
      const mine = ++attempt.current;
      /** 이 시도가 취소됐으면(화면을 떠남) 멈춘다 */
      const check = () => { if (attempt.current !== mine) throw ABORTED; };
      try {
        await beginConnect(previous.current);
        check();
        signingIn.current = true;
        // 로그인 실패도 check() 뒤에 던진다 — 화면을 떠난 시도가 다이얼로그를 띄우지 않게
        let signIn: { user: User } | 'canceled' | { failed: unknown };
        try {
          signIn = await signInWith(method);
        } catch (e) {
          signIn = { failed: e };
        } finally {
          signingIn.current = false;
        }
        check();
        if (signIn === 'canceled') throw CANCELED;
        if ('failed' in signIn) throw signIn.failed;
        const { user } = signIn;
        await recordConsent(supabase, versions.terms, versions.privacy);
        // 만 14세 이상이라고 확인했으니 전에 미만이라고 눌렀어도 아동 처리를 푼다
        await setChildDirectedAds(false);
        check();
        await setSetting('accountProvider', providerFromAuth(user.app_metadata.provider));
        await setSetting('sessionPrompted', null);
        const deps = await syncDepsFor(supabase, user.id);
        check();
        session.current = { userId: user.id, deps };
        const serverHasData = (await deps.server.state()).goals > 0;
        const deviceHasData = await hasLocalData();
        check();
        const plan = decideConnection({ previousUserId: previous.current, userId: user.id, deviceHasData, serverHasData });
        if (plan === 'same' || plan === 'linkOnly') {
          await link(user.id);
          await finish(false);
        } else if (plan === 'firstBackup') {
          await enqueueAll();
          await setSetting('firstBackup', '1');
          await link(user.id);
          await finish(false);
        } else if (plan === 'restore') {
          await runRestore(null);
        } else {
          const snap = await pullAll(deps.server);
          setStep({ kind: 'conflict', snap, server: toCard(summarizeSnapshot(snap)), device: toCard(await summarizeDevice()), choice: 'server' });
        }
      } catch (e) {
        if (e === ABORTED) {
          // 취소가 이미 정리했다. 그 뒤에 생긴 세션과, 로그인 이벤트가 늦게 쓴 계정 기록을 되돌리고 잠금을 푼다.
          await signOutLocal(supabase, clearStoredSession);
          await setSetting('accountUserId', previous.current);
          resumeSync();
          return;
        }
        await cancel();
        if (e === CANCELED) return;
        // 사용자에게는 일반 안내만 보이니, 개발 중에는 실제 이유를 Metro 로그로 본다
        if (__DEV__) console.warn('[connect] failed', e);
        await ask(connectFailed);
      }
    } finally {
      setBusy(false);
    }
  };

  if (step.kind === 'conflict') {
    return (
      <RestoreConflictScreen
        value={step.choice}
        onChange={(choice) => setStep({ ...step, choice })}
        server={step.server}
        device={step.device}
        onConfirm={() => void (step.choice === 'server' ? runRestore(step.snap) : keepDevice())}
        onBack={() => void cancel()}
      />
    );
  }

  return (
    <>
      <ConsentScreen
        providers={LOGIN_PROVIDERS}
        ageChecked={age}
        termsChecked={terms}
        onToggleAge={() => setAge(!age)}
        onToggleTerms={() => setTerms(!terms)}
        onViewTerms={() => void openPolicy('terms', ask)}
        onViewPrivacy={() => void openPolicy('privacy', ask)}
        onUnder14={() => { if (!busy) { void setChildDirectedAds(true); void ask(accountDialogs.under14).then(goBackOrHome); } }}
        onBack={() => { if (!busy) goBackOrHome(); }}
        loginButtons={<>
          {/* 만든 수단만 동그라미로 보인다. 카카오와 Google은 만들면 여기에 더해진다 (로그인 계획 2026-10-15). */}
          {appleReady && <LoginCircles providers={['apple']} onPress={() => void connect('apple')} />}
          {__DEV__ && DEV_EMAIL && DEV_PASSWORD
            ? <PixelButton label="개발 계정으로 계속" loading={busy} onPress={() => void connect('dev')} />
            : null}
        </>}
      />
      <PixelBusyModal visible={step.kind === 'restoring' && !failed} {...accountDialogs.restoring} />
      <PixelDialogModal
        visible={failed !== null}
        onRequestClose={() => { setFailed(null); void cancel(); }}
        {...accountDialogs.restoreFailed}
        onPrimary={() => failed?.()}
        onSecondary={() => { setFailed(null); void cancel(); }}
      />
      {dialog}
    </>
  );
}
