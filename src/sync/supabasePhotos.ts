import { PhotoRejected } from './contract';
import type { PhotoStore } from './contract';

type StorageError = { message: string; status?: number | string; statusCode?: number | string };
/** supabase-js storage.from(bucket)에서 쓰는 부분. 테스트에서 바꿔 끼운다. */
export type StorageBucket = {
  upload(path: string, body: Uint8Array, options: { contentType: string; upsert: boolean }): PromiseLike<{ error: StorageError | null }>;
  remove(paths: string[]): PromiseLike<{ error: StorageError | null }>;
  createSignedUrl(path: string, expiresIn: number): PromiseLike<{ data: { signedUrl: string } | null; error: StorageError | null }>;
};
/** 기기 쪽 사진 입출력. 실제 구현은 expoPhotoIO. */
export type PhotoIO = {
  /** 저장용 URI의 기기 파일을 긴 변 1600px·JPEG 80%로 줄인 바이트. 파일이 없으면 null. 못 읽으면 PhotoRejected. */
  compress(storedUri: string): Promise<Uint8Array | null>;
  /** URL에서 받아 앱 사진 폴더에 두고 저장용 URI('record-photo:...')를 돌려준다. */
  save(url: string, recordId: string): Promise<string>;
};

/**
 * 다시 보내도 같은 결과인 거부: 너무 큼(413), 형식(415).
 * Storage는 HTTP status를 늘 400으로 주고 실제 구분은 statusCode에 담는다(2026-09-30 개발 서버에서 확인).
 * 그래서 status는 보지 않는다 — 권한(403)·네트워크 오류는 다시 시도한다.
 */
function isPhotoRejection(error: StorageError): boolean {
  const code = String(error.statusCode ?? '');
  return code === '413' || code === '415';
}

/** PhotoStore를 Supabase Storage로 (계정·백업 설계 ③). 경로는 {user_id}/{record_id}.jpg. */
export class SupabasePhotoStore implements PhotoStore {
  constructor(private readonly bucket: StorageBucket, private readonly userId: string, private readonly io: PhotoIO) {}

  private path(recordId: string): string {
    return `${this.userId}/${recordId}.jpg`;
  }

  async upload(recordId: string, storedUri: string): Promise<string | null> {
    const bytes = await this.io.compress(storedUri);
    if (!bytes) return null;
    const { error } = await this.bucket.upload(this.path(recordId), bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) throw isPhotoRejection(error) ? new PhotoRejected(error.message) : new Error(error.message);
    return this.path(recordId);
  }

  async remove(recordId: string): Promise<void> {
    const { error } = await this.bucket.remove([this.path(recordId)]);
    if (error) throw new Error(error.message);
  }

  async download(remotePath: string, recordId: string): Promise<string> {
    const { data, error } = await this.bucket.createSignedUrl(remotePath, 60);
    if (error || !data) throw new Error(error?.message ?? '사진 주소를 받지 못했어요');
    return this.io.save(data.signedUrl, recordId);
  }
}
