import React from 'react';
import {View} from 'react-native';
import type {PocketStickerId} from '../stickers/pocket/catalog';
import {PixelBadge,PixelFrame,PixelText,ProgressBar} from './components';
import {StickerGlyph} from './sticker-glyphs';
import {retro} from './tokens';

/** 위젯 화면 모델 (위젯 설계). 스냅샷(src/widgets/snapshot.ts)이 이 모양을 채운다 — GoalCardItem과 같은 방식. */
export type WidgetCalendarCell='filled'|'missed'|'future'|'outside';
export type WidgetTallyCell='filled'|'empty';
export type WidgetMini=
  |{type:'calendar';year:number;month:number;firstWeekday:number;days:WidgetCalendarCell[]}
  |{type:'tally';from:number;cells:WidgetTallyCell[];placed:number;total:number};
export type WidgetGoalView={id:string;name:string;sticker:PocketStickerId;kind:string;progressLabel:string;percent:number;mini:WidgetMini};

/** iPhone 기준 작은·중간 위젯의 대략 크기(pt). 시안 검토용이다. */
export const WIDGET_SIZES={small:{width:158,height:158},medium:{width:338,height:158}} as const;

/** 패널 장식 안쪽부터 채운다. PixelPanel과 같은 inset 기준이고, 위젯은 작아서 추가 여백만 줄였다. */
const inner=retro.shape.panelInnerInset+4+2;

const cellColor={filled:retro.color.ink,missed:retro.color.lcd,future:retro.color.secondary,outside:retro.color.transparent,empty:retro.color.secondary} as const;

function Cell({state,testID}:{state:keyof typeof cellColor;testID?:string}) {
  return <View testID={testID} style={{width:11,height:11,backgroundColor:cellColor[state],borderWidth:state==='outside'?0:1,borderColor:retro.color.ink}}/>;
}

/** 작은 위젯: 목록 카드와 같은 정보 (위젯 설계). */
export function WidgetSmallPreview({goal}:{goal:WidgetGoalView}) {
  return <PixelFrame variant="panel" style={WIDGET_SIZES.small} contentStyle={{padding:inner,gap:4,flex:1}}>
    <StickerGlyph id={goal.sticker} size={22}/>
    <PixelText numberOfLines={2} style={{fontSize:15,lineHeight:20}}>{goal.name}</PixelText>
    <View style={{alignSelf:'flex-start'}}><PixelBadge label={goal.kind}/></View>
    <PixelText style={{fontSize:13,lineHeight:18}}>{goal.progressLabel}</PixelText>
    <ProgressBar value={goal.percent} total={100}/>
  </PixelFrame>;
}

/** 중간 위젯: 판 미니. 달력판은 이번 달, 적립판은 다음 빈칸이 든 묶음. */
export function WidgetMediumPreview({goal}:{goal:WidgetGoalView}) {
  const m=goal.mini;
  return <PixelFrame variant="panel" style={WIDGET_SIZES.medium} contentStyle={{padding:inner,gap:6,flex:1}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <StickerGlyph id={goal.sticker} size={22}/>
      <PixelText numberOfLines={1} style={{flex:1,fontSize:15,lineHeight:20}}>{goal.name}</PixelText>
      <PixelBadge label={goal.kind}/>
    </View>
    {m.type==='calendar'
      // 달력은 5–6줄이라 문구를 아래에 두면 잘린다. 달력 왼쪽, 문구 오른쪽 아래.
      ?<View style={{flex:1,flexDirection:'row',alignItems:'flex-end',gap:12}}>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:2,width:7*13}}>
          {Array.from({length:m.firstWeekday}).map((_,i)=><Cell key={`pad-${i}`} state="outside"/>)}
          {m.days.map((d,i)=><Cell key={i} testID={`day-${i+1}`} state={d}/>)}
        </View>
        <PixelText style={{flex:1,fontSize:13,lineHeight:18,textAlign:'right'}}>{goal.progressLabel}</PixelText>
      </View>
      :<>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:2}}>
          {m.cells.map((c,i)=><Cell key={i} testID={`slot-${m.from+i}`} state={c}/>)}
        </View>
        <PixelText style={{fontSize:13,lineHeight:18,textAlign:'right'}}>{`${m.placed}/${m.total} · ${goal.progressLabel}`}</PixelText>
      </>}
  </PixelFrame>;
}

/** 목표가 없거나 로그아웃 뒤 빈 기기. 재촉 문구를 쓰지 않는다. */
export function WidgetEmptyPreview() {
  return <PixelFrame variant="panel" style={WIDGET_SIZES.small} contentStyle={{padding:inner,flex:1,justifyContent:'center'}}>
    <PixelText style={{fontSize:15,lineHeight:20,textAlign:'center'}}>첫 목표를 만들어 보세요</PixelText>
  </PixelFrame>;
}
