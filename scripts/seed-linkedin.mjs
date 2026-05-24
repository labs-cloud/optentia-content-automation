/**
 * Seed LinkedIn platform connections into the database.
 * Run with: node scripts/seed-linkedin.mjs
 */
import { createConnection } from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_PERSON_URN = process.env.LINKEDIN_PERSON_URN || "urn:li:person:sjUMosKpaE";
const LINKEDIN_ORG_URN = process.env.LINKEDIN_ORG_URN || "urn:li:organization:110145143";

if (!LINKEDIN_ACCESS_TOKEN) {
  console.error("LINKEDIN_ACCESS_TOKEN not set");
  process.exit(1);
}

// Parse DATABASE_URL (mysql://user:pass@host:port/db)
const url = new URL(DATABASE_URL);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

console.log("Connected to database");

// Check existing LinkedIn connections
const [existing] = await conn.execute(
  "SELECT id, platform, accountName FROM platform_connections WHERE platform IN ('linkedin_personal', 'linkedin_company', 'linkedin')"
);
console.log("Existing LinkedIn connections:", existing);

// Delete old LinkedIn connections if any
await conn.execute(
  "DELETE FROM platform_connections WHERE platform IN ('linkedin_personal', 'linkedin_company', 'linkedin')"
);
console.log("Cleared old LinkedIn connections");

// Insert LinkedIn Personal Profile connection
await conn.execute(
  `INSERT INTO platform_connections 
   (platform, accountName, accountId, accessToken, status, createdAt, updatedAt) 
   VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
  [
    "linkedin_personal",
    "Hershey Klein (Personal)",
    LINKEDIN_PERSON_URN,
    LINKEDIN_ACCESS_TOKEN,
    'connected',
  ]
);
console.log("✅ Inserted LinkedIn Personal Profile connection");

// Insert LinkedIn Company Page connection
await conn.execute(
  `INSERT INTO platform_connections 
   (platform, accountName, accountId, accessToken, status, createdAt, updatedAt) 
   VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
  [
    "linkedin_company",
    "Optentia (Company Page)",
    LINKEDIN_ORG_URN,
    LINKEDIN_ACCESS_TOKEN,
    'connected',
  ]
);
console.log("✅ Inserted LinkedIn Company Page connection");

// Verify
const [rows] = await conn.execute(
  "SELECT id, platform, accountName, accountId, status FROM platform_connections ORDER BY createdAt DESC"
);
console.log("\nAll platform connections:");
console.table(rows);

await conn.end();
console.log("\nDone!");
