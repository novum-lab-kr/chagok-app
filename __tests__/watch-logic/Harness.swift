// 워치 Logic 테스트 실행기. XCTest 없이 swiftc 한 번으로 돈다 — scripts/test-watch-logic.sh
import Foundation

var failures = 0
var passes = 0

func test(_ name: String, _ body: () throws -> Void) {
  let before = failures
  do { try body() } catch { failures += 1; print("  ✕ \(name): threw \(error)") }
  if failures == before { passes += 1; print("  ✓ \(name)") } else if failures > before { print("  ✕ \(name)") }
}

func expectEqual<T: Equatable>(_ a: T, _ b: T, file: StaticString = #fileID, line: UInt = #line) {
  if a != b { failures += 1; print("    \(file):\(line) expected \(b), got \(a)") }
}
