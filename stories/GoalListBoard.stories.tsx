import React, {useState} from 'react';
import {View} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {
  AppHeader, BoardProgressRow, CalendarBoard, CompletionSticker, DeleteSection, EmptyState, EndDatePicker, GoalListHeader,
  GoalStickerCell, GoalSummaryCard, OptionButtons, PeriodField, PixelBadge, PixelTabs, PixelText, RecordScreen, ShortNotice,
  StickerGrid, badgeTones, exampleGoals, retro, type GoalListTab,
} from '../src/design-system';

/** 2026-09-29 홈 목록·판 상세 시안에서 추출한 공통 컴포넌트. 화면 조합은 `Screens / Home structure · proposals`. */
const meta = {
  title: 'Components/Goal list & board',
  decorators: [Story => <View style={{width: 350, maxWidth: '100%', gap: 16}}><Story/></View>],
  parameters: {docs: {description: {component: '홈 목록·판 상세·목표 설정 시안에서 추출한 컴포넌트. 배지 색은 `badgeTones`에 tone을 추가해 늘린다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Badges: Story = {name: '배지 · tone', render: () => <View style={{gap: 12}}>
  {(Object.keys(badgeTones) as (keyof typeof badgeTones)[]).map(tone => <View key={tone} style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
    <PixelText style={{width: 80}}>{tone}</PixelText><PixelBadge tone={tone} label={tone === 'ink' ? '적립판' : '완성'}/>{tone === 'ink' && <PixelBadge label="달력판"/>}
  </View>)}
  <PixelText variant="caption">badge 12/18 · 새 배지는 badgeTones에 tone을 추가한다</PixelText>
</View>};
export const Completion: Story = {name: '완성 스티커', render: () => <View style={{gap: 16, alignItems: 'flex-start'}}>
  <CompletionSticker sticker="star"/><CompletionSticker sticker="sprout"/><CompletionSticker sticker="shoe" tilted/>
</View>};
function TabsDemo() {
  const [tab, setTab] = useState<GoalListTab>('active');
  return <PixelTabs items={[{key: 'active', label: '내 목표 5'}, {key: 'completed', label: '완성한 판 4'}] as const} value={tab} onChange={setTab}/>;
}
export const Tabs: Story = {name: '탭', render: () => <TabsDemo/>};
function ListHeaderDemo() {
  const [tab, setTab] = useState<GoalListTab>('active');
  return <><AppHeader onSettings={() => {}}/><GoalListHeader tab={tab} counts={{active: 5, completed: 4}} onTab={setTab} onAdd={() => {}}/></>;
}
export const ListHeader: Story = {name: '앱 헤더 + 목록 헤더', render: () => <ListHeaderDemo/>};
export const SummaryCards: Story = {name: '목록 카드', render: () => <View style={{gap: 12}}>
  <GoalSummaryCard name="책 읽기" sticker="sprout" kind="적립판" status={['40% 채웠어요']} percent={40}/>
  <GoalSummaryCard name="물 여덟 잔 마시기" sticker="flower" kind="달력판" status={['17% 채웠어요']} percent={17}/>
  <GoalSummaryCard name="매일 저녁 동네 한 바퀴 걷기" sticker="shoe" kind="달력판" status={['이번 달 30% 채웠어요']} percent={30}/>
  <GoalSummaryCard name="자기 전 스트레칭 십 분" sticker="star" kind="적립판" status={['100%', '9/29 완성']} percent={100}/>
  <GoalSummaryCard name="기타 코드 연습" sticker="book" kind="달력판" status={['9월 33%', '9/20 완성']} percent={33}/>
</View>};
export const ProgressRows: Story = {name: '판 상세 진행 줄', render: () => <View style={{gap: 8, backgroundColor: retro.color.lcd, padding: 12}}>
  <BoardProgressRow value={6} total={15} percentLabel="40%" sticker="sprout"/>
  <BoardProgressRow value={9} total={30} percentLabel="이번 달 30%" sticker="shoe"/>
  <BoardProgressRow value={20} total={20} percentLabel="100%" completed sticker="star"/>
</View>};
export const Empty: Story = {name: '빈 목록', render: () => <EmptyState title="아직 완성한 판이 없어요" description="판을 다 채우거나 달력판을 완성하면 여기에 모여요."/>};
function OptionDemo() {
  const [value, setValue] = useState<'none' | 'pick'>('none');
  return <OptionButtons options={[{key: 'none', label: '정하지 않기'}, {key: 'pick', label: '날짜 고르기'}] as const} value={value} onChange={setValue}/>;
}
export const Options: Story = {name: '선택 버튼 줄', render: () => <OptionDemo/>};
function PickerDemo() {
  const [date, setDate] = useState<string>();
  return <EndDatePicker firstAllowed="2026-09-29" selected={date} onSelect={setDate} hint="시작일은 오늘(9월 29일)이에요."/>;
}
export const DatePicker: Story = {name: '종료일 고르기', render: () => <PickerDemo/>};
function PeriodDemo({initialEnd, lastPlacedDate}: {initialEnd?: string; lastPlacedDate?: string}) {
  const [end, setEnd] = useState(initialEnd), [picking, setPicking] = useState(false);
  return <PeriodField startDate="2026-09-10" endDate={end} lastPlacedDate={lastPlacedDate} picking={picking} onPick={() => setPicking(open => !open)} onChange={date => {setEnd(date); setPicking(false);}} onClear={() => setEnd(undefined)}/>;
}
export const PeriodWithEnd: Story = {name: '기간 · 종료일 있음', render: () => <PeriodDemo initialEnd="2026-10-31" lastPlacedDate="2026-09-29"/>};
export const PeriodOpen: Story = {name: '기간 · 종료일 없음', render: () => <PeriodDemo/>};
export const Delete: Story = {name: '삭제 영역', render: () => <DeleteSection onDelete={() => {}}/>};
export const NoticeEmphasis: Story = {name: '강조 안내 (완성한 판 설정 맨 위)', render: () => <ShortNotice emphasis title="완성한 판은 고칠 수 없어요" detail="9월 24일에 완성했어요. 기록은 볼 수 있고, 목표는 삭제만 할 수 있어요."/>};

function CellGestureDemo({readonly = false}: {readonly?: boolean}) {
  const [log, setLog] = useState('칸을 눌러 보세요');
  return <View style={{gap: 12}}>
    <View style={{backgroundColor: retro.color.lcd, padding: 8}}><StickerGrid>{[1, 2, 3].map(n => <GoalStickerCell key={n} number={n} sticker="star" state={n < 3 ? 'filled' : readonly ? 'empty' : 'available'} enabled hasRecord={n === 2} readonly={readonly}
      onPress={() => setLog(n < 3 ? `${n}번: 한 번 → 떼기` : `${n}번: 붙이기`)} onOpenRecord={() => setLog(`${n}번: 두 번·꾹 → 기록 열기`)}/>)}</StickerGrid></View>
    <PixelText variant="caption">{log}</PixelText>
  </View>;
}
export const CellGestures: Story = {name: '칸 조작 · 한 번 / 두 번·꾹', render: () => <CellGestureDemo/>};
export const CellGesturesReadonly: Story = {name: '칸 조작 · 완성한 판 (readonly)', render: () => <CellGestureDemo readonly/>};
function CalendarDemo() {
  const [log, setLog] = useState('날짜를 눌러 보세요');
  return <View style={{gap: 12}}>
    <CalendarBoard year={2026} month={9} records={{'2026-09-02': 'shoe', '2026-09-04': 'shoe'}} recordedDates={new Set(['2026-09-04'])} selectedDate="2026-09-29"
      onSelect={date => setLog(`${date}: 한 번`)} onOpenRecord={date => setLog(`${date}: 두 번·꾹 → 기록 열기`)} onMonthChange={() => {}}
      isDateEnabled={date => date <= '2026-09-23'} canGoNext={false}/>
    <PixelText variant="caption">{log}</PixelText>
  </View>;
}
export const CalendarPeriod: Story = {name: '달력 · 9월 23일 종료 + 기록 열기', render: () => <CalendarDemo/>};
export const RecordReadonly: Story = {name: '기록 · 읽기 전용', decorators: [Story => <View style={{width: 390, maxWidth: '100%', height: 844}}><Story/></View>],
  render: () => <RecordScreen readonly goal={exampleGoals[0]} date="2026년 9월 12일" initialMemo="오늘은 허리까지 쭉 펴졌다." photoActionsInFrame onChoosePhoto={() => {}} onRemovePhoto={() => {}} onBack={() => {}} onSave={() => {}} onRemoveSticker={() => {}}/>};
