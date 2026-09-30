import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ExtendEndDateScreen, ExtendSlotsScreen, PixelLoadingIndicator, RetroScreen } from '../../../src/design-system';
import { extendEndDate, extendSlots, getGoal } from '../../../src/repositories/goalRepository';
import { periodLabel } from '../../../src/app-data/pocketAdapter';
import { saveOrNotify, useDialog } from '../../../src/app-data/useDialog';
import { createSingleFlight } from '../../../src/app-data/singleFlight';
import { goBackOrHome } from '../../../src/app-data/goBack';
import { defaultExtraSlots, extendEndDateFloor, isCompleted } from '../../../src/domain/board';
import type { Goal } from '../../../src/domain/types';

/**
 * 완성 다이얼로그의 계속하기 (PRD 4.7). 적립판은 칸을 더하고(기본 = 처음 만든 칸 수, 상한 없음),
 * 기간 달력판은 종료일을 늘린다. 저장하면 진행 중으로 돌아가 판 상세로 돌아간다.
 */
export default function ExtendBoard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [add, setAdd] = useState('');
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [submitOnce] = useState(createSingleFlight);
  const { ask, dialog } = useDialog();

  useEffect(() => {
    let alive = true;
    void (async () => {
      const g = await getGoal(id);
      if (!alive) return;
      // 완성한 판에서만 늘린다. 링크로 잘못 들어오면 돌아간다.
      if (!g || !isCompleted(g) || (g.boardType === 'calendar' && !g.endDate)) { goBackOrHome(); return; }
      setGoal(g);
      setAdd(String(defaultExtraSlots(g)));
    })();
    return () => { alive = false; };
  }, [id]);

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

  async function submit(task: () => Promise<void>) {
    if (await saveOrNotify(ask, '늘리지 못했어요', task)) goBackOrHome();
  }

  return (
    <>
      {current.boardType === 'tally'
        ? <ExtendSlotsScreen name={current.name} total={current.totalSlots ?? 0} add={add} onChangeAdd={setAdd} onBack={goBackOrHome}
          onSubmit={() => { void submitOnce(() => submit(() => extendSlots(current.id, Number(add)))); }}/>
        : <ExtendEndDateScreen name={current.name} periodLabel={periodLabel(current)} firstAllowed={extendEndDateFloor(current, new Date())} selected={endDate} onSelect={setEndDate} onBack={goBackOrHome}
          onSubmit={() => { if (endDate) void submitOnce(() => submit(() => extendEndDate(current.id, endDate))); }}/>}
      {dialog}
    </>
  );
}
