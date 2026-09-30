import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GoalEditorScreen, RetroScreen, PixelText } from '../../src/design-system';
import type { GoalDraft, PocketGoal } from '../../src/design-system';
import { getGoal, updateGoal } from '../../src/repositories/goalRepository';
import { listStickers } from '../../src/repositories/stickerRepository';
import { toPocketGoal } from '../../src/app-data/pocketAdapter';

export default function GoalSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<PocketGoal | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const g = await getGoal(id);
      if (!g) { router.back(); return; }
      setGoal(toPocketGoal(g, await listStickers(g.id)));
    })();
  }, [id, router]);

  if (!goal) return (
    <RetroScreen>
      <PixelText>불러오는 중</PixelText>
    </RetroScreen>
  );

  /**
   * 이름과 기본 스티커만 바꾼다. 판 종류·칸 수 변경은 미확정이라 건드리지 않고,
   * 이미 붙은 스티커의 종류도 그대로 둔다 (PRD 4.4).
   */
  async function submit(draft: GoalDraft) {
    try {
      await updateGoal(id, { name: draft.name.trim(), defaultStickerId: draft.sticker });
    } catch {
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해주세요. 입력한 내용은 그대로 있어요.');
      return;
    }
    router.back();
  }

  return (
    <GoalEditorScreen
      mode="settings"
      initialGoal={goal}
      onBack={() => router.back()}
      onSubmit={(d) => { void submit(d); }}
    />
  );
}
