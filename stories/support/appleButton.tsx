import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import {APPLE_LOGO_PNG} from '../../src/design-system/apple-logo';

/**
 * Storybook용 Apple 로그인 버튼 미리보기. 앱은 네이티브 `AppleAuthenticationButton`(WHITE_OUTLINE, 모서리 12, 높이 48)을 쓰는데
 * 웹에서는 그려지지 않아 같은 모양을 흉내 낸다. 글자와 로고 크기는 기기에서 Apple이 정한다.
 */
export function AppleButtonPreview() {
  return <Pressable accessibilityRole="button" accessibilityLabel="Apple로 로그인"
    style={{height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#000000', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6}}>
    <View style={{width: 20, height: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'}}>
      <Image source={{uri: APPLE_LOGO_PNG}} style={{width: 44, height: 44}}/>
    </View>
    <Text style={{fontSize: 17, fontWeight: '500', color: '#000000', fontFamily: '-apple-system, system-ui, sans-serif'}}>Apple로 로그인</Text>
  </Pressable>;
}
