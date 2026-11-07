import React, {useCallback, useState} from 'react';
import {View} from 'react-native';
import {t} from '../i18n';
import {PixelButton, PixelText} from './components';
import {PixelLoadingIndicator, RetroScreen} from './composition-controls';
import {Mascot} from './mascot';
import {retro} from './tokens';

/**
 * 화면을 보여 주지 못할 때의 안내 (2026-10-10 시안 B안, PRD 7절). 차곡이 갸웃 + 문구 + [다시 시도] [홈으로].
 * 문구는 무엇을 못 보여 줬는지에 따라 고른다. 어느 것에도 맞지 않으면 `screen`.
 */
export type ScreenFailureKind='records'|'goals'|'stickers'|'subscription'|'invite'|'screen';
export const screenFailureCopy=(kind:ScreenFailureKind):{title:string;detail:string}=>({
  records:{title:t('loadFailed.records'),detail:t('loadFailed.tryLater')},
  goals:{title:t('loadFailed.goals'),detail:t('loadFailed.tryLater')},
  stickers:{title:t('loadFailed.stickers'),detail:t('loadFailed.tryLater')},
  // 스토어에서 구독 상품을 받지 못했다. 앱을 다시 켜도 나아지지 않으니 「앱을 껐다 켜」 대신 잠시 뒤를 권한다 (2026-11-04)
  subscription:{title:t('loadFailed.subscription'),detail:t('loadFailed.tryLater')},
  // 초대 미리보기를 받지 못했다(연결, 잠시 막힘). 앱을 다시 켜도 나아지지 않으니 잠시 뒤를 권한다 (2026-11-06)
  invite:{title:t('loadFailed.invite'),detail:t('loadFailed.tryLater')},
  screen:{title:t('loadFailed.screen'),detail:t('loadFailed.restartApp')},
})[kind];

/** 안내 본문. 화면 가운데에 놓는다. `onHome`이 없으면(홈 화면) [홈으로]를 두지 않는다. */
export function ScreenFailed({kind='screen',onRetry,onHome}:{kind?:ScreenFailureKind;onRetry:()=>void;onHome?:()=>void}) {
  const copy=screenFailureCopy(kind);
  return <View accessibilityRole="alert" style={{width:'100%',gap:20}}>
    <View style={{alignItems:'center',gap:12}}>
      <Mascot pose="curious" size={96}/>
      <PixelText variant="title" style={{fontSize:20,lineHeight:28,textAlign:'center'}}>{copy.title}</PixelText>
      <PixelText variant="caption" style={{textAlign:'center',color:retro.color.buttonText}}>{copy.detail}</PixelText>
    </View>
    <View style={{gap:10}}>
      <PixelButton label={t('common.retry')} onPress={onRetry}/>
      {onHome&&<PixelButton label={t('common.goHome')} variant="secondary" onPress={onHome}/>}
    </View>
  </View>;
}

/** 화면 전체: 읽는 동안 로딩 점, 실패하면 `ScreenFailed`. 화면마다 복사하던 대기 화면을 대신한다. */
export function LoadingScreen({failed,kind,onRetry,onHome}:{failed:boolean;kind?:ScreenFailureKind;onRetry:()=>void;onHome?:()=>void}) {
  // 스크롤하지 않는 틀이어야 남은 높이를 채워 화면 세로 가운데에 놓인다.
  return <RetroScreen scrollable={false} style={{flex:1}}>
    <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
      {failed?<ScreenFailed kind={kind} onRetry={onRetry} onHome={onHome}/>:<PixelLoadingIndicator label={t('common.loading')}/>}
    </View>
  </RetroScreen>;
}

/** 읽기 실패와 다시 시도. 읽는 effect의 의존성에 `attempt`를 넣고, 실패하면 `fail()`을 부른다. */
export function useLoadRetry() {
  const [failed,setFailed]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const fail=useCallback(()=>setFailed(true),[]);
  const retry=useCallback(()=>{setFailed(false);setAttempt(a=>a+1);},[]);
  return {failed,attempt,fail,retry};
}
