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
  const requestedSize = options.size ?? "1024x1024";
  // gpt-image-1 supports: 1024x1024, 1024x1536 (portrait), 1536x1024 (landscape)
  const sizeMap: Record<string, "1024x1024" | "1024x1536" | "1536x1024"> = {
    "1024x1024": "1024x1024",
    "1792x1024": "1536x1024",
    "1024x1792": "1024x1536",
  };
  const size = sizeMap[requestedSize] ?? "1024x1024";
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: options.prompt,
    n: 1,
    size,
  });

  const item = response.data?.[0];
  if (!item) throw new Error("DALL-E 3 returned no image data");

  let buffer: Buffer;
  if (item.b64_json) {
    buffer = Buffer.from(item.b64_json, "base64");
  } else if (item.url) {
    const imgResponse = await fetch(item.url);
    if (!imgResponse.ok) throw new Error(`Failed to download generated image from OpenAI (${imgResponse.status})`);
    buffer = Buffer.from(await imgResponse.arrayBuffer());
  } else {
    throw new Error("DALL-E 3 returned neither b64_json nor url");
  }

    const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
  return { url };
}
