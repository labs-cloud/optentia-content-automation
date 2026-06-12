import * as SecureStore from "expo-secure-store";

/**
 * Clerk Expo token cache backed by the iOS Keychain (expo-secure-store), so the
 * session token persists across cold starts. Used as <ClerkProvider tokenCache>.
 */
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore write failures (e.g. simulator keychain quirks)
    }
  },
};
