import React,{useState} from 'react';
import { View } from 'react-native';
import type { Meta,StoryObj } from '@storybook/react-vite';
import { expect,userEvent,within } from 'storybook/test';
import { StickerSlot,GoalStickerCell,PixelText } from '../src/design-system';
const meta={title:'Components/Stickers',parameters:{docs:{description:{component:'판의 칸: 빈칸·붙일 칸·붙인 칸과 기록 표식.'}}}} satisfies Meta;
export default meta;type Story=StoryObj<typeof meta>;
export const Slots:Story={render:()=> <View style={{flexDirection:'row',gap:16}}><StickerSlot number={1} state="filled"/><StickerSlot number={2} state="available"/><StickerSlot number={3}/></View>};
export const RecordedSlots:Story={name:'기록 표식 · 모서리 사각형',render:()=> <View style={{flexDirection:'row',flexWrap:'wrap',gap:16,maxWidth:380}}>{[
  {label:'메모만',number:1,state:'filled' as const,hasRecord:true},
  {label:'사진만',number:2,state:'filled' as const,hasRecord:true},
  {label:'둘 다',number:3,state:'filled' as const,hasRecord:true},
  {label:'기록 없음',number:4,state:'filled' as const,hasRecord:false},
  {label:'빈칸',number:5,state:'empty' as const,hasRecord:true},
].map(item=><View key={item.number} style={{width:84,gap:8,alignItems:'center'}}><View style={{width:84,height:64}}><GoalStickerCell number={item.number} sticker="basic.sprout" state={item.state} hasRecord={item.hasRecord} onPress={()=>{}}/></View><PixelText style={{fontSize:14,lineHeight:20}}>{item.label}</PixelText></View>)}</View>};
function PlaceDemo(){const [placed,set]=useState(false);return <View style={{gap:20,alignItems:'flex-start'}}><StickerSlot number={7} state={placed?'filled':'available'} onPress={()=>set(!placed)}/><PixelText>{placed?'붙인 칸을 누르면 되돌립니다.':'빈칸을 눌러 붙이기를 확인하세요.'}</PixelText></View>}
export const PlaceSticker:Story={render:()=> <PlaceDemo/>,play:async({canvasElement})=>{const c=within(canvasElement);await userEvent.click(c.getByRole('button',{name:'7번 칸, 붙일 수 있음'}));await expect(c.getByRole('button',{name:'7번 칸, 새싹이 스티커'})).toBeInTheDocument();}};
