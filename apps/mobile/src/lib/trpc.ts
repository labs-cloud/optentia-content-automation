import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@optentia/core";

/** Typed tRPC hooks for the native app — same AppRouter contract as the web. */
export const trpc = createTRPCReact<AppRouter>();
