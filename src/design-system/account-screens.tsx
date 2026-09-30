import React,{type ReactNode} from 'react';
import {Pressable,View} from 'react-native';
import {PixelPanel,PixelText} from './components';
import {RetroScreen,ScreenHeader,TextAction} from './composition-controls';
import {retro} from './tokens';

/** 체크 상자. 픽셀 프레임은 작은 크기에서 모서리가 깎여 +로 보이므로 잉크 테두리 네모로 그린다. 체크하면 안을 채운다. */
export function PixelCheckbox({label,checked,onChange}:{label:string;checked:boolean;onChange:()=>void}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked}} aria-checked={checked} onPress={onChange} style={{minHeight:retro.layout.touch,flexDirection:'row',alignItems:'center',gap:10}}>
    <View style={{width:24,height:24,borderWidth:retro.shape.border,borderColor:retro.color.ink,backgroundColor:retro.color.lcd,padding:4}}>
      {checked&&<View style={{flex:1,backgroundColor:retro.color.ink}}/>}
    </View>
    <PixelText style={{flex:1}}>{label}</PixelText>
  </Pressable>;
}

/**
 * 계정 연결 직전 한 화면 (약관 설계). 두 필수 체크가 켜져야 로그인 버튼을 누를 수 있다.
 * 로그인 버튼은 Apple·Google 공식 버튼이라 슬롯으로 받는다 — 디자인 시스템의 예외 (HANDOFF).
 */
export function ConsentScreen({ageChecked,termsChecked,onToggleAge,onToggleTerms,onViewTerms,onViewPrivacy,onUnder14,onBack,loginButtons}:{ageChecked:boolean;termsChecked:boolean;onToggleAge:()=>void;onToggleTerms:()=>void;onViewTerms:()=>void;onViewPrivacy:()=>void;onUnder14:()=>void;onBack:()=>void;loginButtons:ReactNode}) {
  const enabled=ageChecked&&termsChecked;
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="계정 연결" onBack={onBack}/>}>
    <PixelPanel>
      <PixelText>계정을 연결하면 기록이 자동으로 백업되고, 새 기기에서 로그인하면 복원돼요.</PixelText>
    </PixelPanel>
    <PixelPanel>
      <PixelCheckbox label="[필수] 만 14세 이상이에요" checked={ageChecked} onChange={onToggleAge}/>
      <PixelCheckbox label="[필수] 이용약관에 동의해요" checked={termsChecked} onChange={onToggleTerms}/>
      <TextAction label="이용약관 보기" onPress={onViewTerms}/>
      <TextAction label="개인정보 처리방침 보기" onPress={onViewPrivacy}/>
    </PixelPanel>
    <View testID="login-area" aria-disabled={!enabled} pointerEvents={enabled?'auto':'none'} style={{gap:12,opacity:enabled?1:retro.opacity.disabled}}>
      {loginButtons}
    </View>
    <TextAction label="만 14세 미만이에요" onPress={onUnder14}/>
  </RetroScreen>;
}
