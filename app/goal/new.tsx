import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GoalEditorScreen } from '../../src/design-system';
import type { GoalDraft } from '../../src/design-system';
import { createGoal } from '../../src/repositories/goalRepository';

export default function NewGoal() {
  const router = useRouter();

  /** 저장이 끝난 뒤에 닫는다. 실패하면 화면을 그대로 두어 입력을 잃지 않는다 (PRD 7절). */
  async function submit(draft: GoalDraft) {
    try {
      await createGoal({
        name: draft.name.trim(),
        boardType: draft.kind,
        totalSlots: draft.kind === 'tally' ? draft.total : null,
        defaultStickerId: draft.sticker,
      });
    } catch {
      Alert.alert('목표를 만들지 못했어요', '잠시 후 다시 시도해주세요. 입력한 내용은 그대로 있어요.');
      return;
    }
    router.back();
  }

  return (
    <GoalEditorScreen
      mode="create"
      onBack={() => router.back()}
      onSubmit={(d) => { void submit(d); }}
    />
  );
}
