import { connectSync } from '../src/sync/connect';

function harness(paused = { value: false }) {
  let resumeFn: () => void = () => {};
  let authFn: (userId: string | null) => void = () => {};
  let appFn: (active: boolean) => void = () => {};
  let localFn: () => void = () => {};
  const runs: string[] = [];
  const remembered: string[] = [];
  const stop = connectSync({
    onAuthChange: (fn) => { authFn = fn; return () => { authFn = () => {}; }; },
    onAppActive: (fn) => { appFn = fn; return () => { appFn = () => {}; }; },
    onLocalChange: (fn) => { localFn = fn; return () => { localFn = () => {}; }; },
    makeRun: (userId) => async () => { runs.push(userId); },
    rememberUser: async (u) => { remembered.push(u); },
    isPaused: () => paused.value,
    onResume: (fn) => { resumeFn = fn; return () => { resumeFn = () => {}; }; },
    debounceMs: 0,
  });
  return { stop, runs, remembered, resume: () => resumeFn(), signIn: (u: string | null) => authFn(u), active: () => appFn(true), local: () => localFn() };
}
const flush = () => new Promise((r) => setTimeout(r, 5));

describe('connectSync', () => {
  it('로그인 전에는 보내지 않는다', async () => {
    const h = harness();
    h.local(); h.active(); await flush();
    expect(h.runs).toEqual([]);
    h.stop();
  });

  it('로그인하면 바로 보내고, 기록이 바뀌거나 앱이 앞으로 오면 다시 보낸다', async () => {
    const h = harness();
    h.signIn('u1'); await flush();
    h.local(); await flush();
    h.active(); await flush();
    expect(h.runs).toEqual(['u1', 'u1', 'u1']);
    h.stop();
  });

  it('로그아웃하면 멈춘다', async () => {
    const h = harness();
    h.signIn('u1'); await flush();
    h.signIn(null); h.local(); h.active(); await flush();
    expect(h.runs).toEqual(['u1']);
    h.stop();
  });

  it('잠겨 있으면 로그인해도 보내지 않고, 풀린 뒤 기록이 바뀌면 보낸다', async () => {
    const paused = { value: true };
    const h = harness(paused);
    h.signIn('u1'); h.local(); await flush();
    expect(h.runs).toEqual([]);
    paused.value = false;
    h.local(); await flush();
    expect(h.runs).toEqual(['u1']);
    h.stop();
  });

  it('세션이 없으면 연결한 계정 기록을 지우지 않는다 (로그인 풀림을 알아야 한다)', async () => {
    const h = harness();
    h.signIn(null); h.signIn('u1'); h.signIn(null); await flush();
    expect(h.remembered).toEqual(['u1']);
    h.stop();
  });

  it('잠금이 풀리면 미뤄 둔 전송을 바로 보낸다 (첫 백업이 기록을 기다리지 않게)', async () => {
    const paused = { value: true };
    const h = harness(paused);
    h.signIn('u1'); await flush();
    expect(h.runs).toEqual([]);
    paused.value = false;
    h.resume(); await flush();
    expect(h.runs).toEqual(['u1']);
    h.stop();
  });
});
