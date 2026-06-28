import { put } from "@vercel/blob";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ─── Storage backend ──────────────────────────────────────────────────────────
// Heavy media (reels, carousels) lives in object storage. Cloudflare R2 is the
// default when configured — it's S3-compatible with ZERO egress fees, which
// matters for video. Until the R2_* env vars are set, this falls back to the
// existing Vercel Blob behaviour, so nothing breaks on deploys that haven't
// migrated yet.
const R2 = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  // Public base URL for the bucket (custom domain or https://pub-<hash>.r2.dev), no trailing slash.
  publicBase: (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/+$/, ""),
};
const useR2 = Boolean(
  R2.accountId && R2.accessKeyId && R2.secretAccessKey && R2.bucket && R2.publicBase,
);

let _s3: S3Client | null = null;
function s3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2.accessKeyId!, secretAccessKey: R2.secretAccessKey! },
    });
  }
  return _s3;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function r2PublicUrl(key: string): string {
  return `${R2.publicBase}/${key}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (useR2) {
    await s3().send(
      new PutObjectCommand({ Bucket: R2.bucket!, Key: key, Body: body, ContentType: contentType }),
    );
    return { key, url: r2PublicUrl(key) };
  }

  const blob = await put(key, body, { access: "public", contentType, addRandomSuffix: false });
  return { key, url: blob.url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: useR2 ? r2PublicUrl(key) : `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  // R2 buckets here are public, so the public URL is the fetchable URL.
  // (Legacy /manus-storage/* paths should migrate to the URL returned by storagePut.)
  return useR2 ? r2PublicUrl(key) : `/manus-storage/${key}`;
}
