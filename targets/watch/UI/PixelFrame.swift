// 앱 PixelButton 틀 (src/design-system/geometry.ts pixelOutline, components.tsx PixelFrame): 계단 모서리, 잉크 3, 오른쪽 아래 그림자 2, 안쪽 밝은 선.
import SwiftUI

struct PixelOutline: Shape {
  var inset: CGFloat = 0
  var unit: CGFloat = 3

  func path(in rect: CGRect) -> Path {
    let x = rect.minX + inset, y = rect.minY + inset, r = rect.maxX - inset, b = rect.maxY - inset
    var p = Path()
    guard r > x, b > y else { return p }
    let u = min(unit, (r - x) / 4, (b - y) / 4)
    let pts: [(CGFloat, CGFloat)] = [
      (x + 2 * u, y), (r - 2 * u, y), (r - 2 * u, y + u), (r - u, y + u), (r - u, y + 2 * u), (r, y + 2 * u),
      (r, b - 2 * u), (r - u, b - 2 * u), (r - u, b - u), (r - 2 * u, b - u), (r - 2 * u, b), (x + 2 * u, b),
      (x + 2 * u, b - u), (x + u, b - u), (x + u, b - 2 * u), (x, b - 2 * u), (x, y + 2 * u), (x + u, y + 2 * u),
      (x + u, y + u), (x + 2 * u, y + u),
    ]
    p.move(to: CGPoint(x: pts[0].0, y: pts[0].1))
    for q in pts.dropFirst() { p.addLine(to: CGPoint(x: q.0, y: q.1)) }
    p.closeSubpath()
    return p
  }
}

/** 틀만. pressed면 얼굴이 그림자 쪽으로 2 내려간다 */
struct PixelFrameShape: View {
  let fill: Color
  var unit: CGFloat = 5
  var pressed = false
  private let border: CGFloat = 3, depth: CGFloat = 2

  var body: some View {
    GeometryReader { geo in
      let W = geo.size.width - 1, H = geo.size.height - depth
      let shape = PixelOutline(inset: border / 2, unit: unit)
      ZStack(alignment: .topLeading) {
        shape.fill(Palette.ink).overlay(shape.stroke(Palette.ink, lineWidth: border))
          .frame(width: W, height: H).offset(x: 1, y: depth)
        ZStack(alignment: .topLeading) {
          shape.fill(fill).overlay(shape.stroke(Palette.ink, style: StrokeStyle(lineWidth: border, lineJoin: .miter)))
          Path { p in
            p.move(to: CGPoint(x: 2 * unit + border + 2, y: border + 2)); p.addLine(to: CGPoint(x: W - 2 * unit - border - 2, y: border + 2))
            p.move(to: CGPoint(x: border + 2, y: 2 * unit + border + 2)); p.addLine(to: CGPoint(x: border + 2, y: H - 2 * unit - border - 2))
          }.stroke(Palette.ivory, lineWidth: 2)
        }
        .frame(width: W, height: H)
        .offset(y: pressed ? depth : 0)
      }
    }
  }
}

struct PixelButtonStyle: ButtonStyle {
  var fill: Color = Palette.apricot
  var unit: CGFloat = 5
  var leading = false
  var padding: CGFloat = 12

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.pixel(15))
      .foregroundStyle(Palette.ink)
      .padding(.horizontal, leading ? 10 : padding)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: leading ? .leading : .center)
      .padding(.bottom, 2)
      .offset(y: configuration.isPressed ? 2 : 0)
      .background(PixelFrameShape(fill: fill, unit: unit, pressed: configuration.isPressed))
  }
}

/** 뒤로: 작은 틀(계단 2)에 두께 4 픽셀 화살표 */
struct BackButton: View {
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      PixelView(map: Self.chevron, cell: 2)
    }
    .buttonStyle(HitArea(style: PixelButtonStyle(fill: Palette.ivory, unit: 2, padding: 0), size: 30, pad: Self.pad))
    .offset(x: -Self.pad.leading, y: -Self.pad.top)
    .accessibilityLabel("뒤로")
  }
  /** 보이는 틀은 30이지만 손가락이 닿는 곳은 화면 안쪽으로 넓힌다. 작은 워치(40~42mm)에서는 틀이 23pt까지 줄고 둥근 모서리 옆이라 빗나갔다 (2026-10-17 실기기) */
  static let pad = EdgeInsets(top: 12, leading: 14, bottom: 18, trailing: 6)
  static let chevron: PixelMap = { var p = PixelMap(); p.grid(["...##", "..##.", ".##..", "##...", ".##..", "..##.", "...##"], 0, 0); return p }()
}

/** 보이는 모양은 style 그대로 size 크기로 그리고, 누르는 곳만 pad만큼 넓힌다 */
struct HitArea<S: ButtonStyle>: ButtonStyle {
  let style: S
  let size: CGFloat
  let pad: EdgeInsets
  func makeBody(configuration: Configuration) -> some View {
    style.makeBody(configuration: configuration)
      .frame(width: size, height: size)
      .padding(pad)
      .contentShape(Rectangle())
  }
}
