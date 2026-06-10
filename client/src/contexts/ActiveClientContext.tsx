import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

type ActiveClientContextValue = {
  clients: ClientSummary[];
  activeClient: ClientSummary | null;
  activeClientId: number | null;
  setActiveClientId: (id: number) => void;
  isLoading: boolean;
};

const STORAGE_KEY = "optentia-active-client";

const ActiveClientContext = createContext<ActiveClientContextValue | null>(null);

/**
 * Tracks which client workspace is active. Mount INSIDE the signed-in branch of
 * the app shell — the clients.list query is Clerk-protected.
 */
export function ActiveClientProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = trpc.clients.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const clients = useMemo(() => (data ?? []) as ClientSummary[], [data]);

  const [storedId, setStoredId] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  // Validate the stored id against the actual client list.
  const activeClient = useMemo(() => {
    if (clients.length === 0) return null;
    return clients.find((c) => c.id === storedId) ?? clients[0];
  }, [clients, storedId]);

  const activeClientId = activeClient?.id ?? null;

  useEffect(() => {
    if (activeClientId !== null) {
      localStorage.setItem(STORAGE_KEY, String(activeClientId));
    }
  }, [activeClientId]);

  const setActiveClientId = useCallback(
    (id: number) => {
      setStoredId(id);
      localStorage.setItem(STORAGE_KEY, String(id));
      // Everything in the app is client-scoped — drop the whole cache on switch.
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({ clients, activeClient, activeClientId, setActiveClientId, isLoading }),
    [clients, activeClient, activeClientId, setActiveClientId, isLoading],
  );

  return <ActiveClientContext.Provider value={value}>{children}</ActiveClientContext.Provider>;
}

export function useActiveClient() {
  const ctx = useContext(ActiveClientContext);
  if (!ctx) throw new Error("useActiveClient must be used within ActiveClientProvider");
  return ctx;
}

/**
 * Convenience for client-scoped queries:
 *   const { clientId, enabled } = useClientScope();
 *   trpc.posts.list.useQuery({ clientId, ... }, { enabled });
 */
export function useClientScope() {
  const { activeClientId } = useActiveClient();
  return { clientId: activeClientId ?? 0, enabled: activeClientId !== null };
}
