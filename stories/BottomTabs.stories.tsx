import React,{useState,type ReactNode} from 'react';
import {View,useWindowDimensions} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {
  AccountBackupPanel,BoardDetailScreen,CompletionNudge,FloatingTabBar,GoalListScreen,PixelPanel,PurchasePanel,RecordTimelineScreen,RetroScreen,
  SettingRow,StickerCollectionScreen,TabTitle,TrialReadyCard,colorPack,retro,togglePack,
  type GoalCardItem,type GoalListTab,type StickerId,type TabItem,type TimelineDayView,
} from '../src/design-system';
import type {ColorStickerPackId} from '../src/stickers/color/catalog';

const meta={title:'Screens/Bottom Tabs',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'하단 탭 (2026-10-12 확정 시안 4차: 떠 있는 바 + 살구색 아이콘, 목표·기록·스티커·설정). 판·기록·묶음 화면은 탭 위에 쌓여 탭 바가 없다. 광고는 목표 탭에서만 탭 바 바로 위(8pt 띄움). 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const c=retro.color;
const noop=()=>{};

type Tab='index'|'records'|'stickers'|'settings';
const TABS:readonly TabItem<Tab>[]=[{key:'index',label:'목표',icon:'goal'},{key:'records',label:'기록',icon:'record'},{key:'stickers',label:'스티커',icon:'sticker'},{key:'settings',label:'설정',icon:'settings'}];
/** 화면 + 하단 탭. 앱에서는 expo-router Tabs가 같은 배치를 한다(app/(tabs)/_layout.tsx). */
function Stage({tab,children,ad=false}:{tab?:Tab;children:ReactNode;/** 목표 탭 광고 자리(AdMob 배너 연결 전) */ad?:boolean}) {
  const {width}=useWindowDimensions();
  return <View style={{width:Math.min(width,390),height:844,backgroundColor:c.screen}}>
    <View style={{flex:1}}>{children}</View>
    {ad&&<View style={{paddingBottom:8}}><AdSlot/></View>}
    {tab&&<FloatingTabBar items={TABS} value={tab} onChange={noop}/>}
  </View>;
}
/** 광고 자리: 앱 밖에서 오는 그림이라 앱 팔레트를 쓰지 않는다(광고 위치 시안과 같은 회색 상자). */
function AdSlot() {
  return <View style={{height:62,backgroundColor:'#f1f1f1',borderTopWidth:1,borderBottomWidth:1,borderColor:'#c9c9c9',justifyContent:'center',paddingHorizontal:12}}>
    <View style={{position:'absolute',left:12,top:13,width:36,height:36,backgroundColor:'#d9d9d9'}}/>
  </View>;
}

const active:GoalCardItem[]=[
  {id:'reading',name:'책 읽기',sticker:'basic.sprout',kind:'적립판',percent:40,status:['40% 채웠어요']},
  {id:'walk',name:'매일 저녁 동네 한 바퀴 걷기',sticker:'basic.shoe',kind:'달력판',percent:30,status:['이번 달 30% 채웠어요']},
  {id:'water',name:'물 여덟 잔 마시기',sticker:'basic.flower',kind:'달력판',percent:30,status:['이번 달 30% 채웠어요']},
];
const completed:GoalCardItem[]=[{id:'stretch',name:'자기 전 스트레칭 십 분',sticker:'basic.star',kind:'적립판',percent:100,status:['100%','9/29 완성']}];
function Goals({trial=false,initialTab='active',list=active,done=completed}:{trial?:boolean;initialTab?:GoalListTab;list?:GoalCardItem[];done?:GoalCardItem[]}) {
  const [tab,setTab]=useState<GoalListTab>(initialTab);
  return <GoalListScreen tab={tab} onTab={setTab} active={list} completed={done} onOpen={noop} onAdd={noop}
    notice={trial&&tab==='active'?<TrialReadyCard days={7} onChoose={noop} onClose={noop}/>:undefined}/>;
}

const days:TimelineDayView[]=[
  {key:'2026-10-12',label:'10월 12일 월요일',entries:[
    {id:'s1',goalName:'책 읽기',sticker:'basic.sprout',memo:'데미안 3장까지. 싱클레어가 처음으로 자기 길을 생각하는 장면이 좋았다.'},
    {id:'s2',goalName:'매일 저녁 동네 한 바퀴 걷기',sticker:'basic.shoe',memo:'노을이 예뻐서 한 바퀴 더 돌았다.'},
  ]},
  {key:'2026-10-11',label:'10월 11일 일요일',entries:[{id:'s3',goalName:'물 여덟 잔 마시기',sticker:'basic.flower',memo:'오후에 몰아서 마셨다.'}]},
  {key:'2026-10-09',label:'10월 9일 금요일',entries:[{id:'s4',goalName:'책 읽기',sticker:'basic.sprout',memo:'카페 창가 자리에서 한 시간.'}]},
];
const goals=[{id:'reading',name:'책 읽기'},{id:'walk',name:'매일 저녁 동네 한 바퀴 걷기'},{id:'water',name:'물 여덟 잔 마시기'}];
function Records({initialGoal=null}:{initialGoal?:string|null}) {
  const [goal,setGoal]=useState<string|null>(initialGoal);
  const shown=goal?days.map(d=>({...d,entries:d.entries.filter(e=>goals.find(g=>g.id===goal)?.name===e.goalName)})).filter(d=>d.entries.length):days;
  return <RecordTimelineScreen days={shown} goals={goals} goal={goal} onGoal={setGoal} onOpen={noop}/>;
}
function Stickers() {
  const [mine,setMine]=useState(false);
  const [open,setOpen]=useState<readonly ColorStickerPackId[]>([]);
  return <StickerCollectionScreen packs={[colorPack('basic','free'),colorPack('animals_normal','trial','2일 남음'),colorPack('snack_normal','locked'),colorPack('sports_normal','locked')]}
    mine={mine} onChangeMine={setMine} openPacks={open} onToggle={id=>setOpen(o=>togglePack(o,id))} reward={{days:5,goal:7}} onOpenPack={noop}/>;
}
function Settings() {
  return <RetroScreen style={{gap:16}} header={<TabTitle title="설정"/>}>
    <AccountBackupPanel status={{state:'local'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
    <PurchasePanel adFree={false} onRemoveAds={noop} onRestore={noop}/>
    <PixelPanel title="도움말"><SettingRow label="사용법 다시 보기" onPress={noop}/></PixelPanel>
    <PixelPanel title="정보"><SettingRow label="약관과 라이선스" onPress={noop}/></PixelPanel>
  </RetroScreen>;
}
const star='basic.star' as StickerId;

export const GoalsTab:Story={name:'1 목표 탭',render:()=><Stage tab="index" ad><Goals/></Stage>};
export const GoalsTabTrial:Story={name:'1 목표 탭 · 체험 열림 카드',render:()=><Stage tab="index" ad><Goals trial/></Stage>};
export const GoalsTabCompleted:Story={name:'1 목표 탭 · 완성한 판',render:()=><Stage tab="index" ad><Goals initialTab="completed"/></Stage>};
export const GoalsTabNoneCompleted:Story={name:'1 목표 탭 · 완성한 판 없음',render:()=><Stage tab="index" ad><Goals initialTab="completed" done={[]}/></Stage>};
export const GoalsTabEmpty:Story={name:'1 목표 탭 · 목표 없음',render:()=><Stage tab="index" ad><Goals list={[]} done={[]}/></Stage>};
export const GoalsTabAdFree:Story={name:'1 목표 탭 · 광고 제거를 산 뒤',render:()=><Stage tab="index"><Goals/></Stage>};
export const RecordsTab:Story={name:'2 기록 탭',render:()=><Stage tab="records"><Records/></Stage>};
export const RecordsTabFiltered:Story={name:'2 기록 탭 · 목표 고름',render:()=><Stage tab="records"><Records initialGoal="reading"/></Stage>};
export const RecordsTabEmpty:Story={name:'2 기록 탭 · 비었을 때',render:()=><Stage tab="records"><RecordTimelineScreen days={[]} goals={[]} goal={null} onGoal={noop} onOpen={noop}/></Stage>};
export const StickersTab:Story={name:'3 스티커 탭',render:()=><Stage tab="stickers"><Stickers/></Stage>};
export const SettingsTab:Story={name:'4 설정 탭',render:()=><Stage tab="settings"><Settings/></Stage>};
export const CompletionNudgeOnBoard:Story={name:'5 판 완성 뒤 · 다음 판 권하기',render:()=><Stage>
  <BoardDetailScreen name="자기 전 스트레칭 십 분" sticker={star} completed progress={{value:20,total:20,percentLabel:'100%'}} onBack={noop} onSettings={noop}
    board={{kind:'tally',total:20,filled:Object.fromEntries(Array.from({length:20},(_,i)=>[i+1,star])),onPress:noop,onOpenRecord:noop}}
    notice={<CompletionNudge onStickers={noop} onClose={noop}/>}/>
</Stage>};
