import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AIGradient } from "@/components/AIGradient";

/**
 * Minimal Clerk Expo email/password sign-in (Phase 0). OAuth/social can be added
 * in a later phase via useOAuth + the app's "contentoperator" scheme.
 */
export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    if (!isLoaded) return;
    setBusy(true);
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError("Additional verification required. Continue on the web for now.");
      }
    } catch (e: unknown) {
      const msg =
        (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
        "Couldn't sign in. Check your details and try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-8">
          <AIGradient borderRadius={18} style={{ width: 56, height: 56, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 26 }}>⚡️</Text>
          </AIGradient>
          <Text className="mt-4 text-2xl font-bold text-foreground">Content Operator</Text>
          <Text className="mt-1 text-sm text-muted-foreground">Sign in to your workspace</Text>
        </View>

        <View className="gap-3 rounded-[22px] border border-border bg-surface p-5">
          <TextInput
            placeholder="Email"
            placeholderTextColor="#8a9bb0"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            className="rounded-xl border border-border px-4 py-3 text-foreground"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#8a9bb0"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="rounded-xl border border-border px-4 py-3 text-foreground"
          />
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          <Pressable
            onPress={onSignIn}
            disabled={busy}
            className="mt-1 items-center rounded-xl bg-primary py-3 active:opacity-80"
          >
            {busy ? (
              <ActivityIndicator color="#06121f" />
            ) : (
              <Text className="font-semibold text-primary-foreground">Continue</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
