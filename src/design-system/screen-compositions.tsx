import React,{useState,type ReactNode} from 'react';
import {View,Pressable,type ImageSourcePropType} from 'react-native';
import {retro} from './tokens';
import {PixelButton,PixelFrame,StickerSlot,StickMotion,removeStickerAction} from './components';
import {ActionSymbol,StickerGlyph,stickerLabel,type StickerId} from './sticker-glyphs';
import {RetroScreen,ScreenHeader,RecordSummary,PhotoAttachment,MemoEditor,TextAction,type BoardKind} from './composition-controls';

export interface PocketGoal {id:string;name:string;kind:BoardKind;total:number;sticker:StickerId;filled:number[];calendarRecords:Record<string,StickerId>;/** 칸 번호 → 실제로 붙은 스티커. 없으면 기본 스티커로 그린다. 기본 스티커를 바꿔도 이미 붙은 칸은 그대로여야 한다 (PRD 4.4). */filledStickers?:Record<number,StickerId>}
export const exampleGoals:readonly PocketGoal[]=[
  {id:'reading',name:'책 읽기',kind:'tally',total:15,sticker:'basic.sprout',filled:[1,2,3,4,5,6],calendarRecords:{}},
  {id:'walking',name:'산책',kind:'calendar',total:30,sticker:'basic.shoe',filled:[],calendarRecords:Object.fromEntries([2,4,7,10,14,17,20].map(day=>[`2026-09-${String(day).padStart(2,'0')}`,'basic.shoe' as const]))},
];
/**
 * 판의 한 칸. `onOpenRecord`를 주면 붙인 칸은 한 번 누르기 = 기록 열기, 꾹 누르기 = onPress(떼기)다 (PRD 4.5).
 * 없으면 기존처럼 누르는 즉시 onPress를 부른다. `readonly`(완성한 판)면 붙이기·떼기를 막고 기록 열기만 남긴다.
 */
export function GoalStickerCell({number,sticker,state,onPress,enabled,hasRecord=false,onOpenRecord,readonly=false,popIn=false}:{number:number;sticker:StickerId;state:'filled'|'available'|'empty';onPress:()=>void;enabled?:boolean;/** 사진이나 비어 있지 않은 메모가 있으면 true */hasRecord?:boolean;/** 붙인 칸의 기록 열기 (한 번 누르기) */onOpenRecord?:()=>void;readonly?:boolean;/** 방금 붙인 칸: 붙이기 모션 (PRD 4.5) */popIn?:boolean}) {
  const filled=state==='filled';
  const open=filled?onOpenRecord:undefined;
  const press=open??(readonly?undefined:onPress);
  const remove=open&&!readonly?onPress:undefined;
  const active=readonly?!!open:enabled;
  const slot=sticker==='sprout'||state!=='filled'
    ? <StickerSlot number={number} width="100%" height="100%" state={state} onPress={press} onLongPress={remove} enabled={active}/>
    : <Pressable accessibilityRole="button" accessibilityLabel={`${number}번 칸, ${stickerLabel(sticker)} 스티커`} disabled={active===false} onPress={press} onLongPress={remove}
      accessibilityActions={remove?[removeStickerAction]:undefined} onAccessibilityAction={e=>{if(e.nativeEvent.actionName===removeStickerAction.name)remove?.()}} style={{width:'100%',height:'100%'}}><PixelFrame variant="slot" style={{height:'100%'}} contentStyle={{height:'100%',alignItems:'center',justifyContent:'center'}}><StickerGlyph id={sticker} size={48}/></PixelFrame></Pressable>;
  return <View style={{width:'100%',height:'100%'}}>{popIn&&filled?<StickMotion style={{width:'100%',height:'100%'}}>{slot}</StickMotion>:slot}{state==='filled'&&hasRecord&&<View pointerEvents="none" accessibilityLabel="사진 또는 메모 기록 있음" style={{position:'absolute',right:4,top:4,width:12,height:12,backgroundColor:retro.color.primary,borderColor:retro.color.ink,borderWidth:2}}/>}</View>;
}
export function RecordScreen({goal,sticker,date,initialMemo='',photo,photoPreview,onPhotoError,onChoosePhoto,onRemovePhoto,onBack,onSave,onRemoveSticker,onMemoChange,photoActionsInFrame=false,readonly=false}:{goal:PocketGoal;/** 이 기록의 스티커. 없으면 목표의 기본 스티커 */sticker?:StickerId;date:string;initialMemo?:string;photo?:ImageSourcePropType;photoPreview?:ReactNode;onPhotoError?:()=>void;onChoosePhoto:()=>void;onRemovePhoto:()=>void;onBack:()=>void;onSave:(memo:string)=>void;onRemoveSticker:()=>void;onMemoChange?:(memo:string)=>void;photoActionsInFrame?:boolean;/** 완성한 판의 기록: 보기만 한다. 저장·사진 바꾸기·떼기를 숨긴다 */readonly?:boolean}) {
  const [memo,setMemo]=useState(initialMemo);
  return <RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title="기록" onBack={onBack} action={readonly?undefined:<PixelButton label="저장" onPress={()=>onSave(memo)}/>}/>}><RecordSummary goalName={goal.name} date={date} sticker={sticker??goal.sticker}/><PhotoAttachment source={photo} preview={photoPreview} onPhotoError={onPhotoError} onChoose={onChoosePhoto} onRemove={onRemovePhoto} actionsInFrame={photoActionsInFrame} readonly={readonly}/><MemoEditor value={memo} readonly={readonly} onChange={value=>{setMemo(value);onMemoChange?.(value)}}/>{!readonly&&<TextAction label="스티커 떼기" icon={<ActionSymbol name="minus" size={20}/>} onPress={onRemoveSticker}/>}</RetroScreen>;
}
