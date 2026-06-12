// Workaround for building React Native 0.76's vendored `fmt` with very new
// Xcode/Clang (iOS 26 SDK): the `consteval` format-string checks fail to
// compile ("not a constant expression"). Defining FMT_CONSTEVAL to empty turns
// them into ordinary runtime calls, which compiles cleanly.
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SNIPPET = `
    installer.pods_project.targets.each do |__t|
      if __t.name == 'fmt' || __t.name == 'RCT-Folly'
        __t.build_configurations.each do |__c|
          __c.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          __c.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_CONSTEVAL='
        end
      end
    end`;

module.exports = function withFmtFix(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      if (!contents.includes("FMT_CONSTEVAL=")) {
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
