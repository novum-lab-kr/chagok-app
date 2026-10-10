import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ActionSymbol, RecordScreen, RetroScreen, PixelLoadingIndicator, PixelText } from '../../src/design-system';
import type { PocketGoal, StickerId } from '../../src/design-system';
import { getSticker, listStickers, removeSticker } from '../../src/repositories/stickerRepository';
import { getGoal } from '../../src/repositories/goalRepository';
import { getRecord, upsertRecord } from '../../src/repositories/recordRepository';
import { toPocketGoal } from '../../src/app-data/pocketAdapter';
import { normalizeStickerId } from '../../src/stickers/stickerIds';
import { displayRecordPhotoUri, preserveRecordPhoto, recordPhotoExists, removeManagedRecordPhoto } from '../../src/app-data/recordPhotos';
import { useUnsavedBack } from '../../src/app-data/useUnsavedBack';
import { saveOrNotify, useDialog } from '../../src/app-data/useDialog';
import { createSingleFlight } from '../../src/app-data/singleFlight';
import { goBackOrHome } from '../../src/app-data/goBack';
import { MEMO_MAX, memoError, needsRemoveConfirm } from '../../src/domain/board';
import { localDateKey, parseDateKey } from '../../src/domain/dates';
import type { Goal, Sticker } from '../../src/domain/types';

/**
 * 기록 (PRD 4.5). 사진·메모를 보고 고친다. 완성한 판의 기록은 읽기 전용이다 (4.7).
 * 읽기 전용 여부는 목표에서 읽는다. 링크로 열어도 맞도록 파라미터로 받지 않는다.
 */
export default function StickerRecord() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [pocketGoal, setPocketGoal] = useState<PocketGoal | null>(null);
  const [sticker, setSticker] = useState<Sticker | null>(null);
  const [stickerType, setStickerType] = useState<StickerId | undefined>(undefined);
  const [date, setDate] = useState('');
  const [memo, setMemo] = useState('');
  const [draftMemo, setDraftMemo] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [savedPhotoUri, setSavedPhotoUri] = useState<string | null>(null);
  const [photoMissing, setPhotoMissing] = useState(false);
  const [hasStoredRecord, setHasStoredRecord] = useState(false);
  const [saveOnce] = useState(createSingleFlight);
  const { ask, confirm, dialog: confirmDialog } = useDialog();
  const { goBack, dialog } = useUnsavedBack(draftMemo !== memo || photoUri !== savedPhotoUri);

  useEffect(() => {
    if (!id) return;
    // 화면을 떠난 뒤 도착한 응답으로 setState하거나 뒤로가기를 부르지 않는다.
    let alive = true;
    void (async () => {
      const s = await getSticker(id);
      if (!alive) return;
      if (!s) { goBackOrHome(); return; }
      const g = await getGoal(s.goalId);
      if (!alive) return;
      if (!g) { goBackOrHome(); return; }
      const siblings = await listStickers(g.id);
      const record = await getRecord(id);
      if (!alive) return;
      setGoal(g);
      setPocketGoal(toPocketGoal(g, siblings));
      setSticker(s);
      setStickerType(normalizeStickerId(s.stickerType));
      // 화면 표기는 시안과 같은 'YYYY년 M월 D일'. 저장 키(YYYY-MM-DD)를 그대로 보여주지 않는다.
      const d = parseDateKey(localDateKey(s.placedAt));
      setDate(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`);
      setMemo(record?.memo ?? '');
      setDraftMemo(record?.memo ?? '');
      setPhotoUri(record?.photoUri ?? null);
      setSavedPhotoUri(record?.photoUri ?? null);
      setPhotoMissing(!!record?.photoUri && !recordPhotoExists(record.photoUri));
      setHasStoredRecord(!!(record?.photoUri?.trim() || record?.memo?.trim()));
    })();
    return () => { alive = false; };
  }, [id]);

  if (!pocketGoal || !goal || !sticker) return (
    <RetroScreen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <PixelLoadingIndicator label="불러오는 중" />
      </View>
    </RetroScreen>
  );

  /** 권한을 거부해도 메모와 스티커는 계속 쓸 수 있어야 한다 (PRD 7절). */
  async function choosePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (await confirm({
        title: '사진에 접근할 수 없어요',
        description: '기기 설정에서 차곡차곡의 사진 접근을 허용하면 다시 첨부할 수 있어요. 메모는 계속 남길 수 있어요.',
        secondaryLabel: '메모만 남기기',
        primaryLabel: '기기 설정 열기',
      })) void Linking.openSettings();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoMissing(false);
    }
  }

  /** 저장이 끝난 뒤에 화면을 닫는다. 성공 전에 완료로 표시하지 않는다 (PRD 7절). */
  async function save(nextMemo: string) {
    let newPhotoUri: string | null = null;
    const ok = await saveOrNotify(ask, '저장하지 못했어요', async () => {
      try {
        if (photoUri && photoUri !== savedPhotoUri && !newPhotoUri) newPhotoUri = await preserveRecordPhoto(id, photoUri);
        await upsertRecord(id, {
          photoUri: newPhotoUri ?? photoUri,
          memo: nextMemo.trim().length > 0 ? nextMemo.trim() : null,
        });
      } catch (error) {
        if (newPhotoUri) {
          try { removeManagedRecordPhoto(newPhotoUri); } catch { /* 원본은 그대로 유지한다 */ }
          newPhotoUri = null;
        }
        throw error;
      }
    });
    if (!ok) return;
    if (savedPhotoUri && savedPhotoUri !== (newPhotoUri ?? photoUri)) {
      try { removeManagedRecordPhoto(savedPhotoUri); } catch { /* 저장된 기록은 유지한다 */ }
    }
    goBackOrHome();
  }

  /** 떼기. 기록이 있으면 확인한다 (PRD 4.5). 완성한 판도 뗀다 (2026-10-08). */
  async function remove() {
    if (needsRemoveConfirm(hasStoredRecord)) {
      if (!(await confirm({ title: '스티커를 뗄까요?', description: '사진·메모도 함께 사라져요.', secondaryLabel: '취소', primaryLabel: '떼기' }))) return;
    }
    let photo: string | null = null;
    const ok = await saveOrNotify(ask, '스티커를 떼지 못했어요', async () => { photo = await removeSticker(id); });
    if (!ok) return;
    try { removeManagedRecordPhoto(photo); } catch { /* 고아 파일로 남는다 */ }
    goBackOrHome();
  }

  return (
    <>
      <RecordScreen
        goal={pocketGoal}
        sticker={stickerType}
        date={date}
        initialMemo={memo}
        photo={photoUri && !photoMissing ? { uri: displayRecordPhotoUri(photoUri) } : undefined}
        photoPreview={photoMissing ? <View style={{ alignItems: 'center', gap: 12 }}><ActionSymbol name="photo" size={36}/><PixelText>사진을 불러올 수 없어요</PixelText></View> : undefined}
        onPhotoError={() => setPhotoMissing(true)}
        photoActionsInFrame
        onChoosePhoto={() => { void choosePhoto(); }}
        onRemovePhoto={() => { setPhotoUri(null); setPhotoMissing(false); }}
        onBack={goBack}
        onMemoChange={setDraftMemo}
        memoMaxLength={MEMO_MAX}
        memoError={memoError(draftMemo)}
        onSave={(m) => { void saveOnce(() => save(m)); }}
        onRemoveSticker={() => { void saveOnce(remove); }}
      />
      {dialog}
      {confirmDialog}
    </>
  );
}
