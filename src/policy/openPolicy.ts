import * as WebBrowser from 'expo-web-browser';
import * as Network from 'expo-network';
import { createSingleFlight } from '../app-data/singleFlight';
import type { DialogChoice, DialogSpec } from '../app-data/useDialog';
import { policyUrl } from './urls';
import type { PolicyKind } from './versions';

/** 여는 중에 다시 누르면 무시한다 — 시트가 두 번 뜨지 않게. */
const once = createSingleFlight();

/**
 * 앱 위 시트로 연다(iOS SFSafariViewController, Android Custom Tabs). 오프라인이면 버튼 하나짜리 알림만.
 * 호출부가 기다리지 않으므로(void) 실패해도 던지지 않고 알린다.
 */
export function openPolicy(kind: PolicyKind, ask: (spec: DialogSpec) => Promise<DialogChoice>): Promise<void> {
  return once(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected === false || state.isInternetReachable === false) {
        await ask({ title: '연결이 필요해요', description: '인터넷에 연결되면 볼 수 있어요.', primaryLabel: '확인' });
        return;
      }
      await WebBrowser.openBrowserAsync(policyUrl(kind));
    } catch {
      await ask({ title: '열지 못했어요', description: '잠시 후 다시 시도해주세요.', primaryLabel: '확인' });
    }
  });
}

/**
 * 사기 전 확인 창. [약관 보기]를 누르면 창을 닫고 약관 시트를 연 뒤, 시트를 닫으면 같은 창을 다시 띄운다.
 * iOS는 떠 있는 창 위에 시트를 띄우지 못해 닫은 뒤에 연다. 주 버튼을 골랐을 때만 true (2026-10-29 법률 검토 2차).
 */
export async function confirmWithTerms(ask: (spec: DialogSpec) => Promise<DialogChoice>, spec: DialogSpec): Promise<boolean> {
  for (;;) {
    const choice = await ask(spec);
    if (choice !== 'link') return choice === 'primary';
    await openPolicy('terms', ask);
  }
}
