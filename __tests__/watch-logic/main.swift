// 워치 Logic 테스트 (워치 계획 2 Task 5). 실행: sh scripts/test-watch-logic.sh. 맨 위 코드는 main.swift에서만 된다.
import Foundation

func tallyGoal(_ id: String, cells: [TallyCell], remaining: Int? = nil, recorded: [Int] = [], locked: Bool = false) -> WatchGoal {
  WatchGoal(id: id, name: id, sticker: "basic.book", color: "#FD855F", remaining: remaining ?? cells.filter { $0 == .empty }.count, locked: locked, board: .tally(cells: cells, recorded: recorded))
}
func calGoal(_ id: String, days: [CalendarDay], remaining: Int? = nil, recorded: [Int] = []) -> WatchGoal {
  WatchGoal(id: id, name: id, sticker: "basic.book", color: "#FD855F", remaining: remaining, locked: false,
            board: .calendar(year: 2026, month: 10, firstWeekday: 4, days: days, recorded: recorded, startDate: "2026-10-01", endDate: nil))
}
func req(_ id: String, _ goal: String, _ kind: WatchRequest.Kind = .add, at: Double = 1, date: String = "2026-10-16", slot: Int? = nil, complete: Bool? = nil) -> WatchRequest {
  WatchRequest(id: id, goalId: goal, kind: kind, at: at, dateKey: date, slotIndex: slot, complete: complete)
}
func snap(goals: [WatchGoal], after: [WatchGoal]? = nil, growth: Int = 0, handled: [String] = []) -> WatchSnapshot {
  WatchSnapshot(v: 1, today: "2026-10-16", goals: goals, growth: growth, lastGoalId: nil, handled: handled,
                afterMidnight: WatchDayView(today: "2026-10-17", goals: after ?? goals))
}
func cells(_ g: WatchGoal?) -> [TallyCell] { if case let .tally(c, _)? = g?.board { return c }; return [] }
func days(_ g: WatchGoal?) -> [CalendarDay] { if case let .calendar(_, _, _, d, _, _, _)? = g?.board { return d }; return [] }
/** 10월 달력: 16일이 오늘, 앞은 empty, 뒤는 future */
func october(_ set: [Int: CalendarDay] = [:]) -> [CalendarDay] {
  (1...31).map { set[$0] ?? ($0 < 16 ? .empty : $0 == 16 ? .empty : .future) }
}

print("워치 Logic")

test("스냅샷: 버전이 다르거나 깨졌으면 nil") {
  expectEqual(WatchSnapshot.decode("{not json") == nil, true)
  let s = snap(goals: [tallyGoal("a", cells: [.empty])])
  var data = String(data: try JSONEncoder().encode(s), encoding: .utf8)!
  expectEqual(WatchSnapshot.decode(data), s)
  data = data.replacingOccurrences(of: "\"v\":1", with: "\"v\":2")
  expectEqual(WatchSnapshot.decode(data) == nil, true)
}

test("스냅샷: 폰 TS가 만든 JSON을 읽는다") {
  let json = ##"{"v":1,"today":"2026-10-16","goals":[{"id":"g","name":"산책","sticker":"sports_normal.walk","color":"#FFF2D2","remaining":null,"locked":false,"board":{"type":"calendar","year":2026,"month":10,"firstWeekday":4,"days":["placed","outside"],"recorded":[0],"startDate":"2026-10-01","endDate":null}}],"growth":4,"lastGoalId":"g","handled":["x"],"afterMidnight":{"today":"2026-10-17","goals":[]}}"##
  let s = WatchSnapshot.decode(json)
  expectEqual(s?.goals.first?.imageName, "sports_normal-walk")
  expectEqual(days(s?.goals.first), [.placed, .outside])
  expectEqual(s?.goals.first?.remaining == nil, true)
}

test("스냅샷 계약: 폰 TS가 만든 fixture를 읽는다 (watchSnapshotContract.test.ts)") {
  let json = try String(contentsOfFile: "__tests__/watch-logic/snapshot.fixture.json", encoding: .utf8)
  let s = WatchSnapshot.decode(json)
  expectEqual(s?.growth, 5)
  expectEqual(s?.handled, ["r1"])
  expectEqual(s?.goals.map(\.id), ["tally", "cal"])
  expectEqual(cells(s?.goals.first).prefix(3).map { $0 }, [.placed, .placedToday, .empty])
  expectEqual(s?.goals.last?.locked, true)
  expectEqual(days(s?.goals.last)[3], .placed)
  expectEqual(days(s?.goals.last)[0], .outside)
}

test("요청 사전: complete는 true일 때만, slotIndex는 있을 때만") {
  let p = req("r", "g", .remove, slot: 3).payload
  expectEqual(p["slotIndex"] as? Int, 3)
  expectEqual(p["complete"] == nil, true)
  expectEqual(req("r", "g", complete: true).payload["complete"] as? Bool, true)
}

test("날짜 키: 오늘이 자정 뒤 값과 같으면 afterMidnight를 쓴다 (Review Focus 2)") {
  let s = snap(goals: [tallyGoal("a", cells: [.placedToday, .empty])], after: [tallyGoal("a", cells: [.placed, .empty])])
  expectEqual(Overlay.dayView(s, todayKey: "2026-10-16").today, "2026-10-16")
  expectEqual(cells(Overlay.dayView(s, todayKey: "2026-10-17").goals.first), [.placed, .empty])
}

test("날짜 키: 이틀 넘게 폰을 못 보면 오늘 칸을 지난 칸으로 본다") {
  let s = snap(goals: [], after: [tallyGoal("a", cells: [.placedToday, .empty])])
  expectEqual(cells(Overlay.dayView(s, todayKey: "2026-10-18").goals.first), [.placed, .empty])
}

test("겹치기: 적립판 add는 첫 빈칸을 오늘 칸으로, remove는 그 칸을 비운다") {
  let goals = [tallyGoal("a", cells: [.placed, .empty, .empty])]
  var out = Overlay.apply(goals, pending: [req("1", "a")], todayKey: "2026-10-16")
  expectEqual(cells(out.first), [.placed, .placedToday, .empty])
  expectEqual(out.first?.remaining, 1)
  out = Overlay.apply(goals, pending: [req("1", "a", at: 1), req("2", "a", .remove, at: 2, slot: 1)], todayKey: "2026-10-16")
  expectEqual(cells(out.first), [.placed, .empty, .empty])
  expectEqual(out.first?.remaining, 2)
}

test("겹치기: 달력판 add는 그날을, 오늘이면 오늘 칸으로") {
  let goals = [calGoal("c", days: october())]
  let out = Overlay.apply(goals, pending: [req("1", "c", date: "2026-10-16"), req("2", "c", at: 2, date: "2026-10-03")], todayKey: "2026-10-16")
  expectEqual(days(out.first)[15], .placedToday)
  expectEqual(days(out.first)[2], .placed)
}

test("겹치기: complete면 목표가 목록에서 빠진다") {
  let goals = [tallyGoal("a", cells: [.placed, .empty]), tallyGoal("b", cells: [.empty])]
  expectEqual(Overlay.apply(goals, pending: [req("1", "a", complete: true)], todayKey: "2026-10-16").map(\.id), ["b"])
}

test("겹치기: 붙인 목표가 맨 앞으로 온다(마지막으로 붙인 순)") {
  let goals = [tallyGoal("a", cells: [.empty]), tallyGoal("b", cells: [.empty, .empty])]
  expectEqual(Overlay.apply(goals, pending: [req("1", "b")], todayKey: "2026-10-16").map(\.id), ["b", "a"])
}

test("겹치기: 없는 목표나 다른 달 날짜는 무시") {
  let goals = [calGoal("c", days: october())]
  let out = Overlay.apply(goals, pending: [req("1", "zz"), req("2", "c", date: "2026-09-30")], todayKey: "2026-10-16")
  expectEqual(days(out.first), october())
}

test("처리 안 된 요청: handled와 이틀 지난 것은 뺀다 (Review Focus 1)") {
  let now = 10 * 86_400_000.0
  let pending = [req("done", "a", at: now), req("old", "a", at: now - 15 * 86_400_000), req("late", "a", at: now - 3 * 86_400_000), req("new", "a", at: now)]
  // 폰이 며칠 뒤에 열려도 줄 선 요청은 도착한다 — 처리될 때까지 겹쳐 그린다(아주 오래된 것만 뺀다)
  expectEqual(Overlay.pendingAfter(handled: ["done"], pending: pending, now: now).map(\.id), ["late", "new"])
}

test("누름: 적립판 빈칸이나 [붙이기]는 add, 마지막 칸이면 완성 확인") {
  expectEqual(Tap.stick(tallyGoal("a", cells: [.placed, .empty, .empty])), .add)
  expectEqual(Tap.stick(tallyGoal("a", cells: [.placed, .empty])), .confirm)
  expectEqual(Tap.tally(tallyGoal("a", cells: [.empty, .empty]), index: 1), .add)
  expectEqual(Tap.stick(tallyGoal("a", cells: [.placed])), .none)
}

test("누름: 오늘 칸은 떼고, 지난 칸과 기록 있는 칸은 안내") {
  let g = tallyGoal("a", cells: [.placed, .placedToday, .placedToday], recorded: [2])
  expectEqual(Tap.tally(g, index: 1), .remove(slot: 1))
  expectEqual(Tap.tally(g, index: 0), .toast(Copy.pastCell))
  expectEqual(Tap.tally(g, index: 2), .toast(Copy.pastCell))
}

test("누름: 체험이 끝난 목표는 붙이지 않고 안내") {
  expectEqual(Tap.stick(tallyGoal("a", cells: [.empty, .empty], locked: true)), .toast(Copy.locked))
}

test("누름: 달력판") {
  let g = calGoal("c", days: october([3: .placed, 16: .placedToday, 5: .outside]), recorded: [])
  expectEqual(Tap.day(g, day: 16), .remove(slot: 15))
  expectEqual(Tap.day(g, day: 3), .toast(Copy.pastDay))
  expectEqual(Tap.day(g, day: 4), .addOn(dateKey: "2026-10-04"))
  expectEqual(Tap.day(g, day: 5), .none)
  expectEqual(Tap.day(g, day: 20), .none)
  let last = calGoal("c", days: october(), remaining: 1)
  expectEqual(Tap.day(last, day: 16), .confirmOn(dateKey: "2026-10-16"))
  let rec = calGoal("c", days: october([16: .placedToday]), recorded: [15])
  expectEqual(Tap.day(rec, day: 16), .toast(Copy.pastDay))
}

test("성장: 워치에 보인 수 아래로 내리지 않는다 (Review Focus 3)") {
  expectEqual(Growth.shown(snapshot: 10, pendingAdds: 1, lastShown: 0), 11)
  expectEqual(Growth.shown(snapshot: 10, pendingAdds: 0, lastShown: 11), 11)
  expectEqual(Growth.shown(snapshot: 12, pendingAdds: 0, lastShown: 11), 12)
}

test("성장: 머리 위 블록과 보관함") {
  expectEqual(Growth.heads(0), 0)
  expectEqual(Growth.heads(2), 2)
  expectEqual(Growth.heads(3), 0)
  expectEqual(Growth.boxes(0), [0])
  expectEqual(Growth.boxes(2), [0])
  expectEqual(Growth.boxes(3), [1])
  expectEqual(Growth.boxes(48), [16])
  expectEqual(Growth.boxes(51), [1, 16])
  expectEqual(Growth.boxes(100), [1, 16, 16])
}

test("성장: 머리 위 블록은 민트, 아이보리, 살구 순서 (결정 3 B3)") {
  expectEqual(Growth.headColors(growth: 0), [])
  expectEqual(Growth.headColors(growth: 2), ["#AFE1CB", "#FEF1D1"])
  expectEqual(Growth.headColors(growth: 4), ["#AFE1CB"])
  expectEqual(Growth.stack(count: 3), ["#AFE1CB", "#FEF1D1", "#FD855F"])
}

test("목록: 체험이 끝난 목표는 워치 목록에서 뺀다 (결정 1 L3)") {
  let goals = [tallyGoal("a", cells: [.empty]), tallyGoal("b", cells: [.empty], locked: true)]
  expectEqual(Overlay.listed(goals).map(\.id), ["a"])
}

test("성장: 처리 안 된 요청이 더하는 블록 — 떼고 다시 붙이면 늘지 않는다 (검토 I1)") {
  expectEqual(Growth.pendingGain([req("1", "a"), req("2", "a", at: 2)]), 2)
  expectEqual(Growth.pendingGain([req("1", "a", .remove, slot: 0), req("2", "a", at: 2)]), 0)
  expectEqual(Growth.pendingGain([req("1", "a"), req("2", "a", .remove, at: 2, slot: 0)]), 1)
}

test("성장: 폰이 세지 않은 블록은 새 스냅샷에서 내려 맞춘다 (검토 I1)") {
  expectEqual(Growth.confirmShown(lastShown: 11, snapshot: 10, pending: []), 10)
  expectEqual(Growth.confirmShown(lastShown: 11, snapshot: 10, pending: [req("1", "a")]), 11)
  expectEqual(Growth.confirmShown(lastShown: 9, snapshot: 10, pending: []), 9)
}

test("날짜 키: 기기 달력이 불기나 일본력이어도 양력 키 (검토 I5)") {
  var c = Calendar(identifier: .buddhist); c.timeZone = TimeZone(identifier: "Asia/Seoul")!
  let d = ISO8601DateFormatter().date(from: "2026-10-16T03:00:00Z")!
  expectEqual(DateKey.of(d, calendar: c), "2026-10-16")
}

test("날짜 키: 이틀 넘게 지나면 오늘까지의 앞날을 빈 날로 (검토 I4)") {
  let s = snap(goals: [], after: [calGoal("c", days: october([16: .placedToday]))])
  let d = days(Overlay.dayView(s, todayKey: "2026-10-18").goals.first)
  expectEqual(d[15], .placed)
  expectEqual(d[16], .empty)
  expectEqual(d[17], .empty)
  expectEqual(d[18], .future)
}

test("컴플리케이션 문구: 오늘 붙였으면 그 목표, 아니면 블록 수 (결정 5 K2)") {
  let walk = tallyGoal("산책", cells: [.placed, .placedToday, .empty])
  let book = tallyGoal("책 읽기", cells: [.placed, .empty])
  expectEqual(Complication.text(lastGoal: walk, growth: 12), "산책 스티커를\n오늘 붙였어요")
  expectEqual(Complication.text(lastGoal: book, growth: 12), "블록 12개를\n쌓았어요")
  expectEqual(Complication.text(lastGoal: nil, growth: 0), "폰에서 첫 목표를\n만들어 보세요")
}

print(failures == 0 ? "\(passes) passed" : "\(failures) failed, \(passes) passed")
exit(failures == 0 ? 0 : 1)
