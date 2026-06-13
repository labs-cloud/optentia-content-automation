// Workaround for building React Native 0.76's vendored `fmt` with very new
// Xcode/Clang (iOS 26 SDK): the `consteval` format-string checks fail to compile
// ("not a constant expression"). `fmt` derives `FMT_CONSTEVAL` from the
// `FMT_USE_CONSTEVAL` macro and redefines it unconditionally, so the only
// reliable switch is to set `FMT_USE_CONSTEVAL=0` (disables consteval → ordinary
// runtime calls). Applied to every pod target since fmt headers are included
// transitively across React-Fabric / RCT-Folly / etc.
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "FMT_USE_CONSTEVAL=0";
const SNIPPET = `
    installer.pods_project.targets.each do |__t|
      __t.build_configurations.each do |__c|
        __c.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        __c.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << '${MARKER}'
      end
    end`;

module.exports = function withFmtFix(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      if (!contents.includes(MARKER)) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          (m) => `${m}${SNIPPET}`,
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
