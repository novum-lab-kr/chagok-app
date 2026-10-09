import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BoardDetailScreen, PixelLoadingIndicator, RetroScreen, stickerShopDialogs } from '../../../src/design-system';
import type { StickerId } from '../../../src/design-system';
import { loadBoard } from '../../../src/app-data/boardData';
import type { BoardData } from '../../../src/app-data/boardData';
import { percentLabel } from '../../../src/app-data/pocketAdapter';
import { normalizeStickerId } from '../../../src/stickers/stickerIds';
import { removeManagedRecordPhoto } from '../../../src/app-data/recordPhotos';
import { saveOrNotify, useDialog } from '../../../src/app-data/useDialog';
import { createSingleFlight } from '../../../src/app-data/singleFlight';
import { goBackOrHome } from '../../../src/app-data/goBack';
import { checkPlaceGate } from '../../../src/app-data/placeGate';
import {
  canPlace, completesBoard, isCompleted, isDateEnabled, monthNav, needsRemoveConfirm, placedAtFor,
  pendingCompletion, progressOf, stickerDate,
} from '../../../src/domain/board';
import { localDateKey } from '../../../src/domain/dates';
import type { Sticker } from '../../../src/domain/types';
import { placeSticker, removeSticker } from '../../../src/repositories/stickerRepository';
import { markCompletionSeen, reopenGoal } from '../../../src/repositories/goalRepository';
import { subscribeWidgetApplied } from '../../../src/widgets/applied';
import { placementFromWidgetLink } from '../../../src/widgets/linkPlacement';
import { syncWidgetsNow } from '../../../src/widgets/syncWidgets';

/** [완성] 스티커 붙이기 모션이 끝나고 다이얼로그를 띄우기까지 */
const COMPLETION_DIALOG_DELAY_MS = 700;

/**
 * 판 상세 (PRD 4.1–4.7). 빈칸 한 번 = 붙이기, 붙인 칸 한 번 = 기록 열기, 꾹 = 떼기.
 * 완성했고 아직 닫기/계속하기를 고르지 않은 판은 열 때 완성 흐름을 보여준다
 * (마지막 칸, 종료일 지남, 수동 완성이 모두 같은 규칙 · DEV-DESIGN 5절).
 */
export default function Board() {
  const { id, place: placeParam } = useLocalSearchParams<{ id: string; place?: string }>();
  const router = useRouter();
  const today = new Date();
  const [shown, setShown] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [data, setData] = useState<BoardData | null>(null);
  const [justPlaced, setJustPlaced] = useState<{ slot?: number; date?: string }>({});
  const [actOnce] = useState(createSingleFlight);
  const { ask, confirm, dialog } = useDialog();
  /** 완성 다이얼로그가 떠 있는 동안 다시 띄우지 않는다 */
  const completionOpen = useRef(false);

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
    })();
    return () => { alive = false; };
  }, [id, shown.year, shown.month]));

  // 앱이 앞으로 올 때 위젯 탭이 기록에 반영되면, 이미 열려 있던 이 화면도 다시 읽는다 — 이전 목록으로 같은 칸에 또 붙지 않게.
  useEffect(() => subscribeWidgetApplied(() => { void reload(); }), [reload]);

  const goal = data?.goal;
  const pending = goal ? pendingCompletion(goal) : false;

  /** 닫기 / 계속하기 (PRD 4.7). 고르지 않고 닫으면 다음에 열 때 다시 묻는다. */
  async function askCompletion() {
    if (!goal) return;
    const how = goal.boardType === 'tally' ? '칸을 늘려' : goal.endDate ? '종료일을 늘려' : '완성을 풀고';
    const choice = await ask({
      title: goal.boardType === 'calendar' && goal.endDate ? '기간을 마쳤어요!' : '판을 완성했어요!',
      description: `${how} 이 판에 계속 붙일 수 있어요. 닫으면 완성한 판으로 보관돼요.`,
      secondaryLabel: '닫기',
      primaryLabel: '계속하기',
    });
    if (choice === 'dismiss') return;
    if (choice === 'secondary') {
      if (await saveOrNotify(ask, '저장하지 못했어요', () => markCompletionSeen(goal.id))) await reload();
      return;
    }
    if (goal.boardType === 'calendar' && !goal.endDate) {
      if (await saveOrNotify(ask, '저장하지 못했어요', () => reopenGoal(goal.id))) await reload();
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
    return (
      <RetroScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelLoadingIndicator label="불러오는 중" />
        </View>
      </RetroScreen>
    );
  }
  const { stickers, placedInBasis, recordedIds } = data;
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
    const target = from.goal;
    // 기본 스티커 묶음의 체험이 끝났으면 붙이지 않고 안내한다. 붙은 칸은 그대로다 (2026-10-08).
    const gate = await checkPlaceGate(target);
    if (!gate.ok) {
      const choice = await ask(stickerShopDialogs.trialEnded(gate.kind));
      if (choice === 'primary') router.push({ pathname: '/stickers/pack/[packId]', params: { packId: gate.packId } });
      if (choice === 'secondary') router.push({ pathname: '/stickers/choose', params: { current: target.defaultStickerId, goalId: target.id } });
      return;
    }
    const complete = !isCompleted(target) && completesBoard(target, from.placedAll);
    if (complete && !(await confirm({
      title: '이 판을 완성할까요?',
      description: target.boardType === 'tally'
        ? '마지막 칸이에요. 완성한 뒤에도 칸과 기록은 고칠 수 있어요.'
        : '기간의 마지막 빈 날이에요. 완성한 뒤에도 칸과 기록은 고칠 수 있어요.',
      secondaryLabel: '취소',
      primaryLabel: '완성하기',
    }))) return;
    const ok = await saveOrNotify(ask, '스티커를 붙이지 못했어요', async () => {
      await placeSticker(target.id, slotIndex, normalizeStickerId(target.defaultStickerId), { complete, placedAt });
    });
    if (!ok) return;
    setJustPlaced(at);
    if (!complete) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await reload();
  }

  /** 뗀다. 기록이 있으면 먼저 확인한다 (PRD 4.5). 완성한 판에서도 뗀다 — 완성은 그대로 (2026-10-08). */
  async function remove(target: Sticker) {
    if (needsRemoveConfirm(recordedIds.has(target.id))) {
      if (!(await confirm({ title: '스티커를 뗄까요?', description: '이 칸의 사진·메모도 함께 사라져요.', secondaryLabel: '취소', primaryLabel: '떼기' }))) return;
    }
    let photo: string | null = null;
    const ok = await saveOrNotify(ask, '스티커를 떼지 못했어요', async () => { photo = await removeSticker(target.id); });
    if (!ok) return;
    try { removeManagedRecordPhoto(photo); } catch { /* 고아 파일로 남는다. 기록은 이미 지워졌다 */ }
    setJustPlaced({});
    await reload();
  }

  function openRecord(target: Sticker | undefined) {
    if (target) router.push({ pathname: '/sticker/[id]', params: { id: target.id } });
  }

  const bySlot = (n: number) => stickers.find((s) => s.slotIndex === n - 1);
  const byDate = (date: string) => stickers.find((s) => stickerDate(s) === date);

  function onSlotPress(n: number) {
    void actOnce(async () => {
      const placed = bySlot(n);
      if (placed) { await remove(placed); return; }
      if (goal && canPlace(goal, stickers, { slot: n - 1 }, new Date())) await place(n - 1, { slot: n });
    });
  }

  /** 달력판: 시작일부터 오늘까지의 빈 날에 붙는다 — 미래는 안 된다 (PRD 4.3, 2026-10-08). 붙인 날을 한 번 누르면 뗀다. */
  function onDateSelect(date: string) {
    void actOnce(async () => {
      const placed = byDate(date);
      if (placed) { await remove(placed); return; }
      if (goal && canPlace(goal, stickers, { date }, new Date())) await place(Number(date.slice(8, 10)) - 1, { date }, data, placedAtFor(date, Date.now()));
    });
  }

  const filled: Record<number, StickerId> = {};
  const records: Record<string, StickerId> = {};
  const recordedSlots = new Set<number>();
  const recordedDates = new Set<string>();
  for (const s of stickers) {
    const type = normalizeStickerId(s.stickerType);
    if (goal.boardType === 'tally') {
      filled[s.slotIndex + 1] = type;
      if (recordedIds.has(s.id)) recordedSlots.add(s.slotIndex + 1);
    } else {
      records[stickerDate(s)] = type;
      if (recordedIds.has(s.id)) recordedDates.add(stickerDate(s));
    }
  }
  const nav = monthNav(goal, shown.year, shown.month);

  return (
    <>
      <BoardDetailScreen
        name={goal.name}
        sticker={sticker}
        completed={done}
        editable
        animateCompletion={pending}
        progress={{ value: progress.value, total: progress.total, percentLabel: percentLabel(goal, placedInBasis, now) }}
        onBack={goBackOrHome}
        onSettings={() => router.push({ pathname: '/goal/[id]/settings', params: { id: goal.id } })}
        board={goal.boardType === 'tally'
          ? { kind: 'tally', total: goal.totalSlots ?? 0, filled, recorded: recordedSlots, justPlaced: justPlaced.slot, onPress: onSlotPress, onOpenRecord: (n) => openRecord(bySlot(n)) }
          : {
            kind: 'calendar', year: shown.year, month: shown.month, records, recordedDates, justPlaced: justPlaced.date,
            selectedDate: done ? undefined : localDateKey(now.getTime()),
            isDateEnabled: (date) => isDateEnabled(goal, date, Boolean(records[date])),
            canGoPrev: nav.canGoPrev, canGoNext: nav.canGoNext,
            onSelect: onDateSelect,
            onMonthChange: (year, month) => { setJustPlaced({}); setShown({ year, month }); },
            onOpenRecord: (date) => openRecord(byDate(date)),
          }}
      />
      {dialog}
    </>
  );
}
