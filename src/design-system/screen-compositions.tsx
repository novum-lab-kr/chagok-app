import React,{useContext,useState,type ReactNode} from 'react';
import {View,Pressable,type ImageSourcePropType} from 'react-native';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import {SCREEN_PADDING,PixelButton,PixelFrame,StickerSlot,StickMotion,removeStickerAction} from './components';
import {retro} from './tokens';
import {ActionSymbol,StickerGlyph,stickerLabel,type StickerId} from './sticker-glyphs';
import {RetroScreen,ScreenHeader,RecordSummary,PhotoAttachment,MemoEditor,TextAction,type BoardKind} from './composition-controls';
import {t} from '../i18n';

export interface PocketGoal {id:string;name:string;kind:BoardKind;total:number;sticker:StickerId;filled:number[];calendarRecords:Record<string,StickerId>;/** 칸 번호 → 실제로 붙은 스티커. 없으면 기본 스티커로 그린다. 기본 스티커를 바꿔도 이미 붙은 칸은 그대로여야 한다 (PRD 4.4). */filledStickers?:Record<number,StickerId>}
export const exampleGoals:readonly PocketGoal[]=[
  {id:'reading',get name(){return t('example.reading')},kind:'tally',total:15,sticker:'basic.clover',filled:[1,2,3,4,5,6],calendarRecords:{}},
  {id:'walking',get name(){return t('example.walking')},kind:'calendar',total:30,sticker:'basic.shoe',filled:[],calendarRecords:Object.fromEntries([2,4,7,10,14,17,20].map(day=>[`2026-09-${String(day).padStart(2,'0')}`,'basic.shoe' as const]))},
];
/**
 * 판의 한 칸. `onOpenRecord`를 주면 붙인 칸은 한 번 누르기 = 기록 열기, 꾹 누르기 = onPress(떼기)다 (PRD 4.5).
 * 없으면 기존처럼 누르는 즉시 onPress를 부른다.
 */
export function GoalStickerCell({number,sticker,state,onPress,enabled,hasRecord=false,onOpenRecord,popIn=false}:{number:number;sticker:StickerId;state:'filled'|'available'|'empty';onPress:()=>void;enabled?:boolean;/** 사진이나 비어 있지 않은 메모가 있으면 true */hasRecord?:boolean;/** 붙인 칸의 기록 열기 (한 번 누르기) */onOpenRecord?:()=>void;/** 방금 붙인 칸: 붙이기 모션 (PRD 4.5) */popIn?:boolean}) {
  const filled=state==='filled';
  const open=filled?onOpenRecord:undefined;
  const press=open??onPress;
  const remove=open?onPress:undefined;
  const active=enabled;
  const slot=sticker==='sprout'||state!=='filled'
    ? <StickerSlot number={number} width="100%" height="100%" state={state} onPress={press} onLongPress={remove} enabled={active}/>
    : <Pressable accessibilityRole="button" accessibilityLabel={t('slot.withSticker',number,stickerLabel(sticker))} disabled={active===false} onPress={press} onLongPress={remove}
      accessibilityActions={remove?[removeStickerAction]:undefined} onAccessibilityAction={e=>{if(e.nativeEvent.actionName===removeStickerAction.name)remove?.()}} style={{width:'100%',height:'100%'}}><PixelFrame variant="slot" style={{height:'100%'}} contentStyle={{height:'100%',alignItems:'center',justifyContent:'center'}}><StickerGlyph id={sticker} size={48}/></PixelFrame></Pressable>;
  return <View style={{width:'100%',height:'100%'}}>{popIn&&filled?<StickMotion style={{width:'100%',height:'100%'}}>{slot}</StickMotion>:slot}{state==='filled'&&hasRecord&&<View pointerEvents="none" accessibilityLabel={t('calendar.hasRecord')} style={{position:'absolute',right:4,top:4,width:12,height:12,backgroundColor:retro.color.primary,borderColor:retro.color.ink,borderWidth:2}}/>}</View>;
}
/** 아래 안내 카드가 가리는 만큼 내용 끝에 둘 자리. 카드를 연 채로 「스티커 떼기」까지 내려 볼 수 있다 */
const NOTICE_ROOM=150;
export function RecordScreen({notice,goal,sticker,date,initialMemo='',photo,photoPreview,onPhotoError,onChoosePhoto,onTakePhoto,onRemovePhoto,onBack,onSave,onRemoveSticker,onMemoChange,photoActionsInFrame=false,memoMaxLength,memoError}:{/** 화면 아래에 떠 있는 안내(저장 뒤 카드, 2026-11-02) */notice?:ReactNode;goal:PocketGoal;/** 이 기록의 스티커. 없으면 목표의 기본 스티커 */sticker?:StickerId;date:string;initialMemo?:string;photo?:ImageSourcePropType;photoPreview?:ReactNode;onPhotoError?:()=>void;onChoosePhoto:()=>void;onTakePhoto?:()=>void;onRemovePhoto:()=>void;onBack:()=>void;onSave:(memo:string)=>void;onRemoveSticker:()=>void;onMemoChange?:(memo:string)=>void;photoActionsInFrame?:boolean;memoMaxLength?:number;/** 메모 아래 검사 문구. 호스트가 onMemoChange로 받은 값에서 정한다 */memoError?:string}) {
  const [memo,setMemo]=useState(initialMemo);
  const insets=useContext(SafeAreaInsetsContext);
  return <View style={{flex:1}}><RetroScreen style={{gap:16}} avoidKeyboard header={<ScreenHeader title={t('record.title')} onBack={onBack} action={<PixelButton label={t('common.save')} onPress={()=>onSave(memo)}/>}/>}><RecordSummary goalName={goal.name} date={date} sticker={sticker??goal.sticker}/><PhotoAttachment source={photo} preview={photoPreview} onPhotoError={onPhotoError} onChoose={onChoosePhoto} onTakePhoto={onTakePhoto} onRemove={onRemovePhoto} actionsInFrame={photoActionsInFrame}/><MemoEditor value={memo} maxLength={memoMaxLength} error={memoError} onChange={value=>{setMemo(value);onMemoChange?.(value)}}/><TextAction label={t('slot.removeSticker')} icon={<ActionSymbol name="minus" size={20}/>} onPress={onRemoveSticker}/>{notice&&<View style={{height:NOTICE_ROOM}}/>}</RetroScreen>{notice&&<View style={{position:'absolute',left:SCREEN_PADDING,right:SCREEN_PADDING,bottom:(insets?.bottom??0)+SCREEN_PADDING}}>{notice}</View>}</View>;
}
