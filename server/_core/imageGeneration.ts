import OpenAI from "openai";
import { storagePut } from "../storage";
import { ENV } from "./env";

const openai = new OpenAI({ apiKey: ENV.openaiApiKey });

export type DalleSize = "1024x1024" | "1792x1024" | "1024x1792";

export type GenerateImageOptions = {
  prompt: string;
  /** DALL-E 3 size. Defaults to "1024x1024" (square). */
  size?: DalleSize;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const size = options.size ?? "1024x1024";
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: options.prompt,
    n: 1,
    size,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("DALL-E 3 returned no image data");

  const buffer = Buffer.from(b64, "base64");
  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
  return { url };
}
