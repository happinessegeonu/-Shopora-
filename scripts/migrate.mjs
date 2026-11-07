import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error("Set MIGRATION_DATABASE_URL to a private PostgreSQL migration-role connection string.");
const pool = new Pool({ connectionString: url, max: 1 }), db = await pool.connect();
try {
  await db.query("select pg_advisory_lock(734820941)");
  await db.query("create table if not exists shopora_migrations(name text primary key, checksum text not null, applied_at timestamptz not null default now())");
  await db.query("revoke all on shopora_migrations from public");
  for (const name of ["owned-auth.sql", "shopora.sql", "operations.sql", "checkout-requests.sql"]) {
    const sql = await readFile(new URL(`../database/${name}`, import.meta.url), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previous = (await db.query("select checksum from shopora_migrations where name=$1", [name])).rows[0];
    if (previous) { if (previous.checksum !== checksum) throw new Error("An applied migration changed; write a new migration instead."); continue; }
    await db.query("begin");
    try { await db.query(sql); await db.query("insert into shopora_migrations(name,checksum) values($1,$2)", [name, checksum]); await db.query("commit"); console.log(`Applied ${name}`); }
    catch (error) { await db.query("rollback"); throw error; }
  }
} catch { console.error("Migration failed. Check the database role, connectivity and migration history; no credentials were logged."); process.exitCode = 1; }
finally { await db.query("select pg_advisory_unlock(734820941)").catch(() => {}); db.release(); await pool.end(); }
