import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

/** Entry gate: route to the app or sign-in once Clerk has loaded. */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return <Redirect href={isSignedIn ? "/(tabs)" : "/(auth)/sign-in"} />;
}
