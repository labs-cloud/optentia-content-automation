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
