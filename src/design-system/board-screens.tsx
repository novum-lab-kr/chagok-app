import React,{memo,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import {Animated,PanResponder,Pressable,View,type LayoutChangeEvent,type LayoutRectangle} from 'react-native';
import {TutorialSpotlight} from './tutorial';
import {retro} from './tokens';
import {touchSlop} from './touch';
import {CompletionSticker,PixelButton,PixelFrame,PixelIcon,PixelInput,PixelPanel,PixelText,SCREEN_PADDING,StickerGrid,stickerCellSize,useLayoutSize,useReducedMotion} from './components';
import {ActionSymbol,stickerLabel,type StickerId} from './sticker-glyphs';
import {AppHeader,BoardProgressRow,BoardTypePicker,DeleteSection,EmptyState,EndDatePicker,GoalListHeader,GoalSummaryCard,OptionButtons,PeriodField,RetroScreen,ScreenHeader,ShortNotice,SlotCountPicker,StickerSummary,useScrollToCenter,CenteringScrollView,type BoardKind,type GoalListTab} from './composition-controls';
import {CalendarBoard} from './calendar';
import {GoalStickerCell} from './screen-compositions';
import {getLanguage,t} from '../i18n';

/**
 * 홈 목록·판 상세·목표 설정 화면 (PRD 4.1–4.7, 2026-09-29 Storybook 확정 시안).
 * props만 받는다. Storybook `Screens / Board & goal`(목록은 `Screens / Bottom Tabs`)과 앱 라우트가 같은 조합을 쓴다.
 * 확인 다이얼로그는 화면 밖에서 얹는다(앱은 PixelDialogModal).
 */
const caption={color:retro.color.buttonText};
function Small({children}:{children:ReactNode}) {
  return <PixelText variant="caption" style={caption}>{children}</PixelText>;
}

// ── 목록 ──────────────────────────────────────────────────────────
export type GoalCardItem={id:string;name:string;sticker:StickerId;/** 배지: 적립판 / 달력판 */kind:string;percent:number;/** 예: ['40% 채웠어요'], ['100%', '9/29 완성'] */status:readonly string[]};
/** 목록 카드 사이 간격. 끌어 옮길 때 자리 계산에도 쓴다. */
const GOAL_GAP=12;
/**
 * 끌고 있는 카드가 놓일 자리. 내려가면 아래 끝이, 올라가면 위 끝이 다른 카드의 가운데를 넘을 때 그 자리로 간다.
 * 카드 반쯤만 겹쳐도 옆 카드가 비켜서서 조금만 끌어도 움직이는 느낌이 난다 (2026-11-02, 전에는 가운데끼리 비교해 카드 하나만큼 끌어야 했다).
 * heights는 지금 보이는 순서의 카드 높이, dy는 누른 곳에서 손가락이 움직인 거리다.
 */
export function goalDropIndex(heights:readonly number[],from:number,dy:number):number {
  const tops:number[]=[];
  let top=0;
  for(const height of heights){tops.push(top);top+=height+GOAL_GAP;}
  const start=(tops[from]??0)+dy,own=heights[from]??0;
  const edge=dy>0?start+own:dy<0?start:start+own/2;
  return heights.filter((height,index)=>index!==from&&(tops[index]??0)+height/2<edge).length;
}
/** 끄는 동안 다른 카드가 비켜서는 거리. 끄는 카드가 지나간 카드만 그 카드 높이(간격 포함)만큼 움직인다. */
export function goalDragShift(index:number,from:number,to:number,size:number):number {
  if(from<to&&index>from&&index<=to) return -size;
  if(to<from&&index>=to&&index<from) return size;
  return 0;
}
/** 비켜서는 카드는 바로 뛰지 않고 짧게 미끄러진다. 들린 카드는 손가락을 그대로 따른다. */
function ShiftingCard({lifted,offset,shift,onLayout,children}:{lifted:boolean;offset:Animated.Value;shift:number;onLayout:(event:LayoutChangeEvent)=>void;children:ReactNode}) {
  const [slide]=useState(()=>new Animated.Value(shift));
  useEffect(()=>{Animated.timing(slide,{toValue:shift,duration:140,useNativeDriver:true}).start();},[shift,slide]);
  return <Animated.View onLayout={onLayout} style={lifted?{zIndex:1,transform:[{translateY:offset}]}:{transform:[{translateY:slide}]}}>{children}</Animated.View>;
}
/**
 * 내 목표 끌어 옮기기 (PRD 4.1, 2026-10-30). 카드를 꾹 누르면 들리고, 그대로 끌면 손가락을 따라온다.
 * 지나가는 카드는 비켜서고, 손을 떼면 그 자리로 옮긴다. 끄는 동안은 목록 스크롤과 탭 넘김을 멈춘다(onDragChange).
 * 화면 읽기는 카드의 「위로 옮기기」 「아래로 옮기기」 동작으로 한 칸씩 옮긴다.
 * 손이 화면 끝에 닿아도 목록을 저절로 스크롤하지 않는다. 화면 밖 자리로는 두 번에 나눠 옮긴다.
 */
function ReorderableGoals({items,onOpen,onMove,onDragChange,demo=false}:{/** 순서 안내 중: 첫 카드를 끌어 한 칸 내렸다가 되돌리는 모션을 되풀이한다 (2026-11-02) */demo?:boolean;items:readonly GoalCardItem[];onOpen:(id:string)=>void;onMove:(from:number,to:number)=>void;onDragChange:(dragging:boolean)=>void}) {
  const heights=useRef(new Map<string,number>());
  const [drag,setDrag]=useState<{from:number;to:number;/** 끄는 카드 높이와 간격 */size:number}|null>(null);
  const [offset]=useState(()=>new Animated.Value(0));
  // 응답자 콜백은 렌더 밖에서 불린다. 지금 끄는 상태와 최신 콜백을 ref로 읽는다.
  const current=useRef<{from:number;to:number;startY:number;moving:boolean;heights:number[];size:number}|null>(null);
  const latest=useRef({onMove,onDragChange});
  useEffect(()=>{latest.current={onMove,onDragChange};});
  const finish=useCallback((commit:boolean)=>{
    const ended=current.current;
    if(!ended) return;
    current.current=null;
    offset.setValue(0);
    setDrag(null);
    latest.current.onDragChange(false);
    if(commit&&ended.to!==ended.from) latest.current.onMove(ended.from,ended.to);
  },[offset]);
  // 탭 바의 끌어서 고르기와 같이 응답자 콜백을 직접 단다. 꾹 누른 뒤 첫 움직임에서 카드의 응답을 넘겨받고,
  // 끄는 동안은 스크롤이나 탭 넘김에 넘기지 않는다.
  const move=(pageY:number)=>{
    const dragging=current.current;
    if(!dragging) return;
    const dy=pageY-dragging.startY;
    offset.setValue(dy);
    const to=goalDropIndex(dragging.heights,dragging.from,dy);
    if(to!==dragging.to){dragging.to=to;setDrag({from:dragging.from,to,size:dragging.size});}
  };
  const start=(from:number,pageY:number)=>{
    const measured=items.map(item=>heights.current.get(item.id)??0);
    const size=(measured[from]??0)+GOAL_GAP;
    current.current={from,to:from,startY:pageY,moving:false,heights:measured,size};
    setDrag({from,to:from,size});
    onDragChange(true);
  };
  const reduced=useReducedMotion();
  const showDemo=demo&&!reduced&&items.length>=2;
  useEffect(()=>{
    if(!showDemo) return;
    let alive=true;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const glide=(toValue:number,done:()=>void)=>Animated.timing(offset,{toValue,duration:700,useNativeDriver:true}).start(({finished})=>{if(alive&&finished&&!current.current) done();});
    const run=()=>{
      if(!alive||current.current) return;
      const size=(heights.current.get(items[0].id)??0)+GOAL_GAP;
      setDrag({from:0,to:0,size});
      glide(size,()=>{
        setDrag({from:0,to:1,size});
        timer=setTimeout(()=>{setDrag({from:0,to:0,size});glide(0,()=>{setDrag(null);timer=setTimeout(run,900);});},500);
      });
    };
    timer=setTimeout(run,600);
    return ()=>{alive=false;clearTimeout(timer);offset.stopAnimation();if(!current.current){offset.setValue(0);setDrag(null);}};
  },[showDemo,items,offset]);
  // 꾹 누르고 움직이지 않은 채 떼면 그대로 내려놓는다
  const release=()=>{if(current.current&&!current.current.moving) finish(false);};
  return <View style={{gap:GOAL_GAP}}
    onMoveShouldSetResponderCapture={()=>current.current!==null} onResponderTerminationRequest={()=>false}
    onResponderGrant={event=>{if(current.current) current.current.moving=true;move(event.nativeEvent.pageY);}}
    onResponderMove={event=>move(event.nativeEvent.pageY)}
    onResponderRelease={()=>finish(true)} onResponderTerminate={()=>finish(false)}>
    {items.map((item,index)=>{
      const lifted=drag?.from===index;
      const shift=drag&&!lifted?goalDragShift(index,drag.from,drag.to,drag.size):0;
      return <ShiftingCard key={item.id} lifted={lifted} offset={offset} shift={shift} onLayout={event=>{heights.current.set(item.id,event.nativeEvent.layout.height);}}>
        <GoalSummaryCard name={item.name} sticker={item.sticker} kind={item.kind} percent={item.percent} status={item.status} lifted={lifted}
          onPress={()=>onOpen(item.id)} onLongPress={pageY=>start(index,pageY)} onPressOut={release}
          onMoveUp={index>0?()=>onMove(index,index-1):undefined}
          onMoveDown={index<items.length-1?()=>onMove(index,index+1):undefined}/>
      </ShiftingCard>;
    })}
  </View>;
}
/** 순서 안내가 비추는 높이. 목표가 많아도 위쪽 카드만 비춘다 */
const REORDER_GUIDE_MAX_HEIGHT=240;
/**
 * 목표 목록. 목표가 하나도 없으면 탭 아래 안내 상자만 둔다(2026-09-30 A안). 만드는 동작은 `+`다.
 * 완성한 판만 있고 진행 중인 목표가 없을 때의 문구는 시안이 없어 목록 안내와 같은 결로 두었다.
 * onMove를 주면 내 목표를 꾹 눌러 끌어 옮긴다(PRD 4.1, 2026-10-30). 완성한 판은 완성 시각 순이라 옮기지 않는다.
 */
export function GoalListScreen({tab,onTab,active,completed,onOpen,onAdd,onSettings,addTargetRef,footer,notice,onMove,onDragChange,onReorderGuideDone}:{/** 주면 내 목표에 순서 바꾸기 안내를 띄운다(2026-11-02 시안 B) */onReorderGuideDone?:()=>void;/** 내 목표를 옮겼다. 보이는 순서의 자리 번호(0부터) */onMove?:(from:number,to:number)=>void;/** 끌기 시작과 끝. 앱은 진동과 탭 넘김 멈춤에 쓴다 */onDragChange?:(dragging:boolean)=>void;/** 스크롤 밖 맨 아래. 광고 배너 자리(광고 제거를 샀으면 비움, PRD 4.12) */footer?:ReactNode;/** 목록 맨 위 안내(체험 열림 카드, 2026-10-12) */notice?:ReactNode;tab:GoalListTab;onTab:(tab:GoalListTab)=>void;active:readonly GoalCardItem[];completed:readonly GoalCardItem[];onOpen:(id:string)=>void;onAdd:()=>void;onSettings?:()=>void;addTargetRef?:React.Ref<View>}) {
  const shown=tab==='active'?active:completed;
  const empty=tab==='completed'
    ?<EmptyState title={t('empty.noCompletedTitle')} description={t('empty.noCompletedDescription')}/>
    :completed.length===0
      ?<EmptyState title={t('empty.noGoalsTitle')} description={t('empty.noGoalsDescription')}/>
      :<EmptyState title={t('empty.noActiveTitle')} description={t('empty.noActiveDescription')}/>;
  const [dragging,setDragging]=useState(false);
  const dragChange=useCallback((value:boolean)=>{setDragging(value);onDragChange?.(value);},[onDragChange]);
  const guideOn=!!onReorderGuideDone&&tab==='active'&&shown.length>=2;
  const list=tab==='active'&&onMove
    ?<ReorderableGoals items={shown} onOpen={onOpen} onMove={onMove} onDragChange={dragChange} demo={guideOn}/>
    :<View style={{gap:GOAL_GAP}}>{shown.map(item=><GoalSummaryCard key={item.id} name={item.name} sticker={item.sticker} kind={item.kind} percent={item.percent} status={item.status} onPress={()=>onOpen(item.id)}/>)}</View>;
  const {ref:root,size,onLayout}=useLayoutSize();
  const listRef=useRef<View>(null);
  const [guideTarget,setGuideTarget]=useState<LayoutRectangle>();
  useEffect(()=>{
    if(!guideOn) return;
    const id=setTimeout(()=>listRef.current?.measureInWindow((x,y,width,height)=>root.current?.measureInWindow((rx,ry)=>setGuideTarget({x:x-rx,y:y-ry,width,height:Math.min(height,REORDER_GUIDE_MAX_HEIGHT)}))),50);
    return ()=>clearTimeout(id);
  },[guideOn,shown.length,root]);
  // 앱 헤더와 탭·+ 줄을 함께 고정한다. 목표가 많아도 새 목표와 탭 전환에 바로 닿는다 (2026-09-30).
  return <View ref={root} onLayout={onLayout} style={{flex:1}}>
    <RetroScreen style={{gap:16}} scrollEnabled={!dragging} header={<View style={{gap:16}}>
    <AppHeader onSettings={onSettings}/>
    <GoalListHeader tab={tab} onTab={onTab} onAdd={onAdd} addTargetRef={addTargetRef} counts={{active:active.length,completed:completed.length}}/>
  </View>}>
    {notice}
    <View ref={listRef} collapsable={false}>{shown.length?list:empty}</View>
    </RetroScreen>
    {footer}
    {guideOn&&guideTarget&&size.width>0&&<TutorialSpotlight step={1} target={guideTarget} width={size.width} height={size.height} onNext={onReorderGuideDone}
      content={{step:'',title:t('guide.reorderTitle'),description:t('guide.reorder'),primaryLabel:t('guide.gotIt'),secondaryLabel:'',single:true}}/>}
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
  // 판 윗부분(테두리·제목·진행 줄)은 고정한다. 적립판은 화면에 들어가는 줄만큼씩 쪽을 나눠 좌우로 넘긴다 (2026-11-03 시안 P1).
  // 남은 높이 = 판 아래 빈 영역 높이 − (판 높이 − 칸 영역 높이). 칸 영역 바깥(테두리, 제목, 진행 줄)은 쪽 수와 상관없이 같다.
  // 아주 작은 화면에서 최소 줄(3줄)도 넘치면 그 쪽 안에서만 스크롤한다.
  const [zoneHeight,setZoneHeight]=useState(0),[panelHeight,setPanelHeight]=useState(0),[gridHeight,setGridHeight]=useState(0);
  const gridMax=zoneHeight>0&&panelHeight>0&&gridHeight>0?zoneHeight-(panelHeight-gridHeight):null;
  return <View style={{flex:1}}><RetroScreen scrollable={false} style={{gap:12}} header={<ScreenHeader title={completed?t('goal.completedBoard'):t('goal.myGoal')} onBack={onBack}/>}>
    <View style={{flex:1}} onLayout={event=>setZoneHeight(Math.floor(event.nativeEvent.layout.height))}>
    <View testID="board-panel" onLayout={event=>setPanelHeight(Math.ceil(event.nativeEvent.layout.height))} style={{opacity:visible?1:0,flexShrink:1}}>
    <PixelPanel titleRule={false} style={{flexShrink:1}} contentStyle={{flexShrink:1}} title={name} action={<Pressable accessibilityRole="button" accessibilityLabel={t('goal.settings')} onPress={onSettings} hitSlop={touchSlop({width:40,height:40})} style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><PixelIcon name="gear" size={36}/></Pressable>}>
      <BoardProgressRow value={progress.value} total={progress.total} percentLabel={progress.percentLabel} completed={completed} sticker={sticker} completionTargetRef={completionTargetRef} animateCompletion={animateCompletion}/>
      <View style={{height:retro.layout.progressGridGap}}/>
      <View style={{flexShrink:1}} onLayout={event=>setGridHeight(Math.ceil(event.nativeEvent.layout.height))}>
      <CenteringScrollView testID="board-scroll" style={{flexGrow:0,flexShrink:1}}>
      {board.kind==='calendar'
        ?<CalendarSwipe board={board}><CalendarBoard year={board.year} month={board.month} records={board.records} recordedDates={board.recordedDates} selectedDate={board.selectedDate} onSelect={board.onSelect} onMonthChange={board.onMonthChange}
          isDateEnabled={board.isDateEnabled} canGoPrev={board.canGoPrev} canGoNext={board.canGoNext} onOpenRecord={board.onOpenRecord} poppedDate={board.justPlaced}/></CalendarSwipe>
        :<TallyGrid board={board} sticker={sticker} onSettled={reveal} maxHeight={gridMax}/>}
      </CenteringScrollView>
      </View>
    </PixelPanel>
    </View>
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
/** 쪽 넘김 줄 높이(버튼 44 + 아래 간격 8) */
export const TALLY_PAGE_NAV_HEIGHT=52;
/** 마지막 칸 붙이기 모션을 본 뒤 다음 쪽으로 넘긴다 */
const TALLY_PAGE_TURN_DELAY_MS=700;
/** 칸 영역 높이를 재지 못해도 이만큼 뒤에는 판을 보여 준다 */
const TALLY_MEASURE_TIMEOUT_MS=400;
/**
 * 적립판 한 쪽에 넣을 칸 수 (2026-11-03 시안 P1). 남은 높이에 다 들어가면 쪽을 나누지 않는다(total).
 * 나누면 넘김 줄 높이를 빼고 들어가는 줄 수만큼, 최소 3줄을 넣는다. 한 줄은 3칸이다.
 */
export function tallyPageSize(total:number,maxHeight:number,cellHeight:number,rowGap:number):number {
  const rows=(height:number)=>Math.floor((height+rowGap)/(cellHeight+rowGap));
  if(rows(maxHeight)*3>=total) return total;
  return Math.max(3,rows(maxHeight-TALLY_PAGE_NAV_HEIGHT))*3;
}
/** 달력판 MonthNavigation과 같은 줄: [이전] 「1~21칸 / 40」 [다음]. 끝 쪽에서는 그 방향 버튼 자리를 비운다. */
function TallyPageNavigation({from,to,total,onPrev,onNext}:{from:number;to:number;total:number;onPrev?:()=>void;onNext?:()=>void}) {
  const slot={width:44,height:44,alignItems:'center' as const,justifyContent:'center' as const};
  return <View style={{flexDirection:'row',alignItems:'center',gap:8,height:44,marginBottom:TALLY_PAGE_NAV_HEIGHT-44}}>
    {onPrev?<Pressable accessibilityRole="button" accessibilityLabel={t('board.previousPage')} onPress={onPrev} hitSlop={touchSlop({width:44,height:44})} style={slot}><ActionSymbol name="back" size={24}/></Pressable>:<View style={slot}/>}
    <PixelText variant="title" numberOfLines={1} accessibilityRole="header" style={{flex:1,textAlign:'center',fontSize:20,lineHeight:28}}>{t('board.pageRange',from,to,total)}</PixelText>
    {onNext?<Pressable accessibilityRole="button" accessibilityLabel={t('board.nextPage')} onPress={onNext} hitSlop={touchSlop({width:44,height:44})} style={slot}><PixelIcon name="chevron" size={24}/></Pressable>:<View style={slot}/>}
  </View>;
}
/**
 * 적립판 칸. 다음 빈칸을 화면 가운데로 스크롤한다 — 판을 열 때, 그리고 칸 수가 바뀌었을 때(칸 늘리기)만.
 * 붙일 때마다 옮기면 누르는 중에 판이 움직인다 (2026-09-30).
 * 옮긴 뒤(빈칸이 없으면 그리고 나서) onSettled를 부른다.
 */
function TallyGrid({board,sticker,onSettled,maxHeight=null}:{board:TallyBoardView;sticker:StickerId;onSettled:()=>void;/** 칸이 쓸 수 있는 높이. 재기 전(null)에는 쪽을 나누지 않는다 */maxHeight?:number|null}) {
  const all=Array.from({length:board.total},(_,i)=>i+1);
  const next=all.find(n=>!board.filled[n]);
  const lastFilled=Math.max(0,...Object.keys(board.filled).map(Number));
  const [width,setWidth]=useState(0);
  const perPage=maxHeight!==null&&width>0?tallyPageSize(board.total,maxHeight,stickerCellSize(width).height,retro.layout.boardRowGap):null;
  const paged=perPage!==null&&perPage<board.total;
  const pages=paged?Math.ceil(board.total/perPage):1;
  // 처음에는 다음 빈칸(없으면 마지막으로 붙인 칸)이 있는 쪽. 쪽 크기가 바뀌어도 보던 첫 칸이 든 쪽을 그대로 보여 준다.
  const [anchor,setAnchor]=useState(()=>next??Math.max(1,lastFilled));
  const page=paged?Math.min(pages-1,Math.floor((anchor-1)/perPage)):0;
  const first=paged?page*perPage+1:1,last=paged?Math.min(board.total,first+perPage-1):board.total;
  const numbers=paged?all.slice(first-1,last):all;
  const go=useCallback((to:number)=>{if(perPage) setAnchor(to*perPage+1);},[perPage]);
  // 방금 붙인 칸이 다른 쪽이면(위젯 링크) 그 쪽으로 간다. 이 쪽 마지막 칸을 붙였고 다음 빈칸이 다음 쪽이면 붙는 모션 뒤에 넘긴다.
  const {justPlaced}=board;
  useEffect(()=>{
    if(!paged||justPlaced===undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 붙인 칸이 보이도록 쪽을 맞춘다
    if(justPlaced<first||justPlaced>last){setAnchor(justPlaced);return;}
    if(justPlaced!==last||next===undefined||next<=last) return;
    const id=setTimeout(()=>setAnchor(next),TALLY_PAGE_TURN_DELAY_MS);
    return ()=>clearTimeout(id);
  // 붙인 칸이 바뀔 때만 본다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[justPlaced,paged]);
  const swipe=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>paged&&Math.abs(g.dx)>24&&Math.abs(g.dx)>Math.abs(g.dy)*1.5,
    onPanResponderRelease:(_,g)=>{if(g.dx<=-48&&page<pages-1) go(page+1);else if(g.dx>=48&&page>0) go(page-1);},
  }),[paged,page,pages,go]);
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
  // 다음 빈칸이 다른 쪽이면 가운데로 옮길 칸이 없다. 그대로 보여 준다.
  const nextShown=next!==undefined&&next>=first&&next<=last;
  // 쪽 크기를 재기 전에 보이면 전체 칸이 잠깐 보였다가 쪽으로 바뀐다. 잴 때까지 기다리고, 재지 못하는 환경(테스트)에서는 잠시 뒤 그대로 보인다.
  const measured=perPage!==null;
  useLayoutEffect(()=>{if(!measured) return;if(nextShown) centerNext(); else if(!settled.current) settle();});
  useEffect(()=>{const id=setTimeout(()=>{if(!settled.current) settle();},TALLY_MEASURE_TIMEOUT_MS);return ()=>clearTimeout(id);// 처음 한 번만
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  return <View {...swipe.panHandlers} onLayout={event=>setWidth(Math.round(event.nativeEvent.layout.width))}>
    {paged&&<TallyPageNavigation from={first} to={last} total={board.total} onPrev={page>0?()=>go(page-1):undefined} onNext={page<pages-1?()=>go(page+1):undefined}/>}
    <StickerGrid>{numbers.map(n=>{
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
  // 튜토리얼 다이얼로그가 대상 바로 위에 떠서 라벨을 가린다. 영어는 라벨까지 대상에 넣는다. 한국어 화면은 지시대로 그대로 둔다(2026-10-31).
  const withLabel=getLanguage()==='en';
  return <View ref={withLabel?targetRef:undefined} style={{gap:8}}><PixelText>{t('board.basicSticker')}</PixelText><View ref={withLabel?undefined:targetRef}><StickerSummary value={value} onChange={onChoose}/></View></View>;
}

// ── 목표 설정 ──────────────────────────────────────────────────────
export type PeriodFieldView={startDate:string;endDate?:string;lastPlacedDate?:string;picking:boolean;onPick:()=>void;onChange:(date:string)=>void;onClear:()=>void};
/**
 * 진행 중인 목표의 설정: 이름 → 기본 스티커 → 기간(달력판) → [이 판 완성하기](종료일 없는 달력판) → 저장 → [삭제하기] (PRD 4.4).
 * 판 종류·칸 수 변경은 미확정이라 두지 않는다.
 */
export function GoalSettingsScreen({name,onChangeName,nameMaxLength,nameError,sticker,onChooseSticker,period,slots,onComplete,onSave,saveDisabled=false,onDelete,onBack}:{name:string;onChangeName:(name:string)=>void;nameMaxLength?:number;/** 이름 칸 아래 검사 문구 */nameError?:string;sticker:StickerId;/** [바꾸기]: 「기본 스티커」 화면을 연다 */onChooseSticker:()=>void;/** 달력판만 */period?:PeriodFieldView;/** 진행 중인 적립판만. 늘리기만 된다 (2026-09-30) */slots?:{current:number;value:string;onChange:(value:string)=>void;error?:string};/** 종료일 없는 달력판만. 누르면 호스트가 확인을 받는다 */onComplete?:()=>void;onSave:()=>void;saveDisabled?:boolean;onDelete:()=>void;onBack:()=>void}) {
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title={t('goal.settings')} onBack={onBack}/>}>
    <PixelInput label={t('goal.name')} value={name} onChangeText={onChangeName} maxLength={nameMaxLength} error={nameError}/>
    <StickerField value={sticker} onChoose={onChooseSticker}/>
    {period&&<PeriodField {...period}/>}
    {slots&&<View style={{gap:8}}>
      <SlotCountPicker value={slots.value} onChange={slots.onChange} min={slots.current}/>
      <Small>{t('goal.slotsNow',slots.current)}</Small>
      {slots.error&&<View accessible accessibilityRole="alert"><Small>{slots.error}</Small></View>}
    </View>}
    {onComplete&&<View style={{gap:8}}><Small>{t('goal.completeHint')}</Small><PixelButton label={t('goal.completeBoard')} variant="secondary" icon={<ActionSymbol name="check" size={16}/>} onPress={onComplete}/></View>}
    <PixelButton label={t('goal.save')} disabled={saveDisabled} onPress={onSave}/>
    <DeleteSection onDelete={onDelete}/>
  </RetroScreen>;
}
/** 완성한 판의 설정. 읽기 전용이고 삭제만 할 수 있다 (PRD 4.4, 4.7). */
export function CompletedGoalSettingsScreen({name,sticker,boardLabel,periodLabel,completedLabel,onDelete,onBack}:{name:string;sticker:StickerId;/** 예: '적립판 · 20칸', '달력판' */boardLabel:string;/** 달력판만. 예: '9월 1일 – 9월 23일', '9월 1일부터' */periodLabel?:string;/** 예: '9월 24일' */completedLabel:string;onDelete:()=>void;onBack:()=>void}) {
  // 마지막 줄은 밑줄을 두지 않는다. 바로 아래 [삭제하기] 구역의 윗줄과 겹쳐 빈 줄처럼 보인다 (2026-10-09)
  const row=(label:string,value:string,last=false)=><View style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:44,borderBottomWidth:last?0:retro.shape.cellBorder,borderColor:retro.color.ink}}><PixelText style={{width:108}}>{label}</PixelText><PixelText style={{flex:1}}>{value}</PixelText></View>;
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title={t('goal.settings')} onBack={onBack}/>}>
    <ShortNotice emphasis title={t('goal.completedNoticeTitle')} detail={t('goal.completedNoticeDetail',completedLabel)}/>
    <View>
      {/* 정보 블록 오른쪽에 스티커를 붙이듯 비스듬히 올린다. 값 글자와 겹치지 않도록 짧은 값이 오는 줄 위에 둔다. */}
      <View pointerEvents="none" style={{position:'absolute',right:0,top:50,zIndex:1}}><CompletionSticker sticker={sticker} tilted/></View>
      {row(t('goal.name'),name)}
      {row(t('board.basicSticker'),stickerLabel(sticker))}
      {row(t('board.type'),boardLabel,periodLabel===undefined)}
      {periodLabel!==undefined&&row(t('period.title'),periodLabel,true)}
    </View>
    <DeleteSection onDelete={onDelete}/>
  </RetroScreen>;
}

// ── 새 목표 ──────────────────────────────────────────────────────
export type EndDateMode='none'|'pick';
/** 새 목표: 이름 → 판 종류(적립판이면 칸 수) → 기본 스티커 → 종료일(달력판, 선택) (PRD 4.4). */
export function NewGoalScreen({name,onChangeName,nameMaxLength,nameError,onNameBlur,kind,onChangeKind,count,onChangeCount,sticker,onChooseSticker,endMode,onChangeEndMode,endDate,onChangeEndDate,today,todayLabel,error,onSubmit,submitDisabled=false,onBack,stickerTargetRef}:{name:string;onChangeName:(name:string)=>void;nameMaxLength?:number;/** 이름 칸 아래 검사 문구 */nameError?:string;/** 이름 칸에서 나올 때: 빈 이름 문구를 보일지 정한다 */onNameBlur?:()=>void;kind:BoardKind;onChangeKind:(kind:BoardKind)=>void;count:string;onChangeCount:(count:string)=>void;sticker:StickerId;/** [바꾸기]: 「기본 스티커」 화면을 연다 */onChooseSticker:()=>void;endMode:EndDateMode;onChangeEndMode:(mode:EndDateMode)=>void;endDate?:string;onChangeEndDate:(date:string)=>void;/** 오늘 날짜 키. 종료일은 오늘부터 고른다 */today:string;/** 예: '9월 29일' */todayLabel:string;error?:string;onSubmit:()=>void;submitDisabled?:boolean;onBack:()=>void;stickerTargetRef?:React.Ref<View>}) {
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title={t('goal.new')} onBack={onBack}/>}>
    <PixelInput label={t('goal.name')} value={name} onChangeText={onChangeName} placeholder={t('goal.name')} maxLength={nameMaxLength} error={nameError} onBlur={onNameBlur}/>
    <BoardTypePicker value={kind} onChange={onChangeKind}/>
    {kind==='tally'&&<SlotCountPicker value={count} onChange={onChangeCount}/>}
    <StickerField value={sticker} onChoose={onChooseSticker} targetRef={stickerTargetRef}/>
    {kind==='calendar'&&<View style={{gap:8}}>
      <PixelText>{t('goal.endDateOptional')}</PixelText>
      <OptionButtons options={[{key:'none',label:t('goal.endDateNone')},{key:'pick',label:t('goal.endDatePick')}] as const} value={endMode} onChange={onChangeEndMode}/>
      <Small>{endMode==='pick'?t('goal.endDatePickHint'):t('goal.endDateNoneHint')}</Small>
      {endMode==='pick'&&<EndDatePicker firstAllowed={today} selected={endDate} onSelect={onChangeEndDate} hint={t('goal.startsToday',todayLabel)}/>}
    </View>}
    {error&&<PixelText accessibilityRole="alert">{error}</PixelText>}
    <PixelButton label={t('goal.create')} disabled={submitDisabled} onPress={onSubmit}/>
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
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title={t('extend.endDate')} onBack={onBack}/>}>
    <ExtendSummary name={name} detail={t('extend.periodDetail',periodLabel)}/>
    <EndDatePicker firstAllowed={firstAllowed} selected={selected} onSelect={onSelect} hint={t('extend.endDateHint')}/>
    <PixelButton label={t('extend.endDate')} disabled={!selected} onPress={onSubmit}/>
  </RetroScreen>;
}
/** 적립판의 계속하기: 칸을 더한다. 기본은 처음 만든 칸 수만큼이고 상한은 없다 (2026-09-30). */
export function ExtendSlotsScreen({name,total,add,onChangeAdd,onSubmit,onBack}:{name:string;/** 지금 칸 수 */total:number;/** 더할 칸 수 입력값 */add:string;onChangeAdd:(value:string)=>void;onSubmit:()=>void;onBack:()=>void}) {
  const valid=/^\d+$/.test(add)&&Number(add)>0;
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title={t('extend.slots')} onBack={onBack}/>}>
    <ExtendSummary name={name} detail={t('extend.slotsDetail',total)}/>
    <SlotCountPicker label={t('extend.addCount')} value={add} onChange={onChangeAdd}/>
    <PixelText accessibilityRole={valid?undefined:'alert'}>{valid?t('extend.totalAfter',total+Number(add)):t('extend.addCountError')}</PixelText>
    <PixelButton label={t('extend.slots')} disabled={!valid} onPress={onSubmit}/>
  </RetroScreen>;
}
