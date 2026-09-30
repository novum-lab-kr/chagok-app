import { createElement, useCallback, useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { PixelDialogModal } from '../design-system';
import { goBackOrHome } from './goBack';

/**
 * 헤더와 Android 시스템 뒤로가기에서 저장 전 입력을 보존한다.
 * iOS 스와이프 뒤로가기·모달 내리기는 확인을 띄울 수 없어 입력이 있는 동안 막는다.
 * 반환한 `dialog`는 화면에 함께 렌더해야 한다.
 */
export function useUnsavedBack(dirty: boolean) {
  const navigation = useNavigation();
  const [asking, setAsking] = useState(false);
  const goBack = useCallback(() => {
    if (!dirty) { goBackOrHome(); return; }
    setAsking(true);
  }, [dirty]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !dirty });
  }, [navigation, dirty]);

  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty) return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [dirty, goBack]));

  const dialog = createElement(PixelDialogModal, {
    visible: asking,
    onRequestClose: () => setAsking(false),
    title: '저장하지 않고 나갈까요?',
    description: '지금 쓴 내용이 사라져요.',
    primaryLabel: '계속 쓰기',
    secondaryLabel: '나가기',
    onPrimary: () => setAsking(false),
    onSecondary: () => { setAsking(false); goBackOrHome(); },
  });

  return { goBack, dialog };
}
