import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { parseExpression } = require("cron-parser") as typeof import("cron-parser");
import {
  createContentSchedule,
  deleteContentSchedule,
  getContentScheduleById,
  getContentSchedules,
  updateContentSchedule,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

function computeNextRunAt(cronExpr: string): Date {
  return parseExpression(cronExpr, { utc: true }).next().toDate();
}

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
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        cron: z.string(),
        platforms: z.array(
          z.enum([
            "instagram",
            "linkedin",
            "linkedin_personal",
            "linkedin_company",
            "facebook",
            "youtube",
          ])
        ),
        postsPerRun: z.number().default(1),
        contentPillars: z.array(z.string()).optional(),
        generationPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let nextRunAt: Date | undefined;
      try {
        nextRunAt = computeNextRunAt(input.cron);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid cron expression" });
      }

      const schedule = await createContentSchedule({
        name: input.name,
        description: input.description,
        cron: input.cron,
        platforms: JSON.stringify(input.platforms),
        postsPerRun: input.postsPerRun,
        contentPillars: input.contentPillars ? JSON.stringify(input.contentPillars) : null,
        generationPrompt: input.generationPrompt,
        isActive: true,
        nextRunAt,
      });

      if (!schedule) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return schedule;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        cron: z.string().optional(),
        platforms: z
          .array(
            z.enum([
              "instagram",
              "linkedin",
              "linkedin_personal",
              "linkedin_company",
              "facebook",
              "youtube",
            ])
          )
          .optional(),
        postsPerRun: z.number().optional(),
        contentPillars: z.array(z.string()).optional(),
        generationPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, platforms, contentPillars, cron, ...rest } = input;
      const schedule = await getContentScheduleById(id);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });

      let nextRunAt: Date | undefined;
      if (cron) {
        try {
          nextRunAt = computeNextRunAt(cron);
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid cron expression" });
        }
      }

      return updateContentSchedule(id, {
        ...rest,
        ...(cron ? { cron, nextRunAt } : {}),
        platforms: platforms ? JSON.stringify(platforms) : undefined,
        contentPillars: contentPillars ? JSON.stringify(contentPillars) : undefined,
      });
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const schedule = await getContentScheduleById(input.id);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });
      await updateContentSchedule(input.id, { isActive: input.isActive });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const schedule = await getContentScheduleById(input.id);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteContentSchedule(input.id);
      return { success: true };
    }),
});
