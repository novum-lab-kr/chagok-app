import { getDb } from '../db/client';

/**
 * 로그아웃·계정 삭제 뒤 기기를 새로 설치한 것처럼 비운다 (계정·백업 설계 ①). 서버 쪽 일이 성공한 뒤에만 부른다.
 * deviceId만 남긴다 — 시작 화면·튜토리얼 표시도 처음으로 돌아간다.
 * DB를 먼저 비우고 사진 파일은 그 뒤에 지운다: DB가 실패하면 사진이 남아 기록이 깨지지 않는다.
 */
export async function wipeDevice(removePhotoFiles: () => void): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.exec("DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox; DELETE FROM app_settings WHERE key <> 'deviceId';");
  });
  removePhotoFiles();
}
