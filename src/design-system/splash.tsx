import React,{useEffect,useMemo,useState} from 'react';
import {AccessibilityInfo,View} from 'react-native';
import Svg,{G,Path} from 'react-native-svg';
import source from '../../docs/design/character/character-data.json';
import {PixelText} from './components';
import {mascotPaths} from './mascot';
import {retro} from './tokens';

/*
 * 스플래시 S2-B (2026-10-04 확정, docs/design/character/README.md 「스플래시」).
 * OS 정지 화면(윤곽선만 있는 몸)과 같은 자리·크기에서 이어받아 재생한다:
 * 색 채우기 → 판 세 장 낙하(캐릭터가 두 칸씩 좌우로 받음) → "차곡차곡" 한 자씩 + 커서.
 */
export type SplashFrame={t:number;fill?:number;landed?:number;falling?:number;dy?:number;dx?:number;catchX?:number;squash?:boolean;text?:number;cursor?:boolean};
export type SplashTimeline={events:SplashFrame[];total:number};

const S2B={fillHold:200,fillStep:28,wait:120,step:28,move:40,squash:60,gap:60,type:100,blink:160,sway:[-2,2,0]};
/** 몸이 있는 줄(위 10 ~ 아래 22). 아래 줄부터 색이 찬다. */
const BODY_TOP=10,BODY_BOTTOM=22;

export function splashTimeline(o=S2B):SplashTimeline {
  const events:SplashFrame[]=[];let t=0,dx=0;
  events.push({t,fill:24,landed:0});t+=o.fillHold;
  for (let y=BODY_BOTTOM;y>=BODY_TOP;y--) {events.push({t,fill:y,landed:0});t+=o.fillStep;}
  t+=o.wait;
  for (let i=0;i<3;i++) {
    const target=o.sway[i];
    for (let f=0;f<=6;f++) {
      if (dx!==target&&f>=1) dx+=Math.sign(target-dx);
      events.push({t,landed:i,falling:i,dy:12-f*2,dx,catchX:target});t+=o.step;
    }
    while (dx!==target) {dx+=Math.sign(target-dx);events.push({t,landed:i,falling:i,dy:0,dx,catchX:target});t+=o.move;}
    events.push({t,landed:i+1,squash:true,dx});t+=o.squash;
    events.push({t,landed:i+1,dx});t+=o.gap;
  }
  for (let n=1;n<=4;n++) {events.push({t,landed:3,text:n,cursor:true,dx});t+=o.type;}
  for (let k=0;k<4;k++) {events.push({t,landed:3,text:4,cursor:k%2===1,dx});t+=o.blink;}
  return {events,total:t};
}
/** t(ms) 시점의 장면. 마지막 이후는 마지막 장면. */
export function splashFrameAt(tl:SplashTimeline,t:number):SplashFrame {
  let cur=tl.events[0];
  for (const e of tl.events) {if (e.t<=t) cur=e; else break;}
  return cur;
}

const LAYERS=['item0_mint','item1_ivory','item2_apricot'] as const;
type LayerName='body'|typeof LAYERS[number];
/** fillFrom 위쪽 줄은 윤곽선(#)만 남긴다. */
function layerRows(name:LayerName,fillFrom=0) {
  const rows=source.splashLayers[name];
  return fillFrom<=0?rows:rows.map((r,y)=>y<fillFrom?r.replace(/[^#.]/g,'.'):r);
}
const pathCache=new Map<string,ReturnType<typeof mascotPaths>>();
function layerPaths(name:LayerName,fillFrom=0) {
  const key=`${name}:${fillFrom}`;
  let p=pathCache.get(key);
  if (!p) {p=mascotPaths(layerRows(name,fillFrom));pathCache.set(key,p);}
  return p;
}
const Layer=({name,x=0,y=0,fillFrom=0}:{name:LayerName;x?:number;y?:number;fillFrom?:number})=>
  <G transform={`translate(${x} ${y})`}>{layerPaths(name,fillFrom).map(p=><Path key={p.color} d={p.d} fill={p.color}/>)}</G>;

/** 칸 크기 7px — OS 스플래시 그림(168px)과 같다. */
const CELL=7,TEXT_H=40;
function Scene({f}:{f:SplashFrame}) {
  const dx=f.dx??0,landed=f.landed??0;
  return <Svg width={28*CELL} height={36*CELL} viewBox="-2 -12 28 36">
    <Layer name="body" x={dx} fillFrom={f.fill??0}/>
    {LAYERS.slice(0,landed).map(n=><Layer key={n} name={n} x={dx} y={f.squash?1:0}/>)}
    {f.falling!==undefined&&f.dy!==undefined?<Layer name={LAYERS[f.falling]} x={f.catchX??0} y={-(f.dy)}/>:null}
  </Svg>;
}
const WORD='차곡차곡';
function Typed({n,cursor}:{n:number;cursor:boolean}) {
  const typed=WORD.slice(0,n),rest=WORD.slice(n);
  const text={fontSize:28,lineHeight:32};
  // 왼쪽에 커서 폭만큼 비워 두면 "차곡차곡" 네 글자가 정확히 가운데에 온다(커서는 오른쪽 여백에 들어간다).
  return <View style={{flexDirection:'row',alignItems:'center'}}>
    <View style={{width:16}}/>
    <PixelText style={text}>{typed}</PixelText>
    <View style={{width:14,height:28,marginLeft:2,backgroundColor:cursor?retro.color.ink:'transparent'}}/>
    {/* 남은 글자 자리를 비워 둬서 한 자씩 써도 글자가 밀리지 않는다 */}
    {rest?<PixelText style={[text,{opacity:0,marginLeft:-16}]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{rest}</PixelText>:null}
    {rest?<View style={{width:16}}/>:null}
  </View>;
}

/**
 * 앱 첫 화면 전에 한 번 재생하는 스플래시. 캐릭터는 화면 가운데에서 24px 위(OS 스플래시와 같은 자리).
 * - reduceMotion: 생략하면 기기 설정을 따른다. 켜져 있으면 마지막 장면만 보여 주고 바로 onDone.
 * - at: 그 시점(ms)에서 멈춘 장면만 그린다(검토용).
 */
export function SplashAnimation({onDone,reduceMotion,at}:{onDone?:()=>void;reduceMotion?:boolean;at?:number}) {
  const tl=useMemo(()=>splashTimeline(),[]);
  const [deviceReduced,setDeviceReduced]=useState<boolean|null>(null);
  const reduced=reduceMotion??deviceReduced;
  const [index,setIndex]=useState(0);
  useEffect(()=>{
    if (reduceMotion!==undefined) return;
    let alive=true;
    AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(alive) setDeviceReduced(v);}).catch(()=>{if(alive) setDeviceReduced(false);});
    return ()=>{alive=false;};
  },[reduceMotion]);
  useEffect(()=>{
    if (at!==undefined||reduced===null) return;
    if (reduced) {onDone?.();return;}
    // 장면이 바뀌는 시각마다 타이머를 건다(가짜 타이머로 테스트할 수 있게 rAF 대신 setTimeout).
    const timers=tl.events.slice(1).map((e,i)=>setTimeout(()=>setIndex(i+1),e.t));
    timers.push(setTimeout(()=>onDone?.(),tl.total));
    return ()=>timers.forEach(clearTimeout);
  },[at,reduced,tl,onDone]);
  const frame=at!==undefined?splashFrameAt(tl,at):reduced?tl.events[tl.events.length-1]:tl.events[index];
  return <View accessible accessibilityLabel="차곡차곡" style={{flex:1,backgroundColor:retro.color.screen,alignItems:'center',justifyContent:'center'}}>
    {/* Svg 위쪽 12칸은 떨어지는 판 자리다. 그림 24칸의 가운데(Svg 위에서 24칸)가 화면 가운데에서 24px 위에 오게 옮긴다. */}
    <View style={{alignItems:'center',transform:[{translateY:-(24*CELL-(36*CELL+TEXT_H)/2)-24}]}}>
      <Scene f={frame}/>
      <View style={{height:TEXT_H,justifyContent:'center'}}>
        {frame.text?<Typed n={frame.text} cursor={!!frame.cursor}/>:null}
      </View>
    </View>
  </View>;
}
