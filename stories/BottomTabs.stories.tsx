import React,{useState} from 'react';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {
  BoardDetailScreen,CompletionNudge,GoalListScreen,RecordFeedScreen,RecordTimelineScreen,StickerCollectionScreen,TrialReadyCard,colorPack,togglePack,
  type FeedPostView,type GoalCardItem,type GoalListTab,type RecordView,type TimelineDayView,
} from '../src/design-system';
import type {ColorStickerPackId} from '../src/stickers/color/catalog';
import {SettingsTab as Settings,Stage,noop} from './support/frame';
import {boardOf,cardFor,goals as fixtures,stickersOf} from './support/goals';
import {samplePhotos as photo} from './support/photos';

const meta={title:'Screens/Bottom Tabs',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'하단 탭 (2026-10-12 확정 시안 4차: 떠 있는 바 + 살구색 아이콘, 목표·기록·스티커·설정. 2026-10-15: 글자 없이 아이콘 32, 기록 아이콘은 노트, 누른 채 끌면 민트 도트 칸이 따라오고 놓으면 바뀜). 판·기록·묶음 화면은 탭 위에 쌓여 탭 바가 없다. 광고는 목표 탭에서만 탭 바 바로 위(8pt 띄움). 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const active:GoalCardItem[]=[cardFor('reading'),cardFor('walk'),cardFor('water')];
const completed:GoalCardItem[]=[cardFor('stretch')];
function Goals({trial=false,initialTab='active',list=active,done=completed}:{trial?:boolean;initialTab?:GoalListTab;list?:GoalCardItem[];done?:GoalCardItem[]}) {
  const [tab,setTab]=useState<GoalListTab>(initialTab);
  return <GoalListScreen tab={tab} onTab={setTab} active={list} completed={done} onOpen={noop} onAdd={noop}
    notice={trial&&tab==='active'?<TrialReadyCard days={7} onChoose={noop} onClose={noop}/>:undefined}/>;
}

const days:TimelineDayView[]=[
  {key:'2026-10-12',label:'10월 12일 월요일',entries:[
    {id:'s1',goalName:'책 읽기',sticker:'basic.sprout',memo:'데미안 3장까지. 싱클레어가 처음으로 자기 길을 생각하는 장면이 좋았다.',photo:photo.shelf},
    {id:'s2',goalName:'매일 저녁 동네 한 바퀴 걷기',sticker:'basic.shoe',memo:'노을이 예뻐서 한 바퀴 더 돌았다.',photo:photo.sunset},
  ]},
  {key:'2026-10-11',label:'10월 11일 일요일',entries:[{id:'s3',goalName:'물 여덟 잔 마시기',sticker:'basic.flower',memo:'오후에 몰아서 마셨다.'}]},
  {key:'2026-10-10',label:'10월 10일 토요일',entries:[{id:'s5',goalName:'매일 저녁 동네 한 바퀴 걷기',sticker:'basic.shoe',photo:photo.tree},{id:'s6',goalName:'물 여덟 잔 마시기',sticker:'basic.flower',memo:'물 대신 보리차도 한 잔.',photo:photo.tea}]},
  {key:'2026-10-09',label:'10월 9일 금요일',entries:[{id:'s4',goalName:'책 읽기',sticker:'basic.sprout',memo:'카페 창가 자리에서 한 시간.'}]},
  {key:'2026-10-03',label:'10월 3일 토요일',entries:[{id:'s7',goalName:'매일 저녁 동네 한 바퀴 걷기',sticker:'basic.shoe',photo:photo.clouds}]},
];
const goals=[{id:'reading',name:'책 읽기',sticker:'basic.sprout'},{id:'walk',name:'매일 저녁 동네 한 바퀴 걷기',sticker:'basic.shoe'},{id:'water',name:'물 여덟 잔 마시기',sticker:'basic.flower'}] as const;
function Records({initialGoal=null,initialView='timeline'}:{initialGoal?:string|null;initialView?:RecordView}) {
  const [goal,setGoal]=useState<string|null>(initialGoal);
  const [view,setView]=useState<RecordView>(initialView);
  const shown=goal?days.map(d=>({...d,entries:d.entries.filter(e=>goals.find(g=>g.id===goal)?.name===e.goalName)})).filter(d=>d.entries.length):days;
  return <RecordTimelineScreen days={shown} goals={goals} goal={goal} onGoal={setGoal} onOpen={noop} view={view} onView={setView} onOpenFeed={noop}/>;
}
function Stickers() {
  const [mine,setMine]=useState(false);
  const [open,setOpen]=useState<readonly ColorStickerPackId[]>([]);
  return <StickerCollectionScreen packs={[colorPack('basic','free'),colorPack('animals_normal','trial','2일 남음'),{...colorPack('snack_normal','locked'),price:'2,200원'},{...colorPack('sports_normal','locked'),price:'2,200원'}]}
    mine={mine} onChangeMine={setMine} openPacks={open} onToggle={id=>setOpen(o=>togglePack(o,id))} reward={{days:5,goal:7}} onOpenPack={noop}/>;
}
export const GoalsTab:Story={name:'1 목표 탭',render:()=><Stage tab="index" ad><Goals/></Stage>};
export const GoalsTabTrial:Story={name:'1 목표 탭 · 체험 열림 카드',render:()=><Stage tab="index" ad><Goals trial/></Stage>};
export const GoalsTabCompleted:Story={name:'1 목표 탭 · 완성한 판',render:()=><Stage tab="index" ad><Goals initialTab="completed"/></Stage>};
export const GoalsTabNoneCompleted:Story={name:'1 목표 탭 · 완성한 판 없음',render:()=><Stage tab="index" ad><Goals initialTab="completed" done={[]}/></Stage>};
export const GoalsTabEmpty:Story={name:'1 목표 탭 · 목표 없음',render:()=><Stage tab="index" ad><Goals list={[]} done={[]}/></Stage>};
export const GoalsTabAdFree:Story={name:'1 목표 탭 · 광고 제거를 산 뒤',render:()=><Stage tab="index"><Goals/></Stage>};
export const RecordsTab:Story={name:'2 기록 탭',render:()=><Stage tab="records"><Records/></Stage>};
export const RecordsTabFiltered:Story={name:'2 기록 탭 · 목표 고름',render:()=><Stage tab="records"><Records initialGoal="reading"/></Stage>};
export const RecordsTabFeed:Story={name:'2 기록 탭 · 사진으로 보기',render:()=><Stage tab="records"><Records initialView="feed"/></Stage>};
export const RecordsTabFeedFiltered:Story={name:'2 기록 탭 · 사진으로 보기, 목표 고름',render:()=><Stage tab="records"><Records initialView="feed" initialGoal="walk"/></Stage>};
// 펼친 화면: 피드에서 「노을」 칸을 눌렀을 때. 그 기록부터 이어진다
const posts:FeedPostView[]=days.flatMap(d=>d.entries.map(e=>({...e,date:d.label.slice(0,d.label.lastIndexOf(' '))}))).slice(1);
export const RecordFeed:Story={name:'2 기록 탭 · 펼친 화면',render:()=><Stage><RecordFeedScreen posts={posts} onBack={noop} onOpen={noop}/></Stage>};
export const RecordsTabEmpty:Story={name:'2 기록 탭 · 비었을 때',render:()=><Stage tab="records"><RecordTimelineScreen days={[]} goals={[]} goal={null} onGoal={noop} onOpen={noop}/></Stage>};
export const StickersTab:Story={name:'3 스티커 탭',render:()=><Stage tab="stickers"><Stickers/></Stage>};
export const SettingsTab:Story={name:'4 설정 탭',render:()=><Stage tab="settings"><Settings status={{state:'local'}}/></Stage>};
export const CompletionNudgeOnBoard:Story={name:'5 판 완성 뒤 · 다음 판 권하기',render:()=><Stage>
  <BoardDetailScreen {...boardOf(fixtures.stretch,stickersOf.stretch)} onBack={noop} onSettings={noop} notice={<CompletionNudge onStickers={noop} onClose={noop}/>}/>
</Stage>};
