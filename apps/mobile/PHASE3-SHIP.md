# Phase 3 — Ship to the App Store (runbook)

These steps run on **your machine + EAS cloud** (they can't run from the CI repo
environment). Everything in the repo is already configured for them.

Bundle id: `com.optentia.contentoperator` · Expo name: **Content Operator**

## 0. One-time prerequisites (you said these are set)
- Apple Developer Program membership.
- An App Store Connect app record for `com.optentia.contentoperator`.
- An Expo account.
- The production API origin (the deployed web/API URL).

## 1. Configure env + project (once)
```bash
cd apps/mobile
cp .env.example .env
#   EXPO_PUBLIC_API_BASE_URL = https://<your-prod-domain>      (no trailing slash)
#   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_…  (or pk_test_… while testing)

pnpm install                 # from the repo root the first time
eas login
eas init                     # links the Expo project, writes extra.eas.projectId
```

## 2. Smoke-test before building (recommended)
```bash
pnpm --filter @optentia/mobile exec tsc --noEmit   # type-check the RN tree
npx expo start                                     # press i for the iOS simulator
```
Sign in with a Clerk account → the Dashboard should load your client list. That
single authenticated call proves Clerk bearer → tRPC → the existing server works.

## 3. Internal build (TestFlight-style, on device)
```bash
eas build --platform ios --profile preview
```
EAS provisions signing automatically (`eas credentials` to inspect). Install the
resulting build on a device to validate the full app on real hardware.

## 4. Production build + submit
```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production    # prompts for Apple ID / ASC app / team
```
`eas submit` will ask for your Apple ID, the App Store Connect app id, and your
Apple Team id (or set them in `eas.json > submit.production.ios` to skip prompts).

## 5. App Store Connect (final, in the web console)
- Upload screenshots (6.7"/6.9" + 6.5" iPhone), description, keywords, support URL.
- Fill the **privacy** questionnaire (Clerk handles auth data; declare any analytics).
- Set the age rating, then **Submit for Review**.

## Notes
- App icon/splash live in `assets/` — currently an on-brand navy + teal mark
  placeholder. Drop in final artwork (1024×1024 icon, no alpha) before submitting.
- Clerk: if a native sign-in is rejected, add the app to the Clerk dashboard's
  allowed origins. The server needs **no** change — `getAuth(req)` already reads
  the `Authorization: Bearer` token the app sends.
