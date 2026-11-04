import PostHog from 'posthog-react-native';
import { getDeviceId, getSetting, setSetting } from '../repositories/appSettingsRepository';
import { setAnalyticsClient, setAnalyticsEnabled } from './index';

/**
 * PostHog 연결. 도구에 기대는 코드는 이 파일에만 둔다.
 * Provider를 쓰지 않아 화면 터치 자동 수집이 없다. 앱 수명 주기 이벤트, 화면 녹화, 기능 플래그, 위치 조회를 끈다.
 * 동의하기 전에는 만들지 않는다. 개발 빌드와 키가 없는 빌드는 연결하지 않는다.
 * https://posthog.com/docs/libraries/react-native
 */
const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST;

let connection: Promise<void> | null = null;

async function connect(): Promise<void> {
  if (__DEV__ || !API_KEY || !HOST) return;
  const installId = await getDeviceId();
  const posthog = new PostHog(API_KEY, {
    host: HOST,
    bootstrap: { distinctId: installId, isIdentifiedId: false },
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    disableGeoip: true,
    disableRemoteFeatureFlags: true,
    preloadFeatureFlags: false,
    // 기본 속성 가운데 수집 항목으로 고지하지 않는 언어와 시간대를 뺀다
    customAppProperties: ({ $locale: _locale, $timezone: _timezone, ...rest }) => rest,
  });
  // 로그아웃(reset) 뒤에는 익명 ID가 새로 만들어져 설치 ID를 다시 붙인다
  const registerInstall = () => { void posthog.register({ install_id: installId }); };
  registerInstall();
  // 저장소를 읽기 전에는 저장된 계정 ID를 알 수 없다 (isIdentified)
  await posthog.ready();
  setAnalyticsClient({
    capture: (name, properties) => { void posthog.capture(name, properties); },
    screen: (name) => { void posthog.screen(name); },
    identify: (userId) => { posthog.identify(userId); },
    // identify는 지금 ID를 익명 ID로 옮기고 계정 ID를 따로 저장한다. reset하면 둘이 다시 같아진다.
    isIdentified: () => posthog.getDistinctId() !== posthog.getAnonymousId(),
    reset: () => { posthog.reset(); registerInstall(); },
    clearQueue: () => { posthog.setPersistedProperty('queue' as never, []); },
    setEnabled: (enabled) => { void (enabled ? posthog.optIn() : posthog.optOut()); },
  });
}

/** 앱을 켜는 동안과 동의한 순간에 부른다. 이미 연결했으면 다시 만들지 않는다. */
function connectOnce(): Promise<void> {
  connection ??= connect().catch((error: unknown) => {
    connection = null;
    throw error;
  });
  return connection;
}

/** 앱을 켤 때 한 번. 저장된 동의를 먼저 읽어서, 동의하지 않은 사용자에게는 PostHog를 만들지 않는다. */
export async function startAnalytics(): Promise<void> {
  let agreed = false;
  try {
    agreed = await isAnalyticsEnabled();
  } finally {
    setAnalyticsEnabled(agreed);
  }
  if (agreed) await connectOnce();
}

/** 동의 화면과 설정의 체크 칸. 로그아웃해도 유지한다 (src/sync/wipe.ts). 저장에 실패하면 지금 상태를 바꾸지 않는다. */
export async function saveAnalyticsEnabled(enabled: boolean): Promise<void> {
  await setSetting('analyticsOff', enabled ? '0' : '1');
  setAnalyticsEnabled(enabled);
  // 연결에 실패해도 동의는 저장됐다. 다음 실행에 다시 연결한다.
  if (enabled) await connectOnce().catch(() => {});
}

/** 저장값 '0'은 동의, '1'은 거부나 철회, 없으면 아직 묻지 않았다. 동의한 경우에만 켠다. */
export async function isAnalyticsEnabled(): Promise<boolean> {
  return (await getSetting('analyticsOff')) === '0';
}

/** 동의 화면에서 답한 적이 있는가. 있으면 다시 묻지 않는다. */
export async function hasAnsweredAnalytics(): Promise<boolean> {
  return (await getSetting('analyticsOff')) !== null;
}
