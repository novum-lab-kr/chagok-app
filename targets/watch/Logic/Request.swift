// 워치가 폰에 보내는 붙임 요청 (src/widgets/requests.ts WidgetRequest와 같은 모양).
import Foundation

struct WatchRequest: Codable, Equatable {
  enum Kind: String, Codable { case add, remove }
  var id: String
  var goalId: String
  var kind: Kind
  /** 누른 시각, 밀리초 */
  var at: Double
  /** 누른 날(적립판) 또는 붙일 날(달력판), yyyy-MM-dd */
  var dateKey: String
  /** remove만: 적립판은 칸 번호, 달력판은 날짜 - 1 */
  var slotIndex: Int?
  /** 마지막 칸에서 완성 확인을 받았다 */
  var complete: Bool?

  /** WCSession으로 보낼 사전. complete는 true일 때만 넣는다(폰은 true만 받는다) */
  var payload: [String: Any] {
    var p: [String: Any] = ["id": id, "goalId": goalId, "kind": kind.rawValue, "at": at, "dateKey": dateKey]
    if let slotIndex { p["slotIndex"] = slotIndex }
    if complete == true { p["complete"] = true }
    return p
  }
}

enum DateKey {
  /** 폰과 같은 양력 날짜. 기기 달력이 불기나 일본력이어도 연도가 바뀌지 않게 (검토 I5) */
  static func of(_ date: Date, calendar: Calendar = .current) -> String {
    var g = Calendar(identifier: .gregorian)
    g.timeZone = calendar.timeZone
    let c = g.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
  }
  static func of(year: Int, month: Int, day: Int) -> String { String(format: "%04d-%02d-%02d", year, month, day) }
}
