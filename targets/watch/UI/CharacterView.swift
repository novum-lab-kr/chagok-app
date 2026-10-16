// 차곡이 화면 (PRD 4.14, 시안 14판 charScr/playDrop): 바닥 선 위에 차곡이(왼쪽)와 보관함(오른쪽), 지난 보관함은 뒤로 겹친다.
// 블록이 늘었으면 한 번 떨어뜨리고, 셋째 블록이면 꽂을 칸 아래까지 걸어가 세 개를 한 묶음으로 넣고 돌아온다.
import SwiftUI

/** 차곡이 화면으로 넘어온 까닭. auto면 모션이 끝나면 저절로 back으로 돌아간다 */
struct Flow: Equatable {
  /** 모션 전 블록 수(마지막으로 보여 준 수) */
  var from: Int
  var label: String
  var auto: Bool
}

struct CharacterView: View {
  @EnvironmentObject var store: Store
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  let flow: Flow?
  let back: () -> Void
  /** 모션이 끝났거나 건너뛰었다 */
  let done: () -> Void

  // 46mm 좌표 (시안 .ch, .floor, .deck.side, .decklabel, .recent)
  private let cell: CGFloat = 2.4
  private let charLeft: CGFloat = 20, floorY: CGFloat = 140
  private let deckLeft: CGFloat = 100, deckTop: CGFloat = 83, boxCell: CGFloat = 3
  private var charSize: CGSize { CGSize(width: 24 * cell, height: 21 * cell) }
  private var charTop: CGFloat { floorY - charSize.height }

  @State private var face = "smile"
  @State private var heads: [Color] = []
  @State private var deck: [Int] = [0]
  @State private var label: String?
  @State private var walkX: CGFloat = 0
  @State private var walking = false
  @State private var bob = false
  @State private var squash = false
  @State private var drop: (color: Color, y: CGFloat, x: CGFloat)?
  @State private var flying: (from: CGPoint, to: CGPoint, arrived: Bool)?
  @State private var idx = 0
  @State private var crown = 0.0
  @State private var started = false

  var body: some View {
    Screen {
      Rectangle().fill(Palette.ink).frame(width: 176, height: 3).offset(x: 16, y: floorY)
      deckView.offset(x: deckLeft, y: deckTop)
      CharacterSprite(face: face, heads: heads, cell: cell)
        .scaleEffect(x: 1, y: squash ? 0.9 : 1, anchor: .bottom)
        .offset(x: charLeft + walkX, y: charTop + (bob ? -1.5 : 0))
        .accessibilityElement().accessibilityLabel("차곡이, 블록 \(store.growth)개")
      if let d = drop { PixelView(map: Sprite.blockMap(d.color), cell: cell).offset(x: d.x, y: d.y) }
      if let f = flying {
        PixelView(map: Sprite.bundleMap(), cell: boxCell).offset(x: f.arrived ? f.to.x : f.from.x, y: f.arrived ? f.to.y : f.from.y)
      }
      Text(label ?? (idx == 0 ? Copy.boxNow : Copy.boxFull)).font(.pixel(11)).foregroundStyle(Palette.ink)
        .frame(width: Layout.width).offset(y: 152)
      recent.frame(width: Layout.width, height: 40).offset(y: 168)
      if flow?.auto == true {
        Button("건너뛰기", action: done).buttonStyle(PixelButtonStyle(fill: Palette.ivory))
          .frame(width: 104, height: 32).offset(x: 52, y: 206)
      } else {
        BackButton(action: back).offset(x: 20, y: 12)
        if deck.count > 1 {
          Text("크라운").font(.pixel(11)).foregroundStyle(Palette.ink).padding(.horizontal, 6)
            .background(Capsule().fill(Palette.ivory)).overlay(Capsule().stroke(Palette.ink, lineWidth: 1))
            .frame(width: Layout.width).offset(y: 226)
        }
      }
    }
    .focusable(flow?.auto != true)
    .digitalCrownRotation($crown, from: 0, through: Double(max(1, deck.count - 1)), by: 1, sensitivity: .low, isContinuous: true, isHapticFeedbackEnabled: true)
    .onChange(of: crown) { _, v in
      guard deck.count > 1 else { return }
      withAnimation(.easeInOut(duration: 0.35)) { idx = ((Int(v.rounded()) % deck.count) + deck.count) % deck.count; label = nil }
    }
    .task { await run() }
  }

  // MARK: 보관함 더미 (R1: 비스듬히 겹치고 크라운으로 한 장씩)

  private var deckView: some View {
    ZStack(alignment: .topLeading) {
      ForEach(Array(deck.enumerated()), id: \.offset) { i, filled in
        let d = ((i - idx) % deck.count + deck.count) % deck.count
        PixelView(map: Sprite.box(filled: filled), cell: boxCell)
          .brightness(d > 3 ? -0.3 : -0.12 * Double(d))
          .opacity(d > 3 ? 0 : 1)
          .offset(x: d > 3 ? 24 : 8 * CGFloat(d), y: d > 3 ? -15 : -5 * CGFloat(d))
          .zIndex(Double(10 - d))
      }
    }
    .accessibilityElement()
    .accessibilityLabel(idx == 0 ? Copy.boxNow : Copy.boxFull)
  }

  @ViewBuilder private var recent: some View {
    if let g = store.lastGoal {
      let mini = Sprite.miniBoard(g)
      HStack(spacing: 6) {
        StickerImage(goal: g, size: 20)
        PixelView(map: mini.map, cell: mini.cell)
      }
      .accessibilityHidden(true)
    }
  }

  // MARK: 모션

  private func colors(_ growth: Int) -> [Color] { Growth.headColors(growth: growth).map { Color(hex: $0) } }

  private func sleep(_ s: Double) async throws { try await Task.sleep(nanoseconds: UInt64(s * 1_000_000_000)) }

  private func run() async {
    guard !started else { return }
    started = true
    let to = store.growth
    let from = min(flow?.from ?? store.lastShown ?? to, to)
    // 처음 모습: 모션 전
    face = from == 0 ? "sleepy" : "smile"
    heads = colors(from)
    deck = Growth.boxes(from)
    label = flow?.label ?? (to > from ? Copy.grew(to - from) : nil)
    guard to > from else { return }
    if reduceMotion {
      finish(to)
      if flow?.auto == true { try? await sleep(0.8); done() }
      return
    }
    do {
      try await sleep(0.45)
      // 1. 블록이 위에서 떨어져 머리 위에 쌓인다
      let h0 = min(heads.count, 2)
      let color = Color(hex: Growth.fallback[h0])
      let land = CGPoint(x: charLeft + CGFloat(Sprite.headX[h0]) * cell, y: charTop + CGFloat(12 - 4 - 3 * h0 - Sprite.chagokBox.y0) * cell)
      face = "surprised"
      drop = (color, -30, land.x)
      withAnimation(.easeIn(duration: 0.52)) { drop = (color, land.y, land.x) }
      try await sleep(0.52)
      drop = nil
      heads = Array((heads + [color]).suffix(3))
      face = "excited"
      withAnimation(.easeOut(duration: 0.13)) { squash = true }
      try await sleep(0.13)
      withAnimation(.easeOut(duration: 0.13)) { squash = false }
      // 2. 묶음이 생겼으면 꽂을 칸 아래까지 걸어가 넣는다
      if Growth.bundles(to) > Growth.bundles(from) {
        heads = Growth.stack(count: 3).map { Color(hex: $0) }
        try await sleep(0.6)
        let after = Growth.boxes(to)
        let slot = Sprite.slot(after[0] - 1)
        let target = deckLeft + CGFloat(slot.x) * boxCell + 4
        let center = charLeft + charSize.width / 2
        let dx = min(target, Layout.width - 14 - charSize.width / 2) - center
        let dur = max(0.45, abs(dx) * 0.01)
        try await walk(to: dx, duration: dur)
        let headTop = CGPoint(x: charLeft + dx + 10 * cell, y: charTop - 8)
        flying = (headTop, CGPoint(x: deckLeft + CGFloat(slot.x) * boxCell, y: deckTop + CGFloat(slot.y) * boxCell), false)
        heads = colors(to)
        face = "grin"
        label = Copy.stored
        withAnimation(.easeInOut(duration: 0.6)) { flying?.arrived = true }
        try await sleep(0.6)
        flying = nil
        idx = 0; crown = 0
        deck = after
        try await sleep(0.25)
        try await walk(to: 0, duration: dur)
        face = "smile"
        finish(to)
        if flow?.auto == true { try await sleep(0.9); done() }
      } else {
        try await sleep(0.3)
        finish(to)
        if flow?.auto == true { try await sleep(1.5); done() }
      }
    } catch {
      // 건너뛰거나 화면을 떠났다 — 결과는 끝까지 본 것과 같다(done에서 수를 기록한다)
    }
  }

  private func walk(to x: CGFloat, duration: Double) async throws {
    walking = true
    withAnimation(.easeInOut(duration: 0.12).repeatForever(autoreverses: true)) { bob = true }
    withAnimation(.linear(duration: duration)) { walkX = x }
    try await sleep(duration + 0.03)
    withAnimation(.easeOut(duration: 0.05)) { bob = false }
    walking = false
  }

  private func finish(_ to: Int) {
    face = to == 0 ? "sleepy" : "smile"
    heads = colors(to)
    deck = Growth.boxes(to)
    store.markShown(to)
  }
}
