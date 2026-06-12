import { httpBatchLink, type TRPCLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "./router-type";

export type BuildLinksOptions = {
  /**
   * Absolute origin the API lives at, with no trailing slash. On web this is ""
   * (same-origin, relative). On native it must be the deployed origin, e.g.
   * "https://app.optentia.com".
   */
  baseUrl: string;
  /**
   * Returns the current auth bearer token (Clerk session JWT) or null. On web,
   * return null to keep the cookie/session flow; on native, return Clerk Expo's
   * getToken() result so the server's getAuth() reads the Authorization header.
   */
  getToken?: () => Promise<string | null>;
};

/**
 * The single tRPC link config shared by web and native clients. Pass the result
 * to `trpc.createClient({ links: buildTRPCLinks(...) })`.
 */
export function buildTRPCLinks(opts: BuildLinksOptions): TRPCLink<AppRouter>[] {
  return [
    httpBatchLink({
      url: `${opts.baseUrl}/api/trpc`,
      transformer: superjson,
      async fetch(input, init) {
        const headers = new Headers(init?.headers as HeadersInit | undefined);
        const token = await opts.getToken?.();
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input as RequestInfo, {
          ...init,
          headers,
          // Web relies on the session cookie; native ignores this harmlessly.
          credentials: "include",
        });
      },
    }),
  ];
}
