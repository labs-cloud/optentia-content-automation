# Optentia Content Automation — Product Redesign & Build Strategy

## Objective

Transform the current Optentia content automation app from a functional internal dashboard into a premium, AI-native, multi-account marketing operating system.

The app should start with two real use cases:

1. Optentia’s own content engine.
2. One active marketing client account.

The product must support adding additional client/company accounts later, without rewriting the architecture.

The experience should feel polished, smooth, premium, and mobile-native. The design inspiration should be closer to Holo, Linear, Arc, Raycast, and high-end iOS apps — not a generic admin dashboard.

---

## 1. Product Vision

### Current Problem

The current app has real backend functionality, including generation, scheduling, publishing paths, analytics events, platform connections, and HeyGen support.

But the product currently feels like a dashboard/tool.

The next version should feel like:

> An AI marketing operator that learns every company, brainstorms campaigns, generates content, learns what the user likes, schedules content, tracks performance, and improves the next batch.

### Core Positioning

**Optentia Content Operator**

A premium AI marketing workspace where each company gets its own content brain, campaign engine, approval flow, scheduler, and performance loop.

### Product Promise

Add a company.  
Teach the AI what the brand is.  
Swipe through ideas.  
Approve what feels right.  
Schedule content.  
Let the system learn what performs.

---

## 2. Strategic Differentiation

### Do Not Build

Do not build another basic AI caption generator.

Do not build a boring social media scheduling dashboard.

Do not build a copy of Buffer, Hootsuite, or Metricool.

Do not make the UI feel like a CRUD admin panel.

### Build Instead

Build an AI-native marketing operating system with:

- Brand memory per company.
- Smooth onboarding.
- Idea swiping and preference learning.
- Campaign-based content generation.
- Multi-account workspace.
- Approval queue.
- Calendar scheduling.
- Analytics learning loop.
- iOS-first interaction patterns.
- Web + iOS-ready architecture.

---

## 3. Design Direction

### Desired Feeling

The app should feel:

- Smooth.
- Premium.
- Minimal.
- Fast.
- Slightly futuristic.
- Calm, not cluttered.
- AI-native, not form-heavy.
- More like a product people want to use daily.

### Visual References

Use the following design inspirations:

#### Holo-style qualities

- Clean landing-style cards.
- Soft gradients.
- Smooth transitions.
- Big clear actions.
- Minimal friction.
- Magical “AI is doing the work” feeling.
- Content previews that look polished.

#### Linear-style qualities

- Sharp layout discipline.
- Beautiful spacing.
- Dark-mode capable.
- Command-center feeling.
- Minimal but premium.

#### iOS-style qualities

- Large rounded cards.
- Fluid motion.
- Swipe gestures.
- Bottom navigation.
- Haptic-friendly interactions.
- Sheet-based editing.
- Native-feeling transitions.

#### Tinder/consumer app learning pattern

For generated ideas and content suggestions:

- Swipe right = like / save / train preference.
- Swipe left = reject / teach model.
- Tap = open detail.
- Long press = explain why this works.
- Save to campaign.
- Use liked ideas later.

---

## 4. Core Product Loops

### Loop 1 — Company Setup

User creates a company/account.

Flow:

1. Add company.
2. Enter company name.
3. Add website URL.
4. Add industry.
5. Add audience.
6. Add offer/service.
7. Add tone/style preference.
8. Upload optional brand docs/examples.
9. AI creates Brand Operating Profile.
10. User approves or edits.

Company examples for initial build:

- Optentia.
- Current marketing client.
- Future client accounts.

---

### Loop 2 — Brand Brain

Every company has a Brand Operating Profile.

It stores:

- Company description.
- Website URL.
- Industry.
- Audience.
- Buyer pains.
- Offers.
- Services/products.
- Tone.
- Visual style.
- CTA style.
- Proof points.
- Competitors.
- Forbidden phrases.
- Approved content examples.
- Rejected content examples.
- Swiping preference history.

This profile must drive all generation.

No prompts should be hardcoded only to Optentia.

---

### Loop 3 — Brainstorm Swipe

This is a major product differentiator.

Instead of generating finished posts immediately, the AI should first generate ideas.

Example flow:

1. User selects company.
2. User clicks “Brainstorm.”
3. AI generates idea cards.
4. User swipes:
   - Right = like.
   - Left = reject.
   - Up = save for campaign.
   - Tap = expand.
5. The system learns preference patterns.
6. Liked ideas become campaign inputs.
7. Rejected ideas improve future filtering.

Idea cards can include:

- Hook idea.
- Post angle.
- Campaign concept.
- Visual concept.
- Email angle.
- Reel script idea.
- CTA idea.
- Offer angle.
- Carousel structure.
- Ad concept.

Each swipe should create a preference signal.

---

### Loop 4 — Campaign Generator

The app should generate campaigns, not random isolated posts.

Campaign creation flow:

1. Select company.
2. Select campaign goal:
   - Awareness.
   - Leads.
   - Authority.
   - Offer push.
   - Re-engagement.
   - Education.
   - Testimonial/proof.
3. Select duration:
   - 7 days.
   - 14 days.
   - 30 days.
4. Select platforms:
   - Instagram.
   - LinkedIn personal.
   - LinkedIn company.
   - Facebook.
   - YouTube.
   - Email.
   - WhatsApp.
5. Select liked brainstorm ideas.
6. Generate campaign.

Campaign output should include:

- Campaign thesis.
- Content pillars.
- 10–30 posts.
- Reel scripts.
- Carousel outlines.
- Emails.
- WhatsApp broadcast copy.
- Suggested schedule.
- CTA recommendations.
- Visual direction.

---

### Loop 5 — Content Approval

Generated content enters an approval queue.

Statuses:

- Draft.
- Needs review.
- Approved.
- Scheduled.
- Published.
- Rejected.
- Needs revision.
- Winner.
- Repurpose later.

Approval UI should be card-based and fast.

Actions:

- Approve.
- Reject.
- Regenerate.
- Edit.
- Schedule.
- Save as winner.
- Create variation.
- Turn into email.
- Turn into carousel.
- Turn into Reel script.

---

### Loop 6 — Calendar & Scheduler

Calendar should be visual and simple.

Views:

- Week view.
- Month view.
- Platform filter.
- Company filter.
- Campaign filter.
- Status filter.

Interactions:

- Drag to reschedule.
- Click content card to edit.
- Bulk schedule.
- Recommended time slots.
- Auto-fill calendar from approved posts.

Initial version can support manual scheduling and export. Later version should support direct publishing integrations.

---

### Loop 7 — Analytics Learning Loop

Analytics should not just show vanity metrics.

The app should learn:

- Which hooks perform.
- Which CTAs perform.
- Which content pillars perform.
- Which platforms perform.
- Which posting times perform.
- Which visual directions perform.
- Which ideas the user likes.
- Which ideas the audience engages with.

Weekly AI report:

- What worked.
- What failed.
- What to post more of.
- What to stop.
- What to repurpose.
- What to generate next.

---

## 5. iOS App Strategy

### Important Direction

Build the web app in a way that can become iOS without starting over.

Preferred approach:

- Keep backend as existing Express/tRPC/Drizzle API.
- Build shared business logic.
- Build web UI now with mobile-first responsive design.
- Later add React Native / Expo app using the same tRPC API.
- Use the same design tokens across web and mobile.

### iOS-first UX Concepts

The iOS app should focus on the highest-frequency actions:

- Swipe brainstorm ideas.
- Review generated content.
- Approve/reject posts.
- Edit quick captions.
- Schedule content.
- Check daily content queue.
- Get weekly performance summary.
- Manage client/company switcher.

Do not make the iOS app a full admin panel in v1.

The iOS app should feel like a command center in your pocket.

### iOS Navigation

Suggested bottom tabs:

1. Today
2. Brainstorm
3. Campaigns
4. Calendar
5. Clients

Important mobile screens:

- Company switcher.
- Swipe brainstorm deck.
- Content approval deck.
- Campaign progress.
- Calendar preview.
- Weekly report.
- Quick edit sheet.

---

## 6. New Information Architecture

### Web App Sidebar

- Home
- Clients
- Brand Brain
- Brainstorm
- Campaigns
- Content Queue
- Calendar
- Analytics
- Platforms
- Media
- Settings

### Mobile App Tabs

- Today
- Brainstorm
- Campaigns
- Calendar
- Clients

### Home Dashboard

The home dashboard should not feel like a spreadsheet.

It should show:

- Selected company.
- Today’s content queue.
- Pending approvals.
- Active campaigns.
- Best-performing content.
- AI recommendation.
- Quick actions.

Example cards:

- “12 ideas ready to review.”
- “6 posts waiting for approval.”
- “Optentia has 18 scheduled posts this month.”
- “Your client’s best angle this week: before/after proof.”
- “Generate next batch from winners.”

---

## 7. Design System Requirements

### Theme

Create a premium design system.

Default should support dark mode and light mode.

Recommended visual direction:

- Background: deep charcoal / near black for dark mode.
- Cards: elevated dark surfaces with subtle borders.
- Accent colors: electric blue, violet, teal, or gold.
- Text: high contrast but not harsh.
- Corners: large radius.
- Shadows: subtle.
- Motion: smooth but not excessive.

### Components Needed

Build reusable components:

- AppShell
- Sidebar
- TopBar
- ClientSwitcher
- CommandButton
- PremiumCard
- StatCard
- SwipeDeck
- IdeaCard
- ContentPreviewCard
- CampaignCard
- CalendarCard
- ApprovalCard
- BrandProfilePanel
- EmptyState
- LoadingGenerationState
- AIThinkingState
- BottomNav
- MobileSheet
- FloatingActionButton

### Motion

Use Framer Motion if available.

Motion should include:

- Card entrance.
- Swipe gestures.
- Smooth page transitions.
- Loading shimmer.
- Approval micro-interactions.
- Calendar drag feel.
- Sheet open/close.

Do not overdo animation. It should feel expensive, not childish.

---

## 8. Data Model Changes

Add these tables:

### clients

Fields:

- id
- userId
- name
- websiteUrl
- industry
- description
- primaryOffer
- audience
- status
- createdAt
- updatedAt

### client_brand_profiles

Fields:

- id
- clientId
- voice
- tone
- audience
- buyerPains
- offers
- proofPoints
- competitors
- visualStyle
- ctaStyle
- forbiddenPhrases
- approvedExamples
- rejectedExamples
- brandSummary
- createdAt
- updatedAt

### preference_signals

Fields:

- id
- clientId
- userId
- sourceType
- sourceId
- signal
- reason
- metadata
- createdAt

Signal examples:

- liked
- rejected
- saved
- used_in_campaign
- regenerated
- edited
- published
- winner

### brainstorm_ideas

Fields:

- id
- clientId
- campaignId nullable
- type
- title
- hook
- description
- platform
- contentPillar
- visualConcept
- cta
- status
- score
- createdAt
- updatedAt

### campaigns

Fields:

- id
- clientId
- name
- goal
- thesis
- offer
- platforms
- durationDays
- status
- startDate
- endDate
- createdAt
- updatedAt

### campaign_content_items

Fields:

- id
- campaignId
- contentPostId
- role
- createdAt

### content_performance_snapshots

Fields:

- id
- contentPostId
- clientId
- platform
- impressions
- likes
- comments
- shares
- saves
- clicks
- leads
- engagementRate
- capturedAt

### model_runs

Fields:

- id
- clientId
- userId
- taskType
- provider
- model
- inputTokens
- outputTokens
- cost
- latencyMs
- status
- qualityRating
- createdAt

---

## 9. Backend Refactor Requirements

### Critical

All content must be scoped by clientId.

Update existing tables/routes:

- content_posts
- content_schedules
- media_assets
- analytics_events
- heygen_requests
- platform_connections

Add clientId where missing.

### Prompt Refactor

Remove hardcoded Optentia-only prompting.

Prompts must use selected client data:

- client.name
- client.websiteUrl
- client.industry
- client.description
- brandProfile.voice
- brandProfile.audience
- brandProfile.buyerPains
- brandProfile.offers
- brandProfile.proofPoints
- brandProfile.visualStyle
- brandProfile.ctaStyle
- brandProfile.forbiddenPhrases
- approvedExamples
- rejectedExamples
- preferenceSignals

### AI Routes Needed

Add routes for:

- generateBrandProfile
- generateBrainstormIdeas
- savePreferenceSignal
- generateCampaign
- generateContentFromCampaign
- generateVariations
- generateWeeklyReport
- generateNextBatchFromWinners

---

## 10. Frontend Build Priorities

### Phase 1 — Design System Reset

Replace the current visual style with a premium system.

Tasks:

1. Create design tokens.
2. Create new AppShell.
3. Create premium sidebar.
4. Create client switcher.
5. Create reusable card components.
6. Improve typography.
7. Add dark mode.
8. Add motion primitives.

### Phase 2 — Client Workspace

Build:

1. Clients page.
2. Add client flow.
3. Client detail page.
4. Brand Brain page.
5. Generate Brand Operating Profile.
6. Edit/save brand profile.

### Phase 3 — Swipe Brainstorm

Build:

1. Brainstorm page.
2. SwipeDeck component.
3. IdeaCard component.
4. Generate idea button.
5. Swipe right/left/up interactions.
6. Save preference signals.
7. Liked ideas list.
8. Use liked ideas in campaign.

### Phase 4 — Campaign Builder

Build:

1. Campaigns page.
2. New campaign flow.
3. Campaign goal selector.
4. Platform selector.
5. Duration selector.
6. Idea selector.
7. Generate campaign.
8. Campaign detail page.
9. Generate content from campaign.

### Phase 5 — Content Queue Upgrade

Refactor existing content queue.

Make it:

- Card-based.
- Filterable by company.
- Filterable by campaign.
- Filterable by platform.
- Filterable by status.
- Swipe/approve friendly.
- Mobile responsive.

### Phase 6 — Calendar Upgrade

Improve calendar UI.

Features:

- Company filter.
- Campaign filter.
- Platform filter.
- Drag/reschedule if feasible.
- Better empty states.
- Suggested posting times.

### Phase 7 — Analytics Learning

Add:

- Performance snapshot model.
- Weekly report screen.
- Top hooks.
- Top pillars.
- Top platforms.
- Repurpose recommendations.
- Generate next batch from winners.

---

## 11. Go-To-Market Plan

### Initial Market

Start with internal and service-based client use.

The first market is not broad SaaS.

The first market is:

- Optentia’s own marketing.
- Your current client.
- 3–5 service businesses.
- Agencies or operators managing multiple accounts.

### First Offer

Position it as:

> We install an AI marketing operator that creates, schedules, and improves your company’s content every week.

### First Use Case

30-day content system for one company.

Deliverables:

- Brand Operating Profile.
- 30-day campaign plan.
- 30+ social posts.
- Reel scripts.
- Email/WhatsApp copy.
- Calendar.
- Weekly performance report.

### Pricing Test

Start service-led before SaaS.

Potential packages:

#### Starter Content Operator

- 1 company.
- 30 posts/month.
- Weekly report.
- Manual approval.
- $500–$1,000/month.

#### Growth Content Operator

- 1 company.
- 60–90 posts/month.
- Campaign planning.
- Multi-platform.
- Weekly optimization.
- $1,500–$3,000/month.

#### Agency / Multi-Client Operator

- Multiple companies.
- Client workspaces.
- Approval flows.
- Reports.
- Custom integrations.
- $3,000+/month or custom.

### Sales Angle

Do not sell “AI content.”

Sell:

- Consistency.
- Speed.
- Fewer marketing bottlenecks.
- No blank-page problem.
- One content brain per company.
- Less need for a full content team.
- Better reuse of what already works.

### Demo Flow

1. Add their company.
2. Scan/build brand profile.
3. Generate 20 ideas.
4. Swipe through them.
5. Generate campaign.
6. Approve posts.
7. Show calendar.
8. Show weekly learning report mockup.

The swipe moment is the demo hook.

---

## 12. Implementation Notes

### Correct Build Order

1. Design system reset.
2. Client/workspace architecture.
3. Brand Brain.
4. Swipe brainstorm.
5. Campaign generator.
6. Approval/calendar.
7. Analytics learning.
8. Native iOS later.

### Important Warning

Do not start by building the native iOS app separately.

Build the web app mobile-first and structure the backend/types/components so Expo/React Native can reuse the same API later.

Splitting too early into web + iOS risks creating two half-finished products.
