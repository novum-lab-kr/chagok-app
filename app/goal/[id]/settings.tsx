import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CompletedGoalSettingsScreen, GoalSettingsScreen, PixelLoadingIndicator, RetroScreen } from '../../../src/design-system';
import type { PocketStickerId } from '../../../src/design-system';
import {
  completeGoal, countGoalContents, deleteGoal, getGoal, settleExpiredPeriods, updateGoal,
} from '../../../src/repositories/goalRepository';
import { boardLabel, deleteDescription, longDate, periodLabel, safeStickerId } from '../../../src/app-data/pocketAdapter';
import { removeManagedRecordPhoto } from '../../../src/app-data/recordPhotos';
import { saveOrNotify, useDialog } from '../../../src/app-data/useDialog';
import { useUnsavedBack } from '../../../src/app-data/useUnsavedBack';
import { createSingleFlight } from '../../../src/app-data/singleFlight';
import { goBackOrHome } from '../../../src/app-data/goBack';
import { isCompleted, startDate } from '../../../src/domain/board';
import { localDateKey } from '../../../src/domain/dates';
import type { Goal } from '../../../src/domain/types';

/**
 * 목표 설정 (PRD 4.4). 진행 중: 이름 → 기본 스티커 → 기간(달력판) → [이 판 완성하기] → 저장 → [삭제하기].
 * 완성한 판: 읽기 전용 + 삭제만 (4.7).
 */
export default function GoalSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [name, setName] = useState('');
  const [sticker, setSticker] = useState<PocketStickerId>('sprout');
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  const [actOnce] = useState(createSingleFlight);
  const { ask, confirm, dialog: confirmDialog } = useDialog();

  useEffect(() => {
    let alive = true;
    void (async () => {
      await settleExpiredPeriods(new Date());
      const g = await getGoal(id);
      if (!alive) return;
      if (!g) { goBackOrHome(); return; }
      setGoal(g);
      setName(g.name);
      setSticker(safeStickerId(g.defaultStickerId));
      setEndDate(g.endDate ?? undefined);
    })();
    return () => { alive = false; };
  }, [id]);

  const dirty = goal !== null && !isCompleted(goal)
    && (name !== goal.name || sticker !== safeStickerId(goal.defaultStickerId) || (endDate ?? null) !== goal.endDate);
  const { goBack, dialog } = useUnsavedBack(dirty);

  if (!goal) {
    return (
      <RetroScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelLoadingIndicator label="불러오는 중" />
        </View>
      </RetroScreen>
    );
  }
  const current = goal;

  /** 저장 안 한 입력(이름·스티커·종료일)도 함께 저장한다. */
  const saveEdits = () => updateGoal(current.id, {
    name: name.trim(),
    defaultStickerId: sticker,
    ...(current.boardType === 'calendar' ? { endDate: endDate ?? null } : {}),
  });

  async function save() {
    if (await saveOrNotify(ask, '저장하지 못했어요', saveEdits)) goBackOrHome();
  }

  /** 기간 없는 달력판의 수동 완성 (PRD 4.3). 판 상세로 돌아가면 완성 흐름이 뜬다. */
  async function complete() {
    if (!(await confirm({
      title: '이 판을 완성할까요?',
      description: '완성하면 되돌릴 수 없고, 스티커를 붙이거나 기록을 고칠 수 없어요.',
      secondaryLabel: '취소',
      primaryLabel: '완성하기',
    }))) return;
    const ok = await saveOrNotify(ask, '완성하지 못했어요', async () => {
      await saveEdits();
      await completeGoal(current.id, Date.now());
    });
    if (ok) goBackOrHome();
  }

  /** 삭제 (PRD 4.4). 함께 지워질 수를 보여주고, DB 삭제가 끝난 뒤에 사진 파일을 지운다. */
  async function remove() {
    const counts = await countGoalContents(current.id);
    if (!(await confirm({
      title: '목표를 삭제할까요?',
      description: deleteDescription(counts),
      secondaryLabel: '취소',
      primaryLabel: '삭제하기',
    }))) return;
    let photos: string[] = [];
    const ok = await saveOrNotify(ask, '목표를 삭제하지 못했어요', async () => { photos = await deleteGoal(current.id); });
    if (!ok) return;
    for (const uri of photos) {
      try { removeManagedRecordPhoto(uri); } catch { /* 고아 파일로 남는다. 목표는 이미 지워졌다 */ }
    }
    router.dismissTo('/');
  }

  if (isCompleted(current)) {
    return (
      <>
        <CompletedGoalSettingsScreen
          name={current.name}
          sticker={safeStickerId(current.defaultStickerId)}
          boardLabel={boardLabel(current)}
          periodLabel={current.boardType === 'calendar' ? periodLabel(current) : undefined}
          completedLabel={longDate(localDateKey(current.completedAt!))}
          onDelete={() => { void actOnce(remove); }}
          onBack={goBackOrHome}
        />
        {confirmDialog}
      </>
    );
  }

  const calendar = current.boardType === 'calendar';
  return (
    <>
      <GoalSettingsScreen
        name={name}
        onChangeName={setName}
        sticker={sticker}
        onChangeSticker={setSticker}
        period={calendar ? {
          startDate: startDate(current),
          endDate,
          lastPlacedDate: current.lastPlacedAt !== null ? localDateKey(current.lastPlacedAt) : undefined,
          picking,
          onPick: () => setPicking((open) => !open),
          onChange: (date) => { setEndDate(date); setPicking(false); },
          onClear: () => { setEndDate(undefined); setPicking(false); },
        } : undefined}
        onComplete={calendar && !endDate ? () => { void actOnce(complete); } : undefined}
        saveDisabled={name.trim().length === 0}
        onSave={() => { void actOnce(save); }}
        onDelete={() => { void actOnce(remove); }}
        onBack={goBack}
      />
      {dialog}
      {confirmDialog}
    </>
  );
}
