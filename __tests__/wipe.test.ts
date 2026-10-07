import { getDb } from '../src/db/client';
import { createGoal } from '../src/repositories/goalRepository';
import { getDeviceId, getFlag, getSetting, setFlag, setSetting } from '../src/repositories/appSettingsRepository';
import { subscribeLocalChange } from '../src/sync/changes';
import { pendingCount } from '../src/sync/outbox';
import { wipeDevice } from '../src/sync/wipe';
import { withFreshDb } from './support/setup';

withFreshDb();

it('기록·outbox·설정을 지우고 deviceId만 남긴 뒤 사진 파일을 지운다 → 다음 실행은 시작 화면부터', async () => {
  const device = await getDeviceId();
  await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
  await setFlag('tutorialDone', true); await setFlag('startDone', true);
  await setSetting('accountUserId', 'u1');
  let removed = 0;
  await wipeDevice(() => { removed += 1; });
  const db = await getDb();
  expect((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM goals'))?.n).toBe(0);
  expect(await pendingCount()).toEqual({ pending: 0, held: 0 });
  expect(await getSetting('accountUserId')).toBeNull();
  expect(await getFlag('tutorialDone')).toBe(false);
  expect(await getFlag('startDone')).toBe(false);
  expect(await getDeviceId()).toBe(device);
  expect(removed).toBe(1);
});

it('끝나면 로컬 변경 신호를 보낸다 (위젯 갱신)', async () => {
  let n = 0;
  const off = subscribeLocalChange(() => { n += 1; });
  await wipeDevice(() => {});
  off();
  expect(n).toBe(1);
});
