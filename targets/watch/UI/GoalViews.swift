// 목표 판 (PRD 4.14): 적립판은 다음 빈칸이 든 10칸과 [붙이기], 달력판은 큰 오늘 칸과 크라운으로 내리는 이번 달.
// 누름의 뜻은 Tap(Logic)이 정한다. 실제 붙이기는 RootView.stick이 한다.
import SwiftUI

/** 판에서 고른 일 */
enum BoardAction {
  case add(dateKey: String?)
  case confirm(dateKey: String?)
  case remove(slot: Int)
}

struct TallyView: View {
  let goal: WatchGoal
  /** 방금 붙인 칸 */
  let pop: Int?
  let back: () -> Void
  let act: (BoardAction) -> Void
  @StateObject private var toast = ToastModel()

  private var cells: [TallyCell] { if case let .tally(c, _) = goal.board { return c }; return [] }

  var body: some View {
    let next = cells.firstIndex(of: .empty)
    let at = pop ?? next ?? max(0, cells.count - 1)
    let start = at / 10 * 10, n = min(10, cells.count - start)
    Screen {
      BackButton(action: back).offset(x: 20, y: 12)
      Text(goal.name).font(.pixel(15)).lineLimit(1).foregroundStyle(Palette.ink)
        .frame(width: 96).offset(x: 56, y: 18)
      VStack(spacing: 12) {
        VStack(spacing: 9) {
          LazyVGrid(columns: Array(repeating: GridItem(.fixed(30), spacing: 5), count: 5), spacing: 5) {
            ForEach(start..<(start + n), id: \.self) { k in
              SlotCell(goal: goal, number: k + 1, state: cells[k] == .empty ? (k == next ? .next : .empty) : .filled)
                .scaleEffect(k == pop ? 1.18 : 1)
                .press("\(k + 1)번 칸, \(cells[k] == .empty ? "비었어요" : "붙였어요")",
                       tap: { handle(Tap.tally(goal, index: k)) }, hold: { handle(Tap.tallyHold(goal, index: k)) })
            }
          }
          .frame(width: 170)
          ChunkDots(count: (cells.count + 9) / 10, at: at / 10)
        }
        Button("붙이기") { handle(Tap.stick(goal)) }
          .buttonStyle(PixelButtonStyle())
          .frame(width: 150, height: 44)
      }
      .frame(width: Layout.width, height: Layout.height - 60).offset(y: 44)
      if let t = toast.text { Toast(text: t).frame(width: Layout.width).offset(y: 200) }
    }
  }

  private func handle(_ r: TapResult) {
    switch r {
    case .add: act(.add(dateKey: nil))
    case .confirm: act(.confirm(dateKey: nil))
    case let .remove(slot): act(.remove(slot: slot))
    case let .toast(t): toast.show(t)
    case .addOn, .confirmOn, .none: break
    }
  }
}

struct CalendarView: View {
  let goal: WatchGoal
  let todayKey: String
  let back: () -> Void
  let act: (BoardAction) -> Void
  @StateObject private var toast = ToastModel()

  var body: some View {
    Screen {
      if case let .calendar(year, month, firstWeekday, days, _, _, _) = goal.board {
        let today = Overlay.dayIndex(todayKey, year: year, month: month).map { $0 + 1 }
        ScrollView {
          VStack(spacing: 8) {
            if let today, today <= days.count {
              SlotCell(goal: goal, number: today, state: days[today - 1] == .placedToday || days[today - 1] == .placed ? .filled : .next, size: 64)
                .press("오늘, \(days[today - 1] == .empty ? "비었어요" : "붙였어요")",
                       tap: { handle(Tap.day(goal, day: today)) }, hold: { handle(Tap.dayHold(goal, day: today)) })
              Text("오늘, \(month)월 \(today)일").font(.pixel(11))
            }
            Text("\(month)월").font(.pixel(12)).padding(.top, 30)
            monthGrid(days: days, firstWeekday: firstWeekday, today: today)
          }
          .foregroundStyle(Palette.ink)
          .padding(.top, 52).padding(.bottom, 34)
          .frame(width: Layout.width)
        }
        .frame(width: Layout.width, height: Layout.height - 40).offset(y: 40)
      }
      BackButton(action: back).offset(x: 20, y: 12)
      Text(goal.name).font(.pixel(15)).lineLimit(1).foregroundStyle(Palette.ink)
        .frame(width: 96).offset(x: 56, y: 18)
      if let t = toast.text { Toast(text: t).frame(width: Layout.width).offset(y: 200) }
    }
  }

  private func monthGrid(days: [CalendarDay], firstWeekday: Int, today: Int?) -> some View {
    let cols = Array(repeating: GridItem(.fixed(22), spacing: 2), count: 7)
    return VStack(spacing: 2) {
      LazyVGrid(columns: cols, spacing: 2) {
        ForEach(Array("일월화수목금토"), id: \.self) { Text(String($0)).font(.pixel(9)) }
      }
      LazyVGrid(columns: cols, spacing: 2) {
        ForEach(0..<firstWeekday, id: \.self) { _ in Color.clear.frame(width: 22, height: 22) }
        ForEach(1...days.count, id: \.self) { d in
          dayCell(d, days[d - 1], today: today)
            .press("\(d)일, \(days[d - 1] == .placed || days[d - 1] == .placedToday ? "붙였어요" : "비었어요")",
                   tap: { handle(Tap.day(goal, day: d)) }, hold: { handle(Tap.dayHold(goal, day: d)) })
        }
      }
    }
  }

  private func dayCell(_ d: Int, _ v: CalendarDay, today: Int?) -> some View {
    ZStack {
      if v == .placed || v == .placedToday { StickerImage(goal: goal, size: 18) }
      else { Text("\(d)").font(.pixel(9)) }
      if d == today, v == .empty { Brackets(arm: 7, thickness: 2) }
    }
    .frame(width: 22, height: 22)
    .opacity(v == .future || v == .outside ? 0.35 : 1)
  }

  private func handle(_ r: TapResult) {
    switch r {
    case let .addOn(key): act(.add(dateKey: key))
    case let .confirmOn(key): act(.confirm(dateKey: key))
    case let .remove(slot): act(.remove(slot: slot))
    case let .toast(t): toast.show(t)
    case .add, .confirm, .none: break
    }
  }
}

/** 마지막 칸: 앱과 같은 완성 확인 */
struct ConfirmView: View {
  let goal: WatchGoal
  let finish: () -> Void
  let cancel: () -> Void

  var body: some View {
    Screen {
      BackButton(action: cancel).offset(x: 20, y: 12)
      VStack(spacing: 9) {
        StickerImage(goal: goal, size: 24)
        Text(Copy.confirmTitle).font(.pixel(15))
        Text(Copy.confirmBody).font(.pixel(11)).multilineTextAlignment(.center)
        Button("완성하기", action: finish).buttonStyle(PixelButtonStyle()).frame(width: 140, height: 40)
        Button("취소", action: cancel).buttonStyle(PixelButtonStyle(fill: Palette.ivory)).frame(width: 140, height: 40)
      }
      .foregroundStyle(Palette.ink)
      .padding(.horizontal, 18)
      .frame(width: Layout.width).offset(y: 34)
    }
  }
}

private extension View {
  /** 칸: 짧게 누르면 붙이고 꾹 누르면 뗀다(폰과 같다). 화면 낭독에서는 버튼으로 읽고 「떼기」 동작을 준다. */
  func press(_ label: String, tap: @escaping () -> Void, hold: @escaping () -> Void) -> some View {
    contentShape(Rectangle())
      .onTapGesture(perform: tap)
      .onLongPressGesture(minimumDuration: 0.5, perform: hold)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(label)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction(.default, tap)
      .accessibilityAction(named: "떼기", hold)
  }
}
