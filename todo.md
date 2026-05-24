# Optentia Content Automation — TODO

## Database Schema
- [x] contentPosts table (platform, title, caption, hashtags, status, scheduledAt, publishedAt, contentType, mediaUrl, scriptText, aiGenerated, contentPillar, generationPrompt, scheduleId)
- [x] platformConnections table (platform, apiKey, accessToken, refreshToken, accountId, accountName, pageId, status, lastCheckedAt, errorMessage)
- [x] contentSchedules table (name, description, cron, isActive, cronTaskUid, generationPrompt, platforms, postsPerRun, contentPillars, lastRunAt)
- [x] mediaAssets table (name, type, url, storageKey, mimeType, sizeBytes, linkedPostId, tags)
- [x] analyticsEvents table (postId, platform, eventType, recordedAt)
- [x] heygenRequests table (title, scriptText, avatarId, voiceId, videoId, videoUrl, thumbnailUrl, status, durationSeconds, linkedPostId, errorMessage)
- [x] Run pnpm db:push

## Backend Routers
- [x] posts router: list, get, create, update, delete, approve, reject, generateAI, schedulePost, submitForApproval, pendingApproval
- [x] platforms router: list, get, upsert, testConnection, checkAllConnections
- [x] schedules router: list, get, create, update, toggle, delete
- [x] media router: list, create, delete
- [x] analytics router: summary, byPlatform, recentActivity, publishedOverTime, recentPosts
- [x] heygen router: list, get, createRequest, checkStatus, updateRequest

## Cron & Background Jobs
- [x] Heartbeat handler: /api/scheduled/generate-content (AI content generation per schedule)
- [x] Heartbeat handler: /api/scheduled/publish-posts (publish approved scheduled posts)
- [x] Register both handlers in server/_core/index.ts
- [x] Owner notification on post published
- [x] Owner notification on content pending approval
- [x] Owner notification on platform connection failure

## Frontend — Layout & Navigation
- [x] DashboardLayout with sidebar: Dashboard, Content Queue, Calendar, Content Library, AI Generator, Analytics, HeyGen, Platforms, Schedules
- [x] Global design system: dark elegant theme, Optentia brand colors (OKLCH), Syne + Inter fonts
- [x] Responsive sidebar with icons, labels, pending badge, and resizable width
- [x] Pending approval badge in sidebar nav

## Frontend — Pages
- [x] Dashboard overview page: stat cards, platform status, pending approval list, recent published, platform breakdown chart
- [x] Content Queue page: status tabs, approve/reject/edit/schedule actions, dialogs
- [x] AI Content Generator: platform selector, content pillar selector, topic input, auto-approval toggle
- [x] Content Calendar page: monthly grid with posts by day, navigation
- [x] Content Library page: search + filter by platform/status, grid view
- [x] Analytics page: summary cards, bar chart, pie chart, status breakdown
- [x] HeyGen Integration page: video request list, create dialog, AI script generator, status checker
- [x] Platform Connections page: 4 platform cards, configure dialog, test connection
- [x] Schedules page: schedule list with toggle/delete, create dialog with cron presets, platform/pillar selection

## Testing
- [x] Vitest: posts router CRUD and AI generation (13 tests, all passing)
- [x] Vitest: platforms router list and upsert
- [x] Vitest: analytics summary and platform breakdown
- [x] Vitest: heygen request creation
- [x] Vitest: auth logout (existing test preserved)

## Polish & Delivery
- [x] TypeScript check passes (0 errors)
- [x] All 14 tests pass
- [x] Cron handlers registered in Express server
- [x] Save checkpoint

## Phase 2 — Image Generation + Real Platform Posting

### AI Image Generation
- [x] Add imagePrompt and imageUrl columns to contentPosts schema
- [x] Run pnpm db:push for schema migration
- [x] Add generateImage call in posts.generateAI for instagram and facebook platforms
- [x] Add generateImage call in cronHandlers.ts for scheduled generation
- [x] Store generated image URL in post record
- [x] Show image preview in ContentQueue approval cards
- [x] Show image preview in AIGenerator result
- [x] Show image thumbnail in ContentLibrary grid

### Real Platform API Posting
- [x] Build Meta Graph API publisher (Instagram + Facebook) in server/publishers/meta.ts
- [x] Build LinkedIn Share API publisher in server/publishers/linkedin.ts
- [x] Build YouTube Data API publisher in server/publishers/youtube.ts
- [x] Wire all publishers into publishPostsHandler in cronHandlers.ts
- [x] Wire manual publish button in ContentQueue (publish now action)
- [x] Handle API errors gracefully with status update + owner notification
- [x] Add publishedExternalId column to contentPosts for storing platform post IDs

### Frontend Updates
- [x] Show generated image in ContentQueue post cards
- [x] Add "Publish Now" button for approved posts in ContentQueue
- [x] Show external post ID / platform link after publishing
- [x] Display image in AIGenerator after generation

## Phase 3 — LinkedIn Dual Posting (Personal + Company Page)
- [x] Add linkedin_personal and linkedin_company to platform enum in schema (platformConnections, contentPosts, analyticsEvents)
- [x] Update LinkedIn publisher to support both personal URN and company URN (authorUrn param already supported)
- [x] Update platforms router list to include linkedin_personal and linkedin_company
- [x] Update posts router create/generateAI/publishNow to accept linkedin_personal and linkedin_company
- [x] Seed LinkedIn personal (urn:li:person:sjUMosKpaE) and company (urn:li:organization:110145143) connections into database
- [x] Run pnpm db:push for schema migration (drizzle/0003_normal_avengers.sql)
- [x] Store LinkedIn access token and credentials as LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN, LINKEDIN_ORG_URN secrets
- [x] Update Platforms.tsx to show 5 platform cards (linkedin_personal + linkedin_company separate)
- [x] Update AIGenerator.tsx to default-select linkedin_personal and linkedin_company
- [x] Update Schedules.tsx platform selector to include both LinkedIn targets
- [x] Update ContentLibrary.tsx filter dropdown to include both LinkedIn targets
- [x] Update PLATFORM_CONFIG in platformUtils.ts with labels/icons for both LinkedIn targets
- [x] Write and pass 10 LinkedIn dual-posting tests (all 35 tests passing)
- [x] Update schedules router create/update to accept linkedin_personal and linkedin_company
- [x] Update cronHandlers.ts PLATFORM_PROMPTS with dedicated linkedin_personal and linkedin_company prompts
- [x] Update cronHandlers.ts publishPostToPlatform switch to handle linkedin_personal and linkedin_company

## Phase 4 — Manus Independence (Vercel self-hosted auth)
- [ ] Replace Manus OAuth with email/password auth (bcrypt + JWT)
- [ ] Add /api/auth/login and /api/auth/register endpoints
- [ ] Remove all Manus OAuth SDK dependencies from server
- [ ] Build login page UI (email + password form)
- [ ] Build register page UI (first-time setup)
- [ ] Wire LLM directly to ANTHROPIC_API_KEY (remove BUILT_IN_FORGE_API_KEY dependency)
- [ ] Seed owner account in database
- [ ] Inject new env vars into Vercel
- [ ] Push and trigger Vercel redeploy
- [ ] Verify login works on Vercel production URL
