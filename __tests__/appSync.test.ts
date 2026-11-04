import { syncDepsFor } from '../src/sync/appSync';
import { removeManagedRecordPhoto } from '../src/app-data/recordPhotos';
import { subscribeSlotTaken } from '../src/sync/slotTaken';

jest.mock('../src/app-data/recordPhotos', () => ({ removeManagedRecordPhoto: jest.fn() }));
jest.mock('../src/sync/expoPhotoIO', () => ({ expoPhotoIO: {} }));
jest.mock('../src/sync/supabasePhotos', () => ({ SupabasePhotoStore: class {} }));
jest.mock('../src/repositories/appSettingsRepository', () => ({ getDeviceId: async () => 'dev1' }));

describe('syncDepsFor', () => {
  it('onSlotTaken은 지운 기록의 기기 사진을 지우고 그 목표의 구독자에게 알린다', async () => {
    const supabase = { rpc: jest.fn(), storage: { from: () => ({}) } } as never;
    const deps = await syncDepsFor(supabase, 'u1');
    const heard: string[] = [];
    const off = subscribeSlotTaken((goalId) => heard.push(goalId));
    deps.onSlotTaken?.('s1', 'record-photo:a.jpg', 'g1');
    off();
    expect(removeManagedRecordPhoto).toHaveBeenCalledWith('record-photo:a.jpg');
    expect(heard).toEqual(['g1']);
  });
});
