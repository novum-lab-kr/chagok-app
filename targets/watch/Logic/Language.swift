import Foundation

/// 폰 앱과 같은 규칙: 기기 첫 언어가 한국어면 한국어, 나머지는 영어.
enum Language {
  static let isKorean = Locale.preferredLanguages.first?.hasPrefix("ko") ?? true
  static func pick(_ ko: String, _ en: String) -> String { isKorean ? ko : en }
}
