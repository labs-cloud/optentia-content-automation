import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Client } from "../../drizzle/schema";
import { getClientById } from "../db";
import type { TrpcContext } from "./context";

/** Zod shape for client-scoped procedure inputs. `.extend(clientScoped.shape)` or merge. */
export const clientScoped = z.object({ clientId: z.number() });

/**
 * Loads the client and verifies the calling user may act on it.
 * Every client-scoped procedure should call this before touching data.
 */
export async function assertClientAccess(
  ctx: { user: NonNullable<TrpcContext["user"]> },
  clientId: number,
): Promise<Client> {
  const client = await getClientById(clientId);
  if (!client) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Client ${clientId} not found` });
  }
  if (client.userId !== ctx.user.id && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this client" });
  }
  return client;
}
