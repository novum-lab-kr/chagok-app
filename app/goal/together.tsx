import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { TogetherGoalScreen, boardDialogs, togetherDialogs } from '../../src/design-system';
import type { BoardKind, EndDateMode, StickerId, TogetherMode } from '../../src/design-system';
import { listGoals } from '../../src/repositories/goalRepository';
import { loadPackState } from '../../src/repositories/packRepository';
import { newId } from '../../src/repositories/ids';
import { canCreateGoal } from '../../src/domain/subscription';
import { useUnsavedBack } from '../../src/app-data/useUnsavedBack';
import { useDialog } from '../../src/app-data/useDialog';
import { createSingleFlight } from '../../src/app-data/singleFlight';
import { longDate } from '../../src/app-data/pocketAdapter';
import { takeOfferedSticker } from '../../src/app-data/stickerChoice';
import { actionDeps, createAndFetch, shareInviteUrl } from '../../src/app-data/sharedGoalActions';
import { SharedGoalError, errorMessage, readMemberDefaults } from '../../src/sync/sharedGoals';
import { localDateKey } from '../../src/domain/dates';
import {
  GOAL_NAME_MAX, MEMBER_NAME_MAX, SHARED_MAX_MEMBERS, SHARED_SLOTS_MAX, parseSlotCount, shownGoalNameError, shownMemberNameError,
} from '../../src/domain/board';
import { t } from '../../src/i18n';
import { DEFAULT_COLOR_STICKER, normalizeStickerId } from '../../src/stickers/stickerIds';

const DEFAULT_COUNT = '15';

/**
 * 친구와 함께 만들기 (PRD 4.15). 만들면 OS 공유 창으로 초대 링크를 보내고 그 판을 연다.
 * 내 이름과 스티커는 지난번 함께 목표 값(member_defaults)으로 채운다. 못 읽으면(오프라인) 빈칸으로 둔다.
 * 서버 호출 순서는 app-data/sharedGoalActions.ts가 정한다. 실패하면 화면을 그대로 두어 입력을 잃지 않는다.
 */
export default function TogetherGoal() {
  const router = useRouter();
  const [mode, setMode] = useState<TogetherMode>('each');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [kind, setKind] = useState<BoardKind>('tally');
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [endMode, setEndMode] = useState<EndDateMode>('none');
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  /** 지난번 함께 목표의 내 이름과 스티커. 이 값에서 바꾸지 않았으면 저장하지 않은 입력으로 치지 않는다 */
  const [defaults, setDefaults] = useState<{ name: string; sticker: StickerId }>({ name: '', sticker: DEFAULT_COLOR_STICKER });
  const [myName, setMyName] = useState('');
  const [myNameTouched, setMyNameTouched] = useState(false);
  const [sticker, setSticker] = useState<StickerId>(DEFAULT_COLOR_STICKER);
  /**
   * 서버가 거절한 이름의 문구. 금칙어(name_not_allowed)는 목표 이름인지 내 이름인지 서버가 가르지 않아 두 칸 아래 모두,
   * invalid_name은 내 이름 칸 아래에 보인다. 이름을 고치면 지운다
   */
  const [nameRejected, setNameRejected] = useState<{ goal?: string; mine?: string }>({});
  /** 서버가 칸 수를 받지 않았다(invalid_input). 화면 검사가 먼저 막아 거의 닿지 않는다 */
  const [countRejected, setCountRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitOnce] = useState(createSingleFlight);
  const { ask, dialog: failure } = useDialog();
  /** 화면이 아직 떠 있는가. 만드는 사이 화면이 닫혔으면 공유 창과 이동을 건너뛴다(목표는 다음 동기화 회차가 목록에 넣는다) */
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
      const next = { name: saved.displayName.slice(0, MEMBER_NAME_MAX), sticker: normalizeStickerId(saved.stickerId) };
      setDefaults(next);
      // 읽는 사이에 사용자가 이미 고쳤으면 그 값을 둔다
      setMyName((current) => (current === '' ? next.name : current));
      setSticker((current) => (current === DEFAULT_COLOR_STICKER ? next.sticker : current));
    })().catch(() => {});
    return () => { alive = false; };
  }, []);

  const dirty = name !== '' || mode !== 'each' || kind !== 'tally' || count !== DEFAULT_COUNT || endMode !== 'none'
    || myName !== defaults.name || sticker !== defaults.sticker;
  // 만드는 중(서버 호출, 다시 받기, 공유 창)에는 뒤로 가기를 막는다
  const { goBack, dialog } = useUnsavedBack(dirty, submitting);
  // 「기본 스티커」에서 고르고 돌아오면 받는다 (새 목표와 같음).
  useFocusEffect(useCallback(() => {
    const picked = takeOfferedSticker();
    if (picked) setSticker(picked);
  }, []));

  const [today] = useState(() => localDateKey(Date.now()));
  const slots = parseSlotCount(count, 1, SHARED_SLOTS_MAX);
  const endValid = kind === 'tally' || endMode === 'none' || endDate !== undefined;
  const valid = name.trim().length > 0 && myName.trim().length > 0 && (kind === 'calendar' || slots.ok) && endValid;
  const countError = kind !== 'tally' ? undefined
    : !slots.ok ? slots.reason
    : countRejected ? t('validation.slotCountMax', SHARED_SLOTS_MAX) : undefined;

  async function submit() {
    // 누른 때부터 끝날 때까지 뒤로 가기를 막는다(useUnsavedBack busy)
    setSubmitting(true);
    let d: Awaited<ReturnType<typeof actionDeps>>;
    try {
      // 목표 탭 [+]가 막지만, 링크로 바로 열어도 한도를 지킨다. 함께 목표도 목표 수에 든다
      const [goals, pack] = await Promise.all([listGoals(), loadPackState()]);
      if (!canCreateGoal(goals.length, pack.subscribed)) {
        router.replace({ pathname: '/subscription', params: { from: 'goals' } });
        return;
      }
      d = await actionDeps();
    } catch {
      if (!mounted.current) return;
      setSubmitting(false);
      await ask(boardDialogs.saveFailed(t('failed.createGoal')));
      return;
    }
    if (!mounted.current) return;
    if (!d) {
      setSubmitting(false);
      // 이 화면에 있는 동안 로그인이 풀렸다. 로그인하고 돌아오면 입력이 그대로 있다
      if ((await ask(togetherDialogs.login)) === 'primary') router.push({ pathname: '/account/connect', params: { from: 'relogin' } });
      return;
    }
    const goalName = name.trim();
    let created: Awaited<ReturnType<typeof createAndFetch>>;
    try {
      created = await createAndFetch(d, {
        goalId: newId(), mode, name: goalName, boardType: kind,
        totalSlots: kind === 'tally' && slots.ok ? slots.value : null,
        endDate: kind === 'calendar' && endMode === 'pick' ? endDate ?? null : null,
        displayName: myName.trim(), stickerId: sticker,
      });
    } catch (error) {
      if (!mounted.current) return;
      setSubmitting(false);
      const word = error instanceof SharedGoalError ? error.word : 'network';
      if (word === 'name_not_allowed') setNameRejected({ goal: errorMessage(word), mine: errorMessage(word) });
      else if (word === 'invalid_name') setNameRejected({ mine: errorMessage(word) });
      else if (word === 'invalid_input' && kind === 'tally') setCountRejected(true);
      else await ask(boardDialogs.saveFailed(t('failed.createGoal')));
      return;
    }
    if (!mounted.current) return;
    // 공유 창을 닫거나 취소해도 다음으로 간다
    await shareInviteUrl(goalName, created.inviteUrl).catch(() => {});
    if (!mounted.current) return;
    setSubmitting(false);
    // 기기에 아직 받지 못했으면 목록으로. 다음 동기화 회차가 받아 오면 목록에 생긴다
    if (created.onDevice) router.replace({ pathname: '/goal/[id]', params: { id: created.goalId } });
    else router.dismissTo('/');
  }

  return (
    <>
      <TogetherGoalScreen
        mode={mode} onChangeMode={setMode}
        name={name}
        onChangeName={(next) => { setName(next); setNameRejected({}); if (next !== '') setNameTouched(true); }}
        nameMaxLength={GOAL_NAME_MAX}
        nameError={nameRejected.goal ?? shownGoalNameError(name, nameTouched)}
        onNameBlur={() => setNameTouched(true)}
        kind={kind} onChangeKind={setKind}
        count={count} onChangeCount={(next) => { setCount(next); setCountRejected(false); }}
        countMax={SHARED_SLOTS_MAX}
        end={{ mode: endMode, onChangeMode: setEndMode, date: endDate, onChangeDate: setEndDate, today, todayLabel: longDate(today) }}
        myName={myName}
        onChangeMyName={(next) => { setMyName(next); setNameRejected({}); if (next !== '') setMyNameTouched(true); }}
        myNameMaxLength={MEMBER_NAME_MAX}
        myNameError={nameRejected.mine ?? shownMemberNameError(myName, myNameTouched)}
        onMyNameBlur={() => setMyNameTouched(true)}
        sticker={sticker}
        onChooseSticker={() => router.push({ pathname: '/stickers/choose', params: { current: sticker } })}
        maxFriends={SHARED_MAX_MEMBERS - 1}
        error={countError}
        submitDisabled={!valid || submitting}
        submitting={submitting}
        onSubmit={() => { void submitOnce(submit); }}
        onBack={goBack}
      />
      {dialog}
      {failure}
    </>
  );
}
