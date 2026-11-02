import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {SubscriptionScreen,type SubscriptionPlanView} from './subscription';
import {PackScreen,PurchasePanel,colorPack,stickerShopDialogs} from './sticker-shop';
import {setLanguage,t} from '../i18n';
import {SUPPORT_EMAIL} from '../support/contactMail';
afterEach(cleanup);

const month:SubscriptionPlanView={price:'4,900원',range:'2026.11.02 ~ 2026.12.01',next:'2026년 12월 2일'};
const year:SubscriptionPlanView={price:'24,900원',perMonth:'2,075원',savePercent:57,saveAmount:'33,900원',range:'2026.11.02 ~ 2027.11.01',next:'2027년 11월 2일'};
const open=(props:Partial<React.ComponentProps<typeof SubscriptionScreen>>={})=>{
  const handlers={onSubscribe:vi.fn(),onRestore:vi.fn(),onTerms:vi.fn(),onPrivacy:vi.fn(),onBack:vi.fn()};
  render(<SubscriptionScreen month={month} year={year} {...handlers} {...props}/>);
  return handlers;
};

describe('구독 화면',()=>{
  it('두 요금과 결제 전에 알릴 것을 모두 보이고, 고른 요금으로 구독한다',()=>{
    const h=open();
    for (const text of ['4,900원','24,900원','57% 저렴','월 2,075원','월 구독보다 1년에 33,900원 저렴','(2026.11.02 ~ 2026.12.01)','2027년 11월 2일']) expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByText(t('legal.subscriptionAutoRenew','apple'))).toBeTruthy();
    expect(screen.getByText(t('legal.subscriptionNoRefund','apple',SUPPORT_EMAIL))).toBeTruthy();
    expect(screen.getByText(t('sub.keepPurchases'))).toBeTruthy();
    fireEvent.click(screen.getByText('연 구독하기'));
    expect(h.onSubscribe).toHaveBeenCalledWith('year');
    fireEvent.click(screen.getByText('구매 복원'));
    fireEvent.click(screen.getByText('이용약관'));
    fireEvent.click(screen.getByText('개인정보 처리방침'));
    expect([h.onRestore,h.onTerms,h.onPrivacy].every(f=>f.mock.calls.length===1)).toBe(true);
  });
  it('목표 탭 [+]에서 열면 맨 위 안내가 목표 한도로 바뀐다',()=>{
    open({goalLimit:5});
    expect(screen.getByText('목표는 5개까지 만들 수 있어요. 구독하면 개수 제한 없이 만들 수 있어요.')).toBeTruthy();
    expect(screen.queryByText(t('sub.intro'))).toBeNull();
  });
  it('영어에서도 자동 갱신과 환불 안내가 나온다',()=>{
    setLanguage('en');
    try {
      open();
      expect(screen.getByText('Subscribe yearly')).toBeTruthy();
      expect(screen.getByText(t('legal.subscriptionAutoRenew','apple'))).toBeTruthy();
    } finally {
      setLanguage('ko');
    }
  });
});

describe('구독이 들어간 기존 화면',()=>{
  it('묶음 화면은 onSubscribe가 있을 때만 구독 줄을 그린다',()=>{
    const pack={...colorPack('christmas_normal','locked'),price:'2,200원'};
    const base={pack,sample:pack.stickers.slice(0,5),adFree:false,reward:{days:5,goal:7},onBuy:vi.fn(),onWatchAd:vi.fn(),onTrial:vi.fn(),onBack:vi.fn()};
    const {unmount}=render(<PackScreen {...base}/>);
    expect(screen.queryByText('구독하고 모든 묶음 열기')).toBeNull();
    unmount();
    const onSubscribe=vi.fn();
    render(<PackScreen {...base} onSubscribe={onSubscribe}/>);
    fireEvent.click(screen.getByText('구독하고 모든 묶음 열기'));
    expect(onSubscribe).toHaveBeenCalled();
  });
  it('구매 패널: 구독 전에는 [구독 보기], 구독 중에는 광고 제거 칸을 숨기고 [구독 관리]',()=>{
    const {unmount}=render(<PurchasePanel adFree={false} price="5,500원" onRemoveAds={vi.fn()} onRestore={vi.fn()} subscription={{state:'none'}}/>);
    expect(screen.getByText('구독 보기')).toBeTruthy();
    expect(screen.getByText('5,500원에 광고 없애기')).toBeTruthy();
    expect(screen.getByText('구독과 구매한 스티커 묶음, 광고 제거를 되살려요')).toBeTruthy();
    unmount();
    const onManage=vi.fn();
    render(<PurchasePanel adFree={false} price="5,500원" onRemoveAds={vi.fn()} onRestore={vi.fn()} subscription={{state:'cancelling',plan:'month',date:'2026년 12월 1일'}} onManageSubscription={onManage}/>);
    expect(screen.queryByText('5,500원에 광고 없애기')).toBeNull();
    expect(screen.getByText('해지 예약됨')).toBeTruthy();
    expect(screen.getByText('끝나는 날')).toBeTruthy();
    fireEvent.click(screen.getByText('구독 관리'));
    expect(onManage).toHaveBeenCalled();
  });
  it('구독이 끝난 뒤 창은 체험이 끝났을 때와 같은 버튼이다',()=>{
    expect(stickerShopDialogs.subscriptionEnded).toMatchObject({title:'구독이 끝났어요',description:'붙인 스티커는 그대로 남아 있어요.',primaryLabel:'묶음 열기',secondaryLabel:'다른 스티커'});
  });
});
