// 칸이나 버튼을 눌렀을 때 할 일 (PRD 4.14). 실제 판단은 폰이 다시 한다.
// 떼기는 폰처럼 꾹 눌러야 한다. 위젯(4.10)은 길게 누를 수 없어 누르면 떼지만, 워치는 붙이려고 연달아 누르다 떼졌다(2026-10-28).
import Foundation

enum Copy {
  static let pastCell = "지난 칸은 폰에서 고칠 수 있어요"
  static let pastDay = "지난 날은 폰에서 고칠 수 있어요"
  /** 기본 스티커 묶음 체험이 끝난 목표 (PRD 4.12). 폰에서는 다른 스티커를 고르거나 묶음을 연다 */
  static let locked = "체험이 끝났어요. 폰에서 다른 스티커를 고를 수 있어요"
  static let noSnapshot = "폰에서 차곡차곡을 열어 주세요"
  static let noGoals = "폰에서 첫 목표를 만들어 보세요"
  static let confirmTitle = "이 판을 완성할까요?"
  static let confirmBody = "완성한 뒤에도 칸과 기록은 고칠 수 있어요"
  static let boxNow = "지금 채우는 보관함이에요"
  static let boxFull = "다 채운 보관함이에요"
  static let stored = "세 개를 보관함에 넣었어요"
  static func stuck(_ name: String) -> String { "\(name) 스티커를 붙였어요" }
  static func completed(_ name: String) -> String { "\(name) 판을 완성했어요" }
  static func grew(_ n: Int) -> String { "블록이 \(n)개 늘었어요" }
}

enum TapResult: Equatable {
  /** 적립판: 다음 빈칸에 붙인다 */
  case add
  /** 적립판: 마지막 칸 — 완성 확인을 먼저 받는다 */
  case confirm
  /** 달력판: 그날에 붙인다 */
  case addOn(dateKey: String)
  /** 달력판: 기간 안 마지막 빈 날 — 완성 확인을 먼저 받는다 */
  case confirmOn(dateKey: String)
  /** 오늘 붙인 칸을 뗀다(적립판은 칸 번호, 달력판은 날짜 - 1) */
  case remove(slot: Int)
  case toast(String)
  case none
}

enum Tap {
  /** [붙이기] */
  static func stick(_ g: WatchGoal) -> TapResult {
    guard case let .tally(cells, _) = g.board, cells.contains(.empty) else { return .none }
    if g.locked { return .toast(Copy.locked) }
    return g.remaining == 1 ? .confirm : .add
  }

  /** 적립판 칸. 빈칸과 오늘 붙인 칸은 어디를 눌러도 다음 빈칸에 붙는다 */
  static func tally(_ g: WatchGoal, index: Int) -> TapResult {
    guard case let .tally(cells, _) = g.board, index < cells.count else { return .none }
    switch cells[index] {
    case .empty, .placedToday: return stick(g)
    case .placed: return .toast(Copy.pastCell)
    }
  }

  /** 적립판 칸을 꾹 눌렀을 때. 오늘 붙인 칸만 뗀다 */
  static func tallyHold(_ g: WatchGoal, index: Int) -> TapResult {
    guard case let .tally(cells, recorded) = g.board, index < cells.count else { return .none }
    switch cells[index] {
    case .empty: return .none
    case .placedToday: return recorded.contains(index) ? .toast(Copy.pastCell) : .remove(slot: index)
    case .placed: return .toast(Copy.pastCell)
    }
  }

  /** 달력판 날짜(1부터) */
  static func day(_ g: WatchGoal, day: Int) -> TapResult {
    guard case let .calendar(y, m, _, days, recorded, _, _) = g.board, day >= 1, day <= days.count else { return .none }
    let i = day - 1
    switch days[i] {
    case .empty:
      if g.locked { return .toast(Copy.locked) }
      let key = DateKey.of(year: y, month: m, day: day)
      return g.remaining == 1 ? .confirmOn(dateKey: key) : .addOn(dateKey: key)
    case .placedToday, .future, .outside: return .none
    case .placed: return .toast(Copy.pastDay)
    }
  }

  /** 달력판 날짜를 꾹 눌렀을 때. 오늘 붙인 날만 뗀다 */
  static func dayHold(_ g: WatchGoal, day: Int) -> TapResult {
    guard case let .calendar(_, _, _, days, recorded, _, _) = g.board, day >= 1, day <= days.count else { return .none }
    let i = day - 1
    switch days[i] {
    case .placedToday: return recorded.contains(i) ? .toast(Copy.pastDay) : .remove(slot: i)
    case .placed: return .toast(Copy.pastDay)
    case .empty, .future, .outside: return .none
    }
  }
}
