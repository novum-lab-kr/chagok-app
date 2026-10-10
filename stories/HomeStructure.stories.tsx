import React, {useState, type ReactNode} from 'react';
import {View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {
  PixelDialog, PixelText, RecordScreen, calendarDateKey, retro, type GoalListTab, type PocketGoal, type StickerId,
  GoalListScreen, BoardDetailScreen, GoalSettingsScreen, CompletedGoalSettingsScreen, NewGoalScreen, ExtendEndDateScreen, ExtendSlotsScreen,
  FirstRunTutorialFrame, TutorialListExample, TutorialNewGoalExample, TutorialBoardExample, TutorialCompletedExample,
} from '../src/design-system';
import {ActionSymbol} from '../src/design-system/sticker-glyphs';
import {parseSlotCount} from '../src/domain/board';

/** 목록·판 상세·달력판 기간 규칙 시안. 화면 조합은 src/design-system/board-screens.tsx이고 앱과 같은 소스다. */
const meta = {
  title: 'Screens/Home structure · proposals',
  parameters: {layout: 'fullscreen', edgeToEdge: true, docs: {description: {component: '홈 목표 목록(A안·헤더 3)과 판 상세, 달력판 기간·완성 규칙 시안. 앱 동작에 연결되지 않습니다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const YEAR = 2026, MONTH = 9, TODAY = '2026-09-29';
const c = retro.color;
const range = (n: number) => Array.from({length: n}, (_, i) => i + 1);
const records = (month: number, list: number[], sticker: PocketGoal['sticker']) => Object.fromEntries(list.map(day => [calendarDateKey(YEAR, month, day), sticker]));

/**
 * 시작일은 만든 날(createdAt의 날짜)이다. 달력판만 종료일(endDate)을 선택으로 가진다.
 * completedAt은 완성한 시각. 적립판·기간 달력판은 조건을 만족한 시각, 기간 없는 달력판은 목표 설정에서 [완성]을 누른 시각.
 */
type ListedGoal = PocketGoal & {createdAt: string; lastPlacedAt?: string; endDate?: string; completedAt?: string};
const goals: ListedGoal[] = [
  {id: 'walk', name: '매일 저녁 동네 한 바퀴 걷기', kind: 'calendar', total: 30, sticker: 'basic.shoe', filled: [], calendarRecords: records(9, [2, 4, 7, 10, 14, 17, 20, 23, 28], 'basic.shoe'), createdAt: '2026-09-01T09:00', lastPlacedAt: '2026-09-28T21:10'},
  {id: 'reading', name: '책 읽기', kind: 'tally', total: 15, sticker: 'basic.sprout', filled: range(6), calendarRecords: {}, createdAt: '2026-08-20T10:00', lastPlacedAt: '2026-09-29T08:05'},
  {id: 'water', name: '물 여덟 잔 마시기', kind: 'calendar', total: 30, sticker: 'basic.flower', filled: [], calendarRecords: records(9, [10, 12, 15, 16, 19, 22, 25, 26, 29], 'basic.flower'), createdAt: '2026-09-10T22:00', lastPlacedAt: '2026-09-29T07:30', endDate: '2026-10-31'},
  {id: 'words', name: '영어 단어 외우기', kind: 'tally', total: 30, sticker: 'basic.book', filled: range(22), calendarRecords: {}, createdAt: '2026-08-10T19:00', lastPlacedAt: '2026-09-25T22:40'},
  {id: 'diary', name: '일기 쓰기', kind: 'calendar', total: 30, sticker: 'basic.cat', filled: [], calendarRecords: {}, createdAt: '2026-09-29T09:00'},
  {id: 'stretch', name: '자기 전 스트레칭 십 분', kind: 'tally', total: 20, sticker: 'basic.star', filled: range(20), calendarRecords: {}, createdAt: '2026-09-05T23:00', lastPlacedAt: '2026-09-29T08:30', completedAt: '2026-09-29T08:30'},
  {id: 'vitamin', name: '영양제 챙겨 먹기', kind: 'calendar', total: 30, sticker: 'basic.star', filled: [], calendarRecords: records(9, [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 19, 21, 22], 'basic.star'), createdAt: '2026-09-01T08:00', lastPlacedAt: '2026-09-22T08:10', endDate: '2026-09-23', completedAt: '2026-09-24T00:00'},
  {id: 'guitar', name: '기타 코드 연습', kind: 'calendar', total: 30, sticker: 'basic.book', filled: [], calendarRecords: records(9, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], 'basic.book'), createdAt: '2026-09-01T20:00', lastPlacedAt: '2026-09-20T20:50', completedAt: '2026-09-20T21:00'},
  {id: 'plank', name: '플랭크 1분 버티기', kind: 'tally', total: 15, sticker: 'basic.star', filled: range(15), calendarRecords: {}, createdAt: '2026-07-01T07:00', lastPlacedAt: '2026-08-14T07:20', completedAt: '2026-08-14T07:20'},
];
const byId = (id: string) => goals.find(goal => goal.id === id)!;
const noneCompleted = goals.filter(goal => !goal.completedAt);

// ── 규칙 ──────────────────────────────────────────────────────────
const dateOf = (iso: string) => iso.slice(0, 10);
const dayCount = (from: string, to: string) => Math.round((new Date(`${to}T00:00`).getTime() - new Date(`${from}T00:00`).getTime()) / 86400000) + 1;
const placed = (goal: ListedGoal) => goal.kind === 'tally' ? goal.filled.length : Object.keys(goal.calendarRecords).length;
/**
 * 진행: 적립판은 붙인 칸 / 칸 수, 기간 달력판은 붙인 날 / 만든 날부터 종료일까지의 날 수,
 * 기간 없는 달력판은 이번 달에 붙인 날 / 이번 달 날 수(완성했으면 완성한 달 기준). 모든 판이 %를 가진다.
 */
function progressOf(goal: ListedGoal) {
  let value = placed(goal), total = goal.total;
  if (goal.kind === 'calendar' && goal.endDate) total = dayCount(dateOf(goal.createdAt), goal.endDate);
  if (goal.kind === 'calendar' && !goal.endDate) {
    const month = (goal.completedAt ?? TODAY).slice(0, 7);
    value = Object.keys(goal.calendarRecords).filter(key => key.startsWith(month)).length;
    total = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  }
  return {value, total, percent: Math.floor(value / total * 100)};
}
/** 이번 달 기준으로 계산하는 판(종료일 없는 달력판)은 %앞에 기준 달을 붙여 전체 진행으로 오해하지 않게 한다. */
const percentLabel = (goal: ListedGoal) => {
  const {percent} = progressOf(goal);
  if (goal.kind !== 'calendar' || goal.endDate) return `${percent}%`;
  return goal.completedAt ? `${Number(goal.completedAt.slice(5, 7))}월 ${percent}%` : `이번 달 ${percent}%`;
};
/** 완성: 적립판 100%, 기간 달력판은 100%이거나 종료일이 지남, 기간 없는 달력판은 수동 [완성]. 예시 데이터는 completedAt으로 표시한다. */
const isDone = (goal: ListedGoal) => Boolean(goal.completedAt);
function orderGoals(list: readonly ListedGoal[]) {
  const recent = (goal: ListedGoal) => goal.lastPlacedAt ?? goal.createdAt;
  const active = list.filter(goal => !isDone(goal)).sort((a, b) => recent(b).localeCompare(recent(a)));
  const completed = list.filter(isDone).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  return {active, completed};
}
const shortDate = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;
const longDate = (key: string) => `${Number(key.slice(5, 7))}월 ${Number(key.slice(8, 10))}일`;
const kindLabel = (goal: ListedGoal) => goal.kind === 'tally' ? '적립판' : '달력판';
/** 이 판에서 날짜를 누를 수 있는 범위: 만든 날부터 종료일까지. */
const inPeriod = (goal: ListedGoal) => (date: string) => date >= dateOf(goal.createdAt) && (!goal.endDate || date <= goal.endDate);

// ── 공통 조각 ─────────────────────────────────────────────────────
function Stage({children}: {children: ReactNode}) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}>{children}</View>;
}
function Small({children, style}: {children: ReactNode; style?: object}) {
  return <PixelText variant="caption" style={[{color: c.buttonText}, style]}>{children}</PixelText>;
}
/** 화면 위에 띄우는 확인·선택 다이얼로그. 앱에서는 PixelDialogModal이 같은 배치를 한다. */
function Overlay(props: {title: string; description: string; primaryLabel: string; secondaryLabel: string}) {
  return <View style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20}}>
    <View style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.ink, opacity: retro.opacity.scrim}}/>
    <PixelDialog variant="basic" {...props}/>
  </View>;
}
const noop = () => {};

// ── 첫 실행 튜토리얼 ─────────────────────────────────────────────────
/** 튜토리얼은 열릴 때 첫 버튼에 포커스를 준다. Docs 한 페이지에 여러 개를 그리면 페이지 스크롤을 끌고 가므로 Docs에서는 끈다. */
function FirstRunTutorial({index, children, autoFocus = true}: {index: number; children: ReactNode; autoFocus?: boolean}) {
  const {width} = useWindowDimensions();
  return <FirstRunTutorialFrame index={index} autoFocus={autoFocus} onNext={noop} onSkip={noop} style={{width: Math.min(width, 390), height: 844}}>{children}</FirstRunTutorialFrame>;
}

// ── 목록 ──────────────────────────────────────────────────────────
const cardOf = (goal: ListedGoal) => ({id: goal.id, name: goal.name, sticker: goal.sticker, kind: kindLabel(goal), percent: progressOf(goal).percent,
  status: isDone(goal) ? [percentLabel(goal), `${shortDate(goal.completedAt!)} 완성`] : [`${percentLabel(goal)} 채웠어요`]});
/** 광고 자리: AdMob 배너가 들어갈 곳. 앱 밖에서 오는 그림이라 앱 팔레트를 쓰지 않는다(광고 위치 시안과 같은 회색 상자). */
function AdSlot() {
  return <View style={{height: 62, backgroundColor: '#f1f1f1', borderTopWidth: 1, borderColor: '#c9c9c9', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12}}>
    <View style={{width: 36, height: 36, backgroundColor: '#d9d9d9'}}/>
    <PixelText style={{fontFamily: 'system-ui', fontSize: 12, lineHeight: 16, color: '#3c3c3c'}}>{'광고 · 광고주 이름\n광고 문구가 여기에 들어갑니다'}</PixelText>
  </View>;
}
function Home({list, initialTab = 'active', ads = true}: {list: ListedGoal[]; initialTab?: GoalListTab; /** 광고 제거를 샀으면 false (PRD 4.12) */ads?: boolean}) {
  const [tab, setTab] = useState<GoalListTab>(initialTab);
  const {active, completed} = orderGoals(list);
  return <Stage><GoalListScreen tab={tab} onTab={setTab} onAdd={noop} onOpen={noop} onSettings={noop} active={active.map(cardOf)} completed={completed.map(cardOf)} footer={ads ? <AdSlot/> : undefined}/></Stage>;
}

// ── 상세 ──────────────────────────────────────────────────────────
const filledStickers = (goal: ListedGoal) => Object.fromEntries(goal.filled.map(n => [n, goal.sticker])) as Record<number, StickerId>;
/**
 * 판 조작: 빈칸 한 번 누름 = 붙이기, 붙인 칸 한 번 누름 = 기록 열기,
 * 붙인 칸 꾹 누름 = 떼기(사진·메모가 있으면 확인). 완성한 판도 같게 고친다 — 완성 표시는 그대로 (2026-10-08 변경).
 */
function Detail({goal, month = MONTH, overlay, recorded}: {goal: ListedGoal; month?: number; overlay?: ReactNode; /** 사진 또는 메모가 있는 칸 */recorded?: ReadonlySet<number>}) {
  const {value, total} = progressOf(goal), done = isDone(goal);
  const start = dateOf(goal.createdAt);
  const monthKey = `${YEAR}-${String(month).padStart(2, '0')}`;
  return <Stage><BoardDetailScreen name={goal.name} sticker={goal.sticker} completed={done} progress={{value, total, percentLabel: percentLabel(goal)}} onBack={noop} onSettings={noop}
    board={goal.kind === 'calendar'
      ? {kind: 'calendar', year: YEAR, month, records: goal.calendarRecords, selectedDate: done ? undefined : TODAY, onSelect: noop, onMonthChange: noop, onOpenRecord: noop,
        isDateEnabled: date => Boolean(goal.calendarRecords[date]) || inPeriod(goal)(date), canGoPrev: monthKey > start.slice(0, 7), canGoNext: !goal.endDate || monthKey < goal.endDate.slice(0, 7)}
      : {kind: 'tally', total: goal.total, filled: filledStickers(goal), recorded, onPress: noop, onOpenRecord: noop}}/>{overlay}</Stage>;
}
/** 완성한 판에서 연 기록. 완성한 판도 사진·메모를 고치고 스티커를 뗄 수 있다 (2026-10-08). */
function CompletedRecord() {
  const goal = byId('stretch');
  return <Stage><RecordScreen goal={goal} date="2026년 9월 12일" initialMemo="오늘은 허리까지 쭉 펴졌다." photoActionsInFrame
    photoPreview={<View style={{alignItems: 'center', gap: 8}}><ActionSymbol name="photo" size={40}/><Small>사진</Small></View>}
    onChoosePhoto={noop} onRemovePhoto={noop} onBack={noop} onSave={noop} onRemoveSticker={noop}/></Stage>;
}
/** 완료 다이얼로그에서 계속하기: 달력판은 종료일을 늘린다. 지난 날은 붙일 수 없으므로 오늘부터 고른다. */
function ExtendEndDate() {
  const goal = byId('vitamin');
  const [end, setEnd] = useState('2026-09-30');
  return <Stage><ExtendEndDateScreen name={goal.name} periodLabel={`${longDate(dateOf(goal.createdAt))} – ${longDate(goal.endDate!)}`} firstAllowed={TODAY} selected={end} onSelect={setEnd} onSubmit={noop} onBack={noop}/></Stage>;
}
/** 완료 다이얼로그에서 계속하기: 적립판은 칸을 더한다. 기본은 처음 만든 칸 수만큼, 상한 없음 (2026-09-30). */
function ExtendSlots() {
  const goal = byId('stretch');
  const [add, setAdd] = useState(String(goal.total));
  return <Stage><ExtendSlotsScreen name={goal.name} total={goal.total} add={add} onChangeAdd={setAdd} onSubmit={noop} onBack={noop}/></Stage>;
}

// ── 목표 설정 · 새 목표: 달력판 기간 ─────────────────────────────────
function GoalSettings({goal, picking: initialPicking = false, overlay}: {goal: ListedGoal; picking?: boolean; overlay?: ReactNode}) {
  const [end, setEnd] = useState(goal.endDate), [picking, setPicking] = useState(initialPicking);
  // 적립판 칸 수는 늘리기만 된다 (2026-09-30). 앱과 같은 검사 함수로 오류 문구를 보여준다.
  const [slotsText, setSlotsText] = useState(String(goal.total));
  const slots = goal.kind === 'tally' ? parseSlotCount(slotsText, goal.total) : null;
  return <Stage><GoalSettingsScreen name={goal.name} onChangeName={noop} sticker={goal.sticker} onChooseSticker={noop} onSave={noop} onDelete={noop} onBack={noop}
    slots={slots ? {current: goal.total, value: slotsText, onChange: setSlotsText, error: slots.ok ? undefined : slots.reason} : undefined}
    saveDisabled={slots !== null && !slots.ok}
    period={goal.kind === 'calendar' ? {startDate: dateOf(goal.createdAt), endDate: end, lastPlacedDate: goal.lastPlacedAt ? dateOf(goal.lastPlacedAt) : undefined, picking,
      onPick: () => setPicking(open => !open), onChange: date => {setEnd(date); setPicking(false);}, onClear: () => setEnd(undefined)} : undefined}
    onComplete={goal.kind === 'calendar' && !end ? noop : undefined}/>{overlay}</Stage>;
}
/** 완성한 판의 목표 설정. 내용은 읽기 전용이고 삭제만 할 수 있다. */
function CompletedSettings({goal, overlay}: {goal: ListedGoal; overlay?: ReactNode}) {
  return <Stage><CompletedGoalSettingsScreen name={goal.name} sticker={goal.sticker} completedLabel={longDate(dateOf(goal.completedAt!))} onDelete={noop} onBack={noop}
    boardLabel={goal.kind === 'tally' ? `적립판 · ${goal.total}칸` : '달력판'}
    periodLabel={goal.kind === 'calendar' ? (goal.endDate ? `${longDate(dateOf(goal.createdAt))} – ${longDate(goal.endDate)}` : `${longDate(dateOf(goal.createdAt))}부터`) : undefined}/>{overlay}</Stage>;
}
function NewCalendarGoal({withEnd}: {withEnd: boolean}) {
  const [mode, setMode] = useState<'none' | 'pick'>(withEnd ? 'pick' : 'none'), [end, setEnd] = useState<string | undefined>('2026-09-30');
  return <Stage><NewGoalScreen name="물 여덟 잔 마시기" onChangeName={noop} kind="calendar" onChangeKind={noop} count="15" onChangeCount={noop} sticker={byId('water').sticker} onChooseSticker={noop}
    endMode={mode} onChangeEndMode={setMode} endDate={end} onChangeEndDate={setEnd} today={TODAY} todayLabel={longDate(TODAY)} onSubmit={noop} onBack={noop}/></Stage>;
}

const almostDone: ListedGoal = {...byId('reading'), filled: range(14)};
const confirmLast = <Overlay title="이 판을 완성할까요?" description="마지막 칸이에요. 완성한 뒤에도 칸과 기록은 고칠 수 있어요." secondaryLabel="취소" primaryLabel="완성하기"/>;

export const HomeActive: Story = {name: '목록 · 내 목표', render: () => <Home list={goals}/>};
export const HomeAdFree: Story = {name: '목록 · 광고 제거를 산 뒤', render: () => <Home list={goals} ads={false}/>};
export const HomeCompleted: Story = {name: '목록 · 완성한 판', render: () => <Home list={goals} initialTab="completed"/>};
export const HomeEmptyCompleted: Story = {name: '목록 · 완성한 판 없음', render: () => <Home list={noneCompleted} initialTab="completed"/>};
export const DetailTally: Story = {name: '상세 · 적립판 진행중', render: () => <Detail goal={byId('reading')}/>};
export const DetailTallyLong: Story = {name: '상세 · 적립판 100칸 (빈칸으로 스크롤)', render: () => <Detail goal={{...byId('reading'), total: 100, filled: range(33)}}/>};
export const DetailPeriod: Story ={name: '상세 · 달력판 기간 진행중', render: () => <Detail goal={byId('water')}/>};
export const DetailOpenEnded: Story = {name: '상세 · 달력판 종료일 없음', render: () => <Detail goal={byId('walk')}/>};
export const RemoveWithRecord: Story = {name: '상세 · 기록 있는 스티커 떼기 확인', render: () => <Detail goal={byId('reading')} recorded={new Set([2, 5])} overlay={<Overlay title="스티커를 뗄까요?" description="이 칸의 사진·메모도 함께 사라져요." secondaryLabel="취소" primaryLabel="떼기"/>}/>};
export const FlowConfirmLast: Story = {name: '완성 흐름 1 · 마지막 칸 확인', render: () => <Detail goal={almostDone} overlay={confirmLast}/>};
const manualDone: ListedGoal = {...byId('walk'), completedAt: '2026-09-29T10:00'};
/** 완성 연출 뒤 다이얼로그. 버튼은 세 판 모두 「계속하기」이고, 무엇을 늘리는지는 설명 문장이 맡는다. */
function ContinueDialog({goal}: {goal: ListedGoal}) {
  const how = goal.kind === 'tally' ? '칸을 늘려' : goal.endDate ? '종료일을 늘려' : '완성을 풀고';
  const title = goal.kind === 'calendar' && goal.endDate ? '기간을 마쳤어요!' : '판을 완성했어요!';
  return <Detail goal={goal} overlay={<Overlay title={title} description={`${how} 이 판에 계속 붙일 수 있어요. 닫으면 완성한 판으로 보관돼요.`} secondaryLabel="닫기" primaryLabel="계속하기"/>}/>;
}
export const FlowContinueTally: Story = {name: '완성 흐름 2 · 계속하기 · 적립판', render: () => <ContinueDialog goal={byId('stretch')}/>};
export const FlowContinuePeriod: Story = {name: '완성 흐름 2 · 계속하기 · 종료일 지남', render: () => <ContinueDialog goal={byId('vitamin')}/>};
export const FlowContinueManual: Story = {name: '완성 흐름 2 · 계속하기 · 수동 완성', render: () => <ContinueDialog goal={manualDone}/>};
export const FlowExtendEndDate: Story = {name: '완성 흐름 3 · 달력판 종료일 늘리기', render: () => <ExtendEndDate/>};
export const FlowExtendSlots: Story = {name: '완성 흐름 3 · 적립판 칸 늘리기', render: () => <ExtendSlots/>};
export const DetailTallyDone: Story = {name: '완성한 판 · 적립판', render: () => <Detail goal={byId('stretch')}/>};
export const DetailPeriodEnded: Story = {name: '완성한 판 · 달력판 9월 23일 종료', render: () => <Detail goal={byId('vitamin')}/>};
export const RecordCompleted: Story = {name: '완성한 판 · 기록', render: () => <CompletedRecord/>};
export const SettingsCompleted: Story = {name: '완성한 판 · 목표 설정 (삭제만)', render: () => <CompletedSettings goal={byId('vitamin')}/>};
/** 삭제 확인. 지금 쓰는 basic 다이얼로그 그대로이며, 함께 지워지는 스티커·기록 수를 알린다 (PRD 4.4). */
const deleteConfirm = (stickers: number, notes: number) => <Overlay title="목표를 삭제할까요?" description={`붙인 스티커 ${stickers}개와 기록 ${notes}개가 함께 지워지고, 되돌릴 수 없어요.`} secondaryLabel="취소" primaryLabel="삭제하기"/>;
export const DeleteConfirmActive: Story = {name: '삭제 확인 · 진행 중인 목표', render: () => <GoalSettings goal={byId('reading')} overlay={deleteConfirm(6, 2)}/>};
export const DeleteConfirmCompleted: Story = {name: '삭제 확인 · 완성한 판', render: () => <CompletedSettings goal={byId('vitamin')} overlay={deleteConfirm(18, 4)}/>};
export const SettingsTally: Story = {name: '목표 설정 · 적립판', render: () => <GoalSettings goal={byId('reading')}/>};
/** 30칸으로 만든 판: 15·20은 비활성, 직접 입력은 30 이상만 받는다 (2026-09-30). */
export const SettingsTally30: Story = {name: '목표 설정 · 적립판 30칸 (늘리기만)', render: () => <GoalSettings goal={{...byId('reading'), total: 30}}/>};
export const SettingsPeriod: Story = {name: '목표 설정 · 종료일 바꾸기', render: () => <GoalSettings goal={byId('water')} picking/>};
export const SettingsOpenEnded: Story = {name: '목표 설정 · 종료일 없음과 완성', render: () => <GoalSettings goal={byId('walk')}/>};
export const SettingsManualConfirm: Story = {name: '목표 설정 · 수동 완성 확인', render: () => <GoalSettings goal={byId('walk')} overlay={<Overlay title="이 판을 완성할까요?" description="완성한 뒤에도 칸과 기록은 고칠 수 있어요. 계속하기로 다시 이어 쓸 수도 있어요." secondaryLabel="취소" primaryLabel="완성하기"/>}/>};
export const NewWithoutEnd: Story = {name: '새 목표 · 달력판 종료일 없음', render: () => <NewCalendarGoal withEnd={false}/>};
export const NewWithEnd: Story = {name: '새 목표 · 달력판 종료일 고르기', render: () => <NewCalendarGoal withEnd/>};
export const Tutorial1: Story = {name: '첫 실행 튜토리얼 1 · 목표 만들기', render: (_, {viewMode}) => <FirstRunTutorial index={0} autoFocus={viewMode !== 'docs'}><TutorialListExample/></FirstRunTutorial>};
export const Tutorial2: Story = {name: '첫 실행 튜토리얼 2 · 스티커 고르기', render: (_, {viewMode}) => <FirstRunTutorial index={1} autoFocus={viewMode !== 'docs'}><TutorialNewGoalExample/></FirstRunTutorial>};
export const Tutorial3: Story = {name: '첫 실행 튜토리얼 3 · 빈칸에 톡', render: (_, {viewMode}) => <FirstRunTutorial index={2} autoFocus={viewMode !== 'docs'}><TutorialBoardExample/></FirstRunTutorial>};
export const Tutorial4: Story = {name: '첫 실행 튜토리얼 4 · 기록 남기기', render: (_, {viewMode}) => <FirstRunTutorial index={3} autoFocus={viewMode !== 'docs'}><TutorialBoardExample/></FirstRunTutorial>};
export const Tutorial5: Story = {name: '첫 실행 튜토리얼 5 · 완성한 판', render: (_, {viewMode}) => <FirstRunTutorial index={4} autoFocus={viewMode !== 'docs'}><TutorialCompletedExample/></FirstRunTutorial>};
