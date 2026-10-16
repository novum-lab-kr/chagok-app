// SwiftUI 미리보기용 가짜 스냅샷 (시안 14판의 목표 넷: 책 읽기, 산책, 물 마시기, 일기 쓰기)
import SwiftUI

enum PreviewData {
  static func goal(_ id: String, _ name: String, _ sticker: String, _ color: String, placed: Int, today: Int, total: Int) -> WatchGoal {
    let cells = (0..<total).map { $0 < placed ? TallyCell.placed : $0 < placed + today ? .placedToday : .empty }
    return WatchGoal(id: id, name: name, sticker: sticker, color: color, remaining: total - placed - today, locked: false, board: .tally(cells: cells, recorded: []))
  }
  static let diary: WatchGoal = {
    var days = (1...31).map { $0 < 3 ? CalendarDay.outside : $0 > 16 ? .future : .empty }
    for d in [3, 4, 6, 7, 9, 10, 11, 13, 14, 15] { days[d - 1] = .placed }
    return WatchGoal(id: "diary", name: "일기 쓰기", sticker: "objects_normal.notebook", color: "#F2C94C", remaining: nil, locked: false,
                     board: .calendar(year: 2026, month: 10, firstWeekday: 4, days: days, recorded: [], startDate: "2026-10-03", endDate: nil))
  }()
  static let goals = [
    goal("book", "책 읽기", "basic.book", "#FEF1D1", placed: 28, today: 0, total: 30),
    goal("walk", "산책", "sports_normal.walk", "#FFF2D2", placed: 16, today: 1, total: 20),
    goal("mug", "물 마시기", "objects_normal.mug", "#8EC5E8", placed: 9, today: 0, total: 10),
    diary,
  ]
  static func snapshot(growth: Int) -> WatchSnapshot {
    WatchSnapshot(v: 1, today: DateKey.of(Date()), goals: goals, growth: growth,
                  lastGoalId: "walk", handled: [], afterMidnight: WatchDayView(today: "9999-12-31", goals: goals))
  }
}

#Preview("첫 화면") { HomeView(openGoal: { _ in }, openCharacter: {}).environmentObject(Store(preview: PreviewData.snapshot(growth: 2))) }
#Preview("연결 전") { HomeView(openGoal: { _ in }, openCharacter: {}).environmentObject(Store(preview: nil)) }
#Preview("적립판") { TallyView(goal: PreviewData.goals[1], pop: nil, back: {}, act: { _ in }) }
#Preview("달력판") { CalendarView(goal: PreviewData.diary, todayKey: "2026-10-16", back: {}, act: { _ in }) }
#Preview("완성 확인") { ConfirmView(goal: PreviewData.goals[2], finish: {}, cancel: {}) }
#Preview("차곡이 화면") { CharacterView(flow: nil, back: {}, done: {}).environmentObject(Store(preview: PreviewData.snapshot(growth: 100))) }
