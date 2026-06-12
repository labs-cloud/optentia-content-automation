import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  clerkPublishableKey?: string;
};

/** Absolute API origin (no trailing slash) — required on native. */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? "";

/** TEMPORARY dev bypass: when set, the app skips Clerk sign-in and sends this
 *  token as x-dev-bypass so the server resolves the owner account. */
export const DEV_BYPASS_TOKEN: string = process.env.EXPO_PUBLIC_DEV_BYPASS_TOKEN ?? "";
export const DEV_BYPASS = DEV_BYPASS_TOKEN.length > 0;

// ClerkProvider needs a valid-FORMAT key to mount even when we never sign in.
// In bypass mode, fall back to a harmless dummy (points at clerk.example.com,
// never contacted because no sign-in happens) so no real Clerk key is needed.
const DUMMY_CLERK_KEY = "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";
export const CLERK_PUBLISHABLE_KEY: string =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  extra.clerkPublishableKey ??
  (DEV_BYPASS ? DUMMY_CLERK_KEY : "");
