// 워치 차곡이 픽셀 데이터를 Swift로 굽는다(PRD 4.14, 워치 계획 2).
// node scripts/build-watch-art.mjs → targets/watch/UI/CharacterArt.generated.swift
// 몸은 표정마다 원본 24줄 중 12~22줄(시안 chagok()과 같다), 머리 위 블록이 없을 때의 정수리는 b0의 10~11줄.
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('docs/design/character/character-data.json', 'utf8'));
const FACES = ['basic', 'smile', 'grin', 'excited', 'surprised', 'sleepy'];
const rows = (list) => list.map((r) => `      "${r}",`).join('\n');

const out = `// 생성 파일 — 직접 고치지 않는다. node scripts/build-watch-art.mjs로 다시 만든다.
// 원본: docs/design/character/character-data.json. 글자: . 투명, # 잉크, g LCD, o 살구, w 아이보리, m 민트

enum CharacterArt {
  /** 표정별 몸 11줄 × 24칸 */
  static let bodies: [String: [String]] = [
${FACES.map((f) => `    "${f}": [\n${rows(data.faces[f].slice(12, 23))}\n    ],`).join('\n')}
  ]
  /** 머리 위 블록이 없을 때 몸 위 2줄(정수리) */
  static let crown: [String] = [
${rows(data.blockStates.b0.slice(10, 12))}
  ]
}
`;
fs.writeFileSync('targets/watch/UI/CharacterArt.generated.swift', out);
