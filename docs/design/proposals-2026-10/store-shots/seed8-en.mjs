// 영어 스토어 스크린샷용 예시 데이터. seed8.mjs와 같은 목표, 스티커, 사진이고 목표 이름, 메모, 함께하는 사람 이름만 영어다.
// 스티커 이름은 앱이 기기 언어(영어)로 보여 준다. 앱을 끈 상태에서 넣는다.
// node seed8-en.mjs | sqlite3 <Documents/SQLite/chagok.db>
// node seed8-en.mjs --together | sqlite3 ...  함께 목표 두 개(09 한 판, 10 각자 판)도 넣는다. 다른 장은 함께 목표 없이 찍는다(한국어 세트와 같은 목록).
// 01 붙이기, 02 목표 목록, 07 위젯은 여기에 「자기 전 책 10쪽」 11번째 칸(10월 28일, basic.book)을 하나 더 붙인 뒤의 모습이다(15칸 중 11칸, 73%).
// 사진 파일 demo-*.png는 Documents/record-photos/에 따로 복사한다.
const TZ = 540;
const T = (d, h = 21) => Date.parse(`${d}T${String(h).padStart(2, '0')}:00:00+09:00`);
const q = (s) => (s == null ? 'NULL' : typeof s === 'number' ? String(s) : `'${String(s).replace(/'/g, "''")}'`);
const out = [];
const row = (table, obj) => out.push(`INSERT INTO ${table} (${Object.keys(obj).join(',')}) VALUES (${Object.values(obj).map(q).join(',')});`);
let n = 0;
const sid = () => `s-demo-${++n}`;

// 목표 하나 = goals 한 줄 + 나(me)의 goal_members 한 줄. 목록 순서는 1.0.0 화면과 같게 sort_order로 고정한다.
function goal(id, name, type, sticker, created, extra = {}) {
  row('goals', { id, mode: 'solo', owner_id: null, name, board_type: type, total_slots: extra.slots ?? null,
    initial_slots: extra.slots ?? null, end_date: extra.end ?? null, max_members: 1,
    created_at: T(created, 9), updated_at: T(created, 9) });
  row('goal_members', { goal_id: id, user_id: 'me', role: 'owner', display_name: null, sticker_id: sticker,
    sort_order: extra.order ?? null, completed_at: extra.completed ?? null, completion_seen: extra.completed ? 1 : 0,
    last_placed_at: extra.last ?? null, joined_at: T(created, 9), updated_at: T(created, 9) });
}
function stick(goalId, slot, type, date, hour) {
  const id = sid();
  row('stickers', { id, goal_id: goalId, placed_at: T(date, hour), slot_index: slot, sticker_type: type,
    updated_at: T(date, hour), date_key: date, tz_offset_min: TZ, board_user_id: 'me', placed_by: 'me' });
  out.push(`INSERT OR IGNORE INTO placed_days (date_key) VALUES ('${date}');`);
  return id;
}
const day = (d) => `2026-10-${String(d).padStart(2, '0')}`;
const memos = [];

// 1. 저녁 산책: 달력판, 10월. 몇 날은 비어 있다
goal('g-walk', 'Evening walk', 'calendar', 'basic.shoe', '2026-09-30', { last: T(day(26), 20), order: 2 });
for (let d = 1; d <= 26; d++) {
  if ([7, 13, 14, 20].includes(d)) continue;
  const id = stick('g-walk', d - 1, ['basic.shoe', 'basic.shoe', 'basic.flower', 'basic.shoe', 'basic.star', 'basic.sprout', 'basic.shoe'][d % 7], day(d), 20);
  if (d === 18) memos.push([id, 'The sunset was so pretty', T(day(d), 20), 'sunset']);
  if (d === 25) memos.push([id, 'The ginkgo leaves turned yellow', T(day(d), 21), 'tree']);
}
// 2. 자기 전 책 10쪽: 적립판 15칸, 10칸
goal('g-book', 'Read 10 pages', 'tally', 'basic.book', '2026-10-08', { slots: 15, last: T(day(26), 23), order: 0 });
[12, 14, 15, 17, 18, 19, 21, 23, 24, 26].forEach((d, i) => {
  const id = stick('g-book', i, [4, 8].includes(i) ? 'basic.star' : 'basic.book', day(d), 23);
  if (d === 19) memos.push([id, 'Finished a whole book!', T(day(d), 23), 'shelf']);
});
// 2-1. 물 2L 마시기: 적립판 12칸, 동물 스티커
goal('g-water', 'Drink 2L of water', 'tally', 'animals_normal.whale', '2026-10-15', { slots: 12, last: T(day(26), 18), order: 3 });
['whale', 'penguin', 'whale', 'frog', 'whale', 'turtle', 'whale', 'penguin'].forEach((a, i) => stick('g-water', i, `animals_normal.${a}`, day(16 + i), 18));
// 3. 오늘의 기분: 달력판, 감정 스티커
goal('g-mood', 'Today\'s mood', 'calendar', 'emotions_normal.happy', '2026-09-30', { last: T(day(26), 22), order: 1 });
const moods = ['happy', 'calm', 'excited', 'happy', 'sleepy', 'love', 'happy', 'sad', 'calm', 'happy', 'excited', 'shy',
  'happy', 'calm', 'love', 'surprised', 'happy', 'sleepy', 'happy', 'calm', 'excited', 'happy', 'love', 'confused', 'happy', 'happy'];
moods.forEach((m, i) => {
  const id = stick('g-mood', i, `emotions_normal.${m}`, day(i + 1), 22);
  if (i + 1 === 12) memos.push([id, 'A cup of warm tea', T(day(12), 22), 'tea']);
  if (i + 1 === 23) memos.push([id, 'Watched the clouds and rested', T(day(23), 22), 'clouds']);
});
// 4. 완성한 판: 아침 스트레칭 10번
goal('g-stretch', 'Morning stretch', 'tally', 'basic.flower', '2026-09-20', { slots: 10, completed: T('2026-10-02', 8), last: T('2026-10-02', 8), order: 4 });
for (let i = 0; i < 10; i++) {
  const d = new Date(Date.parse('2026-09-21') + i * 1.2 * 86400000).toISOString().slice(0, 10);
  stick('g-stretch', i, 'basic.flower', d, 8);
}

// 5. 함께 목표 (--together일 때만). 한국어 raw8의 together-one, together-each와 같은 칸 배치다.
//   친구 id는 예시 값이다(서버에 없음). 내 이름은 화면에 「Me」로 보인다.
if (process.argv.includes('--together')) {
  const MIA = 'f0000000-0000-4000-8000-00000000a001', LEO = 'f0000000-0000-4000-8000-00000000a002';
  const shared = (id, name, mode, slots, members, order) => {
    row('goals', { id, mode, owner_id: 'me', name, board_type: 'tally', total_slots: slots, initial_slots: slots, end_date: null,
      max_members: 5, created_at: T('2026-10-20', 9), updated_at: T('2026-10-20', 9) });
    members.forEach(([user, displayName, sticker], i) => row('goal_members', { goal_id: id, user_id: user, role: i ? 'member' : 'owner',
      display_name: displayName, sticker_id: sticker, sort_order: user === 'me' ? order : null, completed_at: null, completion_seen: 0,
      last_placed_at: T(day(27), 20), joined_at: T('2026-10-20', 9 + i), updated_at: T('2026-10-20', 9 + i) }));
  };
  const put = (goalId, slot, type, board, by, d) => {
    const id = sid();
    row('stickers', { id, goal_id: goalId, placed_at: T(d, 20), slot_index: slot, sticker_type: type, updated_at: T(d, 20),
      date_key: d, tz_offset_min: TZ, board_user_id: board, placed_by: by });
  };
  // 09 한 판에 같이: 20칸, 나 물방울 7칸 + Mia 고양이 5칸
  shared('g-one', 'Hydrate together', 'one', 20, [['me', 'Sam', 'basic.water'], [MIA, 'Mia', 'animals_normal.cat']], 5);
  ['me', MIA, 'me', MIA, MIA, 'me', 'me', MIA, 'me', MIA, 'me', 'me'].forEach((who, i) =>
    put('g-one', i, who === 'me' ? 'basic.water' : 'animals_normal.cat', null, who, day(16 + i)));
  // 10 각자 판: 15칸, 내 판 별 7칸, Mia 토끼 9칸, Leo 고양이 6칸
  shared('g-each', 'Walk 30 min a day', 'each', 15,
    [['me', 'Sam', 'basic.star'], [MIA, 'Mia', 'animals_normal.rabbit'], [LEO, 'Leo', 'basic.cat']], 6);
  for (let i = 0; i < 7; i++) put('g-each', i, 'basic.star', 'me', 'me', day(20 + i));
  for (let i = 0; i < 9; i++) put('g-each', i, 'animals_normal.rabbit', MIA, MIA, day(18 + i));
  for (let i = 0; i < 6; i++) put('g-each', i, 'basic.cat', LEO, LEO, day(21 + i));
}

memos.forEach(([stickerId, memo, at, photo], i) => row('records', { id: `r-demo-${i}`, sticker_id: stickerId, memo, created_at: at, updated_at: at,
  photo_uri: photo ? `record-photo:demo-${photo}.png` : null, visibility: 'self' }));
// 첫 실행 안내와 동의 시트가 화면을 덮지 않게 한다. analyticsOff=1은 「동의 안 함」과 같은 값(시트를 다시 띄우지 않음)
const settings = { adFree: '1', tutorialDone: '1', startDone: '1', reorderGuideDone: '1', firstStickerGuideDone: '1',
  analyticsOff: '1', trialCardDismissed: '14' };
for (const [key, value] of Object.entries(settings)) out.push(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (${q(key)}, ${q(value)});`);
console.log(['BEGIN;', 'DELETE FROM records; DELETE FROM stickers; DELETE FROM goal_members; DELETE FROM goals; DELETE FROM outbox; DELETE FROM placed_days;',
  ...out, 'COMMIT;'].join('\n'));
