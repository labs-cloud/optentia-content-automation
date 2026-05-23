import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "../../shared/const";
import {
  createContentSchedule,
  deleteContentSchedule,
  getContentScheduleById,
  getContentSchedules,
  updateContentSchedule,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";

export const schedulesRouter = router({
  list: protectedProcedure.query(async () => {
    return getContentSchedules();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const schedule = await getContentScheduleById(input.id);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });
      return schedule;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      cron: z.string(),
      platforms: z.array(z.enum(["instagram", "linkedin", "facebook", "youtube"])),
      postsPerRun: z.number().default(1),
      contentPillars: z.array(z.string()).optional(),
      generationPrompt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";

      const schedule = await createContentSchedule({
        name: input.name,
        description: input.description,
        cron: input.cron,
        platforms: JSON.stringify(input.platforms),
        postsPerRun: input.postsPerRun,
        contentPillars: input.contentPillars ? JSON.stringify(input.contentPillars) : null,
        generationPrompt: input.generationPrompt,
        isActive: true,
      });

      if (!schedule) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      try {
        const job = await createHeartbeatJob({
          name: `content-gen-${schedule.id}`,
          cron: input.cron,
          path: "/api/scheduled/generate-content",
          payload: { scheduleId: schedule.id },
          description: `Content generation: ${input.name}`,
        }, sessionToken);

        await updateContentSchedule(schedule.id, { cronTaskUid: job.taskUid });
        return { ...schedule, cronTaskUid: job.taskUid };
      } catch (err) {
        // Schedule created in DB but cron registration failed — still return it
        console.error("[schedules] Failed to register heartbeat:", err);
        return schedule;
      }
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      cron: z.string().optional(),
      platforms: z.array(z.enum(["instagram", "linkedin", "facebook", "youtube"])).optional(),
      postsPerRun: z.number().optional(),
      contentPillars: z.array(z.string()).optional(),
      generationPrompt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, platforms, contentPillars, ...rest } = input;
      const schedule = await getContentScheduleById(id);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });

      const updated = await updateContentSchedule(id, {
        ...rest,
        platforms: platforms ? JSON.stringify(platforms) : undefined,
        contentPillars: contentPillars ? JSON.stringify(contentPillars) : undefined,
      });

      if (input.cron && schedule.cronTaskUid) {
        try {
          const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
          await updateHeartbeatJob(schedule.cronTaskUid, { cron: input.cron }, sessionToken);
        } catch (err) {
          console.error("[schedules] Failed to update heartbeat:", err);
        }
      }

      return updated;
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const schedule = await getContentScheduleById(input.id);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });

      await updateContentSchedule(input.id, { isActive: input.isActive });

      if (schedule.cronTaskUid) {
        try {
          const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
          await updateHeartbeatJob(schedule.cronTaskUid, { enable: input.isActive }, sessionToken);
        } catch (err) {
          console.error("[schedules] Failed to toggle heartbeat:", err);
        }
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const schedule = await getContentScheduleById(input.id);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });

      if (schedule.cronTaskUid) {
        try {
          const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
          await deleteHeartbeatJob(schedule.cronTaskUid, sessionToken);
        } catch (err) {
          console.error("[schedules] Failed to delete heartbeat:", err);
        }
      }

      await deleteContentSchedule(input.id);
      return { success: true };
    }),
});
