import React,{useCallback,useMemo,useRef,useState,type ReactNode} from 'react';
import {View,Pressable,PanResponder,type LayoutRectangle,type ImageSourcePropType} from 'react-native';
import {retro} from './tokens';
import {PixelButton,PixelFrame,PixelIcon,PixelInput,PixelPanel,PixelText,GoalChip,DefaultStickerLink,StickerSlot,StickerGrid} from './components';
import {ActionSymbol,StickerGlyph,stickerLabel,type PocketStickerId} from './sticker-glyphs';
import {RetroScreen,ScreenHeader,BoardTypePicker,SlotCountPicker,StickerSummary,StickerPicker,RecordSummary,PhotoAttachment,MemoEditor,TextAction,type BoardKind} from './composition-controls';
import {CalendarBoard} from './calendar';
import {TutorialSpotlight,type TutorialStep} from './tutorial';

export interface PocketGoal {id:string;name:string;kind:BoardKind;total:number;sticker:PocketStickerId;filled:number[];calendarRecords:Record<string,PocketStickerId>;/** 칸 번호 → 실제로 붙은 스티커. 없으면 기본 스티커로 그린다. 기본 스티커를 바꿔도 이미 붙은 칸은 그대로여야 한다 (PRD 4.4). */filledStickers?:Record<number,PocketStickerId>}
export const exampleGoals:readonly PocketGoal[]=[
  {id:'reading',name:'책 읽기',kind:'tally',total:15,sticker:'sprout',filled:[1,2,3,4,5,6],calendarRecords:{}},
  {id:'walking',name:'산책',kind:'calendar',total:30,sticker:'shoe',filled:[],calendarRecords:Object.fromEntries([2,4,7,10,14,17,20].map(day=>[`2026-09-${String(day).padStart(2,'0')}`,'shoe' as const]))},
];
type TargetName='add'|'slot'|'sticker';
type TargetHandler=(name:TargetName,rect:LayoutRectangle)=>void;
function measureTarget(root:View|null,target:View|null,name:TargetName,onTarget?:TargetHandler) {
  if(!root||!target||!onTarget)return;
  target.measureInWindow((x,y,width,height)=>root.measureInWindow((rx,ry)=>onTarget(name,{x:x-rx,y:y-ry,width,height})));
}
export function GoalStickerLink({sticker,onPress}:{sticker:PocketStickerId;onPress:()=>void}) {
  if(sticker==='sprout')return <DefaultStickerLink onPress={onPress}/>;
  return <Pressable accessibilityRole="button" accessibilityLabel="기본 스티커 설정" onPress={onPress} style={{flexDirection:'row',alignItems:'center',gap:4,minHeight:retro.layout.touch}}><StickerGlyph id={sticker} size={retro.layout.stickerPreviewSize}/><PixelText style={{fontSize:14,lineHeight:20}}>기본 스티커</PixelText><PixelIcon name="chevron" size={16}/></Pressable>;
}
export function GoalStickerCell({number,sticker,state,onPress}:{number:number;sticker:PocketStickerId;state:'filled'|'available'|'empty';onPress:()=>void}) {
  if(sticker==='sprout'||state!=='filled')return <StickerSlot number={number} width="100%" height="100%" state={state} onPress={onPress}/>;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${number}번 칸, ${stickerLabel(sticker)} 스티커`} onPress={onPress} style={{width:'100%',height:'100%'}}><PixelFrame variant="slot" style={{height:'100%'}} contentStyle={{height:'100%',alignItems:'center',justifyContent:'center'}}><StickerGlyph id={sticker} size={44}/></PixelFrame></Pressable>;
}
export function HomeScreen({goals,selectedId,onSelectGoal,onAdd,onSettings,onSlotPress,year,month,onMonthChange,selectedDate,onDateSelect,onTarget,cumulative}:{goals:readonly PocketGoal[];selectedId:string;onSelectGoal:(id:string)=>void;onAdd:()=>void;onSettings:()=>void;onSlotPress:(number:number)=>void;year:number;month:number;onMonthChange:(year:number,month:number)=>void;selectedDate?:string;onDateSelect:(date:string)=>void;onTarget?:TargetHandler;/** 그 목표에 현재 붙어 있는 스티커 총수 (PRD 4.3). 월별 진행과 별개 값이다. */cumulative?:number}) {
  const root=useRef<View>(null),add=useRef<View>(null),slot=useRef<View>(null);
  const goal=goals.find(item=>item.id===selectedId)??goals[0];
  const capture=()=>{measureTarget(root.current,add.current,'add',onTarget);measureTarget(root.current,slot.current,'slot',onTarget)};
  const count=goal.kind==='tally'?goal.filled.length:Object.keys(goal.calendarRecords).filter(date=>date.startsWith(`${year}-${String(month).padStart(2,'0')}`)).length;
  const total=goal.kind==='calendar'?new Date(year,month,0).getDate():goal.total;
  const next=Array.from({length:goal.total},(_,i)=>i+1).find(n=>!goal.filled.includes(n));
  // 달력판에서만 좌우 스와이프로 월을 넘긴다 (PRD 4.3). 적립판은 월 개념이 없다.
  // useRef(...).current로 만들면 첫 렌더의 year/month를 가둬서 두 번째 스와이프부터
  // 같은 달로만 이동한다. 값이 바뀌면 다시 만들어야 하므로 useMemo를 쓴다.
  const shiftMonth=useCallback((delta:number)=>{
    const d=new Date(year,month-1+delta,1);onMonthChange(d.getFullYear(),d.getMonth()+1);
  },[year,month,onMonthChange]);
  const swipe=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>24&&Math.abs(g.dx)>Math.abs(g.dy)*1.5,
    onPanResponderRelease:(_,g)=>{if(g.dx<=-48)shiftMonth(1);else if(g.dx>=48)shiftMonth(-1)},
  }),[shiftMonth]);
  return <View ref={root} onLayout={capture} style={{flex:1}}><RetroScreen style={{gap:12}}>
    <View style={{height:44,flexDirection:'row',gap:10,alignItems:'center'}}><PixelIcon name="flower" size={44}/><PixelText variant="brand">차곡차곡</PixelText><PixelText variant="title" style={{marginLeft:'auto'}}>{month}월</PixelText></View>
    <View style={{flexDirection:'row',alignItems:'stretch',gap:8,flexWrap:'wrap'}}>{goals.map(item=><GoalChip key={item.id} label={item.name} value={item.kind==='tally'?item.filled.length:Object.keys(item.calendarRecords).length} total={item.total} selected={goal.id===item.id} onPress={()=>onSelectGoal(item.id)} style={{flexGrow:1,flexBasis:100,width:undefined}}/>)}<View ref={add} onLayout={capture}><PixelButton label="" accessibilityLabel="목표 추가" variant="secondary" minHeight={56} icon={<PixelIcon name="plus" size={20}/>} onPress={onAdd} style={{width:52}}/></View></View>
    <PixelPanel title={goal.name} action={<Pressable accessibilityRole="button" accessibilityLabel="목표 설정" onPress={onSettings} style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><PixelIcon name="gear" size={36}/></Pressable>}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><PixelText variant="number">{count} / {total}</PixelText><GoalStickerLink sticker={goal.sticker} onPress={onSettings}/></View>
      {cumulative!==undefined&&<PixelText style={{marginTop:4}}>차곡차곡 {cumulative}칸</PixelText>}
      <View style={{height:retro.layout.progressGridGap}}/>
      {goal.kind==='calendar'?<View {...swipe.panHandlers}><CalendarBoard year={year} month={month} records={goal.calendarRecords} selectedDate={selectedDate} onSelect={onDateSelect} onMonthChange={onMonthChange}/></View>:<StickerGrid>{Array.from({length:goal.total},(_,i)=>{const n=i+1;return <View key={n} ref={n===next?slot:undefined} onLayout={n===next?capture:undefined} style={{width:'100%',height:'100%'}}><GoalStickerCell number={n} sticker={goal.filledStickers?.[n]??goal.sticker} state={goal.filled.includes(n)?'filled':n===next?'available':'empty'} onPress={()=>onSlotPress(n)}/></View>})}</StickerGrid>}
    </PixelPanel>
  </RetroScreen></View>;
}
export type GoalDraft={name:string;kind:BoardKind;total:number;sticker:PocketStickerId};
export function GoalEditorScreen({mode,initialGoal,onBack,onSubmit,onTarget}:{mode:'create'|'settings';initialGoal?:PocketGoal;onBack:()=>void;onSubmit:(draft:GoalDraft)=>void;onTarget?:TargetHandler}) {
  const [name,setName]=useState(initialGoal?.name??'');
  const [kind,setKind]=useState<BoardKind>(initialGoal?.kind??'tally');
  const [count,setCount]=useState(String(initialGoal?.total??15));
  const [sticker,setSticker]=useState<PocketStickerId>(initialGoal?.sticker??'sprout');
  const [choosing,setChoosing]=useState(mode==='settings');
  const root=useRef<View>(null),selected=useRef<View>(null);
  const capture=()=>measureTarget(root.current,selected.current,'sticker',onTarget);
  const valid=name.trim().length>0&&(kind==='calendar'||(/^\d+$/.test(count)&&Number(count)>0&&Number(count)<=100));
  return <View ref={root} onLayout={capture} style={{flex:1}}><RetroScreen avoidKeyboard>
    <ScreenHeader title={mode==='create'?'새 목표':'목표 설정'} onBack={onBack}/>
    {mode==='settings'?<PixelFrame variant="input" fill={retro.color.screen} contentStyle={{padding:12,gap:12}}><PixelInput label="목표 이름" value={name} onChangeText={setName}/><View style={{flexDirection:'row',justifyContent:'space-between',borderTopWidth:retro.shape.panelTitleBorder,borderColor:retro.color.ink,paddingTop:12}}><PixelText>{kind==='tally'?'적립판':'달력판'}</PixelText><PixelText>{kind==='tally'?`${count}칸`:'월별'}</PixelText></View></PixelFrame>:<><PixelInput label="목표 이름" value={name} onChangeText={setName} placeholder="목표 이름"/><BoardTypePicker value={kind} onChange={setKind}/>{kind==='tally'&&<SlotCountPicker value={count} onChange={setCount}/>}</>}
    {choosing?<PixelPanel title="기본 스티커"><StickerPicker value={sticker} onChange={setSticker} selectedTargetRef={selected} onSelectedLayout={capture}/>{mode==='create'&&<PixelButton label="선택 완료" variant="secondary" onPress={()=>setChoosing(false)}/>}</PixelPanel>:<View style={{gap:8}}><PixelText>기본 스티커</PixelText><StickerSummary value={sticker} onChange={()=>setChoosing(true)}/></View>}
    {!valid&&name.trim().length>0&&<PixelText accessibilityRole="alert">칸 수를 1–100 사이로 입력해주세요.</PixelText>}
    <PixelButton label={mode==='create'?'만들기':'저장하기'} disabled={!valid} onPress={()=>onSubmit({name:name.trim(),kind,total:kind==='calendar'?30:Number(count),sticker})}/>
  </RetroScreen></View>;
}
export function RecordScreen({goal,sticker,date,initialMemo='',photo,photoPreview,onChoosePhoto,onRemovePhoto,onBack,onSave,onRemoveSticker}:{goal:PocketGoal;/** 이 기록의 스티커. 없으면 목표의 기본 스티커 */sticker?:PocketStickerId;date:string;initialMemo?:string;photo?:ImageSourcePropType;photoPreview?:ReactNode;onChoosePhoto:()=>void;onRemovePhoto:()=>void;onBack:()=>void;onSave:(memo:string)=>void;onRemoveSticker:()=>void}) {
  const [memo,setMemo]=useState(initialMemo);
  return <RetroScreen style={{gap:16}} avoidKeyboard><ScreenHeader title="기록" onBack={onBack} action={<PixelButton label="저장" onPress={()=>onSave(memo)}/>}/><RecordSummary goalName={goal.name} date={date} sticker={sticker??goal.sticker}/><PhotoAttachment source={photo} preview={photoPreview} onChoose={onChoosePhoto} onRemove={onRemovePhoto}/><MemoEditor value={memo} onChange={setMemo}/><TextAction label="스티커 떼기" icon={<ActionSymbol name="minus" size={20}/>} onPress={onRemoveSticker}/></RetroScreen>;
}
export function TutorialScreen({initialStep=1,onFinish}:{initialStep?:TutorialStep;onFinish?:()=>void}) {
  const [step,setStep]=useState<TutorialStep>(initialStep),[done,setDone]=useState(false);
  const [size,setSize]=useState({width:390,height:760});
  const [targets,setTargets]=useState<Partial<Record<TargetName,LayoutRectangle>>>({});
  const capture=useCallback<TargetHandler>((name,rect)=>setTargets(previous=>JSON.stringify(previous[name])===JSON.stringify(rect)?previous:{...previous,[name]:rect}),[]);
  const finish=useCallback(()=>{setDone(true);onFinish?.()},[onFinish]);
  const target=targets[step===1?'add':step===2?'sticker':'slot'];
  const home=<HomeScreen goals={exampleGoals} selectedId="reading" onSelectGoal={()=>{}} onAdd={()=>{}} onSettings={()=>{}} onSlotPress={()=>{}} year={2026} month={9} onMonthChange={()=>{}} onDateSelect={()=>{}} onTarget={capture}/>;
  return <View onLayout={e=>setSize({width:e.nativeEvent.layout.width,height:e.nativeEvent.layout.height})} style={{flex:1}}>
    <View style={{flex:1}} pointerEvents={done?'auto':'none'} accessibilityElementsHidden={!done} {...(!done?{'aria-hidden':true}:{})}>{step===2&&!done?<GoalEditorScreen mode="settings" initialGoal={exampleGoals[0]} onBack={()=>{}} onSubmit={()=>{}} onTarget={capture}/>:home}</View>
    {!done&&target&&<TutorialSpotlight highlightFrame={step===1} step={step} target={target} width={size.width} height={size.height} onSkip={finish} onNext={()=>step===3?finish():setStep(previous=>(previous+1) as TutorialStep)}/>}
    {done&&<View style={{padding:20}}><PixelText accessibilityRole="alert">튜토리얼을 마쳤어요</PixelText><PixelButton label="다시 보기" variant="secondary" onPress={()=>{setStep(1);setDone(false)}}/></View>}
  </View>;
}
