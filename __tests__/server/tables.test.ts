import { describeIfServer, newUser } from './support';

describeIfServer('서버 테이블과 RLS', () => {
  it('로그인한 사용자는 자기 목표를 읽을 수 있다(처음엔 비어 있음)', async () => {
    const { client } = await newUser();
    const { data, error } = await client.from('goals').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('테이블에 직접 쓸 수 없다 (RPC로만 쓴다)', async () => {
    const { client, userId } = await newUser();
    const { error } = await client.from('goals').insert({
      user_id: userId, id: 'g1', name: 'x', board_type: 'tally', default_sticker_id: 'sprout', created_at: 1, updated_at: 1,
    });
    expect(error).not.toBeNull();
  });

  it('private 스키마(Apple 토큰)는 API로 보이지 않는다', async () => {
    const { client } = await newUser();
    const { error } = await client.schema('private').from('apple_tokens').select('user_id');
    expect(error).not.toBeNull();
  });
});
