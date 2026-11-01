import * as Sentry from '@sentry/react-native';
import { readSettingSync } from '../db/expoDriver';
import { getDeviceId, getSetting, setSetting } from '../repositories/appSettingsRepository';
import { scrubBreadcrumb, scrubEvent } from './scrub';

/**
 * 오류 수집 (prod-logs 계획 B). 오류만 받는다. 성능 추적, 화면 녹화, 프로파일링은 켜지 않는다.
 * 개발 빌드와 키가 없는 빌드는 보내지 않는다. 설정 「오류 보고 보내기」를 끄면 보내지 않는다 (PRD 8.2).
 * https://docs.sentry.io/platforms/react-native/guides/expo/
 */
let reportOff = false;
/** 꺼진 채 시작했으면 네이티브 쪽이 돌지 않아 다시 켤 때 시작부터 다시 한다. */
let startedOff = false;

function init(off: boolean): void {
  startedOff = off;
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: !__DEV__ && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN) && !off,
    // 앱이 멈춘 기록은 다음 실행 때 네이티브 쪽이 바로 보낸다. 꺼 두었으면 그쪽을 시작하지 않아 나가지 않는다.
    enableNative: !off,
    sendDefaultPii: false,
    attachScreenshot: false,
    enableAutoSessionTracking: false,
    integrations: [Sentry.breadcrumbsIntegration({ console: false })],
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
    beforeSend: (event) => (reportOff ? null : scrubEvent(event)),
  });
}

/** 다른 준비보다 먼저 켜야 해서, 비동기 DB 준비를 기다리지 않고 저장된 끄기를 바로 읽는다. */
export function startSentry(): void {
  reportOff = readSettingSync('errorReportOff') === '1';
  init(reportOff);
}

export async function isErrorReportEnabled(): Promise<boolean> {
  return (await getSetting('errorReportOff')) !== '1';
}

/** 설정의 체크 칸. 끄면 그때부터 보내지 않는다. 로그아웃해도 유지한다 (src/sync/wipe.ts). 저장에 실패하면 지금 상태를 바꾸지 않는다. */
export async function saveErrorReportEnabled(enabled: boolean): Promise<void> {
  await setSetting('errorReportOff', enabled ? '0' : '1');
  reportOff = !enabled;
  if (!enabled) {
    // 네이티브 쪽도 멈춘다. JS의 beforeSend는 네이티브 기록을 막지 못한다.
    startedOff = true;
    await Sentry.close().catch(() => {});
    return;
  }
  if (startedOff) init(false);
}

let latestAccountId: string | null = null;

/** 설치 ID로 묶고, 로그인하면 계정 ID를 더한다. 로그아웃하면 null로 불러 계정 ID를 뗀다. 기다리는 사이 바뀌면 마지막 계정을 쓴다. */
export async function setErrorUser(accountId: string | null): Promise<void> {
  latestAccountId = accountId;
  const installId = await getDeviceId();
  Sentry.setUser(latestAccountId ? { id: installId, account_id: latestAccountId } : { id: installId });
}

export const reportScreenError = (error: unknown): void => { Sentry.captureException(error); };

export const wrapRoot = Sentry.wrap;
