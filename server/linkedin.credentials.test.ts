import { describe, it, expect } from "vitest";

/**
 * LinkedIn Credentials Validation Tests
 *
 * Validates that the LinkedIn access token and URNs are correctly configured.
 * Token has scopes: openid, profile, w_member_social, email
 * Person URN: urn:li:person:sjUMosKpaE (Hershey Klein)
 * Org URN: urn:li:organization:110145143 (Optentia)
 */
describe("LinkedIn Credentials", () => {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;
  const orgUrn = process.env.LINKEDIN_ORG_URN;

  it("should have LINKEDIN_ACCESS_TOKEN set", () => {
    expect(token).toBeTruthy();
    expect(token!.length).toBeGreaterThan(50);
  });

  it("should have LINKEDIN_PERSON_URN set correctly", () => {
    expect(personUrn).toBeTruthy();
    expect(personUrn).toMatch(/^urn:li:person:[A-Za-z0-9_-]+$/);
  });

  it("should have LINKEDIN_ORG_URN set correctly", () => {
    expect(orgUrn).toBeTruthy();
    expect(orgUrn).toMatch(/^urn:li:organization:\d+$/);
    expect(orgUrn).toBe("urn:li:organization:110145143");
  });

  it("should be able to call LinkedIn userinfo API with the token", async () => {
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": "202401",
      },
    });
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      sub: string;
      name: string;
      email: string;
    };
    expect(data.sub).toBe("sjUMosKpaE");
    expect(data.name).toBe("Hershey Klein");
    expect(data.email).toBe("hershey@optentia.com");
  });

  it("should have person URN matching the token sub", () => {
    const sub = "sjUMosKpaE";
    expect(personUrn).toBe(`urn:li:person:${sub}`);
  });
});
