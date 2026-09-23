import { useRouter } from 'expo-router';
import { GoalEditorScreen } from '../../src/design-system';
import type { GoalDraft } from '../../src/design-system';
import { createGoal } from '../../src/repositories/goalRepository';

export default function NewGoal() {
  const router = useRouter();

  async function submit(draft: GoalDraft) {
    await createGoal({
      name: draft.name.trim(),
      boardType: draft.kind,
      totalSlots: draft.kind === 'tally' ? draft.total : null,
      defaultStickerId: draft.sticker,
    });
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
