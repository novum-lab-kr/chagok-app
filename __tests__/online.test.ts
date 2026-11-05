import { getNetworkStateAsync } from 'expo-network';
import { isOnline } from '../src/app-data/online';

jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));
const state = getNetworkStateAsync as jest.Mock;

describe('isOnline', () => {
  it('연결돼 있고 도달할 수 있으면 true', async () => {
    state.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    expect(await isOnline()).toBe(true);
  });

  it('연결이 없으면 false', async () => {
    state.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    expect(await isOnline()).toBe(false);
  });

  it('연결됐지만 인터넷에 닿지 않으면 false', async () => {
    state.mockResolvedValue({ isConnected: true, isInternetReachable: false });
    expect(await isOnline()).toBe(false);
  });

  it('도달 여부를 모르면(null) 연결된 것으로 본다', async () => {
    state.mockResolvedValue({ isConnected: true, isInternetReachable: null });
    expect(await isOnline()).toBe(true);
  });

  it('확인하다 오류가 나면 false', async () => {
    state.mockRejectedValue(new Error('boom'));
    expect(await isOnline()).toBe(false);
  });
});
