import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { displayRecordPhotoUri, newManagedPhotoFile } from '../app-data/recordPhotos';
import { PhotoRejected } from './contract';
import type { PhotoIO } from './supabasePhotos';

/** 계정·백업 설계 결정: 긴 변 1600px · JPEG 80%. */
const LONG_SIDE = 1600;

export const expoPhotoIO: PhotoIO = {
  async compress(storedUri) {
    let source: File;
    try { source = new File(displayRecordPhotoUri(storedUri)); } catch { return null; }
    if (!source.exists) return null;
    let savedUri: string;
    try {
      const original = await ImageManipulator.manipulate(source.uri).renderAsync();
      const context = ImageManipulator.manipulate(source.uri);
      if (Math.max(original.width, original.height) > LONG_SIDE) {
        context.resize(original.width >= original.height ? { width: LONG_SIDE, height: null } : { width: null, height: LONG_SIDE });
      }
      savedUri = (await (await context.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG })).uri;
    } catch (error) {
      throw new PhotoRejected(error instanceof Error ? error.message : '사진을 줄이지 못했어요');
    }
    const out = new File(savedUri);
    try {
      return await out.bytes();
    } finally {
      if (out.exists) out.delete();
    }
  },

  async save(url, recordId) {
    const { file, stored } = newManagedPhotoFile(`${recordId}-${Date.now()}.jpg`);
    await File.downloadFileAsync(url, file);
    return stored;
  },
};
