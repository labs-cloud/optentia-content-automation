# Render Worker contract (Phase 1)

Heavy media generation (reels, carousels — ffmpeg + AI video + voice) can't run
on Vercel. It runs in a standalone **render worker** (Node + Python pipeline,
hosted off-Vercel). This doc defines the handoff; the worker itself lives outside
this repo.

## The two new statuses
`content_posts.status` gains two values (added in this PR, append-only):

- **`needs_generation`** — the app has queued a brief for the worker. Store the
  brief as JSON in `generationPrompt` (no new column needed), e.g.
  ```json
  { "pillar": "documentary", "topic": "NYC's most dangerous truck corridors",
    "format": "reel", "durationSec": 30, "cta": "Free consultation — link in bio" }
  ```
- **`generating`** — a worker has claimed the post (guards against double pickup).

## Lifecycle
```
draft ──(user requests generation)──▶ needs_generation
needs_generation ──(worker claims)──▶ generating
generating ──(worker uploads media)──▶ pending_approval ──(existing approval flow)──▶ published
generating ──(error)──▶ failed   (publishError holds the reason)
```

The worker polls for `needs_generation`, sets `generating`, renders, uploads the
media to Vercel Blob, writes `mediaUrl`/`imageUrl`, and flips to
**`pending_approval`** — so the human approval gate is unchanged. Nothing this
worker does auto-publishes.

## Why no new endpoint
The worker uses the same DB + Blob store as the app (like `scripts/ingest-posts.ts`),
so the contract is just these status values + the `generationPrompt` brief. A
tRPC `posts.requestGeneration` mutation can be layered on later for the UI.
