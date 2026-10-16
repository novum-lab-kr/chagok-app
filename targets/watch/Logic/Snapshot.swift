// 폰이 보내는 워치 스냅샷 (src/watch/snapshot.ts와 같은 모양, PRD 4.14). Foundation만 쓴다 — 맥에서 swiftc로 테스트한다.
import Foundation

enum TallyCell: String, Codable, Equatable { case placed, placedToday, empty }
enum CalendarDay: String, Codable, Equatable { case placed, placedToday, empty, future, outside }

enum WatchBoard: Codable, Equatable {
  case tally(cells: [TallyCell], recorded: [Int])
  case calendar(year: Int, month: Int, firstWeekday: Int, days: [CalendarDay], recorded: [Int], startDate: String, endDate: String?)

  private enum Key: String, CodingKey { case type, cells, recorded, year, month, firstWeekday, days, startDate, endDate }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: Key.self)
    switch try c.decode(String.self, forKey: .type) {
    case "tally":
      self = .tally(cells: try c.decode([TallyCell].self, forKey: .cells), recorded: try c.decode([Int].self, forKey: .recorded))
    case "calendar":
      self = .calendar(
        year: try c.decode(Int.self, forKey: .year), month: try c.decode(Int.self, forKey: .month),
        firstWeekday: try c.decode(Int.self, forKey: .firstWeekday), days: try c.decode([CalendarDay].self, forKey: .days),
        recorded: try c.decode([Int].self, forKey: .recorded), startDate: try c.decode(String.self, forKey: .startDate),
        endDate: try c.decodeIfPresent(String.self, forKey: .endDate))
    default:
      throw DecodingError.dataCorruptedError(forKey: .type, in: c, debugDescription: "unknown board type")
    }
  }

  func encode(to encoder: Encoder) throws {
    var c = encoder.container(keyedBy: Key.self)
    switch self {
    case let .tally(cells, recorded):
      try c.encode("tally", forKey: .type); try c.encode(cells, forKey: .cells); try c.encode(recorded, forKey: .recorded)
    case let .calendar(year, month, firstWeekday, days, recorded, startDate, endDate):
      try c.encode("calendar", forKey: .type); try c.encode(year, forKey: .year); try c.encode(month, forKey: .month)
      try c.encode(firstWeekday, forKey: .firstWeekday); try c.encode(days, forKey: .days); try c.encode(recorded, forKey: .recorded)
      try c.encode(startDate, forKey: .startDate); try c.encode(endDate, forKey: .endDate)
    }
  }
}

struct WatchGoal: Codable, Equatable, Identifiable {
  var id: String
  var name: String
  /** 기본 스티커 id (basic.sprout). 그림 이름은 imageName */
  var sticker: String
  /** 블록 색 #RRGGBB */
  var color: String
  /** 완성까지 남은 칸. 1이면 다음이 마지막 칸이라 완성 확인을 띄운다. 종료일 없는 달력판은 nil */
  var remaining: Int?
  /** 기본 스티커 묶음 체험이 끝났다. 워치에서 붙이지 않는다 */
  var locked: Bool
  var board: WatchBoard

  var imageName: String { sticker.replacingOccurrences(of: ".", with: "-") }
}

struct WatchDayView: Codable, Equatable {
  var today: String
  var goals: [WatchGoal]
}

struct WatchSnapshot: Codable, Equatable {
  var v: Int
  var today: String
  var goals: [WatchGoal]
  var growth: Int
  var lastGoalId: String?
  var handled: [String]
  var afterMidnight: WatchDayView

  /** 모양이 틀렸거나 버전이 다르면 nil — 마지막 정상 스냅샷을 그대로 쓴다 (Review Focus 5) */
  static func decode(_ json: String) -> WatchSnapshot? {
    guard let data = json.data(using: .utf8), let s = try? JSONDecoder().decode(WatchSnapshot.self, from: data), s.v == 1 else { return nil }
    return s
  }
}
