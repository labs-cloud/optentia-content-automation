# Content Operator — iOS (React Native + Expo)

The native iOS app, sharing the backend and core logic with the web app via the
pnpm monorepo. This is **Phase 0 (Foundation)**: auth + tRPC + theming + tab
navigation, with the three hero screens and full parity arriving in later phases.

## What's shared with web (`packages/core`)
- `AppRouter` tRPC type (the API contract) and the `buildTRPCLinks` client factory
- `useSwipeDeck` deck state machine
- `platformData` (labels, icons, hex colors, content pillars, formatters)

## Architecture
- **Expo SDK 52 + expo-router** (file-based routing under `app/`).
- **Auth:** `@clerk/clerk-expo` with an `expo-secure-store` token cache. Native uses
  a **bearer token** (Clerk `getToken()` → `Authorization` header). The server's
  `getAuth(req)` already reads that header, so **no backend change is needed**.
- **Data:** `@trpc/react-query` pointed at `EXPO_PUBLIC_API_BASE_URL` (absolute).
- **Theme:** NativeWind; Frosted Vapor tokens in `global.css` (`:root` opal / `.dark`
  vapor) + `tailwind.config.js`. Light/dark via `ThemeProvider` (persisted).
- **Native visuals:** `AuroraBackground` + `AIGradient` (expo-linear-gradient).

## Prerequisites (cannot be done from the Linux repo)
1. `EXPO_PUBLIC_API_BASE_URL` — the deployed web/API origin (Vercel prod URL).
2. `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — same Clerk project as web.
3. An **Expo account** and (for the store) an **Apple Developer account**.
4. In the Clerk dashboard, ensure the native app is an allowed origin if Clerk
   rejects the token (otherwise no change).

## Run locally (on any machine with the toolchain)
```bash
cp apps/mobile/.env.example apps/mobile/.env   # fill in the two values
pnpm install                                   # from the repo root
pnpm --filter @optentia/mobile start           # Expo dev server
# press i for the iOS simulator (macOS), or open in Expo Go / a dev client
```

## Build & submit (EAS — cloud macOS, no local Mac needed)
```bash
cd apps/mobile
eas login
eas build:configure              # writes extra.eas.projectId
eas build --profile preview --platform ios     # installable test build
eas build --profile production --platform ios  # store build
eas submit --profile production --platform ios # → TestFlight / App Store
```
Fill `eas.json` `submit.production.ios` with your Apple ID, ASC app id, and team id.

## Phase 0 verification
- `pnpm --filter @optentia/mobile exec tsc --noEmit` passes (after install).
- `expo start` boots; sign in with a Clerk account; the Dashboard tab loads your
  client list — proving the bearer-token → tRPC → existing server path works.

> Note: this repo's CI environment can't `pnpm install` (registry blocked) or run
> Xcode, so the above runs on your machine / EAS, not here.
