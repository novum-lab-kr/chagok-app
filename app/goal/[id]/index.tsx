import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { track } from '../../../src/analytics';
import { hasAnsweredAnalytics, saveAnalyticsEnabled } from '../../../src/analytics/posthog';
import {
  AnalyticsConsentSheet, BoardDetailScreen, CompletionNudge, FriendBoardList, FriendBoardModal, GuideCard, LoadingScreen, MemberBadgeRow, OneBoardNote, OneBoardWaiting, PixelButton,
  boardDialogs, stickerShopDialogs, togetherDialogs, useLoadRetry,
} from '../../../src/design-system';
import type { StickerId } from '../../../src/design-system';
import { loadBoard } from '../../../src/app-data/boardData';
import type { BoardData } from '../../../src/app-data/boardData';
import { percentLabel } from '../../../src/app-data/pocketAdapter';
import { canPlaceOn, friendBoardsOf, memberBadgesOf, myStickerOn, oneBoardCells, oneBoardShown, oneDayTap, placeCompletes, placedWhen } from '../../../src/app-data/sharedBoardView';
import { oneBoardOnline, watchSlotTaken } from '../../../src/app-data/sharedBoardGuards';
import { actionDeps, shareInvite } from '../../../src/app-data/sharedGoalActions';
import { normalizeStickerId } from '../../../src/stickers/stickerIds';
import { removeManagedRecordPhoto } from '../../../src/app-data/recordPhotos';
import { saveOrNotify, useDialog } from '../../../src/app-data/useDialog';
import { askToSignIn } from '../../../src/app-data/askToSignIn';
import { createSingleFlight } from '../../../src/app-data/singleFlight';
import { goBackOrHome, goHome } from '../../../src/app-data/goBack';
import { checkPlaceGate } from '../../../src/app-data/placeGate';
import {
  isCompleted, isDateEnabled, monthNav, needsRemoveConfirm, placedAtFor,
  pendingCompletion, progressOf, stickerDate,
} from '../../../src/domain/board';
import { localDateKey } from '../../../src/domain/dates';
import type { Sticker } from '../../../src/domain/types';
import { getFlag, setFlag } from '../../../src/repositories/appSettingsRepository';
import { countAllStickers, placeSticker, removeSticker } from '../../../src/repositories/stickerRepository';
import { markCompletionSeen, reopenGoal } from '../../../src/repositories/goalRepository';
import { ME } from '../../../src/repositories/ids';
import { subscribeLocalChangeGathered } from '../../../src/sync/changes';
import { requestSync } from '../../../src/sync/syncGate';
import { subscribeWidgetApplied } from '../../../src/widgets/applied';
import { placementFromWidgetLink } from '../../../src/widgets/linkPlacement';
import { syncWidgetsNow } from '../../../src/widgets/syncWidgets';
import { t } from '../../../src/i18n';

/** [완성] 스티커 붙이기 모션이 끝나고 다이얼로그를 띄우기까지 */
const COMPLETION_DIALOG_DELAY_MS = 700;

/**
 * 판 상세 (PRD 4.1–4.7). 빈칸 한 번 = 붙이기, 붙인 칸 한 번 = 기록 열기, 꾹 = 떼기.
 * 완성했고 아직 닫기/계속하기를 고르지 않은 판은 열 때 완성 흐름을 보여준다
 * (마지막 칸, 종료일 지남, 수동 완성이 모두 같은 규칙 · DEV-DESIGN 5절).
 * 함께 목표(PRD 4.15): 각자 판(each)은 내 판 두 줄 + 아래 친구 판 줄, 한 판(one)은 사람 줄 + 판 네 줄.
 * 한 판의 친구 칸은 누르면 누가 언제 붙였는지 보이고 뗄 수 없다. 가려진 칸(차단)은 누를 수 없다. 한 판은 연결이 있을 때만 붙인다.
 */
export default function Board() {
  const { id, place: placeParam } = useLocalSearchParams<{ id: string; place?: string }>();
  const router = useRouter();
  const today = new Date();
  const [shown, setShown] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [data, setData] = useState<BoardData | null>(null);
  const { failed, attempt, fail, retry } = useLoadRetry();
  const [justPlaced, setJustPlaced] = useState<{ slot?: number; date?: string }>({});
  const [actOnce] = useState(createSingleFlight);
  const { ask, confirm, dialog, dialogOpen } = useDialog();
  /** 사용 기록 동의 (PRD 8.2). 붙는 모션을 본 뒤에 띄운다. */
  const [consentPending, setConsentPending] = useState(false);
  const [consentVisible, setConsentVisible] = useState(false);
  // iOS에서 모달을 겹쳐 띄우면 시트가 뜨지 못한 채 터치만 막힌다. 다른 창이 떠 있으면 이번에는 묻지 않고 다음 스티커로 미룬다.
  const completionWaiting = data ? pendingCompletion(data.goal) : false;
  useEffect(() => {
    if (!consentPending) return;
    if (dialogOpen || completionWaiting) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 다른 창이 뜬 순간에 대기를 취소한다
      setConsentPending(false);
      return;
    }
    const timer = setTimeout(() => setConsentVisible(true), 600);
    return () => clearTimeout(timer);
  }, [consentPending, dialogOpen, completionWaiting]);
  /** 저장에 실패하면 꺼진 채 두고 다음 스티커 때 다시 묻는다. 앱 사용을 막지 않는다. */
  function answerConsent(agreed: boolean) {
    setConsentVisible(false);
    setConsentPending(false);
    saveAnalyticsEnabled(agreed).catch(() => {});
  }
  /** 완성 다이얼로그가 떠 있는 동안 다시 띄우지 않는다 */
  const completionOpen = useRef(false);
  /** 완성한 판을 [닫기]로 보관한 순간에만 보이는 「다음 판은 새 스티커로」. 닫거나 판을 나가면 다시 보이지 않는다 (2026-10-12). */
  const [nudge, setNudge] = useState(false);
  /** 첫 스티커 안내를 띄운 스티커 */
  const [firstGuide, setFirstGuide] = useState<string | null>(null);
  /** 크게 보고 있는 친구 판(각자 판) */
  const [friendOpen, setFriendOpen] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const next = await loadBoard(id, shown.year, shown.month, new Date());
    if (!next) { goBackOrHome(); return; }
    setData(next);
  }, [id, shown.year, shown.month]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    void (async () => {
      const next = await loadBoard(id, shown.year, shown.month, new Date());
      if (!alive) return;
      if (!next) { goBackOrHome(); return; }
      setData(next);
    })().catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  // attempt는 [다시 시도] 때 다시 읽게 하는 신호라 콜백 안에서 쓰지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, shown.year, shown.month, attempt, fail]));

  // 앱이 앞으로 올 때 위젯 탭이 기록에 반영되면, 이미 열려 있던 이 화면도 다시 읽는다 — 이전 목록으로 같은 칸에 또 붙지 않게.
  useEffect(() => subscribeWidgetApplied(() => { void reload(); }), [reload]);

  // 함께 목표: 볼 때 서버 것을 바로 받고, 회차가 기기를 바꾸면 다시 읽는다(친구 칸). 혼자 목표는 지금과 같다.
  // 한 판에서 내 칸이 slot_taken으로 지워지면 「이미 누가 붙였어요」를 한 번 보인다 — 같은 회차에 여러 칸이어도 모아서 한 번.
  const shared = data ? data.goal.mode === 'each' || data.goal.mode === 'one' : false;
  const latestReload = useRef(reload);
  useEffect(() => { latestReload.current = reload; }, [reload]);
  useFocusEffect(useCallback(() => {
    if (!shared) return;
    requestSync();
    const offChange = subscribeLocalChangeGathered(() => { void latestReload.current().catch(() => {}); });
    const offTaken = watchSlotTaken(id, () => {
      void latestReload.current().catch(() => {});
      void ask(togetherDialogs.slotTaken);
    });
    return () => { offChange(); offTaken(); };
  }, [shared, id, ask]));

  const goal = data?.goal;
  const pending = goal ? pendingCompletion(goal) : false;

  /** 닫기 / 계속하기 (PRD 4.7). 고르지 않고 닫으면 다음에 열 때 다시 묻는다. */
  async function askCompletion() {
    if (!goal) return;
    const choice = await ask(boardDialogs.completed(goal.boardType === 'tally' ? 'tally' : goal.endDate ? 'period' : 'open'));
    if (choice === 'dismiss') return;
    if (choice === 'secondary') {
      if (await saveOrNotify(ask, t('failed.save'), () => markCompletionSeen(goal.id))) {
        await reload();
        setNudge(true);
      }
      return;
    }
    if (goal.boardType === 'calendar' && !goal.endDate) {
      if (await saveOrNotify(ask, t('failed.save'), () => reopenGoal(goal.id))) await reload();
      return;
    }
    router.push({ pathname: '/goal/[id]/extend', params: { id: goal.id } });
  }


  /**
   * 완성 흐름: [완성] 스티커는 완성 흐름을 기다리는 판에서 붙이기 모션으로 나타난다(BoardDetailScreen animateCompletion).
   * 모션이 끝나면 닫기 / 계속하기를 묻는다.
   */
  useEffect(() => {
    if (!goal || !pending || completionOpen.current) return;
    completionOpen.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const timer = setTimeout(() => { void askCompletion(); }, COMPLETION_DIALOG_DELAY_MS);
    return () => { clearTimeout(timer); completionOpen.current = false; };
    // 다시 읽어 goal이 바뀔 때만 다시 판단한다. askCompletion은 매 렌더 새로 만들어지므로 넣지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, pending]);

  // 위젯에서 마지막 칸을 눌러 열렸다 → 평소처럼 완성을 확인받고 붙인다 (2026-10-06 결정, PRD 4.7).
  // 앱이 꺼져 있었다면 아직 반영하지 않은 위젯 탭이 있을 수 있다 — 먼저 반영하고 다시 읽은 뒤 붙일 곳과 완성 여부를 정한다.
  const placeHandled = useRef(false);
  useEffect(() => {
    if (placeParam !== '1') { placeHandled.current = false; return; } // 다음 위젯 링크도 받는다
    if (placeHandled.current || !data) return;
    placeHandled.current = true;
    router.setParams({ place: undefined });
    void actOnce(async () => {
      await syncWidgetsNow();
      const at = new Date();
      const year = at.getFullYear();
      const month = at.getMonth() + 1;
      const fresh = await loadBoard(id, year, month, at);
      if (!fresh) { goBackOrHome(); return; }
      setShown((s) => (s.year === year && s.month === month ? s : { year, month }));
      setData(fresh);
      const target = placementFromWidgetLink(fresh.goal, fresh.stickers, at);
      if (target) await place(target.slotIndex, target.at, fresh);
    });
    // place·actOnce·router는 매 렌더 새로 만들어지거나 바뀌지 않는다. 링크 값과 처음 데이터가 준비될 때만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeParam, data]);

  if (!data || !goal) {
    return <LoadingScreen failed={failed} kind="records" onRetry={retry} onHome={goHome} />;
  }
  const { stickers, placedInBasis, recordedIds, members } = data;
  const done = isCompleted(goal);
  const sticker = normalizeStickerId(goal.defaultStickerId);
  const now = new Date();
  const progress = progressOf(goal, placedInBasis, now);

  /**
   * 붙인다. 마지막 칸이면 먼저 완성을 확인받는다. 저장이 끝난 뒤에만 모션·햅틱·갱신 (PRD 4.5, 4.7, 7절).
   * 이미 완성한 판은 다시 완성하지 않는다 — 완성은 한 번만 (2026-10-08).
   * from: 판단에 쓸 판 데이터. 위젯 링크는 방금 다시 읽은 것을 넘긴다. 기본은 지금 보이는 판.
   * placedAt: 달력판의 지난 날짜는 그 날짜의 시각으로 붙인다(placedAtFor). 없으면 지금.
   */
  async function place(slotIndex: number, at: { slot?: number; date?: string }, from: BoardData | null = data, placedAt?: number) {
    if (!from) return;
    // 첫 스티커 안내가 보이는 채로 다음 칸을 붙이면 본 것으로 친다. 안 닫고 계속 붙여도 매번 다시 뜨지 않게 한다.
    if (firstGuide && !dialogOpen) void setFlag('firstStickerGuideDone', true);
    const target = from.goal;
    // 한 판은 여럿이 같은 칸을 다투므로 연결이 있을 때만 붙인다. 기기에도 쓰지 않는다 (PRD 4.15).
    if (!(await oneBoardOnline(target, () => ask(togetherDialogs.offlineOne)))) return;
    // 기본 스티커 묶음의 체험이나 구독이 끝났으면 붙이지 않고 안내한다. 붙은 칸은 그대로다 (2026-10-08, 구독 2026-11-02).
    const gate = await checkPlaceGate(target);
    if (!gate.ok) {
      const choice = await ask(gate.kind === '구독' ? stickerShopDialogs.subscriptionEnded : stickerShopDialogs.trialEnded(gate.kind));
      if (choice === 'primary') router.push({ pathname: '/stickers/pack/[packId]', params: { packId: gate.packId } });
      if (choice === 'secondary') router.push({ pathname: '/stickers/choose', params: { current: target.defaultStickerId, goalId: target.id } });
      return;
    }
    const complete = !isCompleted(target) && placeCompletes(target, from.placedAll, from.stickers, at.date);
    if (complete && !(await confirm(boardDialogs.confirmLast(target.boardType)))) return;
    let placedId: string | null = null;
    const ok = await saveOrNotify(ask, t('failed.placeSticker'), async () => {
      placedId = (await placeSticker(target.id, slotIndex, normalizeStickerId(target.defaultStickerId), { complete, placedAt })).id;
    });
    if (!ok) return;
    track('sticker_place', { board_type: target.boardType, source: 'app' });
    if (complete) track('goal_complete', { source: 'app' });
    if (target.mode === 'one') requestSync(); // 같은 칸을 다른 사람이 먼저 붙였는지 바로 확인한다
    setJustPlaced(at);
    if (!complete) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await reload();
    setFirstGuide(null);
    if (complete) return;
    // 앱 전체의 첫 스티커에는 메모 안내만 보여 주고, 사용 기록 동의는 다음 스티커로 미룬다 (2026-11-02).
    // 본 것으로 치는 때는 카드를 닫거나 [메모 남기기]를 누른 때다. 그 전에 완성 창 등에 밀려 사라지면 다음 스티커에서 다시 보여 준다.
    const guideDone = await getFlag('firstStickerGuideDone').catch(() => true);
    const first = !guideDone && ((await countAllStickers().catch(() => 0)) === 1 || (await getFlag('firstStickerGuidePending').catch(() => false)));
    if (first && placedId) {
      setFirstGuide(placedId);
      void setFlag('firstStickerGuidePending', true);
      return;
    }
    // 스티커를 붙인 뒤 한 번만 묻는다. 완성 흐름과 겹치면 다음 스티커로 미룬다 (PRD 8.2).
    if (!(await hasAnsweredAnalytics().catch(() => true))) setConsentPending(true);
  }

  /** 뗀다. 기록이 있으면 먼저 확인한다 (PRD 4.5). 완성한 판에서도 뗀다 — 완성은 그대로 (2026-10-08). */
  async function remove(target: Sticker) {
    if (needsRemoveConfirm(recordedIds.has(target.id))) {
      if (!(await confirm(boardDialogs.removeSticker))) return;
    }
    let photo: string | null = null;
    const ok = await saveOrNotify(ask, t('failed.removeSticker'), async () => { photo = await removeSticker(target.id); });
    if (!ok) return;
    track('sticker_remove', { source: 'app' });
    try { removeManagedRecordPhoto(photo); } catch { /* 고아 파일로 남는다. 기록은 이미 지워졌다 */ }
    setJustPlaced({});
    await reload();
  }

  function openRecord(target: Sticker | undefined) {
    if (target) router.push({ pathname: '/sticker/[id]', params: { id: target.id, from: 'board' } });
  }

  const one = goal.mode === 'one';
  // 한 판 달력판은 하루에 두 장까지다. 둘째 장은 첫 장에 겹쳐 그린다(sharedBoardView).
  const oneShown = one && goal.boardType === 'calendar' ? oneBoardShown(stickers) : null;
  const bySlot = (n: number) => stickers.find((s) => s.slotIndex === n - 1);
  const byDate = (date: string) => (oneShown ? oneShown[date]?.[0] : stickers.find((s) => stickerDate(s) === date));
  /** 적립판: 빈칸 = 붙이기, 붙인 칸 꾹 = 떼기. 한 판은 내가 붙인 칸만 뗀다. */
  function onSlotPress(n: number) {
    void actOnce(async () => {
      const placed = bySlot(n);
      if (placed) { if (!one || placed.placedBy === ME) await remove(placed); return; }
      if (goal && canPlaceOn(goal, stickers, { slot: n - 1 }, new Date())) await place(n - 1, { slot: n });
    });
  }

  /**
   * 달력판: 시작일부터 오늘까지의 빈 날에 붙는다 — 미래는 안 된다 (PRD 4.3, 2026-10-08). 붙인 날을 꾹 누르면 뗀다.
   * 한 판은 그날 내 스티커를 뗀다(친구가 먼저 붙인 날이어도). 친구 것만 있거나 가려진 칸만 있는 날은 두 장 규칙 안에서 붙인다.
   */
  function onDateSelect(date: string) {
    void actOnce(async () => {
      const placed = byDate(date);
      if (placed) { const own = one ? myStickerOn(stickers, date) : placed; if (own) await remove(own); return; }
      if (goal && canPlaceOn(goal, stickers, { date }, new Date())) await place(Number(date.slice(8, 10)) - 1, { date }, data, placedAtFor(date, Date.now()));
    });
  }

  /** 한 판 친구 칸: 누가 언제 붙였는지. 내 칸은 기록을 연다. */
  function onOneSlotOpen(n: number) {
    const by = oneCells?.placedBy[n];
    if (by) void ask(togetherDialogs.placedBy(by.name, placedWhen(by.at)));
    else openRecord(bySlot(n));
  }

  /** 한 판 달력판의 붙은 날 한 번: 내 스티커면 기록, 친구 것만 있고 붙일 수 있으면 붙이기, 아니면 아무 일도 없다(sharedBoardView oneDayTap). */
  function onOneDateOpen(date: string) {
    if (!goal) return;
    const tap = oneDayTap(goal, stickers, date, new Date());
    if (tap === 'place') void actOnce(() => place(Number(date.slice(8, 10)) - 1, { date }, data, placedAtFor(date, Date.now())));
    else if (tap) openRecord(tap.open);
  }

  /** 각자 판 [링크 다시 보내기]: 만든 사람만. 초대 코드는 그때그때 서버에서 읽는다. */
  function onResend() {
    if (!goal) return;
    void actOnce(async () => {
      const d = await actionDeps().catch(() => null);
      if (!d) { await askToSignIn(ask, router); return; }
      await saveOrNotify(ask, t('failed.shareLink'), async () => {
        // 코드가 없으면 그사이 만든 사람이 바뀌었다. 다시 받아 버튼이 사라지게 한다
        if (!(await shareInvite(d, goal.id, goal.name))) requestSync();
      });
    });
  }

  // 한 판 적립판은 칸마다 붙인 사람의 스티커와 가려진 칸(sharedBoardView). 기록 표시는 내 칸만이다.
  const oneCells = one && goal.boardType === 'tally' ? oneBoardCells(stickers, members) : null;
  const filled: Record<number, StickerId> = oneCells ? oneCells.filled : {};
  const records: Record<string, StickerId> = {};
  const recordedSlots = new Set<number>();
  const recordedDates = new Set<string>();
  for (const s of stickers) {
    const type = normalizeStickerId(s.stickerType);
    if (goal.boardType === 'tally') {
      if (!oneCells) filled[s.slotIndex + 1] = type;
      if (recordedIds.has(s.id)) recordedSlots.add(s.slotIndex + 1);
    } else {
      if (!oneShown) records[stickerDate(s)] = type;
      // 한 판은 그날 내가 둘째로 붙여 남긴 기록도 표시한다
      if (recordedIds.has(s.id)) recordedDates.add(stickerDate(s));
    }
  }
  const records2: Record<string, StickerId> = {};
  if (oneShown) {
    for (const [date, [first, second]] of Object.entries(oneShown)) {
      records[date] = normalizeStickerId(first.stickerType);
      if (second) records2[date] = normalizeStickerId(second.stickerType);
    }
  }
  const nav = monthNav(goal, shown.year, shown.month);
  const friends = goal.mode === 'each' ? friendBoardsOf(goal, members, data.friendStickers, localDateKey(now.getTime())) : [];
  const openFriend = friends.find((f) => f.id === friendOpen);
  const sharedView = goal.mode === 'each'
    ? { title: goal.name, name: t('together.myBoard'), hideProgress: true, boardRows: 2,
      below: <FriendBoardList friends={friends} onOpen={setFriendOpen} onResend={goal.role === 'owner' ? onResend : undefined} /> }
    : one
      ? { title: goal.name, name: t('together.ourBoard'), hideProgress: true, boardRows: 4,
        members: <MemberBadgeRow people={memberBadgesOf(members)} />, below: <OneBoardNote calendar={goal.boardType === 'calendar'} />,
        // 친구가 아직 없으면 판 위에 각자 판과 같은 기다림 안내(2026-11-05 시안 T1 A안)
        above: members.some((m) => !m.isMe) ? undefined : <OneBoardWaiting onResend={goal.role === 'owner' ? onResend : undefined} /> }
      : { name: goal.name };

  return (
    <>
      <BoardDetailScreen
        {...sharedView}
        sticker={sticker}
        completed={done}
        animateCompletion={pending}
        progress={{ value: progress.value, total: progress.total, percentLabel: percentLabel(goal, placedInBasis, now) }}
        onBack={goBackOrHome}
        onSettings={() => router.push({ pathname: '/goal/[id]/settings', params: { id: goal.id } })}
        notice={nudge ? <CompletionNudge onStickers={() => { setNudge(false); router.navigate('/stickers'); }} onHome={() => { setNudge(false); goHome(); }} onClose={() => setNudge(false)} /> : firstGuide && !dialogOpen ? (
          <GuideCard
            text={t('guide.firstSticker')}
            onClose={() => { setFirstGuide(null); void setFlag('firstStickerGuideDone', true); }}
            actions={<PixelButton label={t('guide.writeMemo')} minHeight={40} onPress={() => { const target = firstGuide; setFirstGuide(null); void setFlag('firstStickerGuideDone', true); router.push({ pathname: '/sticker/[id]', params: { id: target, from: 'board' } }); }} />}
          />
        ) : undefined}
        board={goal.boardType === 'tally'
          ? { kind: 'tally', total: goal.totalSlots ?? 0, filled, recorded: recordedSlots, justPlaced: justPlaced.slot, onPress: onSlotPress, onOpenRecord: oneCells ? onOneSlotOpen : (n) => openRecord(bySlot(n)), hidden: oneCells?.hidden }
          : {
            kind: 'calendar', year: shown.year, month: shown.month, records, records2: oneShown ? records2 : undefined, recordedDates, justPlaced: justPlaced.date,
            selectedDate: done ? undefined : localDateKey(now.getTime()),
            isDateEnabled: (date) => isDateEnabled(goal, date, Boolean(records[date])),
            canGoPrev: nav.canGoPrev, canGoNext: nav.canGoNext,
            onSelect: onDateSelect,
            onMonthChange: (year, month) => { setJustPlaced({}); setShown({ year, month }); },
            onOpenRecord: one ? onOneDateOpen : (date) => openRecord(byDate(date)),
          }}
      />
      {openFriend && <FriendBoardModal visible name={openFriend.name} sticker={openFriend.sticker} board={openFriend.board} onRequestClose={() => setFriendOpen(null)} />}
      {dialog}
      <AnalyticsConsentSheet visible={consentVisible} onAgree={() => answerConsent(true)} onDecline={() => answerConsent(false)} />
    </>
  );
}
