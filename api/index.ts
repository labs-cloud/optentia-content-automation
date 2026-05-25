// Vercel auto-detects this file and builds it as the serverless function.
// It imports a pre-built self-contained bundle produced by `pnpm build:vercel`
// (esbuild bundles server/vercel-entry.ts + all transitive imports into
// dist/server.js with no remaining relative imports — which keeps Node ESM happy).
export { default } from "../dist/server.js";
