import React,{useState} from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {BoardTypePicker,SlotCountPicker,StickerSummary,RecordSummary,PhotoAttachment,MemoEditor,MonthNavigation,PixelText,ActionSymbol,pocketStickers,StickerGlyph,toColorStickerId,type BoardKind} from '../src/design-system';
const meta={title:'Components/Screen Building Blocks'} satisfies Meta;
export default meta;type Story=StoryObj<typeof meta>;
function BoardDemo(){const [kind,setKind]=useState<BoardKind>('tally'),[count,setCount]=useState('15');return <View style={{maxWidth:350,gap:24}}><BoardTypePicker value={kind} onChange={setKind}/>{kind==='tally'&&<SlotCountPicker value={count} onChange={setCount}/>}</View>}
function PhotoPreview({missing=false}:{missing?:boolean}){return <View style={{height:'100%',width:'100%',gap:12,alignItems:'center',justifyContent:'center'}}>{missing?<ActionSymbol name="photo" size={40}/>:<StickerGlyph id="basic.book" size={72}/>}<PixelText>{missing?'사진을 불러올 수 없어요':'사진 미리보기 영역'}</PixelText></View>}
function PhotoState({initialAttached=false,missing=false,withMemo=false}:{initialAttached?:boolean;missing?:boolean;withMemo?:boolean}){const [memo,setMemo]=useState('');const [attached,setAttached]=useState(initialAttached);return <View style={{maxWidth:350,gap:20}}><PhotoAttachment actionsInFrame preview={attached?<PhotoPreview missing={missing}/>:undefined} onChoose={()=>setAttached(true)} onTakePhoto={()=>setAttached(true)} onRemove={()=>setAttached(false)}/>{withMemo&&<MemoEditor value={memo} onChange={setMemo}/>}</View>}
function MonthDemo(){const [date,setDate]=useState({year:2026,month:9});return <View style={{maxWidth:350}}><MonthNavigation {...date} onChange={(year,month)=>setDate({year,month})}/></View>}
export const GoalOptions:Story={name:'판 종류 · 칸 수',render:()=> <BoardDemo/>};
export const StickerSummaryRow:Story={name:'기본 스티커 요약',render:()=> <View style={{maxWidth:350}}><StickerSummary value="basic.sprout"/></View>};
export const RecordMetadata:Story={name:'기록 요약',render:()=> <View style={{maxWidth:350}}><RecordSummary goalName="책 읽기" date="2026년 9월 21일" sticker="basic.sprout"/></View>};
export const PhotoAndMemo:Story={name:'사진 · 메모 · 빈 상태',render:()=> <PhotoState withMemo/>};
export const PhotoEmpty:Story={name:'사진 프레임 · 찍기·고르기',render:()=> <PhotoState/>};
export const PhotoAttached:Story={name:'사진 프레임 · 오른쪽 위 삭제',render:()=> <PhotoState initialAttached/>};
export const PhotoMissing:Story={name:'사진 프레임 · 불러오기 실패',render:()=> <PhotoState initialAttached missing/>};
export const CalendarNavigation:Story={name:'달력 월 이동',render:()=> <MonthDemo/>};
export const StickerGlyphs:Story={name:'도트 스티커 6종',render:()=> <View style={{flexDirection:'row',flexWrap:'wrap',gap:24}}>{pocketStickers.map(item=><View key={item.id} style={{width:100,alignItems:'center',gap:12}}><StickerGlyph id={toColorStickerId(item.id)} size={48}/><PixelText>{item.label}</PixelText></View>)}</View>};
