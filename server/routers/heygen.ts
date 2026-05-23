import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createHeygenRequest,
  getHeygenRequestById,
  getHeygenRequests,
  updateHeygenRequest,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

// HeyGen API integration — uses the configured API key from platform settings
async function callHeyGenAPI(apiKey: string, endpoint: string, body: unknown) {
  const res = await fetch(`https://api.heygen.com/v2/${endpoint}`, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HeyGen API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function getHeyGenVideoStatus(apiKey: string, videoId: string) {
  const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    headers: { "X-Api-Key": apiKey },
  });
  if (!res.ok) throw new Error(`HeyGen status error ${res.status}`);
  return res.json();
}

export const heygenRouter = router({
  list: protectedProcedure.query(async () => {
    return getHeygenRequests();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const req = await getHeygenRequestById(input.id);
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      return req;
    }),

  createRequest: protectedProcedure
    .input(z.object({
      title: z.string(),
      scriptText: z.string(),
      avatarId: z.string().optional(),
      voiceId: z.string().optional(),
      linkedPostId: z.number().optional(),
      apiKey: z.string().optional(), // Override — otherwise uses stored platform key
    }))
    .mutation(async ({ input }) => {
      const { apiKey, ...data } = input;

      const request = await createHeygenRequest({
        title: data.title,
        scriptText: data.scriptText,
        avatarId: data.avatarId,
        voiceId: data.voiceId,
        linkedPostId: data.linkedPostId,
        status: "pending",
      });

      if (!request) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // If API key provided, attempt to submit to HeyGen immediately
      if (apiKey) {
        try {
          const heygenPayload = {
            video_inputs: [{
              character: {
                type: "avatar",
                avatar_id: data.avatarId || "default",
                avatar_style: "normal",
              },
              voice: {
                type: "text",
                input_text: data.scriptText,
                voice_id: data.voiceId || "default",
              },
            }],
            dimension: { width: 1280, height: 720 },
            aspect_ratio: "16:9",
          };

          const result = await callHeyGenAPI(apiKey, "video/generate", heygenPayload);
          const videoId = result?.data?.video_id;

          if (videoId) {
            await updateHeygenRequest(request.id, {
              videoId,
              status: "processing",
            });
            return { ...request, videoId, status: "processing" };
          }
        } catch (err) {
          console.error("[heygen] API call failed:", err);
          await updateHeygenRequest(request.id, {
            status: "failed",
            errorMessage: String(err),
          });
        }
      }

      return request;
    }),

  checkStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      apiKey: z.string(),
    }))
    .mutation(async ({ input }) => {
      const request = await getHeygenRequestById(input.id);
      if (!request) throw new TRPCError({ code: "NOT_FOUND" });
      if (!request.videoId) {
        return { ...request, message: "No video ID — request not yet submitted to HeyGen." };
      }

      try {
        const statusData = await getHeyGenVideoStatus(input.apiKey, request.videoId);
        const status = statusData?.data?.status;
        const videoUrl = statusData?.data?.video_url;
        const thumbnailUrl = statusData?.data?.thumbnail_url;
        const duration = statusData?.data?.duration;

        const mappedStatus =
          status === "completed" ? "completed" :
          status === "failed" ? "failed" :
          "processing";

        const updated = await updateHeygenRequest(request.id, {
          status: mappedStatus,
          videoUrl: videoUrl || null,
          thumbnailUrl: thumbnailUrl || null,
          durationSeconds: duration ? Math.round(duration) : null,
        });

        return updated;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to check HeyGen status: ${String(err)}`,
        });
      }
    }),

  updateRequest: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      scriptText: z.string().optional(),
      avatarId: z.string().optional(),
      voiceId: z.string().optional(),
      linkedPostId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateHeygenRequest(id, data);
    }),
});
