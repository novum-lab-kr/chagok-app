import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { InviteJoinScreen, InviteProblemScreen, LoadingScreen, boardDialogs } from '../../src/design-system';
import type { StickerId } from '../../src/design-system';
import { ConnectAccount } from '../account/connect';
import { goBackOrHome } from '../../src/app-data/goBack';
import { useDialog } from '../../src/app-data/useDialog';
import { createSingleFlight } from '../../src/app-data/singleFlight';
import { takeOfferedSticker } from '../../src/app-data/stickerChoice';
import { actionDeps, fetchJoined, joinAndFetch, signedInUserId } from '../../src/app-data/sharedGoalActions';
import {
  SharedGoalError, errorMessage, inviteCodeFromPath, previewInvite, readMemberDefaults, type InvitePreview,
} from '../../src/sync/sharedGoals';
import { getSupabase } from '../../src/sync/supabaseClient';
import { isSyncPaused, subscribeResume } from '../../src/sync/syncGate';
import { MEMBER_NAME_MAX, SHARED_MAX_MEMBERS, shownMemberNameError } from '../../src/domain/board';
import { t } from '../../src/i18n';
import { DEFAULT_COLOR_STICKER, normalizeStickerId } from '../../src/stickers/stickerIds';

type Open = Extract<InvitePreview, { status: 'open' }>;
type Step =
  | { kind: 'loading' }
  /** 미리보기를 받지 못했다(연결, 서버 설정 없음, 잠시 막힘). [다시 시도]로 다시 받는다 */
  | { kind: 'failed' }
  | { kind: 'problem'; problem: 'closed' | 'full' }
  | { kind: 'login'; preview: Open }
  /** 이미 이 목표에 들었다: 함께하기 없이 그 판을 연다 */
  | { kind: 'member'; goalId: string }
  | { kind: 'join'; preview: Open };

/**
 * 초대 링크 받기 (PRD 4.15 「초대 받기」). https://chagok.novum-lab.com/invite/<코드>(유니버설 링크)와 chagok://invite/<코드>가 여기로 온다.
 * 미리보기 → 들어갈 수 없으면 문제 화면, 로그인 전이면 「초대 링크 로그인 전」(계정 연결을 그 모양으로 그린다), 로그인했으면 「함께하기」.
 * [함께하기] → join_goal → 그 목표를 받아 판 화면을 연다. 이미 멤버면(미리보기의 memberGoalId) 함께하기 없이 그 판을 연다.
 * 받은 초대로 들어간 목표는 무료 목표 수에 들지 않는다(PRD 4.12, 4.15).
 */
export default function InviteRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const code = inviteCodeFromPath(params.code);
  const [attempt, setAttempt] = useState(0);
  /** 받은 결과와 그 결과를 받은 코드, 시도 번호. 둘 중 하나라도 지금과 다르면 아직 받는 중이다(다른 초대 링크로 코드만 바뀐 경우) */
  const [result, setResult] = useState<{ code: string; attempt: number; step: Step } | null>(null);
  const [supabase] = useState(getSupabase);

  useEffect(() => {
    let alive = true;
    if (!code || !supabase) return;
    const done = (step: Step) => { if (alive) setResult({ code, attempt, step }); };
    // 다른 화면에서 계정을 연결하는 중이면(세션은 생겼지만 동의나 복원 선택 전) 끝날 때까지 기다렸다가 다시 본다
    if (isSyncPaused()) {
      const off = subscribeResume(() => { off(); if (alive) setAttempt((a) => a + 1); });
      return () => { alive = false; off(); };
    }
    void (async () => {
      // 미리보기는 로그인 없이 부른다(초대받은 사람은 대부분 로그인 전이다)
      const preview = await previewInvite(supabase, code);
      if (preview.status !== 'open') {
        done(preview.status === 'rate_limited' ? { kind: 'failed' } : { kind: 'problem', problem: preview.status });
        return;
      }
      const userId = await signedInUserId();
      done(!userId ? { kind: 'login', preview } : preview.memberGoalId ? { kind: 'member', goalId: preview.memberGoalId } : { kind: 'join', preview });
    })().catch(() => done({ kind: 'failed' }));
    return () => { alive = false; };
  }, [code, supabase, attempt]);

  // 모양이 맞지 않는 코드는 묻지 않고 들어갈 수 없는 초대로, 서버 설정이 없으면 받지 못한 것으로 본다
  const step: Step = !code ? { kind: 'problem', problem: 'closed' }
    : !supabase ? { kind: 'failed' }
    : result && result.code === code && result.attempt === attempt ? result.step : { kind: 'loading' };
  const setProblem = (problem: 'closed' | 'full') => { if (code) setResult({ code, attempt, step: { kind: 'problem', problem } }); };

  const home = () => router.dismissTo('/');

  if (step.kind === 'loading' || step.kind === 'failed') {
    return <LoadingScreen failed={step.kind === 'failed'} kind="invite" onRetry={() => setAttempt((a) => a + 1)} onHome={home} />;
  }
  if (step.kind === 'problem') {
    return <InviteProblemScreen problem={step.problem} max={SHARED_MAX_MEMBERS} onHome={home} onBack={goBackOrHome} />;
  }
  if (step.kind === 'member') return <OpenJoined goalId={step.goalId} />;
  if (step.kind === 'login') {
    return (
      <ConnectAccount
        from="invite"
        invite={{ ownerName: step.preview.ownerName ?? '', goalName: step.preview.goalName }}
        // 로그인과 복원이 끝나면 미리보기부터 다시 본다(그사이 자리가 찼을 수 있다)
        onDone={() => setAttempt((a) => a + 1)}
      />
    );
  }
  return <Join code={code!} preview={step.preview} onProblem={setProblem} />;
}

/** 이미 든 목표: 기기를 서버 것으로 맞춘 뒤 판을 연다. 받지 못했으면 목록으로(다음 동기화 회차가 받는다) */
function OpenJoined({ goalId }: { goalId: string }) {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    void (async () => {
      const d = await actionDeps();
      const onDevice = d ? await fetchJoined(d, goalId) : false;
      if (!alive) return;
      if (onDevice) router.replace({ pathname: '/goal/[id]', params: { id: goalId } });
      else router.dismissTo('/');
    })().catch(() => { if (alive) router.dismissTo('/'); });
    return () => { alive = false; };
  }, [goalId, router]);
  return <LoadingScreen failed={false} kind="invite" onRetry={() => {}} />;
}

/** 「함께하기」: 내 이름과 스티커를 고르고 들어간다. 이름과 스티커는 지난번 함께 목표 값(member_defaults)으로 채운다. */
function Join({ code, preview, onProblem }: { code: string; preview: Open; onProblem: (problem: 'closed' | 'full') => void }) {
  const router = useRouter();
  const [myName, setMyName] = useState('');
  const [myNameTouched, setMyNameTouched] = useState(false);
  const [sticker, setSticker] = useState<StickerId>(DEFAULT_COLOR_STICKER);
  /** 서버가 거절한 이름이나 스티커 문구. 고치면 지운다 */
  const [rejected, setRejected] = useState<{ name?: string; sticker?: string }>({});
  const [joining, setJoining] = useState(false);
  const [joinOnce] = useState(createSingleFlight);
  const { ask, dialog } = useDialog();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const d = await actionDeps();
      const saved = d ? await readMemberDefaults(d.client) : null;
      if (!alive || !saved) return;
      setMyName((current) => (current === '' ? saved.displayName.slice(0, MEMBER_NAME_MAX) : current));
      setSticker((current) => (current === DEFAULT_COLOR_STICKER ? normalizeStickerId(saved.stickerId) : current));
    })().catch(() => {});
    return () => { alive = false; };
  }, []);

  // 「기본 스티커」에서 고르고 돌아오면 받는다 (함께 만들기와 같음)
  useFocusEffect(useCallback(() => {
    const picked = takeOfferedSticker();
    if (picked) { setSticker(picked); setRejected((r) => ({ ...r, sticker: undefined })); }
  }, []));

  // 같은 목표에서 이미 쓰는 스티커는 누르기 전에 알린다. 그사이 누가 가져가면 서버가 sticker_taken으로 막는다
  const takenMessage = preview.takenStickers.includes(sticker) ? errorMessage('sticker_taken') : undefined;
  const stickerError = rejected.sticker ?? takenMessage;
  const valid = myName.trim().length > 0 && !stickerError;

  async function join() {
    setJoining(true);
    const d = await actionDeps().catch(() => null);
    if (!mounted.current) return;
    if (!d) {
      setJoining(false);
      await ask(boardDialogs.saveFailed(t('account.checkInternetRetry')));
      return;
    }
    try {
      const r = await joinAndFetch(d, code, myName.trim(), sticker);
      if (!mounted.current) return;
      // 기기에 아직 받지 못했으면 목록으로. 다음 동기화 회차가 받아 오면 목록에 생긴다
      if (r.onDevice) router.replace({ pathname: '/goal/[id]', params: { id: r.goalId } });
      else router.dismissTo('/');
    } catch (error) {
      if (!mounted.current) return;
      setJoining(false);
      const word = error instanceof SharedGoalError ? error.word : 'network';
      if (word === 'closed' || word === 'full') onProblem(word);
      else if (word === 'invalid_name' || word === 'name_not_allowed') setRejected({ name: errorMessage(word) });
      else if (word === 'sticker_taken' || word === 'invalid_sticker') setRejected({ sticker: errorMessage(word) });
      else await ask(boardDialogs.saveFailed(errorMessage(word)));
    }
  }

  return (
    <>
      <InviteJoinScreen
        goalName={preview.goalName}
        kind={preview.boardType}
        total={preview.totalSlots ?? undefined}
        ownerName={preview.ownerName ?? ''}
        members={[]}
        myName={myName}
        onChangeMyName={(next) => { setMyName(next); setRejected((r) => ({ ...r, name: undefined })); if (next !== '') setMyNameTouched(true); }}
        myNameMaxLength={MEMBER_NAME_MAX}
        myNameError={rejected.name ?? shownMemberNameError(myName, myNameTouched)}
        onMyNameBlur={() => setMyNameTouched(true)}
        sticker={sticker}
        onChooseSticker={() => router.push({ pathname: '/stickers/choose', params: { current: sticker } })}
        stickerError={stickerError}
        onJoin={() => { void joinOnce(join); }}
        joinDisabled={!valid || joining}
        joining={joining}
        onBack={goBackOrHome}
      />
      {dialog}
    </>
  );
}
