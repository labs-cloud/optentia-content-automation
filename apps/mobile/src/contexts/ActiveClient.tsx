import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/clerk-expo";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export type ClientSummary = {
  id: number;
  name: string;
  websiteUrl: string | null;
  industry: string | null;
  description: string | null;
  primaryOffer: string | null;
  audience: string | null;
  status: "active" | "paused" | "archived";
};

type ActiveClientValue = {
  clients: ClientSummary[];
  activeClient: ClientSummary | null;
  activeClientId: number | null;
  setActiveClientId: (id: number) => void;
  isLoading: boolean;
};

const STORAGE_KEY = "co-active-client";
const ActiveClientContext = createContext<ActiveClientValue | null>(null);

/** Mirrors the web ActiveClientContext: tracks the one active client workspace. */
export function ActiveClientProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const { data, isLoading } = trpc.clients.list.useQuery(undefined, {
    staleTime: 60_000,
    enabled: isSignedIn === true,
  });
  const clients = useMemo(() => (data ?? []) as ClientSummary[], [data]);

  const [storedId, setStoredId] = useState<number | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => setStoredId(v ? Number(v) : null));
  }, []);

  const activeClient = useMemo(() => {
    if (clients.length === 0) return null;
    return clients.find((c) => c.id === storedId) ?? clients[0];
  }, [clients, storedId]);

  const activeClientId = activeClient?.id ?? null;

  const setActiveClientId = (id: number) => {
    setStoredId(id);
    AsyncStorage.setItem(STORAGE_KEY, String(id));
    // Everything is client-scoped — drop the cache on switch.
    queryClient.invalidateQueries();
  };

  const value = useMemo(
    () => ({ clients, activeClient, activeClientId, setActiveClientId, isLoading }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clients, activeClient, activeClientId, isLoading],
  );

  return <ActiveClientContext.Provider value={value}>{children}</ActiveClientContext.Provider>;
}

export function useActiveClient() {
  const ctx = useContext(ActiveClientContext);
  if (!ctx) throw new Error("useActiveClient must be used within ActiveClientProvider");
  return ctx;
}

/** Convenience for client-scoped queries: { clientId, enabled }. */
export function useClientScope() {
  const { activeClientId } = useActiveClient();
  return { clientId: activeClientId ?? 0, enabled: activeClientId !== null };
}
