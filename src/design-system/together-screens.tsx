import React,{useState,type ReactNode} from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {DIALOG_MAX_WIDTH,FieldError,ModalHost,PixelBadge,PixelButton,PixelFrame,PixelIcon,PixelInput,PixelPanel,PixelText,useContentWidth} from './components';
import {BoardTypePicker,DeleteSection,EmptyState,EndDatePicker,OptionButtons,PixelBottomSheet,RetroScreen,ScreenHeader,SettingHint,SlotCountPicker,StickerSummary,type BoardKind} from './composition-controls';
import {SlotsField,useSwipePages,type EndDateMode,type SlotsFieldView} from './board-screens';
import {monthCells,calendarDateKey} from './calendar';
import {Mascot,type MascotPose} from './mascot';
import {StickerGlyph,type StickerId} from './sticker-glyphs';
import {retro} from './tokens';
import {friendStripColumns,friendStripFirst,weekWindow} from './board-shape';
import {t} from '../i18n';

/**
 * 함께 목표 화면과 조각 (PRD 4.15, 2026-11-04 시안 9판 확정, 배치 A).
 * props만 받는다. 판 화면은 BoardDetailScreen(boardRows, below, members)에 여기 조각을 넣어 만든다.
 * 친구 판에는 칸 수, %, 순위를 쓰지 않는다(PRD 2절). 순서는 들어온 순서로 호스트가 넘긴다.
 */
const c=retro.color;
const caption={color:c.buttonText};
function Small({children,center=false}:{children:ReactNode;center?:boolean}) {
  return <PixelText variant="caption" style={[caption,center?{textAlign:'center'}:null]}>{children}</PixelText>;
}
/** 먹색을 옅게. 얇은 판 칸 줄과 목록 줄 */
const inkAlpha=(alpha:number)=>{const h=c.ink.replace('#','');const n=(i:number)=>parseInt(h.slice(i,i+2),16);return `rgba(${n(0)},${n(2)},${n(4)},${alpha})`;};
const GRID_LINE=inkAlpha(0.14);
const ROW_LINE=inkAlpha(0.18);
/** 친구 판 줄 수치(시안 배치 A): 이름 칸 폭, 칸 높이, 스티커(24의 정수배만) */
export const FRIEND_NAME_WIDTH=56;
export const FRIEND_CELL_HEIGHT=32;
const FRIEND_STICKER=24;
/** 얇은 판 안쪽 여백(PixelFrame thin) */
const THIN_PADDING=7;
/** 친구 판 줄의 줄 수 */
const FRIEND_ROWS=2;
/** 이름 칸과 얇은 판 사이 */
const STRIP_GAP=8;
const sectionTitle={fontSize:16,lineHeight:22};

// ── 친구 판 ────────────────────────────────────────────────────────
/** 친구 판 하나. 적립판은 붙은 칸 번호, 달력판은 붙은 날. */
export type FriendBoard=
  |{kind:'tally';total:number;/** 붙은 칸 번호(1부터) */filled:ReadonlySet<number>}
  |{kind:'calendar';/** 오늘. 줄은 지난주와 이번 주 */today:string;/** 그 사람이 함께 시작한 날. 이보다 앞으로는 넘기지 않는다 */start:string;dates:ReadonlySet<string>};
export type FriendBoardItem={id:string;name:string;sticker:StickerId;board:FriendBoard};

/** 이름 배지 칸. 폭을 고정해 줄마다 판이 같은 곳에서 시작한다. 긴 이름은 두 줄로 접힌다. */
function NameCell({name}:{name:string}) {
  return <View style={{width:FRIEND_NAME_WIDTH,alignItems:'flex-start'}}><PixelBadge label={name}/></View>;
}
function StripCell({width,height,children,blank=false}:{width:number;height:number;children?:ReactNode;/** 판 밖 자리(칸 수보다 뒤) */blank?:boolean}) {
  return <View style={{width,height,alignItems:'center',justifyContent:'center',borderWidth:blank?0:0.5,borderColor:GRID_LINE}}>{children}</View>;
}
function DayNumber({day,faint=false}:{day:number;faint?:boolean}) {
  return <PixelText style={{fontSize:10,lineHeight:12,opacity:faint?0.3:0.5}}>{day}</PixelText>;
}
/**
 * 친구 판 한 줄: [이름 배지][얇은 판 두 줄]. 적립판은 7칸(판 안 폭 320 이상이면 8칸), 가장 최근 칸이 둘째 줄에 오도록 연다.
 * 달력판은 7칸 두 주(지난주, 이번 주). 옆으로 밀면 앞 칸(앞 주), 다시 밀면 돌아온다. 누르면 onPress(그 친구 판 크게).
 */
export function FriendBoardStrip({name,sticker,board,onPress}:{name:string;sticker:StickerId;board:FriendBoard;onPress?:()=>void}) {
  // 재기 전 첫 프레임은 화면 폭에서 이름 칸과 사이를 뺀 값으로 그린다(판 칸과 같은 방식, useContentWidth).
  const [measured,setMeasured]=useState<number|null>(null);
  const estimated=useContentWidth(null)-FRIEND_NAME_WIDTH-STRIP_GAP;
  const width=measured??Math.max(0,estimated);
  const inner=Math.max(0,width-2*THIN_PADDING);
  const columns=board.kind==='tally'?friendStripColumns(inner):7;
  const cell=Math.floor(inner/columns);
  const [offset,setOffset]=useState(0);
  const span=columns*FRIEND_ROWS;
  let cells:ReactNode[]=[];
  let canPrev=false;
  if(board.kind==='tally'){
    const last=Math.max(0,...board.filled);
    const first=Math.max(1,friendStripFirst(last,columns,FRIEND_ROWS)+offset*span);
    canPrev=first>1;
    cells=Array.from({length:span},(_,i)=>{const n=first+i;return <StripCell key={n} width={cell} height={FRIEND_CELL_HEIGHT} blank={n>board.total}>
      {board.filled.has(n)&&<StickerGlyph id={sticker} size={FRIEND_STICKER}/>}</StripCell>;});
  }else{
    const dates=weekWindow(board.today,FRIEND_ROWS,offset);
    canPrev=dates[0]>board.start;
    cells=dates.map(date=>{const before=date<board.start||date>board.today;return <StripCell key={date} width={cell} height={FRIEND_CELL_HEIGHT}>
      {board.dates.has(date)?<StickerGlyph id={sticker} size={FRIEND_STICKER}/>:<DayNumber day={Number(date.slice(8,10))} faint={before}/>}</StripCell>;});
  }
  const swipe=useSwipePages(canPrev?()=>setOffset(o=>o-1):undefined,offset<0?()=>setOffset(o=>o+1):undefined);
  const strip=<View {...swipe.panHandlers} style={{flex:1}} onLayout={event=>setMeasured(Math.round(event.nativeEvent.layout.width))}>
    {width>0&&<PixelFrame variant="thin"><View testID="friend-strip-cells" style={{width:cell*columns,flexDirection:'row',flexWrap:'wrap'}}>{cells}</View></PixelFrame>}
  </View>;
  const row=<View style={{flexDirection:'row',alignItems:'center',gap:STRIP_GAP}}><NameCell name={name}/>{strip}</View>;
  return onPress
    ?<Pressable accessibilityRole="button" accessibilityLabel={t('together.boardOf',name)} accessibilityHint={t('together.openBoard',name)} onPress={onPress}>{row}</Pressable>
    :<View accessible accessibilityLabel={t('together.boardOf',name)}>{row}</View>;
}
/** 친구를 기다리는 자리: 차곡이 + 안내 + [링크 다시 보내기]. */
function WaitingForFriends({onResend}:{/** 만든 사람만. 없으면 버튼을 그리지 않는다 */onResend?:()=>void}) {
  return <PixelFrame variant="thin"><View style={{alignItems:'center',gap:10,paddingVertical:18,paddingHorizontal:10}}>
    <Mascot pose="curious" size={64}/>
    <PixelText style={{textAlign:'center'}}>{t('together.waiting')}</PixelText>
    <Small center>{t('together.waitingDetail')}</Small>
    {onResend&&<PixelButton label={t('together.resendLink')} variant="secondary" minHeight={40} onPress={onResend}/>}
  </View></PixelFrame>;
}
/** 판 아래 「함께하는 사람 n」(목표 설정과 같이 나 포함)과 친구 판 줄 목록(나는 빼고). 친구가 없으면 기다리는 자리. */
export function FriendBoardList({friends,onOpen,onResend}:{friends:readonly FriendBoardItem[];/** 줄을 누르면 그 친구 판 크게 */onOpen:(id:string)=>void;/** [링크 다시 보내기]. 초대 코드는 만든 사람만 읽으므로 만든 사람에게만 준다 */onResend?:()=>void}) {
  return <View style={{gap:8}}>
    <PixelText accessibilityRole="header" style={sectionTitle}>{friends.length?t('together.peopleCount',friends.length+1):t('together.people')}</PixelText>
    {friends.length
      ?<View style={{gap:10}}>{friends.map(friend=><FriendBoardStrip key={friend.id} name={friend.name} sticker={friend.sticker} board={friend.board} onPress={()=>onOpen(friend.id)}/>)}</View>
      :<WaitingForFriends onResend={onResend}/>}
  </View>;
}
/** 한 판 아래 안내 글: 칸마다 붙인 사람의 스티커이고, 친구 칸을 누르면 누가 언제 붙였는지 보인다. */
export function OneBoardNote() {
  return <Small>{t('together.oneBoardNote')}</Small>;
}
const BIG_CELL=44;
/** 친구 판 전체(적립판 모든 칸, 달력판 그 달)를 얇은 판에 크게. 보기만 한다. */
export function FriendBoardDialog({name,sticker,board,onClose}:{name:string;sticker:StickerId;board:FriendBoard;onClose:()=>void}) {
  const [width,setWidth]=useState(0);
  const columns=board.kind==='tally'?6:7;
  const cell=Math.min(BIG_CELL,Math.floor((width-2*THIN_PADDING)/columns));
  let cells:ReactNode[];
  if(board.kind==='tally'){
    cells=Array.from({length:board.total},(_,i)=>{const n=i+1;return <StripCell key={n} width={cell} height={cell}>
      {board.filled.has(n)?<StickerGlyph id={sticker} size={FRIEND_STICKER}/>:<PixelText style={{fontSize:12,lineHeight:14,opacity:0.5}}>{n}</PixelText>}</StripCell>;});
  }else{
    const year=Number(board.today.slice(0,4)),month=Number(board.today.slice(5,7));
    cells=monthCells(year,month).map((day,i)=>{
      const date=day?calendarDateKey(year,month,day):'';
      return <StripCell key={i} width={cell} height={cell} blank={!day}>
        {day&&(board.dates.has(date)?<StickerGlyph id={sticker} size={FRIEND_STICKER}/>:<DayNumber day={day} faint={date<board.start||date>board.today}/>)}</StripCell>;
    });
  }
  const rows=Math.ceil(cells.length/columns);
  return <PixelFrame variant="dialog" style={{width:'100%',maxWidth:DIALOG_MAX_WIDTH}} contentStyle={{padding:retro.layout.dialogPadding,gap:14}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <StickerGlyph id={sticker} size={32}/>
      <PixelText accessibilityRole="header" variant="title" style={{flex:1,fontSize:22,lineHeight:30}}>{t('together.boardOf',name)}</PixelText>
    </View>
    <View onLayout={event=>setWidth(Math.round(event.nativeEvent.layout.width))} style={{alignItems:'center'}}>
      {width>0&&<PixelFrame variant="thin"><ScrollView style={{maxHeight:cell*Math.min(rows,8)}} bounces={false}>
        <View style={{width:cell*columns,flexDirection:'row',flexWrap:'wrap'}}>{cells}</View>
      </ScrollView></PixelFrame>}
    </View>
    <PixelButton label={t('common.close')} variant="secondary" onPress={onClose}/>
  </PixelFrame>;
}
/** FriendBoardDialog를 화면 가운데 띄우는 호스트. */
export function FriendBoardModal({visible,onRequestClose,...dialog}:{visible:boolean;onRequestClose:()=>void;name:string;sticker:StickerId;board:FriendBoard}) {
  return <ModalHost visible={visible} onRequestClose={onRequestClose}><FriendBoardDialog {...dialog} onClose={onRequestClose}/></ModalHost>;
}

// ── 한 판 ─────────────────────────────────────────────────────────
export type MemberBadge={id:string;name:string;sticker:StickerId;/** 나는 「나」 배지(주황) */me?:boolean};
/** 한 판 위 사람 줄: 스티커 + 이름 배지. 칸마다 누가 붙였는지 이 스티커로 알아본다. */
export function MemberBadgeRow({people}:{people:readonly MemberBadge[]}) {
  return <View style={{flexDirection:'row',flexWrap:'wrap',columnGap:12,rowGap:6,paddingTop:6}}>
    {people.map(person=><View key={person.id} accessible accessibilityLabel={person.me?t('together.meName',person.name):person.name} style={{alignItems:'center',gap:2,minWidth:44}}>
      <StickerGlyph id={person.sticker} size={24}/>
      <PixelBadge label={person.me?t('together.me'):person.name} tone={person.me?'primary':'ink'}/>
    </View>)}
  </View>;
}

// ── 만들기 ─────────────────────────────────────────────────────────
/** 목표 탭 + 시트: [혼자 채우기] [친구와 함께]. */
export function AddGoalSheet({visible,onSolo,onTogether,onRequestClose,onDismiss}:{visible:boolean;onSolo:()=>void;onTogether:()=>void;onRequestClose:()=>void;/** iOS: 닫히는 애니메이션까지 끝난 뒤(그 뒤에 다른 화면이나 로그인 창을 연다) */onDismiss?:()=>void}) {
  return <PixelBottomSheet visible={visible} title={t('goal.new')} onRequestClose={onRequestClose} onDismiss={onDismiss}>
    <PixelButton label={t('together.solo')} variant="secondary" onPress={onSolo}/>
    <PixelButton label={t('together.title')} variant="secondary" onPress={onTogether}/>
  </PixelBottomSheet>;
}
export type TogetherMode='each'|'one';
/** 내 이름 칸과 내 스티커 줄. 만들기, 초대 받기, 목표 설정이 같이 쓴다. */
function MemberFields({name,onChangeName,nameError,nameMaxLength,onNameBlur,sticker,onChooseSticker,stickerError}:{name:string;onChangeName:(name:string)=>void;nameError?:string;nameMaxLength?:number;onNameBlur?:()=>void;sticker:StickerId;onChooseSticker:()=>void;stickerError?:string}) {
  return <>
    <PixelInput label={t('together.myName')} value={name} onChangeText={onChangeName} maxLength={nameMaxLength} error={nameError} onBlur={onNameBlur}/>
    <View style={{gap:8}}><PixelText>{t('together.mySticker')}</PixelText><StickerSummary value={sticker} onChange={onChooseSticker}/><FieldError message={stickerError}/></View>
  </>;
}
/**
 * 친구와 함께 만들기: 어떻게 채울까요 → 목표 이름 → 판 종류(칸 수 또는 종료일) → 내 이름 → 내 스티커 → [만들고 초대하기].
 * 내 이름과 스티커는 지난번 함께 목표 값을 호스트가 채워 넘긴다. 금칙어와 스티커 겹침 문구는 서버 응답을 그대로 error로 넘긴다.
 */
export function TogetherGoalScreen({mode,onChangeMode,name,onChangeName,nameMaxLength,nameError,onNameBlur,kind,onChangeKind,count,onChangeCount,countMax,countError,end,myName,onChangeMyName,myNameMaxLength,myNameError,onMyNameBlur,sticker,onChooseSticker,stickerError,maxFriends,error,onSubmit,submitDisabled=false,submitting=false,onBack}:{
  mode:TogetherMode;onChangeMode:(mode:TogetherMode)=>void;
  name:string;onChangeName:(name:string)=>void;nameMaxLength?:number;nameError?:string;onNameBlur?:()=>void;
  kind:BoardKind;onChangeKind:(kind:BoardKind)=>void;count:string;onChangeCount:(count:string)=>void;/** 칸 수 상한(서버 값) */countMax?:number;/** 칸 수 칸 바로 아래 문구(목표 설정의 SlotsField와 같은 자리) */countError?:string;
  /** 달력판 종료일(선택). 새 목표와 같다 */end?:{mode:EndDateMode;onChangeMode:(mode:EndDateMode)=>void;date?:string;onChangeDate:(date:string)=>void;today:string;todayLabel:string};
  myName:string;onChangeMyName:(name:string)=>void;myNameMaxLength?:number;myNameError?:string;onMyNameBlur?:()=>void;
  sticker:StickerId;onChooseSticker:()=>void;stickerError?:string;
  /** 초대할 수 있는 친구 수(서버 값) */maxFriends:number;/** 서버가 거절한 칸의 문구를 버튼 바로 위에도 한 번 더(그 칸이 화면 밖이어도 보이게) */error?:string;onSubmit:()=>void;submitDisabled?:boolean;submitting?:boolean;onBack:()=>void}) {
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title={t('together.title')} onBack={onBack}/>}>
    <View style={{gap:8}}>
      <PixelText>{t('together.how')}</PixelText>
      <OptionButtons options={[{key:'each',label:t('together.each')},{key:'one',label:t('together.one')}] as const} value={mode} onChange={onChangeMode}/>
      <Small>{mode==='each'?t('together.eachHint'):t('together.oneHint')}</Small>
    </View>
    <PixelInput label={t('goal.name')} value={name} onChangeText={onChangeName} placeholder={t('goal.name')} maxLength={nameMaxLength} error={nameError} onBlur={onNameBlur}/>
    <BoardTypePicker value={kind} onChange={onChangeKind}/>
    {kind==='tally'&&<View style={{gap:8}}>
      <SlotCountPicker value={count} onChange={onChangeCount} max={countMax}/>
      {countError&&<View accessible accessibilityRole="alert"><Small>{countError}</Small></View>}
    </View>}
    {kind==='calendar'&&end&&<View style={{gap:8}}>
      <PixelText>{t('goal.endDateOptional')}</PixelText>
      <OptionButtons options={[{key:'none',label:t('goal.endDateNone')},{key:'pick',label:t('goal.endDatePick')}] as const} value={end.mode} onChange={end.onChangeMode}/>
      <Small>{end.mode==='pick'?t('goal.endDatePickHint'):t('goal.endDateNoneHint')}</Small>
      {end.mode==='pick'&&<EndDatePicker firstAllowed={end.today} selected={end.date} onSelect={end.onChangeDate} hint={t('goal.startsToday',end.todayLabel)}/>}
    </View>}
    <MemberFields name={myName} onChangeName={onChangeMyName} nameMaxLength={myNameMaxLength} nameError={myNameError} onNameBlur={onMyNameBlur} sticker={sticker} onChooseSticker={onChooseSticker} stickerError={stickerError}/>
    <Small>{t('together.inviteLimit',maxFriends)}</Small>
    {error&&<PixelText accessibilityRole="alert">{error}</PixelText>}
    <PixelButton label={t('together.createAndInvite')} disabled={submitDisabled} loading={submitting} onPress={onSubmit}/>
  </RetroScreen>;
}

// ── 초대 받기 ───────────────────────────────────────────────────────
/** 초대 링크를 열었는데 로그인 전: 「은주님이 함께하자고 했어요」 + 로그인 버튼(계정으로 시작 화면과 같은 배치). */
export function InviteLoginPrompt({ownerName,goalName,loginButtons,onBack}:{ownerName:string;goalName:string;/** KakaoLoginButton, GoogleLoginButton, AppleLoginButton(iOS) */loginButtons:ReactNode;onBack?:()=>void}) {
  return <RetroScreen scrollable={false} style={{gap:16,flex:1}} header={onBack?<ScreenHeader title={t('invite.title')} onBack={onBack}/>:undefined}>
    <View style={{flex:1,justifyContent:'center'}}>
      <View style={{alignItems:'center',marginBottom:-22,zIndex:1}}><Mascot pose="grin" size={96}/></View>
      <PixelPanel contentStyle={{gap:20,paddingTop:36,paddingBottom:28}}>
        <View style={{gap:8,alignItems:'center'}}>
          <PixelText variant="title" style={{fontSize:20,lineHeight:28,textAlign:'center'}}>{t('invite.loginTitle',ownerName)}</PixelText>
          <Small center>{t('invite.loginDescription',goalName)}</Small>
        </View>
        <View style={{gap:10}}>{loginButtons}</View>
      </PixelPanel>
    </View>
  </RetroScreen>;
}
/**
 * 함께하기: 목표 미리보기(판 종류, 칸 수, 초대한 사람, 지금 함께하는 사람의 판) → 내 이름 → 내 스티커 → [함께하기].
 * 같은 목표에서 이미 쓰는 스티커는 고르기 화면에서 흐리게 하고, 그래도 겹치면 서버 문구를 stickerError로 넘긴다.
 */
export function InviteJoinScreen({goalName,kind,total,ownerName,members,myName,onChangeMyName,myNameMaxLength,myNameError,onMyNameBlur,sticker,onChooseSticker,stickerError,onJoin,joinDisabled=false,joining=false,onBack}:{
  goalName:string;kind:BoardKind;/** 적립판 칸 수 */total?:number;ownerName:string;/** 지금 함께하는 사람 판(들어온 순서) */members:readonly FriendBoardItem[];
  myName:string;onChangeMyName:(name:string)=>void;myNameMaxLength?:number;myNameError?:string;onMyNameBlur?:()=>void;
  sticker:StickerId;onChooseSticker:()=>void;stickerError?:string;onJoin:()=>void;joinDisabled?:boolean;joining?:boolean;onBack:()=>void}) {
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title={t('invite.title')} onBack={onBack}/>}>
    <PixelPanel title={goalName}><View style={{gap:10,paddingTop:8}}>
      <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
        <PixelBadge label={kind==='tally'?t('board.tally'):t('board.calendar')}/>
        <View style={{flex:1}}><Small>{kind==='tally'&&total!==undefined?t('invite.slotsInvitedBy',total,ownerName):t('invite.invitedBy',ownerName)}</Small></View>
      </View>
      {members.length>0&&<View style={{gap:8}}>{members.map(member=><FriendBoardStrip key={member.id} name={member.name} sticker={member.sticker} board={member.board}/>)}</View>}
    </View></PixelPanel>
    <MemberFields name={myName} onChangeName={onChangeMyName} nameMaxLength={myNameMaxLength} nameError={myNameError} onNameBlur={onMyNameBlur} sticker={sticker} onChooseSticker={onChooseSticker} stickerError={stickerError}/>
    <PixelButton label={t('invite.join')} disabled={joinDisabled} loading={joining} onPress={onJoin}/>
  </RetroScreen>;
}
export type InviteProblem='full'|'closed';
const PROBLEM_POSE:Record<InviteProblem,MascotPose>={full:'shy',closed:'curious'};
/**
 * 초대 문제: 자리가 다 찼을 때(full)와 그 밖의 모든 경우(closed: 지워짐, 링크 바뀜, 내보내짐, 차단).
 * 차단은 드러내지 않는다 — 차단당한 사람도 closed를 본다.
 */
export function InviteProblemScreen({problem,max,onHome,onBack}:{problem:InviteProblem;/** full: 인원 상한 */max:number;onHome:()=>void;onBack:()=>void}) {
  return <RetroScreen style={{gap:20}} header={<ScreenHeader title={t('invite.title')} onBack={onBack}/>}>
    <View accessible accessibilityRole="alert" style={{alignItems:'center',paddingTop:40,gap:16}}>
      <Mascot pose={PROBLEM_POSE[problem]} size={96}/>
      <PixelText variant="title" style={{textAlign:'center'}}>{problem==='full'?t('invite.fullTitle'):t('invite.closedTitle')}</PixelText>
      <PixelText style={{textAlign:'center'}}>{problem==='full'?t('invite.fullDetail',max):t('invite.closedDetail')}</PixelText>
    </View>
    <PixelButton label={t('common.goHome')} onPress={onHome}/>
  </RetroScreen>;
}

// ── 목표 설정 ──────────────────────────────────────────────────────
export type MemberRow={id:string;name:string;sticker:StickerId;me?:boolean;owner?:boolean};
/**
 * 목표 설정 「함께하는 사람 n/6」. onKick을 주면(만든 사람이 볼 때) 나 말고 모두에게 [내보내기].
 * onRotate(만든 사람만)는 [친구 초대하기] 아래 같은 모양의 [초대 링크 새로 만들기](새 조립).
 */
export function MemberList({members,max,onKick,onInvite,onRotate}:{members:readonly MemberRow[];max:number;onKick?:(id:string)=>void;onInvite?:()=>void;onRotate?:()=>void}) {
  return <PixelPanel title={t('together.peopleOf',members.length,max)}><View style={{gap:4,paddingTop:6}}>
    {members.map(member=><View key={member.id} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:44}}>
      <StickerGlyph id={member.sticker} size={24}/>
      <PixelText style={{flex:1}}>{member.me?t('together.meName',member.name):member.name}</PixelText>
      {member.owner&&<PixelBadge label={t('together.owner')}/>}
      {onKick&&!member.me&&<Pressable accessibilityRole="button" accessibilityLabel={t('together.kickA11y',member.name)} onPress={()=>onKick(member.id)} hitSlop={{top:12,bottom:12,left:8,right:8}}>
        <PixelText variant="caption" style={[caption,{textDecorationLine:'underline'}]}>{t('together.kick')}</PixelText>
      </Pressable>}
    </View>)}
    {(onInvite||onRotate)&&<View style={{gap:8,paddingTop:8}}>
      {onInvite&&<PixelButton label={t('together.inviteFriends')} variant="secondary" onPress={onInvite}/>}
      {onRotate&&<PixelButton label={t('together.rotate')} variant="secondary" onPress={onRotate}/>}
    </View>}
  </View></PixelPanel>;
}
/** 만든 사람 [삭제하기] 안내. 각자 판은 내 판이 지워지고, 한 판은 내가 붙인 칸이 지워진다(서버 remove_member). 확인 창도 같은 문구 */
export const deleteOwnerDescription=(mode:TogetherMode)=>mode==='each'?t('together.deleteOwner'):t('together.deleteOwnerOne');
/** 「문제가 있을 때」: 신고, 차단, 나가기. 줄마다 누르면 무슨 일이 생기는지 한 줄씩 (App Store 심사 지침 1.2). */
function ProblemSection({mode,onReport,onBlock,onLeave}:{mode:TogetherMode;onReport?:()=>void;onBlock:()=>void;onLeave:()=>void}) {
  return <PixelPanel title={t('together.problems')}><View>
    {onReport&&<SettingHint label={t('together.report')} hint={t('together.reportHint')} onPress={onReport}/>}
    <SettingHint label={t('together.block')} hint={t('together.blockHint')} onPress={onBlock}/>
    <SettingHint label={t('together.leave')} hint={mode==='each'?t('together.leaveHintEach'):t('together.leaveHintOne')} onPress={onLeave}/>
  </View></PixelPanel>;
}
/**
 * 함께 목표의 목표 설정. 만든 사람(owner)은 목표 이름과 칸 수(적립판, slots)를 고치고 [삭제하기]가 있다. 나머지 사람은 목표 이름 대신
 * 「목표 이름과 칸 수는 만든 사람이 바꿔요」. 모두 내 이름, 내 스티커, 함께하는 사람(members), 문제가 있을 때를 본다.
 * 완성한 판은 만든 사람에게도 onChangeGoalName과 slots를 넘기지 않는다(이름과 칸 수 칸이 없다).
 */
export function TogetherSettingsScreen({role,mode,goalName,onChangeGoalName,goalNameMaxLength,goalNameError,slots,ownerName,completed=false,myName,onChangeMyName,myNameMaxLength,myNameError,sticker,onChooseSticker,stickerError,members,onSave,saveDisabled=false,saveError,onReport,onBlock,onLeave,onDelete,onBack}:{
  role:'owner'|'member';mode:TogetherMode;
  goalName:string;/** 만든 사람만 */onChangeGoalName?:(name:string)=>void;goalNameMaxLength?:number;goalNameError?:string;
  /** 만든 사람의 진행 중인 적립판만. 늘리기만 된다(새 조립, GoalSettingsScreen과 같은 칸) */slots?:SlotsFieldView;
  /** 빈 문자열이면(내가 만든 사람을 차단해 기기에 없음) 이름 없는 안내 */ownerName:string;/** 완성한 판: 아무도 바꿀 수 없어 안내를 그리지 않는다 */completed?:boolean;
  myName:string;onChangeMyName:(name:string)=>void;myNameMaxLength?:number;myNameError?:string;
  sticker:StickerId;onChooseSticker:()=>void;stickerError?:string;
  /** MemberList */members?:ReactNode;onSave:()=>void;saveDisabled?:boolean;
  /** 저장이 거절된 칸의 문구를 [저장하기] 바로 위에도 한 번 더(그 칸이 화면 밖이어도 보이게, 친구와 함께 만들기의 error와 같은 자리) */saveError?:string;
  /** 없으면(신고할 다른 사람이 없음) 줄을 그리지 않는다 */onReport?:()=>void;onBlock:()=>void;onLeave:()=>void;/** 만든 사람만 */onDelete?:()=>void;onBack:()=>void}) {
  const owner=role==='owner';
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title={t('goal.settings')} onBack={onBack}/>}>
    {owner
      ?onChangeGoalName&&<PixelInput label={t('goal.name')} value={goalName} onChangeText={onChangeGoalName} maxLength={goalNameMaxLength} error={goalNameError}/>
      :<PixelPanel title={goalName}>{!completed&&<View style={{paddingTop:6}}><Small>{ownerName?t('together.ownerEdits',ownerName):t('together.ownerEditsNoName')}</Small></View>}</PixelPanel>}
    {owner&&slots&&<SlotsField {...slots}/>}
    <MemberFields name={myName} onChangeName={onChangeMyName} nameMaxLength={myNameMaxLength} nameError={myNameError} sticker={sticker} onChooseSticker={onChooseSticker} stickerError={stickerError}/>
    {members}
    {saveError&&<PixelText accessibilityRole="alert">{saveError}</PixelText>}
    <PixelButton label={t('goal.save')} disabled={saveDisabled} onPress={onSave}/>
    <ProblemSection mode={mode} onReport={onReport} onBlock={onBlock} onLeave={onLeave}/>
    {owner&&onDelete&&<DeleteSection onDelete={onDelete} description={deleteOwnerDescription(mode)}/>}
  </RetroScreen>;
}

// ── 차단 ─────────────────────────────────────────────────────────
function PickRow({label,sticker,onPress}:{label:string;sticker?:StickerId;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:48,borderBottomWidth:1,borderColor:ROW_LINE}}>
    {sticker&&<StickerGlyph id={sticker} size={24}/>}<PixelText style={{flex:1}}>{label}</PixelText><PixelIcon name="chevron" size={14}/>
  </Pressable>;
}
/**
 * 「누구를 차단할까요」 시트. 고르면 호스트가 togetherDialogs.blockConfirm으로 확인을 받는다(시트 위에 띄우려면 overlay).
 * 신고 고르기는 같은 시트에 title과 사람 위 extraRows(「목표 이름」)를 넘긴다(새 조립). 고를 사람이 없으면 [닫기]만 보인다.
 */
export function BlockPickSheet({visible,title=t('block.pickTitle'),extraRows=[],people,onPick,onRequestClose,overlay}:{visible:boolean;title?:string;/** 사람 위에 두는 줄(스티커 없음) */extraRows?:readonly {id:string;label:string}[];people:readonly {id:string;name:string;sticker:StickerId}[];onPick:(id:string)=>void;onRequestClose:()=>void;overlay?:ReactNode}) {
  return <PixelBottomSheet visible={visible} title={title} onRequestClose={onRequestClose} overlay={overlay}>
    <View>
      {extraRows.map(row=><PickRow key={row.id} label={row.label} onPress={()=>onPick(row.id)}/>)}
      {people.map(person=><PickRow key={person.id} label={person.name} sticker={person.sticker} onPress={()=>onPick(person.id)}/>)}
    </View>
    <PixelButton label={t('common.close')} variant="secondary" onPress={onRequestClose}/>
  </PixelBottomSheet>;
}
/** 이름은 차단할 때 남긴 이름이라 없을 수 있다. 스티커와 목표 이름은 서버가 아직 주지 않아 없으면 그리지 않는다. */
export type BlockedPerson={id:string;name:string|null;sticker?:StickerId;/** 차단한 함께 목표 이름 */goalName?:string};
/** 앱 설정 「차단한 사람」과 [풀기]. 이름이 없으면 이름 줄을 비우고 [풀기] 접근성 이름은 「풀기」만. */
export function BlockedPeopleScreen({people,onUnblock,onBack}:{people:readonly BlockedPerson[];onUnblock:(id:string)=>void;onBack:()=>void}) {
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title={t('block.title')} onBack={onBack}/>}>
    <Small>{t('block.hint')}</Small>
    {people.length
      ?<PixelPanel><View>{people.map(person=><View key={person.id} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:56}}>
        {person.sticker&&<StickerGlyph id={person.sticker} size={24}/>}
        <View style={{flex:1}}><PixelText>{person.name??''}</PixelText>{person.goalName&&<Small>{t('block.where',person.goalName)}</Small>}</View>
        <PixelButton label={t('block.unblock')} accessibilityLabel={person.name?t('block.unblockA11y',person.name):t('block.unblock')} variant="secondary" minHeight={40} onPress={()=>onUnblock(person.id)}/>
      </View>)}</View></PixelPanel>
      :<EmptyState title={t('block.empty')}/>}
  </RetroScreen>;
}

/** 함께 목표 확인 창 문구. PixelDialogModal(basic)에 넘긴다. 값은 읽는 순간의 언어로 만든다. */
export const togetherDialogs={
  /** + 시트 [친구와 함께], 친구와 함께 만들기에서 로그인 전. [로그인]은 계정 연결로 간다. */
  get login(){return {title:t('together.loginTitle'),description:t('together.loginDescription'),primaryLabel:t('account.login'),secondaryLabel:t('common.close')};},
  /** 한 판 친구 칸을 눌렀을 때: 누가 언제 붙였는지. when은 「9월 3일 15:05」. */
  placedBy:(name:string,when:string)=>({title:t('together.placedBy',[name]),description:t('together.placedAt',when),primaryLabel:t('common.ok')}),
  /**
   * 한 판 달력판에서 친구가 붙인 날을 눌렀을 때. people은 붙인 순서, lines는 「지우 9월 3일 15:05」처럼 붙인 순서.
   * 제목은 「나와 지우님이 붙였어요」처럼 나에게는 「님」을 붙이지 않는다.
   * action: 내가 더 붙일 수 있으면 [나도 붙이기], 그날 나도 붙였으면 [내 기록 보기], 아니면 [확인]만.
   */
  placedOnDay:(people:readonly {name:string;me?:boolean}[],lines:readonly string[],action:'placeToo'|'myRecord'|null)=>{
    const title=t('together.placedBy',people.filter(p=>!p.me).map(p=>p.name),people.some(p=>p.me));
    return action
      ?{title,description:lines.join('\n'),secondaryLabel:t('common.close'),primaryLabel:action==='placeToo'?t('together.placeToo'):t('together.myRecord')}
      :{title,description:lines.join('\n'),primaryLabel:t('common.ok')};
  },
  /** 한 판에 연결 없이 붙이려 할 때. 붙이지 않는다. */
  get offlineOne(){return {title:t('together.offlineOne'),description:t('together.offlineOneDescription'),primaryLabel:t('common.ok')};},
  /** 한 판에서 내가 붙인 칸을 다른 사람이 먼저 붙였다(slot_taken). 칸은 이미 지워졌다. */
  get slotTaken(){return {title:t('together.slotTaken'),description:t('together.slotTakenDescription'),primaryLabel:t('common.ok')};},
  blockConfirm:(name:string)=>({title:t('block.confirmTitle',name),description:t('block.confirmDescription',name),secondaryLabel:t('common.cancel'),primaryLabel:t('block.confirm')}),
  /** 함께 목표 동작이 실패했을 때. detail은 실패 낱말 문구(호스트가 errorMessage로 만든다). */
  failed:(title:string,detail:string)=>({title,description:detail,primaryLabel:t('common.ok')}),
  /** 목표 설정 [이 목표에서 나가기]. 설명은 방식마다 「문제가 있을 때」 줄과 같다. */
  leave:(mode:TogetherMode)=>({title:t('together.leaveTitle'),description:mode==='each'?t('together.leaveHintEach'):t('together.leaveHintOne'),secondaryLabel:t('common.cancel'),primaryLabel:t('together.leaveConfirm')}),
  /** 만든 사람이 [내보내기]. */
  kick:(name:string)=>({title:t('together.kickTitle',name),description:t('together.kickDescription',name),secondaryLabel:t('common.cancel'),primaryLabel:t('together.kick')}),
  /** 만든 사람이 [초대 링크 새로 만들기]. 확인하면 새 링크로 공유 창을 연다. */
  get rotate(){return {title:t('together.rotateTitle'),description:t('together.rotateDescription'),secondaryLabel:t('common.cancel'),primaryLabel:t('together.rotateConfirm')};},
  /** 신고 확인. target은 「목표 이름」 또는 「지우님의 이름」. */
  report:(target:string)=>({title:t('report.confirmTitle',target),description:t('report.confirmDescription'),secondaryLabel:t('common.cancel'),primaryLabel:t('report.confirm')}),
  get reportDone(){return {title:t('report.doneTitle'),description:t('report.doneDescription'),primaryLabel:t('common.ok')};},
  /** 목표가 지워졌거나 내가 나왔다(not_member, not_shared). 확인하면 목표 탭으로. */
  get gone(){return {title:t('together.goneTitle'),description:t('together.goneDescription'),primaryLabel:t('common.ok')};},
  /** 그사이 만든 사람이 바뀌었다(not_owner). 확인하면 화면을 다시 읽는다. */
  get ownerOnly(){return {title:t('together.ownerOnly'),description:t('together.ownerOnlyDescription'),primaryLabel:t('common.ok')};},
};
