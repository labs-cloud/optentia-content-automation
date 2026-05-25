import { trpc } from "@/lib/trpc";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useCallback } from "react";

export function useAuth() {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isSignedIn === true,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    await signOut({ redirectUrl: "/" });
  }, [signOut]);

  return {
    user: meQuery.data ?? null,
    loading: !isLoaded || (isSignedIn === true && meQuery.isLoading),
    error: meQuery.error ?? null,
    isAuthenticated: isSignedIn === true && Boolean(meQuery.data),
    refresh: () => meQuery.refetch(),
    logout,
  };
}
