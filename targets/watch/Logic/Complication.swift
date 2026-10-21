// 시계 화면 긴 칸 컴플리케이션 (2026-10-16 결정 5 K2): 차곡이와 머리 위 블록, 그 옆 두 줄 문구.
// 재촉하지 않는다 — 오늘 붙인 것을 알려 주거나 쌓인 수만 말한다(PRD 2절).
import Foundation

enum Complication {
  /** 워치 앱과 컴플리케이션이 함께 쓰는 저장소 */
  static let appGroup = "group.com.novumlab.chagok.watch"
  static let textKey = "complicationText"
  static let imageFile = "complication-chagok.png"

  static func text(lastGoal: WatchGoal?, growth: Int) -> String {
    if let g = lastGoal, g.placedToday { return "\(g.name) 스티커를\n오늘 붙였어요" }
    if growth == 0 { return "폰에서 첫 목표를\n만들어 보세요" }
    return "블록 \(growth)개를\n쌓았어요"
  }
}

extension WatchGoal {
  var placedToday: Bool {
    switch board {
    case let .tally(cells, _): return cells.contains(.placedToday)
    case let .calendar(_, _, _, days, _, _, _): return days.contains(.placedToday)
    }
  }
}
