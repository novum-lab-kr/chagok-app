import React,{useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,Image,Pressable,ScrollView,View,type GestureResponderEvent,type ImageSourcePropType} from 'react-native';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import Svg,{Path} from 'react-native-svg';
import {retro} from './tokens';
import {touchSlop} from './touch';
import {PixelButton,PixelFrame,PixelText} from './components';
import {EmptyState,RetroScreen,ScreenHeader} from './composition-controls';
import {ActionSymbol,StickerGlyph,type StickerId} from './sticker-glyphs';
import {Mascot} from './mascot';
import {PackCard,PackViewSwitch,RewardProgress,type PackView} from './sticker-shop';
import {gearPath,gearViewBox} from './assets/gear';
import type {ColorStickerPackId} from '../stickers/color/catalog';

/**
 * 하단 탭 구조 (2026-10-12 확정 시안 4차: 떠 있는 바 + 살구색 아이콘, 탭 4개).
 * 목표 · 기록 · 스티커 · 설정. 판·기록 화면은 탭 위에 쌓여 탭 바가 보이지 않는다.
 */
const c=retro.color;
const caption={color:c.buttonText};

// ── 하단 탭 바 ────────────────────────────────────────────────────
export type TabIconName='goal'|'record'|'sticker'|'settings';
const TAB_PATHS={
  goal:'M1 1H7V7H1Z M9 1H15V7H9Z M1 9H7V15H1Z M9 9H15V15H9Z M3 3V5H5V3Z M11 11V13H13V11Z',
  // 기록: 노트 (2026-10-15 아이콘 시안 2차)
  record:'M2 1H14V14H2Z M4 3V12H12V3Z M5 5H11V6H5Z M5 7H11V8H5Z M5 9H9V10H5Z M3 0H4V1H3Z M6 0H7V1H6Z M9 0H10V1H9Z M12 0H13V1H12Z',
  sticker:'M7 1H9V4H10V5H15V7H14V8H13V9H12V11H13V15H11V14H10V13H9V12H7V13H6V14H5V15H3V11H4V9H3V8H2V7H1V5H6V4H7Z',
};
/** 탭 아이콘. 고른 탭은 살구색으로 칠하므로 색을 받는다(설정 톱니바퀴도 PixelIcon과 같은 그림을 색만 바꿔 쓴다). */
export function TabIcon({name,color,size=32}:{name:TabIconName;color:string;size?:number}) {
  const [d,viewBox]=name==='settings'?[gearPath,gearViewBox]:[TAB_PATHS[name],'0 0 16 16'];
  return <Svg width={size} height={size} viewBox={viewBox} accessible={false}><Path d={d} fill={color} fillRule="evenodd"/></Svg>;
}
export type TabItem<K extends string>={key:K;label:string;icon:TabIconName};
function useReduceMotion(forced?:boolean) {
  const [device,setDevice]=useState(false);
  useEffect(()=>{
    if(forced!==undefined) return;
    let alive=true;
    AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(alive) setDevice(v);}).catch(()=>{});
    return ()=>{alive=false;};
  },[forced]);
  return forced??device;
}
/**
 * 떠 있는 하단 탭 바 (2026-10-15 시안: 글자 없이 아이콘 32 + 미끄러지는 도트 칸).
 * 고른 탭은 아이콘 살구색 + 바탕 민트 도트 칸 — 위쪽 「내 목표 / 완성한 판」 잉크 알약과 겹쳐 보이지 않게 잉크로 채우지 않는다.
 * 바 위를 누른 채 옆으로 끌면 칸이 손가락을 따라오고 지나가는 아이콘이 들리며, 손을 떼면 그 탭으로 바뀐다(App Store 탭 바의 끌어서 고르기).
 * 그냥 누르기도 된다. onTick은 누를 때와 탭 경계를 넘을 때마다(햅틱). 「동작 줄이기」가 켜져 있으면 칸이 움직이지 않고 바로 옮겨 간다.
 * 글자는 없지만 화면 낭독 이름(label)은 그대로 둔다.
 */
export function FloatingTabBar<K extends string>({items,value,onChange,onTick,reduceMotion,position}:{items:readonly TabItem<K>[];value:K;onChange:(key:K)=>void;onTick?:()=>void;reduceMotion?:boolean;/** 화면을 밀 때 탭 위치(0~탭 수-1, 소수). 주면 칸이 화면을 따라 움직인다 (2026-10-17) */position?:Animated.AnimatedInterpolation<number>}) {
  const bottom=useContext(SafeAreaInsetsContext)?.bottom??0;
  const reduced=useReduceMotion(reduceMotion);
  const selected=Math.max(0,items.findIndex(i=>i.key===value));
  const [width,setWidth]=useState(0);
  const slot=width/items.length;
  const [hover,setHover]=useState<number|null>(null);
  const [x]=useState(()=>new Animated.Value(0));
  const [lift]=useState(()=>new Animated.Value(0));
  const row=useRef<View>(null);
  const origin=useRef(0);
  const shown=hover??selected;
  /** 화면 넘김 위치를 따라가나. 그 값은 기기 쪽에서 움직여서 JS로 움직이는 x, lift와 같은 층에 두지 않는다(같이 두면 눌렀을 때 오류) */
  const follows=!!position&&!reduced;
  /** 바를 누르거나 끈 뒤 놓은 칸이 자리 잡을 때까지. 이때만 칸이 스프링으로 미끄러진다.
   *  화면을 밀어 탭이 바뀔 때는 바깥 층이 이미 따라가므로 바로 제자리로 둔다 */
  const fromBar=useRef(false);
  const glide=useCallback((i:number)=>{
    const toValue=i*slot;
    if(reduced||(follows&&!fromBar.current)) {x.setValue(toValue);return;}
    Animated.spring(x,{toValue,speed:22,bounciness:5,useNativeDriver:false}).start(({finished})=>{if(finished) fromBar.current=false;});
  },[follows,reduced,slot,x]);
  useEffect(()=>{if(hover===null) glide(selected);},[glide,hover,selected]);
  const indexAt=(pageX:number)=>Math.min(items.length-1,Math.max(0,Math.floor((pageX-origin.current)/slot)));
  const follow=(pageX:number,i:number)=>{
    if(reduced) {if(i!==hover) glide(i);return;}
    x.setValue(Math.min((items.length-1)*slot,Math.max(0,pageX-origin.current-slot/2)));
  };
  const pressTo=(v:number)=>reduced?lift.setValue(v):Animated.spring(lift,{toValue:v,speed:30,bounciness:6,useNativeDriver:false}).start();
  const grant=(e:GestureResponderEvent)=>{
    if(!slot) return;
    const i=indexAt(e.nativeEvent.pageX);
    fromBar.current=true;
    setHover(i);pressTo(1);follow(e.nativeEvent.pageX,i);onTick?.();
  };
  const move=(e:GestureResponderEvent)=>{
    if(hover===null) return;
    const i=indexAt(e.nativeEvent.pageX);
    if(i!==hover) onTick?.();
    follow(e.nativeEvent.pageX,i);setHover(i);
  };
  const release=(commit:boolean)=>{
    const i=hover;
    setHover(null);pressTo(0);
    if(i===null) return;
    if(commit&&i!==selected) onChange(items[i].key);
    glide(commit?i:selected);
  };
  return <View style={{paddingHorizontal:16,paddingTop:8,paddingBottom:Math.max(bottom,12),backgroundColor:c.screen}}>
    <PixelFrame variant="dialog" fill={c.secondary} contentStyle={{flexDirection:'row',paddingVertical:8,paddingHorizontal:6}}>
      <View ref={row} accessibilityRole="tablist" style={{flex:1,flexDirection:'row'}}
        onLayout={e=>{setWidth(e.nativeEvent.layout.width);row.current?.measureInWindow(px=>{origin.current=px;});}}
        onStartShouldSetResponderCapture={()=>true} onMoveShouldSetResponderCapture={()=>true} onResponderTerminationRequest={()=>false}
        onResponderGrant={e=>{row.current?.measureInWindow(px=>{origin.current=px;});grant(e);}} onResponderMove={move}
        onResponderRelease={()=>release(true)} onResponderTerminate={()=>release(false)}>
        {slot>0&&<Animated.View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,width:slot,
          transform:[{translateX:follows&&position?Animated.multiply(position,slot):0}]}}>
          <Animated.View style={{flex:1,padding:2,
            transform:[{translateX:follows?Animated.subtract(x,selected*slot):x},{scaleY:lift.interpolate({inputRange:[0,1],outputRange:[1,1.12]})},{scaleX:lift.interpolate({inputRange:[0,1],outputRange:[1,1.06]})}]}}>
            <PixelFrame variant="selection" fill={c.screen} style={{flex:1}}/>
          </Animated.View>
        </Animated.View>}
        {items.map((item,i)=>{
          const on=i===shown,lifted=hover===i;
          return <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} aria-selected={i===selected} accessibilityState={{selected:i===selected}} onPress={()=>onChange(item.key)}
            style={{flex:1,minHeight:48,alignItems:'center',justifyContent:'center',opacity:on?1:0.45}}>
            <Animated.View style={{transform:lifted?[{translateY:lift.interpolate({inputRange:[0,1],outputRange:[0,-4]})},{scale:lift.interpolate({inputRange:[0,1],outputRange:[1,1.2]})}]:[]}}>
              <TabIcon name={item.icon} color={on?c.primary:c.ink}/>
            </Animated.View>
          </Pressable>;
        })}
      </View>
    </PixelFrame>
  </View>;
}
/** 탭 맨 위 제목(기록·스티커·설정). 목표 탭은 앱 머리글(차곡이 + 차곡차곡)이다. */
export function TabTitle({title}:{title:string}) {
  return <View style={{height:44,justifyContent:'center'}}><PixelText accessibilityRole="header" variant="brand">{title}</PixelText></View>;
}
/** 탭 안 화면: 아래 안전 영역은 탭 바가 맡으므로 화면은 0으로 본다(스크롤 끝 빈 칸이 두 번 생기지 않게). */
export function TabSafeArea({children}:{children:ReactNode}) {
  const insets=useContext(SafeAreaInsetsContext);
  return <SafeAreaInsetsContext.Provider value={insets?{...insets,bottom:0}:insets}>{children}</SafeAreaInsetsContext.Provider>;
}

// ── 기록 탭 ──────────────────────────────────────────────────────
export type TimelineEntryView={id:string;goalName:string;sticker:StickerId;memo?:string|null;photo?:ImageSourcePropType};
export type TimelineDayView={key:string;label:string;entries:readonly TimelineEntryView[]};
export type TimelineGoalView={id:string;name:string;sticker:StickerId};
/** 기록 줄 (2026-10-17 시안 1안): 목표 이름은 민트 배지, 메모는 잉크 글씨, 사진 72. */
function TimelineItem({entry,onPress}:{entry:TimelineEntryView;onPress:()=>void}) {
  const memo=entry.memo?.trim();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${entry.goalName}, ${memo||'사진'}`} onPress={onPress}>
    {({pressed})=><PixelFrame variant="button" fill={c.secondary} pressed={pressed} contentStyle={{padding:12,flexDirection:'row',alignItems:'center',gap:12}}>
      <StickerGlyph id={entry.sticker} size={40}/>
      <View style={{flex:1,gap:6}}>
        <View style={{alignSelf:'flex-start',maxWidth:'100%'}}>
          <PixelFrame variant="selection" fill={c.screen} contentStyle={{paddingHorizontal:6,paddingVertical:1}}>
            <PixelText variant="caption" numberOfLines={1} style={{color:c.ink}}>{entry.goalName}</PixelText>
          </PixelFrame>
        </View>
        {memo?<PixelText numberOfLines={2} style={{fontSize:16,lineHeight:22,color:c.ink}}>{memo}</PixelText>
          :<PixelText variant="caption" style={caption}>사진만 남겼어요</PixelText>}
      </View>
      {entry.photo&&<View style={{width:72,height:72,borderWidth:retro.shape.border,borderColor:c.ink,backgroundColor:c.screen}}>
        <Image source={entry.photo} accessibilityLabel="기록 사진" resizeMode="cover" style={{width:'100%',height:'100%'}}/>
      </View>}
    </PixelFrame>}
  </Pressable>;
}
/** 날짜 머리글 (2026-10-17 시안 1안): 잉크 띠에 「10월 12일」 + 작은 요일, 오른쪽으로 옅은 줄. 화면 낭독은 머리글 하나로 읽는다. */
function TimelineDayHeader({label}:{label:string}) {
  const cut=label.lastIndexOf(' ');
  return <View accessible accessibilityRole="header" accessibilityLabel={label} style={{flexDirection:'row',alignItems:'center',gap:8}}>
    <PixelFrame variant="selection" fill={c.ink} contentStyle={{paddingHorizontal:8,paddingVertical:3,flexDirection:'row',alignItems:'baseline',gap:6}}>
      <PixelText style={{fontSize:17,lineHeight:22,color:c.lcd}}>{label.slice(0,cut)}</PixelText>
      <PixelText variant="caption" style={{color:c.lcd,opacity:0.8}}>{label.slice(cut+1)}</PixelText>
    </PixelFrame>
    <View style={{flex:1,height:retro.shape.border,backgroundColor:c.ink,opacity:0.3}}/>
  </View>;
}
/** 목표 칩 (2026-10-17 시안 2안): 목표는 기본 스티커만, 고른 칩만 이름을 펼친다. 화면 낭독은 늘 목표 이름. */
function TimelineGoalChips({goals,goal,onGoal}:{goals:readonly TimelineGoalView[];goal:string|null;onGoal:(id:string|null)=>void}) {
  const chip=(key:string,label:string,on:boolean,onPress:()=>void,body:ReactNode)=><Pressable key={key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:on}} aria-selected={on} onPress={onPress}>
    <PixelFrame variant="selection" fill={on?c.ink:c.secondary} contentStyle={{minHeight:retro.layout.touch,minWidth:retro.layout.touch,paddingHorizontal:on?10:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6}}>{body}</PixelFrame>
  </Pressable>;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}}>
    <View accessibilityRole="tablist" style={{flexDirection:'row',alignItems:'center',gap:6}}>
      {chip('__all','전체',goal===null,()=>onGoal(null),<PixelText style={{fontSize:16,lineHeight:22,color:goal===null?c.lcd:c.buttonText}}>전체</PixelText>)}
      {goals.map(g=>{const on=g.id===goal;return chip(g.id,g.name,on,()=>onGoal(g.id),<>
        <StickerGlyph id={g.sticker} size={28}/>
        {on&&<PixelText numberOfLines={1} style={{fontSize:16,lineHeight:22,maxWidth:150,color:c.lcd}}>{g.name}</PixelText>}
      </>);})}
    </View>
  </ScrollView>;
}
/** 보기 바꾸기 (2026-10-17 시안 2판): 「기록」 제목 오른쪽 목록, 격자 아이콘. 모양은 PackViewSwitch와 같다. */
export type RecordView='timeline'|'feed';
const VIEW_ICONS={timeline:'M1 2H3V4H1Z M5 2H15V4H5Z M1 7H3V9H1Z M5 7H15V9H5Z M1 12H3V14H1Z M5 12H15V14H5Z',feed:'M1 1H5V5H1Z M6 1H10V5H6Z M11 1H15V5H11Z M1 6H5V10H1Z M6 6H10V10H6Z M11 6H15V10H11Z M1 11H5V15H1Z M6 11H10V15H6Z M11 11H15V15H11Z'};
function RecordViewSwitch({view,onView}:{view:RecordView;onView:(view:RecordView)=>void}) {
  return <View accessibilityRole="tablist" style={{flexDirection:'row',gap:4}}>
    {(['timeline','feed'] as const).map(v=>{const on=v===view;return <Pressable key={v} accessibilityRole="tab" accessibilityLabel={v==='timeline'?'타임라인으로 보기':'사진으로 보기'} aria-selected={on} accessibilityState={{selected:on}} onPress={()=>onView(v)}>
      <PixelFrame variant="selection" fill={on?c.ink:'transparent'} contentStyle={{width:retro.layout.touch,height:retro.layout.touch,alignItems:'center',justifyContent:'center'}}>
        <Svg width={22} height={22} viewBox="0 0 16 16"><Path d={VIEW_ICONS[v]} fill={on?c.lcd:c.buttonText} fillRule="evenodd"/></Svg>
      </PixelFrame>
    </Pressable>;})}
  </View>;
}
/** 피드 칸 (2026-10-17 시안 2판 A): 3열 정사각형. 사진이 없으면 메모 글자 칸. */
function FeedTile({entry,onPress}:{entry:TimelineEntryView;onPress:()=>void}) {
  const memo=entry.memo?.trim();
  return <View style={{width:'33.333%',aspectRatio:1,padding:1.5}}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${entry.goalName}, ${memo||'사진'}`} onPress={onPress} style={{flex:1,borderWidth:retro.shape.border,borderColor:c.ink,backgroundColor:c.secondary,overflow:'hidden'}}>
      {entry.photo?<Image source={entry.photo} accessibilityLabel="기록 사진" resizeMode="cover" style={{width:'100%',height:'100%'}}/>
        :<View style={{flex:1,padding:8,justifyContent:'center'}}><PixelText numberOfLines={4} style={memo?{fontSize:13,lineHeight:18,color:c.ink}:[caption,{fontSize:13,lineHeight:18}]}>{memo||'사진만 남겼어요'}</PixelText></View>}
    </Pressable>
  </View>;
}
/**
 * 기록 탭 (2026-10-12): 사진이나 메모가 있는 칸만 날짜별로. 위 칩으로 목표를 고른다.
 * 항목을 누르면 지금의 기록 화면이 열린다. 2026-10-17: 칩은 스티커(2안), 날짜 띠와 기록 줄은 1안.
 * 2026-10-17 2판: 제목 옆 아이콘으로 피드(사진 격자)로 바꾼다. 피드 칸을 누르면 펼친 화면.
 */
export function RecordTimelineScreen({days,goals,goal,onGoal,onOpen,view='timeline',onView,onOpenFeed}:{days:readonly TimelineDayView[];/** 칩: 기록이 있는 목표 */goals:readonly TimelineGoalView[];/** 고른 목표. null = 전체 */goal:string|null;onGoal:(id:string|null)=>void;onOpen:(stickerId:string)=>void;view?:RecordView;onView?:(view:RecordView)=>void;/** 피드 칸을 눌렀을 때: 그 기록부터 펼친 화면 */onOpenFeed?:(stickerId:string)=>void}) {
  const header=<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><TabTitle title="기록"/>{onView&&<RecordViewSwitch view={view} onView={onView}/>}</View>;
  return <RetroScreen style={{gap:16}} header={header}>
    {goals.length>0&&<TimelineGoalChips goals={goals} goal={goal} onGoal={onGoal}/>}
    {days.length===0
      ?<EmptyState title="아직 남긴 기록이 없어요" description="판에서 붙인 칸을 누르면 사진과 메모를 남길 수 있어요."/>
      :view==='feed'
        ?<View style={{flexDirection:'row',flexWrap:'wrap',marginHorizontal:-1.5}}>
          {days.flatMap(day=>day.entries).map(entry=><FeedTile key={entry.id} entry={entry} onPress={()=>(onOpenFeed??onOpen)(entry.id)}/>)}
        </View>
        :days.map(day=><View key={day.key} style={{gap:8}}>
          <TimelineDayHeader label={day.label}/>
          {day.entries.map(entry=><TimelineItem key={entry.id} entry={entry} onPress={()=>onOpen(entry.id)}/>)}
        </View>)}
  </RetroScreen>;
}

/** 펼친 화면의 기록 하나. date는 「10월 12일」. */
export type FeedPostView=TimelineEntryView&{date:string};
/** 사진 틀은 기록 화면 사진 칸과 같은 586:494 (2026-10-17 시안 3판 B). 사진은 원래 비율로 저장돼 있고 여기서만 맞춰 자른다. */
const FEED_PHOTO_RATIO=586/494;
function FeedPost({post,onPress}:{post:FeedPostView;onPress:()=>void}) {
  const memo=post.memo?.trim();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${post.goalName}, ${post.date}, ${memo||'사진'}`} onPress={onPress} style={{gap:10}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <StickerGlyph id={post.sticker} size={32}/>
      <View style={{flex:1,minWidth:0,alignItems:'flex-start'}}>
        <PixelFrame variant="selection" fill={c.secondary} contentStyle={{paddingHorizontal:6,paddingVertical:1}}><PixelText variant="caption" numberOfLines={1} style={{color:c.ink}}>{post.goalName}</PixelText></PixelFrame>
      </View>
      <PixelText variant="caption" style={caption}>{post.date}</PixelText>
    </View>
    {post.photo
      ?<View style={{width:'100%',aspectRatio:FEED_PHOTO_RATIO,borderWidth:retro.shape.border,borderColor:c.ink,backgroundColor:c.screen}}><Image source={post.photo} accessibilityLabel="기록 사진" resizeMode="cover" style={{width:'100%',height:'100%'}}/></View>
      :<PixelFrame variant="button" fill={c.secondary} contentStyle={{padding:16,minHeight:120,justifyContent:'center'}}><PixelText style={memo?{fontSize:18,lineHeight:26,color:c.ink}:caption}>{memo||'사진만 남겼어요'}</PixelText></PixelFrame>}
    {post.photo&&memo&&<PixelText style={{fontSize:16,lineHeight:22,color:c.ink}}>{memo}</PixelText>}
  </Pressable>;
}
/** 펼친 화면 (2026-10-17 시안 2판): 피드에서 누른 기록부터 사진과 메모 전체를 이어 본다. 기록을 누르면 그 칸의 기록 화면. */
export function RecordFeedScreen({posts,onBack,onOpen}:{posts:readonly FeedPostView[];onBack:()=>void;onOpen:(stickerId:string)=>void}) {
  return <RetroScreen style={{gap:28}} header={<ScreenHeader title="기록" onBack={onBack}/>}>
    {posts.length===0
      ?<EmptyState title="아직 남긴 기록이 없어요" description="판에서 붙인 칸을 누르면 사진과 메모를 남길 수 있어요."/>
      :posts.map(post=><FeedPost key={post.id} post={post} onPress={()=>onOpen(post.id)}/>)}
  </RetroScreen>;
}

// ── 스티커 탭 ────────────────────────────────────────────────────
const noop=()=>{};
/** 스티커 탭 (2026-10-12): 묶음 둘러보기. 고르기 줄이 없고, 카드를 누르면 묶음 화면이 열린다. */
export function StickerCollectionScreen({packs,mine,onChangeMine,openPacks,onToggle,reward,onOpenPack}:{packs:readonly PackView[];mine:boolean;onChangeMine:(mine:boolean)=>void;openPacks:readonly ColorStickerPackId[];onToggle:(id:ColorStickerPackId)=>void;reward:{days:number;goal:number};onOpenPack:(id:ColorStickerPackId)=>void}) {
  const order=[...packs.filter(p=>p.state!=='locked'),...(mine?[]:packs.filter(p=>p.state==='locked'))];
  const rewardReady=reward.days>=reward.goal;
  return <RetroScreen style={{gap:14}} headerGap={14} header={<View style={{gap:16}}><TabTitle title="스티커"/><PackViewSwitch mine={mine} onChange={onChangeMine}/></View>}>
    <RewardProgress days={reward.days} goal={reward.goal}/>
    {order.map(p=><PackCard key={p.id} pack={p} selectable={false} open={openPacks.includes(p.id)} rewardReady={rewardReady} onToggle={()=>onToggle(p.id)} onSelect={noop} onOpenPack={()=>onOpenPack(p.id)}/>)}
  </RetroScreen>;
}

// ── 흐름 중간 안내 ───────────────────────────────────────────────
/** 카드 오른쪽 위 모서리의 ×. 글자 폭을 빼앗지 않게 겹쳐 둔다(누르는 곳은 44pt). */
function CloseButton({onPress}:{onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onPress} hitSlop={touchSlop({width:44,height:44})} style={{position:'absolute',top:-4,right:-4,width:44,height:44,alignItems:'center',justifyContent:'center'}}>
    <ActionSymbol name="close" size={14} color={c.buttonText}/>
  </Pressable>;
}
/** 목표 탭 맨 위: 붙인 날 체험이 열렸을 때. ×로 닫으면 다음 체험이 열릴 때까지 안 보인다 (2026-10-12). */
export function TrialReadyCard({days,onChoose,onClose}:{/** 넘긴 문턱(7, 14, 44…) */days:number;onChoose:()=>void;onClose:()=>void}) {
  return <PixelFrame variant="dialog" fill={c.secondary} contentStyle={{padding:12,flexDirection:'row',alignItems:'center',gap:10}}>
    <Mascot pose="sparkle" size={44}/>
    <View style={{flex:1,gap:4,paddingRight:16}}>
      <PixelText style={{fontSize:16,lineHeight:22,color:c.buttonText}}>{`스티커 붙인 날 ${days}일을 모았어요`}</PixelText>
      <PixelText variant="caption" style={caption}>잠긴 묶음 하나를 3일 써 볼 수 있어요</PixelText>
      <View style={{alignSelf:'flex-start',marginTop:4}}><PixelButton label="묶음 고르기" minHeight={40} onPress={onChoose}/></View>
    </View>
    <CloseButton onPress={onClose}/>
  </PixelFrame>;
}
/** 판을 완성하고 [닫기]로 보관한 순간 한 번 (2026-10-12). [스티커 보기]는 스티커 탭으로. */
export function CompletionNudge({onStickers,onClose}:{onStickers:()=>void;onClose:()=>void}) {
  return <PixelFrame variant="dialog" fill={c.secondary} contentStyle={{padding:12,flexDirection:'row',alignItems:'center',gap:10}}>
    <Mascot pose="sparkle" size={44}/>
    <View style={{flex:1,gap:8,paddingRight:16}}>
      <PixelText style={{fontSize:16,lineHeight:22,color:c.buttonText}}>{'다음 판은\n새 스티커로 시작해 볼까요?'}</PixelText>
      <View style={{alignSelf:'flex-start'}}><PixelButton label="스티커 보기" minHeight={40} onPress={onStickers}/></View>
    </View>
    <CloseButton onPress={onClose}/>
  </PixelFrame>;
}
