import React from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {WidgetEmptyPreview,WidgetMediumPreview,WidgetSmallPreview} from '../src/design-system';
import {buildWidgetSnapshot} from '../src/widgets/snapshot';
import type {WidgetInput} from '../src/widgets/snapshot';
import type {Goal} from '../src/domain/types';

const meta={title:'Widgets/Preview',parameters:{docs:{description:{component:'홈 화면 위젯 시안 검토용 RN 미리보기 (위젯 설계). 실제 위젯은 iOS SwiftUI·Android 위젯으로 따로 그린다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;

const now=new Date(2026,8,16,12);
const base:Goal={id:'g',name:'산책하기',boardType:'calendar',totalSlots:null,defaultStickerId:'shoe',createdAt:new Date(2026,8,1).getTime(),endDate:null,completedAt:null,completionSeen:false,lastPlacedAt:null,initialSlots:null};
const days=(n:number)=>Array.from({length:n},(_,i)=>`2026-09-${String(i+1).padStart(2,'0')}`).filter((_,i)=>i%3!==1);
const examples:Record<string,WidgetInput>={
  calendar:{goal:base,placedAll:10,placedDates:days(15),slotIndexes:[]},
  period:{goal:{...base,id:'p',name:'10월 전 매일 스트레칭',endDate:'2026-09-30',defaultStickerId:'star'},placedAll:10,placedDates:days(15),slotIndexes:[]},
  tally:{goal:{...base,id:'t',name:'책 20권 읽기',boardType:'tally',totalSlots:20,initialSlots:20,defaultStickerId:'book'},placedAll:7,placedDates:[],slotIndexes:[0,1,2,3,4,5,6]},
  big:{goal:{...base,id:'b',name:'물 100잔',boardType:'tally',totalSlots:100,initialSlots:100,defaultStickerId:'flower'},placedAll:45,placedDates:[],slotIndexes:Array.from({length:45},(_,i)=>i)},
};
function Pair({input}:{input:WidgetInput}) {
  const goal=buildWidgetSnapshot([input],now).goals[0];
  return <View style={{flexDirection:'row',gap:16,padding:16,flexWrap:'wrap'}}><WidgetSmallPreview goal={goal}/><WidgetMediumPreview goal={goal}/></View>;
}
export const Calendar:Story={name:'달력판 · 종료일 없음',render:()=><Pair input={examples.calendar}/>};
export const Period:Story={name:'달력판 · 종료일 있음',render:()=><Pair input={examples.period}/>};
export const Tally:Story={name:'적립판 · 20칸',render:()=><Pair input={examples.tally}/>};
export const BigTally:Story={name:'적립판 · 100칸 중 45칸 (묶음)',render:()=><Pair input={examples.big}/>};
export const Empty:Story={name:'목표 없음',render:()=><View style={{padding:16}}><WidgetEmptyPreview/></View>};
