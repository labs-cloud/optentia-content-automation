import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { postsRouter } from "./routers/posts";
import { platformsRouter } from "./routers/platforms";
import { analyticsRouter } from "./routers/analytics";
import { schedulesRouter } from "./routers/schedules";
import { mediaRouter } from "./routers/media";
import { heygenRouter } from "./routers/heygen";
import { emailAuthRouter } from "./routers/emailAuth";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  posts: postsRouter,
  platforms: platformsRouter,
  analytics: analyticsRouter,
  schedules: schedulesRouter,
  media: mediaRouter,
  heygen: heygenRouter,
  emailAuth: emailAuthRouter,
});

export type AppRouter = typeof appRouter;
