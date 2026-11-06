import React, {useState, type ReactNode} from 'react';
import {View} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {
  AddGoalSheet, BlockPickSheet, BlockedPeopleScreen, BoardDetailScreen, FriendBoardList, FriendBoardModal, GoalListScreen, GoogleLoginButton,
  InviteJoinScreen, InviteLoginPrompt, InviteProblemScreen, KakaoLoginButton, MemberBadgeRow, MemberList, OneBoardMembers, OneBoardWaiting, PixelDialogModal, PixelText,
  TogetherGoalScreen, TogetherSettingsScreen, retro, togetherDialogs,
  type BoardKind, type FriendBoard, type FriendBoardItem, type GoalCardItem, type MemberRow, type StickerId, type TogetherMode,
} from '../src/design-system';
import {GOAL_NAME_MAX, MEMBER_NAME_MAX, goalNameError, memberNameError} from '../src/domain/board';
import type {Goal} from '../src/domain/types';
import {boardLabel, longDate} from '../src/app-data/pocketAdapter';
import {t} from '../src/i18n';
import {AppleButtonPreview} from './support/appleButton';
import {Stage, noop} from './support/frame';
import {TODAY, boardOf, cardFor, cardOf, goals, slots, stickersOf} from './support/goals';

/**
 * 함께 목표 (PRD 4.15, 2026-11-04 시안 9판 확정, 판 배치 A). 화면 조합은 src/design-system/together-screens.tsx와
 * BoardDetailScreen의 함께 목표 prop(boardRows, below, members, title, readOnly, hideProgress)이다. 앱 동작에 연결되지 않는다.
 * 입력 검사 상태는 Rules/입력 검사, 흐름은 Flows/앱 전체 「함께 목표」.
 */
const meta = {
  title: 'Screens/함께 목표',
  parameters: {layout: 'fullscreen', edgeToEdge: true, docs: {description: {component: '함께 목표: 만들기, 초대 받기, 각자 판과 한 판, 친구 판 크게, 목표 설정의 함께하는 사람과 문제가 있을 때, 차단. 친구 판에는 칸 수, %, 순위를 쓰지 않는다. 휴대폰 공유 창은 OS 화면이라 그리지 않는다. 앱 동작에 연결되지 않습니다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const c = retro.color;
const caption = {color: c.buttonText};
function Note({children}: {children: ReactNode}) {
  return <PixelText variant="caption" style={caption}>{children}</PixelText>;
}

// ── 예시 값 ───────────────────────────────────────────────────────
const walk: Goal = {id: 'walk30', mode: 'each', role: 'owner', name: '11월 만 보 걷기', boardType: 'tally', totalSlots: 30, initialSlots: 30, defaultStickerId: 'basic.shoe',
  createdAt: new Date(2026, 8, 1).getTime(), endDate: null, completedAt: null, completionSeen: true, lastPlacedAt: null, sortOrder: null};
const ME = {name: '은주', sticker: 'basic.shoe' as StickerId};
const MAX = 6;
const upTo = (count: number) => new Set(Array.from({length: count}, (_, i) => i + 1));
const tally = (filled: number): FriendBoard => ({kind: 'tally', total: 30, filled: upTo(filled)});
const friend = (id: string, name: string, sticker: StickerId, board: FriendBoard): FriendBoardItem => ({id, name, sticker, board});
/** 들어온 순서. 은주(나)는 빼고 */
const FRIENDS: readonly FriendBoardItem[] = [
  friend('jiwoo', '지우', 'basic.flower', tally(18)), friend('min', '민', 'basic.star', tally(9)), friend('haneul', '하늘', 'basic.cat', tally(13)),
  friend('sora', '소라', 'basic.sprout', tally(7)), friend('doyoon', '도윤', 'basic.book', tally(21)),
];
/** 달력판 친구. 오늘은 예시 날짜(9월 29일), 두 주는 9월 20일~10월 3일 */
const sept = (days: number[]) => new Set(days.map(day => `2026-09-${String(day).padStart(2, '0')}`));
const calendarOf = (days: number[]): FriendBoard => ({kind: 'calendar', today: TODAY, start: '2026-09-10', dates: sept(days)});
const CALENDAR_FRIENDS: readonly FriendBoardItem[] = [
  friend('jiwoo', '지우', 'basic.star', calendarOf([20, 21, 22, 24, 25, 27, 28, 29])), friend('min', '민', 'basic.cat', calendarOf([21, 23, 26, 28])),
  friend('haneul', '하늘', 'basic.moon', calendarOf([20, 22, 24, 27, 29])), friend('sora', '소라', 'basic.sprout', calendarOf([25, 29])),
  friend('doyoon', '도윤', 'basic.book', calendarOf([20, 21, 22, 23, 24, 25, 26, 27, 28])),
];

// ── 판 화면 ───────────────────────────────────────────────────────
/** 각자 판: 진행 막대 없이 내 판 두 줄, 아래 친구 판 줄 목록 */
function SharedBoard({friends = FRIENDS, owner = true}: {friends?: readonly FriendBoardItem[]; /** [링크 다시 보내기]는 만든 사람만 */owner?: boolean}) {
  return <BoardDetailScreen {...boardOf(walk, slots(walk, 11), {recorded: new Set([10])})} title={walk.name} name={t('together.myBoard')} hideProgress boardRows={2}
    below={<FriendBoardList friends={friends} onOpen={noop} onResend={owner ? noop : undefined}/>} onBack={noop} onSettings={noop}/>;
}
/** 각자 판, 달력판: 내 판도 두 주 */
function SharedCalendar() {
  return <BoardDetailScreen {...boardOf(goals.water, stickersOf.water)} title={goals.water.name} name={t('together.myBoard')} hideProgress boardRows={2}
    below={<FriendBoardList friends={CALENDAR_FRIENDS} onOpen={noop} onResend={noop}/>} onBack={noop} onSettings={noop}/>;
}
/** 한 판: 칸마다 붙인 사람의 스티커 */
const ONE_FILLED: Record<number, StickerId> = {1: 'basic.shoe', 2: 'basic.flower', 3: 'basic.flower', 4: 'basic.star', 5: 'basic.shoe', 6: 'basic.cat', 7: 'basic.flower',
  8: 'basic.shoe', 9: 'basic.star', 10: 'basic.star', 11: 'basic.shoe', 12: 'basic.flower', 13: 'basic.cat'};
/** 한 판 아래 「함께하는 사람 n」: 만든 사람(나) 먼저, 사람마다 붙인 칸 수(스티커로 센다) */
const oneMembers = (filled: Record<number, StickerId>) => [{id: 'me', ...ME, me: true}, ...FRIENDS.slice(0, 3)]
  .map(person => ({...person, placed: Object.values(filled).filter(id => id === person.sticker).length}));
function OneBoard({hidden, waiting = false}: {/** 가려진 칸(차단한 사람이 붙인 칸) */hidden?: ReadonlySet<number>;/** 아직 나만 있다 */waiting?: boolean}) {
  const base = boardOf(walk, []);
  const filled = waiting ? {1: ME.sticker, 2: ME.sticker, 3: ME.sticker} : Object.fromEntries(Object.entries(ONE_FILLED).filter(([n]) => !hidden?.has(Number(n))));
  const board = base.board.kind === 'tally' ? {...base.board, filled, hidden, recorded: new Set([1, 5])} : base.board;
  return <BoardDetailScreen {...base} board={board} title={walk.name} name={t('together.ourBoard')} hideProgress boardRows={4}
    members={<MemberBadgeRow people={[{id: 'me', ...ME, me: true}, ...(waiting ? [] : FRIENDS.slice(0, 3))]}/>}
    above={waiting ? <OneBoardWaiting onResend={noop}/> : undefined} below={waiting ? undefined : <OneBoardMembers members={oneMembers(filled)}/>} onBack={noop} onSettings={noop}/>;
}
/** 한 판 달력판: 그 달 전체(2026-11-06). 하루 두 장이면 둘째 장을 오른쪽 아래로 비껴 겹친다(2026-11-05 시안 T2 B안) */
function OneCalendar() {
  const base = boardOf(goals.water, stickersOf.water);
  if (base.board.kind !== 'calendar') return null;
  const {records} = base.board;
  const dates = Object.keys(records).sort();
  // 오늘 칸도 두 장: 겹친 두 장과 오늘 꺾쇠(5pt)가 함께 어떻게 보이는지 본다(2026-11-05 시안 「한 날 여러 장」 B)
  const records2 = {...Object.fromEntries(dates.filter((_, i) => i % 3 === 1).map(date => [date, 'basic.star' as StickerId])), [TODAY]: 'basic.star' as StickerId};
  return <BoardDetailScreen {...base} board={{...base.board, records: {[TODAY]: 'basic.cat', ...records}, records2}} title={goals.water.name} name={t('together.ourBoard')} hideProgress boardRows={4} calendarMonth
    members={<MemberBadgeRow people={[{id: 'me', ...ME, me: true}, ...FRIENDS.slice(0, 2)]}/>}
    below={<OneBoardMembers members={[{id: 'me', ...ME, me: true, placed: 9}, {...FRIENDS[0], placed: 6}, {...FRIENDS[1], placed: 0}]}/>} onBack={noop} onSettings={noop}/>;
}
/** 앱(app/goal/[id]/index.tsx)이 띄우는 한 판 창. 문구는 togetherDialogs 그대로 */
function OneBoardWith({dialog}: {dialog: {title: string; description: string; primaryLabel: string; secondaryLabel?: string}}) {
  return <Stage><OneBoard/><PixelDialogModal visible {...dialog} single={!dialog.secondaryLabel} onPrimary={noop} onSecondary={noop} onRequestClose={noop}/></Stage>;
}
/** 보여주기를 받은 판: 톱니 없이 보기만 */
function ShowBoard() {
  const reading = {...goals.reading, totalSlots: 30};
  return <BoardDetailScreen {...boardOf(reading, slots(reading, 12))} title="지우의 책 읽기" name={t('together.boardOf', '지우')} readOnly hideProgress boardRows={4}
    below={<Note>{t('together.viewOnlyNote', '지우')}</Note>} onBack={noop} onSettings={noop}/>;
}
/** 넓은 폰(440pt): 내 판 5칸, 친구 판 8칸 */
function Wide({children, width = 440}: {children: ReactNode; width?: number}) {
  return <View style={{width, height: 956, backgroundColor: c.screen}}>{children}</View>;
}

export const SharedBoard390: Story = {name: '각자 판 390 폭', render: () => <Stage><SharedBoard/></Stage>};
export const SharedBoard440: Story = {name: '각자 판 440 폭', render: () => <Wide><SharedBoard/></Wide>};
/** 다 채운 친구(30/30)는 17~30칸이 모두 차 보이고 이름 아래 [완성], 칸이 두 줄보다 적은 판은 칸 수만큼만 */
const COMPLETED_FRIENDS: readonly FriendBoardItem[] = [friend('jiwoo', '지우', 'basic.flower', tally(30)), FRIENDS[1], friend('sora', '소라', 'basic.sprout', {kind: 'tally', total: 10, filled: upTo(4)})];
export const SharedBoardCompleted: Story = {name: '각자 판 친구가 다 채웠을 때', render: () => <Stage><SharedBoard friends={COMPLETED_FRIENDS}/></Stage>};
export const SharedWaiting: Story = {name: '각자 판 친구를 기다릴 때', render: () => <Stage><SharedBoard friends={[]}/></Stage>};
/** 초대 코드는 만든 사람만 읽는다. 함께하는 사람에게는 [링크 다시 보내기]가 없다 */
export const SharedWaitingMember: Story = {name: '각자 판 친구를 기다릴 때 만든 사람 아님', render: () => <Stage><SharedBoard friends={[]} owner={false}/></Stage>};
export const SharedCalendarBoard: Story = {name: '각자 판 달력판 두 주', render: () => <Stage><SharedCalendar/></Stage>};
export const FriendDialog: Story = {name: '친구 판 크게', render: () => <Stage><SharedBoard/>
  <FriendBoardModal visible name="지우" sticker="basic.flower" board={tally(18)} onRequestClose={noop}/></Stage>};
export const FriendDialogCalendar: Story = {name: '친구 판 크게 달력판', render: () => <Stage><SharedCalendar/>
  <FriendBoardModal visible name="지우" sticker="basic.star" board={calendarOf([10, 11, 13, 15, 16, 17, 20, 21, 22, 24, 25, 27, 28, 29])} onRequestClose={noop}/></Stage>};
export const OneBoardScreen: Story = {name: '한 판에 같이', render: () => <Stage><OneBoard/></Stage>};
/** 2026-11-05 시안 T1 A안: 각자 판과 같은 기다림 카드를 판 위에, 둘째 줄만 한 판 문구 */
export const OneBoardCalendarTwo: Story = {name: '한 판 달력판 하루 두 장', render: () => <Stage><OneCalendar/></Stage>};
/** 작은 폰(402pt)과 큰 폰(440pt): 두 장이 그날 칸 안에 들고 옆 칸을 넘지 않는다 */
export const OneBoardCalendarTwo402: Story = {name: '한 판 달력판 하루 두 장 402 폭', render: () => <Wide width={402}><OneCalendar/></Wide>};
export const OneBoardCalendarTwo440: Story = {name: '한 판 달력판 하루 두 장 440 폭', render: () => <Wide><OneCalendar/></Wide>};
export const OneBoardWaitingScreen: Story = {name: '한 판 친구를 기다릴 때', render: () => <Stage><OneBoard waiting/></Stage>};
/** 새 조립(사용자 확인 전): 차단한 사람이 붙인 칸은 이름과 스티커 없이 흐리게(투명도 0.4), 누를 수 없다. 판 칸 수에는 든다 */
export const OneBoardHidden: Story = {name: '한 판에 같이 가려진 칸', render: () => <Stage><OneBoard hidden={new Set([4, 9])}/></Stage>};
/** 새 문구(사용자 확인 전): 내가 붙인 칸을 다른 사람이 먼저 붙였다. 칸은 이미 떼어졌다 */
export const SlotTakenDialog: Story = {name: '한 판 이미 누가 붙였어요', render: () => <OneBoardWith dialog={togetherDialogs.slotTaken}/>};
/** 새 문구(사용자 확인 전): 연결 없이 빈칸을 눌렀다. 붙이지 않는다 */
export const OneBoardOffline: Story = {name: '한 판 연결 없을 때', render: () => <OneBoardWith dialog={togetherDialogs.offlineOne}/>};
export const ShowBoardReadOnly: Story = {name: '보여주기 받은 판 보기만', render: () => <Stage><ShowBoard/></Stage>};

// ── 만들기 ─────────────────────────────────────────────────────────
const sharedCard: GoalCardItem = cardOf(walk, slots(walk, 11), 4);
function GoalList() {
  return <GoalListScreen tab="active" onTab={noop} active={[cardFor('reading'), sharedCard, cardFor('water')]} completed={[]} onOpen={noop} onAdd={noop}/>;
}
export const AddSheet: Story = {name: '더하기 시트', render: () => <Stage tab="index"><GoalList/><AddGoalSheet visible onSolo={noop} onTogether={noop} onRequestClose={noop}/></Stage>};
/** [친구와 함께]를 로그인 전에 눌렀을 때. 앱은 시트를 닫은 뒤 목표 탭 위에 togetherDialogs.login을 띄운다. 새 문구, 사용자 확인 전 */
export const AddSheetLogin: Story = {name: '더하기 시트 로그인 전', render: () => <Stage tab="index"><GoalList/>
  <PixelDialogModal visible {...togetherDialogs.login} onPrimary={noop} onSecondary={noop} onRequestClose={noop}/></Stage>};

/** 앱 app/goal/together.tsx가 넘길 값. 이름 검사는 앱과 같은 함수 */
function TogetherForm({initialMode = 'each', initialName = walk.name, initialMyName = ME.name, myNameError}: {initialMode?: TogetherMode; initialName?: string; initialMyName?: string; myNameError?: string}) {
  const [mode, setMode] = useState<TogetherMode>(initialMode);
  const [name, setName] = useState(initialName), [kind, setKind] = useState<BoardKind>('tally'), [count, setCount] = useState('30');
  const [myName, setMyName] = useState(initialMyName);
  return <Stage><TogetherGoalScreen mode={mode} onChangeMode={setMode} name={name} onChangeName={setName} nameMaxLength={GOAL_NAME_MAX} nameError={goalNameError(name)}
    kind={kind} onChangeKind={setKind} count={count} onChangeCount={setCount}
    end={{mode: 'none', onChangeMode: noop, onChangeDate: noop, today: TODAY, todayLabel: '9월 29일'}}
    myName={myName} onChangeMyName={setMyName} myNameMaxLength={MEMBER_NAME_MAX} myNameError={myNameError ?? memberNameError(myName)}
    sticker={ME.sticker} onChooseSticker={noop} maxFriends={MAX} onSubmit={noop} onBack={noop}/></Stage>;
}
export const TogetherEach: Story = {name: '친구와 함께 각자 판에', render: () => <TogetherForm/>};
export const TogetherOne: Story = {name: '친구와 함께 한 판에 같이', render: () => <TogetherForm initialMode="one"/>};

// ── 초대 받기 ───────────────────────────────────────────────────────
const iosButtons = <><KakaoLoginButton onPress={noop}/><GoogleLoginButton onPress={noop}/><AppleButtonPreview/></>;
export const InviteLogin: Story = {name: '초대 링크 로그인 전', render: () => <Stage><InviteLoginPrompt ownerName="은주" goalName={walk.name} loginButtons={iosButtons}/></Stage>};
/** 앱 app/invite/[code].tsx가 넘길 값. 지금 함께하는 사람(은주, 지우)의 판을 미리 본다 */
function InviteJoin({initialName = '소라', sticker = 'basic.sprout', nameError, stickerError}: {initialName?: string; sticker?: StickerId; nameError?: string; stickerError?: string}) {
  const [name, setName] = useState(initialName);
  return <Stage><InviteJoinScreen goalName={walk.name} kind="tally" total={30} ownerName="은주"
    members={[friend('eunju', '은주', 'basic.shoe', tally(11)), FRIENDS[0]]}
    myName={name} onChangeMyName={setName} myNameMaxLength={MEMBER_NAME_MAX} myNameError={nameError ?? memberNameError(name)}
    sticker={sticker} onChooseSticker={noop} stickerError={stickerError} onJoin={noop} onBack={noop}/></Stage>;
}
export const InviteJoinDefault: Story = {name: '함께하기', render: () => <InviteJoin/>};
export const InviteFull: Story = {name: '초대 문제 자리가 다 참', render: () => <Stage><InviteProblemScreen problem="full" max={MAX} onHome={noop} onBack={noop}/></Stage>};
export const InviteClosed: Story = {name: '초대 문제 들어갈 수 없음', render: () => <Stage><InviteProblemScreen problem="closed" max={MAX} onHome={noop} onBack={noop}/></Stage>};

// ── 목표 설정 ──────────────────────────────────────────────────────
const OWNER_VIEW: readonly MemberRow[] = [{id: 'me', ...ME, me: true, owner: true}, ...FRIENDS.slice(0, 3)];
const MEMBER_VIEW: readonly MemberRow[] = [{id: 'eunju', ...ME, owner: true}, {id: 'me', name: '소라', sticker: 'basic.sprout', me: true}, ...FRIENDS.slice(0, 2)];
/** 앱과 같이 만든 사람에게는 칸 수 칸(적립판)과 [초대 링크 새로 만들기]가 있다 */
function OwnerSettings() {
  return <TogetherSettingsScreen role="owner" mode="each" goalName={walk.name} onChangeGoalName={noop} goalNameMaxLength={GOAL_NAME_MAX} ownerName={ME.name} boardLabel={boardLabel(walk)}
    slots={{current: 30, value: '30', onChange: noop}}
    myName={ME.name} onChangeMyName={noop} myNameMaxLength={MEMBER_NAME_MAX} sticker={ME.sticker} onChooseSticker={noop}
    members={<MemberList members={OWNER_VIEW} max={MAX} onKick={noop} onInvite={noop} onRotate={noop}/>}
    onSave={noop} onReport={noop} onBlock={noop} onLeave={noop} onDelete={noop} onBack={noop}/>;
}
/** completed면 다 채운 판: 판 종류 줄 아래 「M월 D일 완성」, 만든 사람이 바꾼다는 안내는 없다 */
function MemberSettings({completed = false}: {completed?: boolean}) {
  return <TogetherSettingsScreen role="member" mode="each" goalName={walk.name} ownerName={ME.name} boardLabel={boardLabel(walk)} completedLabel={completed ? longDate(TODAY) : undefined}
    myName="소라" onChangeMyName={noop} myNameMaxLength={MEMBER_NAME_MAX} sticker="basic.sprout" onChooseSticker={noop}
    members={<MemberList members={MEMBER_VIEW} max={MAX}/>}
    onSave={noop} onReport={noop} onBlock={noop} onLeave={noop} onBack={noop}/>;
}
export const SettingsOwner: Story = {name: '목표 설정 만든 사람', render: () => <Stage auto><OwnerSettings/></Stage>};
export const SettingsMember: Story = {name: '목표 설정 함께하는 사람', render: () => <Stage auto><MemberSettings/></Stage>};
export const SettingsMemberCompleted: Story = {name: '목표 설정 함께하는 사람 완성한 판', render: () => <Stage auto><MemberSettings completed/></Stage>};
/** 새 조립(사용자 확인 전): 칸 수 칸은 혼자 목표 설정과 같은 SlotsField. 늘리기만 된다. 스크롤해 아래쪽을 본다 */
export const SettingsOwnerSlots: Story = {name: '목표 설정 만든 사람 칸 수', render: () => <Stage><OwnerSettings/></Stage>};
/** 앱(app/goal/[id]/settings.tsx)이 띄우는 창. 문구는 togetherDialogs 그대로 */
function SettingsWith({member = false, dialog}: {member?: boolean; dialog: {title: string; description: string; primaryLabel: string; secondaryLabel?: string}}) {
  return <Stage>{member ? <MemberSettings/> : <OwnerSettings/>}
    <PixelDialogModal visible {...dialog} single={!dialog.secondaryLabel} onPrimary={noop} onSecondary={noop} onRequestClose={noop}/></Stage>;
}
/** 새 문구(사용자 확인 전) */
export const LeaveConfirm: Story = {name: '나가기 확인', render: () => <SettingsWith member dialog={togetherDialogs.leave('each')}/>};
export const KickConfirm: Story = {name: '내보내기 확인', render: () => <SettingsWith dialog={togetherDialogs.kick('지우')}/>};
export const RotateConfirm: Story = {name: '초대 링크 새로 만들기 확인', render: () => <SettingsWith dialog={togetherDialogs.rotate}/>};
export const GoneDialog: Story = {name: '볼 수 없는 목표', render: () => <SettingsWith member dialog={togetherDialogs.gone}/>};

// ── 차단 ─────────────────────────────────────────────────────────
const PICK = [{id: 'eunju', ...ME}, ...FRIENDS.slice(0, 3)];
export const BlockSheet: Story = {name: '차단 누구를 차단할까요', render: () => <Stage><MemberSettings/>
  <BlockPickSheet visible people={PICK} onPick={noop} onRequestClose={noop}/></Stage>};
/** 새 조립(사용자 확인 전): 차단 고르기 시트에 제목을 바꾸고 「목표 이름」 줄을 사람 위에 둔다. 사유는 고정 낱말 name */
export const ReportSheet: Story = {name: '신고 무엇을 신고할까요', render: () => <Stage><MemberSettings/>
  <BlockPickSheet visible title={t('report.pickTitle')} extraRows={[{id: 'goal', label: t('report.goalName')}]} people={PICK} onPick={noop} onRequestClose={noop}/></Stage>};
/** 새 문구(사용자 확인 전): 앱은 확인 창을 시트 위(overlay)에 띄운다 */
export const ReportConfirm: Story = {name: '신고 확인', render: () => <Stage><MemberSettings/>
  <BlockPickSheet visible title={t('report.pickTitle')} extraRows={[{id: 'goal', label: t('report.goalName')}]} people={PICK} onPick={noop} onRequestClose={noop}
    overlay={<PixelDialogModal visible {...togetherDialogs.report(t('report.personName', '지우'))} onPrimary={noop} onSecondary={noop} onRequestClose={noop}/>}/></Stage>};
export const ReportDone: Story = {name: '신고했어요', render: () => <Stage><MemberSettings/>
  <BlockPickSheet visible title={t('report.pickTitle')} extraRows={[{id: 'goal', label: t('report.goalName')}]} people={PICK} onPick={noop} onRequestClose={noop}
    overlay={<PixelDialogModal visible single {...togetherDialogs.reportDone} onPrimary={noop} onRequestClose={noop}/>}/></Stage>};
/** 앱은 차단 확인을 시트 위(overlay)에 띄운다 */
export const BlockConfirmOnSheet: Story = {name: '차단 확인 시트 위', render: () => <Stage><MemberSettings/>
  <BlockPickSheet visible people={PICK} onPick={noop} onRequestClose={noop}
    overlay={<PixelDialogModal visible {...togetherDialogs.blockConfirm('지우')} onPrimary={noop} onSecondary={noop} onRequestClose={noop}/>}/></Stage>};
export const BlockConfirm: Story = {name: '차단 확인', render: () => <Stage><MemberSettings/>
  <PixelDialogModal visible {...togetherDialogs.blockConfirm('지우')} onPrimary={noop} onSecondary={noop} onRequestClose={noop}/></Stage>};
/** 이름만 보인다(2026-11-05 사용자: 이름만). 스티커와 차단한 목표 이름은 그리지 않는다 */
export const BlockedPeople: Story = {name: '차단한 사람', render: () => <Stage><BlockedPeopleScreen people={[{id: 'jiwoo', name: '지우'}, {id: 'min', name: '민'}]} onUnblock={noop} onBack={noop}/></Stage>};
export const BlockedPeopleEmpty: Story = {name: '차단한 사람 없음', render: () => <Stage><BlockedPeopleScreen people={[]} onUnblock={noop} onBack={noop}/></Stage>};
