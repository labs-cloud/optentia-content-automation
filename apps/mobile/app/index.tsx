import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { DEV_BYPASS } from "@/lib/env";

/** Entry gate: route to the app or sign-in once Clerk has loaded. */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  // Dev bypass: skip Clerk entirely and go straight into the app.
  if (DEV_BYPASS) return <Redirect href="/(tabs)" />;
  if (!isLoaded) return null;
  return <Redirect href={isSignedIn ? "/(tabs)" : "/(auth)/sign-in"} />;
}
