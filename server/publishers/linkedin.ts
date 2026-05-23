/**
 * LinkedIn Share API Publisher
 * Posts text and image content to a LinkedIn organization page.
 *
 * Requires:
 *   - OAuth 2.0 access token with w_member_social or w_organization_social scope
 *   - Organization URN: "urn:li:organization:XXXXXXXX"
 *
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
 */

export interface LinkedInPublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

async function uploadImageToLinkedIn(params: {
  accessToken: string;
  authorUrn: string;
  imageUrl: string;
}): Promise<string | null> {
  const { accessToken, authorUrn, imageUrl } = params;

  try {
    // Step 1: Register the image upload
    const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    });

    const registerData = await registerRes.json() as {
      value?: {
        asset: string;
        uploadMechanism?: {
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
            uploadUrl: string;
          };
        };
      };
    };

    const uploadUrl = registerData.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;
    const assetUrn = registerData.value?.asset;

    if (!uploadUrl || !assetUrn) return null;

    // Step 2: Fetch the image and upload it to LinkedIn
    const imageRes = await fetch(imageUrl);
    const imageBuffer = await imageRes.arrayBuffer();

    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: imageBuffer,
    });

    return assetUrn;
  } catch {
    return null;
  }
}

export async function publishToLinkedIn(params: {
  accessToken: string;
  authorUrn: string;   // "urn:li:organization:XXXXXXXX" or "urn:li:person:XXXXXXXX"
  text: string;
  hashtags?: string;
  imageUrl?: string;
}): Promise<LinkedInPublishResult> {
  const { accessToken, authorUrn, text, hashtags, imageUrl } = params;

  try {
    // Combine text and hashtags
    const fullText = hashtags ? `${text}\n\n${hashtags}` : text;

    // Build the UGC post body
    const postBody: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: fullText,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    // If image provided, try to upload it
    if (imageUrl) {
      const assetUrn = await uploadImageToLinkedIn({ accessToken, authorUrn, imageUrl });
      if (assetUrn) {
        (postBody.specificContent as Record<string, unknown>)["com.linkedin.ugc.ShareContent"] = {
          shareCommentary: { text: fullText },
          shareMediaCategory: "IMAGE",
          media: [
            {
              status: "READY",
              media: assetUrn,
            },
          ],
        };
      }
    }

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!res.ok) {
      const errData = await res.json() as { message?: string };
      return {
        success: false,
        error: errData.message ?? `LinkedIn post failed (${res.status})`,
      };
    }

    // LinkedIn returns the post URN in the X-RestLi-Id header
    const postId = res.headers.get("x-restli-id") ?? res.headers.get("X-RestLi-Id");
    return { success: true, externalPostId: postId ?? undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
