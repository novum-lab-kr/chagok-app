import { getNetworkStateAsync } from 'expo-network';

/**
 * 지금 인터넷에 연결돼 있는가. 한 판에서 칸을 붙이기 전처럼 연결이 있어야 하는 동작이 쓴다.
 * 도달 여부를 모르면(null) 연결된 것으로 본다. 확인하다 오류가 나면 연결 없음이다.
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}
