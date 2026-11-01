/**
 * Sentry로 나가기 전에 개인을 알아볼 수 있는 값을 지운다 (prod-logs 계획 B2).
 * 네이티브를 불러오지 않는 순수 함수다.
 */

/** 주소의 앞 두 칸까지만 남긴다. 뒤쪽에는 사용자 ID와 파일 이름이, 쿼리에는 조회 값이 들어간다. */
export function scrubUrl(url: string): string {
  const matched = /^([a-z][a-z0-9+.-]*:\/\/[^/?#]+)([^?#]*)/i.exec(url);
  if (!matched) return '';
  const origin = matched[1] ?? '';
  const segments = (matched[2] ?? '').split('/').filter(Boolean).slice(0, 2);
  return segments.length > 0 ? `${origin}/${segments.join('/')}` : origin;
}

type BreadcrumbLike = { data?: Record<string, unknown> };

export function scrubBreadcrumb<Crumb extends BreadcrumbLike>(breadcrumb: Crumb): Crumb {
  const url = breadcrumb.data?.url;
  if (typeof url !== 'string') return breadcrumb;
  return { ...breadcrumb, data: { ...breadcrumb.data, url: scrubUrl(url) } };
}

type EventLike = {
  server_name?: string;
  breadcrumbs?: BreadcrumbLike[];
  contexts?: Record<string, Record<string, unknown> | null | undefined>;
};

/** 사용자가 정한 기기 이름(「은주의 iPhone」)이 실릴 수 있는 두 칸을 지운다. */
export function scrubEvent<Event extends EventLike>(event: Event): Event {
  const { server_name: _serverName, ...withCrumbs } = event;
  // 네이티브 쪽 기록은 beforeBreadcrumb를 거치지 않고 이벤트에 합쳐진다
  const rest = withCrumbs.breadcrumbs ? { ...withCrumbs, breadcrumbs: withCrumbs.breadcrumbs.map(scrubBreadcrumb) } : withCrumbs;
  const device = event.contexts?.device;
  if (!device) return rest as Event;
  const { name: _deviceName, ...keptDevice } = device;
  return { ...rest, contexts: { ...event.contexts, device: keptDevice } } as unknown as Event;
}
