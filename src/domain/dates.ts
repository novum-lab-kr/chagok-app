/**
 * 날짜 키 'YYYY-MM-DD'는 **로컬 날짜**다. toISOString()은 UTC로 바꿔 자정 근처에서 하루를 민다.
 * 문자열 비교가 곧 날짜 비교가 되도록 0을 채운다.
 */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKeyOf(year: number, month: number, day: number): DateKey {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function localDateKey(epochMs: number): DateKey {
  const d = new Date(epochMs);
  return dateKeyOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** 그 순간 기기 시간대가 UTC보다 몇 분 빠른가. 한국 540. */
export function tzOffsetMinutes(epochMs: number): number {
  return -new Date(epochMs).getTimezoneOffset();
}

/** 로컬 0시의 Date. */
export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayAfter(key: DateKey): DateKey {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + 1);
  return localDateKey(d.getTime());
}

/** from부터 to까지 양 끝을 포함한 날 수. 서머타임이 있어도 반올림으로 하루 단위가 된다. */
export function daysInclusive(from: DateKey, to: DateKey): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000) + 1;
}

/** 그 날 다음 날 0시(로컬)의 epoch ms. */
export function startOfDayAfter(key: DateKey): number {
  return parseDateKey(dayAfter(key)).getTime();
}

/** month는 1–12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthKeyOf(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}
