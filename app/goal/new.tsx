import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { NewGoalScreen } from '../../src/design-system';
import type { BoardKind, EndDateMode, StickerId } from '../../src/design-system';
import { createGoal } from '../../src/repositories/goalRepository';
import { useUnsavedBack } from '../../src/app-data/useUnsavedBack';
import { saveOrNotify, useDialog } from '../../src/app-data/useDialog';
import { createSingleFlight } from '../../src/app-data/singleFlight';
import { longDate } from '../../src/app-data/pocketAdapter';
import { localDateKey } from '../../src/domain/dates';
import { takeOfferedSticker } from '../../src/app-data/stickerChoice';
import { GOAL_NAME_MAX, shownGoalNameError } from '../../src/domain/board';

const DEFAULT_COUNT = '15';

/** 새 목표 (PRD 4.4). 만들면 그 판을 연다. 칸 수는 1 이상이고 상한이 없다 (2026-09-30). */
export default function NewGoal() {
  const router = useRouter();
  const [name, setName] = useState('');
  /** 이름을 썼다가 지웠거나 칸에서 비운 채 나왔으면 빈 이름 문구를 보인다 (2026-10-08). */
  const [nameTouched, setNameTouched] = useState(false);
  const [kind, setKind] = useState<BoardKind>('tally');
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [sticker, setSticker] = useState<StickerId>('basic.sprout');
  const [endMode, setEndMode] = useState<EndDateMode>('none');
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [submitOnce] = useState(createSingleFlight);
  const { ask, dialog: failure } = useDialog();

  const dirty = name !== '' || kind !== 'tally' || count !== DEFAULT_COUNT || sticker !== 'basic.sprout' || endMode !== 'none';
  const { goBack, dialog } = useUnsavedBack(dirty);
  // 「기본 스티커」에서 고르고 돌아오면 받는다 (PRD 4.12).
  useFocusEffect(useCallback(() => {
    const picked = takeOfferedSticker();
    if (picked) setSticker(picked);
  }, []));

  // 렌더 중에 시계를 읽지 않는다. 이 화면에 있는 동안의 오늘이다.
  const [today] = useState(() => localDateKey(Date.now()));
  const countValid = /^\d+$/.test(count) && Number(count) > 0;
  const endValid = kind === 'tally' || endMode === 'none' || endDate !== undefined;
  const valid = name.trim().length > 0 && (kind === 'calendar' || countValid) && endValid;

  /** 저장이 끝난 뒤에 판을 연다. 실패하면 화면을 그대로 두어 입력을 잃지 않는다 (PRD 7절). */
  async function submit() {
    let createdId = '';
    const ok = await saveOrNotify(ask, '목표를 만들지 못했어요', async () => {
      const created = await createGoal({
        name: name.trim(),
        boardType: kind,
        totalSlots: kind === 'tally' ? Number(count) : null,
        defaultStickerId: sticker,
        endDate: kind === 'calendar' && endMode === 'pick' ? endDate ?? null : null,
      });
      createdId = created.id;
    });
    if (ok) router.replace({ pathname: '/goal/[id]', params: { id: createdId } });
  }

  return (
    <>
      <NewGoalScreen
        name={name}
        onChangeName={(next) => { setName(next); if (next !== '') setNameTouched(true); }}
        nameMaxLength={GOAL_NAME_MAX}
        nameError={shownGoalNameError(name, nameTouched)}
        onNameBlur={() => setNameTouched(true)}
        kind={kind} onChangeKind={setKind}
        count={count} onChangeCount={setCount}
        sticker={sticker} onChangeSticker={setSticker}
        onChooseSticker={() => router.push({ pathname: '/stickers/choose', params: { current: sticker } })}
        endMode={endMode} onChangeEndMode={setEndMode}
        endDate={endDate} onChangeEndDate={setEndDate}
        today={today} todayLabel={longDate(today)}
        error={kind === 'tally' && !countValid && name.trim().length > 0 ? '칸 수를 1 이상으로 입력해주세요.' : undefined}
        submitDisabled={!valid}
        onSubmit={() => { void submitOnce(submit); }}
        onBack={goBack}
      />
      {dialog}
      {failure}
    </>
  );
}
