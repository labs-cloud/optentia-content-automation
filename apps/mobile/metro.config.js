// Metro config for the pnpm monorepo. Watches the repo root + workspace packages
// and resolves the pnpm symlinked store, then layers NativeWind on top.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so changes in packages/core + shared hot-reload.
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from the app first, then the hoisted root store (pnpm).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. pnpm uses symlinks into a content-addressed store — let Metro follow them.
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./global.css" });
