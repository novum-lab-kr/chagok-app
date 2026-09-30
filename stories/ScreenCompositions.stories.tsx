import React,{useEffect,useRef,useState} from 'react';
import {View,Image} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {HomeScreen,GoalEditorScreen,RecordScreen,TutorialScreen,exampleGoals,PixelText,type PocketGoal,type GoalDraft} from '../src/design-system';

const meta={title:'Screens/Review Set 02',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'review-set-02의 구성 요소를 기존 디자인 시스템으로 조합합니다. 데모 상태는 메모리에만 유지하며 기존 앱/DB와 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;type Story=StoryObj<typeof meta>;
const recordReference=new URL('../docs/design/retro-pocket-v1/review-set-02/screens/05-sticker-record.png',import.meta.url).href;
// The demo photo is a viewport of the reference photo only; the screen is not used as UI.
function ReferencePhoto(){const [width,setWidth]=useState(320);const scale=width/586;return <View accessibilityLabel="책과 물컵 기록 사진" onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{width:'100%',height:'100%',overflow:'hidden'}}><Image source={{uri:recordReference}} style={{position:'absolute',width:1024*scale,height:1536*scale,left:width/2-515*scale,top:-460*scale}} resizeMode="stretch"/></View>}
export function ReviewFlow({initial='home',initialSelected='reading'}:{initial?:'home'|'create'|'settings'|'record';initialSelected?:string}) {
  const [goals,setGoals]=useState<PocketGoal[]>(()=>exampleGoals.map(goal=>({...goal,filled:[...goal.filled],calendarRecords:{...goal.calendarRecords}})));
  const [selected,setSelected]=useState(initialSelected),[screen,setScreen]=useState(initial);
  const [month,setMonth]=useState({year:2026,month:9}),[selectedDate,setSelectedDate]=useState('2026-09-21');
  const [recordNumber,setRecordNumber]=useState(6),[memo,setMemo]=useState('열 페이지만 읽으려다가\n한 챕터를 다 읽었다.');
  const [photo,setPhoto]=useState(true),[notice,setNotice]=useState('');
  const [photoUri,setPhotoUri]=useState<string>();
  const fileInput=useRef<HTMLInputElement>(null);
  useEffect(()=>()=>{if(photoUri)URL.revokeObjectURL(photoUri)},[photoUri]);
  const goal=goals.find(item=>item.id===selected)!;
  const home=()=>setScreen('home');
  const update=(draft:GoalDraft)=>{
    if(screen==='create'){const id=`goal-${goals.length+1}`;setGoals(old=>[...old,{id,...draft,filled:[],calendarRecords:{}}]);setSelected(id);}else setGoals(old=>old.map(item=>item.id===selected?{...item,...draft}:item));
    setNotice(screen==='create'?'목표를 만들었어요':'목표를 저장했어요');home();
  };
  const slot=(number:number)=>{
    if(goal.filled.includes(number)){setRecordNumber(number);setScreen('record');}else setGoals(old=>old.map(item=>item.id===selected?{...item,filled:[...item.filled,number]}:item));
  };
  const dateSelect=(date:string)=>{setSelectedDate(date);if(goal.calendarRecords[date])setScreen('record');else setGoals(old=>old.map(item=>item.id===selected?{...item,calendarRecords:{...item.calendarRecords,[date]:item.sticker}}:item));};
  const remove=()=>{setGoals(old=>old.map(item=>{if(item.id!==selected)return item;if(item.kind==='tally')return {...item,filled:item.filled.filter(n=>n!==recordNumber)};const dates={...item.calendarRecords};delete dates[selectedDate];return {...item,calendarRecords:dates}}));setNotice('스티커를 뗐어요');home();};
  return <View style={{width:390,maxWidth:'100%'}}>
    <input ref={fileInput} aria-label="기록 사진 선택" type="file" accept="image/*" style={{display:'none'}} onChange={event=>{const file=event.target.files?.[0];if(file){setPhotoUri(URL.createObjectURL(file));setPhoto(true)}event.target.value=''}}/>
    {screen==='home'?<HomeScreen goals={goals} selectedId={selected} onSelectGoal={id=>{setSelected(id);setNotice('')}} onAdd={()=>setScreen('create')} onSettings={()=>setScreen('settings')} onSlotPress={slot} year={month.year} month={month.month} onMonthChange={(year,month)=>setMonth({year,month})} selectedDate={selectedDate} onDateSelect={dateSelect}/>:screen==='record'?<RecordScreen goal={goal} date={goal.kind==='calendar'?selectedDate:'2026년 9월 21일'} initialMemo={memo} photo={photo&&photoUri?{uri:photoUri}:undefined} photoPreview={photo&&!photoUri?<ReferencePhoto/>:undefined} onChoosePhoto={()=>fileInput.current?.click()} onRemovePhoto={()=>{setPhoto(false);setPhotoUri(undefined)}} onBack={home} onSave={value=>{setMemo(value);setNotice('기록을 저장했어요');home()}} onRemoveSticker={remove}/>:<GoalEditorScreen key={`${screen}-${selected}`} mode={screen==='create'?'create':'settings'} initialGoal={screen==='settings'?goal:undefined} onBack={home} onSubmit={update}/>}
    {notice.length>0&&<View style={{padding:20}}><PixelText accessibilityRole="alert">{notice}</PixelText></View>}
  </View>;
}
export const TallyHome:Story={name:'01 · 적립판 홈',render:()=> <ReviewFlow/>};
export const CalendarHome:Story={name:'02 · 달력판 홈',render:()=> <ReviewFlow initialSelected="walking"/>};
export const NewGoal:Story={name:'03 · 새 목표',render:()=> <ReviewFlow initial="create"/>};
export const GoalSettings:Story={name:'04 · 목표 설정',render:()=> <ReviewFlow initial="settings"/>};
export const StickerRecord:Story={name:'05 · 기록',render:()=> <ReviewFlow initial="record"/>};
export const TutorialGoal:Story={name:'06 · 튜토리얼 목표',render:()=> <TutorialScreen initialStep={1}/>};
export const TutorialSticker:Story={name:'07 · 튜토리얼 스티커',render:()=> <TutorialScreen initialStep={2}/>};
export const TutorialPlace:Story={name:'08 · 튜토리얼 붙이기',render:()=> <TutorialScreen initialStep={3}/>};
