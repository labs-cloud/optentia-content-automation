/**
 * Local seed entry point: `pnpm seed` (requires DATABASE_URL in .env).
 *
 * Applies the multi-client schema (idempotent DDL), creates the Optentia +
 * demo clients with brand profiles, and backfills legacy rows. The deployed
 * app runs the exact same bootstrap automatically from the cron endpoint, so
 * running this locally is optional.
 */
import { ensureMultiClientSchema } from "../server/ensureSchema";
import { runSeed } from "../server/seedCore";

async function main() {
  const { applied } = await ensureMultiClientSchema();
  if (applied.length > 0) console.log("[seed] Schema changes:", applied);
  const { ownerUserId } = await runSeed();
  console.log(`[seed] Done. Owner userId: ${ownerUserId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
