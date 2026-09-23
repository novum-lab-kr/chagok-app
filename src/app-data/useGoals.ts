import { useCallback, useState } from 'react';
import { listGoals } from '../repositories/goalRepository';
import { listStickers } from '../repositories/stickerRepository';
import { toPocketGoal } from './pocketAdapter';
import type { PocketGoal } from '../design-system/screen-compositions';
import type { Goal, Sticker } from '../domain/types';

export type GoalsState = {
  loading: boolean;
  goals: Goal[];
  stickers: Sticker[];
  pocket: PocketGoal[];
  reload: () => Promise<void>;
};

/**
 * 목표와 스티커를 함께 읽어 화면 모델까지 만든다.
 * 스티커를 붙이거나 뗀 뒤에는 reload()를 불러 다시 읽는다.
 */
export function useGoals(): GoalsState {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);

  const reload = useCallback(async () => {
    const gs = await listGoals();
    const all = (await Promise.all(gs.map((g) => listStickers(g.id)))).flat();
    setGoals(gs);
    setStickers(all);
    setLoading(false);
  }, []);

  return {
    loading,
    goals,
    stickers,
    pocket: goals.map((g) => toPocketGoal(g, stickers)),
    reload,
  };
}
