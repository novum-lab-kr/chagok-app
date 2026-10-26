import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
  AccountLoginScreen, AppleLoginButton, ConsentSheet, GoogleLoginButton, KakaoLoginButton, LOGIN_BUTTON_HEIGHT, hasCustomAppleButton, PixelBusyModal, PixelButton, PixelDialogModal, RestoreConflictScreen, accountDialogs,
  type RecordSnapshot, type RestoreSide,
} from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { removeManagedRecordPhoto } from '../../src/app-data/recordPhotos';
import { useDialog } from '../../src/app-data/useDialog';
import { localDateKey } from '../../src/domain/dates';
import { currentVersions, fetchPolicyManifest } from '../../src/policy/manifest';
import { openPolicy } from '../../src/policy/openPolicy';
import { getSetting, setFlag, setSetting } from '../../src/repositories/appSettingsRepository';
import { deleteAccountOnServer, hasConsented, recordConsent, signOutLocal } from '../../src/sync/account';
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
import { expoGoogleDeps, signOutGoogle } from '../../src/sync/signIn/expoGoogle';
import { completeKakaoSignUp, expoKakaoDeps, signOutKakao } from '../../src/sync/signIn/expoKakao';
import { signInWithGoogle } from '../../src/sync/signIn/google';
import { signInWithKakao } from '../../src/sync/signIn/kakao';
import { clearStoredSession, getSupabase } from '../../src/sync/supabaseClient';
import { beginConnect, endConnect, markRestored } from '../../src/sync/connectMarker';
import { pauseSync, resumeSync } from '../../src/sync/syncGate';

const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_EMAIL;
const DEV_PASSWORD = process.env.EXPO_PUBLIC_DEV_PASSWORD;

type From = 'start' | 'settings' | 'relogin';
type Step =
  | { kind: 'login' }
  | { kind: 'restoring' }
  | { kind: 'conflict'; snap: ServerSnapshot; server: RecordSnapshot; device: RecordSnapshot; choice: RestoreSide };

/** 화면을 떠나 취소된 로그인 시도 */
const ABORTED = new Error('aborted');

/** 사용자가 로그인 창을 닫았거나 가입을 그만했다. 알림 없이 로그인 화면으로 돌아간다. */
const CANCELED = new Error('canceled');

/** 새 계정 동의 시트의 답. abort는 화면을 떠나 시도가 취소됐다. */
type ConsentAnswer = 'agree' | 'quit' | 'abort';

type Method = 'apple' | 'kakao' | 'google' | 'dev';

const connectFailed = { title: '연결하지 못했어요', description: '인터넷 연결을 확인하고 다시 시도해 주세요.', primaryLabel: '확인' };
/** Apple이 이유를 알려 주지 않은 실패(예: 기기에 Apple 계정이 없어 안내를 닫음). 원인을 짐작하지 않는다 (2026-10-22 사용자 결정). */
const connectFailedUnknown = { title: '연결하지 못했어요', description: '다시 시도해 주세요.', primaryLabel: '확인' };

function toCard(s: RecordSummary): RecordSnapshot {
  const d = s.updatedAt === null ? null : new Date(s.updatedAt);
  return { goals: s.goals, stickers: s.stickers, goalNames: s.goalNames, updatedAt: d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '없음' };
}

/**
 * 계정 연결 (계정·백업 설계 ①). 로그인 → 처음 만든 계정이면 동의 시트 → 분기(연결만·첫 백업·복원·충돌 선택) (2026-10-21, 이전: 동의 → 로그인).
 * 로그인 자리에는 카카오 버튼, Google 버튼, iOS면 Apple 기본 버튼, 개발 빌드면 개발 계정 버튼을 차례로 둔다.
 * 연결이 끝날 때까지 자동 전송을 잠근다 — 복원 충돌을 고르기 전에 기기 기록이 올라가지 않게.
 */
export default function ConnectAccountRoute() {
  const { from = 'settings' } = useLocalSearchParams<{ from?: From }>();
  return <ConnectAccount from={from} />;
}

/** 첫 실행 시작 화면(홈)은 이 화면을 그대로 띄운다 — from 'start'면 끝날 때 onDone, [로그인 없이 시작하기]는 onLocal. */
export function ConnectAccount(props: { from: From; onDone?: (restored: boolean) => void; onLocal?: () => void }) {
  const supabase = getSupabase();
  return supabase ? <Connect supabase={supabase} {...props} /> : null;
}

function Connect({ supabase, from, onDone, onLocal }: { supabase: SupabaseClient; from: From; onDone?: (restored: boolean) => void; onLocal?: () => void }) {
  const navigation = useNavigation();
  const { ask, dialog } = useDialog();
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'login' });
  /** 새 계정 동의 시트. agreeing은 동의를 기록하는 중 */
  const [consent, setConsent] = useState<null | { agreeing: boolean }>(null);
  const consentAnswer = useRef<((answer: ConsentAnswer) => void) | null>(null);
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

  useEffect(() => {
    let alive = true;
    void (async () => {
      const id = await getSetting('accountUserId');
      if (alive) previous.current = id;
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
    if (step.kind === 'login') return;
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
    if (from === 'start') onDone?.(restored);
    else goBackOrHome();
  };

  /** 처음 만든 계정에 동의를 묻는다. 체크는 비운 채로 연다. */
  const askConsent = () => new Promise<ConsentAnswer>((resolve) => {
    consentAnswer.current = resolve;
    setAge(false);
    setTerms(false);
    setConsent({ agreeing: false });
  });
  const answerConsent = (answer: ConsentAnswer) => {
    const resolve = consentAnswer.current;
    consentAnswer.current = null;
    if (answer === 'agree') setConsent({ agreeing: true });
    else setConsent(null);
    resolve?.(answer);
  };
  /** 시트를 동의 없이 닫으려 하면 가입을 그만할지 묻는다 */
  const closeConsent = async () => {
    if (!consentAnswer.current) return;
    if ((await ask(accountDialogs.quitSignup)) === 'primary') answerConsent('quit');
  };

  /** 반쯤 연결된 채로 남기지 않는다: 로그아웃하고 이전 계정 표시로 되돌린다. 체크 상태는 그대로. */
  const cancel = async () => {
    settled.current = true;
    session.current = null;
    attempt.current += 1;
    // 동의 시트를 기다리던 시도는 멈춘다 (check()가 ABORTED로 끝낸다)
    if (consentAnswer.current) answerConsent('abort');
    setConsent(null);
    try {
      await signOutLocal(supabase, clearStoredSession);
      // 카카오 SDK 토큰도 지운다 — 다음 시도에서 다른 카카오 계정을 고를 수 있게(카카오로 들어온 적이 없으면 아무 일도 없다)
      await signOutKakao();
      await signOutGoogle();
      await setSetting('accountUserId', previous.current);
      await endConnect();
    } finally {
      // 로그인 요청이 진행 중이면 그 시도가 돌아와 세션을 지운 뒤 잠금을 푼다 (connect의 중단 처리)
      if (!signingIn.current) resumeSync();
      setStep({ kind: 'login' });
    }
  };
  useEffect(() => { cancelRef.current = cancel; });

  const link = async (userId: string) => { await setSetting('accountUserId', userId); };

  /** 고른 방법으로 로그인한다. 사용자가 로그인 창을 닫으면 'canceled'. */
  const signInWith = async (method: Method): Promise<{ user: User } | 'canceled'> => {
    if (method === 'apple') return signInWithApple(expoAppleDeps(supabase));
    if (method === 'kakao') return signInWithKakao(expoKakaoDeps(supabase));
    if (method === 'google') return signInWithGoogle(expoGoogleDeps(supabase));
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
        // 카카오에 가입 완료를 알린다. 로그인할 때마다 불러 한 번 실패해도 다음 로그인에서 메운다. 기다리지 않는다
        if (method === 'kakao') void completeKakaoSignUp();
        // 처음 만든 계정만 동의를 받는다. 이미 동의한 계정은 다시 묻지 않는다 (2026-10-21 시안 a).
        if (!(await hasConsented(supabase.from('accounts').select('agreed_at').eq('user_id', user.id).maybeSingle()))) {
          check();
          const answer = await askConsent();
          check();
          if (answer !== 'agree') {
            // 그만하면 방금 만든 계정을 지운다. 지우지 못해도 동의 기록이 없으니 다음 로그인에서 다시 묻는다.
            try {
              await deleteAccountOnServer(supabase);
            } catch (e) {
              if (__DEV__) console.warn('[connect] quit delete failed', e);
              await cancel();
              await ask(accountDialogs.quitFailed);
              return;
            }
            throw CANCELED;
          }
          await recordConsent(supabase, versions.terms, versions.privacy);
          check();
          setConsent(null);
        }
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
          await signOutKakao();
          await signOutGoogle();
          await setSetting('accountUserId', previous.current);
          resumeSync();
          return;
        }
        await cancel();
        if (e === CANCELED) return;
        // 사용자에게는 일반 안내만 보이니, 개발 중에는 실제 이유를 Metro 로그로 본다
        if (__DEV__) console.warn('[connect] failed', e);
        await ask((e as { code?: unknown } | null)?.code === 'ERR_REQUEST_UNKNOWN' ? connectFailedUnknown : connectFailed);
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
      <AccountLoginScreen
        onBack={from === 'start' ? undefined : () => { if (!busy) goBackOrHome(); }}
        onLocal={from === 'start' ? onLocal : undefined}
        busy={busy}
        loginButtons={<>
          {/* 순서 카카오 → Google → Apple(Apple은 덜 쓰여 맨 아래), 글자는 셋 다 「계속하기」 (2026-10-22 사용자 결정) */}
          <KakaoLoginButton onPress={() => void connect('kakao')} />
          <GoogleLoginButton onPress={() => void connect('google')} />
          {/* Apple: 로고 파일이 있으면 HIG대로 직접 만든 버튼(로고를 다른 버튼과 맞춤), 없으면 기본 버튼. 기본 버튼은 밝은 바탕이라 흰 바탕 테두리, 모서리 12 (HIG, 2026-10-21 시안 2안). */}
          {appleReady && hasCustomAppleButton && <AppleLoginButton onPress={() => void connect('apple')} />}
          {appleReady && !hasCustomAppleButton && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
              cornerRadius={12}
              style={{ width: '100%', height: LOGIN_BUTTON_HEIGHT }}
              onPress={() => void connect('apple')}
            />
          )}
          {__DEV__ && DEV_EMAIL && DEV_PASSWORD
            ? <PixelButton label="개발 계정으로 계속" loading={busy && !consent} onPress={() => void connect('dev')} />
            : null}
        </>}
      />
      <ConsentSheet
        visible={consent !== null}
        ageChecked={age}
        termsChecked={terms}
        onToggleAge={() => setAge(!age)}
        onToggleTerms={() => setTerms(!terms)}
        onViewTerms={() => void openPolicy('terms', ask)}
        onViewPrivacy={() => void openPolicy('privacy', ask)}
        onAgree={() => answerConsent('agree')}
        onRequestClose={() => { if (!consent?.agreeing) void closeConsent(); }}
        loading={consent?.agreeing ?? false}
        overlay={consent ? dialog : null}
      />
      <PixelBusyModal visible={step.kind === 'restoring' && !failed} {...accountDialogs.restoring} />
      <PixelDialogModal
        visible={failed !== null}
        onRequestClose={() => { setFailed(null); void cancel(); }}
        {...accountDialogs.restoreFailed}
        onPrimary={() => failed?.()}
        onSecondary={() => { setFailed(null); void cancel(); }}
      />
      {/* 동의 시트가 떠 있으면 다이얼로그는 시트 안에 그린다 (iOS는 Modal 옆에 Modal을 띄우지 못한다) */}
      {consent ? null : dialog}
    </>
  );
}
