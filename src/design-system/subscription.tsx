import React from 'react';
import {Platform,Pressable,View,type TextStyle} from 'react-native';
import {retro} from './tokens';
import {touchSlop} from './touch';
import {PixelBadge,PixelButton,PixelFrame,PixelPanel,PixelText} from './components';
import {RetroScreen,ScreenHeader} from './composition-controls';
import {t} from '../i18n';
import type {RefundStore} from '../i18n/ko';
import {SUPPORT_EMAIL} from '../support/contactMail';

const c=retro.color;
const small={fontSize:13,lineHeight:19,color:c.ink};
/** 긴 안내문이 낱말 중간에서 끊기지 않게 한다. iOS는 hangul-word, 웹(Storybook)은 keep-all */
const wordWrap=Platform.OS==='web'?({wordBreak:'keep-all'} as unknown as TextStyle):undefined;
const refundStore=():RefundStore=>Platform.OS==='android'?'google':'apple';

/** 요금 하나. 가격과 날짜는 앱이 스토어 값으로 만들어 넘긴다. */
export type SubscriptionPlanView={
  /** 실제 결제 금액. 화면에서 가장 크게 보인다(Apple 구독 안내) */
  price:string;
  /** 연 구독만: 할인율과 1년에 아끼는 금액. 한 달로 나눈 금액은 보이지 않는다 (2026-11-02 사용자) */
  savePercent?:number;saveAmount?:string;
  /** 이번 기간(예: '2026.11.02 ~ 2026.12.01')과 다음 결제일 */
  range:string;next:string;
};
export type SubscriptionPlan='month'|'year';

function Row({label,value,sub}:{label:string;value:string;sub?:string}){
  return <View style={{flexDirection:'row',justifyContent:'space-between',gap:12}}>
    <PixelText style={small}>{label}</PixelText>
    <View style={{alignItems:'flex-end',flexShrink:1}}><PixelText style={small}>{value}</PixelText>{sub?<PixelText style={small}>{sub}</PixelText>:null}</View>
  </View>;
}

/** 요금 카드. 월과 연은 같은 모양이고 미리 골라 둔 것이 없다(전자상거래법 21조의2 1항 3호). */
export function SubscriptionPlanCard({plan,view,busy,disabled,onPress}:{plan:SubscriptionPlan;view:SubscriptionPlanView;busy?:boolean;disabled?:boolean;onPress:()=>void}){
  const year=plan==='year';
  return <PixelFrame variant="button" fill={c.secondary} contentStyle={{padding:14,gap:10}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
      <PixelText style={{fontSize:18,lineHeight:24}}>{t(year?'sub.yearly':'sub.monthly')}</PixelText>
      {year&&view.savePercent?<PixelBadge label={t('sub.save',view.savePercent)} tone="primary"/>:null}
    </View>
    <PixelText style={{fontSize:32,lineHeight:40}}>{view.price}</PixelText>
    {year&&view.saveAmount?<PixelText style={small}>{t('sub.saveAmount',view.saveAmount)}</PixelText>:null}
    <View style={{gap:4}}>
      <Row label={t('sub.period')} value={t(year?'sub.oneYear':'sub.oneMonth')} sub={`(${view.range})`}/>
      <Row label={t('sub.nextBilling')} value={view.next}/>
    </View>
    <PixelButton label={t(year?'sub.subscribeYearly':'sub.subscribeMonthly')} loading={busy} disabled={disabled} onPress={onPress}/>
  </PixelFrame>;
}

function LinkText({label,onPress}:{label:string;onPress:()=>void}){
  return <Pressable accessibilityRole="link" hitSlop={touchSlop({height:small.lineHeight})} onPress={onPress}><PixelText style={[small,{textDecorationLine:'underline'}]}>{label}</PixelText></Pressable>;
}

/**
 * 구독 화면 (2026-11-02 구독 흐름 시안 1판 확정). 앱 설정의 [구독 보기], 묶음 화면의 [구독하고 모든 묶음 열기],
 * 목표가 5개일 때 목표 탭 [+]에서 연다. [+]에서 열면 맨 위 안내를 목표 한도 문구로 바꿔 왜 열렸는지 알린다(시안 C안 보완).
 * 결제 전 고지는 이 화면에 모두 두고 따로 확인 창을 띄우지 않는다(Athena 구독 설계 D4).
 */
export function SubscriptionScreen({month,year,goalLimit,busy,onSubscribe,onRestore,onTerms,onPrivacy,onBack}:{month:SubscriptionPlanView;year:SubscriptionPlanView;/** 목표 탭 [+]에서 열었을 때 그 한도 */goalLimit?:number;busy?:SubscriptionPlan|'restore';onSubscribe:(plan:SubscriptionPlan)=>void;onRestore:()=>void;onTerms:()=>void;onPrivacy:()=>void;onBack:()=>void}){
  const notice=[t('legal.subscriptionAutoRenew',refundStore()),t('sub.keepPurchases'),t('legal.subscriptionNoRefund',refundStore(),SUPPORT_EMAIL),t('legal.minorCancel').replace(/\n/g,' ')];
  return <RetroScreen style={{gap:14}} header={<ScreenHeader title={t('sub.title')} onBack={onBack}/>}>
    <PixelPanel><PixelText lineBreakStrategyIOS="hangul-word" style={[{paddingVertical:6},wordWrap]}>{goalLimit?t('sub.introGoalLimit',goalLimit):t('sub.intro')}</PixelText></PixelPanel>
    <SubscriptionPlanCard plan="month" view={month} busy={busy==='month'} disabled={busy!==undefined&&busy!=='month'} onPress={()=>onSubscribe('month')}/>
    <SubscriptionPlanCard plan="year" view={year} busy={busy==='year'} disabled={busy!==undefined&&busy!=='year'} onPress={()=>onSubscribe('year')}/>
    <View style={{gap:8}}>{notice.map(text=><PixelText key={text} lineBreakStrategyIOS="hangul-word" style={[small,wordWrap]}>{text}</PixelText>)}</View>
    <PixelButton label={t('shop.restore')} variant="secondary" loading={busy==='restore'} disabled={busy!==undefined&&busy!=='restore'} onPress={onRestore}/>
    <View style={{flexDirection:'row',justifyContent:'center',gap:24,paddingBottom:12}}>
      <LinkText label={t('policy.terms')} onPress={onTerms}/>
      <LinkText label={t('policy.privacy')} onPress={onPrivacy}/>
    </View>
  </RetroScreen>;
}

/** 앱 설정 「구매」의 구독 칸. 해지 예약 중이면 다음 결제일 대신 끝나는 날을 보인다. */
export type SubscriptionSummary={state:'none'}|{state:'active'|'cancelling';plan:SubscriptionPlan;date:string};
export function SubscriptionRow({summary,onSubscribe,onManage}:{summary:SubscriptionSummary;onSubscribe:()=>void;onManage:()=>void}){
  return <View style={{gap:12,paddingVertical:12,borderBottomWidth:retro.shape.cellBorder,borderColor:c.ink}}>
    {summary.state==='none'?<>
      <PixelText style={{fontSize:18,lineHeight:24}}>{t('sub.row')}</PixelText>
      <PixelText>{t('sub.rowDescription')}</PixelText>
      <PixelButton label={t('sub.view')} onPress={onSubscribe}/>
    </>:<>
      <PixelText style={{fontSize:18,lineHeight:24}}>{t(summary.plan==='year'?'sub.yearly':'sub.monthly')}</PixelText>
      <Row label={t('sub.status')} value={t(summary.state==='active'?'sub.active':'sub.cancelling')}/>
      <Row label={t(summary.state==='active'?'sub.nextBilling':'sub.endsOn')} value={summary.date}/>
      <PixelButton label={t('sub.manage')} variant="secondary" onPress={onManage}/>
    </>}
  </View>;
}
