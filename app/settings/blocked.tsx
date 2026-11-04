import { useEffect, useState } from 'react';
import { BlockedPeopleScreen, LoadingScreen, togetherDialogs, useLoadRetry } from '../../src/design-system';
import type { BlockedPerson } from '../../src/design-system';
import { actionDeps, blockedPeople, unblock } from '../../src/app-data/sharedGoalActions';
import type { ActionDeps } from '../../src/app-data/sharedGoalActions';
import { goBackOrHome } from '../../src/app-data/goBack';
import { useDialog } from '../../src/app-data/useDialog';
import { createSingleFlight } from '../../src/app-data/singleFlight';
import { SharedGoalError, errorMessage } from '../../src/sync/sharedGoals';
import { t } from '../../src/i18n';

/** 세션이 없으면 던진다(앱 설정은 로그인해 있을 때만 이 줄을 보이지만, 그사이 풀릴 수 있다). */
async function signedIn(): Promise<ActionDeps> {
  const d = await actionDeps();
  if (!d) throw new SharedGoalError('needs_login');
  return d;
}
const listOf = async (d: ActionDeps): Promise<BlockedPerson[]> =>
  (await blockedPeople(d)).map((r) => ({ id: r.userId, name: r.displayName }));

/**
 * 앱 설정 → 차단한 사람 (PRD 4.15). 최근 차단 먼저, 이름만 보인다(서버가 스티커와 목표 이름을 주지 않는다).
 * 목록은 서버에서 그때그때 읽고 기기에 두지 않는다.
 */
export default function BlockedPeople() {
  const [people, setPeople] = useState<BlockedPerson[] | null>(null);
  const [actOnce] = useState(createSingleFlight);
  const { ask, dialog } = useDialog();
  const { failed, attempt, fail, retry } = useLoadRetry();

  useEffect(() => {
    let alive = true;
    void signedIn().then(listOf).then((list) => { if (alive) setPeople(list); }).catch(() => { if (alive) fail(); });
    return () => { alive = false; };
  }, [attempt, fail]);

  /** [풀기]: 풀고 목록을 다시 읽는다. 실패하면 알리고 목록은 그대로다. */
  async function release(userId: string) {
    try {
      const d = await signedIn();
      await unblock(d, userId);
      setPeople(await listOf(d));
    } catch (error) {
      await ask(togetherDialogs.failed(t('failed.unblock'), errorMessage(error instanceof SharedGoalError ? error.word : 'network')));
    }
  }

  if (!people) return <LoadingScreen failed={failed} onRetry={retry} onHome={goBackOrHome} />;
  return (
    <>
      <BlockedPeopleScreen people={people} onUnblock={(id) => { void actOnce(() => release(id)); }} onBack={goBackOrHome} />
      {dialog}
    </>
  );
}
