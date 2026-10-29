jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));

import * as WebBrowser from 'expo-web-browser';
import * as Network from 'expo-network';
import { confirmWithTerms, openPolicy } from '../src/policy/openPolicy';

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

describe('confirmWithTerms', () => {
  const spec = { title: '사기 전', description: '…', primaryLabel: '열기', secondaryLabel: '취소', linkLabel: '약관 보기' };

  it('주 버튼을 고르면 true, 취소나 닫기면 false', async () => {
    await expect(confirmWithTerms(jest.fn().mockResolvedValue('primary'), spec)).resolves.toBe(true);
    await expect(confirmWithTerms(jest.fn().mockResolvedValue('secondary'), spec)).resolves.toBe(false);
    await expect(confirmWithTerms(jest.fn().mockResolvedValue('dismiss'), spec)).resolves.toBe(false);
  });

  it('[약관 보기]를 누르면 약관 시트를 연 뒤 같은 확인 창을 다시 띄운다 (2026-10-29 법률 검토 2차)', async () => {
    network.mockResolvedValue(online);
    open.mockResolvedValue({ type: 'dismiss' });
    const ask = jest.fn().mockResolvedValueOnce('link').mockResolvedValueOnce('primary');
    await expect(confirmWithTerms(ask, spec)).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith('https://chagok-app-terms.netlify.app/terms/');
    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask).toHaveBeenNthCalledWith(2, spec);
  });
});
