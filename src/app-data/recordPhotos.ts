import { Directory, File, Paths } from 'expo-file-system';

const folder = new Directory(Paths.document, 'record-photos');
const PREFIX = 'record-photo:';

export function displayRecordPhotoUri(storedUri: string): string {
  if (!storedUri.startsWith(PREFIX)) return storedUri;
  const name = storedUri.slice(PREFIX.length);
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error('잘못된 사진 경로');
  return new File(folder, name).uri;
}

/** Picker의 캐시 URI를 앱 문서 디렉터리에 보존한다. DB 저장 실패 시 호출자가 새 파일을 정리한다. */
export async function preserveRecordPhoto(stickerId: string, sourceUri: string): Promise<string> {
  folder.create({ idempotent: true, intermediates: true });
  const source = new File(sourceUri);
  if (!source.exists) throw new Error('선택한 사진을 찾을 수 없습니다.');
  const suffix = source.extension || '.jpg';
  const destination = new File(folder, `${stickerId}-${Date.now()}${suffix}`);
  try {
    await source.copy(destination);
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
  // 문서 디렉터리의 절대 경로는 앱 업데이트 시 바뀔 수 있어 파일명만 DB에 둔다.
  return PREFIX + destination.name;
}

/** 앱 사진 폴더의 새 파일과 DB에 둘 저장용 URI. 복원한 사진을 받을 때 쓴다. */
export function newManagedPhotoFile(name: string): { file: File; stored: string } {
  folder.create({ idempotent: true, intermediates: true });
  return { file: new File(folder, name), stored: PREFIX + name };
}

export function recordPhotoExists(uri: string): boolean {
  try { return new File(displayRecordPhotoUri(uri)).exists; } catch { return false; }
}

/** 앱이 소유한 사진만 지운다. 이전 버전의 외부 URI는 건드리지 않는다. */
export function removeManagedRecordPhoto(uri: string | null | undefined): void {
  if (!uri) return;
  const path = displayRecordPhotoUri(uri);
  if (!uri.startsWith(PREFIX) && !path.startsWith(folder.uri)) return;
  const file = new File(path);
  if (file.exists) file.delete();
}
