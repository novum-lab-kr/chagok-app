import React, {useState, type ReactNode} from 'react';
import {View} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {
  AddGoalSheet, BlockPickSheet, BlockedPeopleScreen, BoardDetailScreen, FriendBoardList, FriendBoardModal, GoalListScreen, GoogleLoginButton,
  InviteJoinScreen, InviteLoginPrompt, InviteProblemScreen, KakaoLoginButton, MemberBadgeRow, MemberList, PixelDialogModal, PixelText,
  TogetherGoalScreen, TogetherSettingsScreen, retro, togetherDialogs,
  type BoardKind, type FriendBoard, type FriendBoardItem, type GoalCardItem, type MemberRow, type StickerId, type TogetherMode,
} from '../src/design-system';
import {GOAL_NAME_MAX, MEMBER_NAME_MAX, goalNameError, memberNameError} from '../src/domain/board';
import type {Goal} from '../src/domain/types';
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
function SharedBoard({friends = FRIENDS}: {friends?: readonly FriendBoardItem[]}) {
  return <BoardDetailScreen {...boardOf(walk, slots(walk, 11), {recorded: new Set([10])})} title={walk.name} name={t('together.myBoard')} hideProgress boardRows={2}
    below={<FriendBoardList friends={friends} onOpen={noop} onResend={noop}/>} onBack={noop} onSettings={noop}/>;
}
/** 각자 판, 달력판: 내 판도 두 주 */
function SharedCalendar() {
  return <BoardDetailScreen {...boardOf(goals.water, stickersOf.water)} title={goals.water.name} name={t('together.myBoard')} hideProgress boardRows={2}
    below={<FriendBoardList friends={CALENDAR_FRIENDS} onOpen={noop} onResend={noop}/>} onBack={noop} onSettings={noop}/>;
}
/** 한 판: 칸마다 붙인 사람의 스티커 */
const ONE_FILLED: Record<number, StickerId> = {1: 'basic.shoe', 2: 'basic.flower', 3: 'basic.flower', 4: 'basic.star', 5: 'basic.shoe', 6: 'basic.cat', 7: 'basic.flower',
  8: 'basic.shoe', 9: 'basic.star', 10: 'basic.star', 11: 'basic.shoe', 12: 'basic.flower', 13: 'basic.cat'};
function OneBoard() {
  const base = boardOf(walk, []);
  const board = base.board.kind === 'tally' ? {...base.board, filled: ONE_FILLED, recorded: new Set([1, 5])} : base.board;
  return <BoardDetailScreen {...base} board={board} title={walk.name} name={t('together.ourBoard')} hideProgress boardRows={4}
    members={<MemberBadgeRow people={[{id: 'me', ...ME, me: true}, ...FRIENDS.slice(0, 3)]}/>}
    below={<Note>{t('together.oneBoardNote')}</Note>} onBack={noop} onSettings={noop}/>;
}
/** 보여주기를 받은 판: 톱니 없이 보기만 */
function ShowBoard() {
  const reading = {...goals.reading, totalSlots: 30};
  return <BoardDetailScreen {...boardOf(reading, slots(reading, 12))} title="지우의 책 읽기" name={t('together.boardOf', '지우')} readOnly hideProgress boardRows={4}
    below={<Note>{t('together.viewOnlyNote', '지우')}</Note>} onBack={noop} onSettings={noop}/>;
}
/** 넓은 폰(440pt): 내 판 5칸, 친구 판 8칸 */
function Wide({children}: {children: ReactNode}) {
  return <View style={{width: 440, height: 956, backgroundColor: c.screen}}>{children}</View>;
}

export const SharedBoard390: Story = {name: '각자 판 390 폭', render: () => <Stage><SharedBoard/></Stage>};
export const SharedBoard440: Story = {name: '각자 판 440 폭', render: () => <Wide><SharedBoard/></Wide>};
export const SharedWaiting: Story = {name: '각자 판 친구를 기다릴 때', render: () => <Stage><SharedBoard friends={[]}/></Stage>};
export const SharedCalendarBoard: Story = {name: '각자 판 달력판 두 주', render: () => <Stage><SharedCalendar/></Stage>};
export const FriendDialog: Story = {name: '친구 판 크게', render: () => <Stage><SharedBoard/>
  <FriendBoardModal visible name="지우" sticker="basic.flower" board={tally(18)} onRequestClose={noop}/></Stage>};
export const FriendDialogCalendar: Story = {name: '친구 판 크게 달력판', render: () => <Stage><SharedCalendar/>
  <FriendBoardModal visible name="지우" sticker="basic.star" board={calendarOf([10, 11, 13, 15, 16, 17, 20, 21, 22, 24, 25, 27, 28, 29])} onRequestClose={noop}/></Stage>};
export const OneBoardScreen: Story = {name: '한 판에 같이', render: () => <Stage><OneBoard/></Stage>};
export const ShowBoardReadOnly: Story = {name: '보여주기 받은 판 보기만', render: () => <Stage><ShowBoard/></Stage>};

// ── 만들기 ─────────────────────────────────────────────────────────
const sharedCard: GoalCardItem = {...cardOf(walk, slots(walk, 11)), status: [t('together.memberCount', 4), ...cardOf(walk, slots(walk, 11)).status]};
function GoalList() {
  return <GoalListScreen tab="active" onTab={noop} active={[cardFor('reading'), sharedCard, cardFor('water')]} completed={[]} onOpen={noop} onAdd={noop}/>;
}
export const AddSheet: Story = {name: '더하기 시트', render: () => <Stage tab="index"><GoalList/><AddGoalSheet visible onSolo={noop} onTogether={noop} onRequestClose={noop}/></Stage>};

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
function OwnerSettings() {
  return <TogetherSettingsScreen role="owner" mode="each" goalName={walk.name} onChangeGoalName={noop} goalNameMaxLength={GOAL_NAME_MAX} ownerName={ME.name}
    myName={ME.name} onChangeMyName={noop} myNameMaxLength={MEMBER_NAME_MAX} sticker={ME.sticker} onChooseSticker={noop}
    members={<MemberList members={OWNER_VIEW} max={MAX} onKick={noop} onInvite={noop}/>}
    onSave={noop} onReport={noop} onBlock={noop} onLeave={noop} onDelete={noop} onBack={noop}/>;
}
function MemberSettings() {
  return <TogetherSettingsScreen role="member" mode="each" goalName={walk.name} ownerName={ME.name}
    myName="소라" onChangeMyName={noop} myNameMaxLength={MEMBER_NAME_MAX} sticker="basic.sprout" onChooseSticker={noop}
    members={<MemberList members={MEMBER_VIEW} max={MAX}/>}
    onSave={noop} onReport={noop} onBlock={noop} onLeave={noop} onBack={noop}/>;
}
export const SettingsOwner: Story = {name: '목표 설정 만든 사람', render: () => <Stage auto><OwnerSettings/></Stage>};
export const SettingsMember: Story = {name: '목표 설정 함께하는 사람', render: () => <Stage auto><MemberSettings/></Stage>};

// ── 차단 ─────────────────────────────────────────────────────────
const PICK = [{id: 'eunju', ...ME}, ...FRIENDS.slice(0, 3)];
export const BlockSheet: Story = {name: '차단 누구를 차단할까요', render: () => <Stage><MemberSettings/>
  <BlockPickSheet visible people={PICK} onPick={noop} onRequestClose={noop}/></Stage>};
export const BlockConfirm: Story = {name: '차단 확인', render: () => <Stage><MemberSettings/>
  <PixelDialogModal visible {...togetherDialogs.blockConfirm('지우')} onPrimary={noop} onSecondary={noop} onRequestClose={noop}/></Stage>};
export const BlockedPeople: Story = {name: '차단한 사람', render: () => <Stage><BlockedPeopleScreen people={[{id: 'jiwoo', name: '지우', sticker: 'basic.flower', goalName: walk.name}]} onUnblock={noop} onBack={noop}/></Stage>};
export const BlockedPeopleEmpty: Story = {name: '차단한 사람 없음', render: () => <Stage><BlockedPeopleScreen people={[]} onUnblock={noop} onBack={noop}/></Stage>};
