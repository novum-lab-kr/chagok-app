// 워치 상태와 폰 연결 (PRD 4.14, 워치 계획 2 Task 7).
// 폰 → 워치: applicationContext의 스냅샷 하나. 워치 → 폰: 붙임 요청을 transferUserInfo로(폰이 멀리 있거나 꺼져 있어도 줄을 선다),
// 바로 닿으면 sendMessage로도 보낸다 — 같은 요청 id라 폰에서는 한 번만 붙는다.
import Foundation
import WatchConnectivity

@MainActor
final class Store: NSObject, ObservableObject {
  @Published private(set) var snapshot: WatchSnapshot?
  @Published private(set) var pending: [WatchRequest] = []
  /** 차곡이 화면에서 마지막으로 보여 준 블록 수. 처음 연결 전에는 nil */
  @Published private(set) var lastShown: Int?
  @Published private(set) var todayKey = DateKey.of(Date())

  private let defaults: UserDefaults
  /** 미리보기에서는 연결하지 않고 컴플리케이션도 건드리지 않는다 */
  private let live: Bool
  private enum Key { static let snapshot = "snapshot", pending = "pending", lastShown = "lastShown" }

  init(defaults: UserDefaults = .standard, connect: Bool = true) {
    self.defaults = defaults
    self.live = connect
    super.init()
    if let json = defaults.string(forKey: Key.snapshot) { snapshot = WatchSnapshot.decode(json) }
    if let data = defaults.data(forKey: Key.pending), let list = try? JSONDecoder().decode([WatchRequest].self, from: data) { pending = list }
    if defaults.object(forKey: Key.lastShown) != nil { lastShown = defaults.integer(forKey: Key.lastShown) }
    if connect, WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }

  /** 미리보기용 */
  convenience init(preview: WatchSnapshot?, lastShown: Int? = nil) {
    self.init(defaults: UserDefaults(suiteName: "preview-\(UUID().uuidString)")!, connect: false)
    self.snapshot = preview
    self.lastShown = lastShown ?? preview?.growth
  }

  // MARK: 보이는 값

  var day: WatchDayView? { snapshot.map { Overlay.dayView($0, todayKey: todayKey) } }
  var goals: [WatchGoal] { day.map { Overlay.listed(Overlay.apply($0.goals, pending: pending, todayKey: todayKey)) } ?? [] }
  func goal(_ id: String) -> WatchGoal? { goals.first { $0.id == id } }

  /** 지금 보여야 할 블록 수 */
  var growth: Int {
    guard let s = snapshot else { return 0 }
    return Growth.shown(snapshot: s.growth, pending: pending)
  }

  /** 마지막으로 붙인 목표(차곡이 화면 아래 작은 판) */
  var lastGoal: WatchGoal? {
    if let r = pending.filter({ $0.kind == .add }).max(by: { $0.at < $1.at }), let g = goal(r.goalId) { return g }
    return snapshot?.lastGoalId.flatMap(goal)
  }

  // MARK: 바꾸기

  func refreshToday(_ now: Date = Date()) {
    let k = DateKey.of(now)
    if k != todayKey { todayKey = k; feedComplication() }
  }

  func markShown(_ n: Int) {
    lastShown = max(lastShown ?? 0, n)
    defaults.set(lastShown, forKey: Key.lastShown)
    feedComplication()
  }

  /** 블록 수나 오늘 붙인 목표가 바뀌었으면 컴플리케이션을 다시 그리게 한다 */
  func feedComplication() {
    guard live else { return }
    ComplicationFeed.update(growth: growth, lastGoal: lastGoal, todayKey: todayKey)
  }

  /** 누른 사실만 보낸다. 칸 번호와 날짜 규칙, 완성은 폰이 정한다 */
  func send(goalId: String, kind: WatchRequest.Kind, dateKey: String? = nil, slotIndex: Int? = nil, complete: Bool = false, now: Date = Date()) {
    let r = WatchRequest(id: UUID().uuidString.lowercased(), goalId: goalId, kind: kind, at: (now.timeIntervalSince1970 * 1000).rounded(),
                         dateKey: dateKey ?? DateKey.of(now), slotIndex: slotIndex, complete: complete ? true : nil)
    pending.append(r)
    savePending()
    // 떼면 블록이 모션 없이 줄고, 다시 붙이면 처음처럼 떨어진다 (2026-10-17)
    if let l = lastShown, growth < l { lastShown = growth; defaults.set(lastShown, forKey: Key.lastShown) }
    feedComplication()
    guard WCSession.isSupported() else { return }
    let s = WCSession.default
    guard s.activationState == .activated else { return }
    s.transferUserInfo(r.payload)
    if s.isReachable { s.sendMessage(r.payload, replyHandler: nil, errorHandler: nil) }
  }

  /** 세션이 켜지기 전에 누른 요청을 보낸다. 이미 줄 선 것은 빼고, 폰은 같은 id를 한 번만 붙인다 (검토 I2) */
  fileprivate func resendPending(queued: Set<String>) {
    let s = WCSession.default
    guard s.activationState == .activated else { return }
    for r in pending where !queued.contains(r.id) { s.transferUserInfo(r.payload) }
  }

  private func savePending() {
    if let data = try? JSONEncoder().encode(pending) { defaults.set(data, forKey: Key.pending) }
  }

  fileprivate func receive(json: String?) {
    guard let json, let s = WatchSnapshot.decode(json) else { return } // 깨진 스냅샷은 버린다
    snapshot = s
    defaults.set(json, forKey: Key.snapshot)
    pending = Overlay.pendingAfter(handled: s.handled, pending: pending, now: Date().timeIntervalSince1970 * 1000)
    savePending()
    if let l = lastShown {
      lastShown = Growth.confirmShown(lastShown: l, snapshot: s.growth, pending: pending)
      defaults.set(lastShown, forKey: Key.lastShown)
    }
    // 처음 연결하면 지금까지 붙인 스티커 전체가 이미 쌓인 상태로 시작한다
    if lastShown == nil { markShown(s.growth) } else { feedComplication() }
  }
}

extension Store: WCSessionDelegate {
  nonisolated func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
    let json = session.receivedApplicationContext["json"] as? String
    let queued = Set(session.outstandingUserInfoTransfers.compactMap { $0.userInfo["id"] as? String })
    Task { @MainActor in
      self.receive(json: json)
      self.resendPending(queued: queued)
    }
  }

  nonisolated func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
    let json = context["json"] as? String
    Task { @MainActor in self.receive(json: json) }
  }
}
