import { createElement, useCallback, useState } from 'react';
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

  const close = (choice: DialogChoice) => {
    open?.resolve(choice);
    setOpen(null);
  };

  const dialog = createElement(PixelDialogModal, {
    visible: open !== null,
    onRequestClose: () => close('dismiss'),
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
