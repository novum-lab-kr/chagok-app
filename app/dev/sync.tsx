import { useCallback, useEffect, useState } from 'react';
import { PixelButton, PixelPanel, PixelText, RetroScreen, ScreenHeader } from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { createSingleFlight } from '../../src/app-data/singleFlight';
import { useDialog } from '../../src/app-data/useDialog';
import { getSetting, setSetting } from '../../src/repositories/appSettingsRepository';
import { syncDepsFor } from '../../src/sync/appSync';
import { enqueueAll, pendingCount } from '../../src/sync/outbox';
import { pushOnce } from '../../src/sync/push';
import { downloadRestoredPhotos, restoreAll } from '../../src/sync/restore';
import { getSupabase } from '../../src/sync/supabaseClient';

type Status = { email: string | null; userId: string | null; pending: number; held: number; lastSynced: string; server: string };

const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_EMAIL;
const DEV_PASSWORD = process.env.EXPO_PUBLIC_DEV_PASSWORD;

/**
 * 개발용 동기화 화면 (__DEV__ 전용). 실제 로그인·복원 충돌·로그아웃 화면이 붙기 전에
 * 개발 서버로 백업·복원을 확인한다. 로그아웃해도 기기 기록은 지우지 않는다.
 */
export default function DevSync() {
  const supabase = getSupabase();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [once] = useState(createSingleFlight);
  const { ask, confirm, dialog } = useDialog();

  const load = useCallback(async (): Promise<Status | null> => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    const counts = await pendingCount();
    const last = await getSetting('lastSyncedAt');
    let server = '로그인하면 보여요';
    if (user) {
      try {
        const state = await (await syncDepsFor(supabase, user.id)).server.state();
        server = `목표 ${state.goals}개`;
      } catch (error) {
        server = `확인 실패: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    return {
      email: user?.email ?? null, userId: user?.id ?? null, pending: counts.pending, held: counts.held,
      lastSynced: last ? new Date(Number(last)).toLocaleString('ko-KR') : '없음', server,
    };
  }, [supabase]);

  useEffect(() => {
    if (!__DEV__ || !supabase) { goBackOrHome(); return; }
    let alive = true;
    void (async () => {
      const next = await load();
      if (alive) setStatus(next);
    })();
    return () => { alive = false; };
  }, [supabase, load]);

  if (!__DEV__ || !supabase) return null;

  /** 한 번에 하나만 실행하고, 실패하면 오류 내용을 그대로 보여준다(개발용). */
  const run = (title: string, task: () => Promise<void>) => {
    void once(async () => {
      setBusy(true);
      try {
        await task();
      } catch (error) {
        await ask({ title, description: error instanceof Error ? error.message : String(error), primaryLabel: '확인' });
      } finally {
        setBusy(false);
        setStatus(await load());
      }
    });
  };

  const deps = async () => {
    if (!status?.userId) throw new Error('먼저 로그인해 주세요.');
    return syncDepsFor(supabase, status.userId);
  };
  const push = async () => {
    await pushOnce(await deps());
    await setSetting('lastSyncedAt', String(Date.now()));
  };

  const signIn = () => run('로그인하지 못했어요', async () => {
    if (!DEV_EMAIL || !DEV_PASSWORD) throw new Error('.env.local에 EXPO_PUBLIC_DEV_EMAIL과 EXPO_PUBLIC_DEV_PASSWORD를 넣어 주세요.');
    const { error } = await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD });
    if (error) throw new Error(error.message);
  });

  const restore = () => run('복원하지 못했어요', async () => {
    if (!(await confirm({
      title: '서버 백업으로 바꿀까요?',
      description: '이 기기의 기록이 서버 백업으로 바뀌어요.',
      secondaryLabel: '취소',
      primaryLabel: '복원',
    }))) return;
    const d = await deps();
    const result = await restoreAll(d.server);
    await downloadRestoredPhotos(d.photos, result.photos);
  });

  const signedIn = Boolean(status?.userId);
  return (
    <>
      <RetroScreen style={{ gap: 16 }} header={<ScreenHeader title="서버 동기화 (개발)" onBack={goBackOrHome} />}>
        <PixelPanel title="상태">
          <PixelText>계정: {status?.email ?? '로그인 안 함'}</PixelText>
          <PixelText>올릴 것 {status?.pending ?? 0}개 · 보류 {status?.held ?? 0}개</PixelText>
          <PixelText>마지막 백업: {status?.lastSynced ?? '없음'}</PixelText>
          <PixelText>서버: {status?.server ?? '확인 중'}</PixelText>
        </PixelPanel>
        {signedIn ? (
          <>
            <PixelButton label="지금 올리기" loading={busy} onPress={() => run('올리지 못했어요', push)} />
            <PixelButton label="전부 올리기 (첫 연결)" variant="secondary" disabled={busy}
              onPress={() => run('올리지 못했어요', async () => { await enqueueAll(); await push(); })} />
            <PixelButton label="서버에서 복원" variant="secondary" disabled={busy} onPress={restore} />
            <PixelButton label="로그아웃 (개발)" variant="secondary" disabled={busy}
              onPress={() => run('로그아웃하지 못했어요', async () => { await supabase.auth.signOut(); })} />
          </>
        ) : (
          <PixelButton label="개발 계정으로 로그인" loading={busy} onPress={signIn} />
        )}
      </RetroScreen>
      {dialog}
    </>
  );
}
