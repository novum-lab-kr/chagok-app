import React, {useRef, useState, type ReactNode} from 'react';
import {Pressable, View, useWindowDimensions, type LayoutRectangle} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {
  PixelButton, PixelDialog, PixelIcon, PixelInput, PixelPanel, PixelText, RetroScreen, ScreenHeader, StickerGrid, CalendarBoard, GoalStickerCell,
  BoardTypePicker, StickerSummary, RecordScreen, ShortNotice, CompletionSticker, AppHeader, GoalListHeader, GoalSummaryCard, BoardProgressRow,
  EmptyState, OptionButtons, EndDatePicker, PeriodField, DeleteSection, PixelFrame, calendarDateKey, stickerLabel, retro, type GoalListTab, type PocketGoal,
} from '../src/design-system';
import {ActionSymbol} from '../src/design-system/sticker-glyphs';
import {TutorialSpotlight} from '../src/design-system/tutorial';

/** Review-only compositions for the goal list, board detail and calendar period rules. */
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
  {id: 'walk', name: '매일 저녁 동네 한 바퀴 걷기', kind: 'calendar', total: 30, sticker: 'shoe', filled: [], calendarRecords: records(9, [2, 4, 7, 10, 14, 17, 20, 23, 28], 'shoe'), createdAt: '2026-09-01T09:00', lastPlacedAt: '2026-09-28T21:10'},
  {id: 'reading', name: '책 읽기', kind: 'tally', total: 15, sticker: 'sprout', filled: range(6), calendarRecords: {}, createdAt: '2026-08-20T10:00', lastPlacedAt: '2026-09-29T08:05'},
  {id: 'water', name: '물 여덟 잔 마시기', kind: 'calendar', total: 30, sticker: 'flower', filled: [], calendarRecords: records(9, [10, 12, 15, 16, 19, 22, 25, 26, 29], 'flower'), createdAt: '2026-09-10T22:00', lastPlacedAt: '2026-09-29T07:30', endDate: '2026-10-31'},
  {id: 'words', name: '영어 단어 외우기', kind: 'tally', total: 30, sticker: 'book', filled: range(22), calendarRecords: {}, createdAt: '2026-08-10T19:00', lastPlacedAt: '2026-09-25T22:40'},
  {id: 'diary', name: '일기 쓰기', kind: 'calendar', total: 30, sticker: 'cat', filled: [], calendarRecords: {}, createdAt: '2026-09-29T09:00'},
  {id: 'stretch', name: '자기 전 스트레칭 십 분', kind: 'tally', total: 20, sticker: 'star', filled: range(20), calendarRecords: {}, createdAt: '2026-09-05T23:00', lastPlacedAt: '2026-09-29T08:30', completedAt: '2026-09-29T08:30'},
  {id: 'vitamin', name: '영양제 챙겨 먹기', kind: 'calendar', total: 30, sticker: 'star', filled: [], calendarRecords: records(9, [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 19, 21, 22], 'star'), createdAt: '2026-09-01T08:00', lastPlacedAt: '2026-09-22T08:10', endDate: '2026-09-23', completedAt: '2026-09-24T00:00'},
  {id: 'guitar', name: '기타 코드 연습', kind: 'calendar', total: 30, sticker: 'book', filled: [], calendarRecords: records(9, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], 'book'), createdAt: '2026-09-01T20:00', lastPlacedAt: '2026-09-20T20:50', completedAt: '2026-09-20T21:00'},
  {id: 'plank', name: '플랭크 1분 버티기', kind: 'tally', total: 15, sticker: 'star', filled: range(15), calendarRecords: {}, createdAt: '2026-07-01T07:00', lastPlacedAt: '2026-08-14T07:20', completedAt: '2026-08-14T07:20'},
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

// ── 첫 실행 튜토리얼: 화면 속 대상 하나를 재서 스포트라이트를 씌운다 ────────────
type SpotName = 'add' | 'sticker' | 'slot' | 'record' | 'done';
const SpotContext = React.createContext<{name: SpotName; root: React.RefObject<View | null>; set: (rect: LayoutRectangle) => void} | null>(null);
/** 지금 단계의 대상이면 자기 위치를 튜토리얼 루트 기준으로 알린다. 아니면 그냥 감싸기만 한다. */
function SpotTarget({name, fill = false, children}: {name: SpotName; fill?: boolean; children: ReactNode}) {
  const spot = React.useContext(SpotContext), self = useRef<View>(null);
  const measure = () => {if (spot?.name === name) self.current?.measureInWindow((x, y, width, height) => spot.root.current?.measureInWindow((rx, ry) => spot.set({x: x - rx, y: y - ry, width, height})));};
  return <View ref={self} onLayout={measure} style={fill ? {width: '100%', height: '100%'} : undefined}>{children}</View>;
}
/** SpotTarget으로 감쌀 수 없는 디자인 시스템 컴포넌트 안쪽 대상은 ref로 받아 그린 뒤에 잰다. */
function useSpotRef(name: SpotName) {
  const spot = React.useContext(SpotContext), self = useRef<View>(null);
  React.useEffect(() => {
    if (spot?.name !== name) return;
    const id = setTimeout(() => self.current?.measureInWindow((x, y, width, height) => spot.root.current?.measureInWindow((rx, ry) => spot.set({x: x - rx, y: y - ry, width, height}))), 50);
    return () => clearTimeout(id);
  }, [spot, name]);
  return self;
}
const tutorialSteps: {name: SpotName; title: string; description: string}[] = [
  {name: 'add', title: '목표 만들기', description: '＋를 눌러 목표를 만들어요'},
  {name: 'sticker', title: '스티커 고르기', description: '목표마다 스티커를 정해요'},
  {name: 'slot', title: '빈칸에 톡!', description: '어느 빈칸이든 누르면 스티커가 붙어요. 다시 누르면 떼져요'},
  {name: 'record', title: '기록 남기기', description: '붙인 스티커를 두 번 누르거나 꾹 누르면 사진과 메모를 남길 수 있어요'},
  {name: 'done', title: '완성한 판', description: '판을 다 채우면 완성! 완성한 판은 고칠 수 없고, 붙인 칸을 두 번 누르거나 꾹 누르면 기록을 볼 수 있어요'},
];
const noop = () => {};
/** 튜토리얼은 열릴 때 첫 버튼에 포커스를 준다. Docs 한 페이지에 여러 개를 그리면 페이지 스크롤을 끌고 가므로 Docs에서는 끈다. */
function FirstRunTutorial({index, children, autoFocus = true}: {index: number; children: ReactNode; autoFocus?: boolean}) {
  const {width} = useWindowDimensions();
  const root = useRef<View>(null);
  const [target, setTarget] = useState<LayoutRectangle>();
  const step = tutorialSteps[index], last = index === tutorialSteps.length - 1;
  const frame = {width: Math.min(width, 390), height: 844};
  // 같은 좌표면 상태를 바꾸지 않고, context 값도 단계가 바뀔 때만 새로 만든다. 그러지 않으면 측정 → 렌더 → 측정이 끝없이 돈다.
  const set = React.useCallback((rect: LayoutRectangle) => setTarget(previous => previous && previous.x === rect.x && previous.y === rect.y && previous.width === rect.width && previous.height === rect.height ? previous : rect), []);
  const spot = React.useMemo(() => ({name: step.name, root, set}), [step.name, set]);
  return <SpotContext.Provider value={spot}>
    <View ref={root} style={frame}>
      <View pointerEvents="none" style={{flex: 1}}>{children}</View>
      {target && <TutorialSpotlight autoFocus={autoFocus} step={index === 0 ? 1 : 3} highlightFrame={index === 0 || last} target={target} width={frame.width} height={frame.height} onNext={noop} onSkip={noop}
        content={{step: `${index + 1} / ${tutorialSteps.length}`, title: step.title, description: step.description, primaryLabel: last ? '시작하기' : '다음', secondaryLabel: '건너뛰기'}}/>}
    </View>
  </SpotContext.Provider>;
}

// ── 목록 ──────────────────────────────────────────────────────────
function Home({list, initialTab = 'active'}: {list: ListedGoal[]; initialTab?: GoalListTab}) {
  const [tab, setTab] = useState<GoalListTab>(initialTab);
  const add = useSpotRef('add');
  const {active, completed} = orderGoals(list);
  const shown = tab === 'active' ? active : completed;
  return <Stage><RetroScreen style={{gap: 16}}>
    <AppHeader onSettings={() => {}}/>
    <GoalListHeader tab={tab} onTab={setTab} onAdd={() => {}} addTargetRef={add} counts={{active: active.length, completed: completed.length}}/>
    {shown.length ? <View style={{gap: 12}}>{shown.map(goal => <GoalSummaryCard key={goal.id} name={goal.name} sticker={goal.sticker} kind={kindLabel(goal)} percent={progressOf(goal).percent}
      status={isDone(goal) ? [percentLabel(goal), `${shortDate(goal.completedAt!)} 완성`] : [`${percentLabel(goal)} 진행중`]}/>)}</View>
      : tab === 'completed' && <EmptyState title="아직 완성한 판이 없어요" description="판을 다 채우거나 달력판을 완성하면 여기에 모여요."/>}
  </RetroScreen></Stage>;
}

// ── 상세 ──────────────────────────────────────────────────────────
/**
 * 판 조작: 빈칸 한 번 누름 = 붙이기, 붙인 칸 한 번 누름 = 떼기(사진·메모가 있으면 확인),
 * 붙인 칸 두 번 누름 또는 꾹 누름 = 기록 열기. 완성한 판은 readonly라 기록 열기만 된다.
 */
function Detail({goal, month = MONTH, overlay, recorded}: {goal: ListedGoal; month?: number; overlay?: ReactNode; /** 사진 또는 메모가 있는 칸 */recorded?: ReadonlySet<number>}) {
  const {value, total} = progressOf(goal), done = isDone(goal);
  const doneRef = useSpotRef('done');
  const next = range(goal.total).find(n => !goal.filled.includes(n));
  const start = dateOf(goal.createdAt);
  const monthKey = `${YEAR}-${String(month).padStart(2, '0')}`;
  return <Stage><RetroScreen style={{gap: 12}}>
    <ScreenHeader title={done ? '완성한 판' : '내 목표'} onBack={() => {}}/>
    <PixelPanel title={goal.name} action={<Pressable accessibilityRole="button" accessibilityLabel="목표 설정" style={{width: 40, height: 40, alignItems: 'center', justifyContent: 'center'}}><PixelIcon name="gear" size={36}/></Pressable>}>
      <BoardProgressRow value={value} total={total} percentLabel={percentLabel(goal)} completed={done} sticker={goal.sticker} completionTargetRef={doneRef}/>
      <View style={{height: retro.layout.progressGridGap}}/>
      {goal.kind === 'calendar'
        ? <CalendarBoard year={YEAR} month={month} records={goal.calendarRecords} selectedDate={done ? undefined : TODAY} onSelect={() => {}} onMonthChange={() => {}}
          isDateEnabled={done ? date => Boolean(goal.calendarRecords[date]) : inPeriod(goal)} canGoPrev={monthKey > start.slice(0, 7)} canGoNext={!goal.endDate || monthKey < goal.endDate.slice(0, 7)}/>
        : <StickerGrid>{range(goal.total).map(n => {const filled = goal.filled.includes(n); const cell = <GoalStickerCell key={n} number={n} sticker={goal.sticker} state={filled ? 'filled' : !done && n === next ? 'available' : 'empty'} enabled={filled || !done} hasRecord={recorded?.has(n)} onPress={() => {}}/>;
          if (!done && n === next) return <SpotTarget key={n} name="slot" fill>{cell}</SpotTarget>;
          return filled && n === goal.filled.length ? <SpotTarget key={n} name="record" fill>{cell}</SpotTarget> : cell;})}</StickerGrid>}
    </PixelPanel>
  </RetroScreen>{overlay}</Stage>;
}
/** 완성한 판의 기록 보기. 사진·메모를 보여주기만 하고 저장·떼기 동작은 두지 않는다. */
function ReadonlyRecord() {
  const goal = byId('stretch');
  return <Stage><RecordScreen readonly goal={goal} date="2026년 9월 12일" initialMemo="오늘은 허리까지 쭉 펴졌다." photoActionsInFrame
    photoPreview={<View style={{alignItems: 'center', gap: 8}}><ActionSymbol name="photo" size={40}/><Small>사진</Small></View>}
    onChoosePhoto={() => {}} onRemovePhoto={() => {}} onBack={() => {}} onSave={() => {}} onRemoveSticker={() => {}}/></Stage>;
}
/** 완료 다이얼로그에서 계속하기: 달력판은 종료일을 늘린다. 지난 날은 붙일 수 없으므로 오늘부터 고른다. */
function ExtendEndDate() {
  const goal = byId('vitamin');
  const [end, setEnd] = useState('2026-09-30');
  return <Stage><RetroScreen style={{gap: 16}}>
    <ScreenHeader title="종료일 늘리기" onBack={() => {}}/>
    <PixelFrame variant="input" fill={c.secondary} contentStyle={{padding: 16, gap: 6}}>
      <PixelText variant="title" style={{fontSize: 22, lineHeight: 30}}>{goal.name}</PixelText>
      <Small>{longDate(dateOf(goal.createdAt))} – {longDate(goal.endDate!)} · 붙인 스티커와 기록은 그대로예요.</Small>
    </PixelFrame>
    <EndDatePicker firstAllowed={TODAY} selected={end} onSelect={setEnd} hint="새 종료일을 골라 주세요. 지난 날은 붙일 수 없어서 오늘부터 고를 수 있어요."/>
    <PixelButton label="종료일 늘리기" onPress={() => {}}/>
  </RetroScreen></Stage>;
}

// ── 목표 설정 · 새 목표: 달력판 기간 ─────────────────────────────────
function StickerField({goal}: {goal: ListedGoal}) {
  return <View style={{gap: 8}}><PixelText>기본 스티커</PixelText><SpotTarget name="sticker"><StickerSummary value={goal.sticker} onChange={() => {}}/></SpotTarget></View>;
}
function GoalSettings({goal, picking: initialPicking = false, overlay}: {goal: ListedGoal; picking?: boolean; overlay?: ReactNode}) {
  const [end, setEnd] = useState(goal.endDate), [picking, setPicking] = useState(initialPicking);
  return <Stage><RetroScreen style={{gap: 16}}>
    <ScreenHeader title="목표 설정" onBack={() => {}}/>
    <PixelInput label="목표 이름" value={goal.name} onChangeText={() => {}}/>
    <StickerField goal={goal}/>
    {goal.kind === 'calendar' && <PeriodField startDate={dateOf(goal.createdAt)} endDate={end} lastPlacedDate={goal.lastPlacedAt ? dateOf(goal.lastPlacedAt) : undefined} picking={picking}
      onPick={() => setPicking(open => !open)} onChange={date => {setEnd(date); setPicking(false);}} onClear={() => setEnd(undefined)}/>}
    {goal.kind === 'calendar' && !end && <View style={{gap: 8}}><Small>종료일이 없는 달력판은 여기서 완성해요. 완성하면 되돌릴 수 없어요.</Small><PixelButton label="이 판 완성하기" variant="secondary" icon={<ActionSymbol name="check" size={16}/>} onPress={() => {}}/></View>}
    <PixelButton label="저장하기" onPress={() => {}}/>
    <DeleteSection onDelete={() => {}}/>
  </RetroScreen>{overlay}</Stage>;
}
/** 완성한 판의 목표 설정. 내용은 읽기 전용이고 삭제만 할 수 있다. */
function CompletedSettings({goal, overlay}: {goal: ListedGoal; overlay?: ReactNode}) {
  const row = (label: string, value: string) => <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderBottomWidth: retro.shape.cellBorder, borderColor: c.ink}}><PixelText style={{width: 108}}>{label}</PixelText><PixelText style={{flex: 1}}>{value}</PixelText></View>;
  return <Stage><RetroScreen style={{gap: 16}}>
    <ScreenHeader title="목표 설정" onBack={() => {}}/>
    <ShortNotice emphasis title="완성한 판은 고칠 수 없어요" detail={`${longDate(dateOf(goal.completedAt!))}에 완성했어요. 기록은 볼 수 있고, 목표는 삭제만 할 수 있어요.`}/>
    <View>
      {/* 정보 블록 오른쪽에 스티커를 붙이듯 비스듬히 올린다. 값 글자와 겹치지 않도록 짧은 값이 오는 줄 위에 둔다. */}
      <View pointerEvents="none" style={{position: 'absolute', right: 0, top: 50, zIndex: 1}}><CompletionSticker sticker={goal.sticker} tilted/></View>
      {row('목표 이름', goal.name)}
      {row('기본 스티커', stickerLabel(goal.sticker))}
      {row('판 종류', goal.kind === 'tally' ? `적립판 · ${goal.total}칸` : '달력판')}
      {goal.kind === 'calendar' && row('기간', goal.endDate ? `${longDate(dateOf(goal.createdAt))} – ${longDate(goal.endDate)}` : `${longDate(dateOf(goal.createdAt))}부터`)}
    </View>
    <DeleteSection onDelete={() => {}}/>
  </RetroScreen>{overlay}</Stage>;
}
function NewCalendarGoal({withEnd}: {withEnd: boolean}) {
  const [mode, setMode] = useState<'none' | 'pick'>(withEnd ? 'pick' : 'none'), [end, setEnd] = useState<string | undefined>('2026-09-30');
  return <Stage><RetroScreen style={{gap: 16}}>
    <ScreenHeader title="새 목표" onBack={() => {}}/>
    <PixelInput label="목표 이름" value="물 여덟 잔 마시기" onChangeText={() => {}}/>
    <BoardTypePicker value="calendar" onChange={() => {}}/>
    <StickerField goal={byId('water')}/>
    <View style={{gap: 8}}>
      <PixelText>종료일 (선택)</PixelText>
      <OptionButtons options={[{key: 'none', label: '정하지 않기'}, {key: 'pick', label: '날짜 고르기'}] as const} value={mode} onChange={setMode}/>
      <Small>{mode === 'pick' ? '종료일이 지나면 완성한 판으로 옮겨요.' : '종료일 없이 계속 붙여요. 완성은 목표 설정에서 할 수 있어요.'}</Small>
      {mode === 'pick' && <EndDatePicker firstAllowed={TODAY} selected={end} onSelect={setEnd} hint={`시작일은 오늘(${longDate(TODAY)})이에요.`}/>}
    </View>
    <PixelButton label="만들기" onPress={() => {}}/>
  </RetroScreen></Stage>;
}

const almostDone: ListedGoal = {...byId('reading'), filled: range(14)};
const confirmLast = <Overlay title="이 판을 완성할까요?" description="마지막 칸이에요. 완성하면 스티커를 붙이거나 떼고, 기록을 고칠 수 없어요." secondaryLabel="취소" primaryLabel="완성하기"/>;

export const HomeActive: Story = {name: '목록 · 내 목표', render: () => <Home list={goals}/>};
export const HomeCompleted: Story = {name: '목록 · 완성한 판', render: () => <Home list={goals} initialTab="completed"/>};
export const HomeEmptyCompleted: Story = {name: '목록 · 완성한 판 없음', render: () => <Home list={noneCompleted} initialTab="completed"/>};
export const DetailTally: Story = {name: '상세 · 적립판 진행중', render: () => <Detail goal={byId('reading')}/>};
export const DetailPeriod: Story = {name: '상세 · 달력판 기간 진행중', render: () => <Detail goal={byId('water')}/>};
export const DetailOpenEnded: Story = {name: '상세 · 달력판 종료일 없음', render: () => <Detail goal={byId('walk')}/>};
export const RemoveWithRecord: Story = {name: '상세 · 기록 있는 스티커 떼기 확인', render: () => <Detail goal={byId('reading')} recorded={new Set([2, 5])} overlay={<Overlay title="스티커를 뗄까요?" description="이 칸의 사진·메모도 함께 사라져요." secondaryLabel="취소" primaryLabel="떼기"/>}/>};
export const FlowConfirmLast: Story = {name: '완성 흐름 1 · 마지막 칸 확인', render: () => <Detail goal={almostDone} overlay={confirmLast}/>};
const manualDone: ListedGoal = {...byId('walk'), completedAt: '2026-09-29T10:00'};
/** 완성 연출 뒤 다이얼로그. 버튼은 세 판 모두 「계속하기」이고, 무엇을 늘리는지는 설명 문장이 맡는다. */
function ContinueDialog({goal}: {goal: ListedGoal}) {
  const how = goal.kind === 'tally' ? '칸을 늘려' : goal.endDate ? '종료일을 늘려' : '완성을 풀고';
  const title = goal.kind === 'calendar' && goal.endDate ? '기간을 마쳤어요!' : '판을 완성했어요!';
  return <Detail goal={goal} overlay={<Overlay title={title} description={`${how} 이 판에 계속 붙일 수 있어요. 닫으면 완성한 판으로 보관되고 더 고칠 수 없어요.`} secondaryLabel="닫기" primaryLabel="계속하기"/>}/>;
}
export const FlowContinueTally: Story = {name: '완성 흐름 2 · 계속하기 · 적립판', render: () => <ContinueDialog goal={byId('stretch')}/>};
export const FlowContinuePeriod: Story = {name: '완성 흐름 2 · 계속하기 · 종료일 지남', render: () => <ContinueDialog goal={byId('vitamin')}/>};
export const FlowContinueManual: Story = {name: '완성 흐름 2 · 계속하기 · 수동 완성', render: () => <ContinueDialog goal={manualDone}/>};
export const FlowExtendEndDate: Story = {name: '완성 흐름 3 · 달력판 종료일 늘리기', render: () => <ExtendEndDate/>};
export const DetailTallyDone: Story = {name: '완성한 판 · 적립판', render: () => <Detail goal={byId('stretch')}/>};
export const DetailPeriodEnded: Story = {name: '완성한 판 · 달력판 9월 23일 종료', render: () => <Detail goal={byId('vitamin')}/>};
export const RecordReadonly: Story = {name: '완성한 판 · 기록 보기', render: () => <ReadonlyRecord/>};
export const SettingsCompleted: Story = {name: '완성한 판 · 목표 설정 (삭제만)', render: () => <CompletedSettings goal={byId('vitamin')}/>};
/** 삭제 확인. 지금 쓰는 basic 다이얼로그 그대로이며, 함께 지워지는 스티커·기록 수를 알린다 (PRD 4.4). */
const deleteConfirm = (stickers: number, notes: number) => <Overlay title="목표를 삭제할까요?" description={`붙인 스티커 ${stickers}개와 기록 ${notes}개가 함께 지워지고, 되돌릴 수 없어요.`} secondaryLabel="취소" primaryLabel="삭제하기"/>;
export const DeleteConfirmActive: Story = {name: '삭제 확인 · 진행 중인 목표', render: () => <GoalSettings goal={byId('reading')} overlay={deleteConfirm(6, 2)}/>};
export const DeleteConfirmCompleted: Story = {name: '삭제 확인 · 완성한 판', render: () => <CompletedSettings goal={byId('vitamin')} overlay={deleteConfirm(18, 4)}/>};
export const SettingsTally: Story = {name: '목표 설정 · 적립판', render: () => <GoalSettings goal={byId('reading')}/>};
export const SettingsPeriod: Story = {name: '목표 설정 · 종료일 바꾸기', render: () => <GoalSettings goal={byId('water')} picking/>};
export const SettingsOpenEnded: Story = {name: '목표 설정 · 종료일 없음과 완성', render: () => <GoalSettings goal={byId('walk')}/>};
export const SettingsManualConfirm: Story = {name: '목표 설정 · 수동 완성 확인', render: () => <GoalSettings goal={byId('walk')} overlay={<Overlay title="이 판을 완성할까요?" description="완성하면 되돌릴 수 없고, 스티커를 붙이거나 기록을 고칠 수 없어요." secondaryLabel="취소" primaryLabel="완성하기"/>}/>};
export const NewWithoutEnd: Story = {name: '새 목표 · 달력판 종료일 없음', render: () => <NewCalendarGoal withEnd={false}/>};
export const NewWithEnd: Story = {name: '새 목표 · 달력판 종료일 고르기', render: () => <NewCalendarGoal withEnd/>};
export const Tutorial1: Story = {name: '첫 실행 튜토리얼 1 · 목표 만들기', render: (_, {viewMode}) => <FirstRunTutorial index={0} autoFocus={viewMode !== 'docs'}><Home list={[byId('reading'), byId('walk')]}/></FirstRunTutorial>};
export const Tutorial2: Story = {name: '첫 실행 튜토리얼 2 · 스티커 고르기', render: (_, {viewMode}) => <FirstRunTutorial index={1} autoFocus={viewMode !== 'docs'}><NewCalendarGoal withEnd={false}/></FirstRunTutorial>};
export const Tutorial3: Story = {name: '첫 실행 튜토리얼 3 · 빈칸에 톡', render: (_, {viewMode}) => <FirstRunTutorial index={2} autoFocus={viewMode !== 'docs'}><Detail goal={byId('reading')}/></FirstRunTutorial>};
export const Tutorial4: Story = {name: '첫 실행 튜토리얼 4 · 기록 남기기', render: (_, {viewMode}) => <FirstRunTutorial index={3} autoFocus={viewMode !== 'docs'}><Detail goal={byId('reading')}/></FirstRunTutorial>};
export const Tutorial5: Story = {name: '첫 실행 튜토리얼 5 · 완성한 판', render: (_, {viewMode}) => <FirstRunTutorial index={4} autoFocus={viewMode !== 'docs'}><Detail goal={byId('stretch')}/></FirstRunTutorial>};
