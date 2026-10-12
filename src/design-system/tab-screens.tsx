import React,{useContext,type ReactNode} from 'react';
import {Image,Pressable,ScrollView,View,type ImageSourcePropType} from 'react-native';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import Svg,{Path} from 'react-native-svg';
import {retro} from './tokens';
import {touchSlop} from './touch';
import {PixelButton,PixelFrame,PixelTabs,PixelText} from './components';
import {EmptyState,RetroScreen} from './composition-controls';
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
  sticker:'M7 1H9V4H10V5H15V7H14V8H13V9H12V11H13V15H11V14H10V13H9V12H7V13H6V14H5V15H3V11H4V9H3V8H2V7H1V5H6V4H7Z',
};
/** 탭 아이콘. 고른 탭은 살구색으로 칠하므로 색을 받는다(설정 톱니바퀴도 PixelIcon과 같은 그림을 색만 바꿔 쓴다). */
export function TabIcon({name,color,size=24}:{name:TabIconName;color:string;size?:number}) {
  if(name==='record') return <ActionSymbol name="photo" size={size} color={color}/>;
  const [d,viewBox]=name==='settings'?[gearPath,gearViewBox]:[TAB_PATHS[name],'0 0 16 16'];
  return <Svg width={size} height={size} viewBox={viewBox} accessible={false}><Path d={d} fill={color} fillRule="evenodd"/></Svg>;
}
export type TabItem<K extends string>={key:K;label:string;icon:TabIconName};
/**
 * 떠 있는 하단 탭 바. 화면 가장자리에서 떨어진 판 모양 테두리 안에 아이콘 + 이름.
 * 고른 탭은 아이콘만 살구색, 나머지는 흐리게 — 위쪽 「내 목표 / 완성한 판」 잉크 알약과 겹쳐 보이지 않게 채우지 않는다.
 */
export function FloatingTabBar<K extends string>({items,value,onChange}:{items:readonly TabItem<K>[];value:K;onChange:(key:K)=>void}) {
  const bottom=useContext(SafeAreaInsetsContext)?.bottom??0;
  return <View style={{paddingHorizontal:16,paddingTop:8,paddingBottom:Math.max(bottom,12),backgroundColor:c.screen}}>
    <PixelFrame variant="dialog" fill={c.secondary} contentStyle={{flexDirection:'row',paddingVertical:8,paddingHorizontal:6}}>
      <View accessibilityRole="tablist" style={{flex:1,flexDirection:'row'}}>
        {items.map(item=>{
          const on=item.key===value;
          return <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} aria-selected={on} accessibilityState={{selected:on}} onPress={()=>onChange(item.key)}
            style={{flex:1,minHeight:52,alignItems:'center',justifyContent:'center',gap:2,opacity:on?1:0.45}}>
            <TabIcon name={item.icon} color={on?c.primary:c.ink}/>
            <PixelText style={{fontSize:13,lineHeight:16,color:c.ink}}>{item.label}</PixelText>
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
function TimelineItem({entry,onPress}:{entry:TimelineEntryView;onPress:()=>void}) {
  const memo=entry.memo?.trim();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${entry.goalName}, ${memo||'사진'}`} onPress={onPress}>
    {({pressed})=><PixelFrame variant="button" fill={c.secondary} pressed={pressed} contentStyle={{padding:12,flexDirection:'row',alignItems:'center',gap:12}}>
      <StickerGlyph id={entry.sticker} size={40}/>
      <View style={{flex:1,gap:4}}>
        <PixelText variant="caption" style={caption} numberOfLines={1}>{entry.goalName}</PixelText>
        {memo?<PixelText numberOfLines={2} style={{fontSize:16,lineHeight:22,color:c.buttonText}}>{memo}</PixelText>
          :<PixelText variant="caption" style={caption}>사진만 남겼어요</PixelText>}
      </View>
      {entry.photo&&<View style={{width:64,height:64,borderWidth:retro.shape.border,borderColor:c.ink,backgroundColor:c.screen}}>
        <Image source={entry.photo} accessibilityLabel="기록 사진" resizeMode="cover" style={{width:'100%',height:'100%'}}/>
      </View>}
    </PixelFrame>}
  </Pressable>;
}
/**
 * 기록 탭 (2026-10-12): 사진이나 메모가 있는 칸만 날짜별로. 위 칩으로 목표를 고른다.
 * 항목을 누르면 지금의 기록 화면이 열린다.
 */
export function RecordTimelineScreen({days,goals,goal,onGoal,onOpen}:{days:readonly TimelineDayView[];/** 칩: 기록이 있는 목표 */goals:readonly {id:string;name:string}[];/** 고른 목표. null = 전체 */goal:string|null;onGoal:(id:string|null)=>void;onOpen:(stickerId:string)=>void}) {
  const ALL='__all';
  return <RetroScreen style={{gap:16}} header={<TabTitle title="기록"/>}>
    {goals.length>0&&<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}}>
      <PixelTabs items={[{key:ALL,label:'전체'},...goals.map(g=>({key:g.id,label:g.name}))]} value={goal??ALL} onChange={key=>onGoal(key===ALL?null:key)}/>
    </ScrollView>}
    {days.length===0
      ?<EmptyState title="아직 남긴 기록이 없어요" description="판에서 붙인 칸을 누르면 사진과 메모를 남길 수 있어요."/>
      :days.map(day=><View key={day.key} style={{gap:8}}>
        <View style={{paddingBottom:4,borderBottomWidth:retro.shape.border,borderColor:c.ink}}><PixelText accessibilityRole="header" variant="caption" style={caption}>{day.label}</PixelText></View>
        {day.entries.map(entry=><TimelineItem key={entry.id} entry={entry} onPress={()=>onOpen(entry.id)}/>)}
      </View>)}
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
