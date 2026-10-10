import React from 'react';
import {Pressable,View} from 'react-native';
import Svg,{Circle} from 'react-native-svg';
import {StickerGlyph,isColorStickerId,type StickerId} from './sticker-glyphs';
import {PixelText} from './components';
import {Mascot} from './mascot';
import {StickerArtwork} from '../stickers/pocket/StickerArtwork';
import {retro} from './tokens';
/** 위젯은 컬러 스티커로 그린다. 흑백 ID는 팔레트 색으로 칠한다(예전 미리보기). */
const WidgetSticker=({id,size,color}:{id:StickerId;size:number;color:string})=>isColorStickerId(id)?<StickerGlyph id={id} size={size}/>:<StickerArtwork id={id} size={size} color={color}/>;

/** 위젯 화면 모델 (위젯 설계). 스냅샷(src/widgets/snapshot.ts)이 이 모양을 채운다 — GoalCardItem과 같은 방식. */
export type WidgetCalendarCell='filled'|'missed'|'future'|'outside';
export type WidgetTallyCell='filled'|'empty';
export type WidgetMini=
  |{type:'calendar';year:number;month:number;firstWeekday:number;days:WidgetCalendarCell[]}
  |{type:'tally';from:number;cells:WidgetTallyCell[];/** 다음 묶음. 위젯에서 지금 묶음을 다 채우면 앱 없이 넘어간다 (2026-10-10) */nextCells?:WidgetTallyCell[];placed:number;total:number};
export type WidgetGoalView={id:string;name:string;sticker:StickerId;kind:string;progressLabel:string;percent:number;mini:WidgetMini};

/*
 * 2026-10-04 확정 모양 (PRD 4.10): 링 위젯 + 달력 위젯, 테두리 없이 꽉 채움, 판 종류 배지 없음, `n% 채웠어요`.
 * 실제 위젯은 iOS SwiftUI·Android 위젯으로 따로 그린다. 이것은 시안 검토용 RN 미리보기다.
 */
/** iPhone 16 Pro 위젯 크기(pt). 모서리는 시스템이 깎는다. */
export const WIDGET_SIZES={small:{width:170,height:170},medium:{width:364,height:170}} as const;
const RADIUS=23;
/** 민트·아이보리는 위젯 설정에서 고른다. 유리는 iOS 투명·틴트 모드에서 시스템이 바꾸는 모습을 흉내 낸 것이다. */
export type WidgetBackground='mint'|'ivory'|'glass';
type Tap={onStick?:(goalId:string)=>void;onOpen?:(goalId:string)=>void;/** 위젯에서 방금 붙임 → [되돌리기] */justPlaced?:boolean;onUndo?:(goalId:string)=>void;background?:WidgetBackground};

function palette(bg:WidgetBackground){
  return bg==='glass'
    ?{fill:'rgba(255,255,255,0.18)',ink:'#FFFFFF',track:'rgba(255,255,255,0.3)',empty:'transparent',missed:'rgba(255,255,255,0.3)',button:'rgba(255,255,255,0.22)'}
    :{fill:bg==='mint'?retro.color.screen:retro.color.secondary,ink:retro.color.ink,track:'rgba(6,38,28,0.2)',empty:retro.color.secondary,missed:retro.color.lcd,button:retro.color.secondary};
}
type Pal=ReturnType<typeof palette>;

function Frame({size,bg,children,padding=16,row=false}:{size:'small'|'medium';bg:WidgetBackground;children:React.ReactNode;padding?:number;row?:boolean}) {
  return <View style={{...WIDGET_SIZES[size],borderRadius:RADIUS,overflow:'hidden',backgroundColor:palette(bg).fill,padding,flexDirection:row?'row':'column',
    ...(bg==='glass'?{borderWidth:1,borderColor:'rgba(255,255,255,0.28)'}:null)}}>{children}</View>;
}
/** 진행 문구에서 기준 달("이번 달", "9월")만 떼어 낸다. 적립판은 빈 문자열. */
const basisOf=(g:WidgetGoalView)=>g.progressLabel.replace(/\s*\d+%$/,'');

function Progress({g,p,size}:{g:WidgetGoalView;p:Pal;size:number}) {
  return <View style={{flexDirection:'row',alignItems:'baseline',gap:4}}>
    <PixelText style={{color:p.ink,fontSize:size,lineHeight:size+4}}>{`${g.percent}%`}</PixelText>
    <PixelText style={{color:p.ink,fontSize:13,lineHeight:16}}>채웠어요</PixelText>
  </View>;
}
function Undo({g,p,onUndo}:{g:WidgetGoalView;p:Pal;onUndo?:(id:string)=>void}) {
  return <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
    <PixelText style={{color:p.ink,fontSize:13,lineHeight:16}}>붙였어요</PixelText>
    <Pressable accessibilityRole="button" onPress={()=>onUndo?.(g.id)} style={{borderWidth:2,borderColor:p.ink,paddingHorizontal:8,paddingVertical:1,backgroundColor:p.button}}>
      <PixelText style={{color:p.ink,fontSize:13,lineHeight:18}}>되돌리기</PixelText>
    </Pressable>
  </View>;
}

function Ring({g,p,size,onStick}:{g:WidgetGoalView;p:Pal;size:number;onStick?:(id:string)=>void}) {
  const r=size/2-5,c=2*Math.PI*r,disc=size-22;
  return <View style={{width:size,height:size}}>
    <Svg width={size} height={size} style={{position:'absolute',transform:[{rotate:'-90deg'}]}}>
      <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={p.track} strokeWidth={7}/>
      <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={p.ink} strokeWidth={7} strokeDasharray={`${c*g.percent/100} ${c}`}/>
    </Svg>
    <Pressable accessibilityRole="button" accessibilityLabel={`${g.name}에 붙이기`} onPress={()=>onStick?.(g.id)}
      style={{position:'absolute',left:11,top:11,width:disc,height:disc,borderRadius:disc/2,alignItems:'center',justifyContent:'center'}}>
      <WidgetSticker id={g.sticker} size={Math.round(disc*0.62)} color={p.ink}/>
    </Pressable>
  </View>;
}
function RingUnit({g,p,size,tap}:{g:WidgetGoalView;p:Pal;size:number;tap:Tap}) {
  return <View style={{flex:1,minWidth:0,alignItems:'center',gap:4}}>
    <Ring g={g} p={p} size={size} onStick={tap.onStick}/>
    {tap.justPlaced?<Undo g={g} p={p} onUndo={tap.onUndo}/>:null}
    <Pressable onPress={()=>tap.onOpen?.(g.id)} style={{alignItems:'center',gap:2,maxWidth:'100%'}}>
      {tap.justPlaced?null:<Progress g={g} p={p} size={22}/>}
      <PixelText numberOfLines={1} style={{color:p.ink,fontSize:13,lineHeight:16}}>{g.name}</PixelText>
    </Pressable>
  </View>;
}

/** 링 위젯 · 작은: 목표 하나. 링 안쪽 = 붙이기, 숫자·이름 = 판 상세. */
export function WidgetRingSmall({goal,background='mint',...tap}:{goal:WidgetGoalView}&Tap) {
  return <Frame size="small" bg={background} padding={12}><RingUnit g={goal} p={palette(background)} size={92} tap={tap}/></Frame>;
}
/** 링 위젯 · 중간: 목표 세 개까지. */
export function WidgetRingMedium({goals,background='mint',justPlacedId,...tap}:{goals:readonly WidgetGoalView[];justPlacedId?:string}&Omit<Tap,'justPlaced'>) {
  const p=palette(background);
  return <Frame size="medium" bg={background} padding={12} row>
    {goals.slice(0,3).map(g=><RingUnit key={g.id} g={g} p={p} size={84} tap={{...tap,justPlaced:justPlacedId===g.id}}/>)}
  </Frame>;
}

function Board({g,p,cell,today}:{g:WidgetGoalView;p:Pal;cell:number;today?:number}) {
  const m=g.mini,box={width:cell,height:cell,borderWidth:1.5,borderColor:p.ink};
  const mark={borderColor:retro.color.primary,borderWidth:2};
  const color=(s:WidgetCalendarCell|WidgetTallyCell)=>s==='filled'?p.ink:s==='missed'?p.missed:p.empty;
  if (m.type==='calendar') return <View style={{flexDirection:'row',flexWrap:'wrap',gap:2,width:7*(cell+2)}}>
    {Array.from({length:m.firstWeekday}).map((_,i)=><View key={`pad-${i}`} style={{width:cell,height:cell}}/>)}
    {m.days.map((d,i)=><View key={i} testID={`day-${i+1}`} style={[box,{backgroundColor:d==='outside'?'transparent':color(d),borderWidth:d==='outside'?0:1.5},today===i+1?mark:null]}/>)}
  </View>;
  const next=m.cells.indexOf('empty');
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:2,width:10*(cell+2)}}>
    {m.cells.map((c,i)=><View key={i} testID={`slot-${m.from+i}`} style={[box,{backgroundColor:color(c)},i===next?mark:null]}/>)}
  </View>;
}
function NameRow({g,p,lines,icon}:{g:WidgetGoalView;p:Pal;lines:number;icon:number}) {
  return <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}>
    <WidgetSticker id={g.sticker} size={icon} color={p.ink}/>
    <PixelText numberOfLines={lines} style={{flex:1,color:p.ink,fontSize:16,lineHeight:20}}>{g.name}</PixelText>
  </View>;
}
/** 달력 위젯 · 작은: 이름 + 이번 달 판. 판 = 붙이기. */
export function WidgetBoardSmall({goal,today,background='mint',...tap}:{goal:WidgetGoalView;/** 오늘 날짜(일). 달력판 오늘 칸 표시 */today?:number}&Tap) {
  const p=palette(background);
  return <Frame size="small" bg={background} padding={14}>
    <Pressable onPress={()=>tap.onOpen?.(goal.id)}><NameRow g={goal} p={p} lines={1} icon={20}/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${goal.name}에 붙이기`} onPress={()=>tap.onStick?.(goal.id)} style={{flex:1,alignItems:'center',justifyContent:'flex-end'}}>
      <Board g={goal} p={p} cell={12} today={today}/>
    </Pressable>
    {tap.justPlaced?<Undo g={goal} p={p} onUndo={tap.onUndo}/>:null}
  </Frame>;
}
/** 달력 위젯 · 중간: 왼쪽 이름·진행, 오른쪽 판(달력판 이번 달, 적립판 다음 빈칸이 든 묶음). */
export function WidgetBoardMedium({goal,today,background='mint',...tap}:{goal:WidgetGoalView;today?:number}&Tap) {
  const p=palette(background),basis=basisOf(goal);
  return <Frame size="medium" bg={background} row>
    <Pressable onPress={()=>tap.onOpen?.(goal.id)} style={{width:116,gap:6}}>
      <NameRow g={goal} p={p} lines={2} icon={24}/>
      <View style={{flex:1}}/>
      {tap.justPlaced?<Undo g={goal} p={p} onUndo={tap.onUndo}/>:<>
        {basis?<PixelText style={{color:p.ink,fontSize:13,lineHeight:16,opacity:0.72}}>{basis}</PixelText>:null}
        <Progress g={goal} p={p} size={22}/>
      </>}
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${goal.name}에 붙이기`} onPress={()=>tap.onStick?.(goal.id)} style={{flex:1,alignItems:'center',justifyContent:'center',marginLeft:12}}>
      <Board g={goal} p={p} cell={goal.mini.type==='calendar'?16:18} today={today}/>
    </Pressable>
  </Frame>;
}

/** 목표가 없거나 로그아웃 뒤 빈 기기: 졸린 캐릭터 + 첫 목표 만들기 (PRD 4.10). */
export function WidgetEmpty({size,background='mint',onCreate}:{size:'small'|'medium';background?:WidgetBackground;onCreate?:()=>void}) {
  const p=palette(background);
  return <Frame size={size} bg={background}>
    <Pressable onPress={onCreate} style={{flex:1,alignItems:'center',justifyContent:'center',gap:6}}>
      <Mascot pose="sleepy" size={size==='small'?72:76}/>
      <PixelText style={{color:p.ink,fontSize:16,lineHeight:20,textAlign:'center'}}>첫 목표를 만들어 보세요</PixelText>
      {size==='medium'?<View style={{borderWidth:2,borderColor:p.ink,paddingHorizontal:8,paddingVertical:1,backgroundColor:p.button}}>
        <PixelText style={{color:p.ink,fontSize:13,lineHeight:18}}>목표 만들기</PixelText>
      </View>:null}
    </Pressable>
  </Frame>;
}
