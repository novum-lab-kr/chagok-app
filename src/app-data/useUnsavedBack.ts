import { createElement, useCallback, useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { PixelDialogModal, boardDialogs } from '../design-system';
import { goBackOrHome } from './goBack';

/** 뒤로 가기를 눌렀을 때 할 일. 저장 중(busy)이면 머문다 — 서버 저장, 공유 창이 아직 이어진다. 입력이 있으면 묻고, 없으면 떠난다. */
export function backAction(dirty: boolean, busy: boolean): 'stay' | 'ask' | 'leave' {
  if (busy) return 'stay';
  return dirty ? 'ask' : 'leave';
}

/**
 * 헤더와 Android 시스템 뒤로가기에서 저장 전 입력을 보존한다.
 * iOS 스와이프 뒤로가기·모달 내리기는 확인을 띄울 수 없어 입력이 있는 동안 막는다.
 * busy인 동안은 뒤로 가기를 모두 막는다(함께 목표 만들기처럼 저장이 길게 이어지는 화면).
 * 반환한 `dialog`는 화면에 함께 렌더해야 한다.
 */
export function useUnsavedBack(dirty: boolean, busy = false) {
  const navigation = useNavigation();
  const [asking, setAsking] = useState(false);
  const action = backAction(dirty, busy);
  const goBack = useCallback(() => {
    if (action === 'leave') goBackOrHome();
    else if (action === 'ask') setAsking(true);
  }, [action]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: action === 'leave' });
  }, [navigation, action]);

  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (action === 'leave') return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [action, goBack]));

  const dialog = createElement(PixelDialogModal, {
    visible: asking,
    onRequestClose: () => setAsking(false),
    ...boardDialogs.unsaved,
    onPrimary: () => setAsking(false),
    onSecondary: () => { setAsking(false); goBackOrHome(); },
  });

  return { goBack, dialog };
}
