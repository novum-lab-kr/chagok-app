import React,{useContext} from 'react';
import {Pressable,View} from 'react-native';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import {retro} from './tokens';
import {touchSlop} from './touch';
import {PixelBadge,PixelButton,PixelFocusRing,PixelFrame,PixelIcon,PixelPanel,PixelText,ProgressBar,StickerGrid,StickerSlot,useLayoutSize} from './components';
import {InfoRow,RetroScreen,ScreenHeader,SelectionBadge} from './composition-controls';
import {ActionSymbol,StickerGlyph,stickerLabel,type StickerId} from './sticker-glyphs';
import {colorStickerPacks,colorStickersInPack,type ColorStickerId,type ColorStickerPackId} from '../stickers/color/catalog';
import {Mascot} from './mascot';

/** 스티커 묶음과 구매 (PRD 4.12, 2026-10-08 확정 시안 19판). */
const c=retro.color;
const caption={color:c.buttonText};

/** 「기본 스티커」 맨 위 [모든 묶음 · 내 스티커]. 가운데 구분선 없이 고른 쪽 채움만으로 구분한다. */
export function PackViewSwitch({mine,onChange}:{mine:boolean;onChange:(mine:boolean)=>void}) {
  return <View accessibilityRole="tablist" style={{flexDirection:'row'}}>
    {([['모든 묶음',false],['내 스티커',true]] as const).map(([label,value])=>{
      const on=value===mine;
      return <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label} aria-selected={on} accessibilityState={{selected:on}} onPress={()=>onChange(value)} style={{flex:1,marginHorizontal:4}}>
        <PixelFrame variant="selection" fill={on?c.ink:'transparent'} contentStyle={{minHeight:44,alignItems:'center',justifyContent:'center'}}>
          <PixelText style={{color:on?c.lcd:c.buttonText}}>{label}</PixelText>
        </PixelFrame>
      </Pressable>;
    })}
  </View>;
}
/** 묶음 카드 머리글 끝의 꺾쇠. 펼침은 위, 접힘은 아래를 가리킨다. */
export function FoldToggle({open,onPress}:{open:boolean;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={open?'접기':'펼치기'} onPress={onPress} hitSlop={touchSlop({width:44,height:44})} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}>
    <View style={{transform:[{rotate:open?'-90deg':'90deg'}]}}><PixelIcon name="chevron" size={16}/></View>
  </Pressable>;
}
/** 고를 수 있는 스티커 한 칸. 고르면 그림에서 6pt 띄운 포커스 링과 체크 배지. */
export function StickerChoice({id,selected=false,onPress}:{id:StickerId;selected?:boolean;onPress?:()=>void}) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={stickerLabel(id)} aria-checked={selected} accessibilityState={{checked:selected}} onPress={onPress} style={{width:50,height:52,alignItems:'center',justifyContent:'center'}}>
    <StickerGlyph id={id} size={48}/>
    {selected&&<><View pointerEvents="none" style={{position:'absolute',left:-6,right:-6,top:-6,bottom:-6}}><PixelFocusRing/></View><View pointerEvents="none" style={{position:'absolute',right:-12,top:-12}}><SelectionBadge/></View></>}
  </Pressable>;
}
/** 붙인 날 안내: 붙인 날 누적 7·14·이후 30일마다 묶음 하나를 3일 써 본다. 「보상」이라는 말은 쓰지 않는다. */
export function RewardProgress({days,goal}:{days:number;goal:number}) {
  const ready=days>=goal;
  return <PixelFrame variant="dialog" fill={c.secondary} contentStyle={{padding:10,flexDirection:'row',alignItems:'center',gap:10}}>
    <Mascot pose={ready?'sparkle':'smile'} size={44}/>
    <View style={{flex:1,gap:6}}>
      <PixelText style={{fontSize:15,lineHeight:21,color:c.buttonText}}>{ready?'묶음 하나를 골라\n3일 동안 써 볼 수 있어요':`스티커 붙인 날이 ${goal-days}일 더 모이면\n묶음 하나를 3일 써 볼 수 있어요`}</PixelText>
      {ready?<PixelText variant="caption" style={caption}>{`스티커 붙인 날 ${goal}일을 모았어요`}</PixelText>
        :<View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1}}><ProgressBar value={days} total={goal}/></View><PixelText variant="caption" style={caption}>{`${days}/${goal}`}</PixelText></View>}
    </View>
  </PixelFrame>;
}
/** 「기본 스티커」 아래 고정 줄(LCD 바탕): 고른 스티커 · 이름 · [선택 완료]. 아래쪽은 홈 표시줄만큼 띄운다. */
export function PickedStickerBar({sticker,onDone}:{sticker:StickerId;onDone:()=>void}) {
  const bottom=useContext(SafeAreaInsetsContext)?.bottom??0;
  return <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingTop:12,paddingBottom:bottom+12,borderTopWidth:retro.shape.panelTitleBorder,borderColor:c.ink,backgroundColor:c.lcd}}>
    <PixelFrame variant="slot" fill={c.secondary} style={{width:60,height:60}} contentStyle={{width:60,height:60,alignItems:'center',justifyContent:'center'}}><StickerGlyph id={sticker} size={48}/></PixelFrame>
    <View style={{flex:1}}><PixelText variant="caption" style={caption}>고른 스티커</PixelText><PixelText variant="title" style={{fontSize:20,lineHeight:26}}>{stickerLabel(sticker)}</PixelText></View>
    <PixelButton label="선택 완료" onPress={onDone} style={{minWidth:130}}/>
  </View>;
}

export type PackState='free'|'owned'|'locked'|'trial';
export type PackView={id:ColorStickerPackId;label:string;state:PackState;stickers:readonly StickerId[];/** 체험 중 배지. 예: '24시간 남음', '3일 남음' */trialLabel?:string;/** 스토어에서 받아 온 가격 글자(예: '2,200원'). 못 받아 왔으면 없다 */price?:string};
export function colorPack(id:ColorStickerPackId,state:PackState,trialLabel?:string):PackView {
  const pack=colorStickerPacks.find(p=>p.id===id)!;
  return {id,label:pack.label,state,stickers:colorStickersInPack(id).map(s=>s.id as ColorStickerId),trialLabel};
}
/*
 * 가격은 스토어에서 받아 온 글자(src/purchases/price.ts). 못 받아 왔으면 가격만 빼고 그대로 둔다 —
 * 배지 없이 [>], [묶음 열기], [열기], [광고 없애기]. 결제 창이 실제 가격을 보여 준다 (2026-10-13 시안 A).
 */
/** 접힌 줄 한 칸 폭(StickerChoice), 칸 사이, 「+n」 글자 폭 */
const ROW_CELL=50,ROW_GAP=10,ROW_MORE=28;
/**
 * 접힌 줄에 보일 스티커 수(최대 5). 남으면 「+n」 자리까지 들어가야 한다.
 * 폴드 커버(344dp)에서 5개 + 「+n」이 카드 밖으로 넘쳐 폭을 재서 줄인다 (2026-10-12). 재기 전(0)에는 5개.
 */
export function packRowCount(width:number,total:number):number {
  const most=Math.min(5,total);
  if(width<=0) return most;
  for(let n=most;n>1;n--) if(n*ROW_CELL+(n-1)*ROW_GAP+(n<total?ROW_GAP+ROW_MORE:0)<=width) return n;
  return 1;
}

/** 묶음 카드. 가진 묶음·체험 중은 펼치거나(5개씩 두 줄) 접고(5개 + +n), 잠긴 묶음은 흐린 5개 + +n 위에 가림막. */
export function PackCard({pack,open,selected,rewardReady=false,selectable=true,onToggle,onSelect,onOpenPack}:{pack:PackView;open:boolean;selected?:StickerId;rewardReady?:boolean;/** false면 둘러보기만(스티커 탭): 스티커가 고르는 칸이 아니다 */selectable?:boolean;onToggle:()=>void;onSelect:(id:StickerId)=>void;onOpenPack:()=>void}) {
  const locked=pack.state==='locked';
  const {ref:row,size,onLayout}=useLayoutSize();
  const fit=packRowCount(size.width,pack.stickers.length);
  const more=pack.stickers.length-fit;
  const right=pack.state==='free'?<PixelText variant="caption" style={caption}>무료</PixelText>
    :pack.state==='owned'?<PixelBadge label="열었어요"/>
    :pack.state==='trial'?<PixelBadge label={pack.trialLabel??''} tone="primary"/>
    :<>{rewardReady?<PixelBadge label="3일 무료" tone="primary"/>:pack.price&&<PixelBadge label={pack.price} tone="primary"/>}<PixelIcon name="chevron" size={16}/></>;
  const head=<View style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:36}}>
    <PixelText accessibilityRole="header" style={{fontSize:20,lineHeight:26,color:c.buttonText}}>{pack.label}</PixelText>
    <PixelText variant="caption" style={caption}>{`${pack.stickers.length}종`}</PixelText><View style={{flex:1}}/>{right}
    {!locked&&<FoldToggle open={open} onPress={onToggle}/>}
  </View>;
  // 카드 어디를 눌러도 묶음 화면을 연다. 머리줄의 [>]도 눌리는 것처럼 보이므로 (2026-10-09)
  if(locked) return <Pressable accessibilityRole="button" accessibilityLabel={`${pack.label} 묶음 미리 보기`} onPress={onOpenPack}>
    <PixelFrame variant="button" fill={c.secondary} contentStyle={{padding:14,gap:10}}>
      {head}
      <View ref={row} onLayout={onLayout}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
          {pack.stickers.slice(0,fit).map(id=><View key={id} style={{opacity:retro.opacity.disabled}}><StickerGlyph id={id} size={48}/></View>)}
          {more>0&&<PixelText style={{fontSize:16,color:c.buttonText}}>{`+${more}`}</PixelText>}
        </View>
        <View style={{position:'absolute',left:-4,right:-4,top:-4,bottom:-4,alignItems:'center',justifyContent:'center'}}>
          <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:c.secondary,opacity:0.7}}/>
          <PixelFrame variant="selection" fill={c.ink} contentStyle={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:4}}>
            <ActionSymbol name="lock" size={14} color={c.lcd}/><PixelText style={{color:c.lcd,fontSize:15}}>눌러서 미리 보기</PixelText>
          </PixelFrame>
        </View>
      </View>
    </PixelFrame>
  </Pressable>;
  const shown=open?pack.stickers:pack.stickers.slice(0,fit);
  const cell=(id:StickerId)=>selectable
    ?<StickerChoice id={id} selected={id===selected} onPress={()=>onSelect(id)}/>
    :<View accessibilityLabel={stickerLabel(id)} style={{width:ROW_CELL,height:52,alignItems:'center',justifyContent:'center'}}><StickerGlyph id={id} size={48}/></View>;
  const group=selectable?'radiogroup' as const:undefined;
  return <PixelFrame variant="button" fill={c.secondary} contentStyle={{padding:14,gap:10}}>
    {head}
    <View ref={row} onLayout={onLayout}>
    {open
      ?<View accessibilityRole={group} style={{flexDirection:'row',flexWrap:'wrap',rowGap:14}}>{shown.map(id=><View key={id} style={{width:'20%',alignItems:'center'}}>{cell(id)}</View>)}</View>
      :<View accessibilityRole={group} style={{flexDirection:'row',alignItems:'center',gap:ROW_GAP}}>{shown.map(id=><React.Fragment key={id}>{cell(id)}</React.Fragment>)}{more>0&&<PixelText style={{fontSize:16,color:c.buttonText}}>{`+${more}`}</PixelText>}</View>}
    </View>
  </PixelFrame>;
}

/** 묶음 하나를 접거나 펼친다. 다른 묶음은 그대로 둔다 (2026-10-09, 블럭마다 따로). */
export function togglePack(open:readonly ColorStickerPackId[],id:ColorStickerPackId):ColorStickerPackId[] {
  return open.includes(id)?open.filter(p=>p!==id):[...open,id];
}

/** 「기본 스티커」: 새 목표·목표 설정의 [바꾸기]에서 연다 (PRD 4.12). 가진 묶음·체험 중이 위, 잠긴 묶음이 아래. */
export function StickerChooserScreen({packs,mine,onChangeMine,selected,onSelect,openPacks,onToggle,reward,onOpenPack,onDone,onBack}:{packs:readonly PackView[];mine:boolean;onChangeMine:(mine:boolean)=>void;selected:StickerId;onSelect:(id:StickerId)=>void;/** 펼친 묶음들. 처음에는 지금 고른 스티커가 든 묶음 하나 */openPacks:readonly ColorStickerPackId[];onToggle:(id:ColorStickerPackId)=>void;reward:{days:number;goal:number};onOpenPack:(id:ColorStickerPackId)=>void;onDone:()=>void;onBack:()=>void}) {
  const order=[...packs.filter(p=>p.state!=='locked'),...(mine?[]:packs.filter(p=>p.state==='locked'))];
  const rewardReady=reward.days>=reward.goal;
  return <View style={{flex:1}}>
    <RetroScreen style={{gap:14}} headerGap={14} header={<View style={{gap:24}}><ScreenHeader title="기본 스티커" onBack={onBack}/><PackViewSwitch mine={mine} onChange={onChangeMine}/></View>}>
      <RewardProgress days={reward.days} goal={reward.goal}/>
      {order.map(p=><PackCard key={p.id} pack={p} open={openPacks.includes(p.id)} selected={selected} rewardReady={rewardReady} onToggle={()=>onToggle(p.id)} onSelect={onSelect} onOpenPack={()=>onOpenPack(p.id)}/>)}
    </RetroScreen>
    <PickedStickerBar sticker={selected} onDone={onDone}/>
  </View>;
}

/** 묶음 화면 (PRD 4.12). 스티커 영역은 고르기 카드와 같은 모양, 「판에 붙이면」은 6칸에 5개. */
export function PackScreen({pack,sample,adFree,reward,onBuy,onWatchAd,onTrial,onBack,busy}:{pack:PackView;/** 판 예시로 붙일 서로 다른 스티커 5개 */sample:readonly StickerId[];/** 광고 제거를 샀으면 하루 체험이 없다 (2026-10-08) */adFree:boolean;reward:{days:number;goal:number};onBuy:()=>void;onWatchAd:()=>void;onTrial:()=>void;onBack:()=>void;/** 결제·광고를 기다리는 중: 누른 버튼은 로딩 점, 나머지는 누를 수 없다 */busy?:'buy'|'ad'}) {
  const ready=reward.days>=reward.goal;
  return <RetroScreen style={{gap:14}} header={<ScreenHeader title={`${pack.label} 묶음`} onBack={onBack}/>}>
    <PixelFrame variant="button" fill={c.secondary} contentStyle={{padding:14}}>
      <View style={{flexDirection:'row',flexWrap:'wrap',rowGap:14}}>{pack.stickers.map(id=><View key={id} style={{width:'20%',alignItems:'center'}}><StickerGlyph id={id} size={48}/></View>)}</View>
    </PixelFrame>
    <PixelPanel title="판에 붙이면"><View style={{paddingTop:12}}><StickerGrid>
      {[0,1,2,3,4,5].map(i=>sample[i]
        ?<PixelFrame key={i} variant="slot" style={{height:'100%'}} contentStyle={{height:'100%',alignItems:'center',justifyContent:'center'}}><StickerGlyph id={sample[i]} size={48}/></PixelFrame>
        :<StickerSlot key={i} number={i+1} width="100%" height="100%" state="empty"/>)}
    </StickerGrid></View></PixelPanel>
    <View style={{gap:10}}>
      <PixelButton label={pack.price?`${pack.price}에 열기`:'묶음 열기'} icon={<ActionSymbol name="lock" size={16} color={c.buttonText}/>} loading={busy==='buy'} disabled={busy==='ad'} onPress={onBuy}/>
      {!adFree&&<PixelButton label="광고 보고 하루 써 보기" variant="secondary" icon={<ActionSymbol name="play" size={16} color={c.buttonText}/>} loading={busy==='ad'} disabled={busy==='buy'} onPress={onWatchAd}/>}
      <PixelButton label="3일 무료로 써 보기" variant="secondary" disabled={!ready||busy!==undefined} onPress={onTrial}/>
      {!ready&&<PixelText variant="caption" style={[caption,{textAlign:'center'}]}>{`스티커 붙인 날이 ${reward.goal-reward.days}일 더 모이면 써 볼 수 있어요 (${reward.days}/${reward.goal}일)`}</PixelText>}
    </View>
  </RetroScreen>;
}

/** 화면 위에 PixelDialogModal로 띄운다. 결제 팝업은 Apple·Google이 그린다. */
export const stickerShopDialogs={
  /**
   * 사기 전 확인 (2026-10-13 환불 안내 시안 2차 3안). 쓰기 시작하면 환불이 어려울 수 있음을 사기 전에 알린다(약관 11조).
   * 제목은 무엇을 사는지, 설명 첫 줄은 얻는 것, 둘째 줄이 환불. 단어 중간에서 줄이 바뀌지 않게 줄을 직접 끊는다.
   */
  confirmBuy:(label:string,count:number,price?:string)=>({title:`${label} 묶음을 열까요?`,description:`스티커 ${count}개를 바로 붙일 수 있어요.\n고른 뒤에는 환불이 어려울 수 있어요.`,primaryLabel:price?`${price}에 열기`:'열기',secondaryLabel:'취소'}),
  confirmAdFree:{title:'광고를 없앨까요?',description:'목표 화면 아래 광고가 사라져요.\n산 뒤에는 환불이 어려울 수 있어요.',primaryLabel:'광고 없애기',secondaryLabel:'취소'},
  bought:(label:string)=>({title:`${label} 묶음을 열었어요`,description:'기본 스티커로 쓸 그림을 골라 주세요.',primaryLabel:'확인',single:true}),
  /** endLabel 예: '내일 밤 11:00' — 광고를 다 본 때부터 24시간 */
  adTrialStarted:(endLabel:string)=>({title:'하루 동안 써 볼 수 있어요',description:`${endLabel}까지 쓸 수 있어요.`,primaryLabel:'확인',single:true}),
  trialEnded:(kind:'3일'|'하루')=>({title:`${kind} 체험이 끝났어요`,description:'붙인 스티커는 그대로 남아 있어요.',primaryLabel:'묶음 열기',secondaryLabel:'다른 스티커'}),
  restoreDone:(names:readonly string[])=>({title:'구매 내역을 불러왔어요',description:names.join(', '),primaryLabel:'확인',single:true}),
  restoreNone:{title:'이 계정으로 구매 내역이 없어요',description:'구매한 스토어 계정으로 로그인했는지 확인해 주세요.',primaryLabel:'확인',single:true},
  /** 실패 (2026-10-13 시안 2판 — 제목은 결과, 설명은 할 일). 결제 창을 닫은 취소에는 띄우지 않는다. */
  buyFailed:{title:'묶음을 열지 못했어요',description:'잠시 후 다시 시도해 주세요.',primaryLabel:'확인',single:true},
  adFreeFailed:{title:'광고를 없애지 못했어요',description:'잠시 후 다시 시도해 주세요.',primaryLabel:'확인',single:true},
  restoreFailed:{title:'구매 내역을 못 불러왔어요',description:'인터넷 연결을 확인하고 다시 시도해 주세요.',primaryLabel:'확인',single:true},
  /** 보호자 승인(구입 승인 요청·가족 결제)을 기다릴 때 */
  purchasePending:{title:'보호자 승인을 기다려요',description:'승인되면 앱 설정에서 [구매 복원]을 눌러 주세요.',primaryLabel:'확인',single:true},
  adUnavailable:{title:'지금은 광고를 볼 수 없어요',description:'잠시 후 다시 시도해 주세요.',primaryLabel:'확인',single:true},
} as const;

/** 앱 설정 「구매」 블럭 (PRD 4.9). 구매 복원은 앱 설정에만 두고, 사기 전·후 같은 자리다. */
export function PurchasePanel({adFree,price,onRemoveAds,onRestore,busy}:{adFree:boolean;/** 스토어에서 받아 온 광고 제거 가격 글자. 못 받아 왔으면 없다 */price?:string;onRemoveAds:()=>void;onRestore:()=>void;/** 결제·복원을 기다리는 중: 누른 버튼은 로딩 점, 다른 버튼은 누를 수 없다 */busy?:'adFree'|'restore'}) {
  return <PixelPanel title="구매" contentStyle={{gap:0}}>
    {adFree?<InfoRow label="광고 제거" value="없이 쓰는 중"/>
      :<View style={{gap:12,paddingVertical:12}}>
        <PixelText style={{fontSize:18,lineHeight:24}}>광고 제거</PixelText>
        <PixelText>목표 화면 아래 광고를 없애요. 한 번 사면 계속 쓸 수 있어요.</PixelText>
        <PixelButton label={price?`${price}에 광고 없애기`:'광고 없애기'} loading={busy==='adFree'} disabled={busy==='restore'} onPress={onRemoveAds}/>
      </View>}
    <View style={{borderTopWidth:retro.shape.cellBorder,borderColor:c.ink}}/>
    <View style={{gap:8,paddingVertical:12}}>
      <PixelButton label="구매 복원" variant="secondary" loading={busy==='restore'} disabled={busy==='adFree'} onPress={onRestore}/>
      <PixelText variant="caption" style={[caption,{textAlign:'center'}]}>구매한 스티커 묶음과 광고 제거를 되살려요</PixelText>
    </View>
  </PixelPanel>;
}
