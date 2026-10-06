import { readFileSync } from 'fs';
import { join } from 'path';
// 플러그인은 Expo가 바로 읽는 CommonJS다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { patchWidgetSwift, addFontsToInfoPlist } = require('../plugins/widget-goal/patch');

const generated = readFileSync(join(__dirname, 'fixtures/ChagokGoal.generated.swift'), 'utf8');

describe('widget-goal patch', () => {
  const out: string = patchWidgetSwift(generated, 'ChagokGoal', '목표');

  it('목표 목록 타입을 붙이고 위젯 자기 타임라인을 읽는다', () => {
    expect(out).toContain('struct ChagokGoalGoalEntity: AppEntity');
    expect(out).toContain('struct ChagokGoalGoalQuery: EntityQuery');
    expect(out).toContain('"__expo_widgets_ChagokGoal_timeline"');
  });

  it('설정 의도에 목표 줄을, JS 설정에 goal을 넣는다', () => {
    expect(out).toMatch(/@Parameter\(title: "목표"\)\n\s+var goal: ChagokGoalGoalEntity\?/);
    expect(out).toContain('"goal": entry.configuration.goal?.id ?? ""');
  });

  it('타임라인을 읽을 때 모든 항목의 요청을 합친다 (Review Focus 2)', () => {
    expect(out).toContain('let allRequests: [Any]');
    expect(out).toContain('props: props.merging(["requests": allRequests]) { _, new in new },');
    expect(out).not.toMatch(/\n\s+props: props,\n/);
  });

  it('두 번 돌려도 같다', () => {
    expect(patchWidgetSwift(out, 'ChagokGoal', '목표')).toBe(out);
  });

  it('자리를 못 찾으면 멈춘다 (expo-widgets 생성 모양이 바뀜)', () => {
    expect(() => patchWidgetSwift('struct Other {}', 'ChagokGoal', '목표')).toThrow('widget-goal: ChagokGoal');
  });

  it('위젯 Info.plist에 글꼴을 등록한다', () => {
    const plist = '<?xml version="1.0"?><plist version="1.0"><dict><key>NSExtension</key><dict/></dict></plist>';
    const p: string = addFontsToInfoPlist(plist, 'neodgm-1.601.ttf');
    expect(p).toContain('<key>UIAppFonts</key>');
    expect(p).toContain('<string>neodgm-1.601.ttf</string>');
    expect(addFontsToInfoPlist(p, 'neodgm-1.601.ttf')).toBe(p);
  });
});
