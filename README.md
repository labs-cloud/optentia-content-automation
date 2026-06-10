# Optentia Content Operator

A multi-client AI marketing operating system. Each client/company gets its own workspace: a **Brand Brain** (Brand Operating Profile that drives all generation), a **swipe-based brainstorm deck** that learns preferences, a **campaign engine**, an **approval queue**, a **calendar/scheduler**, and an **analytics learning loop** with AI weekly reports and cost tracking.

- **Production:** https://optentia-content-automation.vercel.app
- **Strategy doc:** [`docs/OPTENTIA_CONTENT_OPERATOR_STRATEGY.md`](docs/OPTENTIA_CONTENT_OPERATOR_STRATEGY.md)
- **v2 changelog:** [`docs/V2_MULTI_CLIENT_UPGRADE.md`](docs/V2_MULTI_CLIENT_UPGRADE.md)

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS 4 + shadcn/ui, wouter routing, framer-motion, tRPC client + React Query, Clerk auth
- **Backend:** Express 4 + tRPC 11 on Vercel serverless (`server/vercel-entry.ts`), Drizzle ORM + MySQL
- **AI:** Anthropic Claude (generation, via `server/promptBuilder.ts` + `trackedInvokeLLM`), OpenAI gpt-image-1 (graphics)
- **Publishing:** Meta Graph (Instagram/Facebook), LinkedIn (personal + company), YouTube community; email/WhatsApp as manual channels
- **Storage:** Vercel Blob · **Notifications:** Resend · **Cron:** Vercel Cron → `/api/scheduled/check-and-run` every 15 min

## How the product works

1. **Clients** (`/clients`) — create a workspace per company; the switcher in the sidebar sets the active client. Everything below is scoped to it.
2. **Brand Brain** (`/brand`) — generate/edit the Brand Operating Profile (voice, tone, audience, buyer pains, offers, proof points, visual style, CTA style, forbidden phrases, approved/rejected examples). Every prompt the system builds includes this profile plus recent preference signals.
3. **Brainstorm** (`/brainstorm`) — AI deals idea cards; swipe right = like, left = pass, up = save for campaign, tap = detail. Each swipe records a preference signal.
4. **Campaigns** (`/campaigns`) — pick goal/duration/platforms + liked ideas → AI writes a campaign thesis and a day-by-day content plan → generate all assets into the queue.
5. **Queue** (`/queue`) — card-based approval: approve/reject/edit/schedule/publish, regenerate, create variation (incl. converting formats), save as winner. Approvals/rejections also train the brand.
6. **Calendar** (`/calendar`) and **Analytics** (`/analytics`) — filters, recommended posting times, top posts, AI weekly report, and per-client LLM cost from `model_runs`.

## Development

```bash
pnpm install
pnpm dev          # local dev server (tsx watch)
pnpm check        # tsc --noEmit
pnpm test         # vitest
pnpm build        # vite + esbuild bundle
pnpm seed         # idempotent: applies schema (runtime DDL) + seeds clients
```

Environment: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CLERK_SECRET_KEY` + `VITE_CLERK_PUBLISHABLE_KEY`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `CRON_SECRET`, `OWNER_EMAIL`.

### Schema changes & migration

The deployed app **migrates its own database**: `server/ensureSchema.ts` applies idempotent DDL and `server/seedCore.ts` seeds/backfills, triggered from the secured cron endpoint on the first tick after a deploy. Manual trigger:

```
GET /api/scheduled/migrate?secret=CRON_SECRET
```

For new schema work, edit `drizzle/schema.ts`, add matching idempotent DDL to `ensureSchema.ts` (or use `drizzle-kit` locally), and keep enum changes **append-only** (MySQL truncates on reorder/removal).

### Code map

| Area | Where |
|---|---|
| Drizzle schema | `drizzle/schema.ts` |
| DB helpers | `server/db.ts` |
| Prompt building (brand-driven) | `server/promptBuilder.ts` |
| LLM cost tracking | `server/_core/trackedLlm.ts` → `model_runs` |
| Client access guard | `server/_core/clientScope.ts` |
| tRPC routers | `server/routers/*.ts`, aggregated in `server/routers.ts` |
| Cron generate/publish + runtime migration | `server/cronHandlers.ts`, `server/ensureSchema.ts`, `server/seedCore.ts` |
| Publishers | `server/publishers/{meta,linkedin,youtube}.ts` |
| Active client state | `client/src/contexts/ActiveClientContext.tsx` |
| Design system | `client/src/components/` (PremiumCard, SwipeDeck, ApprovalCard, …) |
| Shared constants (web + future mobile) | `shared/platforms.ts` |

> Historical note: `CLAUDE_HANDOFF.md` documents the original Manus→Vercel migration and predates the v2 multi-client upgrade.
