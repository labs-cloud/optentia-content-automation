# Media storage — Cloudflare R2

Heavy media (reels, carousels, images) is stored in object storage; the database
only holds the URL. `server/storage.ts` uses **Cloudflare R2** when configured,
and **falls back to Vercel Blob** otherwise — so existing deploys keep working
until R2 is set up. No code changes needed to switch; just set these env vars.

## Why R2
S3-compatible, and **zero egress fees** — the deciding factor for video, which
gets fetched repeatedly (Instagram pull, app previews, re-renders, multi-client).
Storage is ~$0.015/GB-month; serving is free.

## Env vars (set all five to enable R2)
```
R2_ACCOUNT_ID=...                 # Cloudflare account ID
R2_ACCESS_KEY_ID=...              # R2 API token (S3 credentials)
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=optentia-media          # bucket name
R2_PUBLIC_BASE_URL=https://...    # public URL of the bucket (custom domain or https://pub-<hash>.r2.dev), no trailing slash
```
If any are missing, storage transparently uses Vercel Blob (current behaviour).

## One-time setup (Cloudflare dashboard)
1. **R2 → Create bucket** (e.g. `optentia-media`).
2. Enable public access: bucket → **Settings → Public access** → allow, which gives a `https://pub-<hash>.r2.dev` URL (or connect a custom domain like `media.yourdomain.com`). Put that in `R2_PUBLIC_BASE_URL`.
3. **R2 → Manage API tokens → Create** (Object Read & Write) → copy the Access Key ID + Secret into the env vars. Account ID is on the R2 overview page.
4. Add the five vars in Vercel (and the render worker's env). Redeploy. Done — new uploads land in R2 with public URLs (which Instagram Reels require).

Public URLs are required because Instagram fetches the `video_url` directly.
