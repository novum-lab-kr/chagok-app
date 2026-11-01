/**
 * 앱 이벤트 기록의 한 곳. 화면과 저장 코드는 여기의 track, screen만 부른다. 도구를 바꿔도 posthog.ts만 고친다.
 * 네이티브 모듈을 불러오지 않는다 (jest가 node에서 돌린다). 도구 연결은 posthog.ts가 setAnalyticsClient로 넣는다.
 *
 * 속성 타입은 숫자, 불리언, 정해진 낱말만 받는다. 목표 이름, 메모, 사진, 이메일 같은 자유 문자열이
 * 들어갈 자리를 만들지 않으려고 string을 쓰지 않는다. 이름 표: docs/PRD.md 「이벤트 기록」.
 */
type LoginMethod = 'apple' | 'google' | 'kakao' | 'dev';
/** pending: 보호자 승인을 기다린다 (src/purchases BuyResult) */
type PurchaseResult = 'success' | 'cancel' | 'fail' | 'pending';

/** 어디서 한 동작인가. widget, watch는 앱이 요청을 처리한 때 남아 이벤트 시각이 누른 시각과 다를 수 있다. */
export type ActionSource = 'app' | 'widget' | 'watch';

export type AnalyticsEvents = {
  app_open: { source: 'cold' | 'foreground' };
  login_start: { method: LoginMethod };
  login_success: { method: LoginMethod };
  login_cancel: { method: LoginMethod };
  login_fail: { method: LoginMethod };
  logout: undefined;
  account_delete: undefined;
  goal_create: { board_type: 'calendar' | 'tally'; slot_count?: number };
  /** period_end: 종료일이 지나 앱이 자동으로 완성했다 */
  goal_complete: { source: ActionSource | 'period_end' };
  goal_delete: undefined;
  goal_extend: undefined;
  sticker_place: { board_type: 'calendar' | 'tally'; source: ActionSource };
  sticker_remove: { source: ActionSource };
  record_save: { has_photo: boolean; has_memo: boolean };
  tutorial_start: undefined;
  tutorial_step: { step: number };
  tutorial_skip: { step: number };
  tutorial_finish: undefined;
  purchase_start: { product: 'pack' | 'ad_free' };
  purchase_result: { product: 'pack' | 'ad_free'; result: PurchaseResult };
  restore_result: { result: 'success' | 'fail' };
  ad_rewarded_start: undefined;
  ad_rewarded_result: { result: 'earned' | 'closed' | 'unavailable' };
  ad_banner_show: undefined;
};

export type EventName = keyof AnalyticsEvents;
type EventProperties = Record<string, number | boolean | string>;

/** 도구가 지켜야 할 모양. 실패해도 앱 동작을 막지 않도록 부르는 쪽에서 감싼다. */
export type AnalyticsClient = {
  capture(name: string, properties?: EventProperties): void;
  screen(name: string): void;
  identify(userId: string): void;
  /** 기기에 저장된 계정 ID가 있는가. 앱을 다시 켜도 남아 있어 메모리 값으로는 알 수 없다. */
  isIdentified(): boolean;
  /** 기기에 쌓여 아직 나가지 않은 이벤트를 버린다. 철회 뒤에는 나가면 안 된다. */
  clearQueue(): void;
  reset(): void;
  setEnabled(enabled: boolean): void;
};

type Pending =
  | { kind: 'capture'; name: string; properties?: EventProperties }
  | { kind: 'screen'; name: string };

/** 동의한 사용자의 도구가 준비되기 전 몇 초 동안만 쌓이므로 이 정도면 충분하다. 넘치면 오래된 것부터 버린다. */
const PENDING_MAX = 50;

let client: AnalyticsClient | null = null;
/**
 * 사용 기록은 동의한 경우에만 보낸다 (PRD 8.2, 2026-11-01 결정).
 * null은 저장된 선택을 읽기 전이다. 그동안의 이벤트는 메모리에만 두고, 동의하지 않았다고 확인되면 바로 버린다.
 */
let enabled: boolean | null = null;
let pending: Pending[] = [];
let loggedInUser: string | null = null;
let identifiedUser: string | null = null;
/** 로그아웃을 이미 들었다. 도구가 연결되기 전에 들었으면 연결할 때 비운다. */
let loggedOut = false;

function safely(call: (active: AnalyticsClient) => void): void {
  if (!client) return;
  try {
    call(client);
  } catch {
    // 기록 실패가 사용자의 동작을 막으면 안 된다
  }
}

function send(item: Pending): void {
  if (item.kind === 'capture') safely((active) => active.capture(item.name, item.properties));
  else safely((active) => active.screen(item.name));
}

function deliver(item: Pending): void {
  if (enabled === false) return;
  if (client) {
    send(item);
    return;
  }
  pending.push(item);
  if (pending.length > PENDING_MAX) pending.shift();
}

function identifyIfNeeded(): void {
  if (!enabled || !client || !loggedInUser || loggedInUser === identifiedUser) return;
  const userId = loggedInUser;
  identifiedUser = userId;
  safely((active) => active.identify(userId));
}

export function track<Name extends EventName>(
  ...[name, properties]: AnalyticsEvents[Name] extends undefined
    ? [name: Name]
    : [name: Name, properties: AnalyticsEvents[Name]]
): void {
  deliver({ kind: 'capture', name, properties: properties as EventProperties | undefined });
}

/** 튜토리얼 부품(FirstRunTutorial)의 onProgress에 넘긴다. */
export function trackTutorial({ kind, step }: { kind: 'start' | 'step' | 'skip' | 'finish'; step: number }): void {
  if (kind === 'start') track('tutorial_start');
  else if (kind === 'skip') track('tutorial_skip', { step });
  else if (kind === 'finish') track('tutorial_finish');
  else track('tutorial_step', { step });
}

/** 배너가 여러 번 새로 불려도 앱을 켠 동안 한 번만 남긴다. */
let bannerShown = false;
export function trackBannerShown(): void {
  if (bannerShown) return;
  bannerShown = true;
  track('ad_banner_show');
}

/** 라우트 패턴만 넘긴다. 목표 ID 같은 실제 값이 들어간 주소를 넘기지 않는다. */
export function screen(name: string): void {
  deliver({ kind: 'screen', name });
}

export function identifyUser(userId: string): void {
  loggedInUser = userId;
  loggedOut = false;
  identifyIfNeeded();
}

/** 저장된 계정 ID를 지운다. 도구의 reset은 끄기 상태까지 지우므로 바로 다시 적용한다. */
function clearStoredUser(): void {
  identifiedUser = null;
  safely((active) => {
    if (!active.isIdentified()) return;
    active.reset();
    active.setEnabled(enabled === true);
  });
}

/** 로그아웃, 계정 삭제. 스위치를 끈 동안이나 앱을 다시 켠 뒤에도 저장된 계정 ID를 지운다. */
export function resetUser(): void {
  loggedInUser = null;
  loggedOut = true;
  clearStoredUser();
}

/** 철회 뒤에는 쌓인 이벤트와 계정 ID를 기기에 남기지 않는다. PostHog의 끄기와 reset은 대기열을 비우지 않는다. */
function forgetStored(): void {
  safely((active) => active.clearQueue());
  clearStoredUser();
}

/** 동의와 철회. 저장은 부르는 쪽이 한다. */
export function setAnalyticsEnabled(next: boolean): void {
  enabled = next;
  if (!next) pending = [];
  safely((active) => active.setEnabled(next));
  if (!next) forgetStored();
  identifyIfNeeded();
}

export function setAnalyticsClient(next: AnalyticsClient): void {
  client = next;
  safely((active) => active.setEnabled(enabled === true));
  if (enabled === false) forgetStored();
  // 모아 둔 이벤트가 지난 계정 ID로 나가지 않게 먼저 지운다
  if (loggedOut) clearStoredUser();
  const waiting = pending;
  pending = [];
  waiting.forEach(send);
  identifyIfNeeded();
}

export function __resetAnalyticsForTest(): void {
  client = null;
  enabled = null;
  pending = [];
  loggedInUser = null;
  identifiedUser = null;
  loggedOut = false;
}
