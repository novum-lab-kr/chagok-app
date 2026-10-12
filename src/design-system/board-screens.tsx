import React,{memo,useCallback,useContext,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import {PanResponder,Pressable,View} from 'react-native';
import {retro} from './tokens';
import {touchSlop} from './touch';
import {CompletionSticker,PixelButton,PixelFrame,PixelIcon,PixelInput,PixelPanel,PixelText,SCREEN_PADDING,StickerGrid} from './components';
import {ActionSymbol,stickerLabel,type StickerId} from './sticker-glyphs';
import {AppHeader,BoardProgressRow,BoardTypePicker,DeleteSection,EmptyState,EndDatePicker,GoalListHeader,GoalSummaryCard,OptionButtons,PeriodField,RetroScreen,ScreenHeader,ShortNotice,SlotCountPicker,StickerSummary,useScrollToCenter,CenteringScrollView,type BoardKind,type GoalListTab} from './composition-controls';
import {CalendarBoard} from './calendar';
import {GoalStickerCell} from './screen-compositions';

/**
 * 홈 목록·판 상세·목표 설정 화면 (PRD 4.1–4.7, 2026-09-29 Storybook 확정 시안).
 * props만 받는다. Storybook `Screens / Home structure · proposals`와 앱 라우트가 같은 조합을 쓴다.
 * 확인 다이얼로그는 화면 밖에서 얹는다(앱은 PixelDialogModal).
 */
const caption={color:retro.color.buttonText};
function Small({children}:{children:ReactNode}) {
  return <PixelText variant="caption" style={caption}>{children}</PixelText>;
}

// ── 목록 ──────────────────────────────────────────────────────────
export type GoalCardItem={id:string;name:string;sticker:StickerId;/** 배지: 적립판 / 달력판 */kind:string;percent:number;/** 예: ['40% 채웠어요'], ['100%', '9/29 완성'] */status:readonly string[]};
/**
 * 목표 목록. 목표가 하나도 없으면 탭 아래 안내 상자만 둔다(2026-09-30 A안). 만드는 동작은 `+`다.
 * 완성한 판만 있고 진행 중인 목표가 없을 때의 문구는 시안이 없어 목록 안내와 같은 결로 두었다.
 */
export function GoalListScreen({tab,onTab,active,completed,onOpen,onAdd,onSettings,addTargetRef,footer,notice}:{/** 스크롤 밖 맨 아래. 광고 배너 자리(광고 제거를 샀으면 비움, PRD 4.12) */footer?:ReactNode;/** 목록 맨 위 안내(체험 열림 카드, 2026-10-12) */notice?:ReactNode;tab:GoalListTab;onTab:(tab:GoalListTab)=>void;active:readonly GoalCardItem[];completed:readonly GoalCardItem[];onOpen:(id:string)=>void;onAdd:()=>void;onSettings?:()=>void;addTargetRef?:React.Ref<View>}) {
  const shown=tab==='active'?active:completed;
  const empty=tab==='completed'
    ?<EmptyState title="아직 완성한 판이 없어요" description="판을 다 채우거나 달력판을 완성하면 여기에 모여요."/>
    :completed.length===0
      ?<EmptyState title="아직 목표가 없어요" description="오른쪽 위 ＋를 눌러 첫 목표를 만들어요."/>
      :<EmptyState title="진행 중인 목표가 없어요" description="오른쪽 위 ＋를 눌러 새 목표를 만들어요."/>;
  // 앱 헤더와 탭·+ 줄을 함께 고정한다. 목표가 많아도 새 목표와 탭 전환에 바로 닿는다 (2026-09-30).
  return <View style={{flex:1}}>
    <RetroScreen style={{gap:16}} header={<View style={{gap:16}}>
    <AppHeader onSettings={onSettings}/>
    <GoalListHeader tab={tab} onTab={onTab} onAdd={onAdd} addTargetRef={addTargetRef} counts={{active:active.length,completed:completed.length}}/>
  </View>}>
    {notice}
    {shown.length?<View style={{gap:12}}>{shown.map(item=><GoalSummaryCard key={item.id} name={item.name} sticker={item.sticker} kind={item.kind} percent={item.percent} status={item.status} onPress={()=>onOpen(item.id)}/>)}</View>:empty}
    </RetroScreen>
    {footer}
  </View>;
}

// ── 판 상세 ──────────────────────────────────────────────────────
export type TallyBoardView={kind:'tally';total:number;/** 방금 붙인 칸 번호: 붙이기 모션 */justPlaced?:number;/** 붙인 칸 번호(1부터) → 그 칸의 스티커 */filled:Readonly<Record<number,StickerId>>;/** 사진 또는 메모가 있는 칸 */recorded?:ReadonlySet<number>;onPress:(n:number)=>void;onOpenRecord:(n:number)=>void;/** 튜토리얼이 잴 칸: 다음 빈칸, 마지막 붙인 칸 */nextSlotRef?:React.Ref<View>;recordSlotRef?:React.Ref<View>};
export type CalendarBoardView={kind:'calendar';year:number;month:number;/** 방금 붙인 날 */justPlaced?:string;records:Record<string,StickerId>;recordedDates?:ReadonlySet<string>;/** 오늘 칸 강조. 완성한 판은 두지 않는다 */selectedDate?:string;isDateEnabled:(date:string)=>boolean;canGoPrev:boolean;canGoNext:boolean;onSelect:(date:string)=>void;onMonthChange:(year:number,month:number)=>void;onOpenRecord:(date:string)=>void};
/**
 * 판 상세. 판 조작: 빈칸 한 번 = 붙이기, 붙인 칸 한 번 = 기록 열기, 꾹 = 떼기 (PRD 4.5).
 * 완성한 판도 진행 중인 판처럼 붙이고 뗀다(2026-10-08) — 완성 표시는 그대로 (4.7).
 */
export function BoardDetailScreen({name,sticker,completed,progress,board,onBack,onSettings,completionTargetRef,animateCompletion=false,notice}:{/** 판 아래에 떠 있는 안내(완성 뒤 권하기, 2026-10-12) */notice?:ReactNode;/** 완성 순간: [완성] 스티커 붙이기 모션 (PRD 4.7) */animateCompletion?:boolean;name:string;/** 기본 스티커 */sticker:StickerId;completed:boolean;progress:{value:number;total:number;percentLabel:string};board:TallyBoardView|CalendarBoardView;onBack:()=>void;onSettings:()=>void;completionTargetRef?:React.Ref<View>}) {
  // 판은 칸 크기를 재고 다음 빈칸으로 스크롤한 뒤에 보인다. 재기 전 프레임은 픽셀 테두리가 빠져 있어,
  // 칸이 많은 판을 열 때 화면이 넘어오는 동안 그대로 보였다 (2026-09-30 실기기 녹화).
  const [ready,setReady]=useState(false);
  const reveal=useCallback(()=>setReady(true),[]);
  const bottomInset=useContext(SafeAreaInsetsContext)?.bottom??0;
  // 달력판은 가리지 않는다. 틀은 PixelFrame이 그리기 전에 재고, 가리면 첫 layout 이벤트가 버려질 때 판이 투명한 채 남는다.
  const visible=board.kind==='calendar'||ready;
  // 판 윗부분(테두리·제목·진행 줄)은 고정하고 칸만 판 안에서 스크롤한다. 빈칸으로 옮겨도 목표가 보인다 (2026-09-30 사용자 결정).
  // 칸이 적으면 판은 내용 높이 그대로이고, 넘치면 남은 높이까지 줄어든다.
  return <View style={{flex:1}}><RetroScreen scrollable={false} style={{gap:12}} header={<ScreenHeader title={completed?'완성한 판':'내 목표'} onBack={onBack}/>}>
    <View testID="board-panel" style={{opacity:visible?1:0,flexShrink:1}}>
    <PixelPanel style={{flexShrink:1}} contentStyle={{flexShrink:1}} title={name} action={<Pressable accessibilityRole="button" accessibilityLabel="목표 설정" onPress={onSettings} hitSlop={touchSlop({width:40,height:40})} style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><PixelIcon name="gear" size={36}/></Pressable>}>
      <BoardProgressRow value={progress.value} total={progress.total} percentLabel={progress.percentLabel} completed={completed} sticker={sticker} completionTargetRef={completionTargetRef} animateCompletion={animateCompletion}/>
      <View style={{height:retro.layout.progressGridGap}}/>
      <CenteringScrollView testID="board-scroll" style={{flexGrow:0,flexShrink:1}}>
      {board.kind==='calendar'
        ?<CalendarSwipe board={board}><CalendarBoard year={board.year} month={board.month} records={board.records} recordedDates={board.recordedDates} selectedDate={board.selectedDate} onSelect={board.onSelect} onMonthChange={board.onMonthChange}
          isDateEnabled={board.isDateEnabled} canGoPrev={board.canGoPrev} canGoNext={board.canGoNext} onOpenRecord={board.onOpenRecord} poppedDate={board.justPlaced}/></CalendarSwipe>
        :<TallyGrid board={board} sticker={sticker} onSettled={reveal}/>}
      </CenteringScrollView>
    </PixelPanel>
    </View>
  </RetroScreen>
  {notice&&<View style={{position:'absolute',left:SCREEN_PADDING,right:SCREEN_PADDING,bottom:bottomInset+SCREEN_PADDING}}>{notice}</View>}
  </View>;
}
/** 달력판은 좌우 스와이프로도 달을 옮긴다 (PRD 4.3). 화살표를 숨긴 방향으로는 가지 않는다. */
function CalendarSwipe({board,children}:{board:CalendarBoardView;children:ReactNode}) {
  const {year,month,canGoPrev,canGoNext,onMonthChange}=board;
  const shift=useCallback((delta:number)=>{
    if(delta<0?!canGoPrev:!canGoNext) return;
    const d=new Date(year,month-1+delta,1);onMonthChange(d.getFullYear(),d.getMonth()+1);
  },[year,month,canGoPrev,canGoNext,onMonthChange]);
  // PanResponder는 첫 렌더 값을 가두지 않도록 useMemo로 만든다.
  const swipe=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>24&&Math.abs(g.dx)>Math.abs(g.dy)*1.5,
    onPanResponderRelease:(_,g)=>{if(g.dx<=-48)shift(1);else if(g.dx>=48)shift(-1);},
  }),[shift]);
  return <View {...swipe.panHandlers}>{children}</View>;
}
function assignRef<T>(ref:React.Ref<T>|undefined,value:T|null) {
  if(typeof ref==='function') ref(value);
  else if(ref) (ref as React.RefObject<T|null>).current=value;
}
/**
 * 적립판 칸 하나. 칸 번호를 받아 같은 함수를 모든 칸이 나눠 쓰므로, 붙이거나 뗄 때 상태가 바뀐 칸만 다시 그린다.
 * 칸 수 상한이 없어 칸마다 새 함수를 넘기면 붙일 때마다 판 전체를 다시 그렸다(300칸 약 33ms → 측정은
 * board-render.perf.test.tsx, 2026-10-04).
 */
const TallyCell=memo(function TallyCell({n,sticker,state,hasRecord,popIn,onPress,onOpenRecord}:{n:number;sticker:StickerId;state:'filled'|'available'|'empty';hasRecord:boolean;popIn:boolean;onPress:(n:number)=>void;onOpenRecord?:(n:number)=>void}) {
  return <GoalStickerCell number={n} sticker={sticker} state={state} enabled hasRecord={hasRecord} popIn={popIn}
    onPress={()=>onPress(n)} onOpenRecord={onOpenRecord?()=>onOpenRecord(n):undefined}/>;
});
/**
 * 적립판 칸. 다음 빈칸을 화면 가운데로 스크롤한다 — 판을 열 때, 그리고 칸 수가 바뀌었을 때(칸 늘리기)만.
 * 붙일 때마다 옮기면 누르는 중에 판이 움직인다 (2026-09-30).
 * 옮긴 뒤(빈칸이 없으면 그리고 나서) onSettled를 부른다.
 */
function TallyGrid({board,sticker,onSettled}:{board:TallyBoardView;sticker:StickerId;onSettled:()=>void}) {
  const numbers=Array.from({length:board.total},(_,i)=>i+1);
  const next=numbers.find(n=>!board.filled[n]);
  const lastFilled=Math.max(0,...Object.keys(board.filled).map(Number));
  const scrollToCenter=useScrollToCenter();
  const nextNode=useRef<View|null>(null);
  /** 마지막으로 가운데로 옮긴 때의 칸 수 */
  const centeredTotal=useRef<number|null>(null);
  /** 판이 이미 보이면 부드럽게 옮긴다. 처음 열 때는 가린 채로 바로 옮긴다 */
  const settled=useRef(false);
  const {nextSlotRef}=board;
  const setNextNode=useCallback((node:View|null)=>{nextNode.current=node;assignRef(nextSlotRef,node);},[nextSlotRef]);
  const settle=()=>{settled.current=true;onSettled();};
  // 앱은 그릴 때마다 새 onPress·onOpenRecord를 넘긴다. 칸에는 늘 같은 함수를 주고, 누를 때 가장 최근 것을 부른다.
  const handlers=useRef({press:board.onPress,open:board.onOpenRecord});
  useLayoutEffect(()=>{handlers.current={press:board.onPress,open:board.onOpenRecord};});
  const press=useCallback((n:number)=>handlers.current.press(n),[]);
  const open=useCallback((n:number)=>handlers.current.open(n),[]);
  function centerNext() {
    const node=nextNode.current;
    if(!node||centeredTotal.current===board.total) return;
    centeredTotal.current=board.total;
    const animated=settled.current;
    // 스크롤 영역과 내용 높이가 같은 레이아웃에서 들어오도록 한 프레임 미룬다.
    requestAnimationFrame(()=>{void scrollToCenter(node,animated).then(settle);});
  }
  // 처음 layout 이벤트가 버려져도 판이 투명한 채 남지 않게 그린 직후에도 한 번 부른다(PixelFrame 참고). 이미 했으면 아무것도 하지 않는다.
  useLayoutEffect(()=>{if(next!==undefined) centerNext(); else if(!settled.current) settle();});
  return <View onLayout={next===undefined?settle:undefined}><StickerGrid>{numbers.map(n=>{
    const filled=board.filled[n];
    const cell=<TallyCell key={n} n={n} sticker={filled??sticker} state={filled?'filled':n===next?'available':'empty'}
      hasRecord={board.recorded?.has(n)??false} popIn={n===board.justPlaced} onPress={press} onOpenRecord={filled?open:undefined}/>;
    // 튜토리얼 대상 칸은 감싸서 잰다. 감싸는 View는 칸을 그대로 채운다.
    if(n===next) return <View key={n} ref={setNextNode} onLayout={centerNext} style={{width:'100%',height:'100%'}}>{cell}</View>;
    if(filled&&n===lastFilled) return <View key={n} ref={board.recordSlotRef} style={{width:'100%',height:'100%'}}>{cell}</View>;
    return cell;
  })}</StickerGrid></View>;
}

// ── 기본 스티커 선택 ────────────────────────────────────────────────
/** 기본 스티커 줄. [바꾸기]를 누르면 「기본 스티커」 화면을 연다 (PRD 4.12). */
function StickerField({value,onChoose,targetRef}:{value:StickerId;onChoose:()=>void;targetRef?:React.Ref<View>}) {
  return <View style={{gap:8}}><PixelText>기본 스티커</PixelText><View ref={targetRef}><StickerSummary value={value} onChange={onChoose}/></View></View>;
}

// ── 목표 설정 ──────────────────────────────────────────────────────
export type PeriodFieldView={startDate:string;endDate?:string;lastPlacedDate?:string;picking:boolean;onPick:()=>void;onChange:(date:string)=>void;onClear:()=>void};
/**
 * 진행 중인 목표의 설정: 이름 → 기본 스티커 → 기간(달력판) → [이 판 완성하기](종료일 없는 달력판) → 저장 → [삭제하기] (PRD 4.4).
 * 판 종류·칸 수 변경은 미확정이라 두지 않는다.
 */
export function GoalSettingsScreen({name,onChangeName,nameMaxLength,nameError,sticker,onChooseSticker,period,slots,onComplete,onSave,saveDisabled=false,onDelete,onBack}:{name:string;onChangeName:(name:string)=>void;nameMaxLength?:number;/** 이름 칸 아래 검사 문구 */nameError?:string;sticker:StickerId;/** [바꾸기]: 「기본 스티커」 화면을 연다 */onChooseSticker:()=>void;/** 달력판만 */period?:PeriodFieldView;/** 진행 중인 적립판만. 늘리기만 된다 (2026-09-30) */slots?:{current:number;value:string;onChange:(value:string)=>void;error?:string};/** 종료일 없는 달력판만. 누르면 호스트가 확인을 받는다 */onComplete?:()=>void;onSave:()=>void;saveDisabled?:boolean;onDelete:()=>void;onBack:()=>void}) {
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title="목표 설정" onBack={onBack}/>}>
    <PixelInput label="목표 이름" value={name} onChangeText={onChangeName} maxLength={nameMaxLength} error={nameError}/>
    <StickerField value={sticker} onChoose={onChooseSticker}/>
    {period&&<PeriodField {...period}/>}
    {slots&&<View style={{gap:8}}>
      <SlotCountPicker value={slots.value} onChange={slots.onChange} min={slots.current}/>
      <Small>{`지금 ${slots.current}칸 · 늘리기만 할 수 있어요`}</Small>
      {slots.error&&<View accessible accessibilityRole="alert"><Small>{slots.error}</Small></View>}
    </View>}
    {onComplete&&<View style={{gap:8}}><Small>종료일이 없는 달력판은 여기서 완성해요. 완성해도 계속하기로 다시 이어 쓸 수 있어요.</Small><PixelButton label="이 판 완성하기" variant="secondary" icon={<ActionSymbol name="check" size={16}/>} onPress={onComplete}/></View>}
    <PixelButton label="저장하기" disabled={saveDisabled} onPress={onSave}/>
    <DeleteSection onDelete={onDelete}/>
  </RetroScreen>;
}
/** 완성한 판의 설정. 읽기 전용이고 삭제만 할 수 있다 (PRD 4.4, 4.7). */
export function CompletedGoalSettingsScreen({name,sticker,boardLabel,periodLabel,completedLabel,onDelete,onBack}:{name:string;sticker:StickerId;/** 예: '적립판 · 20칸', '달력판' */boardLabel:string;/** 달력판만. 예: '9월 1일 – 9월 23일', '9월 1일부터' */periodLabel?:string;/** 예: '9월 24일' */completedLabel:string;onDelete:()=>void;onBack:()=>void}) {
  // 마지막 줄은 밑줄을 두지 않는다. 바로 아래 [삭제하기] 구역의 윗줄과 겹쳐 빈 줄처럼 보인다 (2026-10-09)
  const row=(label:string,value:string,last=false)=><View style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:44,borderBottomWidth:last?0:retro.shape.cellBorder,borderColor:retro.color.ink}}><PixelText style={{width:108}}>{label}</PixelText><PixelText style={{flex:1}}>{value}</PixelText></View>;
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="목표 설정" onBack={onBack}/>}>
    <ShortNotice emphasis title="완성한 판이에요" detail={`${completedLabel}에 완성했어요. 판의 칸과 기록은 고칠 수 있고, 목표는 삭제만 할 수 있어요.`}/>
    <View>
      {/* 정보 블록 오른쪽에 스티커를 붙이듯 비스듬히 올린다. 값 글자와 겹치지 않도록 짧은 값이 오는 줄 위에 둔다. */}
      <View pointerEvents="none" style={{position:'absolute',right:0,top:50,zIndex:1}}><CompletionSticker sticker={sticker} tilted/></View>
      {row('목표 이름',name)}
      {row('기본 스티커',stickerLabel(sticker))}
      {row('판 종류',boardLabel,periodLabel===undefined)}
      {periodLabel!==undefined&&row('기간',periodLabel,true)}
    </View>
    <DeleteSection onDelete={onDelete}/>
  </RetroScreen>;
}

// ── 새 목표 ──────────────────────────────────────────────────────
export type EndDateMode='none'|'pick';
/** 새 목표: 이름 → 판 종류(적립판이면 칸 수) → 기본 스티커 → 종료일(달력판, 선택) (PRD 4.4). */
export function NewGoalScreen({name,onChangeName,nameMaxLength,nameError,onNameBlur,kind,onChangeKind,count,onChangeCount,sticker,onChooseSticker,endMode,onChangeEndMode,endDate,onChangeEndDate,today,todayLabel,error,onSubmit,submitDisabled=false,onBack,stickerTargetRef}:{name:string;onChangeName:(name:string)=>void;nameMaxLength?:number;/** 이름 칸 아래 검사 문구 */nameError?:string;/** 이름 칸에서 나올 때: 빈 이름 문구를 보일지 정한다 */onNameBlur?:()=>void;kind:BoardKind;onChangeKind:(kind:BoardKind)=>void;count:string;onChangeCount:(count:string)=>void;sticker:StickerId;/** [바꾸기]: 「기본 스티커」 화면을 연다 */onChooseSticker:()=>void;endMode:EndDateMode;onChangeEndMode:(mode:EndDateMode)=>void;endDate?:string;onChangeEndDate:(date:string)=>void;/** 오늘 날짜 키. 종료일은 오늘부터 고른다 */today:string;/** 예: '9월 29일' */todayLabel:string;error?:string;onSubmit:()=>void;submitDisabled?:boolean;onBack:()=>void;stickerTargetRef?:React.Ref<View>}) {
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title="새 목표" onBack={onBack}/>}>
    <PixelInput label="목표 이름" value={name} onChangeText={onChangeName} placeholder="목표 이름" maxLength={nameMaxLength} error={nameError} onBlur={onNameBlur}/>
    <BoardTypePicker value={kind} onChange={onChangeKind}/>
    {kind==='tally'&&<SlotCountPicker value={count} onChange={onChangeCount}/>}
    <StickerField value={sticker} onChoose={onChooseSticker} targetRef={stickerTargetRef}/>
    {kind==='calendar'&&<View style={{gap:8}}>
      <PixelText>종료일 (선택)</PixelText>
      <OptionButtons options={[{key:'none',label:'정하지 않기'},{key:'pick',label:'날짜 고르기'}] as const} value={endMode} onChange={onChangeEndMode}/>
      <Small>{endMode==='pick'?'종료일이 지나면 완성한 판으로 옮겨요.':'종료일 없이 계속 붙여요. 완성은 목표 설정에서 할 수 있어요.'}</Small>
      {endMode==='pick'&&<EndDatePicker firstAllowed={today} selected={endDate} onSelect={onChangeEndDate} hint={`시작일은 오늘(${todayLabel})이에요.`}/>}
    </View>}
    {error&&<PixelText accessibilityRole="alert">{error}</PixelText>}
    <PixelButton label="만들기" disabled={submitDisabled} onPress={onSubmit}/>
  </RetroScreen>;
}

// ── 계속하기: 늘리기 ─────────────────────────────────────────────────
function ExtendSummary({name,detail}:{name:string;detail:string}) {
  return <PixelFrame variant="input" fill={retro.color.secondary} contentStyle={{padding:16,gap:6}}>
    <PixelText variant="title" style={{fontSize:22,lineHeight:30}}>{name}</PixelText>
    <Small>{detail}</Small>
  </PixelFrame>;
}
/** 기간 달력판의 계속하기: 종료일을 늘린다. 지난 날은 붙일 수 없으므로 오늘부터 고른다 (PRD 4.7). */
export function ExtendEndDateScreen({name,periodLabel,firstAllowed,selected,onSelect,onSubmit,onBack}:{name:string;/** 예: '9월 1일 – 9월 23일' */periodLabel:string;firstAllowed:string;selected?:string;onSelect:(date:string)=>void;onSubmit:()=>void;onBack:()=>void}) {
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="종료일 늘리기" onBack={onBack}/>}>
    <ExtendSummary name={name} detail={`${periodLabel} · 붙인 스티커와 기록은 그대로예요.`}/>
    <EndDatePicker firstAllowed={firstAllowed} selected={selected} onSelect={onSelect} hint="새 종료일을 골라 주세요. 지난 날은 붙일 수 없어서 오늘부터 고를 수 있어요."/>
    <PixelButton label="종료일 늘리기" disabled={!selected} onPress={onSubmit}/>
  </RetroScreen>;
}
/** 적립판의 계속하기: 칸을 더한다. 기본은 처음 만든 칸 수만큼이고 상한은 없다 (2026-09-30). */
export function ExtendSlotsScreen({name,total,add,onChangeAdd,onSubmit,onBack}:{name:string;/** 지금 칸 수 */total:number;/** 더할 칸 수 입력값 */add:string;onChangeAdd:(value:string)=>void;onSubmit:()=>void;onBack:()=>void}) {
  const valid=/^\d+$/.test(add)&&Number(add)>0;
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title="칸 늘리기" onBack={onBack}/>}>
    <ExtendSummary name={name} detail={`지금 ${total}칸 · 붙인 스티커와 기록은 그대로예요.`}/>
    <SlotCountPicker label="더할 칸 수" value={add} onChange={onChangeAdd}/>
    <PixelText accessibilityRole={valid?undefined:'alert'}>{valid?`늘린 뒤 ${total+Number(add)}칸`:'더할 칸 수를 1 이상으로 입력해주세요.'}</PixelText>
    <PixelButton label="칸 늘리기" disabled={!valid} onPress={onSubmit}/>
  </RetroScreen>;
}
