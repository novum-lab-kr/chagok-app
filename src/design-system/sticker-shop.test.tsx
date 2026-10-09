import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {FoldToggle,PackCard,PackViewSwitch,PickedStickerBar,RewardProgress,StickerChoice,StickerChooserScreen,colorPack,PackScreen,PurchasePanel,stickerShopDialogs,togglePack} from './sticker-shop';
import {InfoRow} from './composition-controls';
afterEach(cleanup);
describe('스티커 묶음 부품',()=>{
  it('보기 전환은 고른 쪽만 선택 상태이고 누르면 바뀐 값을 알린다',()=>{
    const change=vi.fn();render(<PackViewSwitch mine={false} onChange={change}/>);
    expect(screen.getByRole('tab',{name:'모든 묶음'}).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab',{name:'내 스티커'}).getAttribute('aria-selected')).toBe('false');
    fireEvent.click(screen.getByRole('tab',{name:'내 스티커'}));expect(change).toHaveBeenCalledWith(true);
  });
  it('접기 버튼은 상태에 맞는 이름을 갖는다',()=>{
    const press=vi.fn();const {rerender}=render(<FoldToggle open={false} onPress={press}/>);
    fireEvent.click(screen.getByRole('button',{name:'펼치기'}));expect(press).toHaveBeenCalledTimes(1);
    rerender(<FoldToggle open onPress={press}/>);expect(screen.getByRole('button',{name:'접기'})).toBeTruthy();
  });
  it('스티커 칸은 이름으로 읽히고 고른 칸만 선택 상태다',()=>{
    const press=vi.fn();render(<><StickerChoice id="animals.dog" selected onPress={press}/><StickerChoice id="animals.cat" onPress={press}/></>);
    expect(screen.getByRole('radio',{name:'강아지'}).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio',{name:'고양이'}));expect(press).toHaveBeenCalledTimes(1);
  });
  it('붙인 날 안내는 남은 날과 진행을, 다 모이면 고르라는 말을 보인다',()=>{
    const {rerender}=render(<RewardProgress days={5} goal={7}/>);
    expect(screen.getByText(/스티커 붙인 날이 2일 더 모이면/)).toBeTruthy();
    expect(screen.getByText('5/7')).toBeTruthy();
    rerender(<RewardProgress days={7} goal={7}/>);
    expect(screen.getByText(/묶음 하나를 골라/)).toBeTruthy();
    expect(screen.queryByText('5/7')).toBeNull();
  });
  it('고른 스티커 줄은 이름과 [선택 완료]를 보인다',()=>{
    const done=vi.fn();render(<PickedStickerBar sticker="basic.book" onDone={done}/>);
    expect(screen.getByText('책')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'선택 완료'}));expect(done).toHaveBeenCalled();
  });
  it('항목 줄은 이름과 값을 한 줄에 보인다',()=>{
    render(<InfoRow label="연결한 계정" value="Apple"/>);
    expect(screen.getByText('연결한 계정')).toBeTruthy();expect(screen.getByText('Apple')).toBeTruthy();
  });
});
describe('「기본 스티커」 화면',()=>{
  const packs=[colorPack('basic','free'),colorPack('animals','locked'),colorPack('snack','owned'),colorPack('weather','trial','24시간 남음')];
  const base={packs,mine:false,onChangeMine:vi.fn(),selected:'basic.book' as const,onSelect:vi.fn(),openPacks:['basic'] as const,onToggle:vi.fn(),reward:{days:5,goal:7},onOpenPack:vi.fn(),onDone:vi.fn(),onBack:vi.fn()};
  const titles=()=>screen.getAllByRole('heading').map(h=>h.textContent).filter(t=>t!=='기본 스티커');
  it('가진 묶음과 체험 중 묶음이 위, 잠긴 묶음이 아래다',()=>{
    render(<StickerChooserScreen {...base}/>);
    expect(titles()).toEqual(['기본','간식','날씨·계절','동물']);
  });
  it('「내 스티커」에는 잠긴 묶음이 없고 체험 중 묶음은 있다',()=>{
    render(<StickerChooserScreen {...base} mine/>);
    expect(titles()).toContain('날씨·계절');expect(titles()).not.toContain('동물');
  });
  it('펼친 묶음은 10개를, 접힌 묶음은 5개와 +n을 보이고 접힌 줄에서도 고른다',()=>{
    const pack=colorPack('snack','owned');const select=vi.fn();
    render(<PackCard pack={pack} open={false} onToggle={vi.fn()} onSelect={select} onOpenPack={vi.fn()}/>);
    expect(screen.getAllByRole('radio')).toHaveLength(5);expect(screen.getByText('+5')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('radio')[0]);expect(select).toHaveBeenCalledWith(pack.stickers[0]);
    cleanup();
    render(<PackCard pack={pack} open onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={vi.fn()}/>);
    expect(screen.getAllByRole('radio')).toHaveLength(10);
  });
  it('접힌 줄의 5개 안에 고른 스티커가 있으면 선택 표시가 보인다',()=>{
    const pack=colorPack('snack','owned');
    render(<PackCard pack={pack} open={false} selected={pack.stickers[2]} onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={vi.fn()}/>);
    expect(screen.getAllByRole('radio')[2].getAttribute('aria-checked')).toBe('true');
  });
  it('잠긴 묶음은 고를 수 없고 가림막을 누르면 묶음 화면을 연다. 배지는 가격, 붙인 날이 차면 3일 무료',()=>{
    const open=vi.fn();const {rerender}=render(<PackCard pack={colorPack('animals','locked')} open={false} onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={open}/>);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText('2,200원')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'동물 묶음 미리 보기'}));expect(open).toHaveBeenCalled();
    rerender(<PackCard pack={colorPack('animals','locked')} open={false} rewardReady onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={open}/>);
    expect(screen.getByText('3일 무료')).toBeTruthy();
  });
  it('여러 묶음을 함께 펼칠 수 있다',()=>{
    render(<StickerChooserScreen {...base} openPacks={['basic','snack']}/>);
    // 기본 6종 + 간식 10종 펼침, 날씨·계절은 접혀 5개
    expect(screen.getAllByRole('radio')).toHaveLength(colorPack('basic','free').stickers.length+colorPack('snack','owned').stickers.length+5);
  });
  it('펼친 묶음을 다시 누르면 접히고, 접힌 묶음을 누르면 펼쳐진다. 다른 묶음은 그대로다',()=>{
    expect(togglePack(['basic'],'snack')).toEqual(['basic','snack']);
    expect(togglePack(['basic','snack'],'basic')).toEqual(['snack']);
  });
  it('잠긴 묶음은 머리줄([2,200원]·[>])을 눌러도 묶음 화면을 연다',()=>{
    const open=vi.fn();render(<PackCard pack={colorPack('animals','locked')} open={false} onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={open}/>);
    fireEvent.click(screen.getByText('2,200원'));expect(open).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('동물'));expect(open).toHaveBeenCalledTimes(2);
  });
  it('체험 중 묶음은 남은 시간 배지를 단다',()=>{
    render(<PackCard pack={colorPack('weather','trial','24시간 남음')} open onToggle={vi.fn()} onSelect={vi.fn()} onOpenPack={vi.fn()}/>);
    expect(screen.getByText('24시간 남음')).toBeTruthy();
  });
});
describe('묶음 화면',()=>{
  const pack=colorPack('animals','locked');
  const sample=[0,4,7,2,9].map(i=>pack.stickers[i]);
  const base={pack,sample,adFree:false,reward:{days:5,goal:7},onBuy:vi.fn(),onWatchAd:vi.fn(),onTrial:vi.fn(),onBack:vi.fn()};
  const actions=()=>screen.getAllByRole('button').map(b=>b.getAttribute('aria-label')).filter(l=>l==='2,200원에 열기'||l==='광고 보고 하루 써 보기'||l==='3일 무료로 써 보기');
  it('버튼은 사기 → 광고 → 3일 무료 순서이고, 판 예시는 6칸에 5개다',()=>{
    render(<PackScreen {...base}/>);
    expect(actions()).toEqual(['2,200원에 열기','광고 보고 하루 써 보기','3일 무료로 써 보기']);
    expect(screen.getByText('6')).toBeTruthy();
  });
  it('붙인 날이 모자라면 3일 무료는 누를 수 없고 아래에 남은 날을 적는다',()=>{
    const trial=vi.fn();render(<PackScreen {...base} onTrial={trial}/>);
    fireEvent.click(screen.getByRole('button',{name:'3일 무료로 써 보기'}));expect(trial).not.toHaveBeenCalled();
    expect(screen.getByText('스티커 붙인 날이 2일 더 모이면 써 볼 수 있어요 (5/7일)')).toBeTruthy();
  });
  it('붙인 날이 차면 3일 무료를 누를 수 있고 진행 글자는 없다',()=>{
    const trial=vi.fn();render(<PackScreen {...base} reward={{days:7,goal:7}} onTrial={trial}/>);
    fireEvent.click(screen.getByRole('button',{name:'3일 무료로 써 보기'}));expect(trial).toHaveBeenCalled();
    expect(screen.queryByText(/더 모이면/)).toBeNull();
  });
  it('광고 제거를 산 사람에게는 광고 버튼이 없다',()=>{
    render(<PackScreen {...base} adFree/>);
    expect(actions()).toEqual(['2,200원에 열기','3일 무료로 써 보기']);
  });
  it('다이얼로그 문구는 확정 시안 그대로다',()=>{
    expect(stickerShopDialogs.bought('동물')).toMatchObject({title:'동물 묶음을 열었어요',description:'기본 스티커로 쓸 그림을 골라 주세요.'});
    expect(stickerShopDialogs.adTrialStarted('내일 밤 11:00')).toMatchObject({title:'하루 동안 써 볼 수 있어요',description:'내일 밤 11:00까지 쓸 수 있어요.'});
    expect(stickerShopDialogs.trialEnded('3일')).toMatchObject({title:'3일 체험이 끝났어요',description:'붙인 스티커는 그대로 남아 있어요.',primaryLabel:'묶음 열기',secondaryLabel:'다른 스티커'});
    expect(stickerShopDialogs.trialEnded('하루').title).toBe('하루 체험이 끝났어요');
    expect(stickerShopDialogs.restoreDone(['동물 묶음','간식 묶음','광고 제거']).description).toBe('동물 묶음, 간식 묶음, 광고 제거');
    expect(stickerShopDialogs.restoreNone).toMatchObject({title:'이 계정으로 구매 내역이 없어요',description:'구매한 스토어 계정으로 로그인했는지 확인해 주세요.'});
  });
});
describe('앱 설정 「구매」 블럭',()=>{
  it('사기 전에는 광고 제거 설명과 버튼, 늘 구매 복원 버튼과 설명이 있다',()=>{
    const remove=vi.fn(),restore=vi.fn();render(<PurchasePanel adFree={false} onRemoveAds={remove} onRestore={restore}/>);
    expect(screen.getByText('홈 아래 광고를 없애요. 한 번 사면 계속 쓸 수 있어요.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'5,500원에 광고 없애기'}));expect(remove).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'구매 복원'}));expect(restore).toHaveBeenCalled();
    expect(screen.getByText('구매한 스티커 묶음과 광고 제거를 되살려요')).toBeTruthy();
  });
  it('산 뒤에는 「광고 제거 · 없이 쓰는 중」이고 구매 복원은 같은 자리에 남는다',()=>{
    render(<PurchasePanel adFree onRemoveAds={vi.fn()} onRestore={vi.fn()}/>);
    expect(screen.getByText('없이 쓰는 중')).toBeTruthy();
    expect(screen.queryByRole('button',{name:'5,500원에 광고 없애기'})).toBeNull();
    expect(screen.getByRole('button',{name:'구매 복원'})).toBeTruthy();
  });
});
