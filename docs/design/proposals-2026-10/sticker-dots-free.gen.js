// 지금 무료 6종을 24칸 색 도트로 다시 그린 것
const {draw, pts, circle, ell, rbox, poly, U} = require('./sticker-dots.gen.js');
const star = (cx, cy, R, r) => poly(Array.from({length: 10}, (_, i) => { const t = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; return [cx + rr * Math.cos(t), cy + rr * Math.sin(t)]; }));
const F = {};
F.sprout = draw({
  layers: [
    ['leaf1', 'L', ell(8, 5.5, 4, 2.2, 0.45)], ['leaf2', 'L', ell(16, 5.5, 4, 2.2, -0.45)],
    ['body', 'I', ell(12, 15.5, 7.6, 6.8)],
  ],
  px: [...pts('12,7 12,8'), ...pts('9,14 9,15 15,14 15,15 11,17 12,17'), ...pts('7,17 17,17', 'A')],
});
F.shoe = draw({
  layers: [
    ['upper', 'A', poly([[3, 8], [9, 7.5], [11, 10], [17, 12], [21.5, 14], [21.5, 17], [2.5, 17]])],
    ['sole', 'I', rbox(12, 18.2, 10, 1.8, 0.8)],
  ],
  px: [...pts('8,10 10,11 12,12', 'I'), ...pts('9,10 11,11 13,12'), ...pts('4,10 4,11', 'I')],
});
F.book = draw({
  layers: [
    ['cover', 'A', rbox(12, 14, 11, 6.5, 1)],
    ['left', 'I', poly([[1.5, 6.5], [11.5, 8], [11.5, 19], [1.5, 18]])],
    ['right', 'I', poly([[12.5, 8], [22.5, 6.5], [22.5, 18], [12.5, 19]])],
  ],
  px: [...pts('4,10 5,10 6,10 7,10 8,10 4,13 5,13 6,13 7,13 8,13 15,10 16,10 17,10 18,10 19,10 15,13 16,13 17,13 18,13')],
});
{
  const petals = [0, 1, 2, 3, 4].map(k => { const t = -Math.PI / 2 + k * 2 * Math.PI / 5; return circle(12 + 4.6 * Math.cos(t), 9.5 + 4.6 * Math.sin(t), 3.6); });
  F.flower = draw({
    layers: [
      ['leafL', 'L', ell(8, 19, 3.6, 1.8, -0.5)], ['leafR', 'L', ell(16, 19, 3.6, 1.8, 0.5)],
      ['petals', 'A', U(...petals)],
      ['center', 'I', circle(12, 9.5, 2.8)],
    ],
    px: [...pts('12,15 12,16 12,17 12,18 12,19 12,20 12,21'), ...pts('11,9 13,9')],
  });
}
F.star = draw({
  layers: [['star', 'I', star(12, 12.8, 11, 5)]],
  px: [...pts('9,12 9,13 15,12 15,13 11,15 12,15'), ...pts('7,14 17,14', 'A')],
});
F.cat = draw({
  layers: [
    ['tail', 'A', ell(20, 12.5, 2.3, 5.5, 0.25)],
    ['body', 'A', U(ell(11, 13.5, 8.5, 7), poly([[3.5, 9], [4.5, 2.5], [9, 7]]), poly([[18.5, 9], [17.5, 2.5], [13, 7]]))],
  ],
  px: [...pts('8,12 8,13 14,12 14,13 10,15 11,16 12,15'), ...pts('5,5 17,5', 'I'), ...pts('6,15 16,15', 'I')],
});
module.exports = F;
