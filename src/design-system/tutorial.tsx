import React,{useEffect,useRef} from 'react';
import {Platform,View,StyleSheet,type LayoutRectangle} from 'react-native';
import {PixelDialog,PixelFocusRing,SCREEN_MAX_WIDTH,SCREEN_PADDING,useLayoutSize} from './components';
import {retro} from './tokens';
import Svg,{Path} from 'react-native-svg';

export type TutorialStep=1|2|3;
const copy={1:{title:'목표 만들기',description:'＋를 눌러 목표를 만들어요'},2:{title:'스티커 고르기',description:'목표마다 스티커를 정해요'},3:{title:'빈칸에 톡!',description:'어느 빈칸이든 누르면 스티커가 붙어요'}};
/** 첫 실행 1–3단계 밖의 안내(예: 완성한 판을 처음 열 때)는 content로 문구를 넘긴다. 없으면 단계 기본 문구를 쓴다. */
export type TutorialContent={step:string;title:string;description:string;primaryLabel:string;secondaryLabel:string};
/** Positioned overlay for screen compositions. Target coordinates are relative to its parent. */
export function TutorialSpotlight({step,target,width,height,onNext,onSkip,highlightFrame=true,content,autoFocus=true}:{highlightFrame?:boolean;/** 웹에서 열릴 때 첫 버튼에 포커스를 줄지. 한 페이지에 여러 개를 그리는 문서 화면에서는 끈다 */autoFocus?:boolean;step:TutorialStep;target:LayoutRectangle;width:number;height:number;onNext:()=>void;onSkip:()=>void;content?:TutorialContent}) {
  const text=content??{step:`${step} / 3`,...copy[step],primaryLabel:step===3?'시작하기':'다음',secondaryLabel:'건너뛰기'};
  // 재기 전에는 대략 높이로 자리를 잡는다
  const {ref:dialog,size:dialogSize,onLayout:onDialogLayout}=useLayoutSize();
  const dialogHeight=dialogSize.height||240;
  // 호스트가 onSkip을 매 렌더 새로 만들어도 포커스를 다시 잡지 않도록 최신 값만 ref로 읽는다.
  // (Storybook Docs처럼 여러 튜토리얼이 함께 렌더되면 포커스 이동이 반복돼 페이지가 계속 스크롤됐다.)
  const skip=useRef(onSkip);
  useEffect(()=>{skip.current=onSkip},[onSkip]);
  useEffect(()=>{
    if(Platform.OS!=='web')return;
    const element=dialog.current as unknown as HTMLElement|null;
    const previous=document.activeElement as HTMLElement|null;
    const buttons=()=>Array.from(element?.querySelectorAll<HTMLElement>('button,[role="button"]')??[]);
    if(autoFocus)buttons()[0]?.focus();
    const handle=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();skip.current();}
      if(event.key==='Tab'){const list=buttons();if(!list.length)return;const current=list.indexOf(document.activeElement as HTMLElement);const next=event.shiftKey?(current<=0?list.length-1:current-1):(current+1)%list.length;event.preventDefault();list[next]?.focus();}
    };
    element?.addEventListener('keydown',handle);
    return()=>{element?.removeEventListener('keydown',handle);previous?.focus()};
  },[step,text.step,autoFocus,dialog]);
  const x=Math.max(0,target.x-4), y=Math.max(0,target.y-4);
  const w=Math.min(target.width+8,width-x), h=Math.min(target.height+8,height-y);
  const below=y+h+16;
  const above=y-dialogHeight-16;
  const top=step!==1&&above>=20?above:below+dialogHeight<=height-20?below:Math.max(20,above);
  // 화면 내용은 최대 390px 열을 가운데 정렬한다. 넓은 캔버스에서도 다이얼로그를 그 열 안에 둔다.
  const columnWidth=Math.min(width,SCREEN_MAX_WIDTH), columnLeft=(width-columnWidth)/2;
  const shade={position:'absolute' as const,backgroundColor:retro.color.ink,opacity:retro.opacity.scrim};
  return <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
    <View style={[shade,{left:0,right:0,top:0,height:y}]}/><View style={[shade,{left:0,right:0,top:y+h,bottom:0}]}/><View style={[shade,{left:0,top:y,width:x,height:h}]}/><View style={[shade,{left:x+w,right:0,top:y,height:h}]}/>
    {highlightFrame&&<View style={{position:'absolute',left:x,top:y,width:w,height:h}}><PixelFocusRing/></View>}
    <View pointerEvents="none" style={{position:'absolute',left:Math.max(columnLeft+28,Math.min(columnLeft+columnWidth-60,x+w/2-16)),top:top===below?top-14:top+dialogHeight-2}}><Svg width={32} height={16} viewBox="0 0 32 16"><Path d="M14 0H18V4H22V8H26V12H30V16H2V12H6V8H10V4H14Z" fill={retro.color.dialog} transform={top===below?undefined:'translate(32,16) rotate(180)'}/></Svg></View>
    <View ref={dialog} {...(Platform.OS==='web'?{role:'dialog' as const,'aria-modal':true,'aria-label':text.title}:{accessibilityLabel:text.title})} onLayout={onDialogLayout} style={{position:'absolute',left:columnLeft+SCREEN_PADDING,width:columnWidth-2*SCREEN_PADDING,top}}>
      <PixelDialog step={text.step} title={text.title} description={text.description} primaryLabel={text.primaryLabel} secondaryLabel={text.secondaryLabel} onPrimary={onNext} onSecondary={onSkip}/>
    </View>
  </View>;
}
