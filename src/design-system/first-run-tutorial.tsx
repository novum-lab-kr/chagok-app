import React,{useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {View,type LayoutRectangle,type StyleProp,type ViewStyle} from 'react-native';
import {TutorialSpotlight} from './tutorial';
import {BoardDetailScreen,GoalListScreen,NewGoalScreen} from './board-screens';
import type {PocketStickerId} from './sticker-glyphs';

/**
 * 첫 실행 튜토리얼 5단계 (PRD 4.6). 예시 화면 위에 대상 하나를 재서 스포트라이트를 씌운다.
 * 실제 목표나 기록은 만들지 않는다.
 */
export type TutorialSpotName='add'|'sticker'|'slot'|'record'|'done';
export const firstRunSteps:readonly {name:TutorialSpotName;title:string;description:string}[]=[
  {name:'add',title:'목표 만들기',description:'＋를 눌러 목표를 만들어요'},
  {name:'sticker',title:'스티커 고르기',description:'목표마다 스티커를 정해요'},
  {name:'slot',title:'빈칸에 톡!',description:'어느 빈칸이든 누르면 스티커가 붙어요. 꾹 누르면 떼져요'},
  {name:'record',title:'기록 남기기',description:'붙인 스티커를 누르면 사진과 메모를 남길 수 있어요'},
  {name:'done',title:'완성한 판',description:'판을 다 채우면 완성! 완성한 뒤에도 빠진 칸과 기록을 고칠 수 있어요'},
];

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
export function FirstRunTutorialFrame({index,children,onNext,onSkip,autoFocus=true,style}:{index:number;children:ReactNode;onNext:()=>void;onSkip:()=>void;/** 한 페이지에 여러 개를 그리는 문서 화면에서는 끈다 */autoFocus?:boolean;style?:StyleProp<ViewStyle>}) {
  const root=useRef<View>(null);
  const [target,setTarget]=useState<LayoutRectangle>();
  const [size,setSize]=useState<{width:number;height:number}>();
  const step=firstRunSteps[index],last=index===firstRunSteps.length-1;
  const set=useCallback((rect:LayoutRectangle)=>setTarget(previous=>previous&&previous.x===rect.x&&previous.y===rect.y&&previous.width===rect.width&&previous.height===rect.height?previous:rect),[]);
  const spot=useMemo(()=>({name:step.name,root,set}),[step.name,set]);
  return <SpotContext.Provider value={spot}>
    <View ref={root} style={style} onLayout={e=>{const {width,height}=e.nativeEvent.layout;setSize(previous=>previous?.width===width&&previous.height===height?previous:{width,height});}}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{flex:1}}>{children}</View>
      {target&&size&&<TutorialSpotlight autoFocus={autoFocus} step={index===0?1:3} highlightFrame={index===0||last} target={target} width={size.width} height={size.height} onNext={onNext} onSkip={onSkip}
        content={{step:`${index+1} / ${firstRunSteps.length}`,title:step.title,description:step.description,primaryLabel:last?'시작하기':'다음',secondaryLabel:'건너뛰기'}}/>}
    </View>
  </SpotContext.Provider>;
}

// ── 예시 화면 ──────────────────────────────────────────────────────
const noop=()=>{};
const range=(n:number)=>Array.from({length:n},(_,i)=>i+1);
const filledWith=(n:number,sticker:PocketStickerId)=>Object.fromEntries(range(n).map(k=>[k,sticker])) as Record<number,PocketStickerId>;

/** 1단계: 목록의 `+` */
export function TutorialListExample() {
  const add=useTutorialSpot('add');
  return <GoalListScreen tab="active" onTab={noop} onOpen={noop} onAdd={noop} onSettings={noop} addTargetRef={add} completed={[]} active={[
    {id:'reading',name:'책 읽기',sticker:'sprout',kind:'적립판',percent:40,status:['40% 채웠어요']},
    {id:'walk',name:'매일 저녁 동네 한 바퀴 걷기',sticker:'shoe',kind:'달력판',percent:30,status:['이번 달 30% 채웠어요']},
  ]}/>;
}
/** 2단계: 새 목표의 기본 스티커 */
export function TutorialNewGoalExample() {
  const sticker=useTutorialSpot('sticker');
  return <NewGoalScreen name="물 여덟 잔 마시기" onChangeName={noop} kind="calendar" onChangeKind={noop} count="15" onChangeCount={noop} sticker="flower" onChangeSticker={noop}
    endMode="none" onChangeEndMode={noop} onChangeEndDate={noop} today="2026-09-29" todayLabel="9월 29일" onSubmit={noop} onBack={noop} stickerTargetRef={sticker}/>;
}
/** 3·4단계: 진행 중인 적립판의 다음 빈칸과 붙인 칸 */
export function TutorialBoardExample() {
  const slot=useTutorialSpot('slot'),record=useTutorialSpot('record');
  return <BoardDetailScreen name="책 읽기" sticker="sprout" completed={false} progress={{value:6,total:15,percentLabel:'40%'}} onBack={noop} onSettings={noop}
    board={{kind:'tally',total:15,filled:filledWith(6,'sprout'),onPress:noop,onOpenRecord:noop,nextSlotRef:slot,recordSlotRef:record}}/>;
}
/** 5단계: 완성한 판의 [완성] 스티커 */
export function TutorialCompletedExample() {
  const done=useTutorialSpot('done');
  return <BoardDetailScreen name="자기 전 스트레칭 십 분" sticker="star" completed progress={{value:20,total:20,percentLabel:'100%'}} onBack={noop} onSettings={noop} completionTargetRef={done}
    board={{kind:'tally',total:20,filled:filledWith(20,'star'),onPress:noop,onOpenRecord:noop}}/>;
}

/** 앱 첫 실행. 끝까지 보거나 건너뛰면 onFinish. */
export function FirstRunTutorial({onFinish}:{onFinish:()=>void}) {
  const [index,setIndex]=useState(0);
  const screen=index===0?<TutorialListExample/>:index===1?<TutorialNewGoalExample/>:index<4?<TutorialBoardExample/>:<TutorialCompletedExample/>;
  return <FirstRunTutorialFrame key={index} index={index} style={{flex:1}} onSkip={onFinish} onNext={()=>index===firstRunSteps.length-1?onFinish():setIndex(index+1)}>{screen}</FirstRunTutorialFrame>;
}
