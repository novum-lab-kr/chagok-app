import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LoadingScreen, StickerChooserScreen, togglePack, useLoadRetry } from '../../src/design-system';
import { initialChoice, packViews } from '../../src/app-data/packViews';
import { usePrices } from '../../src/app-data/usePrices';
import { offerSticker, takeOpenPack } from '../../src/app-data/stickerChoice';
import { saveOrNotify, useDialog } from '../../src/app-data/useDialog';
import { goBackOrHome, goHome } from '../../src/app-data/goBack';
import { dayTrialThreshold } from '../../src/domain/packs';
import { loadPackState } from '../../src/repositories/packRepository';
import { updateGoal } from '../../src/repositories/goalRepository';
import { normalizeStickerId } from '../../src/stickers/stickerIds';
import { type ColorStickerId, type ColorStickerPackId } from '../../src/stickers/color/catalog';

type PackState = Awaited<ReturnType<typeof loadPackState>>;

/**
 * 「기본 스티커」 (PRD 4.12). 새 목표·목표 설정의 [바꾸기], 판 화면 「체험이 끝났어요」의 [다른 스티커]에서 연다.
 * goalId가 있으면(판 화면에서 옴) 고른 스티커를 그 목표에 바로 저장한다. 없으면 부른 화면에 넘긴다.
 */
export default function ChooseSticker() {
  const router = useRouter();
  const { current, goalId } = useLocalSearchParams<{ current?: string; goalId?: string }>();
  const [selected, setSelected] = useState<ColorStickerId>(() => normalizeStickerId(current ?? ''));
  const [open, setOpen] = useState<readonly ColorStickerPackId[]>([]);
  const started = useRef(false);
  const [mine, setMine] = useState(false);
  const [state, setState] = useState<{ pack: PackState; now: number } | null>(null);
  const { ask, dialog } = useDialog();
  const { failed, attempt, fail, retry } = useLoadRetry();
  const prices = usePrices();

  // 묶음 화면에서 열고 돌아오면 다시 읽고 그 묶음을 펼친다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    const opened = takeOpenPack();
    if (opened) setOpen((o) => (o.includes(opened) ? o : [...o, opened]));
    void loadPackState().then((pack) => {
      if (!alive) return;
      const now = Date.now();
      setState({ pack, now });
      // 처음 한 번: 잠긴 스티커로 열렸으면 새싹을 고른 채로 (체험이 끝난 뒤 [다른 스티커])
      if (!started.current) {
        started.current = true;
        const first = initialChoice(current ?? '', pack.access, now);
        setSelected(first.selected);
        setOpen((o) => (o.includes(first.open) ? o : [first.open, ...o]));
      }
    }).catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  // attempt는 [다시 시도] 때 다시 읽게 하는 신호라 콜백 안에서 쓰지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, attempt, fail]));

  async function done() {
    if (goalId) {
      const ok = await saveOrNotify(ask, '기본 스티커를 바꾸지 못했어요', () => updateGoal(goalId, { defaultStickerId: selected }));
      if (!ok) return;
    } else {
      offerSticker(selected);
    }
    goBackOrHome();
  }

  if (!state) {
    return <LoadingScreen failed={failed} kind="stickers" onRetry={retry} onHome={goHome} />;
  }
  return (
    <>
      <StickerChooserScreen
        packs={packViews(state.pack.access, state.now, prices)}
        mine={mine}
        onChangeMine={setMine}
        selected={selected}
        onSelect={(id) => setSelected(id as ColorStickerId)}
        openPacks={open}
        onToggle={(id) => setOpen((o) => togglePack(o, id))}
        reward={{ days: state.pack.days, goal: dayTrialThreshold(state.pack.claimed) }}
        onOpenPack={(packId) => router.push({ pathname: '/stickers/pack/[packId]', params: { packId } })}
        onDone={() => { void done(); }}
        onBack={goBackOrHome}
      />
      {dialog}
    </>
  );
}
