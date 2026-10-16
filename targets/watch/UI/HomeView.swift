// 첫 화면: 위에 차곡이, 아래에 진행 중인 목표(마지막으로 붙인 순). 오늘 붙인 목표는 줄 바탕이 민트 (PRD 4.14).
import SwiftUI

struct HomeView: View {
  @EnvironmentObject var store: Store
  let openGoal: (String) -> Void
  let openCharacter: () -> Void

  var body: some View {
    Screen {
      if store.snapshot == nil {
        empty(face: "basic", text: Copy.noSnapshot)
      } else if store.goals.isEmpty {
        empty(face: "sleepy", text: Copy.noGoals)
      } else {
        ScrollView {
          VStack(spacing: 7) {
            Button(action: openCharacter) { CharacterSprite(face: store.growth == 0 ? "sleepy" : "smile", heads: heads) }
              .buttonStyle(.plain)
              .frame(height: 54, alignment: .bottom)
              .accessibilityLabel("차곡이, 블록 \(store.growth)개")
            ForEach(store.goals) { g in
              Button { openGoal(g.id) } label: {
                HStack(spacing: 8) {
                  StickerImage(goal: g, size: 22)
                  Text(g.name).font(.pixel(13)).lineLimit(1)
                }
              }
              .buttonStyle(PixelButtonStyle(fill: g.placedToday ? Palette.mint : Palette.ivory, leading: true))
              .frame(width: 176, height: 40)
              .accessibilityLabel(g.placedToday ? "\(g.name), 오늘 붙였어요" : g.name)
            }
          }
          .padding(.top, 14).padding(.bottom, 36)
          .frame(width: Layout.width)
        }
        .frame(width: Layout.width, height: Layout.height)
      }
    }
  }

  private var heads: [Color] { Growth.headColors(growth: store.growth).map { Color(hex: $0) } }

  private func empty(face: String, text: String) -> some View {
    VStack(spacing: 14) {
      CharacterSprite(face: face, heads: [])
      Text(text).font(.pixel(13)).multilineTextAlignment(.center).foregroundStyle(Palette.ink)
    }
    .frame(width: Layout.width, height: Layout.height)
  }
}

struct CharacterSprite: View {
  let face: String
  let heads: [Color]
  var cell: CGFloat = 2.4
  var body: some View {
    PixelView(map: Sprite.chagok(face: face, heads: heads), cell: cell, box: Sprite.chagokBox)
  }
}
