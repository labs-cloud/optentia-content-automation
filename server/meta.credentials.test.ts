import { describe, expect, it } from "vitest";

/**
 * Validates that the Meta API credentials are set and the Page token
 * can reach the Graph API. This test makes a real network call to
 * https://graph.facebook.com to verify the token is valid.
 */
describe("Meta API credentials", () => {
  it("should have META_PAGE_TOKEN set in environment", () => {
    expect(process.env.META_PAGE_TOKEN).toBeTruthy();
    expect(process.env.META_PAGE_TOKEN!.length).toBeGreaterThan(50);
  });

  it("should have META_PAGE_ID set in environment", () => {
    expect(process.env.META_PAGE_ID).toBeTruthy();
    expect(process.env.META_PAGE_ID).toBe("1036429012895430");
  });

  it("should have META_INSTAGRAM_ACCOUNT_ID set in environment", () => {
    expect(process.env.META_INSTAGRAM_ACCOUNT_ID).toBeTruthy();
    expect(process.env.META_INSTAGRAM_ACCOUNT_ID).toBe("17841477854262862");
  });

  it("should have META_APP_ID and META_APP_SECRET set", () => {
    expect(process.env.META_APP_ID).toBeTruthy();
    expect(process.env.META_APP_SECRET).toBeTruthy();
  });

  it("should be able to reach the Meta Graph API with the page token", async () => {
    const token = process.env.META_PAGE_TOKEN;
    const pageId = process.env.META_PAGE_ID;

    if (!token || !pageId) {
      console.warn("Skipping live API test — credentials not set");
      return;
    }

    const url = `https://graph.facebook.com/v19.0/${pageId}?fields=id,name&access_token=${token}`;
    const res = await fetch(url);
    const data = (await res.json()) as { id?: string; name?: string; error?: { message: string } };

    if (data.error) {
      throw new Error(`Meta API error: ${data.error.message}`);
    }

    expect(data.id).toBe(pageId);
    expect(data.name).toBeTruthy();
    console.log(`✓ Connected to Facebook Page: "${data.name}" (${data.id})`);
  }, 15000);

  it("should confirm Instagram Business Account is accessible", async () => {
    const token = process.env.META_PAGE_TOKEN;
    const igId = process.env.META_INSTAGRAM_ACCOUNT_ID;

    if (!token || !igId) {
      console.warn("Skipping live API test — credentials not set");
      return;
    }

    const url = `https://graph.facebook.com/v19.0/${igId}?fields=id,username&access_token=${token}`;
    const res = await fetch(url);
    const data = (await res.json()) as { id?: string; username?: string; error?: { message: string } };

    if (data.error) {
      throw new Error(`Meta API error: ${data.error.message}`);
    }

    expect(data.id).toBe(igId);
    console.log(`✓ Connected to Instagram account: "@${data.username}" (${data.id})`);
  }, 15000);
});
