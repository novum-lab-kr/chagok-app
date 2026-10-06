// 로컬 설정 플러그인: 위젯 편집의 「목표」 + 위젯 확장 글꼴 (PRD 4.10, 위젯 설계).
// expo-widgets가 위젯 폴더를 지우고 다시 만들기 때문에, 모든 mod가 끝난 뒤(withFinalizedMod) 고친다.
const fs = require('fs');
const path = require('path');
const { withFinalizedMod, IOSConfig } = require('expo/config-plugins');
const xcode = require('xcode');
const PbxFile = require('xcode/lib/pbxFile');
const { patchWidgetSwift, addFontsToInfoPlist } = require('./patch');

const TARGET = 'ExpoWidgetsTarget';
const FONT = 'neodgm-1.601.ttf';
const WIDGETS = ['ChagokGoal', 'ChagokMonth', 'ChagokTally'];

module.exports = function withWidgetGoal(config) {
  return withFinalizedMod(config, ['ios', async (cfg) => {
    const iosRoot = cfg.modRequest.platformProjectRoot;
    const dir = path.join(iosRoot, TARGET);
    for (const name of WIDGETS) {
      const file = path.join(dir, `${name}.swift`);
      if (!fs.existsSync(file)) throw new Error(`widget-goal: ${file}이 없어요. app.json expo-widgets 위젯 이름을 확인하세요.`);
      fs.writeFileSync(file, patchWidgetSwift(fs.readFileSync(file, 'utf8'), name, '목표'));
    }
    // 글꼴: 위젯 폴더에 복사 → 위젯 Info.plist UIAppFonts → 위젯 타깃 리소스
    fs.copyFileSync(path.join(cfg.modRequest.projectRoot, 'src/design-system/assets', FONT), path.join(dir, FONT));
    const plistPath = path.join(dir, 'Info.plist');
    fs.writeFileSync(plistPath, addFontsToInfoPlist(fs.readFileSync(plistPath, 'utf8'), FONT));
    const pbxPath = IOSConfig.Paths.getPBXProjectPath(cfg.modRequest.projectRoot);
    const project = xcode.project(pbxPath);
    project.parseSync();
    const targetKey = project.findTargetKey(TARGET);
    if (!targetKey) throw new Error(`widget-goal: Xcode 타깃 ${TARGET}을 못 찾았어요.`);
    if (!project.hasFile(FONT)) {
      // addResourceFile은 이 프로젝트에 없는 'Resources' 그룹을 찾다가 죽는다. 같은 일을 단계별로 한다.
      // 위젯 그룹의 path가 ExpoWidgetsTarget이므로 파일 path는 글꼴 이름만 쓴다.
      const groupKey = project.findPBXGroupKey({ name: TARGET });
      if (!groupKey) throw new Error(`widget-goal: Xcode 그룹 ${TARGET}을 못 찾았어요.`);
      // expo-widgets가 만든 위젯 타깃에는 Resources 빌드 단계가 없어, 없는 채로 두면 글꼴이 앱 본체로 들어간다.
      const hasResourcesPhase = project.pbxNativeTargetSection()[targetKey].buildPhases.some((p) => p.comment === 'Resources');
      if (!hasResourcesPhase) project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetKey);
      const file = new PbxFile(FONT, { target: targetKey });
      file.target = targetKey;
      file.uuid = project.generateUuid();
      file.fileRef = project.generateUuid();
      project.addToPbxBuildFileSection(file);
      project.addToPbxResourcesBuildPhase(file);
      project.addToPbxFileReferenceSection(file);
      project.addToPbxGroup(file, groupKey);
    }
    fs.writeFileSync(pbxPath, project.writeSync());
    return cfg;
  }]);
};
