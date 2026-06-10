> **OUTDATED (kept for history):** this handoff describes the original Manus→Vercel migration. The app has since become a multi-client AI marketing OS — see `README.md` and `docs/V2_MULTI_CLIENT_UPGRADE.md`.

# Optentia Content Automation — Claude Handoff Prompt

Copy everything below this line and paste it as your first message in a new Claude.ai Project or Claude Code session after connecting the GitHub repo.

---

## Project Context

You are taking over development of **Optentia Content Automation** — a full-stack social media content automation system built for Optentia, an AI systems and automation operator for businesses. The codebase is at `github.com/labs-cloud/optentia-content-automation`.

The app was originally built on Manus (a managed hosting platform) and uses several Manus-specific infrastructure helpers that must be replaced as part of migrating to **Vercel + independent services**. Your job is to:

1. Replace all Manus-specific infrastructure with portable equivalents
2. Switch all AI content generation from the current Manus-wrapped Gemini model to **Claude (Anthropic)** directly
3. Replace the Manus cron/heartbeat system with **Vercel Cron Jobs**
4. Replace Manus OAuth login with **Clerk** (or Auth0 — your call, Clerk is simpler)
5. Replace Manus S3 storage proxy with **Cloudflare R2** or **AWS S3** directly
6. Deploy the full app to Vercel

---

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS 4 + shadcn/ui components
- **Backend:** Express 4 + tRPC 11 (type-safe API layer, no REST routes)
- **Database:** Drizzle ORM + MySQL (currently TiDB — can stay on PlanetScale, Neon MySQL, or any MySQL-compatible host)
- **Language:** TypeScript throughout (strict mode)
- **Package manager:** pnpm
- **Testing:** Vitest

---

## Application Overview

This is a **single-page dashboard app** (not public-facing) with the following pages and features:

### Pages (all behind auth)
| Route | Page | Purpose |
|---|---|---|
| `/` | Dashboard | Stats overview — total posts, published, pending approval, scheduled |
| `/ai-generator` | AI Generator | Manually generate a post for a specific platform + content pillar using AI |
| `/content-queue` | Content Queue | Approve, reject, edit, schedule, or publish posts |
| `/content-library` | Content Library | Browse all posts with filters by platform/status |
| `/content-calendar` | Content Calendar | Calendar view of scheduled/published posts |
| `/schedules` | Schedules | Create and manage automated content generation schedules (cron jobs) |
| `/platforms` | Platforms | Manage API credentials for each social platform |
| `/analytics` | Analytics | Charts — posts by platform, published over time, recent activity |
| `/media` | Media Library | Upload and manage media assets (images, videos) |
| `/heygen` | HeyGen Videos | Generate AI avatar videos via HeyGen API |

### Database Tables (Drizzle schema in `drizzle/schema.ts`)
- `users` — id, openId, name, email, role (admin|user), loginMethod, lastSignedIn
- `platform_connections` — id, platform (enum), accountName, accountId, apiKey, accessToken, refreshToken, pageId, status (connected|disconnected|error), lastCheckedAt, errorMessage
- `content_posts` — id, platform, status (draft|pending_approval|approved|scheduled|published|rejected|failed), caption, hashtags, hook, imageUrl, imageStorageKey, scriptText, scheduledAt, publishedAt, externalPostId, errorMessage, generationPrompt, contentPillar, cronTaskUid
- `content_schedules` — id, name, description, cron, platforms (JSON array), postsPerRun, contentPillars (JSON array), generationPrompt, isActive, cronTaskUid, lastRunAt, nextRunAt
- `media_assets` — id, name, type (image|video|audio|document), url, storageKey, mimeType, sizeBytes, linkedPostId, tags (JSON array)
- `analytics_events` — id, postId, platform, eventType (published|failed|rejected|approved|scheduled), metadata (JSON), recordedAt
- `heygen_requests` — id, videoId, title, scriptText, avatarId, voiceId, status (pending|processing|completed|failed), videoUrl, thumbnailUrl, durationSeconds, errorMessage, linkedPostId

### Platform Enum Values
`instagram` | `linkedin_personal` | `linkedin_company` | `facebook` | `youtube`

Note: `linkedin` (without suffix) still exists in some legacy code paths — treat `linkedin_personal` and `linkedin_company` as the canonical values going forward.

---

## Social Platform Integrations

All publishers are in `server/publishers/`. They are already fully implemented and working — do NOT rewrite them, just ensure their environment variables are set.

### LinkedIn (`server/publishers/linkedin.ts`)
- Posts to LinkedIn UGC Posts API v2
- Supports both personal profile (`urn:li:person:{id}`) and company page (`urn:li:organization:{id}`)
- Env vars needed: `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN`, `LINKEDIN_ORG_URN`

### Instagram + Facebook (`server/publishers/meta.ts`)
- Instagram: Graph API v21 — creates container then publishes
- Facebook: Graph API — posts to page feed
- Env vars needed: `META_PAGE_TOKEN`, `META_PAGE_ID`, `META_INSTAGRAM_ACCOUNT_ID`, `META_APP_ID`, `META_APP_SECRET`

### YouTube (`server/publishers/youtube.ts`)
- Posts YouTube Community posts (not video uploads)
- Env vars needed: `YOUTUBE_ACCESS_TOKEN`, `YOUTUBE_CHANNEL_ID` (or similar — check the publisher)

### HeyGen (`server/routers/heygen.ts`)
- Calls HeyGen API v2 to generate AI avatar videos
- API key stored in `platform_connections` table (not env var)
- Endpoint: `https://api.heygen.com/v2/`

---

## Manus-Specific Dependencies to Replace

These are the 5 things that need to be swapped out. Everything else in the codebase is standard and portable.

### 1. Authentication — Replace Manus OAuth with Clerk

**Current implementation:**
- `server/_core/oauth.ts` — handles `/api/oauth/callback`, exchanges code for token with Manus OAuth server
- `server/_core/sdk.ts` — `sdk.authenticateRequest(req)` validates session cookies and cron tokens
- `server/_core/cookies.ts` — sets JWT session cookie
- `client/src/const.ts` — `getLoginUrl()` builds redirect to Manus OAuth portal
- `client/src/_core/hooks/useAuth.ts` — `useAuth()` hook calls `trpc.auth.me`
- `client/src/main.tsx` — wraps app in ThemeProvider

**What to replace with:**
- Install Clerk (`@clerk/clerk-react` + `@clerk/express`)
- Replace `getLoginUrl()` / OAuth callback with Clerk's `<SignIn />` component or hosted sign-in
- Replace `sdk.authenticateRequest(req)` with Clerk's `getAuth(req)` in Express middleware
- Replace `protectedProcedure` middleware to use Clerk session instead of JWT cookie
- The `users` table can stay — sync Clerk user ID to `users.openId` on first sign-in
- The `role` field on `users` table stays — admin promotion still done via SQL

**Key pattern to preserve:**
```ts
// In tRPC context, replace sdk.authenticateRequest with:
import { getAuth } from "@clerk/express";
const { userId } = getAuth(req);
// Then look up user in DB by userId (stored as openId)
```

### 2. LLM / AI Generation — Replace Manus Gemini wrapper with Claude

**Current implementation:**
- `server/_core/llm.ts` — `invokeLLM({ messages, response_format })` calls `ENV.forgeApiUrl` with `ENV.forgeApiKey`
- Currently uses Gemini 2.5 Flash under the hood (Manus-managed)
- Called in `server/routers/posts.ts` (manual generation) and `server/cronHandlers.ts` (scheduled generation)

**What to replace with:**
```ts
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

**The `invokeLLM` function signature to preserve** (so callers don't need to change):
```ts
export async function invokeLLM({ messages, response_format }: InvokeParams) {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2048,
    system: messages.find(m => m.role === "system")?.content as string,
    messages: messages.filter(m => m.role !== "system").map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content as string,
    })),
  });
  // Return in the same shape as the current OpenAI-compatible response
  return {
    choices: [{
      message: {
        content: response.content[0].type === "text" ? response.content[0].text : "",
      }
    }]
  };
}
```

**Platform-specific system prompts** (currently in `server/routers/posts.ts` and `server/cronHandlers.ts`):

These prompts are good but should be deepened now that Claude is handling them. Here are the current prompts — improve them significantly:

```
instagram: "You are an expert Instagram content creator for Optentia, an AI systems and automation operator for businesses. Generate a high-performing Instagram post with a strong hook, engaging caption (150-300 words), 15-20 hashtags, and a clear CTA. Return valid JSON only: {caption, hashtags, hook}"

linkedin_personal: "You are an expert LinkedIn thought leader for Optentia. Generate a professional LinkedIn post from a personal profile perspective — first-person voice, personal insights, and professional experience. Include a compelling opener, authority-building body (200-400 words), and 3-5 hashtags. Return valid JSON only: {caption, hashtags, hook}"

linkedin_company: "You are an expert LinkedIn content strategist for Optentia's company page. Generate a professional LinkedIn post from a company perspective — brand voice, business insights, and company achievements. Include a compelling opener, authority-building body (200-400 words), and 3-5 hashtags. Return valid JSON only: {caption, hashtags, hook}"

facebook: "You are an expert Facebook content creator for Optentia. Generate a discussion-driving post with strong opinion, engaging body (100-250 words), and 3-5 hashtags. Return valid JSON only: {caption, hashtags, hook}"

youtube: "You are an expert YouTube content strategist for Optentia. Generate a video title, description (150-300 words), and 10-15 tags. Return valid JSON only: {caption, hashtags, hook, scriptText}"
```

**Content pillars** (used to vary post angle):
- `strong_opinion` — Bold business takes, AI misuse, systems thinking
- `practical_education` — Automation workflows, CRM systems, voice AI demos
- `documentary` — Daily workflows, desk setups, business building
- `direct_promotion` — Case studies, DM offers, consultation calls

**Brand context for all prompts:**
Optentia is an AI systems and automation operator for businesses. The audience is business owners, operators, and executives who want to implement AI systems. The tone is direct, intelligent, strategic — not hype-driven. Will Hershey is the founder/face of the personal LinkedIn and Instagram accounts.

### 3. Cron Jobs — Replace Manus Heartbeat with Vercel Cron

**Current implementation:**
- `server/_core/heartbeat.ts` — `createHeartbeatJob()`, `updateHeartbeatJob()`, `deleteHeartbeatJob()` — calls Manus's internal cron registration API
- When a Schedule is created in the UI, it registers a heartbeat job that calls `/api/scheduled/generate-content` on the configured cron expression
- The cron endpoint at `/api/scheduled/generate-content` calls `generateContentHandler` in `server/cronHandlers.ts`
- A second endpoint `/api/scheduled/publish-posts` calls `publishPostsHandler` — publishes all approved posts that are due
- Cron authentication: `sdk.authenticateRequest(req)` checks for a `x-manus-cron-token` header

**What to replace with (Vercel Cron):**

Vercel Cron works differently — you define cron jobs statically in `vercel.json` and they call your API routes on a schedule. You cannot register them dynamically from user input.

**Migration strategy:**
- Add two fixed Vercel cron jobs in `vercel.json`:
  ```json
  {
    "crons": [
      { "path": "/api/scheduled/generate-content", "schedule": "0 9 * * *" },
      { "path": "/api/scheduled/publish-posts", "schedule": "*/15 * * * *" }
    ]
  }
  ```
- The `generate-content` handler already reads all active schedules from the DB and checks if each one is due based on its `cron` field — so running it on a fixed schedule (e.g., every hour) and letting it self-filter is fine
- The `publish-posts` handler already queries for posts where `scheduledAt <= now` and status = `approved` — running it every 15 minutes is correct
- Remove `createHeartbeatJob` / `updateHeartbeatJob` / `deleteHeartbeatJob` calls from the schedules router — the `cronTaskUid` field becomes unused (can keep the column, just don't populate it)
- Replace cron auth: Vercel sends a `Authorization: Bearer {CRON_SECRET}` header — validate against `process.env.CRON_SECRET`

**Cron auth replacement:**
```ts
// Replace sdk.authenticateRequest(req) cron check with:
function validateCronRequest(req: Request): boolean {
  const authHeader = req.headers.authorization;
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}
```

### 4. File Storage — Replace Manus Storage with Cloudflare R2 or AWS S3

**Current implementation:**
- `server/storage.ts` — `storagePut(key, data, contentType?)` uploads to Manus's internal S3-compatible API
- `server/_core/storageProxy.ts` — serves `/manus-storage/{key}` by getting a presigned URL from Manus's forge API
- Images generated by AI are stored via `storagePut` and referenced by `/manus-storage/{key}` URLs in the DB

**What to replace with:**
- Install `@aws-sdk/client-s3` (works for both AWS S3 and Cloudflare R2)
- Replace `storagePut` to upload directly to R2/S3
- Replace `/manus-storage/*` proxy route to generate presigned GET URLs from R2/S3
- Env vars needed: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` (or equivalent S3 vars)

### 5. Image Generation — Replace Manus Image API with DALL-E 3 or Stability AI

**Current implementation:**
- `server/_core/imageGeneration.ts` — `generateImage({ prompt, originalImages? })` calls Manus's internal image generation API
- Called in `server/cronHandlers.ts` to generate a post image alongside the caption

**What to replace with:**
```ts
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImage({ prompt }: { prompt: string }) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
  });
  return { url: response.data[0].url };
}
```

Or use Stability AI / Replicate if you prefer. The function signature `generateImage({ prompt }) => { url: string }` must be preserved.

### 6. Owner Notifications — Replace Manus Notification API

**Current implementation:**
- `server/_core/notification.ts` — `notifyOwner({ title, content })` calls Manus's internal notification API
- Used when platform connections fail or need attention

**What to replace with:**
- Simple email via Resend (`resend` npm package) or SendGrid
- Or just log to console and skip notifications for now — it's not critical path
- Env vars needed: `RESEND_API_KEY`, `OWNER_EMAIL`

---

## Environment Variables Required After Migration

```env
# Database
DATABASE_URL=mysql://...

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_...
VITE_CLERK_PUBLISHABLE_KEY=pk_...

# AI Generation
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...  # for DALL-E image generation

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=optentia-media
R2_PUBLIC_URL=https://...r2.dev

# Cron Security
CRON_SECRET=...  # random string, used to authenticate Vercel cron calls

# Social Platform APIs (already configured, just need to carry over)
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_PERSON_URN=urn:li:person:sjUMosKpaE
LINKEDIN_ORG_URN=urn:li:organization:110145143
META_PAGE_TOKEN=...
META_PAGE_ID=...
META_INSTAGRAM_ACCOUNT_ID=...
META_APP_ID=...
META_APP_SECRET=...

# Notifications (optional)
RESEND_API_KEY=...
OWNER_EMAIL=hershey@optentia.com
```

---

## Build & Deploy Setup for Vercel

The app is a monorepo with Express backend + Vite frontend. For Vercel:

**Option A — Express as Vercel Serverless Function (recommended):**
- Add `vercel.json` routing all `/api/*` to the Express server
- Build frontend with `vite build` → `dist/public`
- Serve static files from `dist/public` via Vercel's static hosting
- Express handles `/api/*` as a serverless function

**Option B — Split deployment:**
- Frontend to Vercel (static)
- Backend to Railway or Render (always-on Node.js)
- This avoids Vercel's 10-second function timeout limitation for long AI generation calls

**Build commands:**
```bash
# Install
pnpm install

# Build frontend
pnpm vite build

# Build backend (TypeScript → JavaScript)
pnpm tsc -p tsconfig.json --outDir dist/server

# Database migrations
pnpm drizzle-kit migrate
```

**Current `package.json` scripts:**
```json
{
  "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
  "build": "vite build && tsc",
  "start": "NODE_ENV=production node dist/server/_core/index.js",
  "db:push": "drizzle-kit generate && drizzle-kit migrate",
  "test": "vitest run"
}
```

---

## Key Files to Focus On

These are the files that contain Manus-specific code and need migration:

| File | What to change |
|---|---|
| `server/_core/llm.ts` | Replace `invokeLLM` to call Anthropic SDK directly |
| `server/_core/imageGeneration.ts` | Replace `generateImage` to call DALL-E 3 or Stability AI |
| `server/_core/notification.ts` | Replace `notifyOwner` to use Resend or log-only |
| `server/_core/storageProxy.ts` | Replace `/manus-storage/*` proxy with R2/S3 presigned URLs |
| `server/storage.ts` | Replace `storagePut` to upload to R2/S3 |
| `server/_core/oauth.ts` | Replace entirely with Clerk backend middleware |
| `server/_core/sdk.ts` | Replace `authenticateRequest` with Clerk's `getAuth` |
| `server/_core/heartbeat.ts` | Remove — replace with static Vercel cron config |
| `server/routers/schedules.ts` | Remove `createHeartbeatJob` / `updateHeartbeatJob` / `deleteHeartbeatJob` calls |
| `server/_core/env.ts` | Update to reflect new env var names |
| `client/src/const.ts` | Replace `getLoginUrl()` with Clerk's sign-in URL |
| `client/src/_core/hooks/useAuth.ts` | Replace with Clerk's `useUser()` / `useAuth()` hooks |
| `client/src/main.tsx` | Wrap app in `<ClerkProvider>` instead of Manus ThemeProvider |

**Do NOT change:**
- `server/publishers/` — all 3 publishers (LinkedIn, Meta, YouTube) are working correctly
- `server/routers/posts.ts` — just update the `invokeLLM` call to use the new helper
- `server/cronHandlers.ts` — just update auth check and `invokeLLM` / `generateImage` calls
- `drizzle/schema.ts` — schema is correct, no changes needed
- `server/db.ts` — all query helpers are correct
- All frontend pages — they work correctly and don't need changes
- `server/routers/heygen.ts` — calls HeyGen API directly, no Manus dependency

---

## Design System Reference

The app uses a **dark theme** with teal/emerald accent colors:

```css
/* Primary colors */
--primary: oklch(0.7 0.15 165);       /* Teal/emerald */
--background: oklch(0.08 0.01 240);   /* Near-black */
--card: oklch(0.12 0.01 240);         /* Dark card */
--muted: oklch(0.18 0.01 240);        /* Muted background */
--foreground: oklch(0.95 0.01 240);   /* Near-white text */

/* Fonts */
/* Inter for UI, Space Grotesk for headings */
```

Sidebar navigation order: Dashboard → AI Generator → Content Queue → Content Library → Content Calendar → Schedules → Platforms → Analytics → Media Library → HeyGen

---

## Current Test Suite

35 tests passing across 4 test files:
- `server/auth.logout.test.ts` — auth logout flow
- `server/content.test.ts` — content post CRUD, platform validation, status transitions
- `server/linkedin.credentials.test.ts` — LinkedIn API credential validation
- `server/linkedin.dual.test.ts` — LinkedIn personal vs company posting logic

Run with: `pnpm test`

---

## What's Working Right Now (Before Migration)

- Full content generation pipeline (manual + scheduled)
- LinkedIn personal + company page posting (both tested and working)
- Instagram + Facebook posting via Meta Graph API
- YouTube community post publishing
- Content approval queue (pending → approved → published)
- Content calendar view
- Analytics dashboard with charts
- HeyGen video generation integration
- Media asset library with S3 upload
- Scheduled content generation with per-platform AI prompts
- Platform credential management UI

---

## Priority Order for Migration

1. **Auth first** — nothing works without login. Replace Manus OAuth with Clerk.
2. **LLM second** — switch `invokeLLM` to Anthropic Claude. This is the core value.
3. **Cron third** — replace heartbeat with Vercel cron. Required for automation.
4. **Storage fourth** — replace storage proxy with R2/S3. Required for images.
5. **Notifications last** — lowest priority, can be log-only initially.
6. **Deploy** — configure `vercel.json`, set all env vars, deploy.

---

## Questions to Clarify Before Starting

1. **Auth provider:** Clerk (simpler, better DX) or Auth0 (more enterprise)? Recommend Clerk.
2. **Database host:** Keep TiDB/PlanetScale, or migrate to Neon (PostgreSQL) or Railway MySQL? The schema is MySQL — switching to Postgres requires changing `mysqlTable` → `pgTable` in Drizzle.
3. **Storage:** Cloudflare R2 (cheaper, S3-compatible) or AWS S3? Recommend R2.
4. **Image generation:** DALL-E 3 (OpenAI, $0.04/image) or Stability AI (cheaper)? Recommend DALL-E 3 for quality.
5. **Vercel plan:** The free Hobby plan has a 10-second function timeout. AI generation can take 15–30 seconds. You may need the Pro plan ($20/mo) or use Railway for the backend.
