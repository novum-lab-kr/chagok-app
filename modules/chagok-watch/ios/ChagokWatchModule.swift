// 폰 쪽 워치 연결 (PRD 4.14, 워치 계획 2 Task 4).
// 워치가 보낸 붙임 요청을 큐에 쌓아 두고 JS가 읽고 지운다. 판단은 JS(applyWidgetRequests)가 한다.
// 스냅샷은 updateApplicationContext로 보낸다 — 마지막 하나만 남는다.
import ExpoModulesCore
import WatchConnectivity

final class WatchLink: NSObject, WCSessionDelegate {
  static let shared = WatchLink()
  private static let key = "chagokWatchRequests"
  private let lock = NSLock()
  /** 요청이 들어오거나 세션이 준비되면 부른다(앱이 켜져 있으면 바로 동기화) — 켜는 동안 첫 동기화가 스냅샷을 못 보냈을 수 있다 (검토 I3) */
  var onRequest: (() -> Void)?

  func start() {
    guard WCSession.isSupported() else { return }
    let s = WCSession.default
    if s.delegate == nil { s.delegate = self }
    if s.activationState != .activated { s.activate() }
  }

  var isReady: Bool {
    guard WCSession.isSupported() else { return false }
    let s = WCSession.default
    return s.activationState == .activated && s.isPaired && s.isWatchAppInstalled
  }

  func read() -> [String] {
    lock.lock(); defer { lock.unlock() }
    return UserDefaults.standard.stringArray(forKey: Self.key) ?? []
  }

  func ack(_ ids: [String]) {
    let done = Set(ids)
    lock.lock(); defer { lock.unlock() }
    let left = (UserDefaults.standard.stringArray(forKey: Self.key) ?? []).filter { json in
      guard let id = Self.idOf(json) else { return false } // id를 읽을 수 없는 것은 처리할 수 없다 — 지운다
      return !done.contains(id)
    }
    UserDefaults.standard.set(left, forKey: Self.key)
  }

  func send(_ json: String) throws {
    try WCSession.default.updateApplicationContext(["json": json])
  }

  private static func idOf(_ json: String) -> String? {
    guard let data = json.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    return obj["id"] as? String
  }

  private func enqueue(_ info: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(info),
          let data = try? JSONSerialization.data(withJSONObject: info),
          let json = String(data: data, encoding: .utf8) else { return }
    lock.lock()
    let list = UserDefaults.standard.stringArray(forKey: Self.key) ?? []
    // transferUserInfo와 sendMessage로 같은 요청이 두 번 올 수 있다 — 같은 id는 하나만 둔다
    if let id = Self.idOf(json), list.contains(where: { Self.idOf($0) == id }) { lock.unlock(); return }
    UserDefaults.standard.set(list + [json], forKey: Self.key)
    lock.unlock()
    onRequest?()
  }

  // MARK: WCSessionDelegate
  func session(_ s: WCSession, activationDidCompleteWith st: WCSessionActivationState, error: Error?) {
    if st == .activated { onRequest?() }
  }
  /** 워치 앱을 새로 설치했거나 다른 워치로 바꿨다 */
  func sessionWatchStateDidChange(_ s: WCSession) { onRequest?() }
  func sessionDidBecomeInactive(_ s: WCSession) {}
  func sessionDidDeactivate(_ s: WCSession) { WCSession.default.activate() } // 다른 워치로 바꿨을 때
  func session(_ s: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) { enqueue(userInfo) }
  func session(_ s: WCSession, didReceiveMessage message: [String: Any]) { enqueue(message) }
  func session(_ s: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    enqueue(message)
    replyHandler(["ok": true])
  }
}

public class ChagokWatchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ChagokWatch")
    Events("onRequest")
    OnCreate {
      WatchLink.shared.onRequest = { [weak self] in self?.sendEvent("onRequest", [:]) }
      WatchLink.shared.start()
    }
    Function("isReady") { () -> Bool in WatchLink.shared.isReady }
    Function("readRequests") { () -> [String] in WatchLink.shared.read() }
    Function("ack") { (ids: [String]) in WatchLink.shared.ack(ids) }
    Function("send") { (json: String) throws in try WatchLink.shared.send(json) }
  }
}
