/**
 * Runtime schema migration — brings the database up to the multi-client schema
 * without requiring drizzle-kit or a local dev environment.
 *
 * Every statement is idempotent:
 *  - CREATE TABLE IF NOT EXISTS for new tables
 *  - ADD COLUMN guarded by information_schema checks (MySQL lacks IF NOT EXISTS)
 *  - MODIFY COLUMN enum extensions are safe to reapply (append-only values)
 *
 * Triggered from the secured cron endpoints (see cronHandlers.ts), so the
 * database upgrades itself on the first cron tick after deploy. `pnpm seed`
 * uses the same code path for local runs.
 */
import { sql } from "drizzle-orm";
import { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const PLATFORM_ENUM_SQL =
  "enum('instagram','linkedin','linkedin_personal','linkedin_company','facebook','youtube','email','whatsapp')";

const NEW_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS \`clients\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`websiteUrl\` text,
    \`industry\` varchar(255),
    \`description\` text,
    \`primaryOffer\` text,
    \`audience\` text,
    \`status\` enum('active','paused','archived') NOT NULL DEFAULT 'active',
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`client_brand_profiles\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`clientId\` int NOT NULL,
    \`voice\` text,
    \`tone\` text,
    \`audience\` text,
    \`buyerPains\` text,
    \`offers\` text,
    \`proofPoints\` text,
    \`competitors\` text,
    \`visualStyle\` text,
    \`ctaStyle\` text,
    \`forbiddenPhrases\` text,
    \`approvedExamples\` json,
    \`rejectedExamples\` json,
    \`brandSummary\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`preference_signals\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`clientId\` int NOT NULL,
    \`userId\` int,
    \`signalType\` enum('idea_swipe','post_approval','post_rejection','edit','winner','saved','used_in_campaign') NOT NULL,
    \`targetType\` varchar(50),
    \`targetId\` int,
    \`direction\` enum('positive','negative') NOT NULL,
    \`content\` text,
    \`reason\` text,
    \`metadata\` json,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`brainstorm_ideas\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`clientId\` int NOT NULL,
    \`campaignId\` int,
    \`type\` enum('post_hook','campaign_angle','reel_idea','carousel_idea','email_angle','whatsapp_message','ad_concept','visual_concept','offer_angle') NOT NULL DEFAULT 'post_hook',
    \`title\` varchar(500),
    \`hook\` varchar(500),
    \`description\` text,
    \`platform\` varchar(50),
    \`contentPillar\` varchar(50),
    \`visualConcept\` text,
    \`cta\` text,
    \`status\` enum('proposed','liked','discarded','saved','promoted') NOT NULL DEFAULT 'proposed',
    \`score\` int,
    \`source\` varchar(50) DEFAULT 'ai',
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`campaigns\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`clientId\` int NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`goal\` enum('awareness','leads','authority','offer_push','re_engagement','education','testimonial_proof') NOT NULL DEFAULT 'awareness',
    \`thesis\` text,
    \`offer\` text,
    \`brief\` text,
    \`platforms\` json,
    \`durationDays\` int NOT NULL DEFAULT 14,
    \`status\` enum('draft','generating','active','completed','archived') NOT NULL DEFAULT 'draft',
    \`startDate\` timestamp NULL,
    \`endDate\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`campaign_content_items\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`campaignId\` int NOT NULL,
    \`clientId\` int NOT NULL,
    \`contentPostId\` int,
    \`brainstormIdeaId\` int,
    \`role\` varchar(100),
    \`platform\` varchar(50),
    \`conceptTitle\` varchar(500),
    \`conceptDescription\` text,
    \`contentPillar\` varchar(50),
    \`plannedDate\` timestamp NULL,
    \`status\` enum('planned','generated','approved','published') NOT NULL DEFAULT 'planned',
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`content_performance_snapshots\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`contentPostId\` int NOT NULL,
    \`clientId\` int NOT NULL,
    \`platform\` varchar(50),
    \`impressions\` int DEFAULT 0,
    \`likes\` int DEFAULT 0,
    \`comments\` int DEFAULT 0,
    \`shares\` int DEFAULT 0,
    \`saves\` int DEFAULT 0,
    \`clicks\` int DEFAULT 0,
    \`leads\` int DEFAULT 0,
    \`engagementRateBps\` int,
    \`raw\` json,
    \`capturedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`model_runs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`clientId\` int,
    \`userId\` int,
    \`taskType\` varchar(100) NOT NULL,
    \`provider\` varchar(50) DEFAULT 'anthropic',
    \`model\` varchar(100),
    \`inputTokens\` int,
    \`outputTokens\` int,
    \`estimatedCostMicros\` int,
    \`latencyMs\` int,
    \`status\` enum('success','error') NOT NULL DEFAULT 'success',
    \`errorMessage\` text,
    \`qualityRating\` int,
    \`requestSummary\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
];

// table → column → DDL fragment after the column name
const NEW_COLUMNS: Array<{ table: string; column: string; definition: string }> = [
  { table: "content_posts", column: "clientId", definition: "int" },
  { table: "content_posts", column: "campaignId", definition: "int" },
  { table: "content_posts", column: "isWinner", definition: "boolean DEFAULT false" },
  { table: "content_posts", column: "parentPostId", definition: "int" },
  { table: "content_schedules", column: "clientId", definition: "int" },
  { table: "media_assets", column: "clientId", definition: "int" },
  { table: "analytics_events", column: "clientId", definition: "int" },
  { table: "heygen_requests", column: "clientId", definition: "int" },
  { table: "platform_connections", column: "clientId", definition: "int" },
];

const ENUM_EXTENSIONS: string[] = [
  `ALTER TABLE \`content_posts\` MODIFY COLUMN \`platform\` ${PLATFORM_ENUM_SQL} NOT NULL`,
  `ALTER TABLE \`analytics_events\` MODIFY COLUMN \`platform\` ${PLATFORM_ENUM_SQL} NOT NULL`,
  `ALTER TABLE \`platform_connections\` MODIFY COLUMN \`platform\` ${PLATFORM_ENUM_SQL} NOT NULL`,
];

function unwrapRows(result: unknown): any[] {
  // drizzle-orm/mysql2 execute() returns [rows, fields]
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

async function columnExists(db: Db, table: string, column: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT COUNT(*) AS c FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND COLUMN_NAME = ${column}
  `);
  const rows = unwrapRows(result);
  return Number(rows[0]?.c ?? 0) > 0;
}

let ensured = false;

/**
 * Applies the multi-client schema. Safe to call repeatedly; runs at most once
 * per process after a successful pass.
 */
export async function ensureMultiClientSchema(): Promise<{ applied: string[] }> {
  const applied: string[] = [];
  if (ensured) return { applied };

  const db = await getDb();
  if (!db) throw new Error("Database unavailable — DATABASE_URL not set?");

  for (const ddl of NEW_TABLES) {
    await db.execute(sql.raw(ddl));
  }
  applied.push("ensured 8 new tables");

  for (const { table, column, definition } of NEW_COLUMNS) {
    if (!(await columnExists(db, table, column))) {
      await db.execute(sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`));
      applied.push(`added ${table}.${column}`);
    }
  }

  for (const ddl of ENUM_EXTENSIONS) {
    await db.execute(sql.raw(ddl));
  }
  applied.push("extended platform enums (email, whatsapp)");

  ensured = true;
  console.log("[ensureSchema] Schema up to date.", applied);
  return { applied };
}
