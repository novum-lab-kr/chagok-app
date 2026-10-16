// 화면 공통: 46mm(208×248pt) 기준으로 그리고 다른 크기는 비율로 맞춘다(워치 설계 「화면」).
import SwiftUI

enum Layout {
  static let width: CGFloat = 208
  static let height: CGFloat = 248
}

/** 208×248 좌표로 그린 화면을 실제 화면 크기에 맞춘다 */
struct Screen<Content: View>: View {
  @ViewBuilder var content: Content
  var body: some View {
    GeometryReader { geo in
      let s = min(geo.size.width / Layout.width, geo.size.height / Layout.height)
      ZStack(alignment: .topLeading) { content }
        .frame(width: Layout.width, height: Layout.height, alignment: .topLeading)
        .scaleEffect(s, anchor: .topLeading)
        .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
        .offset(x: (geo.size.width - Layout.width * s) / 2, y: (geo.size.height - Layout.height * s) / 2)
    }
    .background(Palette.lcd)
    .ignoresSafeArea()
  }
}

struct StickerImage: View {
  let goal: WatchGoal
  var size: CGFloat
  var body: some View {
    Image(goal.imageName).interpolation(.none).resizable().frame(width: size, height: size).accessibilityHidden(true)
  }
}

/** 앱 StickerSlot 모양의 칸: 모서리 깎은 잉크 테두리 3, 다음 빈칸은 네 귀퉁이 괄호 */
struct SlotCell: View {
  enum Kind { case empty, next, filled }
  let goal: WatchGoal
  let number: Int
  let state: Kind
  var size: CGFloat = 30

  var body: some View {
    ZStack {
      switch state {
      case .next: Brackets(arm: size >= 60 ? 14 : 9)
      default:
        PixelOutline(inset: 1.5, unit: 1.5).fill(Palette.lcd)
          .overlay(PixelOutline(inset: 1.5, unit: 1.5).stroke(Palette.ink, lineWidth: 3))
      }
      if state == .filled { StickerImage(goal: goal, size: size * 22 / 30) }
      else { Text("\(number)").font(.pixel(size >= 60 ? 16 : 11)).foregroundStyle(Palette.ink) }
    }
    .frame(width: size, height: size)
  }
}

/** 네 귀퉁이 괄호: 앱 PixelFocusRing과 같은 「지금 붙일 칸」 표시. 위젯과 워치 모두 이 모양으로 (2026-10-16 결정 6 T1) */
struct Brackets: View {
  let arm: CGFloat
  var thickness: CGFloat = 3
  var body: some View {
    GeometryReader { g in
      let w = g.size.width, h = g.size.height, t = thickness
      Path { p in
        for (x, y, dx, dy) in [(0, 0, 1, 1), (w, 0, -1, 1), (0, h, 1, -1), (w, h, -1, -1)] as [(CGFloat, CGFloat, CGFloat, CGFloat)] {
          p.addRect(CGRect(x: dx > 0 ? x : x - arm, y: dy > 0 ? y : y - t, width: arm, height: t))
          p.addRect(CGRect(x: dx > 0 ? x : x - t, y: dy > 0 ? y : y - arm, width: t, height: arm))
        }
      }.fill(Palette.ink)
    }
  }
}

/** 10칸 묶음 표시: 지금 묶음은 진하게 */
struct ChunkDots: View {
  let count: Int
  let at: Int
  var body: some View {
    HStack(spacing: 4) {
      ForEach(0..<count, id: \.self) { i in
        RoundedRectangle(cornerRadius: 2).fill(i <= at ? Palette.ink : Palette.dim).frame(width: 14, height: 4)
      }
    }
    .accessibilityHidden(true)
  }
}

struct Toast: View {
  let text: String
  var body: some View {
    Text(text)
      .font(.pixel(11)).multilineTextAlignment(.center).foregroundStyle(Palette.ink)
      .padding(.horizontal, 8).padding(.vertical, 4)
      .background(Capsule().fill(Palette.ivory)).overlay(Capsule().stroke(Palette.ink, lineWidth: 1.5))
      .frame(maxWidth: 180)
  }
}

/** 잠깐 보이는 안내 하나 */
@MainActor
final class ToastModel: ObservableObject {
  @Published private(set) var text: String?
  private var hide: Task<Void, Never>?
  func show(_ t: String) {
    text = t
    hide?.cancel()
    hide = Task { try? await Task.sleep(nanoseconds: 1_600_000_000); if !Task.isCancelled { text = nil } }
  }
}
