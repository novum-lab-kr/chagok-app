import { randomUUID as nodeRandomUUID } from 'node:crypto';

/** jest에는 expo-crypto 네이티브 모듈이 없어 node의 것으로 잇는다. */
export function randomUUID(): string {
  return nodeRandomUUID();
}
