/**
 * Idempotent seed + backfill.
 *
 * 1. Ensures the "Optentia" client exists and assigns all legacy
 *    (pre-multi-client) rows to it.
 * 2. Ensures Optentia's Brand Operating Profile (lifted from the previously
 *    hardcoded prompts, so generation keeps the same voice).
 * 3. Ensures a demo marketing client with profile, campaign, brainstorm ideas
 *    and sample posts so the app demos well with two clients.
 *
 * Run with: pnpm seed   (requires DATABASE_URL)
 */
import {
  backfillClientId,
  createBrainstormIdeas,
  createCampaign,
  createClient,
  createContentPost,
  getBrainstormIdeas,
  getBrandProfileByClientId,
  getCampaigns,
  getClientByName,
  getContentPosts,
  getDb,
  upsertBrandProfile,
} from "../server/db";
import { users } from "../drizzle/schema";

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "hershey@optentia.com";

async function resolveOwnerUserId(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL not set or database unreachable");
  const all = await db.select().from(users).limit(50);
  const byEmail = all.find((u) => u.email === OWNER_EMAIL);
  const admin = all.find((u) => u.role === "admin");
  // Fall back to 1: on a fresh DB the first user to sign in gets id 1.
  return byEmail?.id ?? admin?.id ?? all[0]?.id ?? 1;
}

async function ensureOptentia(userId: number) {
  let client = await getClientByName("Optentia");
  if (!client) {
    client = await createClient({
      userId,
      name: "Optentia",
      websiteUrl: "https://optentia.com",
      industry: "AI systems & automation",
      description: "An AI systems and automation operator for businesses. Not just an AI tool provider.",
      primaryOffer: "Done-for-you AI systems and automation implementation for business operations.",
      audience: "Business owners who want to implement AI.",
      status: "active",
    });
    console.log(`[seed] Created client "Optentia" (id ${client?.id})`);
  } else {
    console.log(`[seed] Client "Optentia" exists (id ${client.id})`);
  }
  if (!client) throw new Error("Failed to create Optentia client");

  const profile = await getBrandProfileByClientId(client.id);
  if (!profile) {
    await upsertBrandProfile(client.id, {
      voice: "Will Hershey, founder of Optentia, is the face of the brand. First person, direct and confident, never corporate. Strategic, calm, intelligent.",
      tone: "Direct, intelligent, no hype, no buzzwords. Conversational but authoritative.",
      audience: "Business owners who want to implement AI — operators who care about systems, efficiency and outcomes, not tech for its own sake.",
      buyerPains: "Drowning in manual work; teams duct-taping tools together; hearing about AI everywhere but not knowing what actually works; wasted spend on AI tools that don't connect to operations.",
      offers: "AI systems and automation implementation as an operator — done-for-you systems that remove operational bottlenecks.",
      proofPoints: "Operating an AI automation business day-to-day; real systems shipped for real businesses; before/after workflow results.",
      competitors: "Generic AI tool resellers, prompt-tip influencers, big-agency digital transformation consultants.",
      visualStyle: "High-contrast composition, dark or gradient background, one strong vibrant accent color (electric teal, hot pink, or vivid cyan), oversized bold typography filling 50-70% of the frame. Stop-the-scroll quote-graphic style. No people, no faces, no logos.",
      ctaStyle: "Specific and low-friction: \"DM me 'SYSTEM'\", \"Link in bio\", direct questions that invite replies from business owners.",
      forbiddenPhrases: "game-changer, revolutionize, unleash, supercharge, 10x your business, in today's fast-paced world, harness the power of AI",
      brandSummary: "Optentia is an AI systems and automation operator for businesses — not an AI tool provider. Will Hershey builds and runs the systems that remove operational bottlenecks, and writes about it with strategic, direct, no-hype intelligence.",
      approvedExamples: [],
      rejectedExamples: [],
    });
    console.log("[seed] Created Optentia brand profile");
  }

  await backfillClientId(client.id);
  console.log("[seed] Backfilled legacy rows to Optentia");
  return client;
}

async function ensureDemoClient(userId: number) {
  const name = "Horizon Fitness Studio";
  let client = await getClientByName(name);
  if (!client) {
    client = await createClient({
      userId,
      name,
      websiteUrl: "https://horizonfitness.example.com",
      industry: "Boutique fitness & coaching",
      description: "A boutique fitness studio offering small-group strength training and 1:1 coaching for busy professionals.",
      primaryOffer: "12-week Strong Foundations program — 3 coached sessions per week plus nutrition guidance.",
      audience: "Busy professionals aged 30-50 who want to get strong and healthy without living in the gym.",
      status: "active",
    });
    console.log(`[seed] Created demo client "${name}" (id ${client?.id})`);
  } else {
    console.log(`[seed] Demo client "${name}" exists (id ${client.id})`);
  }
  if (!client) throw new Error("Failed to create demo client");

  const profile = await getBrandProfileByClientId(client.id);
  if (!profile) {
    await upsertBrandProfile(client.id, {
      voice: "Encouraging coach who tells the truth. Speaks like a trainer who has seen every excuse and still believes in you.",
      tone: "Warm, direct, motivating without being shouty. Zero fitness-bro energy.",
      audience: "Busy professionals 30-50, mostly desk workers, short on time, skeptical of gym culture, motivated by energy and longevity more than aesthetics.",
      buyerPains: "No time to train; intimidated by gyms; past programs that didn't stick; nagging aches from desk work; confused by contradictory fitness advice.",
      offers: "12-week Strong Foundations program (small-group strength training, 3x/week, nutrition guidance); 1:1 coaching for executives.",
      proofPoints: "Members training consistently for 2+ years; before/after strength numbers (not just photos); waitlist for evening slots.",
      competitors: "Big-box gyms, fitness apps, bootcamp franchises.",
      visualStyle: "Clean, warm, real photography of real members; deep green and off-white palette; bold friendly type; no stock fitness clichés.",
      ctaStyle: "Low-pressure invitations: \"Book a free intro session\", \"Reply 'STRONG' and we'll send the details\".",
      forbiddenPhrases: "no pain no gain, beach body, shred, crush it, beast mode, summer body",
      brandSummary: "Horizon Fitness Studio gets busy professionals strong with small-group coaching that fits real lives. Honest coaching, measurable strength, zero gym-bro nonsense.",
      approvedExamples: [],
      rejectedExamples: [],
    });
    console.log("[seed] Created demo brand profile");
  }

  const existingCampaigns = await getCampaigns(client.id);
  if (existingCampaigns.length === 0) {
    const start = new Date();
    await createCampaign({
      clientId: client.id,
      name: "New Year, Real Strength",
      goal: "leads",
      thesis: "Resolutions fail because they're built on intensity, not systems. Horizon sells the system: three coached sessions a week that fit a working life — and that's why our members are still training in March.",
      offer: "Free intro session for the 12-week Strong Foundations program.",
      brief: "Drive intro-session bookings from local busy professionals.",
      platforms: ["instagram", "facebook", "email"],
      durationDays: 14,
      status: "active",
      startDate: start,
      endDate: new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000),
    });
    console.log("[seed] Created demo campaign");
  }

  const existingIdeas = await getBrainstormIdeas(client.id, { limit: 1 });
  if (existingIdeas.length === 0) {
    await createBrainstormIdeas([
      {
        clientId: client.id,
        type: "post_hook",
        title: "The 3-hour week that outperforms the 6-day grind",
        hook: "You don't need 6 gym days. You need 3 coached hours.",
        description: "Contrast post: consistency with 3 coached sessions beats unsustainable 6-day programs. End with intro-session CTA.",
        platform: "instagram",
        contentPillar: "strong_opinion",
        visualConcept: "Split graphic: cluttered 6-day plan crossed out vs. clean 3-session week.",
        cta: "Book a free intro session",
        status: "proposed",
        source: "seed",
      },
      {
        clientId: client.id,
        type: "reel_idea",
        title: "Desk-to-deadlift in 90 seconds",
        hook: "Your back doesn't hurt because you're old. It hurts because you sit 9 hours a day.",
        description: "Reel: coach demos 3 mobility moves for desk workers, then shows the same member deadlifting pain-free.",
        platform: "instagram",
        contentPillar: "practical_education",
        visualConcept: "Fast cuts, real members, timestamp overlays.",
        cta: "Reply 'STRONG' for the full routine",
        status: "proposed",
        source: "seed",
      },
      {
        clientId: client.id,
        type: "email_angle",
        title: "Why our members are still here in March",
        hook: "Gyms count on you quitting. We count on you staying.",
        description: "Email: the economics of churn-based gyms vs. coaching, with member consistency stats and a soft intro-session CTA.",
        platform: "email",
        contentPillar: "documentary",
        visualConcept: "Simple header banner with member photo.",
        cta: "Book a free intro session",
        status: "proposed",
        source: "seed",
      },
      {
        clientId: client.id,
        type: "offer_angle",
        title: "Strong Foundations: the 12-week on-ramp",
        hook: "12 weeks. 3 sessions a week. A program built for people with jobs.",
        description: "Direct offer post laying out exactly what the program includes and who it's for.",
        platform: "facebook",
        contentPillar: "direct_promotion",
        visualConcept: "Clean program card with deep green palette.",
        cta: "Book a free intro session",
        status: "proposed",
        source: "seed",
      },
      {
        clientId: client.id,
        type: "carousel_idea",
        title: "5 lies the fitness industry tells busy people",
        hook: "You've been lied to about what it takes to get strong.",
        description: "Carousel debunking 5 myths (more days = better, soreness = progress, etc.), final slide is the Horizon approach.",
        platform: "instagram",
        contentPillar: "strong_opinion",
        visualConcept: "Bold type slides, one myth per slide, green accent.",
        cta: "Save this and book an intro session",
        status: "proposed",
        source: "seed",
      },
    ]);
    console.log("[seed] Created 5 demo brainstorm ideas");
  }

  const existingPosts = await getContentPosts({ clientId: client.id, limit: 1 });
  if (existingPosts.length === 0) {
    await createContentPost({
      clientId: client.id,
      title: "You don't need 6 gym days. You need 3 coached hours.",
      caption: "You don't need 6 gym days. You need 3 coached hours.\n\nEvery January we watch the same story: an unsustainable 6-day plan, two heroic weeks, then nothing.\n\nOur members train 3 times a week — coached, programmed, 55 minutes. That's the whole secret. Not intensity. Architecture.\n\nIf you've got a job, a family, and 3 hours a week, you've got everything Strong Foundations needs.",
      hashtags: "#strengthtraining #busyprofessionals #fitnessover40 #smallgrouptraining",
      platform: "instagram",
      contentPillar: "strong_opinion",
      status: "pending_approval",
      aiGenerated: false,
    });
    await createContentPost({
      clientId: client.id,
      title: "Gyms count on you quitting. We count on you staying.",
      caption: "Subject: Why our members are still here in March\n\nBig-box gyms sell 10x more memberships than their floor can hold — their business model IS your quitting.\n\nOurs is the opposite. Coaching only works if you keep showing up, so everything we do is built around consistency: small groups, fixed session times, a coach who notices when you miss.\n\nIf you want a program designed for you to still be training in March, book a free intro session this week.",
      hashtags: "",
      platform: "email",
      contentPillar: "documentary",
      status: "draft",
      aiGenerated: false,
    });
    await createContentPost({
      clientId: client.id,
      title: "12 weeks. 3 sessions a week. Built for people with jobs.",
      caption: "Strong Foundations starts Monday.\n\n12 weeks. 3 coached sessions a week. Strength programming plus nutrition guidance — built for busy professionals, not fitness influencers.\n\n8 spots per group so your coach actually coaches you.\n\nComment INTRO or message us to book your free intro session.",
      hashtags: "#strongfoundations #strengthcoaching #fitnessstudio",
      platform: "facebook",
      contentPillar: "direct_promotion",
      status: "approved",
      aiGenerated: false,
    });
    console.log("[seed] Created 3 demo posts");
  }

  return client;
}

async function main() {
  const userId = await resolveOwnerUserId();
  console.log(`[seed] Owner userId: ${userId}`);
  await ensureOptentia(userId);
  await ensureDemoClient(userId);
  console.log("[seed] Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
