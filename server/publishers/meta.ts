/**
 * Meta Graph API Publisher
 * Handles posting to both Instagram Business and Facebook Pages.
 *
 * Instagram requires an image URL — text-only posts are not supported via the API.
 * Facebook supports text-only posts but performs better with images.
 *
 * Docs:
 *   Instagram: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 *   Facebook:  https://developers.facebook.com/docs/pages/publishing
 */

export interface MetaPublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

// ─── Instagram ────────────────────────────────────────────────────────────────

export async function publishToInstagram(params: {
  accessToken: string;
  accountId: string;       // Instagram Business Account ID
  caption: string;
  imageUrl?: string;       // Required for feed posts
  isReel?: boolean;
  videoUrl?: string;
}): Promise<MetaPublishResult> {
  const { accessToken, accountId, caption, imageUrl, isReel, videoUrl } = params;
  const baseUrl = "https://graph.facebook.com/v19.0";

  try {
    // Step 1: Create a media container
    const containerBody: Record<string, string> = {
      caption,
      access_token: accessToken,
    };

    if (isReel && videoUrl) {
      containerBody.media_type = "REELS";
      containerBody.video_url = videoUrl;
    } else if (imageUrl) {
      containerBody.image_url = imageUrl;
    } else {
      return {
        success: false,
        error: "Instagram requires an image_url or video_url. Text-only posts are not supported via the API.",
      };
    }

    const containerRes = await fetch(`${baseUrl}/${accountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });

    const containerData = await containerRes.json() as { id?: string; error?: { message: string } };

    if (!containerRes.ok || !containerData.id) {
      return {
        success: false,
        error: containerData.error?.message ?? `Container creation failed (${containerRes.status})`,
      };
    }

// Brief wait so Instagram has time to download the image before we publish.
      // (Polling status_code returns Authorization Error on some token types, so we skip it.)
      await new Promise((r) => setTimeout(r, 4000));

// Step 2: Publish the container — retry if IG still needs more time for the image.
      let publishData: { id?: string; error?: { message: string } } = {};
      let publishRes: Response | null = null;
      const publishMaxAttempts = 6;
      const publishDelayMs = 5000;
      for (let attempt = 0; attempt < publishMaxAttempts; attempt++) {
        publishRes = await fetch(`${baseUrl}/${accountId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: accessToken,
          }),
        });
        publishData = (await publishRes.json()) as { id?: string; error?: { message: string } };
        if (publishRes.ok && publishData.id) break;
        const errMsg = publishData.error?.message ?? "";
        const retryable = errMsg.indexOf("Media ID is not available") >= 0;
        if (!retryable || attempt === publishMaxAttempts - 1) break;
        await new Promise((r) => setTimeout(r, publishDelayMs));
      }

      if (!publishRes || !publishRes.ok || !publishData.id) {
        return {
          success: false,
          error: publishData.error?.message ?? `Publish failed (${publishRes?.status ?? "no response"})`,
        };
      }

      return { success: true, externalPostId: publishData.id };
      } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── Facebook Page ────────────────────────────────────────────────────────────

export async function publishToFacebook(params: {
  accessToken: string;
  pageId: string;
  message: string;
  imageUrl?: string;
  link?: string;
}): Promise<MetaPublishResult> {
  const { accessToken, pageId, message, imageUrl, link } = params;
  const baseUrl = "https://graph.facebook.com/v19.0";

  try {
    let endpoint: string;
    const body: Record<string, string> = {
      access_token: accessToken,
    };

    if (imageUrl) {
      // Post with photo
      endpoint = `${baseUrl}/${pageId}/photos`;
      body.caption = message;
      body.url = imageUrl;
    } else {
      // Text-only post (or with link)
      endpoint = `${baseUrl}/${pageId}/feed`;
      body.message = message;
      if (link) body.link = link;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json() as { id?: string; post_id?: string; error?: { message: string } };

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message ?? `Facebook post failed (${res.status})`,
      };
    }

    const postId = data.post_id ?? data.id;
    return { success: true, externalPostId: postId };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
