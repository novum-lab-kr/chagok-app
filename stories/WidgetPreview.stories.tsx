import React,{useState} from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {PixelText,WidgetBoardMedium,WidgetBoardSmall,WidgetEmpty,WidgetRingMedium,WidgetRingSmall} from '../src/design-system';
import type {WidgetBackground} from '../src/design-system';
import {buildWidgetSnapshot} from '../src/widgets/snapshot';
import type {WidgetInput} from '../src/widgets/snapshot';
import type {Goal} from '../src/domain/types';

const meta={title:'Widgets/Preview',parameters:{docs:{description:{component:'홈 화면 위젯 RN 미리보기 — 2026-10-04 확정 모양(PRD 4.10): 링 위젯 + 달력 위젯, 테두리 없이 꽉 채움, 바탕 민트·아이보리·유리. 실제 위젯은 iOS SwiftUI·Android 위젯으로 따로 그린다. 유리는 iOS 투명·틴트 모드를 흉내 낸 것이다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;

const now=new Date(2026,8,16,12);
const today=now.getDate();
/** 적립판 묶음: 달력 위젯 중간 크기는 한 줄 10칸 × 2줄 (위젯 시안 6-달력). */
const CHUNK=20;
const base:Goal={id:'g',name:'산책하기',boardType:'calendar',totalSlots:null,defaultStickerId:'shoe',createdAt:new Date(2026,8,1).getTime(),endDate:null,completedAt:null,completionSeen:false,lastPlacedAt:null,initialSlots:null};
const days=(n:number)=>Array.from({length:n},(_,i)=>`2026-09-${String(i+1).padStart(2,'0')}`).filter((_,i)=>i%3!==1);
const examples:Record<string,WidgetInput>={
  calendar:{goal:base,placedAll:10,placedDates:days(15),slotIndexes:[]},
  tally:{goal:{...base,id:'t',name:'책 20권 읽기',boardType:'tally',totalSlots:20,initialSlots:20,defaultStickerId:'book'},placedAll:7,placedDates:[],slotIndexes:[0,1,2,3,4,5,6]},
  water:{goal:{...base,id:'w',name:'물 마시기',defaultStickerId:'star'},placedAll:4,placedDates:days(6),slotIndexes:[]},
  big:{goal:{...base,id:'b',name:'물 100잔',boardType:'tally',totalSlots:100,initialSlots:100,defaultStickerId:'flower'},placedAll:45,placedDates:[],slotIndexes:Array.from({length:45},(_,i)=>i)},
  long:{goal:{...base,id:'l',name:'아침마다 스트레칭하고 산책하기',defaultStickerId:'cat'},placedAll:3,placedDates:days(4),slotIndexes:[]},
};
const views=(...keys:string[])=>{const s=buildWidgetSnapshot(keys.map(k=>examples[k]),now,CHUNK);return keys.map(k=>s.goals.find(g=>g.id===examples[k].goal.id)!);};
const backgrounds:WidgetBackground[]=['mint','ivory','glass'];
const bgLabel={mint:'민트',ivory:'아이보리',glass:'유리 (iOS 투명 모드 흉내)'};

/** 홈 화면 바탕. 유리는 어두운 바탕화면 위에서 본다. */
function Wall({bg,children}:{bg:WidgetBackground;children:React.ReactNode}) {
  return <View style={{backgroundColor:bg==='glass'?'#2F5FA8':'#E4E7EB',padding:16,gap:12,borderRadius:8}}>
    <PixelText style={{color:bg==='glass'?'#FFFFFF':undefined,fontSize:13,lineHeight:18}}>{bgLabel[bg]}</PixelText>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:16,alignItems:'flex-start'}}>{children}</View>
  </View>;
}
const Page=({children}:{children:React.ReactNode})=><View style={{padding:16,gap:16,alignSelf:'flex-start'}}>{children}</View>;

export const Ring:Story={name:'링 위젯 · 작은(목표 하나) · 중간(목표 세 개)',render:()=>{
  const [cal,tal,water]=views('calendar','tally','water');
  return <Page>{backgrounds.map(bg=><Wall key={bg} bg={bg}><WidgetRingSmall goal={cal} background={bg}/><WidgetRingMedium goals={[cal,tal,water]} background={bg}/></Wall>)}</Page>;
}};
export const Board:Story={name:'달력 위젯 · 작은 · 중간(달력판·적립판)',render:()=>{
  const [cal,tal]=views('calendar','tally');
  return <Page>{backgrounds.map(bg=><Wall key={bg} bg={bg}><WidgetBoardSmall goal={cal} today={today} background={bg}/><WidgetBoardMedium goal={cal} today={today} background={bg}/><WidgetBoardMedium goal={tal} background={bg}/></Wall>)}</Page>;
}};
export const Edge:Story={name:'긴 이름 · 큰 적립판(100칸 중 45칸)',render:()=>{
  const [long,big,cal]=views('long','big','calendar');
  return <Page><Wall bg="mint"><WidgetRingSmall goal={long}/><WidgetRingMedium goals={[long,big,cal]}/><WidgetBoardMedium goal={long} today={today}/><WidgetBoardMedium goal={big}/></Wall></Page>;
}};
export const Empty:Story={name:'목표 없음 (졸린 캐릭터)',render:()=><Page>{backgrounds.map(bg=><Wall key={bg} bg={bg}><WidgetEmpty size="small" background={bg}/><WidgetEmpty size="medium" background={bg}/></Wall>)}</Page>};

/** 눌러 보기: 링 안쪽·판을 누르면 붙고 [되돌리기]가 나온다. 그 밖은 판 상세를 연다(여기서는 안내 문구만). */
function TryIt() {
  const [placed,setPlaced]=useState<Record<string,WidgetInput>>(()=>({calendar:examples.calendar,tally:examples.tally,water:examples.water}));
  const [last,setLast]=useState<string|null>(null);
  const [msg,setMsg]=useState('링 안쪽이나 판을 눌러 보세요');
  const key=(id:string)=>Object.keys(placed).find(k=>placed[k].goal.id===id)!;
  const add=(id:string)=>{const k=key(id),i=placed[k],day=`2026-09-${String(today).padStart(2,'0')}`;
    const next=i.goal.boardType==='calendar'
      ?{...i,placedDates:i.placedDates.includes(day)?i.placedDates:[...i.placedDates,day]}
      :{...i,placedAll:i.placedAll+1,slotIndexes:[...i.slotIndexes,i.slotIndexes.length]};
    setPlaced({...placed,[k]:next});setLast(id);setMsg(`${i.goal.name}에 붙였어요`);};
  const undo=(id:string)=>{const k=key(id);setPlaced({...placed,[k]:examples[k]});setLast(null);setMsg('되돌렸어요');};
  const open=(id:string)=>setMsg(`앱이 열리고 「${placed[key(id)].goal.name}」 판 상세가 보여요`);
  const s=buildWidgetSnapshot(Object.values(placed),now,CHUNK),g=(k:string)=>s.goals.find(x=>x.id===placed[k].goal.id)!;
  return <Page>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>
      <WidgetRingMedium goals={[g('calendar'),g('tally'),g('water')]} justPlacedId={last??undefined} onStick={add} onOpen={open} onUndo={undo}/>
      <WidgetBoardMedium goal={g('calendar')} today={today} justPlaced={last===placed.calendar.goal.id} onStick={add} onOpen={open} onUndo={undo}/>
    </View>
    <PixelText>{msg}</PixelText>
  </Page>;
}
export const Try:Story={name:'눌러 보기',render:()=><TryIt/>};
