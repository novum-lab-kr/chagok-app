import React, {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {View, Pressable, Image, TextInput, ScrollView, KeyboardAvoidingView, Keyboard, Platform, StyleSheet, type ImageSourcePropType, type LayoutChangeEvent, type LayoutRectangle, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle} from 'react-native';
import {clampLength,FieldError,PixelButton,PixelFrame,PixelFocusRing,PixelIcon,PixelInput,PixelPanel,PixelText,PixelBadge,PixelLoadingDots,PixelTabs,CompletionSticker,ProgressBar,StickerFilters,SCREEN_MAX_WIDTH,SCREEN_PADDING,type StickerGroup} from './components';
import {CalendarBoard,calendarDateKey} from './calendar';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import {retro} from './tokens';
import {Mascot} from './mascot';
import Svg,{Path} from 'react-native-svg';
import {pixelOutline} from './geometry';
import {ActionSymbol,StickerGlyph,pocketStickers,stickerLabel,type PocketStickerId,type StickerId} from './sticker-glyphs';

export function ScreenHeader({title,onBack,action}:{title:string;onBack?:()=>void;action?:ReactNode}) {
  return <View style={{flexDirection:'row',alignItems:'center',minHeight:48}}>
    <View style={{width:72,alignItems:'flex-start'}}>{onBack&&<PixelButton label="" accessibilityLabel="뒤로" variant="secondary" icon={<ActionSymbol name="back"/>} onPress={onBack} style={{width:48}}/>}</View>
    <PixelText accessibilityRole="header" variant="title" style={{flex:1,textAlign:'center'}}>{title}</PixelText>
    <View style={{width:72,alignItems:'flex-end'}}>{action}</View>
  </View>;
}
export type BoardKind='tally'|'calendar';
function BoardMiniature({kind,selected}:{kind:BoardKind;selected:boolean}) {
  const [width,setWidth]=useState(0);
  const calendar=kind==='calendar';
  const columns=calendar?7:3, inset=calendar?7:0;
  const cell=Math.max(0,Math.min(calendar?12:28,Math.floor((width-inset*2-(calendar?4:5)*(columns-1))/columns)));
  const gap=calendar?Math.max(4,Math.floor((width-inset*2-cell*7)/6)):5;
  const start=Math.floor((width-(cell*columns+gap*(columns-1)))/2);
  const height=96;
  return <View accessible={false} aria-hidden style={{height,width:'100%'}} onLayout={e=>setWidth(Math.floor(e.nativeEvent.layout.width))}>
    {width>0&&<>
      {calendar&&<View style={{position:'absolute',top:8,left:start,width:cell*7+gap*6,flexDirection:'row',gap}}>{['일','월','화','수','목','금','토'].map(day=><PixelText key={day} style={{width:cell,textAlign:'center',fontSize:10,lineHeight:14}}>{day}</PixelText>)}</View>}
      <Svg key={`${width}x${height}`} width={width} height={height} style={{position:'absolute',left:0,top:0}}>
        {calendar&&<Path d={pixelOutline(width,height,1.5,3)} fill="none" stroke={retro.color.ink} strokeWidth={retro.shape.cellBorder}/>}
        {Array.from({length:calendar?28:9},(_,i)=>{
          const x=start+(i%columns)*(cell+gap),y=calendar?29+Math.floor(i/columns)*15:Math.floor(i/columns)*33;
          const h=calendar?cell:28;
          return <Path key={i} d={pixelOutline(cell,h,1,calendar?.5:1)} transform={`translate(${x},${y})`} fill="none" stroke={retro.color.ink} strokeWidth={2}/>;
        })}
      </Svg>
      {selected&&<View style={{position:'absolute',left:start+(cell-(calendar?8:20))/2,top:calendar?29:4}}><ActionSymbol name="check" size={calendar?8:20}/></View>}
    </>}
  </View>;
}
function BoardTypeCard({kind,selected}:{kind:BoardKind;selected:boolean}) {
  const [size,setSize]=useState({width:0,height:0});
  return <View onLayout={e=>setSize(e.nativeEvent.layout)} style={{padding:12,gap:8}}>
    {size.width>0&&<Svg key={`${size.width}x${size.height}`} width={size.width} height={size.height} style={{position:'absolute',left:0,top:0}}>
      <Path d={pixelOutline(size.width,size.height,1.5,retro.shape.controlUnit)} fill={selected?retro.color.primary:retro.color.lcd} stroke={retro.color.ink} strokeWidth={retro.shape.border}/>
      {selected&&<Path d={pixelOutline(size.width,size.height,7.5,retro.shape.controlUnit)} fill={retro.color.lcd} stroke={retro.color.ink} strokeWidth={retro.shape.border}/>}
    </Svg>}
    <PixelText style={{textAlign:'center',fontSize:20,lineHeight:28}}>{kind==='calendar'?'달력판':'적립판'}</PixelText>
    <BoardMiniature kind={kind} selected={selected}/>
  </View>;
}
export function BoardTypePicker({value,onChange}:{value:BoardKind;onChange:(value:BoardKind)=>void}) {
  return <View style={{gap:8}}><PixelText>판 종류</PixelText><View accessibilityRole="radiogroup" style={{flexDirection:'row',gap:12}}>
    {(['calendar','tally'] as const).map(kind=><Pressable key={kind} accessibilityRole="radio" accessibilityLabel={kind==='calendar'?'달력판':'적립판'} accessibilityState={{checked:value===kind}} aria-checked={value===kind} onPress={()=>onChange(kind)} style={{flex:1}}>
      <BoardTypeCard kind={kind} selected={value===kind}/>
    </Pressable>)}
  </View></View>;
}
/**
 * 칸 수 고르기. min을 주면 그보다 작은 버튼은 비활성이다 — 목표 설정의 적립판 칸 수는 늘리기만 된다 (2026-09-30).
 * 직접 입력 자릿수는 min이 담기도록 늘린다. 칸 늘리기로 999칸을 넘긴 판도 지금 값을 보여줄 수 있어야 한다.
 */
export function SlotCountPicker({value,onChange,label='칸 수',min=0}:{value:string;onChange:(value:string)=>void;/** 칸 늘리기는 '더할 칸 수' */label?:string;/** 이보다 작은 값은 고를 수 없다 */min?:number}) {
  const [custom,setCustom]=useState(!['15','20','30'].includes(value));
  return <View style={{gap:8}}><PixelText>{label}</PixelText><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
    {['15','20','30'].map(n=><PixelButton key={n} label={n} disabled={Number(n)<min} variant={!custom&&value===n?'primary':'secondary'} onPress={()=>{setCustom(false);onChange(n)}} style={{flex:1}}/>)}
    <PixelButton label="직접 입력" variant={custom?'primary':'secondary'} onPress={()=>setCustom(true)}/>
  </View>{custom&&<PixelInput label={`${label} 직접 입력`} value={value} onChangeText={onChange} keyboardType="number-pad" maxLength={Math.max(3,String(min).length+1)}/>}</View>;
}
export function StickerSummary({value,onChange}:{value:StickerId;onChange?:()=>void}) {
  return <PixelFrame contentStyle={{padding:20,flexDirection:'row',gap:12,alignItems:'center'}}>
    <StickerGlyph id={value} size={48}/><View style={{width:retro.shape.border,height:48,backgroundColor:retro.color.ink}}/>
    <PixelText style={{flex:1}}>{stickerLabel(value)}</PixelText>{onChange&&<PixelButton label="바꾸기" variant="secondary" onPress={onChange}/>}
  </PixelFrame>;
}
export function StickerPicker({value,onChange,onSelectedLayout,selectedTargetRef}:{value:PocketStickerId;onChange:(value:PocketStickerId)=>void;onSelectedLayout?:(layout:LayoutRectangle)=>void;selectedTargetRef?:React.Ref<View>}) {
  const [group,setGroup]=useState<StickerGroup>('전체');
  return <View style={{gap:12,paddingTop:12}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:20,paddingBottom:12,borderBottomWidth:retro.shape.panelTitleBorder,borderColor:retro.color.ink}}><StickerGlyph id={value} size={64}/><PixelText variant="title">{stickerLabel(value)}</PixelText></View>
    <StickerFilters value={group} onChange={setGroup}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {pocketStickers.filter(item=>group==='전체'||item.group===group).map(item=><Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.label} aria-checked={value===item.id} accessibilityState={{checked:value===item.id}} onPress={()=>onChange(item.id)} onLayout={e=>{if(item.id===value)onSelectedLayout?.(e.nativeEvent.layout)}} style={{width:'30%',alignItems:'center',gap:8,paddingVertical:8}}>
        <View ref={item.id===value?selectedTargetRef:undefined} style={{width:64,height:64,alignItems:'center',justifyContent:'center'}}><StickerGlyph id={item.id} size={48}/>{item.id===value&&<><PixelFocusRing/><View style={{position:'absolute',right:-2,top:-2}}><SelectionBadge/></View></>}</View>
        <PixelText style={{fontSize:14,lineHeight:20}}>{item.label}</PixelText>
      </Pressable>)}
    </View>
  </View>;
}
export function RecordSummary({goalName,date,sticker}:{goalName:string;date:string;sticker:StickerId}) {
  return <PixelFrame contentStyle={{padding:20,flexDirection:'row',alignItems:'center',gap:16}}><StickerGlyph id={sticker} size={56}/><View style={{width:retro.shape.border,height:56,backgroundColor:retro.color.ink}}/><View style={{flex:1,gap:4}}><PixelText variant="title">{goalName}</PixelText><PixelText>{date}</PixelText></View></PixelFrame>;
}
export function PhotoAttachment({source,preview,onChoose,onRemove,onPhotoError,actionsInFrame=false,readonly=false}:{source?:ImageSourcePropType;preview?:ReactNode;onChoose:()=>void;onRemove:()=>void;onPhotoError?:()=>void;actionsInFrame?:boolean;/** 완성한 판의 기록: 사진을 보여주기만 하고 추가·바꾸기·지우기를 숨긴다 */readonly?:boolean}) {
  const attached=!!source||!!preview;
  const inFrame=actionsInFrame||readonly;
  return <View style={{gap:12}}>
    <PixelFrame contentStyle={{padding:retro.shape.panelInnerInset+4}}><View style={{aspectRatio:586/494,overflow:'hidden',alignItems:'center',justifyContent:'center'}}>
      {source?<Image source={source} onError={onPhotoError} accessibilityLabel="기록 사진" resizeMode="cover" style={{width:'100%',height:'100%'}}/>:preview??(readonly?<View style={{gap:12,alignItems:'center'}}><ActionSymbol name="photo" size={36}/><PixelText>사진 없음</PixelText></View>:inFrame?<PixelButton label="사진 추가" variant="secondary" icon={<ActionSymbol name="photo" size={18}/>} onPress={onChoose}/>:<View style={{gap:12,alignItems:'center'}}><ActionSymbol name="photo" size={36}/><PixelText>사진을 남겨보세요</PixelText></View>)}
      {inFrame&&attached&&!readonly&&<Pressable accessibilityRole="button" accessibilityLabel="사진 지우기" onPress={onRemove} style={{position:'absolute',top:8,right:8,width:44,height:44,alignItems:'center',justifyContent:'center'}}><PixelFrame variant="button" fill={retro.color.secondary} contentStyle={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><ActionSymbol name="close" size={20}/></PixelFrame></Pressable>}
    </View></PixelFrame>
    {!inFrame&&<View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><PixelButton label={attached?'사진 바꾸기':'사진 추가'} variant="secondary" icon={<ActionSymbol name="photo" size={16}/>} onPress={onChoose} style={{flexGrow:1,flexBasis:150}}/><PixelButton label="사진 지우기" variant="secondary" icon={<ActionSymbol name="trash" size={16}/>} disabled={!attached} onPress={onRemove} style={{flexGrow:1,flexBasis:150}}/></View>}
  </View>;
}
export function MemoEditor({value,onChange,readonly=false,maxLength,error}:{value:string;onChange:(value:string)=>void;/** 완성한 판의 기록: 고칠 수 없다 */readonly?:boolean;maxLength?:number;/** 패널 아래 검사 문구 */error?:string}) {
  return <View style={{gap:8}}><PixelPanel title="메모"><TextInput accessibilityLabel="메모" value={value} onChangeText={text=>onChange(clampLength(text,maxLength))} maxLength={maxLength} editable={!readonly} aria-readonly={readonly} multiline placeholder={readonly?'메모 없음':'오늘의 기록을 남겨보세요'} placeholderTextColor={retro.color.ink} style={{minHeight:84,paddingTop:10,paddingHorizontal:0,color:retro.color.ink,...retro.typography.body,fontFamily:retro.fontFamily,fontWeight:'400',textAlignVertical:'top'}}/></PixelPanel><FieldError message={error}/></View>;
}
export function TextAction({label,onPress,icon}:{label:string;onPress:()=>void;icon?:ReactNode}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{minHeight:retro.layout.touch,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}>{icon}<PixelText>{label}</PixelText></Pressable>;
}
export function SettingRow({label,value,onPress,navigates=true,disabled=false}:{label:string;value?:string;onPress?:()=>void;navigates?:boolean;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={value?`${label}, ${value}`:label} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={{minHeight:56,flexDirection:'row',alignItems:'center',gap:8,opacity:disabled?retro.opacity.disabled:1}}>
    <PixelText style={{flex:1}}>{label}</PixelText>
    {value&&<PixelText style={{fontSize:14,lineHeight:20}}>{value}</PixelText>}
    {navigates&&<PixelIcon name="chevron" size={14}/>}
  </Pressable>;
}
/** 누를 수 없는 「항목 · 값」 줄. SettingRow와 같은 높이 (앱 설정 계정과 백업, 2026-10-08). */
export function InfoRow({label,value}:{label:string;value:string}) {
  return <View style={{minHeight:56,flexDirection:'row',alignItems:'center',gap:8}}>
    <PixelText style={{flex:1}}>{label}</PixelText><PixelText style={{fontSize:14,lineHeight:20}}>{value}</PixelText>
  </View>;
}
export function ShortNotice({title,detail,emphasis=false}:{title:string;detail?:string;/** 제목을 크게 해 화면 맨 위 안내로 쓴다 (완성한 판 설정) */emphasis?:boolean}) {
  return <View accessible accessibilityRole="alert"><PixelFrame variant="dialog" fill={retro.color.dialog} contentStyle={{padding:emphasis?14:12,gap:emphasis?4:3}}>
    <PixelText variant={emphasis?'title':'body'} style={emphasis?{fontSize:18,lineHeight:26}:{fontSize:15,lineHeight:22}}>{title}</PixelText>
    {detail&&<PixelText variant={emphasis?'caption':'body'} style={emphasis?{color:retro.color.buttonText}:{fontSize:15,lineHeight:22}}>{detail}</PixelText>}
  </PixelFrame></View>;
}
export function PixelLoadingIndicator({label='진행 중'}:{label?:string}) {
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{flexDirection:'row',justifyContent:'center',padding:14}}>
    <PixelLoadingDots/>
  </View>;
}
const NO_INSETS={top:0,right:0,bottom:0,left:0};
/** 대상의 세로 가운데를 보이는 영역 가운데에 두는 스크롤 위치. 내용 위아래 끝은 넘지 않는다. */
export function centeredScrollOffset({targetY,targetHeight,viewportHeight,contentHeight}:{targetY:number;targetHeight:number;viewportHeight:number;contentHeight:number}) {
  const max=Math.max(0,contentHeight-viewportHeight);
  return Math.min(max,Math.max(0,Math.round(targetY+targetHeight/2-viewportHeight/2)));
}
/** 스크롤 안의 View를 가운데로 옮긴다. 옮기지 못해도(재기 실패, RetroScreen 밖) 끝난 것으로 돌려준다. */
export type ScrollToCenter=(target:View,animated:boolean)=>Promise<void>;
const ScrollToCenterContext=createContext<ScrollToCenter>(()=>Promise.resolve());
export function useScrollToCenter() {
  return useContext(ScrollToCenterContext);
}
/** 스크롤 영역의 높이·내용 높이·위치를 재어 두고, 안의 View를 가운데로 옮기는 함수를 만든다. */
function useCenteringScroll() {
  const scroll=useRef<ScrollView>(null),content=useRef<View>(null);
  const offset=useRef(0),viewportHeight=useRef(0),contentHeight=useRef(0);
  const scrollToCenter=useCallback<ScrollToCenter>((target,animated)=>new Promise(resolve=>{
    const container=content.current;
    if(!container){resolve();return;}
    target.measureLayout(container,(_x,y,_width,height)=>{
      const next=centeredScrollOffset({targetY:y,targetHeight:height,viewportHeight:viewportHeight.current,contentHeight:contentHeight.current});
      scroll.current?.scrollTo({y:next,animated});
      offset.current=next;
      resolve();
    },()=>resolve());
  }),[]);
  const scrollProps={
    ref:scroll,
    scrollEventThrottle:16,
    onScroll:(e:NativeSyntheticEvent<NativeScrollEvent>)=>{offset.current=e.nativeEvent.contentOffset.y;},
    onLayout:(e:LayoutChangeEvent)=>{viewportHeight.current=e.nativeEvent.layout.height;},
    onContentSizeChange:(_width:number,height:number)=>{contentHeight.current=height;},
  };
  return {scroll,content,offset,scrollProps,scrollToCenter};
}
/**
 * 화면 일부만 스크롤하는 영역. 안에서 useScrollToCenter를 부르면 이 영역을 옮긴다.
 * 판 상세는 제목·진행 줄을 고정하고 칸만 이 안에서 스크롤한다 (2026-09-30).
 */
export function CenteringScrollView({children,style,testID}:{children:ReactNode;style?:StyleProp<ViewStyle>;testID?:string}) {
  const {content,scrollProps,scrollToCenter}=useCenteringScroll();
  return <ScrollView testID={testID} {...scrollProps} style={style}>
    <View ref={content}><ScrollToCenterContext.Provider value={scrollToCenter}>{children}</ScrollToCenterContext.Provider></View>
  </ScrollView>;
}
/**
 * 화면 껍데기. 내용이 길면 세로로 스크롤하고, 노치와 홈 인디케이터를 피해서 그린다.
 *
 * `useSafeAreaInsets()`가 아니라 컨텍스트를 직접 읽는 이유: 그 훅은 `SafeAreaProvider`가 없으면
 * 예외를 던지는데, 컴포넌트 테스트와 Storybook은 Provider 없이 화면을 렌더한다. 값이 없으면 0이다.
 *
 * `avoidKeyboard`는 하단에 입력창이 있는 화면(기록)만 켠다. 홈처럼 입력이 없는 화면에서 켜면
 * 안드로이드에서 불필요한 리사이즈가 생긴다.
 */
export function RetroScreen({children,style,avoidKeyboard=false,header,scrollable=true}:{children:ReactNode;style?:StyleProp<ViewStyle>;avoidKeyboard?:boolean;/** 스크롤 밖에 고정할 화면 헤더(뒤로가기·제목 등). 없으면 모두 스크롤한다 (2026-09-30) */header?:ReactNode;/** false면 화면 전체를 스크롤하지 않는다. 본문이 남은 높이에 맞춰 줄고, 넘치는 부분은 본문 안에서 스크롤한다 */scrollable?:boolean}) {
  const insets=useContext(SafeAreaInsetsContext)??NO_INSETS;
  // 헤더와 본문 사이는 화면이 준 gap을 그대로 쓴다. 헤더를 밖으로 빼도 스크롤 전 첫 화면이 같아야 한다.
  const gap=(StyleSheet.flatten(style)?.gap as number|undefined)??20;
  const {scroll,content,offset,scrollProps,scrollToCenter}=useCenteringScroll();
  // 키보드가 올라오면 포커스한 입력칸이 키보드 위로 오도록 내린다. KeyboardAvoidingView는 보이는 영역만 줄이고
  // 스크롤은 옮기지 않아, 화면 아래쪽 입력칸(기록 메모, 칸 수 직접 입력)이 가려진 채로 남았다.
  useEffect(()=>{
    const subscription=Keyboard.addListener('keyboardDidShow',event=>{
      const input=TextInput.State.currentlyFocusedInput?.();
      if(!input) return;
      input.measureInWindow((_x,y,_width,height)=>{
        const overlap=y+height+SCREEN_PADDING-event.endCoordinates.screenY;
        if(overlap>0) scroll.current?.scrollTo({y:offset.current+overlap,animated:true});
      });
    });
    return ()=>subscription.remove();
  },[offset,scroll]);
  // 빈 곳을 누르면 키보드를 내린다. 「칸 수 직접 입력」은 number-pad라 iOS에 리턴 키가 없고,
  // 메모는 multiline이라 리턴이 줄바꿈이다. 두 경우 모두 이것 말고는 내릴 방법이 없다.
  // 자식이 Pressable이면 그쪽이 먼저 응답자가 되므로 버튼 탭을 가로채지 않는다.
  const column=[{width:'100%',maxWidth:SCREEN_MAX_WIDTH,padding:SCREEN_PADDING,gap:20} as const,style,header?{paddingTop:0}:null];
  // 스크롤하지 않는 화면: 본문이 남은 높이 안에 들어가고, 넘치는 부분은 본문이 직접 스크롤한다(판 상세).
  const body=!scrollable
    ? <View style={{flex:1,alignItems:'center',paddingBottom:insets.bottom+SCREEN_PADDING}}><View style={[column,{flexShrink:1}]}>{children}</View></View>
    : <ScrollView
    testID="retro-scroll"
    {...scrollProps}
    style={{flex:1}}
    contentContainerStyle={{flexGrow:1,alignItems:'center',paddingBottom:insets.bottom+SCREEN_PADDING}}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'}>
    <Pressable ref={content} accessible={false} onPress={()=>Keyboard.dismiss()} style={column}>
      <ScrollToCenterContext.Provider value={scrollToCenter}>{children}</ScrollToCenterContext.Provider>
    </Pressable>
  </ScrollView>;
  // 상태 표시줄 여백은 스크롤 밖에 둔다. 안에 두면 스크롤한 내용이 시계 영역까지 올라가 겹친다(2026-09-30 실기기 녹화).
  return <View style={{flex:1,backgroundColor:retro.color.screen,paddingTop:insets.top}}>
    {header&&<View testID="retro-header" style={{alignItems:'center',paddingHorizontal:SCREEN_PADDING,paddingTop:SCREEN_PADDING,paddingBottom:gap}}>
      <View style={{width:'100%',maxWidth:SCREEN_MAX_WIDTH}}>{header}</View>
    </View>}
    {avoidKeyboard
      ? <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>{body}</KeyboardAvoidingView>
      : body}
  </View>;
}

export function SelectionBadge() {
  return <PixelFrame variant="selection" fill={retro.color.ink} contentStyle={{width:20,height:20,alignItems:'center',justifyContent:'center'}}><ActionSymbol name="check" size={14} color={retro.color.secondary}/></PixelFrame>;
}

// ── 홈 목록·판 상세 (2026-09-29 시안) ─────────────────────────────────
const caption={color:retro.color.buttonText};
/** 앱 최상단: 차곡이 + 차곡차곡 + 앱 설정 톱니바퀴. */
export function AppHeader({onSettings}:{onSettings?:()=>void}) {
  return <View style={{height:44,flexDirection:'row',gap:10,alignItems:'center'}}>
    <Mascot size={44}/><PixelText variant="brand">차곡차곡</PixelText>
    {onSettings&&<Pressable accessibilityRole="button" accessibilityLabel="앱 설정" onPress={onSettings} style={{marginLeft:'auto',width:36,height:40,alignItems:'center',justifyContent:'center'}}><PixelIcon name="gear" size={28}/></Pressable>}
  </View>;
}
export type GoalListTab='active'|'completed';
/** 목록 위 한 줄: `내 목표 n / 완성한 판 n` 탭과 오른쪽 끝 주황 `+`. 작은 화면에서도 스크롤 없이 새 목표에 닿는다. */
export function GoalListHeader({tab,counts,onTab,onAdd,addTargetRef}:{tab:GoalListTab;counts:Record<GoalListTab,number>;onTab:(tab:GoalListTab)=>void;onAdd:()=>void;/** 튜토리얼이 + 위치를 잴 때 */addTargetRef?:React.Ref<View>}) {
  return <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingBottom:8,borderBottomWidth:retro.shape.panelTitleBorder,borderColor:retro.color.ink}}>
    <PixelTabs items={[{key:'active',label:`내 목표 ${counts.active}`},{key:'completed',label:`완성한 판 ${counts.completed}`}] as const} value={tab} onChange={onTab}/>
    <View ref={addTargetRef} style={{marginLeft:'auto'}}><PixelButton label="" accessibilityLabel="새 목표 만들기" minHeight={44} icon={<PixelIcon name="plus" size={20}/>} onPress={onAdd} style={{width:52}}/></View>
  </View>;
}
/** 목록 카드. 모든 판이 같은 모양: 스티커, 이름(최대 2줄), [판 종류 배지] 요약 글자, 진행 막대. */
export function GoalSummaryCard({name,sticker,kind,status,percent,onPress}:{name:string;sticker:StickerId;/** 배지 글자: 적립판 / 달력판 */kind:string;/** 배지 옆 요약. 조각마다 줄바꿈 단위가 된다. 예: ['40% 채웠어요'], ['100%', '9/29 완성'] */status:readonly string[];percent:number;onPress?:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${kind}, ${status.join(', ')}`} onPress={onPress}>
    {({pressed})=><PixelFrame variant="button" fill={retro.color.secondary} pressed={pressed} contentStyle={{padding:12}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
        <StickerGlyph id={sticker} size={48}/>
        <View style={{flex:1,gap:4}}>
          <PixelText numberOfLines={2} style={{fontSize:20,lineHeight:26,color:retro.color.buttonText}}>{name}</PixelText>
          <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',columnGap:8,rowGap:4}}><PixelBadge label={kind}/>{status.map(text=><PixelText key={text} variant="caption" style={caption}>{text}</PixelText>)}</View>
          <ProgressBar value={percent} total={100}/>
        </View>
        <PixelIcon name="chevron" size={16}/>
      </View>
    </PixelFrame>}
  </Pressable>;
}
/** 판 상세 상단 한 줄: `n / nn [여백] m% 달성중`. 완성하면 오른쪽이 완성 스티커로 바뀐다. */
export function BoardProgressRow({value,total,percentLabel,completed=false,sticker,completionTargetRef,animateCompletion=false}:{value:number;total:number;/** 예: '40%', '이번 달 30%' */percentLabel:string;completed?:boolean;sticker:StickerId;completionTargetRef?:React.Ref<View>;/** 완성 순간: [완성] 스티커 붙이기 모션 */animateCompletion?:boolean}) {
  return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:48}}>
    <PixelText variant="number">{value} / {total}</PixelText>
    {completed?<View ref={completionTargetRef}><CompletionSticker sticker={sticker} animate={animateCompletion}/></View>:<PixelText style={{fontSize:18,lineHeight:24}}>{percentLabel} 달성중</PixelText>}
  </View>;
}
/** 목록이 비었을 때의 안내 상자. */
export function EmptyState({title,description}:{title:string;description?:string}) {
  return <PixelFrame variant="input" fill={retro.color.secondary} contentStyle={{padding:20,gap:8,alignItems:'center'}}>
    <PixelText variant="title" style={{fontSize:20,lineHeight:28,textAlign:'center'}}>{title}</PixelText>
    {description&&<PixelText variant="caption" style={[caption,{textAlign:'center'}]}>{description}</PixelText>}
  </PixelFrame>;
}
/** 둘 이상 중 하나를 고르는 버튼 줄. 고른 버튼만 primary. */
export function OptionButtons<K extends string>({options,value,onChange}:{options:readonly {key:K;label:string}[];value:K;onChange:(key:K)=>void}) {
  return <View accessibilityRole="radiogroup" style={{flexDirection:'row',gap:8}}>{options.map(option=><PixelButton key={option.key} label={option.label} variant={option.key===value?'primary':'secondary'} minHeight={44} onPress={()=>onChange(option.key)} style={{flex:1}}/>)}</View>;
}
const monthOf=(key:string)=>({year:Number(key.slice(0,4)),month:Number(key.slice(5,7))});
/** 종료일 고르기. firstAllowed보다 앞선 날짜는 비활성이고, 그 달보다 앞으로는 가지 않는다. */
export function EndDatePicker({firstAllowed,selected,hint,onSelect}:{firstAllowed:string;selected?:string;hint:string;onSelect:(date:string)=>void}) {
  const [shown,setShown]=useState(()=>monthOf(selected&&selected>firstAllowed?selected:firstAllowed));
  const first=monthOf(firstAllowed);
  return <PixelFrame variant="input" fill={retro.color.lcd} contentStyle={{padding:12,gap:8}}>
    <PixelText variant="caption" style={caption}>{hint}</PixelText>
    <CalendarBoard year={shown.year} month={shown.month} selectedDate={selected} onSelect={onSelect} onMonthChange={(year,month)=>setShown({year,month})}
      isDateEnabled={date=>date>=firstAllowed} canGoPrev={shown.year*12+shown.month>first.year*12+first.month}/>
  </PixelFrame>;
}
const longDate=(key:string)=>`${Number(key.slice(5,7))}월 ${Number(key.slice(8,10))}일`;
const dayAfter=(key:string)=>{const d=new Date(`${key}T00:00`);d.setDate(d.getDate()+1);return calendarDateKey(d.getFullYear(),d.getMonth()+1,d.getDate());};
function FieldRow({label,children,disabled=false}:{label:string;children:ReactNode;disabled?:boolean}) {
  return <View style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:48,opacity:disabled?retro.opacity.disabled:1}}><PixelText style={{width:64}}>{label}</PixelText>{children}</View>;
}
/**
 * 달력판 기간 (PRD 4.3). 시작일은 만든 날이라 바꿀 수 없다. 종료일은 정하기·바꾸기·지우기가 되고,
 * 고를 때는 마지막으로 붙인 날 다음 날부터 고를 수 있다.
 */
export function PeriodField({startDate,endDate,lastPlacedDate,picking,onPick,onChange,onClear}:{startDate:string;endDate?:string;/** 없으면 시작일 */lastPlacedDate?:string;picking:boolean;onPick:()=>void;onChange:(date:string)=>void;onClear:()=>void}) {
  const last=lastPlacedDate??startDate;
  return <View style={{gap:4}}>
    <PixelText variant="title" style={{fontSize:20,lineHeight:28}}>기간</PixelText>
    <FieldRow label="시작일" disabled><View style={{flex:1}}><PixelText>{longDate(startDate)}</PixelText><PixelText variant="caption" style={caption}>만든 날이라 바꿀 수 없어요</PixelText></View></FieldRow>
    <FieldRow label="종료일">
      <PixelText style={{flex:1}}>{endDate?longDate(endDate):'없음'}</PixelText>
      {endDate?<><PixelButton label="바꾸기" variant={picking?'primary':'secondary'} minHeight={40} onPress={onPick}/><PixelButton label="지우기" variant="secondary" minHeight={40} onPress={onClear}/></>:<PixelButton label="정하기" variant={picking?'primary':'secondary'} minHeight={40} onPress={onPick}/>}
    </FieldRow>
    {picking&&<EndDatePicker firstAllowed={dayAfter(last)} selected={endDate} onSelect={onChange} hint={lastPlacedDate?`마지막으로 붙인 ${longDate(lastPlacedDate)} 다음 날부터 고를 수 있어요.`:'시작일 다음 날부터 고를 수 있어요.'}/>}
  </View>;
}
/** 화면 맨 아래 삭제 영역: 구분선, [삭제하기] 보조 버튼, 무엇이 지워지는지 안내. 누르면 호스트가 삭제 확인 다이얼로그를 띄운다. */
export function DeleteSection({onDelete,description='목표와 붙인 스티커, 사진·메모가 모두 지워져요.'}:{onDelete:()=>void;description?:string}) {
  return <View style={{gap:8,marginTop:8,paddingTop:16,borderTopWidth:retro.shape.cellBorder,borderColor:retro.color.ink}}>
    <PixelButton label="삭제하기" variant="secondary" icon={<ActionSymbol name="trash" size={18}/>} onPress={onDelete}/>
    <PixelText variant="caption" style={[caption,{textAlign:'center'}]}>{description}</PixelText>
  </View>;
}
