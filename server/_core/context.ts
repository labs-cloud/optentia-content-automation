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
  } else if (process.env.DEV_AUTH_BYPASS === "1") {
    // TEMPORARY dev-only auth bypass: when DEV_AUTH_BYPASS=1 is set on the
    // deployment, unauthenticated requests resolve to the owner account so the
    // native app can load data without a login. Only ever set this on a
    // throwaway preview deployment; REMOVE before any real release.
    const ownerEmail = process.env.OWNER_EMAIL ?? "hershey@optentia.com";
    user = (await db.getUserByEmail(ownerEmail)) ?? null;
  }

  return { req: opts.req, res: opts.res, user };
}
