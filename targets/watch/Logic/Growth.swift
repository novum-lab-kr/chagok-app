// 차곡이 성장 (PRD 4.14): 스티커 하나 = 블록 하나. 머리 위 0~2개, 셋째가 오면 세 개를 한 묶음으로 보관함에.
// 보관함 하나 = 2단 × 4칸, 칸마다 묶음 둘 = 묶음 16개 = 스티커 48개.
import Foundation

enum Growth {
  static let perBundle = 3
  static let bundlesPerBox = 16
  /** 머리 위 블록 색: 민트, 아이보리, 살구 (src/watch/blockColor.ts FALLBACK_BLOCK_COLORS와 같은 값) */
  static let fallback = ["#AFE1CB", "#FEF1D1", "#FD855F"]

  /** 워치에 보일 블록 수 = 지금 붙어 있는 스티커 수. 폰이 아직 처리하지 않은 붙임은 더하고 뗌은 뺀다 (2026-10-17: 떼면 준다) */
  static func shown(snapshot: Int, pending: [WatchRequest]) -> Int {
    max(0, snapshot + pendingNet(pending))
  }

  /** 처리 안 된 요청이 바꿀 블록 수: 붙임 +1, 뗌 -1 */
  static func pendingNet(_ pending: [WatchRequest]) -> Int {
    pending.reduce(0) { $0 + ($1.kind == .add ? 1 : -1) }
  }

  /** 보여 준 수를 지금 수 아래로 내려 맞춘다: 뗐거나 폰이 건너뛴 붙임. 안 그러면 다시 붙인 블록이 떨어지지 않는다 */
  static func confirmShown(lastShown: Int, snapshot: Int, pending: [WatchRequest]) -> Int {
    min(lastShown, shown(snapshot: snapshot, pending: pending))
  }

  static func heads(_ growth: Int) -> Int { growth % perBundle }
  static func bundles(_ growth: Int) -> Int { growth / perBundle }

  /** 보관함마다 든 묶음 수. 맨 앞(0번)이 지금 채우는 보관함, 뒤는 다 채운 보관함 */
  static func boxes(_ growth: Int) -> [Int] {
    let b = bundles(growth)
    if b == 0 { return [0] }
    let k = (b - 1) / bundlesPerBox + 1
    return [(b - 1) % bundlesPerBox + 1] + Array(repeating: bundlesPerBox, count: k - 1)
  }

  /** 머리 위 블록 색, 아래부터. 스티커와 상관없이 민트, 아이보리, 살구 순서 — 차곡이 처음 그림의 판 세 장 (2026-10-16 결정 3 B3) */
  static func headColors(growth: Int) -> [String] { stack(count: heads(growth)) }

  /** 블록 count개를 아래부터 쌓은 색. 셋째가 막 와서 보관하기 직전에도 쓴다 */
  static func stack(count: Int) -> [String] {
    (0..<count).map { fallback[$0 % fallback.count] }
  }
}
