// 위젯 편집에 사용자 목표 목록을 띄운다 (PRD 4.10, 시험 구현 결과 2026-10-06).
// expo-widgets가 만든 <Widget>.swift를 고친다. 자리를 못 찾으면 멈춰서, 라이브러리가 바뀐 것을 빌드 때 알게 한다.
const MARK = '// widget-goal: patched';

function entitySwift(name, label) {
  return `
${MARK}
struct ${name}GoalEntity: AppEntity {
  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: ${JSON.stringify(label)})
  static var defaultQuery = ${name}GoalQuery()
  let id: String
  let name: String
  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\\(name)") }
}

struct ${name}GoalQuery: EntityQuery {
  func goals() -> [${name}GoalEntity] {
    guard let first = WidgetsStorage.getArray(forKey: "__expo_widgets_${name}_timeline")?.first as? [String: Any],
          let props = first["props"] as? [String: Any],
          let order = props["order"] as? [[String: Any]] else { return [] }
    return order.compactMap { item in
      guard let id = item["id"] as? String, let name = item["name"] as? String else { return nil }
      return ${name}GoalEntity(id: id, name: name)
    }
  }
  func entities(for identifiers: [${name}GoalEntity.ID]) async throws -> [${name}GoalEntity] {
    goals().filter { identifiers.contains($0.id) }
  }
  func suggestedEntities() async throws -> [${name}GoalEntity] { goals() }
}
`;
}

const ALL_REQUESTS = `    let allRequests: [Any] = {
      var seen = Set<String>()
      var out: [Any] = []
      for case let item as [String: Any] in timeline {
        for case let request as [String: Any] in ((item["props"] as? [String: Any])?["requests"] as? [Any] ?? []) {
          if let id = request["id"] as? String, seen.insert(id).inserted { out.append(request) }
        }
      }
      return out
    }()
`;

function replaceOnce(source, pattern, replacement, widgetName, what) {
  if (!pattern.test(source)) {
    throw new Error(`widget-goal: ${widgetName} — ${what} 자리를 못 찾았어요. expo-widgets가 만든 Swift 모양이 바뀌었는지 보세요.`);
  }
  return source.replace(pattern, replacement);
}

function patchWidgetSwift(source, widgetName, label) {
  if (source.includes(MARK)) return source;
  let out = replaceOnce(
    source,
    new RegExp(`(struct ${widgetName}ConfigurationAppIntent: WidgetConfigurationIntent \\{[\\s\\S]*?)(\\n  func perform\\(\\))`),
    `$1  @Parameter(title: ${JSON.stringify(label)})\n  var goal: ${widgetName}GoalEntity?\n$2`,
    widgetName, '설정 의도(perform 앞)',
  );
  // 마지막 파라미터 뒤에는 쉼표가 없으므로 goal을 맨 앞에 넣는다.
  out = replaceOnce(out, /(env\["configuration"\] = \[\n)/, '$1      "goal": entry.configuration.goal?.id ?? "",\n', widgetName, 'env["configuration"]');
  // 위젯 버튼은 지금 보이는 항목에만 요청을 적는다. 읽을 때 모든 항목의 요청을 합쳐 자정 항목도 보게 한다.
  out = replaceOnce(
    out,
    /(let timeline = WidgetsStorage\.getArray\(forKey: "__expo_widgets_\w+_timeline"\) \?\? \[\]\n)/,
    `$1${ALL_REQUESTS}`,
    widgetName, 'parseTimeline의 timeline 읽기',
  );
  out = replaceOnce(out, /\n(\s+)props: props,\n/, '\n$1props: props.merging(["requests": allRequests]) { _, new in new },\n', widgetName, 'parseTimeline의 props');
  return out + entitySwift(widgetName, label);
}

function addFontsToInfoPlist(plistXml, fontFile) {
  if (plistXml.includes(`<string>${fontFile}</string>`)) return plistXml;
  const i = plistXml.lastIndexOf('</dict>');
  if (i < 0) throw new Error('widget-goal: 위젯 Info.plist 모양이 바뀌었어요.');
  return `${plistXml.slice(0, i)}<key>UIAppFonts</key><array><string>${fontFile}</string></array>${plistXml.slice(i)}`;
}

module.exports = { patchWidgetSwift, addFontsToInfoPlist };
