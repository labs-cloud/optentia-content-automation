/**
 * Phase-0 ingest adapter — Borukhova & Associates → Optentia Content Automation
 *
 * Pushes pre-rendered assets (reels, carousels, photos) + copy into the app's
 * Content Queue at status `pending_approval`, so Rada approves and the app's
 * existing publishers schedule/post them.
 *
 * Server-side: uses the app's own DB + Vercel Blob storage — no Clerk/HTTP/auth.
 *
 * PLACEMENT: drop this file at `scripts/ingest-posts.ts` in the
 *   labs-cloud/optentia-content-automation repo (imports are repo-relative).
 * RUN (from repo root, with the app's env: DATABASE_URL + BLOB_READ_WRITE_TOKEN):
 *   pnpm tsx scripts/ingest-posts.ts scripts/posts-manifest.json
 */
import { readFile } from "node:fs/promises";
import { basename, resolve, dirname } from "node:path";
import { storagePut } from "../server/storage";
import {
  createContentPost,
  createMediaAsset,
  getClientByName,
  createClient,
} from "../server/db";

type ContentType = "text" | "image" | "video" | "reel" | "story" | "carousel";
type Pillar = "strong_opinion" | "practical_education" | "documentary" | "direct_promotion";

interface ManifestPost {
  title?: string;
  platform: string;            // instagram | linkedin | linkedin_company | facebook | youtube
  contentType: ContentType;
  contentPillar?: Pillar;
  caption: string;
  hashtags?: string;
  scheduledAt?: string;        // ISO 8601 (UTC)
  media?: string[];           // local paths, relative to this manifest file
  coverImage?: string;        // local path (reel cover / thumbnail)
}
interface Manifest { client: string; posts: ManifestPost[]; }

const MIME: Record<string, string> = {
  ".mp4": "video/mp4", ".mov": "video/quicktime",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
};
const mimeFor = (p: string) => MIME[p.slice(p.lastIndexOf(".")).toLowerCase()] ?? "application/octet-stream";
const typeFor = (p: string) => {
  const m = mimeFor(p);
  return m.startsWith("video") ? "video" : m.startsWith("image") ? "image" : "document";
};

async function uploadLocal(clientId: number, absPath: string, linkedPostId?: number) {
  const buf = await readFile(absPath);
  const name = basename(absPath);
  const { key, url } = await storagePut(`borukhova/${Date.now()}_${name}`, buf, mimeFor(absPath));
  await createMediaAsset({
    clientId,
    name,
    type: typeFor(absPath) as "image" | "video" | "audio" | "document",
    url,
    storageKey: key,
    mimeType: mimeFor(absPath),
    sizeBytes: buf.length,
    linkedPostId: linkedPostId ?? null,
  } as never);
  return url;
}

async function main() {
  const manifestPath = resolve(process.argv[2] ?? "scripts/posts-manifest.json");
  const manifest: Manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const baseDir = dirname(manifestPath);

  let client = await getClientByName(manifest.client);
  if (!client) {
    client = await createClient({
      userId: 1,
      name: manifest.client,
      industry: "NYC personal injury law — commercial vehicle accidents",
    } as never);
    console.log(`Created client "${manifest.client}" (#${client!.id})`);
  }
  const clientId = client!.id;
  console.log(`Client: ${manifest.client} (#${clientId})\n`);

  for (const post of manifest.posts) {
    const mediaPaths = post.media ?? [];
    // primary media first (so reels/images get a public URL on the post row)
    let mediaUrl: string | undefined;
    let imageUrl: string | undefined;

    if (post.contentType === "reel" || post.contentType === "video") {
      if (mediaPaths[0]) mediaUrl = await uploadLocal(clientId, resolve(baseDir, mediaPaths[0]));
      if (post.coverImage) imageUrl = await uploadLocal(clientId, resolve(baseDir, post.coverImage));
    } else if (mediaPaths.length) {
      const first = await uploadLocal(clientId, resolve(baseDir, mediaPaths[0]));
      mediaUrl = first; imageUrl = first;
    }

    const created = await createContentPost({
      clientId,
      title: post.title,
      caption: post.caption,
      hashtags: post.hashtags,
      platform: post.platform,
      contentType: post.contentType,
      contentPillar: post.contentPillar,
      mediaUrl,
      imageUrl,
      scriptText: post.caption,
      scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : undefined,
      status: "pending_approval",
      aiGenerated: true,
    } as never);

    // upload remaining carousel slides, linked to the post (cover already uploaded above)
    for (const m of mediaPaths.slice(post.contentType === "reel" || post.contentType === "video" ? 0 : 1)) {
      await uploadLocal(clientId, resolve(baseDir, m), created!.id);
    }

    const label = post.title ?? post.caption.slice(0, 40);
    console.log(`  + post #${created!.id}  [${post.platform}/${post.contentType}]  "${label}"  → pending_approval  (${mediaPaths.length} asset(s))`);
    if (post.contentType === "carousel" && mediaPaths.length > 1) {
      console.log(`    note: carousel has ${mediaPaths.length} slides; the current Meta publisher posts a single image/reel — multi-image carousel publishing needs a publisher enhancement (Phase 1).`);
    }
  }
  console.log(`\nDone. Review in the app's Content Queue (status: pending_approval).`);
  process.exit(0);
}

main().catch((e) => { console.error("ingest failed:", e); process.exit(1); });
