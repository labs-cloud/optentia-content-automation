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
  }

  return { req: opts.req, res: opts.res, user };
}
