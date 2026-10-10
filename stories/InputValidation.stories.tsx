import React, {useState, type ReactNode} from 'react';
import {View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {ExtendSlotsScreen, GoalSettingsScreen, NewGoalScreen, PixelText, RecordScreen, type PocketGoal} from '../src/design-system';
import {ActionSymbol} from '../src/design-system/sticker-glyphs';
import {GOAL_NAME_MAX, MEMO_MAX, goalNameError, memoError, parseSlotCount} from '../src/domain/board';

/**
 * 입력 검사: 입력칸마다 상태별 화면. 문구는 앱과 같은 src/domain/board.ts 함수에서 나온다.
 * 한눈에 보는 판은 Flows/입력 검사 (stories/flows/input-flow.json).
 */
const meta = {
  title: 'Rules/입력 검사',
  parameters: {layout: 'fullscreen', edgeToEdge: true, docs: {description: {component: '목표 이름 20자 · 메모 500자 · 칸 수 검사 문구 (2026-10-08). 입력칸에 직접 써 보면 문구가 바뀝니다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};
const NAME_20 = '매일 아침 일어나서 물 한 잔 마시기';
const MEMO_500 = '오늘은 아침 일찍 일어나서 공원을 한 바퀴 천천히 걸었다. 바람이 시원해서 기분이 좋았다. '.repeat(20).slice(0, MEMO_MAX);
const reading: PocketGoal = {id: 'reading', name: '책 읽기', kind: 'tally', total: 15, sticker: 'basic.sprout', filled: [1, 2, 3, 4, 5, 6], calendarRecords: {}};

function Stage({children}: {children: ReactNode}) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}>{children}</View>;
}

// ── 목표 이름 ─────────────────────────────────────────────────────
function NewGoal({initialName, initialCount = '15'}: {initialName: string; initialCount?: string}) {
  const [name, setName] = useState(initialName), [count, setCount] = useState(initialCount);
  const countValid = /^\d+$/.test(count) && Number(count) > 0;
  return <Stage><NewGoalScreen name={name} onChangeName={setName} nameMaxLength={GOAL_NAME_MAX} nameError={goalNameError(name)}
    kind="tally" onChangeKind={noop} count={count} onChangeCount={setCount} sticker={reading.sticker} onChooseSticker={noop}
    endMode="none" onChangeEndMode={noop} onChangeEndDate={noop} today="2026-10-08" todayLabel="10월 8일"
    // 앱(app/goal/new.tsx)과 같은 조건: 이름이 있을 때만 칸 수 문구를 보인다.
    error={!countValid && name.trim().length > 0 ? '칸 수를 1 이상으로 입력해주세요.' : undefined}
    submitDisabled={!countValid || name.trim().length === 0} onSubmit={noop} onBack={noop}/></Stage>;
}
function GoalSettings({initialName = reading.name, initialSlots = String(reading.total)}: {initialName?: string; initialSlots?: string}) {
  const [name, setName] = useState(initialName), [slotsText, setSlotsText] = useState(initialSlots);
  const slots = parseSlotCount(slotsText, reading.total);
  return <Stage><GoalSettingsScreen name={name} onChangeName={setName} nameMaxLength={GOAL_NAME_MAX} nameError={goalNameError(name)}
    sticker={reading.sticker} onChooseSticker={noop}
    slots={{current: reading.total, value: slotsText, onChange: setSlotsText, error: slots.ok ? undefined : slots.reason}}
    saveDisabled={name.trim().length === 0 || !slots.ok} onSave={noop} onDelete={noop} onBack={noop}/></Stage>;
}
export const NameNewTyping: Story = {name: '목표 이름 · 새 목표 · 쓰는 중', render: () => <NewGoal initialName="책 읽기"/>};
export const NameNewFull: Story = {name: '목표 이름 · 새 목표 · 20자', render: () => <NewGoal initialName={NAME_20}/>};
export const NameNewBlank: Story = {name: '목표 이름 · 새 목표 · 비움', render: () => <NewGoal initialName="   "/>};
export const NameSettingsFull: Story = {name: '목표 이름 · 목표 설정 · 20자', render: () => <GoalSettings initialName={NAME_20}/>};
export const NameSettingsBlank: Story = {name: '목표 이름 · 목표 설정 · 비움', render: () => <GoalSettings initialName=""/>};

// ── 메모 ──────────────────────────────────────────────────────────
function Record({initialMemo}: {initialMemo: string}) {
  const [memo, setMemo] = useState(initialMemo);
  return <Stage><RecordScreen goal={reading} date="2026년 10월 8일" initialMemo={initialMemo} onMemoChange={setMemo} memoMaxLength={MEMO_MAX} memoError={memoError(memo)}
    photoPreview={<View style={{alignItems: 'center', gap: 8}}><ActionSymbol name="photo" size={40}/><PixelText variant="caption">사진</PixelText></View>}
    onChoosePhoto={noop} onRemovePhoto={noop} onBack={noop} onSave={noop} onRemoveSticker={noop}/></Stage>;
}
export const MemoTyping: Story = {name: '메모 · 쓰는 중', render: () => <Record initialMemo="열 페이지만 읽으려다가 한 챕터를 다 읽었다."/>};
export const MemoFull: Story = {name: '메모 · 500자', render: () => <Record initialMemo={MEMO_500}/>};

// ── 칸 수 ─────────────────────────────────────────────────────────
export const SlotsNewEmpty: Story = {name: '칸 수 · 새 목표 · 비움', render: () => <NewGoal initialName="책 읽기" initialCount=""/>};
export const SlotsNewZero: Story = {name: '칸 수 · 새 목표 · 0', render: () => <NewGoal initialName="책 읽기" initialCount="0"/>};
export const SlotsSettingsEmpty: Story = {name: '칸 수 · 목표 설정 · 비움', render: () => <GoalSettings initialSlots=""/>};
export const SlotsSettingsNotNumber: Story = {name: '칸 수 · 목표 설정 · 숫자 아님', render: () => <GoalSettings initialSlots="1.5"/>};
export const SlotsSettingsZero: Story = {name: '칸 수 · 목표 설정 · 0', render: () => <GoalSettings initialSlots="0"/>};
export const SlotsSettingsFewer: Story = {name: '칸 수 · 목표 설정 · 지금보다 적음', render: () => <GoalSettings initialSlots="10"/>};
function Extend({initialAdd}: {initialAdd: string}) {
  const [add, setAdd] = useState(initialAdd);
  return <Stage><ExtendSlotsScreen name={reading.name} total={reading.total} add={add} onChangeAdd={setAdd} onSubmit={noop} onBack={noop}/></Stage>;
}
export const ExtendTyping: Story = {name: '칸 수 · 칸 늘리기 · 쓰는 중', render: () => <Extend initialAdd="15"/>};
export const ExtendEmpty: Story = {name: '칸 수 · 칸 늘리기 · 비움', render: () => <Extend initialAdd=""/>};
