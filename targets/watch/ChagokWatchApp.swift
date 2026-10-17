// 차곡차곡 워치 앱 (PRD 4.14). 보여 주기와 붙임 요청만 한다 — 판단은 폰이 한다.
import SwiftUI
import WatchKit
import Combine

@main
struct ChagokWatchApp: App {
  @StateObject private var store = Store()
  var body: some Scene {
    WindowGroup { RootView().environmentObject(store) }
  }
}

enum Route: Equatable {
  case home
  case goal(String)
  case confirm(String, dateKey: String?)
  case character
}

struct RootView: View {
  @EnvironmentObject var store: Store
  @Environment(\.scenePhase) private var phase
  @State private var route: Route = .home
  @State private var flow: Flow?
  /** 차곡이 화면에서 돌아갈 곳 */
  @State private var after: Route = .home
  @State private var pop: (goal: String, index: Int)?
  private let tick = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

  var body: some View {
    Group {
      switch route {
      case .home:
        HomeView(openGoal: { route = .goal($0) }, openCharacter: { open(.character, flow: nil, back: .home) })
      case let .goal(id):
        if let g = store.goal(id) {
          board(g)
        } else {
          HomeView(openGoal: { route = .goal($0) }, openCharacter: { open(.character, flow: nil, back: .home) })
        }
      case let .confirm(id, key):
        if let g = store.goal(id) {
          ConfirmView(goal: g, finish: { stick(g, dateKey: key, complete: true) }, cancel: { route = .goal(id) })
        } else {
          HomeView(openGoal: { route = .goal($0) }, openCharacter: { open(.character, flow: nil, back: .home) })
        }
      case .character:
        CharacterView(flow: flow, back: { finishCharacter() }, done: { finishCharacter() })
      }
    }
    // 화면 왼쪽 끝에서 오른쪽으로 밀면 뒤로 (워치 앱 기본 동작. 시스템 화면 이동을 안 써서 직접 단다)
    .simultaneousGesture(DragGesture(minimumDistance: 20, coordinateSpace: .global).onEnded { v in
      if v.startLocation.x < 24, v.translation.width > 40, v.translation.width > abs(v.translation.height) * 1.5 { goBack() }
    })
    .onChange(of: phase) { _, p in if p == .active { store.refreshToday(); catchUp() } }
    // 앱을 연 뒤에 새 스냅샷이 오면(폰이 늦게 보냄) 첫 화면에 있을 때만 한 번 더 본다
    .onChange(of: store.snapshot?.growth) { _, _ in if phase == .active, route == .home { catchUp() } }
    #if targetEnvironment(simulator)
    .task { await debugRoute() }
    #endif
    .onReceive(tick) { _ in store.refreshToday() }
  }

  @ViewBuilder private func board(_ g: WatchGoal) -> some View {
    let act: (BoardAction) -> Void = { a in
      switch a {
      case let .add(key): stick(g, dateKey: key, complete: false)
      case let .confirm(key): route = .confirm(g.id, dateKey: key)
      case let .remove(slot):
        store.send(goalId: g.id, kind: .remove, slotIndex: slot)
        WKInterfaceDevice.current().play(.click)
      }
    }
    if case .calendar = g.board {
      CalendarView(goal: g, todayKey: store.todayKey, back: { route = .home }, act: act)
    } else {
      TallyView(goal: g, pop: pop?.goal == g.id ? pop?.index : nil, back: { route = .home }, act: act)
    }
  }

  /** 붙인 뒤 흐름: 칸이 차고 톡 → 0.3초 뒤 차곡이 화면 → 판으로(완성이면 첫 화면으로) */
  private func stick(_ g: WatchGoal, dateKey: String?, complete: Bool) {
    let from = store.lastShown ?? store.growth
    if case let .tally(cells, _) = g.board { pop = cells.firstIndex(of: .empty).map { (g.id, $0) } }
    store.send(goalId: g.id, kind: .add, dateKey: dateKey, complete: complete)
    WKInterfaceDevice.current().play(.click)
    if complete { route = .goal(g.id) }
    let back: Route = complete ? .home : .goal(g.id)
    let label = complete ? Copy.completed(g.name) : Copy.stuck(g.name)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.32) {
      pop = nil
      // 그사이 뒤로 갔으면 따라가지 않는다. 블록은 첫 화면에서 catchUp이 떨어뜨린다
      guard route == .goal(g.id) else { return }
      open(.character, flow: Flow(from: from, label: label, auto: true), back: back)
    }
  }

  /** 워치를 열었을 때 폰과 위젯에서 늘어난 블록을 몰아서 한 번 떨어뜨린다 */
  private func catchUp() {
    guard route != .character, store.snapshot != nil, let last = store.lastShown, store.growth > last else { return }
    open(.character, flow: Flow(from: last, label: Copy.grew(store.growth - last), auto: true), back: route)
  }

  private func open(_ r: Route, flow f: Flow?, back: Route) {
    flow = f
    after = back
    route = r
  }

  #if targetEnvironment(simulator)
  /** 시뮬레이터 캡처용(시뮬레이터 빌드만, 기기에는 없다): xcrun simctl launch <워치> <번들 id> -chagokRoute goal:<id> | confirm:<id> | character | stick:<id> */
  private func debugRoute() async {
    guard let arg = UserDefaults.standard.string(forKey: "chagokRoute") else { return }
    try? await Task.sleep(nanoseconds: 1_500_000_000) // 스냅샷을 받을 때까지
    let parts = arg.split(separator: ":", maxSplits: 1).map(String.init)
    let id = parts.count > 1 ? parts[1] : ""
    switch parts[0] {
    case "goal": route = .goal(id)
    case "confirm": route = .confirm(id, dateKey: nil)
    case "character": open(.character, flow: nil, back: .home)
    case "stick": if let g = store.goal(id) { route = .goal(id); stick(g, dateKey: nil, complete: false) }
    default: break
    }
  }
  #endif

  /** 밀어서 뒤로: 각 화면의 뒤로 버튼과 같은 곳으로 */
  private func goBack() {
    switch route {
    case .home: break
    case .goal: route = .home
    case let .confirm(id, _): route = .goal(id)
    case .character: finishCharacter()
    }
  }

  private func finishCharacter() {
    store.markShown(store.growth)
    flow = nil
    route = after
  }
}
