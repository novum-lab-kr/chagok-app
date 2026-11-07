import { randomUUID } from 'expo-crypto';

/** 이 기기 사용자 본인. 서버 사용자 id 대신 기기 안에서만 쓰고, 서버와 주고받을 때 실제 id로 바꾼다. */
export const ME = 'me';

/** 서버가 받는 uuid v4(소문자). 목표, 스티커, 기록 id가 모두 이 모양이다. */
export function newId(): string {
  return randomUUID();
}
