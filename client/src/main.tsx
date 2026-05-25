import { ClerkProvider } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!publishableKey) {
  createRoot(document.getElementById("root")!).render(
    <div style={{ fontFamily: "monospace", padding: "2rem", color: "#f87171" }}>
      <h2>Configuration Error</h2>
      <p>
        <strong>VITE_CLERK_PUBLISHABLE_KEY</strong> is not set.
      </p>
      <p>
        Add it to your Vercel project under{" "}
        <em>Settings → Environment Variables</em>.
      </p>
    </div>
  );
} else {
  const queryClient = new QueryClient();

  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    ],
  });

  createRoot(document.getElementById("root")!).render(
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </ClerkProvider>
  );
}
