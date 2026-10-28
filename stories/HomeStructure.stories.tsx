import React, {useState, type ReactNode} from 'react';
import {View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {
  BoardDetailScreen, CompletedGoalSettingsScreen, ExtendEndDateScreen, ExtendSlotsScreen, GoalSettingsScreen, NewGoalScreen, PixelText, RecordScreen, retro,
  FirstRunTutorialFrame, TutorialListExample, TutorialNewGoalExample, TutorialBoardExample, TutorialCompletedExample,
} from '../src/design-system';
import {ActionSymbol} from '../src/design-system/sticker-glyphs';
import {boardLabel, longDate, periodLabel, toPocketGoal} from '../src/app-data/pocketAdapter';
import {defaultExtraSlots, extendEndDateFloor, parseSlotCount, startDate} from '../src/domain/board';
import {localDateKey} from '../src/domain/dates';
import type {Goal, Sticker} from '../src/domain/types';
import {NOW, TODAY, boardOf, goals, slots, stickersOf, type GoalKey} from './support/goals';
import {Stage, noop} from './support/frame';

/**
 * 판 상세·목표 설정·완성 흐름·첫 실행 튜토리얼. 화면 조합은 src/design-system/board-screens.tsx이고 앱과 같은 소스다.
 * 예시 값은 stories/support/goals.ts에서 앱과 같은 함수로 만든다. 목표 목록은 Screens/Bottom Tabs,
 * 화면 위 확인 창 문구는 Components/Dialog 「문구 모음」에 있다.
 */
const meta = {
  title: 'Screens/Board & goal',
  parameters: {layout: 'fullscreen', edgeToEdge: true, docs: {description: {component: '판 상세, 목표 설정·새 목표, 달력판 기간·완성 흐름, 첫 실행 튜토리얼. 목표 목록은 Screens/Bottom Tabs, 확인 창 문구는 Components/Dialog에 있다. 앱 동작에 연결되지 않습니다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const c = retro.color;

// ── 판 상세 ──────────────────────────────────────────────────────
/**
 * 판 조작: 빈칸 한 번 누름 = 붙이기, 붙인 칸 한 번 누름 = 기록 열기,
 * 붙인 칸 꾹 누름 = 떼기(사진·메모가 있으면 확인). 완성한 판도 같게 고친다 — 완성 표시는 그대로 (2026-10-08 변경).
 */
function Detail({goal, stickers, recorded}: {goal: Goal; stickers: readonly Sticker[]; recorded?: ReadonlySet<number>}) {
  return <Stage><BoardDetailScreen {...boardOf(goal, stickers, {recorded})} onBack={noop} onSettings={noop}/></Stage>;
}
const detail = (key: GoalKey, recorded?: ReadonlySet<number>) => <Detail goal={goals[key]} stickers={stickersOf[key]} recorded={recorded}/>;

/** 완성한 판에서 연 기록. 완성한 판도 사진·메모를 고치고 스티커를 뗄 수 있다 (2026-10-08). */
function CompletedRecord() {
  return <Stage><RecordScreen goal={toPocketGoal(goals.stretch, stickersOf.stretch)} date="2026년 9월 12일" initialMemo="오늘은 허리까지 쭉 펴졌다." photoActionsInFrame
    photoPreview={<View style={{alignItems: 'center', gap: 8}}><ActionSymbol name="photo" size={40}/><PixelText variant="caption" style={{color: c.buttonText}}>사진</PixelText></View>}
    onChoosePhoto={noop} onTakePhoto={noop} onRemovePhoto={noop} onBack={noop} onSave={noop} onRemoveSticker={noop}/></Stage>;
}
/** 완성 뒤 계속하기: 달력판은 종료일을 늘린다. 지난 날은 붙일 수 없으므로 오늘부터 고른다. */
function ExtendEndDate() {
  const goal = goals.vitamin;
  const [end, setEnd] = useState<string | undefined>('2026-09-30');
  return <Stage><ExtendEndDateScreen name={goal.name} periodLabel={periodLabel(goal)} firstAllowed={extendEndDateFloor(goal, NOW)} selected={end} onSelect={setEnd} onSubmit={noop} onBack={noop}/></Stage>;
}
/** 완성 뒤 계속하기: 적립판은 칸을 더한다. 기본은 처음 만든 칸 수만큼, 상한 없음 (2026-09-30). */
function ExtendSlots() {
  const goal = goals.stretch;
  const [add, setAdd] = useState(String(defaultExtraSlots(goal)));
  return <Stage><ExtendSlotsScreen name={goal.name} total={goal.totalSlots ?? 0} add={add} onChangeAdd={setAdd} onSubmit={noop} onBack={noop}/></Stage>;
}

// ── 목표 설정 · 새 목표 ─────────────────────────────────────────
/** 앱 app/goal/[id]/settings.tsx와 같은 값. 적립판 칸 수는 늘리기만 되고, 앱과 같은 검사 함수로 오류 문구를 보여준다. */
function GoalSettings({goal, picking: initialPicking = false}: {goal: Goal; picking?: boolean}) {
  const [end, setEnd] = useState(goal.endDate ?? undefined), [picking, setPicking] = useState(initialPicking);
  const total = goal.totalSlots ?? 0;
  const [slotsText, setSlotsText] = useState(String(total));
  const parsed = goal.boardType === 'tally' ? parseSlotCount(slotsText, total) : null;
  return <Stage><GoalSettingsScreen name={goal.name} onChangeName={noop} sticker={toPocketGoal(goal, []).sticker} onChooseSticker={noop} onSave={noop} onDelete={noop} onBack={noop}
    slots={parsed ? {current: total, value: slotsText, onChange: setSlotsText, error: parsed.ok ? undefined : parsed.reason} : undefined}
    saveDisabled={parsed !== null && !parsed.ok}
    period={goal.boardType === 'calendar' ? {startDate: startDate(goal), endDate: end, lastPlacedDate: goal.lastPlacedAt !== null ? localDateKey(goal.lastPlacedAt) : undefined, picking,
      onPick: () => setPicking(open => !open), onChange: date => {setEnd(date); setPicking(false);}, onClear: () => {setEnd(undefined); setPicking(false);}} : undefined}
    onComplete={goal.boardType === 'calendar' && !end ? noop : undefined}/></Stage>;
}
/** 완성한 판의 목표 설정. 내용은 읽기 전용이고 삭제만 할 수 있다. */
function CompletedSettings({goal}: {goal: Goal}) {
  return <Stage><CompletedGoalSettingsScreen name={goal.name} sticker={toPocketGoal(goal, []).sticker} completedLabel={longDate(localDateKey(goal.completedAt!))} onDelete={noop} onBack={noop}
    boardLabel={boardLabel(goal)} periodLabel={goal.boardType === 'calendar' ? periodLabel(goal) : undefined}/></Stage>;
}
function NewCalendarGoal({withEnd}: {withEnd: boolean}) {
  const [mode, setMode] = useState<'none' | 'pick'>(withEnd ? 'pick' : 'none'), [end, setEnd] = useState<string | undefined>('2026-09-30');
  return <Stage><NewGoalScreen name="물 여덟 잔 마시기" onChangeName={noop} kind="calendar" onChangeKind={noop} count="15" onChangeCount={noop} sticker="basic.flower" onChooseSticker={noop}
    endMode={mode} onChangeEndMode={setMode} endDate={end} onChangeEndDate={setEnd} today={TODAY} todayLabel={longDate(TODAY)} onSubmit={noop} onBack={noop}/></Stage>;
}

// ── 첫 실행 튜토리얼 ─────────────────────────────────────────────
/** 튜토리얼은 열릴 때 첫 버튼에 포커스를 준다. Docs 한 페이지에 여러 개를 그리면 페이지 스크롤을 끌고 가므로 Docs에서는 끈다. */
function FirstRunTutorial({index, children, autoFocus = true}: {index: number; children: ReactNode; autoFocus?: boolean}) {
  const {width} = useWindowDimensions();
  return <FirstRunTutorialFrame index={index} autoFocus={autoFocus} onNext={noop} onPrev={noop} onSkip={noop} style={{width: Math.min(width, 390), height: 844}}>{children}</FirstRunTutorialFrame>;
}

const longTally: Goal = {...goals.reading, totalSlots: 100};

/** 2·5번 칸에 사진·메모가 있다(오른쪽 위 표식). */
export const DetailTally: Story = {name: '상세 · 적립판 진행중', render: () => detail('reading', new Set([2, 5]))};
export const DetailTallyLong: Story = {name: '상세 · 적립판 100칸 (빈칸으로 스크롤)', render: () => <Detail goal={longTally} stickers={slots(longTally, 33)}/>};
export const DetailPeriod: Story = {name: '상세 · 달력판 기간 진행중', render: () => detail('water')};
export const DetailOpenEnded: Story = {name: '상세 · 달력판 종료일 없음', render: () => detail('walk')};
export const FlowExtendEndDate: Story = {name: '완성 흐름 · 달력판 종료일 늘리기', render: () => <ExtendEndDate/>};
export const FlowExtendSlots: Story = {name: '완성 흐름 · 적립판 칸 늘리기', render: () => <ExtendSlots/>};
export const DetailTallyDone: Story = {name: '완성한 판 · 적립판', render: () => detail('stretch')};
export const DetailPeriodEnded: Story = {name: '완성한 판 · 달력판 9월 23일 종료', render: () => detail('vitamin')};
export const RecordCompleted: Story = {name: '완성한 판 · 기록', render: () => <CompletedRecord/>};
export const SettingsCompleted: Story = {name: '완성한 판 · 목표 설정 (삭제만)', render: () => <CompletedSettings goal={goals.vitamin}/>};
export const SettingsTally: Story = {name: '목표 설정 · 적립판', render: () => <GoalSettings goal={goals.reading}/>};
/** 30칸으로 만든 판: 15·20은 비활성, 직접 입력은 30 이상만 받는다 (2026-09-30). */
export const SettingsTally30: Story = {name: '목표 설정 · 적립판 30칸 (늘리기만)', render: () => <GoalSettings goal={{...goals.reading, totalSlots: 30}}/>};
export const SettingsPeriod: Story = {name: '목표 설정 · 종료일 바꾸기', render: () => <GoalSettings goal={goals.water} picking/>};
export const SettingsOpenEnded: Story = {name: '목표 설정 · 종료일 없음과 완성', render: () => <GoalSettings goal={goals.walk}/>};
export const NewWithoutEnd: Story = {name: '새 목표 · 달력판 종료일 없음', render: () => <NewCalendarGoal withEnd={false}/>};
export const NewWithEnd: Story = {name: '새 목표 · 달력판 종료일 고르기', render: () => <NewCalendarGoal withEnd/>};
export const Tutorial1: Story = {name: '첫 실행 튜토리얼 1 · 목표 만들기', render: (_, {viewMode}) => <FirstRunTutorial index={0} autoFocus={viewMode !== 'docs'}><TutorialListExample/></FirstRunTutorial>};
export const Tutorial2: Story = {name: '첫 실행 튜토리얼 2 · 스티커 고르기', render: (_, {viewMode}) => <FirstRunTutorial index={1} autoFocus={viewMode !== 'docs'}><TutorialNewGoalExample/></FirstRunTutorial>};
export const Tutorial3: Story = {name: '첫 실행 튜토리얼 3 · 빈칸에 톡', render: (_, {viewMode}) => <FirstRunTutorial index={2} autoFocus={viewMode !== 'docs'}><TutorialBoardExample/></FirstRunTutorial>};
export const Tutorial4: Story = {name: '첫 실행 튜토리얼 4 · 기록 남기기', render: (_, {viewMode}) => <FirstRunTutorial index={3} autoFocus={viewMode !== 'docs'}><TutorialBoardExample/></FirstRunTutorial>};
export const Tutorial5: Story = {name: '첫 실행 튜토리얼 5 · 완성한 판', render: (_, {viewMode}) => <FirstRunTutorial index={4} autoFocus={viewMode !== 'docs'}><TutorialCompletedExample/></FirstRunTutorial>};
