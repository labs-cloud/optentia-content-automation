# Phase 0 — Push Borukhova content into the Optentia app's Content Queue

Connects the work produced here (reels, carousels, photos + copy) to
`labs-cloud/optentia-content-automation`: it uploads the media to the app's
Vercel Blob storage and creates `content_posts` rows at **`pending_approval`**,
so Rada approves in the Queue and the app's existing publishers schedule/post.

Server-side: it calls the app's own `db` + `storage` helpers — **no Clerk,
no HTTP, no auth dance.**

## Files
- `ingest-posts.ts` — the adapter. Drop into the repo at **`scripts/ingest-posts.ts`** (imports are repo-relative: `../server/db`, `../server/storage`).
- `posts-manifest.json` — this week's 5 posts (Sun reel · Mon LinkedIn · Wed carousel · Thu Facebook · Fri photo) with verbatim captions, pillars, schedule times (UTC), and asset paths.
- `assets/` — the rendered media for those posts.

## Run it
From the repo root, with the app's env (`DATABASE_URL` for MySQL + `BLOB_READ_WRITE_TOKEN` for Vercel Blob):
```bash
# place the files
cp ingest-posts.ts        <repo>/scripts/ingest-posts.ts
cp -r posts-manifest.json assets  <repo>/scripts/

# run
pnpm tsx scripts/ingest-posts.ts scripts/posts-manifest.json
```
It resolves (or creates) the **Borukhova** client, uploads each asset, and inserts
each post at `pending_approval`. Output lists the created post IDs.

## Mapping used
- **Pillars** (ours → app enum): P1 Know Your Rights → `practical_education` · P2 NYC Expertise → `documentary` · P3 Rada's Story → `strong_opinion`.
- **Content types:** reel → `reel`, carousel → `carousel`, single photo → `image`, LinkedIn/Facebook text → `text`.
- **Schedule times** are UTC (EDT = UTC−4): 10 AM ET = 14:00Z, 9 AM ET = 13:00Z, 1 PM ET = 17:00Z.

## Known gaps (Phase 1 work)
- **Carousel publishing:** the current `server/publishers/meta.ts` posts a single image or a reel. Multi-image IG carousels need a publisher enhancement (children containers → carousel container). For now all 5 slides upload as linked media assets; the post carries the cover.
- **LinkedIn target:** manifest uses `linkedin`; switch to `linkedin_company` / `linkedin_personal` if you want a specific surface (the app supports both).
- **Approval gate stays:** posts land at `pending_approval` on purpose — Rada approves before anything publishes. Nothing auto-posts.

## Phase 1 (next, after this round-trip is verified)
Wrap the render pipeline + Claude Agent SDK into an always-on worker (off-Vercel)
that the app triggers on a `needs_generation` status, generates the asset, and
calls this same ingest path automatically.
