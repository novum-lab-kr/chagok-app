// 스토어 스크린샷용 예시 데이터. 앱을 끈 상태에서 시뮬레이터 앱 DB에 넣는다.
// node seed.mjs | sqlite3 <chagok.db 경로>
const TZ = 540;
const T = (d, h = 21) => Date.parse(`${d}T${String(h).padStart(2, '0')}:00:00+09:00`);
const q = (s) => (s == null ? 'NULL' : typeof s === 'number' ? String(s) : `'${String(s).replace(/'/g, "''")}'`);
const out = [];
const row = (table, obj) => out.push(`INSERT INTO ${table} (${Object.keys(obj).join(',')}) VALUES (${Object.values(obj).map(q).join(',')});`);
let n = 0;
const sid = () => `s-demo-${++n}`;

function goal(id, name, type, sticker, created, extra = {}) {
  row('goals', { id, name, board_type: type, total_slots: extra.slots ?? null, initial_slots: extra.slots ?? null,
    created_at: T(created, 9), default_sticker_id: sticker, end_date: extra.end ?? null,
    completed_at: extra.completed ?? null, completion_seen: extra.completed ? 1 : 0,
    last_placed_at: extra.last ?? null, updated_at: T(created, 9) });
}
function stick(goalId, slot, type, date, hour) {
  const id = sid();
  row('stickers', { id, goal_id: goalId, placed_at: T(date, hour), slot_index: slot, sticker_type: type,
    updated_at: T(date, hour), date_key: date, tz_offset_min: TZ });
  out.push(`INSERT OR IGNORE INTO placed_days (date_key) VALUES ('${date}');`);
  return id;
}
const day = (d) => `2026-10-${String(d).padStart(2, '0')}`;
const memos = [];

// 1. 저녁 산책: 달력판, 10월. 몇 날은 비어 있다(끊겨도 괜찮아요)
goal('g-walk', '저녁 산책', 'calendar', 'basic.shoe', '2026-09-30', { last: T(day(26), 20) });
for (let d = 1; d <= 26; d++) {
  if ([7, 13, 14, 20].includes(d)) continue;
  const id = stick('g-walk', d - 1, ['basic.shoe', 'basic.shoe', 'basic.flower', 'basic.shoe', 'basic.star', 'basic.sprout', 'basic.shoe'][d % 7], day(d), 20);
  if (d === 18) memos.push([id, '노을이 예뻤다', T(day(d), 20), 'sunset']);
  if (d === 25) memos.push([id, '은행잎이 노랗게 물들었다', T(day(d), 21), 'tree']);
}
// 2. 자기 전 책 10쪽: 적립판 15칸, 10칸
goal('g-book', '자기 전 책 10쪽', 'tally', 'basic.book', '2026-10-08', { slots: 15, last: T(day(26), 23) });
[12, 14, 15, 17, 18, 19, 21, 23, 24, 26].forEach((d, i) => {
  const id = stick('g-book', i, [4, 8].includes(i) ? 'basic.star' : 'basic.book', day(d), 23);
  if (d === 19) memos.push([id, '한 권 다 읽었다!', T(day(d), 23), 'shelf']);
});
// 2-1. 물 2L 마시기: 적립판 12칸, 동물 스티커
goal('g-water', '물 2L 마시기', 'tally', 'animals_normal.whale', '2026-10-15', { slots: 12, last: T(day(26), 18) });
['whale', 'penguin', 'whale', 'frog', 'whale', 'turtle', 'whale', 'penguin'].forEach((a, i) => stick('g-water', i, `animals_normal.${a}`, day(16 + i), 18));
// 3. 오늘의 기분: 달력판, 감정 스티커를 섞어 붙인다
goal('g-mood', '오늘의 기분', 'calendar', 'emotions_normal.happy', '2026-09-30', { last: T(day(26), 22) });
const moods = ['happy', 'calm', 'excited', 'happy', 'sleepy', 'love', 'happy', 'sad', 'calm', 'happy', 'excited', 'shy',
  'happy', 'calm', 'love', 'surprised', 'happy', 'sleepy', 'happy', 'calm', 'excited', 'happy', 'love', 'confused', 'happy', 'happy'];
moods.forEach((m, i) => {
  const id = stick('g-mood', i, `emotions_normal.${m}`, day(i + 1), 22);
  if (i + 1 === 12) memos.push([id, '따뜻한 차 한 잔', T(day(12), 22), 'tea']);
  if (i + 1 === 23) memos.push([id, '구름 구경하며 쉬었다', T(day(23), 22), 'clouds']);
});
// 4. 완성한 판: 아침 스트레칭 10번
goal('g-stretch', '아침 스트레칭', 'tally', 'basic.flower', '2026-09-20', { slots: 10, completed: T('2026-10-02', 8), last: T('2026-10-02', 8) });
for (let i = 0; i < 10; i++) {
  const d = new Date(Date.parse('2026-09-21') + i * 1.2 * 86400000).toISOString().slice(0, 10);
  stick('g-stretch', i, 'basic.flower', d, 8);
}

memos.forEach(([stickerId, memo, at, photo], i) => row('records', { id: `r-demo-${i}`, sticker_id: stickerId, memo, created_at: at, updated_at: at,
  photo_uri: photo ? `record-photo:demo-${photo}.png` : null }));
row('app_settings', { key: 'adFree', value: '1' });
console.log(['BEGIN;', 'DELETE FROM records; DELETE FROM stickers; DELETE FROM goals; DELETE FROM outbox; DELETE FROM placed_days;',
  "DELETE FROM app_settings WHERE key='adFree';", ...out, 'COMMIT;'].join('\n'));
