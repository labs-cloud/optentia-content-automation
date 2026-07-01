/**
 * Connect Borukhova & Associates Instagram publishing credentials.
 *
 * Required env:
 *   DATABASE_URL
 *   BORUKHOVA_META_PAGE_ID
 *   BORUKHOVA_META_INSTAGRAM_ACCOUNT_ID
 *   BORUKHOVA_META_PAGE_TOKEN
 *
 * Run from repo root:
 *   DOTENV_CONFIG_PATH=.env.vercel.production.local pnpm tsx scripts/connect-borukhova-instagram.ts
 */
import "dotenv/config";
import { getPlatformConnection, upsertPlatformConnection } from "../server/db";

const CLIENT_ID = 30001;
const EXPECTED_USERNAME = "radaborukhov";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const url = new URL(`https://graph.facebook.com/v19.0/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    const message = typeof json?.error?.message === "string" ? json.error.message : `Graph API error ${res.status}`;
    throw new Error(message);
  }
  return json as T;
}

async function main() {
  requiredEnv("DATABASE_URL");
  const pageId = requiredEnv("BORUKHOVA_META_PAGE_ID");
  const accountId = requiredEnv("BORUKHOVA_META_INSTAGRAM_ACCOUNT_ID");
  const accessToken = requiredEnv("BORUKHOVA_META_PAGE_TOKEN");

  const page = await graphGet<{
    id: string;
    name?: string;
    instagram_business_account?: { id: string; username?: string; name?: string };
  }>(
    `${pageId}?fields=id,name,instagram_business_account{id,username,name}`,
    accessToken,
  );

  if (page.id !== pageId) {
    throw new Error(`Page ID mismatch: got ${page.id}, expected ${pageId}`);
  }

  const ig = page.instagram_business_account;
  if (!ig) {
    throw new Error(`Page ${pageId} has no connected Instagram business account.`);
  }
  if (ig.id !== accountId) {
    throw new Error(`Instagram account ID mismatch: got ${ig.id}, expected ${accountId}`);
  }
  if (ig.username !== EXPECTED_USERNAME) {
    throw new Error(`Instagram username mismatch: got ${ig.username ?? "(missing)"}, expected ${EXPECTED_USERNAME}`);
  }

  await upsertPlatformConnection({
    clientId: CLIENT_ID,
    platform: "instagram",
    accountName: `@${ig.username}`,
    accountId,
    accessToken,
    pageId,
    status: "connected",
    lastCheckedAt: new Date(),
  });

  const stored = await getPlatformConnection("instagram", CLIENT_ID);
  console.log(JSON.stringify({
    connected: Boolean(stored?.accessToken),
    clientId: stored?.clientId,
    platform: stored?.platform,
    accountName: stored?.accountName,
    accountId: stored?.accountId,
    pageId: stored?.pageId,
    status: stored?.status,
  }));
}

main().catch((error) => {
  console.error("connect-borukhova-instagram failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
