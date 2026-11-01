/**
 * 동의 전에는 PostHog를 만들지 않고, 동의한 순간 연결하며, 철회는 전송을 멈추고 쌓인 이벤트를 버린다. 오류 보고 끄기는 저장값대로 시작한다.
 * 키는 번들에 박히는 환경 변수라 모듈을 읽기 전에 넣는다.
 */
const postHogConstructor = jest.fn();
const sentryInit = jest.fn();
const sentryClose = jest.fn(async () => undefined);
const settings = new Map<string, string>();
const fakePostHog = {
  register: jest.fn(),
  ready: async () => undefined,
  capture: jest.fn(),
  screen: jest.fn(),
  identify: jest.fn(),
  getDistinctId: () => 'install-id',
  getAnonymousId: () => 'install-id',
  reset: jest.fn(),
  optIn: jest.fn(),
  optOut: jest.fn(),
  setPersistedProperty: jest.fn(),
};

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: function PostHog(...args: unknown[]) {
    postHogConstructor(...args);
    return fakePostHog;
  },
}));
jest.mock('@sentry/react-native', () => ({
  init: sentryInit,
  breadcrumbsIntegration: () => ({}),
  setUser: jest.fn(),
  captureException: jest.fn(),
  close: sentryClose,
  wrap: (component: unknown) => component,
}));
jest.mock('../../db/expoDriver', () => ({
  readSettingSync: (key: string) => settings.get(key) ?? null,
}));
jest.mock('../../repositories/appSettingsRepository', () => ({
  getDeviceId: async () => 'install-id',
  getSetting: async (key: string) => settings.get(key) ?? null,
  setSetting: async (key: string, value: string) => { settings.set(key, value); },
}));

const globals = globalThis as unknown as { __DEV__: boolean };
const savedDev = globals.__DEV__;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  settings.clear();
  globals.__DEV__ = false;
  process.env.EXPO_PUBLIC_POSTHOG_KEY = 'test-key';
  process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://example.test';
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://example.test/1';
});
afterAll(() => { globals.__DEV__ = savedDev; });

describe('사용 기록 동의', () => {
  it('묻기 전에는 PostHog를 만들지 않고 이벤트도 보내지 않는다', async () => {
    const { startAnalytics, hasAnsweredAnalytics } = await import('../posthog');
    const { track } = await import('../index');
    await startAnalytics();
    track('app_open', { source: 'cold' });
    expect(postHogConstructor).not.toHaveBeenCalled();
    expect(await hasAnsweredAnalytics()).toBe(false);
  });

  it('거부하면 만들지 않고 답한 것으로 남는다', async () => {
    const { saveAnalyticsEnabled, startAnalytics, hasAnsweredAnalytics } = await import('../posthog');
    await startAnalytics();
    await saveAnalyticsEnabled(false);
    expect(postHogConstructor).not.toHaveBeenCalled();
    expect(await hasAnsweredAnalytics()).toBe(true);
  });

  it('동의한 순간 한 번만 연결하고, 동의 전 이벤트는 보내지 않는다', async () => {
    const { saveAnalyticsEnabled, startAnalytics } = await import('../posthog');
    const { track } = await import('../index');
    await startAnalytics();
    track('app_open', { source: 'cold' });
    await saveAnalyticsEnabled(true);
    await saveAnalyticsEnabled(true);
    track('logout');
    expect(postHogConstructor).toHaveBeenCalledTimes(1);
    expect(fakePostHog.capture.mock.calls).toEqual([['logout', undefined]]);
  });

  it('철회하면 그때부터 보내지 않고, 다음 실행에는 만들지 않는다', async () => {
    const first = await import('../posthog');
    const { track } = await import('../index');
    await first.saveAnalyticsEnabled(true);
    await first.saveAnalyticsEnabled(false);
    track('logout');
    expect(fakePostHog.capture).not.toHaveBeenCalled();
    expect(fakePostHog.optOut).toHaveBeenCalled();

    jest.resetModules();
    postHogConstructor.mockClear();
    const second = await import('../posthog');
    await second.startAnalytics();
    expect(postHogConstructor).not.toHaveBeenCalled();
  });

  it('동의를 저장한 뒤 다시 켠 앱은 시작할 때 연결한다', async () => {
    settings.set('analyticsOff', '0');
    const { startAnalytics } = await import('../posthog');
    await startAnalytics();
    expect(postHogConstructor).toHaveBeenCalledTimes(1);
  });
});

describe('오류 보고 끄기', () => {
  const lastOptions = () => sentryInit.mock.calls.at(-1)?.[0] as { enabled: boolean; enableNative: boolean; beforeSend: (event: object) => unknown };

  it('처음에는 켜져 있다', async () => {
    const { startSentry, isErrorReportEnabled } = await import('../sentry');
    startSentry();
    expect(lastOptions()).toEqual(expect.objectContaining({ enabled: true, enableNative: true }));
    expect(await isErrorReportEnabled()).toBe(true);
  });

  it('꺼 두었으면 네이티브까지 시작하지 않아 지난 충돌 기록도 나가지 않는다', async () => {
    settings.set('errorReportOff', '1');
    const { startSentry } = await import('../sentry');
    startSentry();
    expect(lastOptions()).toEqual(expect.objectContaining({ enabled: false, enableNative: false }));
  });

  it('쓰는 중에 끄면 그때부터 버리고, 다시 켜면 보낸다', async () => {
    const { startSentry, saveErrorReportEnabled } = await import('../sentry');
    startSentry();
    const event = { message: '오류' };
    await saveErrorReportEnabled(false);
    expect(lastOptions().beforeSend(event)).toBeNull();
    await saveErrorReportEnabled(true);
    expect(lastOptions().beforeSend(event)).not.toBeNull();
    // 끌 때 네이티브까지 닫아서 켤 때 다시 시작한다
    expect(sentryClose).toHaveBeenCalledTimes(1);
    expect(sentryInit).toHaveBeenCalledTimes(2);
  });

  it('꺼진 채 시작했다가 켜면 다시 시작한다', async () => {
    settings.set('errorReportOff', '1');
    const { startSentry, saveErrorReportEnabled } = await import('../sentry');
    startSentry();
    await saveErrorReportEnabled(true);
    expect(sentryInit).toHaveBeenCalledTimes(2);
    expect(lastOptions()).toEqual(expect.objectContaining({ enabled: true, enableNative: true }));
  });
});
