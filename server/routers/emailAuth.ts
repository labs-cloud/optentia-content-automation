import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sql } from "drizzle-orm";
import { users } from "../../drizzle/schema";

export const emailAuthRouter = router({
  /**
   * Check if any users exist — used to show Register vs Login screen on first visit.
   */
  hasUsers: publicProcedure.query(async () => {
    const dbConn = await db.getDb();
    if (!dbConn) return false;
    const result = await dbConn
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .limit(1);
    return (result[0]?.count ?? 0) > 0;
  }),

  /**
   * Register a new user with email + password.
   * Only works if no user with that email exists yet.
   */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const openId = `email_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // First registered user becomes admin
      const dbConn = await db.getDb();
      const countResult = dbConn
        ? await dbConn.select({ count: sql<number>`count(*)` }).from(users).limit(1)
        : [{ count: 0 }];
      const isFirstUser = (countResult[0]?.count ?? 0) === 0;

      const user = await db.createUserWithPassword({
        openId,
        name: input.name,
        email: input.email,
        passwordHash,
        role: isFirstUser ? "admin" : "user",
      });

      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });

      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),

  /**
   * Sign in with email + password.
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),
});
