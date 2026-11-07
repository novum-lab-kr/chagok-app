import React,{useEffect,useMemo,useState} from 'react';
import {AccessibilityInfo,View} from 'react-native';
import Svg,{G,Path} from 'react-native-svg';
import source from '../../docs/design/character/character-data.json';
import {PixelText} from './components';
import {t} from '../i18n';
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

/** letters: 앱 이름 글자 수. 언어마다 달라도 글자 치는 시간 합은 같게 둔다(한국어 4자 기준, 2026-11-02). */
export function splashTimeline(o=S2B,letters=4):SplashTimeline {
  const type=o.type*4/letters;
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
  for (let n=1;n<=letters;n++) {events.push({t,landed:3,text:n,cursor:true,dx});t+=type;}
  for (let k=0;k<4;k++) {events.push({t,landed:3,text:letters,cursor:k%2===1,dx});t+=o.blink;}
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
/** 기기 언어의 스플래시 글자(차곡차곡, Chagok Chagok)를 한 자씩 친다. */
function Typed({word,n,cursor}:{word:string;n:number;cursor:boolean}) {
  const typed=word.slice(0,n),rest=word.slice(n);
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
 * 앱 첫 화면 전에 한 번 재생하는 스플래시. 캐릭터 그림(24칸)은 화면 정가운데 — OS 스플래시가 그림을 가운데에 놓기 때문이다.
 * - reduceMotion: 생략하면 기기 설정을 따른다. 켜져 있으면 마지막 장면만 보여 주고 바로 onDone.
 * - at: 그 시점(ms)에서 멈춘 장면만 그린다(검토용).
 */
export function SplashAnimation({onDone,reduceMotion,at}:{onDone?:()=>void;reduceMotion?:boolean;at?:number}) {
  // 영어는 「Chagok Chagok」. 글자 수가 늘어도 전체 길이는 같다 (2026-11-02 시안에서 고름)
  const word=t('splash.word');
  const tl=useMemo(()=>splashTimeline(S2B,word.length),[word]);
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
    // 지금 장면을 그린 뒤에 다음 장면 하나만 건다(가짜 타이머로 테스트할 수 있게 rAF 대신 setTimeout).
    // 시각을 처음에 다 걸어 두면, 시작 직후 아래 홈 화면을 그리느라 JS가 0.5초쯤 막힐 때 밀린 장면이
    // 한꺼번에 처리돼 색이 한 번에 찼다(2026-11-05 실기기 개발 빌드). 막히면 그만큼 기다렸다가 한 줄씩 이어 간다.
    const next=tl.events[index+1];
    const id=setTimeout(()=>{if (next) setIndex(index+1); else onDone?.();},(next?.t??tl.total)-tl.events[index].t);
    return ()=>clearTimeout(id);
  },[at,reduced,tl,onDone,index]);
  const frame=at!==undefined?splashFrameAt(tl,at):reduced?tl.events[tl.events.length-1]:tl.events[index];
  return <View accessible accessibilityLabel={word} style={{flex:1,backgroundColor:retro.color.screen,alignItems:'center',justifyContent:'center'}}>
    {/* Svg 위쪽 12칸은 떨어지는 판 자리다. 그림 24칸의 가운데(Svg 위에서 24칸)가 화면 정가운데에 오게 옮긴다. */}
    <View style={{alignItems:'center',transform:[{translateY:-(24*CELL-(36*CELL+TEXT_H)/2)}]}}>
      <Scene f={frame}/>
      <View style={{height:TEXT_H,justifyContent:'center'}}>
        {frame.text?<Typed word={word} n={frame.text} cursor={!!frame.cursor}/>:null}
      </View>
    </View>
  </View>;
}
