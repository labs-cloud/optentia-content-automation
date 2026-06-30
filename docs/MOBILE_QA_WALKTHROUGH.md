# Mobile QA Walkthrough — Content Operator (iOS / TestFlight)

A screen-by-screen punch list for the native app. Walk it top to bottom on
your phone. For anything off, jot the **ID** + a word or two; screenshot when
it's visual. Test in **both light and dark mode** (Settings → appearance, or
flip your system theme) — Frosted Vapor is designed dark-first.

## How to report an issue (fastest loop)

For each problem, give me:

```
[SCREEN-ID]  design | function   <one line>   (expected: ...)   [screenshot]
```

Example:
```
HOME-04  design   KPI numbers feel cramped against the label   (expected: more breathing room)  📷
QUEUE-02 function Approve button spins forever, post stays in list
```

Severity if you want to prioritize: 🔴 broken · 🟡 rough · 🔵 polish.

---

## 0. Global (check on every screen)

- [ ] **GLOBAL-01** Dark mode: dark navy background + aurora glow, never a flat white sheet behind content
- [ ] **GLOBAL-02** Light mode: clean "frosted vapor" light, text stays readable (no white-on-white)
- [ ] **GLOBAL-03** Floating tab dock: blurred, rounded, sits above content, doesn't cover the last row
- [ ] **GLOBAL-04** Safe areas: nothing under the notch or home indicator; bottom content scrolls clear of the dock
- [ ] **GLOBAL-05** Fonts: Playfair display for big headings, mono for eyebrows/labels — loaded, not falling back to system
- [ ] **GLOBAL-06** Pull-to-refresh works where there's data
- [ ] **GLOBAL-07** Client switcher (top right) opens, switches, and every screen rescopes to the new client
- [ ] **GLOBAL-08** Tap targets ≥ comfortable; no accidental mis-taps; back gestures work

## 1. Auth — Sign in  `(auth)/sign-in`

- [ ] **AUTH-01** Loads with branding, not a blank/jumpy screen
- [ ] **AUTH-02** Sign-in flow completes and lands on Home
- [ ] **AUTH-03** Wrong credentials show a clear error
- [ ] **AUTH-04** Stays signed in after closing/reopening the app

## 2. Home / Dashboard  `(tabs)/index`  ← just rebuilt

- [ ] **HOME-01** Header: "Workspace · {date}" eyebrow, client name in display font, pulsing-dot "Brand Brain calibrated" pill
- [ ] **HOME-02** Actions: "New campaign" (ghost) + "Generate posts" (iridescent AI gradient) — both tap through
- [ ] **HOME-03** KPI grid (Pending / Scheduled / Published / Total): correct live numbers, amber pending, teal published
- [ ] **HOME-04** KPI spacing/sizing reads well; each tile taps to its screen
- [ ] **HOME-05** Brand Brain card: gradient border + glowing orb + working copy; "Tune voice" reachable
- [ ] **HOME-06** "Needs your approval": real posts, platform-colored icons, titles not clipped
- [ ] **HOME-07** Inline approve ✓ / reject ✗ work and the row updates
- [ ] **HOME-08** Quick actions 2×2 all navigate correctly; counts match KPIs
- [ ] **HOME-09** Empty state when a client has no data reads sensibly

## 3. Brainstorm  `(tabs)/brainstorm`

- [ ] **BRAIN-01** Ideas load; swipe/interaction feels right
- [ ] **BRAIN-02** Generating fresh ideas works and shows progress
- [ ] **BRAIN-03** Saving/dismissing an idea persists
- [ ] **BRAIN-04** Empty + loading states look intentional

## 4. Queue  `(tabs)/queue`

- [ ] **QUEUE-01** Pending posts list loads, scoped to the active client
- [ ] **QUEUE-02** Approve / reject update the list and the Home KPIs
- [ ] **QUEUE-03** Post preview (caption, platform, media) renders correctly
- [ ] **QUEUE-04** Filters/tabs (if any) work
- [ ] **QUEUE-05** Empty state ("all caught up") shows when nothing's pending

## 5. Campaigns  `(tabs)/campaigns`

- [ ] **CAMP-01** Campaign list loads with status/meta
- [ ] **CAMP-02** "New campaign" creates one
- [ ] **CAMP-03** Tapping a campaign opens its detail
- [ ] **CAMP-04** Cards align; long names/truncation handled

### 5a. Campaign detail  `(more)/campaign/[id]`

- [ ] **CAMPD-01** Header, status, and associated posts load
- [ ] **CAMPD-02** Actions (edit/schedule/generate) work
- [ ] **CAMPD-03** Back returns to the list cleanly

## 6. Calendar  `(tabs)/calendar`

- [ ] **CAL-01** Scheduled posts appear on the right dates
- [ ] **CAL-02** Month/week navigation works
- [ ] **CAL-03** Tapping a day/post opens detail
- [ ] **CAL-04** Timezone/date labels correct
- [ ] **CAL-05** Empty days/months don't look broken

## 7. More menu  `(more)/menu`

- [ ] **MENU-01** Lists all secondary screens with icons
- [ ] **MENU-02** Every row navigates to the right place
- [ ] **MENU-03** Layout/spacing consistent with the rest of the app

### Secondary screens (open each from More)

- [ ] **GEN-01** Generate: prompt/options work, generation runs, results land in queue
- [ ] **BRAND-01** Brand Brain: voice/brand fields load, edits save, reflect back
- [ ] **CLIENTS-01** Clients: list loads, switch/select works, add (if supported)
- [ ] **ANALYTICS-01** Analytics: charts/numbers render, no overflow, match reality
- [ ] **LIBRARY-01** Content Library: assets/posts load, media thumbnails render
- [ ] **HEYGEN-01** HeyGen: screen loads, integration actions behave
- [ ] **PLATFORMS-01** Platforms: connected accounts show correct status
- [ ] **SCHED-01** Schedules: recurring slots load and edit
- [ ] **SET-01** Settings: appearance toggle, sign-out, account info all work

---

## Scratch — log issues here as you go

| ID | sev | design/fn | issue | expected |
|----|-----|-----------|-------|----------|
|    |     |           |       |          |
