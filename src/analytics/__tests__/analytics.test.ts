import {
  __resetAnalyticsForTest,
  identifyUser,
  resetUser,
  screen,
  setAnalyticsClient,
  setAnalyticsEnabled,
  track,
  trackTutorial,
  type AnalyticsClient,
} from '../index';

function fakeClient({ storedUser = false } = {}) {
  const calls: unknown[][] = [];
  let identified = storedUser;
  const client: AnalyticsClient = {
    capture: (name, properties) => { calls.push(['capture', name, properties]); },
    screen: (name) => { calls.push(['screen', name]); },
    identify: (userId) => { identified = true; calls.push(['identify', userId]); },
    isIdentified: () => identified,
    reset: () => { identified = false; calls.push(['reset']); },
    clearQueue: () => { calls.push(['clearQueue']); },
    setEnabled: (enabled) => { calls.push(['setEnabled', enabled]); },
  };
  return { client, calls };
}

beforeEach(() => {
  __resetAnalyticsForTest();
  setAnalyticsEnabled(true);
});

describe('동의 전', () => {
  beforeEach(() => __resetAnalyticsForTest());

  it('동의하지 않았으면 이벤트를 쌓지 않아, 나중에 동의해도 지난 이벤트가 나가지 않는다', () => {
    setAnalyticsEnabled(false);
    track('app_open', { source: 'cold' });
    screen('/(tabs)/index');
    setAnalyticsEnabled(true);
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    expect(calls.filter(([kind]) => kind === 'capture' || kind === 'screen')).toEqual([]);
  });

  it('저장된 선택을 읽기 전 이벤트는 동의하지 않았다고 확인되면 버린다', () => {
    track('app_open', { source: 'cold' });
    setAnalyticsEnabled(false);
    setAnalyticsEnabled(true);
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    expect(calls.filter(([kind]) => kind === 'capture')).toEqual([]);
  });

  it('저장된 선택을 읽기 전 이벤트는 동의했다고 확인되면 보낸다', () => {
    track('app_open', { source: 'cold' });
    setAnalyticsEnabled(true);
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    expect(calls).toContainEqual(['capture', 'app_open', { source: 'cold' }]);
  });
});

describe('이벤트 보내기', () => {
  it('연결되면 이름과 속성을 그대로 넘긴다', () => {
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    track('goal_create', { board_type: 'tally', slot_count: 30 });
    expect(calls).toContainEqual(['capture', 'goal_create', { board_type: 'tally', slot_count: 30 }]);
  });

  it('연결 전 이벤트는 모았다가 연결되면 순서대로 보낸다', () => {
    track('app_open', { source: 'cold' });
    screen('/(tabs)/index');
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    expect(calls.filter(([kind]) => kind !== 'setEnabled')).toEqual([
      ['capture', 'app_open', { source: 'cold' }],
      ['screen', '/(tabs)/index'],
    ]);
  });

  it('연결 전에 너무 많이 쌓이면 오래된 것부터 버린다', () => {
    for (let count = 0; count < 60; count += 1) track('sticker_remove', { source: 'app' });
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    expect(calls.filter(([kind]) => kind === 'capture')).toHaveLength(50);
  });

  it('연결되지 않아도, 도구가 실패해도 앱 동작을 막지 않는다', () => {
    expect(() => track('logout')).not.toThrow();
    const { client } = fakeClient();
    setAnalyticsClient({ ...client, capture: () => { throw new Error('실패'); } });
    expect(() => track('logout')).not.toThrow();
  });
});

describe('끄기 스위치', () => {
  it('끄면 이벤트를 보내지 않고, 켜면 그 뒤 이벤트만 보낸다', () => {
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    setAnalyticsEnabled(false);
    track('logout');
    screen('/settings');
    setAnalyticsEnabled(true);
    track('goal_delete');
    const sent = calls.filter(([kind]) => kind === 'capture' || kind === 'screen');
    expect(sent).toEqual([['capture', 'goal_delete', undefined]]);
  });

  it('끄면 연결 전에 모아 둔 이벤트도 버린다', () => {
    track('logout');
    setAnalyticsEnabled(false);
    setAnalyticsEnabled(true);
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    expect(calls.filter(([kind]) => kind === 'capture')).toHaveLength(0);
  });

  it('연결 전에 정한 끄기를 연결할 때 도구에 알린다', () => {
    setAnalyticsEnabled(false);
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    expect(calls).toContainEqual(['setEnabled', false]);
  });

  it('꺼져 있으면 사용자 ID를 넘기지 않는다', () => {
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    setAnalyticsEnabled(false);
    identifyUser('user-1');
    expect(calls).not.toContainEqual(['identify', 'user-1']);
  });

  it('꺼져 있는 동안 로그인했으면 다시 켤 때 사용자 ID를 넘긴다', () => {
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    setAnalyticsEnabled(false);
    identifyUser('user-1');
    setAnalyticsEnabled(true);
    expect(calls).toContainEqual(['identify', 'user-1']);
  });
});

describe('사용자 ID', () => {
  it('같은 사용자를 두 번 넘기지 않는다', () => {
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    identifyUser('user-1');
    identifyUser('user-1');
    expect(calls.filter(([kind]) => kind === 'identify')).toHaveLength(1);
  });

  it('철회할 때 계정 ID를 이미 지웠으면 로그아웃에서 다시 지우지 않는다', () => {
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    identifyUser('user-1');
    setAnalyticsEnabled(false);
    calls.length = 0;
    resetUser();
    expect(calls).toEqual([]);
  });

  it('로그인한 적 없으면 비우지 않는다', () => {
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    calls.length = 0;
    resetUser();
    expect(calls).toEqual([]);
  });

  it('꺼진 채 연결되면 저장된 계정 ID를 그때 지워 로그아웃에서 다시 지우지 않는다', () => {
    const { client, calls } = fakeClient({ storedUser: true });
    setAnalyticsEnabled(false);
    setAnalyticsClient(client);
    calls.length = 0;
    resetUser();
    expect(calls).toEqual([]);
  });

  it('연결 전에 로그아웃을 들었으면 모아 둔 이벤트를 보내기 전에 저장된 계정 ID를 지운다', () => {
    resetUser();
    track('app_open', { source: 'cold' });
    const { client, calls } = fakeClient({ storedUser: true });
    setAnalyticsClient(client);
    expect(calls.map(([kind]) => kind)).toEqual(['setEnabled', 'reset', 'setEnabled', 'capture']);
  });

  it('로그아웃을 듣지 못했으면 연결만으로 저장된 계정 ID를 지우지 않는다', () => {
    const { client, calls } = fakeClient({ storedUser: true });
    setAnalyticsClient(client);
    expect(calls).not.toContainEqual(['reset']);
  });

  it('연결 전에 로그인했으면 연결할 때 넘긴다', () => {
    identifyUser('user-1');
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    expect(calls).toContainEqual(['identify', 'user-1']);
  });
});

describe('튜토리얼', () => {
  it('시작과 단계를 따로 남겨 1단계로 돌아와도 시작이 늘지 않는다', () => {
    const { client, calls } = fakeClient();
    setAnalyticsClient(client);
    trackTutorial({ kind: 'step', step: 1 });
    expect(calls).not.toContainEqual(['capture', 'tutorial_start', undefined]);
    trackTutorial({ kind: 'start', step: 1 });
    expect(calls).toContainEqual(['capture', 'tutorial_start', undefined]);
    expect(calls).toContainEqual(['capture', 'tutorial_step', { step: 1 }]);
  });
});

describe('로그아웃', () => {
  beforeEach(() => __resetAnalyticsForTest());

  it('동의한 상태면 저장된 계정 ID를 지우고 켜짐을 다시 적용한다', () => {
    const { client, calls } = fakeClient();
    setAnalyticsEnabled(true);
    setAnalyticsClient(client);
    identifyUser('user-1');
    calls.length = 0;
    resetUser();
    expect(calls).toEqual([['reset'], ['setEnabled', true]]);
  });
});

describe('철회', () => {
  beforeEach(() => __resetAnalyticsForTest());

  it('쌓인 이벤트를 버리고 저장된 계정 ID를 지운다', () => {
    const { client, calls } = fakeClient({ storedUser: true });
    setAnalyticsEnabled(true);
    setAnalyticsClient(client);
    calls.length = 0;
    setAnalyticsEnabled(false);
    expect(calls).toContainEqual(['clearQueue']);
    expect(calls).toContainEqual(['reset']);
    expect(calls.at(-1)).toEqual(['setEnabled', false]);
  });

  it('연결되기 전에 철회했으면 연결할 때 비운다', () => {
    const { client, calls } = fakeClient({ storedUser: true });
    setAnalyticsEnabled(false);
    setAnalyticsClient(client);
    expect(calls).toContainEqual(['clearQueue']);
    expect(calls).toContainEqual(['reset']);
  });
});
