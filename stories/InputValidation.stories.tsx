import React, {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {ExtendSlotsScreen, GoalSettingsScreen, InviteJoinScreen, MemberList, NewGoalScreen, RecordScreen, TogetherGoalScreen, TogetherSettingsScreen, type BoardKind, type FriendBoard, type PocketGoal, type StickerId, type TogetherMode} from '../src/design-system';
import {GOAL_NAME_MAX, MEMBER_NAME_MAX, MEMO_MAX, goalNameError, memberNameError, memoError, parseSlotCount, shownMemberNameError, SHARED_SLOTS_MAX} from '../src/domain/board';
import {t} from '../src/i18n';
import {Stage, noop} from './support/frame';

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

const NAME_20 = '매일 아침 일어나서 물 한 잔 마시기';
const MEMO_500 = '오늘은 아침 일찍 일어나서 공원을 한 바퀴 천천히 걸었다. 바람이 시원해서 기분이 좋았다. '.repeat(20).slice(0, MEMO_MAX);
const reading: PocketGoal = {id: 'reading', name: '책 읽기', kind: 'tally', total: 15, sticker: 'basic.sprout', filled: [1, 2, 3, 4, 5, 6], calendarRecords: {}};

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
/** 앱 app/sticker/[id].tsx와 같은 값. 사진 없이 메모만 쓰는 기록이라 사진 칸 안에 앨범·카메라 버튼이 보인다. */
function Record({initialMemo}: {initialMemo: string}) {
  const [memo, setMemo] = useState(initialMemo);
  return <Stage><RecordScreen goal={reading} date="2026년 10월 8일" initialMemo={initialMemo} onMemoChange={setMemo} memoMaxLength={MEMO_MAX} memoError={memoError(memo)}
    photoActionsInFrame onChoosePhoto={noop} onTakePhoto={noop} onRemovePhoto={noop} onBack={noop} onSave={noop} onRemoveSticker={noop}/></Stage>;
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

// ── 함께 목표 (PRD 4.15, 2026-11-04) ─────────────────────────────────
// 내 이름은 1~10자(memberNameError). 금칙어와 스티커 겹침은 서버가 거르고, 앱은 받은 문구를 그 칸 아래에 그대로 보인다.
const tally = (filled: number): FriendBoard => ({kind: 'tally', total: 30, filled: new Set(Array.from({length: filled}, (_, i) => i + 1))});
/** 앱 app/invite/[code].tsx와 같은 값. serverError는 서버 응답(금칙어)이 왔을 때 */
function Join({initialName, touched = false, serverError, sticker = 'basic.sprout', stickerError}: {initialName: string; touched?: boolean; serverError?: string; sticker?: StickerId; stickerError?: string}) {
  const [name, setName] = useState(initialName), [edited, setEdited] = useState(touched);
  const nameError = name === initialName && serverError ? serverError : shownMemberNameError(name, edited);
  return <Stage><InviteJoinScreen goalName="11월 만 보 걷기" kind="tally" total={30} ownerName="은주"
    members={[{id: 'eunju', name: '은주', sticker: 'basic.shoe', board: tally(11)}, {id: 'jiwoo', name: '지우', sticker: 'basic.flower', board: tally(18)}]}
    myName={name} onChangeMyName={value => {setName(value); setEdited(true);}} myNameMaxLength={MEMBER_NAME_MAX} myNameError={nameError}
    sticker={sticker} onChooseSticker={noop} stickerError={stickerError} onJoin={noop} joinDisabled={name.trim() === ''} onBack={noop}/></Stage>;
}
/** 앱 app/goal/together.tsx와 같은 값 */
function Together({initialName, initialCount = '30'}: {initialName: string; initialCount?: string}) {
  const [mode, setMode] = useState<TogetherMode>('each'), [name, setName] = useState(initialName), [kind, setKind] = useState<BoardKind>('tally'), [count, setCount] = useState(initialCount);
  const [myName, setMyName] = useState('은주');
  // 함께 목표의 적립판은 1000칸까지(서버 private.check_slots와 같은 값). 문구는 화면 아래 문구 자리에 보인다
  const slots = parseSlotCount(count, 1, SHARED_SLOTS_MAX);
  return <Stage><TogetherGoalScreen mode={mode} onChangeMode={setMode} name={name} onChangeName={setName} nameMaxLength={GOAL_NAME_MAX} nameError={goalNameError(name)}
    kind={kind} onChangeKind={setKind} count={count} onChangeCount={setCount} myName={myName} onChangeMyName={setMyName} myNameMaxLength={MEMBER_NAME_MAX} myNameError={memberNameError(myName)}
    sticker="basic.shoe" onChooseSticker={noop} maxFriends={6} error={kind === 'tally' && !slots.ok ? slots.reason : undefined} onSubmit={noop} onBack={noop}/></Stage>;
}
/** 앱 app/goal/[id]/settings.tsx(함께 목표, 만든 사람)와 같은 값: 칸 수는 지금보다 많고 1000칸까지 */
function TogetherSettings({initialSlots}: {initialSlots: string}) {
  const [name, setName] = useState('11월 만 보 걷기'), [slots, setSlots] = useState(initialSlots);
  const parsed = parseSlotCount(slots, 30, SHARED_SLOTS_MAX);
  return <Stage auto><TogetherSettingsScreen role="owner" mode="each" goalName={name} onChangeGoalName={setName} goalNameMaxLength={GOAL_NAME_MAX} goalNameError={goalNameError(name)}
    slots={{current: 30, value: slots, onChange: setSlots, error: parsed.ok ? undefined : parsed.reason}} ownerName="은주"
    myName="은주" onChangeMyName={noop} myNameMaxLength={MEMBER_NAME_MAX} myNameError={memberNameError('은주')} sticker="basic.shoe" onChooseSticker={noop}
    members={<MemberList members={[{id: 'me', name: '은주', sticker: 'basic.shoe', me: true, owner: true}]} max={6}/>}
    onSave={noop} saveDisabled={!parsed.ok} onReport={noop} onBlock={noop} onLeave={noop} onDelete={noop} onBack={noop}/></Stage>;
}
export const MemberNameTyping: Story = {name: '내 이름, 함께하기, 쓰는 중', render: () => <Join initialName="소라"/>};
export const MemberNameFull: Story = {name: '내 이름, 함께하기, 10자', render: () => <Join initialName="산책하는 은주 언니"/>};
export const MemberNameBlank: Story = {name: '내 이름, 함께하기, 비움', render: () => <Join initialName="" touched/>};
export const MemberNameBanned: Story = {name: '내 이름, 함께하기, 금칙어 (서버)', render: () => <Join initialName="바보" serverError={t('validation.nameNotAllowed')}/>};
export const StickerTaken: Story = {name: '내 스티커, 함께하기, 이미 쓰는 스티커 (서버)', render: () => <Join initialName="소라" sticker="basic.flower" stickerError={t('validation.stickerTaken')}/>};
export const NameTogetherFull: Story = {name: '목표 이름, 친구와 함께, 20자', render: () => <Together initialName={NAME_20}/>};
export const SlotsTogetherMax: Story = {name: '칸 수, 친구와 함께, 1000칸 넘음', render: () => <Together initialName="11월 만 보 걷기" initialCount="1001"/>};
export const SlotsTogetherSettingsMax: Story = {name: '칸 수, 함께 목표 설정, 1000칸 넘음', render: () => <TogetherSettings initialSlots="1001"/>};
