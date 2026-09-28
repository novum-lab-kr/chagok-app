import React, {useContext, useState, type ReactNode} from 'react';
import {View, Pressable, Image, TextInput, ScrollView, KeyboardAvoidingView, Keyboard, Platform, type ImageSourcePropType, type LayoutRectangle, type StyleProp, type ViewStyle} from 'react-native';
import {PixelButton,PixelFrame,PixelFocusRing,PixelInput,PixelPanel,PixelText,StickerFilters,SCREEN_MAX_WIDTH,SCREEN_PADDING,type StickerGroup} from './components';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import {retro} from './tokens';
import Svg,{Path} from 'react-native-svg';
import {pixelOutline} from './geometry';
import {ActionSymbol,StickerGlyph,pocketStickers,stickerLabel,type PocketStickerId} from './sticker-glyphs';

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
      <Svg width={width} height={height} style={{position:'absolute',left:0,top:0}}>
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
    {size.width>0&&<Svg width={size.width} height={size.height} style={{position:'absolute',left:0,top:0}}>
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
export function SlotCountPicker({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  const [custom,setCustom]=useState(!['15','20','30'].includes(value));
  return <View style={{gap:8}}><PixelText>칸 수</PixelText><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
    {['15','20','30'].map(n=><PixelButton key={n} label={n} variant={!custom&&value===n?'primary':'secondary'} onPress={()=>{setCustom(false);onChange(n)}} style={{flex:1}}/>)}
    <PixelButton label="직접 입력" variant={custom?'primary':'secondary'} onPress={()=>setCustom(true)}/>
  </View>{custom&&<PixelInput label="칸 수 직접 입력" value={value} onChangeText={onChange} keyboardType="number-pad" maxLength={3}/>}</View>;
}
export function StickerSummary({value,onChange}:{value:PocketStickerId;onChange?:()=>void}) {
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
export function RecordSummary({goalName,date,sticker}:{goalName:string;date:string;sticker:PocketStickerId}) {
  return <PixelFrame contentStyle={{padding:20,flexDirection:'row',alignItems:'center',gap:16}}><StickerGlyph id={sticker} size={56}/><View style={{width:retro.shape.border,height:56,backgroundColor:retro.color.ink}}/><View style={{flex:1,gap:4}}><PixelText variant="title">{goalName}</PixelText><PixelText>{date}</PixelText></View></PixelFrame>;
}
export function PhotoAttachment({source,preview,onChoose,onRemove}:{source?:ImageSourcePropType;preview?:ReactNode;onChoose:()=>void;onRemove:()=>void}) {
  const attached=!!source||!!preview;
  return <View style={{gap:12}}>
    <PixelFrame contentStyle={{padding:retro.shape.panelInnerInset+4}}><View style={{aspectRatio:586/494,overflow:'hidden',alignItems:'center',justifyContent:'center'}}>
      {source?<Image source={source} accessibilityLabel="기록 사진" resizeMode="cover" style={{width:'100%',height:'100%'}}/>:preview??<View style={{gap:12,alignItems:'center'}}><ActionSymbol name="photo" size={36}/><PixelText>사진을 남겨보세요</PixelText></View>}
    </View></PixelFrame>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><PixelButton label={attached?'사진 바꾸기':'사진 추가'} variant="secondary" icon={<ActionSymbol name="photo" size={16}/>} onPress={onChoose} style={{flexGrow:1,flexBasis:150}}/><PixelButton label="사진 지우기" variant="secondary" icon={<ActionSymbol name="trash" size={16}/>} disabled={!attached} onPress={onRemove} style={{flexGrow:1,flexBasis:150}}/></View>
  </View>;
}
export function MemoEditor({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  return <PixelPanel title="메모"><TextInput accessibilityLabel="메모" value={value} onChangeText={onChange} multiline placeholder="오늘의 기록을 남겨보세요" placeholderTextColor={retro.color.ink} style={{minHeight:84,paddingTop:10,paddingHorizontal:0,color:retro.color.ink,...retro.typography.body,fontFamily:retro.fontFamily,fontWeight:'400',textAlignVertical:'top'}}/></PixelPanel>;
}
export function TextAction({label,onPress,icon}:{label:string;onPress:()=>void;icon?:ReactNode}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{minHeight:retro.layout.touch,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}>{icon}<PixelText>{label}</PixelText></Pressable>;
}
const NO_INSETS={top:0,right:0,bottom:0,left:0};
/**
 * 화면 껍데기. 내용이 길면 세로로 스크롤하고, 노치와 홈 인디케이터를 피해서 그린다.
 *
 * `useSafeAreaInsets()`가 아니라 컨텍스트를 직접 읽는 이유: 그 훅은 `SafeAreaProvider`가 없으면
 * 예외를 던지는데, 컴포넌트 테스트와 Storybook은 Provider 없이 화면을 렌더한다. 값이 없으면 0이다.
 *
 * `avoidKeyboard`는 하단에 입력창이 있는 화면(기록)만 켠다. 홈처럼 입력이 없는 화면에서 켜면
 * 안드로이드에서 불필요한 리사이즈가 생긴다.
 */
export function RetroScreen({children,style,avoidKeyboard=false}:{children:ReactNode;style?:StyleProp<ViewStyle>;avoidKeyboard?:boolean}) {
  const insets=useContext(SafeAreaInsetsContext)??NO_INSETS;
  // 빈 곳을 누르면 키보드를 내린다. 「칸 수 직접 입력」은 number-pad라 iOS에 리턴 키가 없고,
  // 메모는 multiline이라 리턴이 줄바꿈이다. 두 경우 모두 이것 말고는 내릴 방법이 없다.
  // 자식이 Pressable이면 그쪽이 먼저 응답자가 되므로 버튼 탭을 가로채지 않는다.
  const body=<ScrollView
    style={{flex:1}}
    contentContainerStyle={{flexGrow:1,alignItems:'center',paddingTop:insets.top,paddingBottom:insets.bottom+SCREEN_PADDING}}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'}>
    <Pressable accessible={false} onPress={()=>Keyboard.dismiss()}
      style={[{width:'100%',maxWidth:SCREEN_MAX_WIDTH,padding:SCREEN_PADDING,gap:20},style]}>{children}</Pressable>
  </ScrollView>;
  return <View style={{flex:1,backgroundColor:retro.color.screen}}>
    {avoidKeyboard
      ? <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>{body}</KeyboardAvoidingView>
      : body}
  </View>;
}

export function SelectionBadge() {
  return <PixelFrame variant="selection" fill={retro.color.ink} contentStyle={{width:20,height:20,alignItems:'center',justifyContent:'center'}}><ActionSymbol name="check" size={14} color={retro.color.secondary}/></PixelFrame>;
}
