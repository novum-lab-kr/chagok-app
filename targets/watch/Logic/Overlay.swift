// 받은 스냅샷에 아직 폰이 처리하지 않은 요청을 겹쳐 그린다(위젯과 같은 방식, 워치 설계 「워치에 보이는 값은 어림이다」).
// 판단은 폰이 한다. 여기서는 폰이 할 일을 어림할 뿐이다 — 폰이 새 스냅샷을 보내면 그대로 맞춰진다.
import Foundation

enum Overlay {
  /** 요청을 이만큼 지나도 폰이 처리하지 않으면 어림에서 뺀다(폰에서는 나중에 처리될 수 있다) */
  static let pendingLifetime: Double = 14 * 86_400_000

  /** 오늘 날짜에 맞는 목표 목록. 자정을 넘겼으면 함께 받은 자정 뒤 값을 쓰고, 그보다 더 지났으면 오늘 칸을 지난 칸으로 본다 */
  static func dayView(_ s: WatchSnapshot, todayKey: String) -> WatchDayView {
    if todayKey <= s.today { return WatchDayView(today: s.today, goals: s.goals) }
    if todayKey == s.afterMidnight.today { return s.afterMidnight }
    return WatchDayView(today: todayKey, goals: s.afterMidnight.goals.map { demoteToday($0, todayKey: todayKey) })
  }

  /** 폰을 오래 열지 않았을 때: 오늘 칸은 지난 칸으로, 오늘까지의 앞날은 붙일 수 있는 빈 날로 (검토 I4) */
  private static func demoteToday(_ g: WatchGoal, todayKey: String) -> WatchGoal {
    var g = g
    switch g.board {
    case let .tally(cells, recorded):
      g.board = .tally(cells: cells.map { $0 == .placedToday ? .placed : $0 }, recorded: recorded)
    case let .calendar(y, m, w, days, recorded, start, end):
      let today = dayIndex(todayKey, year: y, month: m)
      let next = days.enumerated().map { i, v -> CalendarDay in
        if v == .placedToday { return .placed }
        if v == .future, let today, i <= today { return .empty }
        return v
      }
      g.board = .calendar(year: y, month: m, firstWeekday: w, days: next, recorded: recorded, startDate: start, endDate: end)
    }
    return g
  }

  /** 워치 목록에 보일 목표. 기본 스티커 묶음 체험이 끝난 목표는 뺀다 — 워치에서는 붙일 수 없다 (2026-10-16 결정 1 L3) */
  static func listed(_ goals: [WatchGoal]) -> [WatchGoal] { goals.filter { !$0.locked } }

  /** 폰이 이미 처리한 요청(handled)과 너무 오래된 요청을 뺀다 */
  static func pendingAfter(handled: [String], pending: [WatchRequest], now: Double) -> [WatchRequest] {
    let done = Set(handled)
    return pending.filter { !done.contains($0.id) && now - $0.at < pendingLifetime }
  }

  /** 누른 순서대로 겹친다. 붙인 목표는 맨 앞으로(앱 목록과 같은 마지막으로 붙인 순), 완성하면 목록에서 뺀다 */
  static func apply(_ goals: [WatchGoal], pending: [WatchRequest], todayKey: String) -> [WatchGoal] {
    var list = goals
    for r in pending.sorted(by: { $0.at < $1.at }) {
      guard let i = list.firstIndex(where: { $0.id == r.goalId }) else { continue }
      var g = list[i]
      switch r.kind {
      case .add:
        guard place(&g, dateKey: r.dateKey, todayKey: todayKey) else { continue }
        list.remove(at: i)
        if r.complete != true { list.insert(g, at: 0) }
      case .remove:
        guard let slot = r.slotIndex, unplace(&g, slot: slot) else { continue }
        list[i] = g
      }
    }
    return list
  }

  private static func place(_ g: inout WatchGoal, dateKey: String, todayKey: String) -> Bool {
    let mark: Bool = dateKey == todayKey
    switch g.board {
    case let .tally(cells, recorded):
      guard let k = cells.firstIndex(of: .empty) else { return false }
      var c = cells; c[k] = mark ? .placedToday : .placed
      g.board = .tally(cells: c, recorded: recorded)
    case let .calendar(y, m, w, days, recorded, start, end):
      guard let d = dayIndex(dateKey, year: y, month: m), d < days.count, days[d] == .empty else { return false }
      var c = days; c[d] = mark ? .placedToday : .placed
      g.board = .calendar(year: y, month: m, firstWeekday: w, days: c, recorded: recorded, startDate: start, endDate: end)
    }
    if let r = g.remaining { g.remaining = max(0, r - 1) }
    return true
  }

  private static func unplace(_ g: inout WatchGoal, slot: Int) -> Bool {
    switch g.board {
    case let .tally(cells, recorded):
      guard slot < cells.count, cells[slot] != .empty else { return false }
      var c = cells; c[slot] = .empty
      g.board = .tally(cells: c, recorded: recorded)
    case let .calendar(y, m, w, days, recorded, start, end):
      guard slot < days.count, days[slot] == .placed || days[slot] == .placedToday else { return false }
      var c = days; c[slot] = .empty
      g.board = .calendar(year: y, month: m, firstWeekday: w, days: c, recorded: recorded, startDate: start, endDate: end)
    }
    if let r = g.remaining { g.remaining = r + 1 }
    return true
  }

  /** 그 달의 날짜 키면 날짜 - 1, 다른 달이면 nil */
  static func dayIndex(_ key: String, year: Int, month: Int) -> Int? {
    let p = key.split(separator: "-").compactMap { Int($0) }
    guard p.count == 3, p[0] == year, p[1] == month else { return nil }
    return p[2] - 1
  }
}
