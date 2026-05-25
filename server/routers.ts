import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { postsRouter } from "./routers/posts";
import { platformsRouter } from "./routers/platforms";
import { analyticsRouter } from "./routers/analytics";
import { schedulesRouter } from "./routers/schedules";
import { mediaRouter } from "./routers/media";
import { heygenRouter } from "./routers/heygen";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  posts: postsRouter,
  platforms: platformsRouter,
  analytics: analyticsRouter,
  schedules: schedulesRouter,
  media: mediaRouter,
  heygen: heygenRouter,
});

export type AppRouter = typeof appRouter;
