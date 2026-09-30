import { describeIfServer, newUser } from './support';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

describeIfServer('사진 저장소', () => {
  it('자기 폴더에 올리고 받고 지울 수 있다', async () => {
    const a = await newUser();
    const path = `${a.userId}/r1.jpg`;
    const bucket = a.client.storage.from('record-photos');
    expect((await bucket.upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })).error).toBeNull();
    expect((await bucket.upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })).error).toBeNull();
    expect((await bucket.createSignedUrl(path, 60)).data?.signedUrl).toContain('record-photos');
    expect((await bucket.remove([path])).error).toBeNull();
  });

  it('남의 폴더에는 올릴 수 없고 남의 사진은 받을 수 없다', async () => {
    const a = await newUser(); const b = await newUser();
    await a.client.storage.from('record-photos').upload(`${a.userId}/r1.jpg`, jpeg, { contentType: 'image/jpeg' });
    expect((await b.client.storage.from('record-photos').upload(`${a.userId}/x.jpg`, jpeg, { contentType: 'image/jpeg' })).error).not.toBeNull();
    expect((await b.client.storage.from('record-photos').createSignedUrl(`${a.userId}/r1.jpg`, 60)).error).not.toBeNull();
  });

  // 앱은 이 코드로 "다시 보내도 소용없는 사진"을 가린다(SupabasePhotoStore). 서버가 코드를 바꾸면 여기서 잡는다.
  it('JPEG가 아니면 415, 5MB를 넘으면 413으로 거부한다', async () => {
    const a = await newUser();
    const bucket = a.client.storage.from('record-photos');
    const wrongType = await bucket.upload(`${a.userId}/r2.png`, jpeg, { contentType: 'image/png' });
    expect((wrongType.error as { statusCode?: string } | null)?.statusCode).toBe('415');
    const tooBig = await bucket.upload(`${a.userId}/r3.jpg`, new Uint8Array(5 * 1024 * 1024 + 1), { contentType: 'image/jpeg' });
    expect((tooBig.error as { statusCode?: string } | null)?.statusCode).toBe('413');
  });

  // 폴더 안의 폴더가 생기면 계정 삭제가 사진 폴더를 비우지 못한다.
  it('자기 폴더 바로 아래에만 올릴 수 있다 (하위 폴더 불가)', async () => {
    const a = await newUser();
    const { error } = await a.client.storage.from('record-photos')
      .upload(`${a.userId}/sub/r4.jpg`, jpeg, { contentType: 'image/jpeg' });
    expect(error).not.toBeNull();
  });
});
