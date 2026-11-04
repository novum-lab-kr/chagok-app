/**
 * 키 없는 출시 빌드: 도구를 연결하지 않아 아무것도 보내지 않고, 기록을 불러도 앱이 멈추지 않는다.
 * 키는 번들에 박히는 환경 변수라 모듈을 읽기 전에 지운다.
 */
const postHogConstructor = jest.fn();
const sentryInit = jest.fn();

jest.mock('posthog-react-native', () => ({ __esModule: true, default: postHogConstructor }));
jest.mock('@sentry/react-native', () => ({
  init: sentryInit,
  breadcrumbsIntegration: () => ({}),
  setUser: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: unknown) => component,
}));
jest.mock('../../db/expoDriver', () => ({ readSettingSync: () => null }));
jest.mock('../../repositories/appSettingsRepository', () => ({
  getDeviceId: async () => 'install-id',
  // 동의한 사용자라도 키가 없으면 만들지 않는다
  getSetting: async () => '0',
  setSetting: async () => undefined,
}));

describe('키 없는 출시 빌드', () => {
  const globals = globalThis as unknown as { __DEV__: boolean };
  const savedDev = globals.__DEV__;

  beforeAll(() => {
    globals.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });
  afterAll(() => { globals.__DEV__ = savedDev; });

  it('PostHog를 만들지 않고, 이벤트를 불러도 오류가 나지 않는다', async () => {
    const { startAnalytics } = await import('../posthog');
    const { track } = await import('../index');
    await startAnalytics();
    expect(postHogConstructor).not.toHaveBeenCalled();
    expect(() => { for (let count = 0; count < 200; count += 1) track('app_open', { source: 'cold' }); }).not.toThrow();
    expect(postHogConstructor).not.toHaveBeenCalled();
  });

  it('Sentry를 꺼진 채로 시작한다', async () => {
    const { startSentry } = await import('../sentry');
    startSentry();
    expect(sentryInit).toHaveBeenCalledWith(expect.objectContaining({ enabled: false, dsn: undefined }));
  });
});
