// 컴플리케이션에 줄 값 (2026-10-16 결정 5 K2). 워치 앱이 차곡이 그림을 PNG로 굽고 문구와 함께 App Group에 둔다 —
// 컴플리케이션(targets/watch-widget)은 읽어서 그리기만 한다. 그리기 코드를 두 타깃에 나눠 두지 않으려고.
import SwiftUI
import WidgetKit
import WatchKit

@MainActor
enum ComplicationFeed {
  private static var last = ""

  static func update(growth: Int, lastGoal: WatchGoal?, todayKey: String) {
    let today = Complication.text(lastGoal: lastGoal, growth: growth)
    let other = Complication.text(lastGoal: nil, growth: growth)
    let key = "\(growth)|\(today)|\(todayKey)"
    guard key != last,
          let defaults = UserDefaults(suiteName: Complication.appGroup),
          let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Complication.appGroup) else { return }
    last = key
    let sprite = CharacterSprite(face: growth == 0 ? "sleepy" : "smile", heads: Growth.headColors(growth: growth).map { Color(hex: $0) }, cell: 2)
    let renderer = ImageRenderer(content: sprite)
    renderer.scale = WKInterfaceDevice.current().screenScale
    if let png = renderer.uiImage?.pngData() { try? png.write(to: dir.appendingPathComponent(Complication.imageFile), options: .atomic) }
    // 자정이 지나면 「오늘 붙였어요」는 지난 말이다 — 컴플리케이션이 날짜를 보고 둘 중 하나를 고른다
    defaults.set(today, forKey: Complication.textKey)
    defaults.set(other, forKey: Complication.textKey + ".other")
    defaults.set(todayKey, forKey: Complication.textKey + ".day")
    WidgetCenter.shared.reloadAllTimelines()
  }
}
