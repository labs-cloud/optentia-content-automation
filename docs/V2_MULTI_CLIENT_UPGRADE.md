# v2 — Multi-Client AI Marketing OS Upgrade

**Date:** 2026-06-10 · **PRs:** [#6](https://github.com/labs-cloud/optentia-content-automation/pull/6) (main upgrade), [#8](https://github.com/labs-cloud/optentia-content-automation/pull/8) (cron fix) · **Status:** merged & deployed

Implements [`OPTENTIA_CONTENT_OPERATOR_STRATEGY.md`](OPTENTIA_CONTENT_OPERATOR_STRATEGY.md): the single-tenant Optentia dashboard became a premium multi-client AI marketing operator.

## Summary of changes

### Data model (`drizzle/schema.ts`)

**New tables**

| Table | Purpose |
|---|---|
| `clients` | Client/company workspaces (name, website, industry, description, offer, audience, status) |
| `client_brand_profiles` | Brand Operating Profile per client — voice, tone, audience, buyer pains, offers, proof points, competitors, visual style, CTA style, forbidden phrases, approved/rejected examples, brand summary |
| `preference_signals` | Learning loop — swipes, approvals, rejections, edits, winners (direction + content + reason) |
| `brainstorm_ideas` | Swipe-deck idea cards (9 types: post hook, campaign angle, reel, carousel, email angle, whatsapp message, ad concept, visual concept, offer angle) |
| `campaigns` | Goal (7 options), thesis, offer, platforms, duration, dates, status |
| `campaign_content_items` | Day-by-day content plan slots, linked to generated posts |
| `content_performance_snapshots` | Per-post engagement metrics over time |
| `model_runs` | Every LLM call: task type, model, tokens, estimated cost (micro-dollars), latency, status |

**Existing tables** — nullable `clientId` added to `content_posts`, `content_schedules`, `media_assets`, `analytics_events`, `heygen_requests`, `platform_connections`; posts also gained `campaignId`, `isWinner`, `parentPostId`. Platform enums extended (append-only) with `email`, `whatsapp`.

### Backend

- **`server/promptBuilder.ts`** — single source of prompt construction. Replaces the hardcoded Optentia/Will Hershey prompts that were duplicated across `posts.ts` and `cronHandlers.ts`. Every generation composes: client info + brand profile + campaign context + approved/rejected examples + recent preference signals + platform-specific structural rules (8 platforms).
- **`server/_core/trackedLlm.ts`** — wraps `invokeLLM`; logs tokens/cost/latency/status to `model_runs` (fire-and-forget, never blocks generation).
- **`server/_core/clientScope.ts`** — `assertClientAccess(ctx, clientId)` guard on every scoped procedure.
- **New routers** — `clients` (CRUD + archive), `brandProfile` (get/update/generateBrandProfile/signals), `brainstorm` (generateBrainstormIdeas/get/update/savePreferenceSignal), `campaigns` (createCampaign/generateCampaign/generateContentFromCampaign/getCampaigns/getCampaignById).
- **Extended routers** — `analytics` (+generateWeeklyReport, snapshots, topPosts, modelRunSummary), `posts` (+markWinner, generateVariation; approve/reject/edit record preference signals). All routers clientId-scoped.
- **Credential safety** — platform connections keyed per `(clientId, platform)`; no cross-client credential reuse.
- **Manual channels** — email/WhatsApp content is generated and queued but never auto-published; cron skips them.

### Frontend

- **Active client workspace** — `ActiveClientContext` (+localStorage persistence) and `ClientSwitcher` in the shell; switching invalidates all queries.
- **New pages** — `/clients`, `/brand` (Brand Brain), `/brainstorm` (framer-motion swipe deck: right=like, left=pass, up=save, tap=detail, keyboard fallback), `/campaigns`, `/campaigns/:id`.
- **Upgraded pages** — Dashboard (command center), Queue (ApprovalCards + platform/campaign filters + regenerate/variation/winner), Calendar (filters + recommended times + campaign CTA empty state), Analytics (top posts, AI cost, weekly report).
- **Design system** — PremiumCard, StatCard, SwipeDeck (+`useSwipeDeck` hook, RN-ready), IdeaCard, ApprovalCard, ContentPreviewCard, CampaignCard, BrandProfilePanel, EmptyState, AIThinkingState, MobileSheet, FloatingActionButton, BottomNav, motion primitives. Mobile-first; bottom tab bar on phones.
- All pre-existing routes kept working.

### Migration & ops

- **Self-applying migration** — `server/ensureSchema.ts` (idempotent DDL) + `server/seedCore.ts` (Optentia + demo client seed, legacy-row backfill) run automatically from the secured cron endpoint. Manual trigger: `GET /api/scheduled/migrate?secret=CRON_SECRET`. Local equivalent: `pnpm seed`.
- **Behavior preservation** — Optentia's seeded brand profile reproduces the previously hardcoded prompt voice, so generation output for Optentia is unchanged.
- **Cron bug fixed (#8)** — Vercel Cron invokes with GET; only POST was registered, so every scheduled tick had been 404ing (pre-existing). GET handlers added; scheduled generation/publishing now actually runs.

## Backlog

- Real send integrations for email/WhatsApp
- Drag-to-reschedule on the calendar
- Automatic performance snapshot ingestion from platform APIs (manual `recordSnapshot` exists)
- Expo/React Native app (Today queue, swipe brainstorm, approvals, calendar preview, weekly report) reusing the tRPC API + `useSwipeDeck`
- Learned posting times from snapshots (static heuristic shipped in `shared/platforms.ts`)
