import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
 if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
 for (const table of ["sessions", "challenges", "rate_limits", "oauth_flows"]) await pool.query(`delete from shopora_auth.${table} where expires_at<now()`);
 // Do not delete unverified accounts: imported users may already own orders or listings.
 console.log("Expired authentication records removed.");
} catch { console.error("Cleanup failed."); process.exitCode = 1; } finally { await pool.end(); }
