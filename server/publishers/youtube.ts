/**
 * YouTube Data API v3 Publisher
 * Creates YouTube community posts (text + optional image) and video descriptions.
 *
 * For community posts (text/image): requires channel with 500+ subscribers.
 * For video uploads: requires a video file URL.
 *
 * Scopes required: https://www.googleapis.com/auth/youtube
 *
 * Docs: https://developers.google.com/youtube/v3/docs/communityPosts/insert
 */

export interface YouTubePublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

/**
 * Refresh an expired OAuth access token using the refresh token.
 */
async function refreshAccessToken(params: {
  refreshToken: string;
  clientId?: string;
  clientSecret?: string;
}): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
        client_id: params.clientId ?? process.env.YOUTUBE_CLIENT_ID ?? "",
        client_secret: params.clientSecret ?? process.env.YOUTUBE_CLIENT_SECRET ?? "",
      }),
    });
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Post a YouTube Community Post (text + optional image).
 * Community posts appear on the channel's Community tab.
 */
export async function publishYouTubeCommunityPost(params: {
  accessToken: string;
  refreshToken?: string;
  text: string;
  hashtags?: string;
  imageUrl?: string;
}): Promise<YouTubePublishResult> {
  const { refreshToken, text, hashtags, imageUrl } = params;
  let accessToken = params.accessToken;

  const fullText = hashtags ? `${text}\n\n${hashtags}` : text;

  const tryPost = async (token: string): Promise<Response> => {
    const body: Record<string, unknown> = {
      snippet: {
        type: "textOriginal",
        textOriginal: {
          text: fullText,
        },
      },
    };

    if (imageUrl) {
      body.snippet = {
        type: "imageOriginal",
        imageOriginal: {
          text: fullText,
          imageUrl,
        },
      };
    }

    return fetch(
      "https://www.googleapis.com/youtube/v3/communityPosts?part=snippet",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
  };

  try {
    let res = await tryPost(accessToken);

    // If 401, try refreshing the token once
    if (res.status === 401 && refreshToken) {
      const newToken = await refreshAccessToken({ refreshToken });
      if (newToken) {
        accessToken = newToken;
        res = await tryPost(accessToken);
      }
    }

    if (!res.ok) {
      const errData = await res.json() as { error?: { message?: string } };
      return {
        success: false,
        error: errData.error?.message ?? `YouTube post failed (${res.status})`,
      };
    }

    const data = await res.json() as { id?: string };
    return { success: true, externalPostId: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Update an existing YouTube video's title, description, and tags.
 * Useful for publishing video metadata after a HeyGen video is completed.
 */
export async function updateYouTubeVideoMetadata(params: {
  accessToken: string;
  videoId: string;
  title: string;
  description: string;
  tags?: string[];
}): Promise<YouTubePublishResult> {
  const { accessToken, videoId, title, description, tags } = params;

  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/videos?part=snippet",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: videoId,
          snippet: {
            title,
            description,
            tags: tags ?? [],
            categoryId: "22", // People & Blogs
          },
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json() as { error?: { message?: string } };
      return {
        success: false,
        error: errData.error?.message ?? `YouTube metadata update failed (${res.status})`,
      };
    }

    return { success: true, externalPostId: videoId };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
