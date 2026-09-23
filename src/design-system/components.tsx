import React, { useState, type ReactNode } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform,
  type TextProps, type StyleProp, type ViewStyle, type TextInputProps, type DimensionValue,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { retro, type TextVariant } from './tokens';
import { pixelOutline, progressRatio } from './geometry';
import { sproutPath, sproutViewBox } from './assets/sprout';
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
    {w > 0 && h > 0 && <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none" {...decorativeSvg}>
      {raised && <Path d={surfaceOutline} fill={c.ink} stroke={c.ink} strokeWidth={border} strokeLinejoin="miter" transform={`translate(1,${depth})`} />}
      {variant === 'panel' || variant === 'selection' ? <>
        <Path d={outline()} fill={variant === 'selection' ? fill : c.ink}/>
        <Path d={outline(border)} fill={variant === 'panel' ? c.screen : fill}/>
      </> : <Path d={surfaceOutline} fill={fill} stroke={c.ink} strokeWidth={border} strokeLinejoin="miter" transform={`translate(0,${pressed ? retro.shape.pressed : 0})`}/> }
      {variant === 'panel' && <><Path d={outline(border)} fill={c.ink} opacity={0.62}/><Path d={outline(retro.shape.panelInnerInset)} fill={c.ink}/><Path d={outline(retro.shape.panelInnerInset+4)} fill={fill}/></>}
      {(variant === 'button' || variant === 'dialog') && <Path d={`M${2*unit+border+2} ${border+2} H${w-2*unit-border-2} M${border+2} ${2*unit+border+2} V${h-2*unit-border-2}`} stroke={c.secondary} strokeWidth={2} transform={`translate(0,${pressed ? retro.shape.pressed : 0})`}/>}
      {focused && <Path d={outline(border+3)} fill="none" stroke={c.ink} strokeWidth={1} strokeDasharray="2 2"/>}
    </Svg>}
    <View style={[{ padding, transform: [{ translateY: pressed ? retro.shape.pressed : 0 }] }, contentStyle]}>{children}</View>
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
      {icon}{(label || loading) && <PixelText variant="button" style={{color:c.buttonText}}>{loading ? '저장 중' : label}</PixelText>}
    </PixelFrame>}
  </Pressable>;
}

export function PixelPanel({ children, title, action, style }: {children: ReactNode; title?: string; action?: ReactNode; style?: StyleProp<ViewStyle>}) {
  return <PixelFrame style={style} contentStyle={{padding: retro.shape.panelInnerInset + 4 + retro.layout.panelPadding}}>
    {title && <View style={{borderBottomWidth: retro.shape.panelTitleBorder,borderColor:c.ink,paddingBottom:8,marginBottom:0,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><PixelText variant="title" style={{fontSize:32,lineHeight:40}}>{title}</PixelText>{action}</View>}
    {children}
  </PixelFrame>;
}

export function PixelInput({label, style, onFocus, onBlur, ...props}: TextInputProps & {label: string}) {
  const [focused,setFocused] = useState(false);
  return <View style={{gap:8}}><PixelText>{label}</PixelText>
    <PixelFrame variant="input" fill={c.secondary} focused={focused}>
      <TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label} placeholderTextColor={c.ink}
        onFocus={e=>{setFocused(true);onFocus?.(e)}} onBlur={e=>{setFocused(false);onBlur?.(e)}}
        style={[{minHeight:48,paddingHorizontal:12,paddingVertical:10,color:c.ink,...retro.typography.body},style,{fontFamily:retro.fontFamily,fontWeight:'400',letterSpacing:0}]}/>
    </PixelFrame>
  </View>;
}

export function ProgressBar({value,total}: {value:number;total:number}) {
  const ratio=progressRatio(value,total);
  return <View accessible accessibilityRole="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio*100)} accessibilityValue={{min:0,max:100,now:Math.round(ratio*100)}} accessibilityLabel="목표 진행률" style={{height:10,borderRadius:4,overflow:'hidden'}}>
    <View style={[StyleSheet.absoluteFill,{backgroundColor:c.ink,opacity:retro.opacity.track}]}/>
    <View style={{height:10,borderRadius:4,width:`${ratio*100}%`,backgroundColor:c.ink}}/>
  </View>;
}

export function GoalChip({label,value,total,selected=false,onPress,style}: {label:string;value:number;total:number;selected?:boolean;onPress?:()=>void;style?:StyleProp<ViewStyle>}) {
  const [focus,setFocus]=useState(false);
  return <Pressable onPress={onPress} accessibilityRole="button" aria-selected={selected} accessibilityState={{selected}}
    accessibilityLabel={`${label}, ${value} / ${total}`} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} style={[{width:144},style]}>
    {({pressed})=><PixelFrame variant="button" fill={selected?c.primary:c.secondary} pressed={pressed} focused={focus} contentStyle={{paddingHorizontal:14,paddingVertical:8,gap:4,minHeight:56}}>
      <PixelText numberOfLines={1} style={{textAlign:'center',color:c.buttonText,fontSize:20}}>{label}</PixelText><ProgressBar value={value} total={total}/>
    </PixelFrame>}
  </Pressable>;
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

export function DefaultStickerLink({onPress}: {onPress?:()=>void}) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="기본 스티커 설정" style={{flexDirection:'row',alignItems:'center',gap:4,minHeight:44}}>
    <SproutSticker size={retro.layout.stickerPreviewSize}/><PixelText style={{color:c.buttonText,fontSize:14,lineHeight:20}}>기본 스티커</PixelText><PixelIcon name="chevron" size={16}/>
  </Pressable>;
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
    {w>0&&h>0&&<Svg width={w} height={h} {...decorativeSvg}>
      <Path d={`M${start} ${inset}H${w-start} M${start} ${h-inset}H${w-start} M${inset} ${start}V${h-start} M${w-inset} ${start}V${h-start}`} stroke={c.ink} strokeWidth={f.lineWidth} fill="none"/>
      <Path d={corner} fill={c.ink}/>
      <Path d={corner} fill={c.ink} transform={`translate(${w},0) scale(-1,1)`}/>
      <Path d={corner} fill={c.ink} transform={`translate(0,${h}) scale(1,-1)`}/>
      <Path d={corner} fill={c.ink} transform={`translate(${w},${h}) scale(-1,-1)`}/>
    </Svg>}
  </View>;
}

/** Shared three-column board spacing. Slots inside use width/height 100%. */
export function StickerGrid({children}: {children:ReactNode}) {
  const [width,setWidth]=useState(294);
  const cellWidth=Math.max(0,Math.floor((width-2*retro.layout.boardInset-2*retro.layout.boardGap)/3));
  const cellHeight=Math.round(cellWidth*64/84);
  return <View onLayout={e=>setWidth(Math.round(e.nativeEvent.layout.width))}
    style={{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:retro.layout.boardInset,columnGap:retro.layout.boardGap,rowGap:retro.layout.boardRowGap}}>
    {React.Children.map(children,child=><View style={{width:cellWidth,height:cellHeight}}>{child}</View>)}
  </View>;
}

export function StickerSlot({number,state='empty',onPress,width=84,height=64}: {number:number;state?:'empty'|'available'|'filled';onPress?:()=>void;width?:DimensionValue;height?:DimensionValue}) {
  const [focused,setFocused]=useState(false);
  const [slotSize,setSlotSize]=useState({width:84,height:64});
  const sh=slotSize.height;
  return <Pressable onLayout={e=>setSlotSize(e.nativeEvent.layout)} disabled={state==='empty'} onPress={onPress} accessibilityRole="button"
    accessibilityLabel={`${number}번 칸, ${state==='filled'?'새싹이 스티커':state==='available'?'붙일 수 있음':'빈칸'}`}
    accessibilityState={{disabled:state==='empty'}} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{width,height}}>
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

/** Dialog surface; the host owns modal focus, dismissal and the scrim. */
export function PixelDialog({step,title,description,primaryLabel='다음',secondaryLabel='건너뛰기',onPrimary,onSecondary}:
  {step?:string;title:string;description:string;primaryLabel?:string;secondaryLabel?:string;onPrimary?:()=>void;onSecondary?:()=>void}) {
  return <PixelFrame variant="dialog" fill={c.dialog} style={{width:'100%',maxWidth:360}} contentStyle={{padding:retro.layout.dialogPadding,gap:16}}>
    {step && <PixelText>{step}</PixelText>}
    <View style={{height:2,backgroundColor:c.ink}}/>
    <PixelText variant="title">{title}</PixelText><PixelText>{description}</PixelText>
    <View style={{flexDirection:'row',gap:12}}>
      <PixelButton label={secondaryLabel} variant="secondary" onPress={onSecondary} style={{flex:1}}/>
      <PixelButton label={primaryLabel} onPress={onPrimary} style={{flex:1}}/>
    </View>
  </PixelFrame>;
}
