import * as WebBrowser from 'expo-web-browser';
import * as Network from 'expo-network';
import type { DialogChoice, DialogSpec } from '../app-data/useDialog';
import { policyUrl } from './urls';
import type { PolicyKind } from './versions';

/** 앱 위 시트로 연다(iOS SFSafariViewController, Android Custom Tabs). 오프라인이면 버튼 하나짜리 알림만. */
export async function openPolicy(kind: PolicyKind, ask: (spec: DialogSpec) => Promise<DialogChoice>): Promise<void> {
  const state = await Network.getNetworkStateAsync();
  if (state.isConnected === false || state.isInternetReachable === false) {
    await ask({ title: '연결이 필요해요', description: '인터넷에 연결되면 볼 수 있어요.', primaryLabel: '확인' });
    return;
  }
  await WebBrowser.openBrowserAsync(policyUrl(kind));
}
