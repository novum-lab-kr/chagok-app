import React,{useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {View,type LayoutRectangle,type StyleProp,type ViewStyle} from 'react-native';
import {TutorialSpotlight} from './tutorial';
import {useLayoutSize} from './components';
import {BoardDetailScreen,GoalListScreen,NewGoalScreen} from './board-screens';
import type {StickerId} from './sticker-glyphs';
import {t} from '../i18n';

/**
 * 첫 실행 튜토리얼 5단계 (PRD 4.6). 예시 화면 위에 대상 하나를 재서 스포트라이트를 씌운다.
 * 실제 목표나 기록은 만들지 않는다.
 */
export type TutorialSpotName='add'|'sticker'|'slot'|'record'|'done';
const firstRunStepNames:readonly TutorialSpotName[]=['add','sticker','slot','record','done'];
/** 부르는 순간의 언어로 읽는다 */
const firstRunStepText=(name:TutorialSpotName)=>({
  add:{title:t('tutorial.addTitle'),description:t('tutorial.firstRunAddDescription')},
  sticker:{title:t('tutorial.stickerTitle'),description:t('tutorial.stickerDescription')},
  slot:{title:t('tutorial.slotTitle'),description:t('tutorial.firstRunSlotDescription')},
  record:{title:t('tutorial.recordTitle'),description:t('tutorial.recordDescription')},
  done:{title:t('tutorial.doneTitle'),description:t('tutorial.doneDescription')},
})[name];

type Spot={name:TutorialSpotName;root:React.RefObject<View|null>;set:(rect:LayoutRectangle)=>void};
const SpotContext=React.createContext<Spot|null>(null);

/** 지금 단계의 대상이면 그린 뒤에 자기 위치를 튜토리얼 루트 기준으로 알린다. 아니면 아무것도 하지 않는다. */
export function useTutorialSpot(name:TutorialSpotName) {
  const spot=useContext(SpotContext),self=useRef<View>(null);
  useEffect(()=>{
    if(spot?.name!==name) return;
    const id=setTimeout(()=>self.current?.measureInWindow((x,y,width,height)=>spot.root.current?.measureInWindow((rx,ry)=>spot.set({x:x-rx,y:y-ry,width,height}))),50);
    return ()=>clearTimeout(id);
  },[spot,name]);
  return self;
}

/**
 * 예시 화면(children)을 누를 수 없게 깔고 그 위에 스포트라이트를 띄운다.
 * 같은 좌표면 상태를 바꾸지 않고, context 값은 단계가 바뀔 때만 새로 만든다. 그러지 않으면 측정 → 렌더 → 측정이 끝없이 돈다.
 */
export function FirstRunTutorialFrame({index,children,onNext,onPrev,onSkip,autoFocus=true,style}:{index:number;children:ReactNode;onNext:()=>void;onPrev:()=>void;onSkip:()=>void;/** 한 페이지에 여러 개를 그리는 문서 화면에서는 끈다 */autoFocus?:boolean;style?:StyleProp<ViewStyle>}) {
  const {ref:root,size,onLayout}=useLayoutSize();
  const [target,setTarget]=useState<LayoutRectangle>();
  const name=firstRunStepNames[index],last=index===firstRunStepNames.length-1;
  const set=useCallback((rect:LayoutRectangle)=>setTarget(previous=>previous&&previous.x===rect.x&&previous.y===rect.y&&previous.width===rect.width&&previous.height===rect.height?previous:rect),[]);
  const spot=useMemo(()=>({name,root,set}),[name,root,set]);
  return <SpotContext.Provider value={spot}>
    <View ref={root} style={style} onLayout={onLayout}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{flex:1}}>{children}</View>
      {target&&size.width>0&&<TutorialSpotlight autoFocus={autoFocus} step={index===0?1:3} target={target} width={size.width} height={size.height} onNext={onNext} onPrev={index>0?onPrev:undefined} onSkip={last?undefined:onSkip}
        content={{step:`${index+1} / ${firstRunStepNames.length}`,...firstRunStepText(name),primaryLabel:last?t('tutorial.start'):t('common.next'),secondaryLabel:t('common.previous')}}/>}
    </View>
  </SpotContext.Provider>;
}

// ── 예시 화면 ──────────────────────────────────────────────────────
const noop=()=>{};
const range=(n:number)=>Array.from({length:n},(_,i)=>i+1);
const filledWith=(n:number,sticker:StickerId)=>Object.fromEntries(range(n).map(k=>[k,sticker])) as Record<number,StickerId>;

/** 1단계: 목록의 `+` */
export function TutorialListExample() {
  const add=useTutorialSpot('add');
  return <GoalListScreen tab="active" onTab={noop} onOpen={noop} onAdd={noop} addTargetRef={add} completed={[]} active={[
    {id:'reading',name:t('example.reading'),sticker:'basic.sprout',kind:t('board.tally'),percent:40,status:[t('goalCard.filled','40%')]},
    {id:'walk',name:t('example.walkEveryEvening'),sticker:'basic.shoe',kind:t('board.calendar'),percent:30,status:[t('goalCard.filled',t('goalCard.percentThisMonth',30))]},
  ]}/>;
}
/** 2단계: 새 목표의 기본 스티커 */
export function TutorialNewGoalExample() {
  const sticker=useTutorialSpot('sticker');
  return <NewGoalScreen name={t('example.water')} onChangeName={noop} kind="calendar" onChangeKind={noop} count="15" onChangeCount={noop} sticker="basic.flower" onChooseSticker={noop}
    endMode="none" onChangeEndMode={noop} onChangeEndDate={noop} today="2026-09-29" todayLabel={t('date.monthDay',9,29)} onSubmit={noop} onBack={noop} stickerTargetRef={sticker}/>;
}
/** 3·4단계: 진행 중인 적립판의 다음 빈칸과 붙인 칸 */
export function TutorialBoardExample() {
  const slot=useTutorialSpot('slot'),record=useTutorialSpot('record');
  return <BoardDetailScreen name={t('example.reading')} sticker="basic.sprout" completed={false} progress={{value:6,total:15,percentLabel:'40%'}} onBack={noop} onSettings={noop}
    board={{kind:'tally',total:15,filled:filledWith(6,'basic.sprout'),onPress:noop,onOpenRecord:noop,nextSlotRef:slot,recordSlotRef:record}}/>;
}
/** 5단계: 완성한 판의 [완성] 스티커 */
export function TutorialCompletedExample() {
  const done=useTutorialSpot('done');
  return <BoardDetailScreen name={t('example.stretching')} sticker="basic.star" completed progress={{value:20,total:20,percentLabel:'100%'}} onBack={noop} onSettings={noop} completionTargetRef={done}
    board={{kind:'tally',total:20,filled:filledWith(20,'basic.star'),onPress:noop,onOpenRecord:noop}}/>;
}

export type TutorialProgress={kind:'start'|'step'|'skip'|'finish';step:number};

/** 앱 첫 실행. 끝까지 보거나 건너뛰면 onFinish. onProgress는 처음 보일 때 한 번, 단계가 보일 때, 건너뛸 때, 끝낼 때 부른다(step은 1부터). */
export function FirstRunTutorial({onFinish,onProgress}:{onFinish:()=>void;onProgress?:(progress:TutorialProgress)=>void}) {
  const [index,setIndex]=useState(0);
  const started=useRef(false);
  useEffect(()=>{
    if(!started.current){started.current=true;onProgress?.({kind:'start',step:index+1});}
    onProgress?.({kind:'step',step:index+1});
  },[index,onProgress]);
  const screen=index===0?<TutorialListExample/>:index===1?<TutorialNewGoalExample/>:index<4?<TutorialBoardExample/>:<TutorialCompletedExample/>;
  return <FirstRunTutorialFrame key={index} index={index} style={{flex:1}} onSkip={()=>{onProgress?.({kind:'skip',step:index+1});onFinish();}} onPrev={()=>setIndex(index-1)} onNext={()=>{if(index===firstRunStepNames.length-1){onProgress?.({kind:'finish',step:index+1});onFinish();}else setIndex(index+1);}}>{screen}</FirstRunTutorialFrame>;
}
