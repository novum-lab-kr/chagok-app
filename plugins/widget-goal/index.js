// 로컬 설정 플러그인: 위젯 편집의 「목표」 + 위젯 확장 글꼴·Privacy Manifest (PRD 4.10, 위젯 설계).
// expo-widgets가 위젯 폴더를 지우고 다시 만들기 때문에, 모든 mod가 끝난 뒤(withFinalizedMod) 고친다.
const fs = require('fs');
const path = require('path');
const { withFinalizedMod, IOSConfig } = require('expo/config-plugins');
const plist = require('@expo/plist').default;
const xcode = require('xcode');
const PbxFile = require('xcode/lib/pbxFile');
const { patchWidgetSwift, addFontsToInfoPlist } = require('./patch');

const TARGET = 'ExpoWidgetsTarget';
const FONT = 'neodgm-1.601.ttf';
const PRIVACY = 'PrivacyInfo.xcprivacy';
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
    // Privacy Manifest: Expo와 RN Pods는 앱 타깃에만 넣는다. 위젯 확장도 RN·expo-widgets(App Group UserDefaults)를
    // 함께 링크하므로 app.json ios.privacyManifests를 그대로 위젯 타깃에도 넣는다 (ITMS-91053).
    const manifest = cfg.ios?.privacyManifests;
    if (!manifest) throw new Error('widget-goal: app.json ios.privacyManifests가 없어요.');
    fs.writeFileSync(path.join(dir, PRIVACY), plist.build(manifest));
    const pbxPath = IOSConfig.Paths.getPBXProjectPath(cfg.modRequest.projectRoot);
    const project = xcode.project(pbxPath);
    project.parseSync();
    const targetKey = project.findTargetKey(TARGET);
    if (!targetKey) throw new Error(`widget-goal: Xcode 타깃 ${TARGET}을 못 찾았어요.`);
    addWidgetResource(project, targetKey, FONT);
    addWidgetResource(project, targetKey, PRIVACY);
    fs.writeFileSync(pbxPath, project.writeSync());
    return cfg;
  }]);
};

function addWidgetResource(project, targetKey, name) {
  // 앱 타깃에도 같은 이름(PrivacyInfo.xcprivacy)이 있으므로 프로젝트 전체가 아니라 위젯 타깃 리소스에서 찾는다.
  // pbxResourcesBuildPhaseObj는 타깃에 Resources 단계가 없으면 다른 타깃(앱) 것을 돌려주므로 타깃의 buildPhases에서 찾는다.
  const ref = project.pbxNativeTargetSection()[targetKey].buildPhases.find((p) => p.comment === 'Resources');
  const phase = ref && project.hash.project.objects.PBXResourcesBuildPhase[ref.value];
  if (phase && phase.files.some((f) => f.comment === `${name} in Resources`)) return;
  // addResourceFile은 이 프로젝트에 없는 'Resources' 그룹을 찾다가 죽는다. 같은 일을 단계별로 한다.
  // 위젯 그룹의 path가 ExpoWidgetsTarget이므로 파일 path는 파일 이름만 쓴다.
  const groupKey = project.findPBXGroupKey({ name: TARGET });
  if (!groupKey) throw new Error(`widget-goal: Xcode 그룹 ${TARGET}을 못 찾았어요.`);
  // expo-widgets가 만든 위젯 타깃에는 Resources 빌드 단계가 없어, 없는 채로 두면 파일이 앱 본체로 들어간다.
  if (!phase) project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetKey);
  const file = new PbxFile(name, { target: targetKey });
  file.target = targetKey;
  file.uuid = project.generateUuid();
  file.fileRef = project.generateUuid();
  project.addToPbxBuildFileSection(file);
  project.addToPbxResourcesBuildPhase(file);
  project.addToPbxFileReferenceSection(file);
  project.addToPbxGroup(file, groupKey);
}
