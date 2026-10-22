import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import {APPLE_LOGO_PNG} from '../../src/design-system/apple-logo';
import {AppleLoginButton, hasCustomAppleButton} from '../../src/design-system/account-screens';

/**
 * Storybook용 Apple 로그인 버튼. 로고 파일이 있으면(scripts/apple-logo.mjs) 앱과 같은 직접 만든 버튼을 그린다.
 * 없으면 앱이 쓰는 네이티브 `AppleAuthenticationButton`(WHITE_OUTLINE, 모서리 12, 높이 40)을 흉내 낸다. 그때 글자와 로고 크기는 기기에서 Apple이 정한다.
 */
export function AppleButtonPreview() {
  if (hasCustomAppleButton) return <AppleLoginButton onPress={() => {}}/>;
  return <Pressable accessibilityRole="button" accessibilityLabel="Apple로 계속하기"
    style={{height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#000000', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6}}>
    <View style={{width: 20, height: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'}}>
      <Image source={{uri: APPLE_LOGO_PNG}} style={{width: 44, height: 44}}/>
    </View>
    <Text style={{fontSize: 17, fontWeight: '500', color: '#000000', fontFamily: '-apple-system, system-ui, sans-serif'}}>Apple로 계속하기</Text>
  </Pressable>;
}
