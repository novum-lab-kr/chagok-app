---
name: widget-tap-timing
description: How to measure iOS widget tap latency in the simulator and what dominated it (2026-10-07)
metadata:
  node_type: memory
  type: project
  originSessionId: fa12b996-4588-40bd-a965-5caf0f62fead
  modified: 2026-10-07T14:03:18.271Z
---

Widget tap latency is measured from simulator logs, not video: `xcrun simctl spawn <udid> log stream --level debug --predicate 'process == "ExpoWidgetsTarget" OR process == "chronod"'`, tap via Maestro (`tapOn point`), then read `Received action` → `Ending performAction` → `reload: begin/succeeded` → `Timelines reload detected`. `simctl io recordVideo` became unreliable after the first run (missed changes).

Findings 2026-10-07 (branch `perf/widget-tap-speed`): each reload archives 8 timeline entries × light/dark × fullColor/accented = 32 views. Per view: 목표 하나 ~15ms, 적립판 ~30ms, 이번 달 ~75ms (≈3s total). expo-widgets' `reloadTimelines(ofKind:)` in `WidgetUserInteraction.perform` made other same-kind instances reload first; removed via patch-package.

Spike `spike/widget-fewer-entries` (2 entries + "late entry → use now" fallback), Release build, idle Mac: 목표 하나 0.2s, 적립판 0.4–0.5s, 이번 달 0.7s (vs 0.5 / 1.6–3.3 / 2.3–2.5s with 8 entries). Measuring while a build runs roughly doubles times — never measure during a build.

**Why:** user said widget taps feel "너무 느리다"; entry count (`MIDNIGHTS_AHEAD`) trades speed vs staleness when the app isn't opened for days.
**How to apply:** reuse this method before/after any widget perf change; check the month widget first, it is the slowest. Related: [[plain-words-not-jargon]]
