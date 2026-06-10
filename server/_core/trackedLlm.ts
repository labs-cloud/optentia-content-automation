import { invokeLLM, type InvokeParams, type InvokeResult } from "./llm";
import { createModelRun } from "../db";

export type ModelRunTracking = {
  clientId?: number | null;
  userId?: number | null;
  /** e.g. "generate_post", "brand_profile", "brainstorm", "campaign_plan", "weekly_report" */
  taskType: string;
  /** Short human-readable note about the request (topic, platform, …). */
  summary?: string;
};

// Anthropic Sonnet pricing in micro-dollars per token ($3 / $15 per million).
const INPUT_COST_MICROS_PER_TOKEN = 3;
const OUTPUT_COST_MICROS_PER_TOKEN = 15;

/**
 * invokeLLM with cost/latency tracking persisted to model_runs.
 * Tracking is best-effort and must never break generation.
 */
export async function trackedInvokeLLM(
  params: InvokeParams,
  tracking: ModelRunTracking,
): Promise<InvokeResult> {
  const start = Date.now();
  try {
    const result = await invokeLLM(params);
    const inputTokens = result.usage?.prompt_tokens ?? null;
    const outputTokens = result.usage?.completion_tokens ?? null;
    const estimatedCostMicros =
      inputTokens !== null && outputTokens !== null
        ? inputTokens * INPUT_COST_MICROS_PER_TOKEN + outputTokens * OUTPUT_COST_MICROS_PER_TOKEN
        : null;
    try {
      await createModelRun({
        clientId: tracking.clientId ?? null,
        userId: tracking.userId ?? null,
        taskType: tracking.taskType,
        provider: "anthropic",
        model: result.model,
        inputTokens,
        outputTokens,
        estimatedCostMicros,
        latencyMs: Date.now() - start,
        status: "success",
        requestSummary: tracking.summary,
      });
    } catch (trackErr) {
      console.warn("[trackedLlm] Failed to record model run:", trackErr);
    }
    return result;
  } catch (err) {
    try {
      await createModelRun({
        clientId: tracking.clientId ?? null,
        userId: tracking.userId ?? null,
        taskType: tracking.taskType,
        provider: "anthropic",
        latencyMs: Date.now() - start,
        status: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
        requestSummary: tracking.summary,
      });
    } catch (trackErr) {
      console.warn("[trackedLlm] Failed to record model run failure:", trackErr);
    }
    throw err;
  }
}
