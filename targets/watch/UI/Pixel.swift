// 픽셀 그림 (시안 14판 Pix()와 같은 방식): 칸 단위로 찍고 Canvas로 그린다. 좌표는 음수도 된다.
import SwiftUI

enum Palette {
  static let ink = Color(hex: "#06261C")
  static let lcd = Color(hex: "#C7DE94")
  static let apricot = Color(hex: "#FD855F")
  static let ivory = Color(hex: "#FEF1D1")
  static let mint = Color(hex: "#AFE1CB")
  /** 묶음 표시의 꺼진 점, 작은 판의 앞날 */
  static let dim = Color(hex: "#7F9A6A")
  static let font = "NeoDunggeunmo-Regular"
}

extension Font {
  static func pixel(_ size: CGFloat) -> Font { .custom(Palette.font, size: size) }
}

extension Color {
  init(hex: String) {
    let s = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    let v = UInt64(s, radix: 16) ?? 0
    self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
  }
}

struct PixelMap {
  private(set) var cells: [Point: Color] = [:]
  struct Point: Hashable { let x: Int; let y: Int }

  static let legend: [Character: Color] = ["#": Palette.ink, "g": Palette.lcd, "o": Palette.apricot, "w": Palette.ivory, "m": Palette.mint]

  mutating func put(_ x: Int, _ y: Int, _ c: Color) { cells[Point(x: x, y: y)] = c }
  mutating func rect(_ x: Int, _ y: Int, _ w: Int, _ h: Int, _ c: Color) {
    for j in 0..<h { for i in 0..<w { put(x + i, y + j, c) } }
  }
  mutating func grid(_ rows: [String], _ ox: Int, _ oy: Int) {
    for (y, r) in rows.enumerated() {
      for (x, ch) in r.enumerated() { if let c = Self.legend[ch] { put(ox + x, oy + y, c) } }
    }
  }
}

/** box: 그릴 범위(칸). 없으면 찍힌 칸 전체 */
struct PixelView: View {
  let map: PixelMap
  let cell: CGFloat
  var box: (x0: Int, y0: Int, x1: Int, y1: Int)? = nil

  private var bounds: (x0: Int, y0: Int, x1: Int, y1: Int) {
    if let box { return box }
    let xs = map.cells.keys.map(\.x), ys = map.cells.keys.map(\.y)
    return (xs.min() ?? 0, ys.min() ?? 0, xs.max() ?? 0, ys.max() ?? 0)
  }

  var body: some View {
    let b = bounds
    Canvas { ctx, _ in
      for (p, c) in map.cells where p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1 {
        // 이웃 칸과 틈이 보이지 않게 조금 크게 칠한다
        ctx.fill(Path(CGRect(x: CGFloat(p.x - b.x0) * cell, y: CGFloat(p.y - b.y0) * cell, width: cell + 0.3, height: cell + 0.3)), with: .color(c))
      }
    }
    .frame(width: CGFloat(b.x1 - b.x0 + 1) * cell, height: CGFloat(b.y1 - b.y0 + 1) * cell)
    .accessibilityHidden(true)
  }
}

/** 차곡이와 블록, 묶음, 보관함 (시안 chagok(), board(), bundleOf('x1'), shelfSvg()) */
enum Sprite {
  /** 머리 위 블록의 가로 자리(셋째는 보관하기 직전에만 보인다) */
  static let headX = [8, 9, 7]
  /** 차곡이 그림의 범위: 머리 위 블록 셋까지 같은 크기로 그려 발 위치가 흔들리지 않게 */
  static let chagokBox = (x0: 0, y0: 2, x1: 23, y1: 22)

  static func block(_ p: inout PixelMap, _ x: Int, _ y: Int, _ c: Color) {
    p.rect(x, y, 8, 4, Palette.ink); p.rect(x + 1, y + 1, 6, 2, c)
  }

  static func chagok(face: String, heads: [Color]) -> PixelMap {
    var p = PixelMap()
    let oy = 12
    if heads.isEmpty { p.grid(CharacterArt.crown, 0, oy - 2) }
    p.grid(CharacterArt.bodies[face] ?? CharacterArt.bodies["basic"]!, 0, oy)
    for (i, c) in heads.prefix(3).enumerated() { block(&p, headX[i % 3], oy - 4 - 3 * i, c) }
    return p
  }

  static func blockMap(_ c: Color) -> PixelMap { var p = PixelMap(); block(&p, 0, 0, c); return p }

  /** 얇은 묶음: 판 세 장을 눌러 꽂은 모양 3×7 */
  static func bundle(_ p: inout PixelMap, _ x: Int, _ y: Int) {
    p.rect(x, y, 3, 7, Palette.ink); p.put(x + 1, y + 1, Palette.apricot); p.put(x + 1, y + 3, Palette.ivory); p.put(x + 1, y + 5, Palette.mint)
  }
  static func bundleMap() -> PixelMap { var p = PixelMap(); bundle(&p, 0, 0); return p }

  /** 보관함 안 j번째 묶음 자리(칸). 2단 × 4칸, 칸마다 둘 */
  static func slot(_ j: Int) -> (x: Int, y: Int) {
    let c = j / 2, h = j % 2
    return (2 + (c % 4) * 7 + h * 3, 2 + (c / 4) * 9)
  }

  static func box(filled: Int) -> PixelMap {
    var p = PixelMap()
    p.rect(0, 0, 31, 19, Palette.ink); p.rect(1, 1, 29, 8, Palette.ivory); p.rect(1, 10, 29, 8, Palette.ivory)
    for j in 0..<min(filled, Growth.bundlesPerBox) { let s = slot(j); bundle(&p, s.x, s.y) }
    return p
  }
}

