import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HomeScreen, RetroScreen, PixelText, PixelButton, retro } from '../src/design-system';
import { useGoals } from '../src/app-data/useGoals';
import { localDateKey } from '../src/app-data/pocketAdapter';
import { placeSticker, listStickers } from '../src/repositories/stickerRepository';
import { nextSlotIndex } from '../src/domain/slots';

export default function Home() {
  const router = useRouter();
  const { loading, goals, stickers, pocket, reload } = useGoals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  if (loading) {
    return (
      <RetroScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={retro.color.ink} />
        </View>
      </RetroScreen>
    );
  }

  if (goals.length === 0) {
    return (
      <RetroScreen style={{ gap: 16 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <PixelText variant="title">아직 판이 비어 있어요</PixelText>
          <PixelText>첫 목표를 만들면 여기에 차곡차곡</PixelText>
        </View>
        <PixelButton label="새 목표 만들기" onPress={() => router.push('/goal/new')} />
      </RetroScreen>
    );
  }

  const current = goals.find((g) => g.id === selectedId) ?? goals[0];

  /** 적립판: 다음 빈칸에만 붙는다. 칸 번호는 1부터, slotIndex는 0부터다. */
  async function onSlotPress(slotNumber: number) {
    const mine = stickers.filter((s) => s.goalId === current.id);
    const next = nextSlotIndex(current, mine, new Date());
    if (next === null || slotNumber - 1 !== next) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await placeSticker(current.id, next, current.defaultStickerId as never);
    await reload();
  }

  /** 달력판: 오늘 칸만 붙는다. 이미 있으면 기록 화면으로 간다. */
  async function onDateSelect(date: string) {
    const mine = await listStickers(current.id);
    const existing = mine.find((s) => localDateKey(s.placedAt) === date);
    if (existing) {
      router.push({ pathname: '/sticker/[id]', params: { id: existing.id } });
      return;
    }
    if (date !== localDateKey(Date.now())) return; // 과거 소급 금지 (PRD 4.3)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await placeSticker(current.id, new Date().getDate() - 1, current.defaultStickerId as never);
    await reload();
  }

  return (
    <HomeScreen
      goals={pocket}
      selectedId={current.id}
      onSelectGoal={setSelectedId}
      onAdd={() => router.push('/goal/new')}
      onSettings={() =>
        router.push({ pathname: '/goal/[id]', params: { id: current.id } })
      }
      onSlotPress={(n) => { void onSlotPress(n); }}
      year={year}
      month={month}
      onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
      onDateSelect={(d) => { void onDateSelect(d); }}
    />
  );
}
