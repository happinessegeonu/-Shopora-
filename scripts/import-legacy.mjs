import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { importSnapshot } from "./migration-data.mjs";
const path = process.argv[2], apply = process.argv.includes("--apply");
if (!path || !process.env.MIGRATION_DATABASE_URL) throw new Error("Set MIGRATION_DATABASE_URL privately and provide the protected export file. Default is a dry run; --apply commits.");
const pool = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL, max: 1 }), db = await pool.connect();
try {
  const snapshot = JSON.parse(await readFile(path, "utf8"));
  await db.query("begin");
  const counts = await importSnapshot(db, snapshot);
  await db.query(apply ? "commit" : "rollback");
  console.log(JSON.stringify({ committed: apply, counts, note: "Existing passwords require a verified reset. Sessions are not imported. Migrate seller images before retiring the old storage." }));
} catch { await db.query("rollback"); console.error("Import failed and was rolled back. Resolve schema, ownership, duplicate-account or validation mismatches in the protected source snapshot; do not skip records."); process.exitCode = 1; }
finally { db.release(); await pool.end(); }
