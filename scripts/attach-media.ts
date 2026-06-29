/**
 * One-off Borukhova launch media attachment.
 *
 * Run from repo root with DATABASE_URL + R2_* env vars:
 *   pnpm tsx scripts/attach-media.ts
 *
 * This uploads local media directly to object storage and wires the existing
 * pending_approval posts without publishing or changing their status.
 */
import { readFile, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import {
  createMediaAsset,
  deleteMediaAsset,
  getContentPostById,
  getImageAssetsForPost,
  updateContentPost,
} from "../server/db";
import { storagePut } from "../server/storage";

const clientId = 30001;
const mediaDir = process.env.MEDIA_DIR ?? "borukhova-reels/output";

type MediaKind = "reel" | "carousel" | "image";

interface ManifestEntry {
  postId: number;
  contentType: MediaKind;
  files: string[];
}

interface UploadedFile {
  key: string;
  localPath: string;
  mimeType: string;
  name: string;
  sizeBytes: number;
  url: string;
}

const manifest: ManifestEntry[] = [
  {
    postId: 630004,
    contentType: "reel",
    files: ["final/Corridors_FINAL_Hybrid.mp4"],
  },
  {
    postId: 630005,
    contentType: "carousel",
    files: [
      "carousel_adjuster/slide_1.png",
      "carousel_adjuster/slide_2.png",
      "carousel_adjuster/slide_3.png",
      "carousel_adjuster/slide_4.png",
      "carousel_adjuster/slide_5.png",
    ],
  },
  {
    postId: 630006,
    contentType: "image",
    files: ["fri_rada_photo.jpg"],
  },
];

const mimeByExtension: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
};

function mimeFor(path: string): string {
  return mimeByExtension[extname(path).toLowerCase()] ?? "application/octet-stream";
}

function storageKeyFor(postId: number, localPath: string): string {
  return `borukhova/${postId}/${basename(localPath)}`;
}

async function ensureFile(path: string) {
  const file = await stat(path);
  if (!file.isFile()) throw new Error(`${path} is not a file.`);
  return file.size;
}

async function uploadFile(postId: number, localPath: string): Promise<UploadedFile> {
  const bytes = await readFile(localPath);
  const mimeType = mimeFor(localPath);
  const { key, url } = await storagePut(storageKeyFor(postId, localPath), bytes, mimeType);
  await assertPublicUrl(url);
  return {
    key,
    localPath,
    mimeType,
    name: basename(localPath),
    sizeBytes: bytes.length,
    url,
  };
}

async function assertPublicUrl(url: string) {
  const head = await fetch(url, { method: "HEAD" });
  if (head.ok) return;

  const get = await fetch(url, { method: "GET" });
  if (!get.ok) {
    throw new Error(`Uploaded URL is not publicly fetchable (${get.status}): ${url}`);
  }
}

async function verifyPost(entry: ManifestEntry) {
  const post = await getContentPostById(entry.postId);
  if (!post) throw new Error(`Post ${entry.postId} not found.`);
  if (post.clientId !== clientId) {
    throw new Error(`Post ${entry.postId} has clientId ${post.clientId}, expected ${clientId}.`);
  }
  if (post.contentType !== entry.contentType) {
    throw new Error(`Post ${entry.postId} has contentType ${post.contentType}, expected ${entry.contentType}.`);
  }
  if (post.status !== "pending_approval") {
    throw new Error(`Post ${entry.postId} has status ${post.status}, expected pending_approval.`);
  }
  return post;
}

async function clearCarouselSlides(postId: number) {
  const existingSlides = await getImageAssetsForPost(postId);
  for (const slide of existingSlides) {
    await deleteMediaAsset(slide.id);
  }
}

async function attachReel(entry: ManifestEntry) {
  if (entry.files.length !== 1) throw new Error(`Reel post ${entry.postId} must have exactly one file.`);
  await verifyPost(entry);
  const localPath = resolve(mediaDir, entry.files[0]);
  await ensureFile(localPath);
  const upload = await uploadFile(entry.postId, localPath);
  const updated = await updateContentPost(entry.postId, {
    mediaUrl: upload.url,
    mediaStorageKey: upload.key,
  });
  console.log(`post ${entry.postId}: ${updated?.mediaUrl}`);
}

async function attachPhoto(entry: ManifestEntry) {
  if (entry.files.length !== 1) throw new Error(`Photo post ${entry.postId} must have exactly one file.`);
  await verifyPost(entry);
  const localPath = resolve(mediaDir, entry.files[0]);
  await ensureFile(localPath);
  const upload = await uploadFile(entry.postId, localPath);
  const updated = await updateContentPost(entry.postId, {
    mediaUrl: upload.url,
    mediaStorageKey: upload.key,
    imageUrl: upload.url,
  });
  console.log(`post ${entry.postId}: ${updated?.mediaUrl}`);
}

async function attachCarousel(entry: ManifestEntry) {
  if (entry.files.length !== 5) throw new Error(`Carousel post ${entry.postId} must have exactly five files.`);
  await verifyPost(entry);

  const localPaths = entry.files.map((file) => resolve(mediaDir, file));
  for (const localPath of localPaths) await ensureFile(localPath);

  const uploads: UploadedFile[] = [];
  for (const localPath of localPaths) {
    uploads.push(await uploadFile(entry.postId, localPath));
  }

  const [cover, ...slides] = uploads;
  await clearCarouselSlides(entry.postId);
  for (const slide of slides) {
    await createMediaAsset({
      clientId,
      name: slide.name,
      type: "image",
      url: slide.url,
      storageKey: slide.key,
      mimeType: slide.mimeType,
      sizeBytes: slide.sizeBytes,
      linkedPostId: entry.postId,
    });
  }

  const updated = await updateContentPost(entry.postId, {
    mediaUrl: cover.url,
    mediaStorageKey: cover.key,
    imageUrl: cover.url,
  });
  console.log(`post ${entry.postId}: ${updated?.mediaUrl}`);
}

async function main() {
  for (const entry of manifest) {
    if (entry.contentType === "reel") {
      await attachReel(entry);
    } else if (entry.contentType === "carousel") {
      await attachCarousel(entry);
    } else {
      await attachPhoto(entry);
    }
  }
}

main().catch((error) => {
  console.error("attach-media failed:", error);
  process.exit(1);
});
