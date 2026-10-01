import { getSetting, setSetting } from '../src/repositories/appSettingsRepository';
import { beginConnect, endConnect, recoverInterruptedConnect } from '../src/sync/connectMarker';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('연결 중 표시', () => {
  it('연결 도중 앱이 꺼졌으면 다음 실행에서 로그아웃하고 이전 계정 표시로 되돌린다', async () => {
    await setSetting('accountUserId', 'old');
    await beginConnect('old');
    await setSetting('accountUserId', 'new'); // 로그인 이벤트가 먼저 기록했다
    let signedOut = 0;
    expect(await recoverInterruptedConnect(async () => { signedOut += 1; })).toBe(true);
    expect(signedOut).toBe(1);
    expect(await getSetting('accountUserId')).toBe('old');
    expect(await recoverInterruptedConnect(async () => { signedOut += 1; })).toBe(false);
    expect(signedOut).toBe(1);
  });
  it('처음 연결이었으면 연결 기록을 비운다', async () => {
    await beginConnect(null);
    await setSetting('accountUserId', 'new');
    await recoverInterruptedConnect(async () => {});
    expect(await getSetting('accountUserId')).toBeNull();
  });
  it('끝난 연결은 되돌리지 않는다', async () => {
    await beginConnect(null);
    await setSetting('accountUserId', 'new');
    await endConnect();
    expect(await recoverInterruptedConnect(async () => {})).toBe(false);
    expect(await getSetting('accountUserId')).toBe('new');
  });
});
