import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  HomeScreen, RetroScreen, PixelText, PixelButton, TutorialScreen, retro,
} from '../src/design-system';
import { useGoals } from '../src/app-data/useGoals';
import { localDateKey } from '../src/app-data/pocketAdapter';
import { placeSticker, listStickers, countStickers } from '../src/repositories/stickerRepository';
import { getFlag, setFlag } from '../src/repositories/appSettingsRepository';
import { buildSlots, nextSlotIndex } from '../src/domain/slots';
import { createSingleFlight } from '../src/app-data/singleFlight';

export default function Home() {
  const router = useRouter();
  const { loading, goals, stickers, pocket, reload } = useGoals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [cumulative, setCumulative] = useState<number | undefined>(undefined);
  /** undefined = 아직 모름. 값을 읽기 전에 튜토리얼을 띄우지 않는다. */
  const [showTutorial, setShowTutorial] = useState<boolean | undefined>(undefined);
  /** 붙이기가 저장·다시 읽기까지 끝나기 전에는 다음 탭을 받지 않는다. 두 번 탭하면 두 장이 붙는다. */
  const [placeOnce] = useState(createSingleFlight);

  /**
   * 훅은 조건부 return보다 위에 전부 모은다. 아래 분기들은 렌더마다 다른 경로를 타므로
   * 훅이 하나라도 분기 아래에 있으면 호출 순서가 바뀌어 "Rendered more hooks" 오류가 난다.
   * 목표가 없을 때는 `current`가 null이다.
   */
  const current = goals.find((g) => g.id === selectedId) ?? goals[0] ?? null;
  const currentId = current?.id;

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  useEffect(() => {
    void (async () => setShowTutorial(!(await getFlag('tutorialDone'))))();
  }, []);

  useEffect(() => {
    // 목표를 빠르게 바꾸면 이전 요청이 나중에 도착해 값을 덮을 수 있다. alive로 막는다.
    let alive = true;
    void (async () => {
      const next = currentId ? await countStickers(currentId) : undefined;
      if (alive) setCumulative(next);
    })();
    return () => { alive = false; };
  }, [currentId, stickers.length]);

  if (loading) {
    return (
      <RetroScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={retro.color.ink} />
        </View>
      </RetroScreen>
    );
  }

  if (showTutorial) {
    return (
      <TutorialScreen
        onFinish={() => {
          setShowTutorial(false);
          void setFlag('tutorialDone', true);
        }}
      />
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

  // goals가 비어 있지 않으면 current는 항상 있다. 타입을 좁히기 위한 방어다.
  if (!current) return null;

  /** 저장이 끝난 뒤에만 햅틱과 화면 갱신을 한다. 실패하면 알린다 (PRD 7절). */
  async function place(slotIndex: number) {
    try {
      await placeSticker(current.id, slotIndex, current.defaultStickerId as never);
    } catch {
      Alert.alert('스티커를 붙이지 못했어요', '잠시 후 다시 시도해주세요.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await reload();
  }

  function openRecord(stickerId: string) {
    router.push({ pathname: '/sticker/[id]', params: { id: stickerId } });
  }

  /**
   * 적립판: 붙은 칸은 기록을 열고, 빈칸은 다음 빈칸일 때만 붙인다.
   * 칸 번호는 1부터, slotIndex는 0부터다.
   */
  async function onSlotPress(slotNumber: number) {
    const mine = stickers.filter((s) => s.goalId === current.id);
    const now = new Date();
    const placed = buildSlots(current, mine, now)[slotNumber - 1]?.sticker;
    if (placed) { openRecord(placed.id); return; }
    const next = nextSlotIndex(current, mine, now);
    if (next === null || slotNumber - 1 !== next) return;
    await place(next);
  }

  /** 달력판: 오늘 칸만 붙는다. 이미 있으면 기록 화면으로 간다. */
  async function onDateSelect(date: string) {
    const mine = await listStickers(current.id);
    const existing = mine.find((s) => localDateKey(s.placedAt) === date);
    if (existing) { openRecord(existing.id); return; }
    if (date !== localDateKey(Date.now())) return; // 과거 소급 금지 (PRD 4.3)
    await place(new Date().getDate() - 1);
  }

  return (
    <HomeScreen
      cumulative={cumulative}
      goals={pocket}
      selectedId={current.id}
      onSelectGoal={setSelectedId}
      onAdd={() => router.push('/goal/new')}
      onSettings={() =>
        router.push({ pathname: '/goal/[id]', params: { id: current.id } })
      }
      onSlotPress={(n) => { void placeOnce(() => onSlotPress(n)); }}
      year={year}
      month={month}
      onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
      onDateSelect={(d) => { void placeOnce(() => onDateSelect(d)); }}
    />
  );
}
