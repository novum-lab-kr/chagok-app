import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ConsentScreen, PixelBusyModal, PixelButton, PixelDialogModal, RestoreConflictScreen, accountDialogs,
  type RecordSnapshot, type RestoreSide,
} from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { removeManagedRecordPhoto } from '../../src/app-data/recordPhotos';
import { useDialog } from '../../src/app-data/useDialog';
import { localDateKey } from '../../src/domain/dates';
import { currentVersions, fetchPolicyManifest } from '../../src/policy/manifest';
import { openPolicy } from '../../src/policy/openPolicy';
import { getSetting, setFlag, setSetting } from '../../src/repositories/appSettingsRepository';
import { recordConsent } from '../../src/sync/account';
import { providerFromAuth } from '../../src/sync/accountStatus';
import { syncDepsFor } from '../../src/sync/appSync';
import { decideConnection } from '../../src/sync/connectAccount';
import { enqueueAll } from '../../src/sync/outbox';
import type { PushDeps } from '../../src/sync/push';
import {
  applyRestore, downloadRestoredPhotos, hasLocalData, pullAll, replaceServerWithDevice, summarizeDevice, summarizeSnapshot,
  type RecordSummary, type ServerSnapshot,
} from '../../src/sync/restore';
import { getSupabase } from '../../src/sync/supabaseClient';
import { pauseSync, resumeSync } from '../../src/sync/syncGate';

const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_EMAIL;
const DEV_PASSWORD = process.env.EXPO_PUBLIC_DEV_PASSWORD;

type From = 'start' | 'settings' | 'relogin';
type Step =
  | { kind: 'consent' }
  | { kind: 'restoring' }
  | { kind: 'conflict'; snap: ServerSnapshot; server: RecordSnapshot; device: RecordSnapshot; choice: RestoreSide };

const connectFailed = { title: '연결하지 못했어요', description: '인터넷 연결을 확인하고 다시 시도해 주세요.', primaryLabel: '확인' };

function toCard(s: RecordSummary): RecordSnapshot {
  const d = s.updatedAt === null ? null : new Date(s.updatedAt);
  return { goals: s.goals, stickers: s.stickers, goalNames: s.goalNames, updatedAt: d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '없음' };
}

/**
 * 계정 연결 (계정·백업 설계 ①). 동의 → 로그인 → 분기(연결만·첫 백업·복원·충돌 선택).
 * 계정 준비 전에는 로그인 자리에 개발 계정 버튼만 둔다 (2026-10-01). 그 자리에 Apple·Google 버튼이 들어간다.
 * 연결이 끝날 때까지 자동 전송을 잠근다 — 복원 충돌을 고르기 전에 기기 기록이 올라가지 않게.
 */
export default function ConnectAccount() {
  const { from = 'settings' } = useLocalSearchParams<{ from?: From }>();
  const supabase = getSupabase();
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

  // 복원 중에는 Android 뒤로가기로 빠져나가지 않는다
  useEffect(() => {
    if (step.kind !== 'restoring') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [step.kind]);

  if (!supabase) return null;

  const finish = async (restored: boolean) => {
    resumeSync();
    if (from === 'start') {
      await setFlag('startDone', true);
      if (restored) await setFlag('tutorialDone', true);
      router.replace('/');
    } else {
      goBackOrHome();
    }
  };

  /** 반쯤 연결된 채로 남기지 않는다: 로그아웃하고 이전 계정 표시로 되돌린다. 체크 상태는 그대로. */
  const cancel = async () => {
    await supabase.auth.signOut();
    await setSetting('accountUserId', previous.current);
    session.current = null;
    resumeSync();
    setStep({ kind: 'consent' });
  };

  const link = async (userId: string) => { await setSetting('accountUserId', userId); };

  const runRestore = async (snap: ServerSnapshot | null) => {
    const s = session.current!;
    setStep({ kind: 'restoring' });
    try {
      const data = snap ?? await pullAll(s.deps.server);
      const { photos, oldPhotoUris } = await applyRestore(data);
      oldPhotoUris.forEach(removeManagedRecordPhoto);
      await downloadRestoredPhotos(s.deps.photos, photos);
      await link(s.userId);
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

  const connect = async () => {
    if (!DEV_EMAIL || !DEV_PASSWORD) return;
    setBusy(true);
    try {
      let versions: { terms: number; privacy: number };
      try {
        versions = currentVersions(await fetchPolicyManifest(), localDateKey(Date.now()));
      } catch {
        await ask(connectFailed);
        return;
      }
      pauseSync();
      const { data, error } = await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD });
      if (error || !data.user) {
        resumeSync();
        await ask(connectFailed);
        return;
      }
      const user = data.user;
      try {
        await recordConsent(supabase, versions.terms, versions.privacy);
        await setSetting('accountProvider', providerFromAuth(user.app_metadata.provider));
        await setSetting('sessionPrompted', null);
        const deps = await syncDepsFor(supabase, user.id);
        session.current = { userId: user.id, deps };
        const serverHasData = (await deps.server.state()).goals > 0;
        const plan = decideConnection({ previousUserId: previous.current, userId: user.id, deviceHasData: await hasLocalData(), serverHasData });
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
      } catch {
        await cancel();
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
        ageChecked={age}
        termsChecked={terms}
        onToggleAge={() => setAge(!age)}
        onToggleTerms={() => setTerms(!terms)}
        onViewTerms={() => void openPolicy('terms', ask)}
        onViewPrivacy={() => void openPolicy('privacy', ask)}
        onUnder14={() => void ask(accountDialogs.under14).then(goBackOrHome)}
        onBack={goBackOrHome}
        loginButtons={__DEV__ && DEV_EMAIL && DEV_PASSWORD
          ? <PixelButton label="개발 계정으로 계속" loading={busy} onPress={() => void connect()} />
          : null}
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
