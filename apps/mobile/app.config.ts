import type { ExpoConfig } from "expo/config";

/**
 * Content Operator — native iOS app. Bundle id and EAS project id are wired for
 * App Store builds; `extra` reads public env so the same config serves dev and
 * production EAS profiles.
 */
const config: ExpoConfig = {
  name: "Content Operator",
  slug: "content-operator",
  scheme: "contentoperator",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0A1322",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.optentia.contentoperator",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0A1322",
        image: "./assets/splash.png",
        imageWidth: 180,
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    // eas: { projectId: "<set by `eas build:configure`>" },
  },
};

export default config;
