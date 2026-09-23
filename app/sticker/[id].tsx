import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { RecordScreen, RetroScreen, PixelText } from '../../src/design-system';
import type { PocketGoal } from '../../src/design-system';
import { getSticker, removeSticker } from '../../src/repositories/stickerRepository';
import { getGoal } from '../../src/repositories/goalRepository';
import { listStickers } from '../../src/repositories/stickerRepository';
import { getRecord, upsertRecord } from '../../src/repositories/recordRepository';
import { toPocketGoal, localDateKey } from '../../src/app-data/pocketAdapter';

export default function StickerRecord() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<PocketGoal | null>(null);
  const [date, setDate] = useState('');
  const [memo, setMemo] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const s = await getSticker(id);
    if (!s) { router.back(); return; }
    const g = await getGoal(s.goalId);
    if (!g) { router.back(); return; }
    setGoal(toPocketGoal(g, await listStickers(g.id)));
    setDate(localDateKey(s.placedAt));
    const r = await getRecord(id);
    setMemo(r?.memo ?? '');
    setPhotoUri(r?.photoUri ?? null);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);

  if (!goal) return (
    <RetroScreen>
      <PixelText>불러오는 중</PixelText>
    </RetroScreen>
  );

  /** 권한을 거부해도 메모와 스티커는 계속 쓸 수 있어야 한다 (PRD 7절). */
  async function choosePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('사진 권한이 필요해요', '설정에서 사진 접근을 허용하면 사진을 붙일 수 있어요. 메모는 그대로 쓸 수 있어요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  /** 저장이 끝난 뒤에 화면을 닫는다. 성공 전에 완료로 표시하지 않는다 (PRD 7절). */
  async function save(nextMemo: string) {
    try {
      await upsertRecord(id, {
        photoUri,
        memo: nextMemo.trim().length > 0 ? nextMemo.trim() : null,
      });
      router.back();
    } catch {
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해주세요. 입력한 내용은 그대로 있어요.');
    }
  }

  function confirmRemove() {
    Alert.alert('스티커를 뗄까요?', '붙어 있던 기록도 함께 사라져요.', [
      { text: '그대로 둘게요', style: 'cancel' },
      {
        text: '뗄게요',
        style: 'destructive',
        onPress: () => { void (async () => { await removeSticker(id); router.back(); })(); },
      },
    ]);
  }

  return (
    <RecordScreen
      goal={goal}
      date={date}
      initialMemo={memo}
      photo={photoUri ? { uri: photoUri } : undefined}
      onChoosePhoto={() => { void choosePhoto(); }}
      onRemovePhoto={() => setPhotoUri(null)}
      onBack={() => router.back()}
      onSave={(m) => { void save(m); }}
      onRemoveSticker={confirmRemove}
    />
  );
}
