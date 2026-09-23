import React,{useEffect,useRef,useState} from 'react';
import {Platform,View,StyleSheet,type LayoutRectangle} from 'react-native';
import {PixelDialog,PixelFocusRing} from './components';
import {retro} from './tokens';
import Svg,{Path} from 'react-native-svg';

export type TutorialStep=1|2|3;
const copy={1:{title:'목표 만들기',description:'＋를 눌러 목표를 만들어요'},2:{title:'스티커 고르기',description:'목표마다 스티커를 정해요'},3:{title:'빈칸에 톡!',description:'누르면 스티커가 붙어요'}};
/** Positioned overlay for screen compositions. Target coordinates are relative to its parent. */
export function TutorialSpotlight({step,target,width,height,onNext,onSkip,highlightFrame=true}:{highlightFrame?:boolean;step:TutorialStep;target:LayoutRectangle;width:number;height:number;onNext:()=>void;onSkip:()=>void}) {
  const [dialogHeight,setDialogHeight]=useState(240);
  const dialog=useRef<View>(null);
  useEffect(()=>{
    if(Platform.OS!=='web')return;
    const element=dialog.current as unknown as HTMLElement|null;
    const previous=document.activeElement as HTMLElement|null;
    const buttons=()=>Array.from(element?.querySelectorAll<HTMLElement>('button,[role="button"]')??[]);
    buttons()[0]?.focus();
    const handle=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();onSkip();}
      if(event.key==='Tab'){const list=buttons();if(!list.length)return;const current=list.indexOf(document.activeElement as HTMLElement);const next=event.shiftKey?(current<=0?list.length-1:current-1):(current+1)%list.length;event.preventDefault();list[next]?.focus();}
    };
    element?.addEventListener('keydown',handle);
    return()=>{element?.removeEventListener('keydown',handle);previous?.focus()};
  },[step,onSkip]);
  const x=Math.max(0,target.x-4), y=Math.max(0,target.y-4);
  const w=Math.min(target.width+8,width-x), h=Math.min(target.height+8,height-y);
  const below=y+h+16;
  const above=y-dialogHeight-16;
  const top=step!==1&&above>=20?above:below+dialogHeight<=height-20?below:Math.max(20,above);
  const shade={position:'absolute' as const,backgroundColor:retro.color.ink,opacity:retro.opacity.scrim};
  return <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
    <View style={[shade,{left:0,right:0,top:0,height:y}]}/><View style={[shade,{left:0,right:0,top:y+h,bottom:0}]}/><View style={[shade,{left:0,top:y,width:x,height:h}]}/><View style={[shade,{left:x+w,right:0,top:y,height:h}]}/>
    {highlightFrame&&<View style={{position:'absolute',left:x,top:y,width:w,height:h}}><PixelFocusRing/></View>}
    <View pointerEvents="none" style={{position:'absolute',left:Math.max(28,Math.min(width-60,x+w/2-16)),top:top===below?top-14:top+dialogHeight-2}}><Svg width={32} height={16} viewBox="0 0 32 16"><Path d="M14 0H18V4H22V8H26V12H30V16H2V12H6V8H10V4H14Z" fill={retro.color.dialog} transform={top===below?undefined:'translate(32,16) rotate(180)'}/></Svg></View>
    <View ref={dialog} {...(Platform.OS==='web'?{role:'dialog' as const,'aria-modal':true,'aria-label':copy[step].title}:{accessibilityLabel:copy[step].title})} onLayout={e=>setDialogHeight(e.nativeEvent.layout.height)} style={{position:'absolute',left:20,right:20,top}}>
      <PixelDialog step={`${step} / 3`} title={copy[step].title} description={copy[step].description} primaryLabel={step===3?'시작하기':'다음'} onPrimary={onNext} onSecondary={onSkip}/>
    </View>
  </View>;
}
