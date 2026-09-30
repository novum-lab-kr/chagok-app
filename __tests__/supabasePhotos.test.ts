import { PhotoRejected } from '../src/sync/contract';
import { SupabasePhotoStore } from '../src/sync/supabasePhotos';
import type { PhotoIO, StorageBucket } from '../src/sync/supabasePhotos';

function setup(opts: { uploadError?: { message: string; status?: number; statusCode?: string } } = {}) {
  const uploads: string[] = []; const removed: string[][] = []; const saved: string[] = [];
  const bucket: StorageBucket = {
    upload: async (path) => { uploads.push(path); return { error: opts.uploadError ?? null }; },
    remove: async (paths) => { removed.push(paths); return { error: null }; },
    createSignedUrl: async (path) => ({ data: { signedUrl: `https://x/${path}?t=1` }, error: null }),
  };
  const io: PhotoIO = {
    compress: async (uri) => (uri === 'record-photo:없음.jpg' ? null : new Uint8Array([1])),
    save: async (url, recordId) => { saved.push(url); return `record-photo:${recordId}-restored.jpg`; },
  };
  return { store: new SupabasePhotoStore(bucket, 'u1', io), uploads, removed, saved };
}

describe('SupabasePhotoStore', () => {
  it('자기 폴더 경로로 올리고 그 경로를 돌려준다', async () => {
    const t = setup();
    expect(await t.store.upload('r1', 'record-photo:a.jpg')).toBe('u1/r1.jpg');
    expect(t.uploads).toEqual(['u1/r1.jpg']);
  });

  it('기기 원본이 없으면 올리지 않고 null', async () => {
    const t = setup();
    expect(await t.store.upload('r1', 'record-photo:없음.jpg')).toBeNull();
    expect(t.uploads).toEqual([]);
  });

  it('크기·형식 거부는 PhotoRejected, 그 밖은 일반 오류', async () => {
    await expect(setup({ uploadError: { message: 'too large', status: 400, statusCode: '413' } }).store.upload('r1', 'record-photo:a.jpg'))
      .rejects.toBeInstanceOf(PhotoRejected);
    await expect(setup({ uploadError: { message: 'bad type', status: 400, statusCode: '415' } }).store.upload('r1', 'record-photo:a.jpg'))
      .rejects.toBeInstanceOf(PhotoRejected);
    for (const uploadError of [{ message: 'rls', status: 400, statusCode: '403' }, { message: 'Network request failed' }]) {
      const other = await setup({ uploadError }).store.upload('r1', 'record-photo:a.jpg').catch((e: unknown) => e);
      expect(other).toBeInstanceOf(Error);
      expect(other).not.toBeInstanceOf(PhotoRejected);
    }
  });

  it('지우기와 받기는 기록 id의 경로를 쓴다', async () => {
    const t = setup();
    await t.store.remove('r1');
    expect(t.removed).toEqual([['u1/r1.jpg']]);
    expect(await t.store.download('u1/r2.jpg', 'r2')).toBe('record-photo:r2-restored.jpg');
    expect(t.saved).toEqual(['https://x/u1/r2.jpg?t=1']);
  });
});
