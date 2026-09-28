import React,{useState} from 'react';
import {View,Pressable} from 'react-native';
import {PixelFocusRing,PixelIcon,PixelText,useContentWidth} from './components';
import {retro} from './tokens';
import {ActionSymbol,StickerGlyph,type PocketStickerId} from './sticker-glyphs';

export function monthCells(year:number,month:number):(number|null)[] {
  const first=new Date(year,month-1,1).getDay();
  const days=new Date(year,month,0).getDate();
  const count=Math.ceil((first+days)/7)*7;
  return Array.from({length:count},(_,index)=>index>=first&&index<first+days?index-first+1:null);
}
export const calendarDateKey=(year:number,month:number,day:number)=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
export function MonthNavigation({year,month,onChange}:{year:number;month:number;onChange:(year:number,month:number)=>void}) {
  const move=(amount:number)=>{const date=new Date(year,month-1+amount,1);onChange(date.getFullYear(),date.getMonth()+1)};
  return <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
    <Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={()=>move(-1)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><ActionSymbol name="back" size={24}/></Pressable>
    <PixelText variant="title" style={{flex:1,textAlign:'center',fontSize:22}}> {year}년 {month}월</PixelText>
    <Pressable accessibilityRole="button" accessibilityLabel="다음 달" onPress={()=>move(1)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><PixelIcon name="chevron" size={24}/></Pressable>
  </View>;
}
export function CalendarBoard({year,month,records={},selectedDate,onSelect,onMonthChange}:{year:number;month:number;records?:Record<string,PocketStickerId>;selectedDate?:string;onSelect:(date:string)=>void;onMonthChange:(year:number,month:number)=>void}) {
  const [measured,setWidth]=useState<number|null>(null);
  const width=useContentWidth(measured);
  const border=retro.shape.cellBorder;
  const cellWidth=Math.max(0,Math.floor((width-border)/7));
  return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{gap:16}}>
    <MonthNavigation year={year} month={month} onChange={onMonthChange}/>
    <View accessibilityLabel={`${year}년 ${month}월 달력`} style={{width:cellWidth*7+border,borderTopWidth:border,borderLeftWidth:border,borderColor:retro.color.ink,alignSelf:'center'}}>
      <View style={{flexDirection:'row'}}>{['일','월','화','수','목','금','토'].map(day=><View key={day} style={{width:cellWidth,height:36,alignItems:'center',justifyContent:'center',borderRightWidth:border,borderBottomWidth:border,borderColor:retro.color.ink}}><PixelText>{day}</PixelText></View>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{monthCells(year,month).map((day,index)=>{
        const date=day?calendarDateKey(year,month,day):'';
        const sticker=records[date];
        const selected=date===selectedDate;
        return <View key={index} style={{width:cellWidth,height:58,borderRightWidth:border,borderBottomWidth:border,borderColor:retro.color.ink}}>
          {day&&<Pressable accessibilityRole="button" accessibilityLabel={`${month}월 ${day}일${sticker?', 기록 있음':''}`} accessibilityState={{selected}} aria-selected={selected} onPress={()=>onSelect(date)} style={{flex:1,alignItems:'center',paddingTop:4}}>
            <PixelText style={{fontSize:14,lineHeight:18}}>{day}</PixelText>{sticker&&<StickerGlyph id={sticker} size={Math.min(28,cellWidth-6)}/>}{selected&&<PixelFocusRing/>}
          </Pressable>}
        </View>;
      })}</View>
    </View>
  </View>;
}
