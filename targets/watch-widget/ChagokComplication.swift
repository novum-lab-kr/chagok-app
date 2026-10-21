// 시계 화면 긴 칸 컴플리케이션 (2026-10-16 결정 5 K2): 차곡이와 머리 위 블록, 두 줄 문구. 누르면 워치 앱이 열린다.
// 값은 워치 앱(targets/watch/ComplicationFeed.swift)이 App Group에 둔다. 여기서는 읽어서 그리기만 한다.
import SwiftUI
import WidgetKit

private let appGroup = "group.com.novumlab.chagok.watch"
private let textKey = "complicationText"
private let imageFile = "complication-chagok.png"

struct ChagokEntry: TimelineEntry {
  let date: Date
  let text: String
  let image: UIImage?
}

struct ChagokProvider: TimelineProvider {
  func placeholder(in context: Context) -> ChagokEntry { ChagokEntry(date: Date(), text: "차곡차곡\n블록을 쌓아요", image: nil) }
  func getSnapshot(in context: Context, completion: @escaping (ChagokEntry) -> Void) { completion(read(Date())) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<ChagokEntry>) -> Void) {
    let now = Date()
    let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(86_400)
    // 자정에 「오늘 붙였어요」를 지운 항목으로 바꾼다
    completion(Timeline(entries: [read(now), read(midnight)], policy: .after(midnight)))
  }

  private func read(_ date: Date) -> ChagokEntry {
    let d = UserDefaults(suiteName: appGroup)
    let day = d?.string(forKey: textKey + ".day")
    let text = (day == dayKey(date) ? d?.string(forKey: textKey) : d?.string(forKey: textKey + ".other")) ?? "폰에서 차곡차곡을\n열어 주세요"
    let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)?.appendingPathComponent(imageFile)
    let image = url.flatMap { try? Data(contentsOf: $0) }.flatMap(UIImage.init(data:))
    return ChagokEntry(date: date, text: text, image: image)
  }

  /** 워치 앱 DateKey와 같은 양력 yyyy-MM-dd */
  private func dayKey(_ date: Date) -> String {
    var g = Calendar(identifier: .gregorian)
    g.timeZone = .current
    let c = g.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
  }
}

struct ChagokComplicationView: View {
  let entry: ChagokEntry
  var body: some View {
    HStack(spacing: 6) {
      if let image = entry.image {
        Image(uiImage: image).interpolation(.none).resizable().scaledToFit().frame(width: 46, height: 42).widgetAccentable()
      }
      Text(entry.text)
        .font(.system(size: 14, weight: .semibold, design: .rounded))
        .lineLimit(2)
        .minimumScaleFactor(0.75)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .containerBackground(for: .widget) { Color.clear }
    .accessibilityElement(children: .combine)
    .accessibilityLabel("차곡이, " + entry.text.replacingOccurrences(of: "\n", with: " "))
  }
}

@main
struct ChagokComplication: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ChagokComplication", provider: ChagokProvider()) { ChagokComplicationView(entry: $0) }
      .configurationDisplayName("차곡이")
      .description("차곡이와 오늘 붙인 스티커")
      .supportedFamilies([.accessoryRectangular])
  }
}
