import { setDriverFactory } from '../../src/db/client';
import { createNodeDriver } from './nodeDriver';

/** 각 테스트마다 새 인메모리 DB를 꽂는다. */
export function withFreshDb(): void {
  beforeEach(() => {
    setDriverFactory(async () => createNodeDriver());
  });
}
