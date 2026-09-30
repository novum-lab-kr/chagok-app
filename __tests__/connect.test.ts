import { connectSync } from '../src/sync/connect';

function harness() {
  let authFn: (userId: string | null) => void = () => {};
  let appFn: (active: boolean) => void = () => {};
  let localFn: () => void = () => {};
  const runs: string[] = [];
  const stop = connectSync({
    onAuthChange: (fn) => { authFn = fn; return () => { authFn = () => {}; }; },
    onAppActive: (fn) => { appFn = fn; return () => { appFn = () => {}; }; },
    onLocalChange: (fn) => { localFn = fn; return () => { localFn = () => {}; }; },
    makeRun: (userId) => async () => { runs.push(userId); },
    rememberUser: async () => {},
    debounceMs: 0,
  });
  return { stop, runs, signIn: (u: string | null) => authFn(u), active: () => appFn(true), local: () => localFn() };
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
});
