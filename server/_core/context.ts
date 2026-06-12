import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getAuth } from "@clerk/express";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  const { userId } = getAuth(opts.req);

  if (userId) {
    user = (await db.getUserByOpenId(userId)) ?? null;
    if (!user) {
      await db.upsertUser({ openId: userId, lastSignedIn: new Date() });
      user = (await db.getUserByOpenId(userId)) ?? null;
    } else {
      await db.upsertUser({ openId: userId, lastSignedIn: new Date() });
    }
  } else {
    // TEMPORARY dev-only auth bypass for validating the native app without a
    // Clerk session. Off unless DEV_AUTH_BYPASS_TOKEN is set AND the request
    // presents that exact token in the x-dev-bypass header. Resolves to the
    // owner account. REMOVE before shipping; never set the env on real prod.
    const bypassToken = process.env.DEV_AUTH_BYPASS_TOKEN;
    const provided = opts.req.headers["x-dev-bypass"];
    if (bypassToken && provided === bypassToken) {
      const ownerEmail = process.env.OWNER_EMAIL ?? "hershey@optentia.com";
      user = (await db.getUserByEmail(ownerEmail)) ?? null;
    }
  }

  return { req: opts.req, res: opts.res, user };
}
