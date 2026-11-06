import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { track } from '../../../src/analytics';
import {
  BlockPickSheet, CompletedGoalSettingsScreen, GoalSettingsScreen, LoadingScreen, MemberList, TogetherSettingsScreen, boardDialogs, deleteOwnerDescription,
  togetherDialogs, useLoadRetry,
} from '../../../src/design-system';
import type { StickerId } from '../../../src/design-system';
import {
  completeGoal, countGoalContents, deleteGoal, getGoal, settleExpiredPeriods, updateGoal,
} from '../../../src/repositories/goalRepository';
import { boardLabel, deleteDescription, longDate, periodLabel } from '../../../src/app-data/pocketAdapter';
import { DEFAULT_COLOR_STICKER, normalizeStickerId } from '../../../src/stickers/stickerIds';
import { removeManagedRecordPhoto } from '../../../src/app-data/recordPhotos';
import { saveOrNotify, useDialog } from '../../../src/app-data/useDialog';
import { askToSignIn } from '../../../src/app-data/askToSignIn';
import { useUnsavedBack } from '../../../src/app-data/useUnsavedBack';
import { createSingleFlight } from '../../../src/app-data/singleFlight';
import { goBackOrHome, goHome } from '../../../src/app-data/goBack';
import { takeOfferedSticker } from '../../../src/app-data/stickerChoice';
import {
  GOAL_NAME_MAX, MEMBER_NAME_MAX, SHARED_MAX_MEMBERS, SHARED_SLOTS_MAX, goalNameError, isCompleted, memberNameError, parseSlotCount, startDate,
} from '../../../src/domain/board';
import { localDateKey } from '../../../src/domain/dates';
import type { Goal, GoalMember } from '../../../src/domain/types';
import { listMembers } from '../../../src/repositories/memberRepository';
import { hasHiddenStickers } from '../../../src/repositories/stickerRepository';
import {
  actionDeps, block, kick, leave, removeAsOwner, reportName, rotateAndShare, saveGoal, saveMine, shareInvite,
} from '../../../src/app-data/sharedGoalActions';
import { memberRowsOf } from '../../../src/app-data/sharedBoardView';
import { SharedGoalError, errorMessage } from '../../../src/sync/sharedGoals';
import { AccountChanged } from '../../../src/sync/pull';
import { requestSync } from '../../../src/sync/syncGate';
import { t } from '../../../src/i18n';

/**
 * 목표 설정 (PRD 4.4). 진행 중: 이름 → 기본 스티커 → 기간(달력판) 또는 칸 수(적립판, 늘리기만) → [이 판 완성하기] → 저장 → [삭제하기].
 * 완성한 판: 읽기 전용 + 삭제만 (4.7).
 */
export default function GoalSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [name, setName] = useState('');
  const [sticker, setSticker] = useState<StickerId>(DEFAULT_COLOR_STICKER);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  /** 적립판 칸 수 입력. 문자열로 들고 저장할 때 parseSlotCount로 검사한다 (2026-09-30). */
  const [slotsText, setSlotsText] = useState('');
  const [picking, setPicking] = useState(false);
  const [actOnce] = useState(createSingleFlight);
  const { ask, confirm, dialog: confirmDialog } = useDialog();
  const { failed, attempt, fail, retry } = useLoadRetry();

  useEffect(() => {
    let alive = true;
    void (async () => {
      await settleExpiredPeriods(new Date());
      const g = await getGoal(id);
      if (!alive) return;
      if (!g) { goBackOrHome(); return; }
      setGoal(g);
      setName(g.name);
      setSticker(normalizeStickerId(g.defaultStickerId));
      setEndDate(g.endDate ?? undefined);
      setSlotsText(String(g.totalSlots ?? ''));
    })().catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  }, [id, attempt, fail]);

  const slots = goal?.boardType === 'tally' ? parseSlotCount(slotsText, goal.totalSlots ?? 0) : null;
  // 칸 수는 숫자로 비교한다("030"과 30은 같다). 잘못된 입력도 저장하지 않은 입력으로 친다.
  const slotsChanged = slots !== null && (!slots.ok || slots.value !== goal?.totalSlots);
  const dirty = goal !== null && !isCompleted(goal)
    && (name !== goal.name || sticker !== normalizeStickerId(goal.defaultStickerId) || (endDate ?? null) !== goal.endDate || slotsChanged);
  const { goBack, dialog } = useUnsavedBack(dirty);
  const shared = goal?.mode === 'each' || goal?.mode === 'one';
  // 「기본 스티커」에서 고르고 돌아오면 받는다 (PRD 4.12). 함께 목표는 TogetherSettings가 받는다(내 스티커).
  useFocusEffect(useCallback(() => {
    if (shared) return;
    const picked = takeOfferedSticker();
    if (picked) setSticker(picked);
  }, [shared]));

  if (!goal) {
    return <LoadingScreen failed={failed} kind="records" onRetry={retry} onHome={goHome} />;
  }
  const current = goal;
  // 함께 목표(각자 판, 한 판)는 완성한 판도 같은 화면이다 — 나가기와 신고가 있어야 한다 (PRD 4.15)
  if (shared) return <TogetherSettings goal={current} />;

  /** 저장 안 한 입력(이름·스티커·종료일·칸 수)도 함께 저장한다. 칸 수는 늘었을 때만 보낸다. */
  const saveEdits = () => updateGoal(current.id, {
    name: name.trim(),
    defaultStickerId: sticker,
    ...(current.boardType === 'calendar' ? { endDate: endDate ?? null } : {}),
    ...(slots?.ok && slots.value !== current.totalSlots ? { totalSlots: slots.value } : {}),
  });

  async function save() {
    if (await saveOrNotify(ask, t('failed.save'), saveEdits)) goBackOrHome();
  }

  /** 기간 없는 달력판의 수동 완성 (PRD 4.3). 판 상세로 돌아가면 완성 흐름이 뜬다. */
  async function complete() {
    if (!(await confirm(boardDialogs.confirmManual))) return;
    const ok = await saveOrNotify(ask, t('failed.complete'), async () => {
      await saveEdits();
      await completeGoal(current.id, Date.now());
    });
    if (!ok) return;
    track('goal_complete', { source: 'app' });
    goBackOrHome();
  }

  /** 삭제 (PRD 4.4). 함께 지워질 수를 보여주고, DB 삭제가 끝난 뒤에 사진 파일을 지운다. */
  async function remove() {
    const counts = await countGoalContents(current.id);
    if (!(await confirm(boardDialogs.deleteGoal(deleteDescription(counts))))) return;
    let photos: string[] = [];
    const ok = await saveOrNotify(ask, t('failed.deleteGoal'), async () => { photos = await deleteGoal(current.id); });
    if (!ok) return;
    track('goal_delete');
    for (const uri of photos) {
      try { removeManagedRecordPhoto(uri); } catch { /* 고아 파일로 남는다. 목표는 이미 지워졌다 */ }
    }
    router.dismissTo('/');
  }

  if (isCompleted(current)) {
    return (
      <>
        <CompletedGoalSettingsScreen
          name={current.name}
          sticker={normalizeStickerId(current.defaultStickerId)}
          boardLabel={boardLabel(current)}
          periodLabel={current.boardType === 'calendar' ? periodLabel(current) : undefined}
          completedLabel={longDate(localDateKey(current.completedAt!))}
          onDelete={() => { void actOnce(remove); }}
          onBack={goBackOrHome}
        />
        {confirmDialog}
      </>
    );
  }

  const calendar = current.boardType === 'calendar';
  return (
    <>
      <GoalSettingsScreen
        name={name}
        onChangeName={setName}
        nameMaxLength={GOAL_NAME_MAX}
        nameError={goalNameError(name)}
        sticker={sticker}
        onChooseSticker={() => router.push({ pathname: '/stickers/choose', params: { current: sticker } })}
        period={calendar ? {
          startDate: startDate(current),
          endDate,
          lastPlacedDate: current.lastPlacedAt !== null ? localDateKey(current.lastPlacedAt) : undefined,
          picking,
          onPick: () => setPicking((open) => !open),
          onChange: (date) => { setEndDate(date); setPicking(false); },
          onClear: () => { setEndDate(undefined); setPicking(false); },
        } : undefined}
        slots={slots ? {
          current: current.totalSlots ?? 0,
          value: slotsText,
          onChange: setSlotsText,
          error: slots.ok ? undefined : slots.reason,
        } : undefined}
        onComplete={calendar && !endDate ? () => { void actOnce(complete); } : undefined}
        saveDisabled={name.trim().length === 0 || (slots !== null && !slots.ok)}
        onSave={() => { void actOnce(save); }}
        onDelete={() => { void actOnce(remove); }}
        onBack={goBack}
      />
      {dialog}
      {confirmDialog}
    </>
  );
}

/** 고르기 시트: 신고(목표 이름과 사람) 또는 차단(사람) */
type Pick = 'report' | 'block';

/** 함께 목표와 멤버(보기만 하는 사람 빼고, 들어온 순서). 목표가 기기에 없으면 null. */
async function loadTogether(goalId: string): Promise<{ goal: Goal; members: GoalMember[]; hidden: boolean } | null> {
  const [goal, all, hidden] = await Promise.all([getGoal(goalId), listMembers(goalId), hasHiddenStickers(goalId)]);
  return goal ? { goal, members: all.filter((m) => m.role !== 'viewer'), hidden } : null;
}
/** 서버가 그 칸의 값을 받지 않은 문구. 그 칸 아래에 보이고 칸을 고치면 지운다 */
type Rejected = { goal?: string; slots?: string; mine?: string; sticker?: string };

/**
 * 함께 목표의 목표 설정 (PRD 4.15). 만든 사람: 목표 이름과 칸 수(늘리기만), 내보내기, 친구 초대하기, 초대 링크 새로 만들기, 삭제하기.
 * 모두: 내 이름과 스티커, 함께하는 사람, 문제가 있을 때(신고, 차단, 나가기). 서버 호출 순서는 app-data/sharedGoalActions.ts가 정하고
 * 이 화면은 기기 DB를 다시 읽는다. 지우거나 내보내는 일은 모두 확인 창을 먼저 띄운다.
 */
function TogetherSettings({ goal: initial }: { goal: Goal }) {
  const router = useRouter();
  const goalId = initial.id;
  const [goal, setGoal] = useState(initial);
  const [members, setMembers] = useState<GoalMember[] | null>(null);
  /** 차단으로 가려진 칸이 있다: 기기에 없는 멤버가 서버에 남아 있다 */
  const [hidden, setHidden] = useState(false);
  const [name, setName] = useState(initial.name);
  const [slotsText, setSlotsText] = useState(String(initial.totalSlots ?? ''));
  const [myName, setMyName] = useState('');
  const [sticker, setSticker] = useState<StickerId>(DEFAULT_COLOR_STICKER);
  const [rejected, setRejected] = useState<Rejected>({});
  // 닫히는 동안 제목이 바뀌지 않게 종류는 열 때만 정한다
  const [pick, setPick] = useState<Pick>('block');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actOnce] = useState(createSingleFlight);
  const { ask, confirm, dialog: confirmDialog } = useDialog();
  const { failed, attempt, fail, retry } = useLoadRetry();

  /** 기기 DB를 다시 읽는다(동작 뒤). 목표가 기기에 없으면(나왔거나 지워짐) 목표 탭으로. withEdits면 목표 이름과 칸 수 입력도 다시 채운다. */
  async function read(withEdits: boolean) {
    const r = await loadTogether(goalId);
    if (!r) { router.dismissTo('/'); return; }
    setGoal(r.goal);
    setMembers(r.members);
    setHidden(r.hidden);
    if (withEdits) { setName(r.goal.name); setSlotsText(String(r.goal.totalSlots ?? '')); }
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await loadTogether(goalId);
      if (!alive) return;
      if (!r) { router.dismissTo('/'); return; }
      const me = r.members.find((m) => m.isMe);
      setGoal(r.goal);
      setMembers(r.members);
      setHidden(r.hidden);
      setName(r.goal.name);
      setSlotsText(String(r.goal.totalSlots ?? ''));
      setMyName(me?.displayName ?? '');
      setSticker(normalizeStickerId(me?.stickerId ?? r.goal.defaultStickerId));
    })().catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  }, [goalId, router, attempt, fail]);

  const owner = goal.role === 'owner';
  const editsGoal = owner && !isCompleted(goal);
  const me = members?.find((m) => m.isMe);
  const savedName = me?.displayName ?? '';
  const savedSticker = normalizeStickerId(me?.stickerId ?? goal.defaultStickerId);
  const slots = editsGoal && goal.boardType === 'tally' ? parseSlotCount(slotsText, goal.totalSlots ?? 0, SHARED_SLOTS_MAX) : null;
  const goalChanged = editsGoal && (name !== goal.name || (slots !== null && (!slots.ok || slots.value !== goal.totalSlots)));
  const mineChanged = members !== null && (myName !== savedName || sticker !== savedSticker);
  const { goBack, dialog } = useUnsavedBack(goalChanged || mineChanged, busy);
  useFocusEffect(useCallback(() => {
    const picked = takeOfferedSticker();
    if (picked) { setSticker(picked); setRejected((r) => ({ ...r, sticker: undefined })); }
  }, []));

  if (!members) return <LoadingScreen failed={failed} kind="records" onRetry={retry} onHome={goHome} />;

  const mode = goal.mode === 'each' ? 'each' : 'one';
  const rows = memberRowsOf(goal, members);
  const others = rows.filter((r) => !r.me);
  /** 기기에 나 말고 아무도 없다. 신고와 차단 줄을 숨긴다 */
  const noOthers = others.length === 0;
  /** 서버에도 아무도 없다(차단한 사람도 멤버로 센다). [삭제하기]가 혼자 목표 안내를 쓴다 */
  const alone = noOthers && !hidden;
  const ownerName = rows.find((r) => r.owner)?.name ?? '';

  /** 세션이 없으면 로그인을 권하고 null. [로그인]은 다시 로그인으로 열어 돌아오면 입력이 그대로다. */
  async function signedIn() {
    const d = await actionDeps().catch(() => null);
    if (!d) await askToSignIn(ask, router);
    return d;
  }

  /**
   * 동작이 실패했을 때. 볼 수 없는 목표면 창 뒤 목표 탭으로, 만든 사람이 바뀌었으면 창 뒤 다시 읽는다(동작이 이미 다시 받았다).
   * 계정이 바뀌었으면 이 화면은 다른 계정 것이라 문구 없이 닫는다. 그 밖은 title과 낱말 문구.
   * 사람 대상(about='person')의 not_member는 목표가 남아 있으면 「그 사람이 이 목표에 없다」로 알린다.
   */
  async function notify(error: unknown, title: string, about: 'goal' | 'person' = 'goal') {
    if (error instanceof AccountChanged) { router.dismissTo('/'); return; }
    const word = error instanceof SharedGoalError ? error.word : 'network';
    // 차단과 신고의 not_member는 「그 사람이 멤버가 아님」일 수 있다. 목표가 남아 있으면 일반 실패로 보인다
    const gone = word === 'not_shared' || (word === 'not_member' && (about === 'goal' || !(await loadTogether(goalId).catch(() => null))));
    if (gone) { await ask(togetherDialogs.gone); router.dismissTo('/'); return; }
    if (word === 'not_owner') { await ask(togetherDialogs.ownerOnly); await read(true).catch(() => {}); return; }
    if (word === 'needs_login') { await askToSignIn(ask, router); return; }
    await ask(togetherDialogs.failed(title, word === 'not_member' ? t('together.personGone') : errorMessage(word)));
  }

  /** 저장 실패 낱말이 칸 하나의 문제면 그 칸 아래에 보이고 true. */
  function rejectField(error: unknown, part: 'goal' | 'mine'): boolean {
    const word = error instanceof SharedGoalError ? error.word : null;
    if (part === 'mine' && (word === 'name_not_allowed' || word === 'invalid_name')) setRejected({ mine: errorMessage(word) });
    else if (part === 'mine' && word === 'sticker_taken') setRejected({ sticker: errorMessage(word) });
    else if (part === 'goal' && word === 'name_not_allowed') setRejected({ goal: errorMessage(word) });
    else if (part === 'goal' && word === 'invalid_name') setRejected({ goal: t('validation.goalNameEmpty') });
    else if (part === 'goal' && word === 'invalid_input' && goal.boardType === 'tally') setRejected({ slots: t('validation.slotCountMax', SHARED_SLOTS_MAX) });
    else return false;
    return true;
  }

  /** [저장]: 내 값이 바뀌었으면 내 이름과 스티커, 만든 사람이고 목표 값이 바뀌었으면 목표. 둘 다 되면 뒤로. 종료일은 지금 값 그대로. */
  async function save() {
    if (!goalChanged && !mineChanged) { goBackOrHome(); return; }
    const d = await signedIn();
    if (!d) return;
    setBusy(true);
    try {
      if (mineChanged) {
        try { await saveMine(d, goalId, myName.trim(), sticker); } catch (error) {
          if (!rejectField(error, 'mine')) await notify(error, t('failed.save'));
          return;
        }
      }
      if (goalChanged) {
        const totalSlots = goal.boardType === 'tally' && slots?.ok ? slots.value : goal.totalSlots;
        try { await saveGoal(d, goalId, { name: name.trim(), totalSlots, endDate: goal.endDate }); } catch (error) {
          // 내 값은 이미 저장됐을 수 있다. 다시 읽어 다음 [저장]이 같은 값을 또 보내지 않게 한다
          if (mineChanged) await read(false).catch(() => {});
          if (!rejectField(error, 'goal')) await notify(error, t('failed.save'));
          return;
        }
      }
    } finally {
      setBusy(false);
    }
    goBackOrHome();
  }

  /** 확인을 받은 뒤 서버 동작을 하고 다시 읽는다. 실패하면 title로 알린다. */
  async function act(title: string, run: (d: NonNullable<Awaited<ReturnType<typeof actionDeps>>>) => Promise<void>, about: 'goal' | 'person' = 'goal'): Promise<boolean> {
    const d = await signedIn();
    if (!d) return false;
    setBusy(true);
    try {
      await run(d);
      return true;
    } catch (error) {
      await notify(error, title, about);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function kickOut(userId: string) {
    const person = others.find((r) => r.id === userId);
    if (!person || !(await confirm(togetherDialogs.kick(person.name)))) return;
    // 그 사람이 이미 나갔으면 kick이 끝난 것으로 본다(창 없이 다시 읽기만)
    if (await act(t('failed.kick'), (d) => kick(d, goalId, userId), 'person')) await read(false);
  }

  async function invite() {
    // 코드가 없으면 그사이 만든 사람이 바뀌었다. 다음 회차가 역할을 받아 오면 버튼이 사라진다
    await act(t('failed.shareLink'), async (d) => { if (!(await shareInvite(d, goalId, goal.name))) requestSync(); });
  }

  async function rotate() {
    if (!(await confirm(togetherDialogs.rotate))) return;
    await act(t('failed.shareLink'), (d) => rotateAndShare(d, goalId, goal.name));
  }

  /** 시트에서 고른 뒤: 확인과 결과 창은 시트 위(overlay)에 띄우고, 끝나면 시트를 닫는다 (PITFALLS 「Modal 옆 Modal」). */
  async function picked(id: string) {
    if (pick === 'report') {
      const target = id === 'goal' ? t('report.goalName') : t('report.personName', others.find((r) => r.id === id)?.name ?? '');
      if (!(await confirm(togetherDialogs.report(target)))) return;
      if (await act(t('failed.report'), (d) => reportName(d, goalId, id === 'goal' ? null : id), id === 'goal' ? 'goal' : 'person')) await ask(togetherDialogs.reportDone);
      setSheetOpen(false);
      return;
    }
    const person = others.find((r) => r.id === id);
    if (!person || !(await confirm(togetherDialogs.blockConfirm(person.name)))) return;
    const ok = await act(t('failed.block'), (d) => block(d, id), 'person');
    setSheetOpen(false);
    if (ok) await read(false).catch(() => {});
  }

  async function leaveGoal() {
    if (!(await confirm(togetherDialogs.leave(mode)))) return;
    // 각자 판이면 내 판이 새 혼자 목표로 목록에 있다
    if (await act(t('failed.leave'), async (d) => { await leave(d, goalId); })) router.dismissTo('/');
  }

  /** 만든 사람 [삭제하기]: 나가고 옮겨 온 내 판까지 지운다(각자 판). 한 판은 내가 붙인 칸이 지워진다. 친구들 것은 그대로다. */
  async function remove() {
    // 혼자면 혼자 목표 삭제와 같은 확인 창(함께 지워질 수)
    const description = alone ? deleteDescription(await countGoalContents(goalId)) : deleteOwnerDescription(mode);
    if (!(await confirm(boardDialogs.deleteGoal(description)))) return;
    let photos: string[] = [];
    if (!(await act(t('failed.deleteGoal'), async (d) => { photos = await removeAsOwner(d, goalId); }))) return;
    track('goal_delete');
    for (const uri of photos) {
      try { removeManagedRecordPhoto(uri); } catch { /* 고아 파일로 남는다. 목표는 이미 지워졌다 */ }
    }
    router.dismissTo('/');
  }

  return (
    <>
      <TogetherSettingsScreen
        role={owner ? 'owner' : 'member'}
        mode={mode}
        goalName={editsGoal ? name : goal.name}
        onChangeGoalName={editsGoal ? (next) => { setName(next); setRejected({}); } : undefined}
        goalNameMaxLength={GOAL_NAME_MAX}
        goalNameError={rejected.goal ?? (editsGoal ? goalNameError(name) : undefined)}
        slots={slots ? {
          current: goal.totalSlots ?? 0,
          value: slotsText,
          onChange: (next) => { setSlotsText(next); setRejected({}); },
          error: slots.ok ? rejected.slots : slots.reason,
          max: SHARED_SLOTS_MAX,
        } : undefined}
        ownerName={ownerName}
        boardLabel={boardLabel(goal)}
        periodLabel={goal.boardType === 'calendar' ? periodLabel(goal) : undefined}
        completedLabel={isCompleted(goal) ? longDate(localDateKey(goal.completedAt!)) : undefined}
        myName={myName}
        onChangeMyName={(next) => { setMyName(next); setRejected({}); }}
        myNameMaxLength={MEMBER_NAME_MAX}
        myNameError={rejected.mine ?? memberNameError(myName)}
        sticker={sticker}
        onChooseSticker={() => router.push({ pathname: '/stickers/choose', params: { current: sticker } })}
        stickerError={rejected.sticker}
        saveError={rejected.goal ?? rejected.slots ?? rejected.mine ?? rejected.sticker}
        members={<MemberList members={rows} max={SHARED_MAX_MEMBERS}
          onKick={owner ? (userId) => { void actOnce(() => kickOut(userId)); } : undefined}
          onInvite={owner ? () => { void actOnce(invite); } : undefined}
          onRotate={owner ? () => { void actOnce(rotate); } : undefined} />}
        saveDisabled={busy || myName.trim() === '' || (editsGoal && name.trim() === '') || (slots !== null && !slots.ok)}
        onSave={() => { void actOnce(save); }}
        onReport={noOthers ? undefined : () => { setPick('report'); setSheetOpen(true); }}
        onBlock={noOthers ? undefined : () => { setPick('block'); setSheetOpen(true); }}
        onLeave={() => { void actOnce(leaveGoal); }}
        onDelete={owner ? () => { void actOnce(remove); } : undefined}
        onBack={goBack}
      />
      <BlockPickSheet
        visible={sheetOpen}
        title={pick === 'report' ? t('report.pickTitle') : undefined}
        extraRows={pick === 'report' && !owner ? [{ id: 'goal', label: t('report.goalName') }] : undefined}
        people={others}
        onPick={(id) => { void actOnce(() => picked(id)); }}
        onRequestClose={() => setSheetOpen(false)}
        overlay={sheetOpen ? confirmDialog : undefined}
      />
      {dialog}
      {!sheetOpen && confirmDialog}
    </>
  );
}
