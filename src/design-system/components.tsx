import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform, Modal, AccessibilityInfo, Animated, useWindowDimensions,
  type TextProps, type StyleProp, type ViewStyle, type TextInputProps, type DimensionValue,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { retro, type TextVariant } from './tokens';
import { pixelOutline, progressRatio } from './geometry';
import { sproutPath, sproutViewBox } from './assets/sprout';
import { StickerGlyph, type StickerId } from './sticker-glyphs';
import { gearPath, gearViewBox } from './assets/gear';

const c = retro.color;
const decorativeSvg = Platform.OS === 'web' ? { 'aria-hidden': true } as const : { accessible: false };
const sproutAccessibility = Platform.OS === 'web' ? { role: 'img', 'aria-label': '새싹이' } as const : { accessible: true, accessibilityLabel: '새싹이' };
export function PixelText({ variant = 'body', style, ...props }: TextProps & { variant?: TextVariant }) {
  return <Text {...props} style={[{ color: c.ink, ...retro.typography[variant] }, style,
    { fontFamily: retro.fontFamily, fontWeight: '400', fontStyle: 'normal', letterSpacing: 0 }]} />;
}

export type FrameVariant = 'panel' | 'button' | 'input' | 'dialog' | 'slot' | 'selection';
export function PixelFrame({ children, variant = 'panel', fill = c.lcd, pressed = false, focused = false, style, contentStyle }:
  { children?: ReactNode; variant?: FrameVariant; fill?: string; pressed?: boolean; focused?: boolean; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const raised = variant === 'button' || variant === 'dialog';
  const depth = raised ? retro.shape.shadow : 0;
  const border = variant === 'selection' ? 0 : variant === 'slot' ? retro.shape.cellBorder : variant === 'panel' || variant === 'dialog' ? retro.shape.panelBorder : retro.shape.border;
  const padding = variant === 'panel' ? 10 : border;
  const unit = variant === 'panel' || variant === 'dialog' ? retro.shape.panelUnit : variant === 'button' || variant === 'input' ? retro.shape.controlUnit : retro.shape.unit;
  const w = Math.round(size.width - (raised ? 1 : 0)), h = Math.round(size.height - depth);
  const outline = (inset = 0) => pixelOutline(w, h, inset, unit);
  // Surface and shadow must share the same contour, including stroke joins.
  const surfaceOutline = outline(border / 2);
  return <View style={[{ position: 'relative', paddingRight: raised ? 1 : 0, paddingBottom: depth }, style]}
    onLayout={e => { const { width, height } = e.nativeEvent.layout; setSize(s => s.width === width && s.height === height ? s : {width, height}); }}>
    {/* 크기가 바뀌면 Svg를 새로 만든다(key). iOS(react-native-svg 15 + 새 아키텍처)는 만든 뒤 width·height만 바꾸면
        다시 그리지 않아, 판 상세 → 목표 설정에서 틀이 통째로 빠졌다(2026-10-04 실기기, 시뮬레이터에서 재현·확인). */}
    <Svg key={`${size.width}x${size.height}`} width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none" {...decorativeSvg}>{w > 0 && h > 0 && <>
      {raised && <Path d={surfaceOutline} fill={c.ink} stroke={c.ink} strokeWidth={border} strokeLinejoin="miter" transform={`translate(1,${depth})`} />}
      {variant === 'panel' || variant === 'selection' ? <>
        <Path d={outline()} fill={variant === 'selection' ? fill : c.ink}/>
        <Path d={outline(border)} fill={variant === 'panel' ? c.screen : fill}/>
      </> : <Path d={surfaceOutline} fill={fill} stroke={c.ink} strokeWidth={border} strokeLinejoin="miter" transform={`translate(0,${pressed ? retro.shape.pressed : 0})`}/> }
      {variant === 'panel' && <><Path d={outline(border)} fill={c.ink} opacity={0.62}/><Path d={outline(retro.shape.panelInnerInset)} fill={c.ink}/><Path d={outline(retro.shape.panelInnerInset+4)} fill={fill}/></>}
      {(variant === 'button' || variant === 'dialog') && <Path d={`M${2*unit+border+2} ${border+2} H${w-2*unit-border-2} M${border+2} ${2*unit+border+2} V${h-2*unit-border-2}`} stroke={c.secondary} strokeWidth={2} transform={`translate(0,${pressed ? retro.shape.pressed : 0})`}/>}
      {focused && <Path d={outline(border+3)} fill="none" stroke={c.ink} strokeWidth={1} strokeDasharray="2 2"/>}
    </>}</Svg>
    <View style={[{ padding, transform: [{ translateY: pressed ? retro.shape.pressed : 0 }] }, contentStyle]}>{children}</View>
  </View>;
}

/** 기기의 모션 감소 설정. 켜져 있으면 반복 모션을 멈춘다 (PRD 6.1). */
function useReducedMotion() {
  const [reduced,setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); }).catch(() => {});
    // RN Web은 구독 객체를 돌려주지 않는다.
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced) as { remove?: () => void } | undefined;
    return () => { alive = false; subscription?.remove?.(); };
  }, []);
  return reduced;
}
/**
 * 스티커 붙이기 모션 (PRD 4.5, 4.7). 조금 크게 나타났다가 제자리에 눌러 붙는다. 마운트될 때 한 번만 재생한다.
 * 모션 감소 설정이면 바로 제자리에 둔다. 칸 붙이기와 [완성] 스티커가 같은 결을 쓴다.
 */
export function StickMotion({children,from=1.35,style}:{children:ReactNode;/** 시작 배율 */from?:number;style?:StyleProp<ViewStyle>}) {
  // 렌더 중 ref를 읽지 않도록 값은 state 초기화로 한 번만 만든다.
  const [progress]=useState(()=>new Animated.Value(0));
  useEffect(()=>{
    let alive=true;
    const spring=Animated.spring(progress,{toValue:1,friction:5,tension:170,useNativeDriver:Platform.OS!=='web'});
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced=>{if(!alive) return; if(reduced) progress.setValue(1); else spring.start();})
      .catch(()=>{if(alive) spring.start();});
    return ()=>{alive=false;spring.stop();};
  },[progress]);
  const scale=progress.interpolate({inputRange:[0,1],outputRange:[from,1]});
  const opacity=progress.interpolate({inputRange:[0,0.25,1],outputRange:[0,1,1]});
  return <Animated.View style={[style,{opacity,transform:[{scale}]}]}>{children}</Animated.View>;
}
/** 픽셀 로딩 점 세 개. 진한 점이 왼쪽에서 오른쪽으로 옮겨 가며, 모션 감소 설정이면 가운데 점에 멈춘다. 의미는 호스트가 접근성 이름으로 전달한다. */
export function PixelLoadingDots({ size = 12, gap = 6 }: { size?: number; gap?: number }) {
  const reduced = useReducedMotion();
  const [active,setActive] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setActive(index => (index + 1) % 3), 250);
    return () => clearInterval(timer);
  }, [reduced]);
  const current = reduced ? 1 : active;
  return <View accessible={false} style={{ flexDirection: 'row', gap }}>
    {[0, 1, 2].map(i => <View key={i} style={{ width: size, height: size, backgroundColor: c.ink, opacity: i === current ? 1 : 0.45 }}/>)}
  </View>;
}

export function PixelButton({ label, variant = 'primary', disabled = false, loading = false, onPress, icon, accessibilityLabel, style, minHeight = retro.layout.controlHeight }:
  { label: string; variant?: 'primary' | 'secondary'; disabled?: boolean; loading?: boolean; onPress?: () => void; icon?: ReactNode; accessibilityLabel?: string; style?: StyleProp<ViewStyle>; minHeight?: number }) {
  const [focused,setFocused] = useState(false);
  const blocked = disabled || loading;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? (loading ? '저장 중' : label)}
    aria-disabled={blocked} aria-busy={loading} accessibilityState={{disabled: blocked, busy: loading}} disabled={blocked} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[{opacity: disabled ? retro.opacity.disabled : 1}, style]}>
    {({pressed}) => <PixelFrame variant="button" fill={variant === 'primary' ? c.primary : c.secondary} pressed={pressed} focused={focused}
      contentStyle={{ minHeight, paddingHorizontal: label ? 16 : 8, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
      {/* 저장 중에는 원래 내용을 투명하게 남겨 버튼 폭을 유지하고, 그 위에 로딩 점을 겹친다. */}
      {icon && <View style={{opacity: loading ? 0 : 1}}>{icon}</View>}{label !== '' && <PixelText variant="button" style={{color:c.buttonText, opacity: loading ? 0 : 1}}>{label}</PixelText>}
      {loading && <View pointerEvents="none" style={[StyleSheet.absoluteFill, {alignItems:'center', justifyContent:'center'}]}><PixelLoadingDots size={8} gap={4}/></View>}
    </PixelFrame>}
  </Pressable>;
}

/** 판 테두리 안쪽 여백(한쪽). */
const PANEL_CONTENT_INSET = retro.shape.panelInnerInset + 4 + retro.layout.panelPadding;
/** 화면 콘텐츠 폭에서 바깥 판들이 이미 차지한 가로 여백. 측정 전 첫 프레임 추정에 쓴다. */
const ContentInsetContext = createContext(0);
export function PixelPanel({ children, title, action, style, contentStyle }: {children: ReactNode; title?: string; action?: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>}) {
  const inset = useContext(ContentInsetContext) + 2 * PANEL_CONTENT_INSET;
  return <PixelFrame style={style} contentStyle={[{padding: PANEL_CONTENT_INSET}, contentStyle]}>
    {title && <View style={{borderBottomWidth: retro.shape.panelTitleBorder,borderColor:c.ink,paddingBottom:8,marginBottom:0,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><PixelText variant="title" style={{fontSize:32,lineHeight:40,flexShrink:1}}>{title}</PixelText>{action}</View>}
    <ContentInsetContext.Provider value={inset}>{children}</ContentInsetContext.Provider>
  </PixelFrame>;
}

/** 네이티브 한 줄 입력에 lineHeight를 주면 iOS는 입력 글자를 줄 상자 아래로 붙인다. 가운데 정렬로 대신한다. */
const singleLineText = Platform.OS === 'web'
  ? retro.typography.body
  : { fontSize: retro.typography.body.fontSize, textAlignVertical: 'center' as const, includeFontPadding: false };
/** 입력칸 아래 검사 문구: 한도·빈 값 (2026-10-08). 칸 수 오류 문구와 같은 작은 글자. */
export function FieldError({message}: {message?: string}) {
  if (!message) return null;
  return <View accessible accessibilityRole="alert"><PixelText variant="caption" style={{color:c.buttonText}}>{message}</PixelText></View>;
}
/**
 * 한도를 넘긴 글자를 자른다. iOS는 한글을 조합하는 중인 글자에는 maxLength를 적용하지 않아 (2026-10-08)
 * 받은 글자를 한 번 더 자른다. 이모지처럼 두 칸짜리 글자는 반으로 가르지 않는다.
 */
export function clampLength(text: string, max?: number): string {
  if (max === undefined || text.length <= max) return text;
  const code = text.charCodeAt(max - 1);
  return text.slice(0, code >= 0xd800 && code <= 0xdbff ? max - 1 : max);
}
export function PixelInput({label, error, style, onFocus, onBlur, onChangeText, ...props}: TextInputProps & {label: string; /** 입력칸 아래 검사 문구 */error?: string}) {
  const [focused,setFocused] = useState(false);
  return <View style={{gap:8}}><PixelText>{label}</PixelText>
    <PixelFrame variant="input" fill={c.secondary} focused={focused}>
      <TextInput {...props} onChangeText={onChangeText&&(text=>onChangeText(clampLength(text,props.maxLength)))} accessibilityLabel={props.accessibilityLabel ?? label} placeholderTextColor={c.ink}
        returnKeyType={props.returnKeyType ?? 'done'}
        onFocus={e=>{setFocused(true);onFocus?.(e)}} onBlur={e=>{setFocused(false);onBlur?.(e)}}
        style={[{minHeight:48,paddingHorizontal:12,paddingVertical:Platform.OS==='web'?10:0,color:c.ink,...(props.multiline?retro.typography.body:singleLineText)},style,{fontFamily:retro.fontFamily,fontWeight:'400',letterSpacing:0}]}/>
    </PixelFrame>
    <FieldError message={error}/>
  </View>;
}

export function ProgressBar({value,total}: {value:number;total:number}) {
  const ratio=progressRatio(value,total);
  return <View accessible accessibilityRole="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio*100)} accessibilityValue={{min:0,max:100,now:Math.round(ratio*100)}} accessibilityLabel="목표 진행률" style={{height:10,borderRadius:4,overflow:'hidden'}}>
    <View style={[StyleSheet.absoluteFill,{backgroundColor:c.ink,opacity:retro.opacity.track}]}/>
    <View style={{height:10,borderRadius:4,width:`${ratio*100}%`,backgroundColor:c.ink}}/>
  </View>;
}

export const stickerGroups = ['전체','친구','모양','사물'] as const;
export type StickerGroup = typeof stickerGroups[number];
export function StickerFilters({value,onChange}: {value:StickerGroup;onChange:(value:StickerGroup)=>void}) {
  return <View style={{flexDirection:'row',alignItems:'center'}}>
    {stickerGroups.map((group,i)=><React.Fragment key={group}>
      {i>0 && <View style={{width:1,height:24,backgroundColor:c.ink}}/>}
      <Pressable accessibilityRole="tab" aria-selected={value===group} accessibilityState={{selected:value===group}} onPress={()=>onChange(group)}
        style={{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',marginHorizontal:4}}>
        <PixelFrame variant="selection" fill={value===group?c.ink:'transparent'} style={{width:'100%'}} contentStyle={{minHeight:44,alignItems:'center',justifyContent:'center'}}>
        <PixelText style={{color:value===group?c.lcd:c.buttonText}}>{group}</PixelText></PixelFrame>
      </Pressable>
    </React.Fragment>)}
  </View>;
}

export function SproutSticker({size=48}: {size?:number}) {
  return <Svg width={size} height={size} viewBox={sproutViewBox} {...sproutAccessibility}>
    <Path d={sproutPath} fill={c.ink}/>
  </Svg>;
}

/** Shared visual focus/active frame. Place inside a positioned parent.
 * Transparent and pointer-inert; the host owns keyboard focus and semantics.
 * Corner dimensions stay fixed as the parent grows; only the straight lines extend.
 */
export function PixelFocusRing({style}: {style?:StyleProp<ViewStyle>}) {
  const [size,setSize]=useState({width:0,height:0});
  const w=Math.round(size.width), h=Math.round(size.height);
  const f=retro.focus;
  const arm=Math.min(f.cornerSize, Math.floor(Math.min(w,h)/3));
  const thickness=Math.min(f.cornerThickness, Math.floor(arm/2)+1);
  const cut=Math.min(f.cornerCut, thickness);
  const start=arm+f.gap;
  // Odd-width strokes need half-pixel centres to keep both edges on whole pixels.
  const inset=f.lineInset+(f.lineWidth%2)/2;
  const corner=`M${cut} 0H${arm}V${thickness}H${thickness}V${arm}H0V${cut}H${cut}Z`;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill,style]}
    onLayout={e=>{const {width,height}=e.nativeEvent.layout;setSize(previous=>previous.width===width&&previous.height===height?previous:{width,height});}}>
    {w>0&&h>0&&<Svg key={`${w}x${h}`} width={w} height={h} {...decorativeSvg}>
      <Path d={`M${start} ${inset}H${w-start} M${start} ${h-inset}H${w-start} M${inset} ${start}V${h-start} M${w-inset} ${start}V${h-start}`} stroke={c.ink} strokeWidth={f.lineWidth} fill="none"/>
      <Path d={corner} fill={c.ink}/>
      <Path d={corner} fill={c.ink} transform={`translate(${w},0) scale(-1,1)`}/>
      <Path d={corner} fill={c.ink} transform={`translate(0,${h}) scale(1,-1)`}/>
      <Path d={corner} fill={c.ink} transform={`translate(${w},${h}) scale(-1,-1)`}/>
    </Svg>}
  </View>;
}

/**
 * 화면 콘텐츠 폭의 기준값. 이보다 넓은 기기에서는 가운데로 모은다.
 * `RetroScreen`이 이 값으로 레이아웃하므로 측정 전 첫 프레임의 추정치도 여기서 나온다.
 */
export const SCREEN_MAX_WIDTH=390;
export const SCREEN_PADDING=20;
/**
 * onLayout 이전 첫 프레임에 쓸 콘텐츠 폭. 실제 측정값과 같아 깜빡이지 않는다.
 * 판(PixelPanel) 안에서는 판 안쪽 여백을 뺀다. 빼지 않으면 첫 프레임에 칸이 넘쳐 2열로 그려진다 (2026-09-30).
 */
export function useContentWidth(measured:number|null) {
  const {width}=useWindowDimensions();
  const inset=useContext(ContentInsetContext);
  return measured??Math.max(0,Math.min(SCREEN_MAX_WIDTH,width)-2*SCREEN_PADDING-inset);
}

/** Shared three-column board spacing. Slots inside use width/height 100%. */
export function StickerGrid({children}: {children:ReactNode}) {
  const [measured,setWidth]=useState<number|null>(null);
  const width=useContentWidth(measured);
  const cellWidth=Math.max(0,Math.floor((width-2*retro.layout.boardInset-2*retro.layout.boardGap)/3));
  const cellHeight=Math.round(cellWidth*64/84);
  return <View onLayout={e=>setWidth(Math.round(e.nativeEvent.layout.width))}
    style={{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:retro.layout.boardInset,columnGap:retro.layout.boardGap,rowGap:retro.layout.boardRowGap}}>
    {React.Children.map(children,child=><View style={{width:cellWidth,height:cellHeight}}>{child}</View>)}
  </View>;
}

/** 붙인 칸의 스티커 떼기를 스크린리더에서도 쓸 수 있게 하는 접근성 동작 (꾹 누르기 대체). */
export const removeStickerAction={name:'longpress',label:'스티커 떼기'} as const;
const ignoreLongPress=()=>{};
export function StickerSlot({number,state='empty',onPress,onLongPress,width=84,height=64,enabled=state!=='empty'}: {number:number;state?:'empty'|'available'|'filled';onPress?:()=>void;/** 붙인 칸을 꾹 눌렀을 때 (스티커 떼기) */onLongPress?:()=>void;width?:DimensionValue;height?:DimensionValue;enabled?:boolean}) {
  const [focused,setFocused]=useState(false);
  const [slotSize,setSlotSize]=useState({width:84,height:64});
  const sh=slotSize.height;
  // 꾹 누르기 처리기는 빈칸에도 둔다 — 떼자마자 빈칸으로 다시 그려진 칸에서 손을 떼면 한 번 누르기(붙이기)로 처리됐다 (2026-10-08). 스크린리더 동작은 onLongPress가 있을 때만.
  return <Pressable onLayout={e=>setSlotSize(e.nativeEvent.layout)} disabled={!enabled} onPress={onPress} onLongPress={onLongPress??ignoreLongPress}
    accessibilityActions={onLongPress?[removeStickerAction]:undefined} onAccessibilityAction={e=>{if(e.nativeEvent.actionName===removeStickerAction.name)onLongPress?.()}} accessibilityRole="button"
    accessibilityLabel={`${number}번 칸, ${state==='filled'?'새싹이 스티커':enabled?'붙일 수 있음':'빈칸'}`}
    accessibilityState={{disabled:!enabled}} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{width,height}}>
    <PixelFrame variant={state==='available'?'selection':'slot'} style={{height:'100%'}} focused={focused} contentStyle={{height:'100%',padding:0,paddingBottom:state==='filled'?retro.layout.stickerBottomInset:0,alignItems:'center',justifyContent:state==='filled'?'flex-end':'center'}}>
      {state==='filled'?<SproutSticker size={Math.max(0, Math.min(retro.layout.stickerSize, sh-retro.layout.stickerBottomInset-6))}/>:<PixelText variant="slotNumber">{number}</PixelText>}
    </PixelFrame>
    {state==='available' && <PixelFocusRing/>}
  </Pressable>;
}

/** UI symbols use square pixels rather than font glyphs or rounded icon strokes. */
export function PixelIcon({name,size=24}: {name:'plus'|'chevron'|'gear'|'flower';size?:number}) {
  const paths = {
    plus: 'M6 1H10V6H15V10H10V15H6V10H1V6H6Z',
    chevron: 'M4 1H7V4H10V7H13V10H10V13H7V16H4V13H7V10H10V7H7V4H4Z',
    gear: gearPath,
    flower: 'M7 0H11V2H13V4H16V6H18V10H16V12H13V15H11V20H13V18H18V22H15V24H11V26H7V24H3V22H0V18H5V20H7V15H5V12H2V10H0V6H2V4H5V2H7Z',
  };
  return <Svg width={size} height={size} viewBox={name==='flower'?'0 0 18 26':name==='gear'?gearViewBox:'0 0 16 16'} {...decorativeSvg}><Path d={paths[name]} fill={c.ink} fillRule="evenodd"/>{name==='flower' && <><Path d="M7 2H11V4H12V7H15V6H16V10H12V12H11V14H7V12H6V10H2V6H5V7H6V4H7Z" fill={c.secondary}/><Path d="M7 6H11V7H12V10H11V11H7V10H6V7H7Z" fill={c.ink}/><Path d="M8 7H10V10H8Z" fill={c.lcd}/></>}</Svg>;
}

type DialogContentProps={title:string;description:string;primaryLabel:string;secondaryLabel:string;centerText:boolean;single:boolean;loading:boolean;onPrimary?:()=>void;onSecondary?:()=>void};
function DialogContent({title,description,primaryLabel,secondaryLabel,centerText,single,loading,onPrimary,onSecondary}:DialogContentProps) {
  return <><PixelText variant="title" style={centerText?{textAlign:'center'}:undefined}>{title}</PixelText><PixelText style={centerText?{textAlign:'center'}:undefined}>{description}</PixelText>
    <View style={{flexDirection:'row',gap:12}}>
      {!single&&<PixelButton label={secondaryLabel} variant="secondary" disabled={loading} onPress={onSecondary} style={{flex:1}}/>}
      <PixelButton label={primaryLabel} loading={loading} accessibilityLabel={loading?'진행 중':undefined} onPress={onPrimary} style={{flex:1}}/>
    </View></>;
}

/** Shared dialog surface. The host positions tutorial near its target and basic at screen center. */
export function PixelDialog({variant='tutorial',step,title,description,primaryLabel,secondaryLabel,onPrimary,onSecondary,single=false,loading=false}:
  {variant?:'tutorial'|'basic';step?:string;title:string;description:string;primaryLabel?:string;secondaryLabel?:string;onPrimary?:()=>void;onSecondary?:()=>void;/** 버튼 하나(알림). primary가 다이얼로그 너비를 채운다 */single?:boolean;/** 주 버튼을 누른 뒤 진행 중: 주 버튼은 로딩 점, 보조 버튼은 비활성 (로그아웃·계정 삭제) */loading?:boolean}) {
  return <PixelFrame variant="dialog" fill={c.dialog} style={{width:'100%',maxWidth:360}} contentStyle={{padding:retro.layout.dialogPadding,gap:16}}>
    {variant==='tutorial'&&<>{step&&<PixelText>{step}</PixelText>}<View style={{height:2,backgroundColor:c.ink}}/></>}
    <DialogContent title={title} description={description} centerText={variant==='basic'} primaryLabel={primaryLabel??(variant==='tutorial'?'다음':'확인')} secondaryLabel={secondaryLabel??(variant==='tutorial'?'건너뛰기':'취소')} single={single} loading={loading} onPrimary={onPrimary} onSecondary={onSecondary}/>
  </PixelFrame>;
}

/** 버튼 없는 진행 다이얼로그: 제목, 로딩 점, 안내. 끝날 때까지 닫을 수 없다 (복원). */
export function PixelBusyDialog({title,description}:{title:string;description:string}) {
  return <PixelFrame variant="dialog" fill={c.dialog} style={{width:'100%',maxWidth:360}} contentStyle={{padding:retro.layout.dialogPadding,gap:16,alignItems:'center'}}>
    <PixelText variant="title" style={{textAlign:'center'}}>{title}</PixelText>
    <PixelLoadingDots/>
    <PixelText style={{textAlign:'center'}}>{description}</PixelText>
  </PixelFrame>;
}

function ModalHost({visible,onRequestClose,children}:{visible:boolean;onRequestClose:()=>void;children:ReactNode}) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onRequestClose} statusBarTranslucent>
    <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:SCREEN_PADDING}}>
      <View style={[StyleSheet.absoluteFill,{backgroundColor:c.ink,opacity:retro.opacity.scrim}]}/>
      <View accessibilityViewIsModal style={{width:'100%',maxWidth:SCREEN_MAX_WIDTH-2*SCREEN_PADDING,alignItems:'center'}}>{children}</View>
    </View>
  </Modal>;
}
const ignoreClose=()=>{};

/** 일반 화면용 확인 호스트. `basic` 다이얼로그를 화면 중앙에 두고 배경을 막는다. Android 뒤로가기는 onRequestClose로 닫는다 — loading 중에는 무시한다. */
export function PixelDialogModal({visible,onRequestClose,...dialog}:{visible:boolean;onRequestClose:()=>void;title:string;description:string;primaryLabel?:string;secondaryLabel?:string;onPrimary?:()=>void;onSecondary?:()=>void;/** 버튼 하나(알림) */single?:boolean;/** 진행 중: 뒤로가기로도 닫히지 않는다 */loading?:boolean}) {
  return <ModalHost visible={visible} onRequestClose={dialog.loading?ignoreClose:onRequestClose}><PixelDialog variant="basic" {...dialog}/></ModalHost>;
}

/** PixelBusyDialog 호스트. Android 뒤로가기를 무시한다. */
export function PixelBusyModal({visible,title,description}:{visible:boolean;title:string;description:string}) {
  return <ModalHost visible={visible} onRequestClose={ignoreClose}><PixelBusyDialog title={title} description={description}/></ModalHost>;
}

/** 배지 색 조합. 새 배지는 여기에 tone을 **추가**한다. 기존 조합은 바꾸지 않는다. */
export const badgeTones={
  /** 판 종류(적립판·달력판) */
  ink:{fill:c.ink,text:c.lcd},
  /** 완성 */
  primary:{fill:c.primary,text:c.buttonText},
} as const;
export type BadgeTone=keyof typeof badgeTones;
/** 짧은 글자 배지. 선택 프레임과 같은 계단 모서리를 쓰고 글씨는 `badge` 토큰이다. */
export function PixelBadge({label,tone='ink',large=false}:{label:string;tone?:BadgeTone;/** 제목 글씨로 크게 (완성 스티커) */large?:boolean}) {
  const colors=badgeTones[tone];
  return <PixelFrame variant="selection" fill={colors.fill} contentStyle={{paddingHorizontal:large?8:6,paddingVertical:large?2:1}}>
    <PixelText variant={large?'title':'badge'} style={[{color:colors.text},large?{fontSize:18,lineHeight:24}:undefined]}>{label}</PixelText>
  </PixelFrame>;
}
/** 판이 100%가 되면 붙는 완성 스티커: 그 판의 기본 스티커 + 「완성」 배지. */
export function CompletionSticker({sticker,size=36,tilted=false,animate=false}:{sticker:StickerId;size?:number;/** 스티커를 붙인 듯 비스듬히 (완성한 판 설정) */tilted?:boolean;/** 완성 순간: 붙이기 모션 한 번 (PRD 4.7) */animate?:boolean}) {
  const body=<View accessible accessibilityLabel="완성" style={{flexDirection:'row',alignItems:'center',gap:4,transform:tilted?[{rotate:'-10deg'}]:undefined}}>
    <StickerGlyph id={sticker} size={size}/><PixelBadge label="완성" tone="primary" large/>
  </View>;
  return animate?<StickMotion from={1.8}>{body}</StickMotion>:body;
}
/** 작은 채움 탭. 선택한 탭은 잉크로 채우고 LCD 글씨를 쓴다 (`StickerFilters`와 같은 표현). */
export function PixelTabs<K extends string>({items,value,onChange}:{items:readonly {key:K;label:string}[];value:K;onChange:(key:K)=>void}) {
  return <View accessibilityRole="tablist" style={{flexDirection:'row',alignItems:'center',gap:4}}>
    {items.map(item=>{const selected=item.key===value;return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{selected}} aria-selected={selected} onPress={()=>onChange(item.key)}>
      <PixelFrame variant="selection" fill={selected?c.ink:'transparent'} contentStyle={{minHeight:retro.layout.touch,paddingHorizontal:8,alignItems:'center',justifyContent:'center'}}>
        <PixelText style={{fontSize:17,lineHeight:24,color:selected?c.lcd:c.buttonText}}>{item.label}</PixelText>
      </PixelFrame>
    </Pressable>;})}
  </View>;
}
