import { notifyBuyFailure, restoreWithDialog } from '../src/app-data/purchaseDialogs';
import type { DialogSpec } from '../src/app-data/useDialog';
import { restorePurchases as restoreMock } from '../src/purchases';

jest.mock('../src/design-system', () => ({
  stickerShopDialogs: {
    purchasePending: { title: '승인 대기' },
    restoreFailed: { title: '복원 실패' },
    restoreNone: { title: '되살릴 것 없음' },
    restoreDone: (names: readonly string[]) => ({ title: `되살림 ${names.join(',')}` }),
  },
}));
jest.mock('../src/purchases', () => ({ restorePurchases: jest.fn() }));
const restorePurchases = jest.mocked(restoreMock);

const failed = { title: '결제 실패' } as DialogSpec;
const asker = () => {
  const shown: string[] = [];
  const ask = jest.fn(async (spec: DialogSpec) => { shown.push(spec.title); return 'primary' as const; });
  return { ask, shown };
};

describe('결제가 끝나지 않았을 때 안내', () => {
  it('취소면 아무것도 띄우지 않는다', async () => {
    const { ask, shown } = asker();
    await notifyBuyFailure(ask, { ok: false, reason: 'cancelled' }, failed);
    expect(shown).toEqual([]);
  });
  it('보호자 승인 대기면 대기 안내, 실패면 화면이 넘긴 실패 안내', async () => {
    const { ask, shown } = asker();
    await notifyBuyFailure(ask, { ok: false, reason: 'pending' }, failed);
    await notifyBuyFailure(ask, { ok: false, reason: 'failed' }, failed);
    expect(shown).toEqual(['승인 대기', '결제 실패']);
  });
});

describe('구매 복원 안내', () => {
  it('실패하면 로딩을 끄고 실패 안내를 띄운 뒤 null', async () => {
    restorePurchases.mockRejectedValueOnce(new Error('network'));
    const { ask, shown } = asker();
    const order: string[] = [];
    const ask2 = jest.fn(async (spec: DialogSpec) => { order.push(`안내:${spec.title}`); return ask(spec); });
    expect(await restoreWithDialog(ask2, () => order.push('로딩 끔'))).toBeNull();
    expect(shown).toEqual(['복원 실패']);
    // 실패 안내가 떠 있는 동안에는 로딩 점이 남는다(전과 같은 순서)
    expect(order).toEqual(['안내:복원 실패', '로딩 끔']);
  });
  it('성공하면 로딩을 끄고, 화면 상태를 다시 읽은 뒤 결과를 안내한다', async () => {
    restorePurchases.mockResolvedValueOnce(['구독']);
    const order: string[] = [];
    const ask = jest.fn(async (spec: DialogSpec) => { order.push(`안내:${spec.title}`); return 'primary' as const; });
    expect(await restoreWithDialog(ask, () => order.push('로딩 끔'), async () => { order.push('다시 읽기'); })).toEqual(['구독']);
    expect(order).toEqual(['로딩 끔', '다시 읽기', '안내:되살림 구독']);
  });
  it('되살린 것이 없으면 없다고 안내한다', async () => {
    restorePurchases.mockResolvedValueOnce([]);
    const { ask, shown } = asker();
    await restoreWithDialog(ask, () => {});
    expect(shown).toEqual(['되살릴 것 없음']);
  });
});
