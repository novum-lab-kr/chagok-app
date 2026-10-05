// 별: 한 칸씩 직접. 위 뿔과 아래 두 다리를 같은 굵기·길이로 (사용자 메모 2026-10-05)
const rows = [
  '........................',
  '........................',
  '...........KK...........',
  '..........KLBK..........',
  '..........KLBK..........',
  '.........KLBBBK.........',
  '.........KBBBBK.........',
  '..KKKKKKKBBBBBBKKKKKKK..',
  '..KLLBBBBBBBBBBBBBBBBK..',
  '...KBBBBBBBBBBBBBBBBK...',
  '....KBBBBBBBBBBBBBBK....',
  '.....KBBWEBBBBWEBBK.....',
  '.....KBBEEBBBBEEBBK.....',
  '.....KBPBBBEEBBBPBK.....',
  '.....KBBBBBBBBBBBBK.....',
  '....KBBBBBBBBBBBBBSK....',
  '....KBBBBBKKKKBBBBSK....',
  '....KBBBK......KBBSK....',
  '...KBBBK........KBBSK...',
  '...KBBK..........KBSK...',
  '..KBSK............KSSK..',
  '..KKK..............KKK..',
  '........................',
  '........................',
];
const C = {K: '#1A1426', B: '#FFD25E', S: '#E0A030', L: '#FFF2B8', E: '#1A1426', W: '#FFFFFF', P: '#F58A8A'};
rows.forEach((r, i) => { if (r.length !== 24) throw new Error(`row ${i} len ${r.length}`); });
module.exports = rows.map(r => [...r].map(ch => C[ch] || null));
