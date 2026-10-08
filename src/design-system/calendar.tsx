import React,{useState} from 'react';
import {View,Pressable,useWindowDimensions} from 'react-native';
import {PixelFocusRing,PixelIcon,PixelText,StickMotion,useContentWidth,removeStickerAction} from './components';
import {retro} from './tokens';
import {ActionSymbol,StickerGlyph,type PocketStickerId} from './sticker-glyphs';

export function monthCells(year:number,month:number):(number|null)[] {
  const first=new Date(year,month-1,1).getDay();
  const days=new Date(year,month,0).getDate();
  const count=Math.ceil((first+days)/7)*7;
  return Array.from({length:count},(_,index)=>index>=first&&index<first+days?index-first+1:null);
}
export const calendarDateKey=(year:number,month:number,day:number)=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
/** 기간이 있는 판에서 기간 밖 달로 가는 화살표는 숨긴다. 제목이 가운데에 남도록 자리는 비워 둔다. */
export function MonthNavigation({year,month,onChange,canGoPrev=true,canGoNext=true}:{year:number;month:number;onChange:(year:number,month:number)=>void;canGoPrev?:boolean;canGoNext?:boolean}) {
  const {width}=useWindowDimensions();
  const move=(amount:number)=>{const date=new Date(year,month-1+amount,1);onChange(date.getFullYear(),date.getMonth()+1)};
  return <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
    {canGoPrev?<Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={()=>move(-1)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><ActionSymbol name="back" size={24}/></Pressable>:<View style={{width:44,height:44}}/>}
    <PixelText variant="title" numberOfLines={1} style={{flex:1,textAlign:'center',fontSize:width<=320?18:22,lineHeight:width<=320?24:30}}>{year}년 {month}월</PixelText>
    {canGoNext?<Pressable accessibilityRole="button" accessibilityLabel="다음 달" onPress={()=>move(1)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><PixelIcon name="chevron" size={24}/></Pressable>:<View style={{width:44,height:44}}/>}
  </View>;
}
export function CalendarBoard({year,month,records={},recordedDates,selectedDate,onSelect,onMonthChange,isDateEnabled,canGoPrev,canGoNext,onOpenRecord,readonly=false,poppedDate}:{/** 방금 붙인 날: 붙이기 모션 (PRD 4.5) */poppedDate?:string;year:number;month:number;records?:Record<string,PocketStickerId>;recordedDates?:ReadonlySet<string>;selectedDate?:string;onSelect:(date:string)=>void;onMonthChange:(year:number,month:number)=>void;/** false를 돌려준 날짜는 누를 수 없고 흐리게 그린다. 없으면 모든 날짜를 누를 수 있다. */isDateEnabled?:(date:string)=>boolean;canGoPrev?:boolean;canGoNext?:boolean;/** 스티커가 붙은 날의 기록 열기 (한 번 누르기) */onOpenRecord?:(date:string)=>void;/** 완성한 판: 날짜를 눌러도 붙이거나 떼지 않고 기록 열기만 남긴다 */readonly?:boolean}) {
  const [measured,setWidth]=useState<number|null>(null);
  const width=useContentWidth(measured);
  const border=retro.shape.cellBorder;
  const cellWidth=Math.max(0,Math.floor((width-border)/7));
  return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{gap:16}}>
    <MonthNavigation year={year} month={month} onChange={onMonthChange} canGoPrev={canGoPrev} canGoNext={canGoNext}/>
    <View accessibilityLabel={`${year}년 ${month}월 달력`} style={{width:cellWidth*7+border,borderTopWidth:border,borderLeftWidth:border,borderColor:retro.color.ink,alignSelf:'center'}}>
      <View style={{flexDirection:'row'}}>{['일','월','화','수','목','금','토'].map(day=><View key={day} style={{width:cellWidth,height:36,alignItems:'center',justifyContent:'center',borderRightWidth:border,borderBottomWidth:border,borderColor:retro.color.ink}}><PixelText>{day}</PixelText></View>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{monthCells(year,month).map((day,index)=>{
        const date=day?calendarDateKey(year,month,day):'';
        return <View key={index} style={{width:cellWidth,height:58,borderRightWidth:border,borderBottomWidth:border,borderColor:retro.color.ink}}>
          {day&&<CalendarDay day={day} month={month} date={date} sticker={records[date]} recorded={!!recordedDates?.has(date)} selected={date===selectedDate}
            enabled={!isDateEnabled||isDateEnabled(date)} cellWidth={cellWidth} readonly={readonly} onSelect={onSelect} onOpenRecord={onOpenRecord} popIn={date===poppedDate}/>}
        </View>;
      })}</View>
    </View>
  </View>;
}
/** 달력의 날짜 한 칸. 스티커가 붙은 날은 한 번 누르기 = 기록 열기(onOpenRecord), 꾹 누르기 = 떼기(onSelect)다. */
/**
 * 빈칸에도 꾹 누르기 처리기를 둔다. 붙은 칸을 꾹 눌러 떼면 칸이 바로 빈칸으로 다시 그려지는데, 그때 처리기가 없으면
 * 손을 떼는 순간 React Native가 한 번 누르기로 보고 빈칸 붙이기가 불려 다시 붙었다 (2026-10-08 시뮬레이터 재현).
 */
const ignoreLongPress=()=>{};
function CalendarDay({day,month,date,sticker,recorded,selected,enabled,cellWidth,readonly,onSelect,onOpenRecord,popIn}:{day:number;month:number;date:string;sticker?:PocketStickerId;recorded:boolean;selected:boolean;enabled:boolean;cellWidth:number;readonly:boolean;onSelect:(date:string)=>void;onOpenRecord?:(date:string)=>void;popIn:boolean}) {
  const open=sticker&&onOpenRecord?()=>onOpenRecord(date):undefined;
  const select=readonly?undefined:()=>onSelect(date);
  const press=open??select;
  const remove=open?select:undefined;
  const active=enabled&&(!readonly||!!open);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${month}월 ${day}일${sticker?', 스티커 있음':''}${sticker&&recorded?', 사진 또는 메모 기록 있음':''}`} accessibilityState={{selected,disabled:!active}} aria-selected={selected} aria-disabled={!active} disabled={!active} onPress={press} onLongPress={remove??ignoreLongPress}
    accessibilityActions={remove?[removeStickerAction]:undefined} onAccessibilityAction={e=>{if(e.nativeEvent.actionName===removeStickerAction.name)remove?.()}} style={{flex:1,alignItems:'center',paddingTop:4,opacity:enabled?1:retro.opacity.disabled}}>
    <PixelText style={{fontSize:14,lineHeight:18}}>{day}</PixelText>{sticker&&(popIn?<StickMotion><StickerGlyph id={sticker} size={Math.min(28,cellWidth-6)}/></StickMotion>:<StickerGlyph id={sticker} size={Math.min(28,cellWidth-6)}/>)}{selected&&<PixelFocusRing/>}
    {sticker&&recorded&&<View pointerEvents="none" accessibilityLabel="사진 또는 메모 기록 있음" style={{position:'absolute',right:2,top:2,width:10,height:10,backgroundColor:retro.color.primary,borderColor:retro.color.ink,borderWidth:2}}/>}
  </Pressable>;
}
