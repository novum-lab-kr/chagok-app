import React,{useState} from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {BoardTypePicker,SlotCountPicker,StickerPicker,StickerSummary,RecordSummary,PhotoAttachment,MemoEditor,MonthNavigation,PixelPanel,PixelText,pocketStickers,StickerGlyph,type BoardKind,type PocketStickerId} from '../src/design-system';
const meta={title:'Components/Screen Building Blocks'} satisfies Meta;
export default meta;type Story=StoryObj<typeof meta>;
function BoardDemo(){const [kind,setKind]=useState<BoardKind>('tally'),[count,setCount]=useState('15');return <View style={{maxWidth:350,gap:24}}><BoardTypePicker value={kind} onChange={setKind}/>{kind==='tally'&&<SlotCountPicker value={count} onChange={setCount}/>}</View>}
function StickerDemo(){const [value,setValue]=useState<PocketStickerId>('sprout');return <PixelPanel title="기본 스티커" style={{maxWidth:350}}><StickerPicker value={value} onChange={setValue}/></PixelPanel>}
function PhotoDemo(){const [memo,setMemo]=useState('');const [attached,setAttached]=useState(false);return <View style={{maxWidth:350,gap:20}}><PhotoAttachment preview={attached?<View style={{gap:12,alignItems:'center'}}><StickerGlyph id="book" size={80}/><PixelText>사진 미리보기 영역</PixelText></View>:undefined} onChoose={()=>setAttached(true)} onRemove={()=>setAttached(false)}/><MemoEditor value={memo} onChange={setMemo}/></View>}
function MonthDemo(){const [date,setDate]=useState({year:2026,month:9});return <View style={{maxWidth:350}}><MonthNavigation {...date} onChange={(year,month)=>setDate({year,month})}/></View>}
export const GoalOptions:Story={name:'판 종류 · 칸 수',render:()=> <BoardDemo/>};
export const StickerCatalog:Story={name:'스티커 필터 · 선택',render:()=> <StickerDemo/>};
export const StickerSummaryRow:Story={name:'기본 스티커 요약',render:()=> <View style={{maxWidth:350}}><StickerSummary value="sprout"/></View>};
export const RecordMetadata:Story={name:'기록 요약',render:()=> <View style={{maxWidth:350}}><RecordSummary goalName="책 읽기" date="2026년 9월 21일" sticker="sprout"/></View>};
export const PhotoAndMemo:Story={name:'사진 · 메모 · 빈 상태',render:()=> <PhotoDemo/>};
export const CalendarNavigation:Story={name:'달력 월 이동',render:()=> <MonthDemo/>};
export const StickerGlyphs:Story={name:'도트 스티커 6종',render:()=> <View style={{flexDirection:'row',flexWrap:'wrap',gap:24}}>{pocketStickers.map(item=><View key={item.id} style={{width:100,alignItems:'center',gap:12}}><StickerGlyph id={item.id} size={56}/><PixelText>{item.label}</PixelText></View>)}</View>};
