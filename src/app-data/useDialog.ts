import { createElement, useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PixelDialogModal, boardDialogs } from '../design-system';

export type DialogSpec = {
  title: string;
  description: string;
  /** 오른쪽 주황 버튼 */
  primaryLabel: string;
  /** 왼쪽 보조 버튼. 없으면 버튼 하나짜리 알림이다 */
  secondaryLabel?: string;
};

/** primary = 오른쪽 주황 버튼, secondary = 왼쪽 버튼, dismiss = 고르지 않고 닫음(Android 뒤로가기) */
export type DialogChoice = 'primary' | 'secondary' | 'dismiss';

/**
 * 확인·알림을 기존 basic 다이얼로그로 띄운다. OS Alert를 쓰지 않는다 (DESIGN-SYSTEM, 2026-09-29).
 * 반환한 `dialog`는 화면에 함께 렌더해야 한다.
 */
/** 닫히는 애니메이션(fade)보다 넉넉하게 */
const DISMISS_FALLBACK_MS = 700;

export function useDialog() {
  const [open, setOpen] = useState<{ spec: DialogSpec; resolve: (choice: DialogChoice) => void } | null>(null);

  /** 새로 물으면 이전 질문은 고르지 않고 닫은 것으로 끝낸다. */
  const ask = useCallback((spec: DialogSpec) => new Promise<DialogChoice>((resolve) => {
    setOpen((previous) => {
      previous?.resolve('dismiss');
      return { spec, resolve };
    });
  }), []);

  // RN Modal은 화면과 상관없이 맨 위에 그려진다. 이 화면이 가려지면(다른 화면 열기·딥링크) 고르지 않고 닫은 것으로 끝낸다.
  useFocusEffect(useCallback(() => () => {
    setOpen((previous) => {
      previous?.resolve('dismiss');
      return null;
    });
  }, []));

  /** 확인창: primary를 골랐을 때만 true */
  const confirm = useCallback(async (spec: DialogSpec) => (await ask(spec)) === 'primary', [ask]);

  /**
   * 고른 답은 창이 다 닫힌 뒤에 돌려준다 (2026-10-13). iOS는 닫히는 중인 창 위에 결제 창 같은 다른 창을 띄우지 못하고
   * 조용히 실패한다 — 사기 전 확인 뒤 결제 창이 안 뜨고 로딩만 돌던 원인. onDismiss가 안 오면 잠시 뒤 돌려준다.
   */
  const [closing, setClosing] = useState<{ resolve: (choice: DialogChoice) => void; choice: DialogChoice } | null>(null);
  const finishClosing = useCallback(() => {
    setClosing((previous) => {
      previous?.resolve(previous.choice);
      return null;
    });
  }, []);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(finishClosing, DISMISS_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [closing, finishClosing]);
  const close = (choice: DialogChoice) => {
    const resolve = open?.resolve;
    setOpen(null);
    if (!resolve) return;
    if (Platform.OS !== 'ios') { resolve(choice); return; }
    setClosing((previous) => {
      previous?.resolve(previous.choice);
      return { resolve, choice };
    });
  };

  const dialog = createElement(PixelDialogModal, {
    visible: open !== null,
    onRequestClose: () => close('dismiss'),
    onDismiss: finishClosing,
    title: open?.spec.title ?? '',
    description: open?.spec.description ?? '',
    primaryLabel: open?.spec.primaryLabel,
    secondaryLabel: open?.spec.secondaryLabel,
    single: open !== null && open.spec.secondaryLabel === undefined,
    onPrimary: () => close('primary'),
    onSecondary: () => close('secondary'),
  });

  return { ask, confirm, dialog };
}

/**
 * 저장 작업을 한다. 실패하면 버튼 하나짜리 알림을 띄우고 false. 입력은 화면에 그대로 남는다.
 * 성공을 확인하기 전에 완료로 표시하지 않는다 (PRD 7절).
 */
export async function saveOrNotify(ask: (spec: DialogSpec) => Promise<DialogChoice>, title: string, task: () => Promise<void>): Promise<boolean> {
  try {
    await task();
    return true;
  } catch {
    await ask(boardDialogs.saveFailed(title));
    return false;
  }
}
