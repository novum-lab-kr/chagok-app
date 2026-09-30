jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));

import * as WebBrowser from 'expo-web-browser';
import * as Network from 'expo-network';
import { openPolicy } from '../src/policy/openPolicy';

const open = WebBrowser.openBrowserAsync as jest.Mock;
const network = Network.getNetworkStateAsync as jest.Mock;
const online = { isConnected: true, isInternetReachable: true };

beforeEach(() => { open.mockReset(); network.mockReset(); });

describe('openPolicy', () => {
  it('온라인이면 약관 주소를 시트로 연다', async () => {
    network.mockResolvedValue(online);
    open.mockResolvedValue({ type: 'dismiss' });
    const ask = jest.fn();
    await openPolicy('terms', ask);
    expect(open).toHaveBeenCalledWith('https://chagok-app-terms.netlify.app/terms/');
    expect(ask).not.toHaveBeenCalled();
  });

  it('오프라인이면 알림만 띄운다', async () => {
    network.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const ask = jest.fn().mockResolvedValue('primary');
    await openPolicy('privacy', ask);
    expect(open).not.toHaveBeenCalled();
    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ title: '연결이 필요해요' }));
  });

  it('시트를 열다 실패하면 던지지 않고 알린다 (리뷰 #6)', async () => {
    network.mockResolvedValue(online);
    open.mockRejectedValue(new Error('no browser'));
    const ask = jest.fn().mockResolvedValue('primary');
    await expect(openPolicy('terms', ask)).resolves.toBeUndefined();
    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ title: '열지 못했어요' }));
  });

  it('여는 중에 다시 누르면 무시한다 (리뷰 #6)', async () => {
    network.mockResolvedValue(online);
    let finish: () => void = () => {};
    open.mockImplementation(() => new Promise((r) => { finish = () => r({ type: 'dismiss' }); }));
    const ask = jest.fn();
    const first = openPolicy('terms', ask);
    await Promise.resolve(); await Promise.resolve();
    await openPolicy('terms', ask);
    finish();
    await first;
    expect(open).toHaveBeenCalledTimes(1);
  });
});
