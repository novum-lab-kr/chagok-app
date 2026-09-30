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

  it('JPEG가 아니면 거부한다', async () => {
    const a = await newUser();
    const { error } = await a.client.storage.from('record-photos')
      .upload(`${a.userId}/r2.png`, jpeg, { contentType: 'image/png' });
    expect(error).not.toBeNull();
  });
});
