import WidgetKit
import SwiftUI
import AppIntents
internal import ExpoWidgets

// AppIntent
struct ChagokGoalConfigurationAppIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "목표 하나 Configuration"

  @Parameter(title: "바탕", default: ChagokGoalBackgroundEnum.ivory)
  var background: ChagokGoalBackgroundEnum

  func perform() async throws -> some IntentResult {
    return .result()
  }
}

enum ChagokGoalBackgroundEnum: String, CaseIterable, AppEnum {
  case ivory
  case white
  case ink

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "바탕")

  static var caseDisplayRepresentations: [ChagokGoalBackgroundEnum: DisplayRepresentation] = [
    .ivory: DisplayRepresentation(title: "아이보리"),
    .white: DisplayRepresentation(title: "흰색"),
    .ink: DisplayRepresentation(title: "먹색")
  ]
}

struct ChagokGoalTimelineEntry: TimelineEntry {
  let date: Date
  public let name: String
  public let props: [String: Any]?
  public let entryIndex: Int?
  let configuration: ChagokGoalConfigurationAppIntent
}

struct ChagokGoalTimelineProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> ChagokGoalTimelineEntry {
    ChagokGoalTimelineEntry(date: Date(), name: "ChagokGoal", props: nil, entryIndex: nil, configuration: ChagokGoalConfigurationAppIntent())
  }

  func snapshot(for configuration: ChagokGoalConfigurationAppIntent, in context: Context) async -> ChagokGoalTimelineEntry {
    let entries = parseTimeline(configuration: configuration)
    return entries.first ?? ChagokGoalTimelineEntry(date: Date(), name: "ChagokGoal", props: nil, entryIndex: nil, configuration: configuration)
  }

  func timeline(for configuration: ChagokGoalConfigurationAppIntent, in context: Context) async -> Timeline<ChagokGoalTimelineEntry> {
    let entries = self.parseTimeline(configuration: configuration)
    let timeline = Timeline<ChagokGoalTimelineEntry>(entries: entries, policy: .atEnd)
    return timeline
  }
  
  func parseTimeline(configuration: ChagokGoalConfigurationAppIntent) -> [ChagokGoalTimelineEntry] {
    let timeline = WidgetsStorage.getArray(forKey: "__expo_widgets_ChagokGoal_timeline") ?? []
    let entries: [ChagokGoalTimelineEntry?] = timeline.enumerated().map { index, entry in
      guard let entry = entry as? [String: Any], let timestamp = entry["timestamp"] as? Int, let props = entry["props"] as? [String: Any] else {
        return nil
      }
      return ChagokGoalTimelineEntry(
        date: Date(timeIntervalSince1970: Double(timestamp) / 1000),
        name: "ChagokGoal",
        props: props,
        entryIndex: index,
        configuration: configuration
      )
    }

    return entries.compactMap(\.self)
  }
}

struct ChagokGoalEntryView: View {
  @Environment(\.self) var environment
  var entry: ChagokGoalTimelineProvider.Entry

  init(entry: ChagokGoalTimelineProvider.Entry) {
    self.entry = entry
  }

  private var widgetEnvironment: [String: Any] {
    var env: [String: Any] = getWidgetEnvironment(environment: environment)
    env["timestamp"] = Int(entry.date.timeIntervalSince1970 * 1000)
    env["configuration"] = [
      "background": entry.configuration.background.rawValue
    ]
    return env
  }

  private var widgetEnvironmentString: String? {
    guard let data = try? JSONSerialization.data(withJSONObject: widgetEnvironment),
          let jsonString = String(data: data, encoding: .utf8) else {
        return nil
    }
    return jsonString
  }

  public var body: some View {
    if let layout = WidgetsStorage.getString(forKey: "__expo_widgets_\(entry.name)_layout"),
       !layout.isEmpty {
      let node = evaluateLayout(layout: layout, props: entry.props ?? [:], environment: widgetEnvironment)
      WidgetsDynamicView(name: entry.name, kind: .widget, node: node, entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    } else {
      WidgetsDynamicView(name: entry.name, kind: .widget, node: createRedBox(message: "No layout found for \(WidgetsStorage.appGroupIdentifier ?? "")::\(entry.name)"), entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    }
  }
}


@available(iOS 17.0, *)
struct ChagokGoal: Widget {
  let name: String = "ChagokGoal"

  var body: some WidgetConfiguration {
    return AppIntentConfiguration(kind: name, intent: ChagokGoalConfigurationAppIntent.self, provider: ChagokGoalTimelineProvider()) { entry in
      ChagokGoalEntryView(entry: entry)
    }
    .configurationDisplayName("목표 하나")
    .description("목표 하나의 진행과 오늘 스티커")
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}