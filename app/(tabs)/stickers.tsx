import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { LoadingScreen, StickerCollectionScreen, TabSafeArea, togglePack, useLoadRetry } from '../../src/design-system';
import { packViews } from '../../src/app-data/packViews';
import { usePrices } from '../../src/app-data/usePrices';
import { takeOpenPack } from '../../src/app-data/stickerChoice';
import { dayTrialThreshold } from '../../src/domain/packs';
import { loadPackState } from '../../src/repositories/packRepository';
import type { ColorStickerPackId } from '../../src/stickers/color/catalog';

type PackState = Awaited<ReturnType<typeof loadPackState>>;

/** 스티커 탭 (2026-10-12): 묶음 둘러보기. 잠긴 묶음을 누르면 묶음 화면(사기·광고 하루·붙인 날 3일). */
export default function Stickers() {
  const router = useRouter();
  const [state, setState] = useState<{ pack: PackState; now: number } | null>(null);
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState<readonly ColorStickerPackId[]>([]);
  const { failed, attempt, fail, retry } = useLoadRetry();
  const prices = usePrices();

  // 옆 탭에서 밀어 올 때 빈 화면이 보이지 않게 처음 그릴 때도 한 번 읽는다. 들어오면 아래에서 다시 읽는다.
  useEffect(() => {
    let alive = true;
    void loadPackState().then((pack) => { if (alive) setState((s) => s ?? { pack, now: Date.now() }); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // 묶음 화면에서 열고 돌아오면 다시 읽고 그 묶음을 펼친다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    const opened = takeOpenPack();
    if (opened) setOpen((o) => (o.includes(opened) ? o : [...o, opened]));
    void loadPackState()
      .then((pack) => { if (alive) setState({ pack, now: Date.now() }); })
      .catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  // attempt는 [다시 시도] 때 다시 읽게 하는 신호라 콜백 안에서 쓰지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, fail]));

  if (!state) return <TabSafeArea><LoadingScreen failed={failed} kind="stickers" onRetry={retry} /></TabSafeArea>;
  return (
    <TabSafeArea>
      <StickerCollectionScreen
        packs={packViews(state.pack.access, state.now, prices)}
        mine={mine}
        onChangeMine={setMine}
        openPacks={open}
        onToggle={(id) => setOpen((o) => togglePack(o, id))}
        reward={{ days: state.pack.days, goal: dayTrialThreshold(state.pack.claimed) }}
        onOpenPack={(packId) => router.push({ pathname: '/stickers/pack/[packId]', params: { packId } })}
      />
    </TabSafeArea>
  );
}
