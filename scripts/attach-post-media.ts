/**
 * Attach local media files to existing content_posts rows.
 *
 * This is the large-file-safe path for launch assets: run it server-side with
 * DATABASE_URL + storage env vars. It uploads directly through server/storage.ts
 * (R2 when configured, Vercel Blob fallback otherwise), creates linked
 * media_assets rows, and patches the post media fields without changing status.
 *
 * RUN:
 *   pnpm tsx scripts/attach-post-media.ts scripts/attach-media-manifest.json
 *   pnpm tsx scripts/attach-post-media.ts scripts/attach-media-manifest.json --dry-run
 */
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { createMediaAsset, getContentPostById, updateContentPost } from "../server/db";
import { storagePut } from "../server/storage";

type MediaAssetType = "image" | "video" | "audio" | "document";

interface AttachEntry {
  postId: number;
  media?: string[];
  coverImage?: string;
}

interface AttachManifest {
  uploads: AttachEntry[];
}

const MIME_BY_EXT: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".webp": "image/webp",
};

function mimeFor(path: string): string {
  return MIME_BY_EXT[extname(path).toLowerCase()] ?? "application/octet-stream";
}

function assetTypeFor(path: string): MediaAssetType {
  const mime = mimeFor(path);
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

function assertManifest(value: unknown): AttachManifest {
  if (!value || typeof value !== "object" || !Array.isArray((value as { uploads?: unknown }).uploads)) {
    throw new Error("Manifest must be an object with an uploads array.");
  }

  const uploads = (value as { uploads: unknown[] }).uploads.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`uploads[${index}] must be an object.`);
    }
    const raw = entry as Record<string, unknown>;
    const postId = raw.postId;
    if (typeof postId !== "number" || !Number.isInteger(postId)) {
      throw new Error(`uploads[${index}].postId must be an integer.`);
    }
    if (raw.media !== undefined && !Array.isArray(raw.media)) {
      throw new Error(`uploads[${index}].media must be an array of file paths.`);
    }
    if (raw.media !== undefined && raw.media.some((p) => typeof p !== "string" || p.length === 0)) {
      throw new Error(`uploads[${index}].media must contain non-empty file paths.`);
    }
    if (raw.coverImage !== undefined && (typeof raw.coverImage !== "string" || raw.coverImage.length === 0)) {
      throw new Error(`uploads[${index}].coverImage must be a non-empty file path.`);
    }
    return {
      postId,
      media: raw.media as string[] | undefined,
      coverImage: raw.coverImage as string | undefined,
    };
  });

  return { uploads };
}

function publicMediaFields(
  contentType: string,
  mediaUploads: UploadedFile[],
  coverUpload?: UploadedFile,
): { mediaUrl?: string; mediaStorageKey?: string; imageUrl?: string } {
  const firstMedia = mediaUploads[0];
  const patch: { mediaUrl?: string; mediaStorageKey?: string; imageUrl?: string } = {};

  if (firstMedia) {
    patch.mediaUrl = firstMedia.url;
    patch.mediaStorageKey = firstMedia.key;
  }

  if (coverUpload) {
    patch.imageUrl = coverUpload.url;
  } else if (firstMedia && (contentType === "image" || contentType === "carousel" || firstMedia.type === "image")) {
    patch.imageUrl = firstMedia.url;
  }

  return patch;
}

interface UploadedFile {
  absPath: string;
  key: string;
  name: string;
  sizeBytes: number;
  type: MediaAssetType;
  url: string;
}

async function uploadLocal(absPath: string, clientId: number, postId: number): Promise<UploadedFile> {
  const file = await readFile(absPath);
  const name = basename(absPath);
  const type = assetTypeFor(absPath);
  const contentType = mimeFor(absPath);
  const { key, url } = await storagePut(`content-posts/${clientId}/${postId}/${Date.now()}_${name}`, file, contentType);

  return {
    absPath,
    key,
    name,
    sizeBytes: file.length,
    type,
    url,
  };
}

async function ensureReadable(absPath: string) {
  const info = await stat(absPath);
  if (!info.isFile()) throw new Error(`${absPath} is not a file.`);
}

async function createLinkedAsset(upload: UploadedFile, clientId: number, postId: number) {
  return createMediaAsset({
    clientId,
    name: upload.name,
    type: upload.type,
    url: upload.url,
    storageKey: upload.key,
    mimeType: mimeFor(upload.absPath),
    sizeBytes: upload.sizeBytes,
    linkedPostId: postId,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const manifestArg = args.find((arg) => !arg.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const manifestPath = resolve(manifestArg ?? "scripts/attach-media-manifest.json");
  const manifest = assertManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  const baseDir = dirname(manifestPath);

  if (manifest.uploads.length === 0) {
    throw new Error("Manifest has no uploads.");
  }

  for (const entry of manifest.uploads) {
    const post = await getContentPostById(entry.postId);
    if (!post) throw new Error(`Post #${entry.postId} was not found.`);
    if (post.clientId === null) throw new Error(`Post #${entry.postId} has no clientId.`);

    const mediaPaths = (entry.media ?? []).map((path) => resolve(baseDir, path));
    const coverPath = entry.coverImage ? resolve(baseDir, entry.coverImage) : undefined;
    const allPaths = [...mediaPaths, ...(coverPath ? [coverPath] : [])];
    if (allPaths.length === 0) throw new Error(`Post #${entry.postId} has no media or coverImage paths.`);

    for (const path of allPaths) await ensureReadable(path);

    console.log(`${dryRun ? "[dry-run] " : ""}Post #${post.id} (${post.platform}/${post.contentType})`);
    for (const path of allPaths) {
      const info = await stat(path);
      console.log(`  ${basename(path)} (${mimeFor(path)}, ${info.size.toLocaleString()} bytes)`);
    }

    if (dryRun) continue;

    const mediaUploads: UploadedFile[] = [];
    for (const path of mediaPaths) {
      mediaUploads.push(await uploadLocal(path, post.clientId, post.id));
    }
    const coverUpload = coverPath ? await uploadLocal(coverPath, post.clientId, post.id) : undefined;

    const assetsToLink =
      post.contentType === "carousel"
        ? mediaUploads.slice(1).concat(coverUpload ? [coverUpload] : [])
        : mediaUploads.concat(coverUpload ? [coverUpload] : []);
    for (const upload of assetsToLink) await createLinkedAsset(upload, post.clientId, post.id);

    const patch = publicMediaFields(post.contentType, mediaUploads, coverUpload);
    if (Object.keys(patch).length > 0) await updateContentPost(post.id, patch);

    const linkedCount = assetsToLink.length;
    const primaryUrl = patch.mediaUrl ?? patch.imageUrl;
    console.log(`  attached ${mediaUploads.length + (coverUpload ? 1 : 0)} file(s), linked ${linkedCount} asset(s)`);
    if (primaryUrl) console.log(`  primary URL: ${primaryUrl}`);
  }
}

main().catch((error) => {
  console.error("attach-post-media failed:", error);
  process.exit(1);
});
