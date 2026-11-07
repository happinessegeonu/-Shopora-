import { Pool } from "pg";
import { writeFile } from "node:fs/promises";
import { commerceTables } from "./migration-data.mjs";
const path = process.argv[2];
if (!path || !process.env.SOURCE_DATABASE_URL) throw new Error("Set SOURCE_DATABASE_URL privately and provide an output file in private-migration/.");
const pool = new Pool({ connectionString: process.env.SOURCE_DATABASE_URL, max: 1 });
const db = await pool.connect();
try {
  await db.query("begin isolation level repeatable read read only");
  const users = (await db.query("select id,email,email_confirmed_at,created_at from auth.users order by id")).rows;
  const googleIdentities = (await db.query("select identity_data->>'sub' as subject,user_id from auth.identities where provider='google' order by user_id")).rows;
  const tables = {};
  for (const table of commerceTables) tables[table] = (await db.query(`select * from public.${table}`)).rows;
  await writeFile(path, JSON.stringify({ format: 1, exportedAt: new Date().toISOString(), users, googleIdentities, tables }), { flag: "wx", mode: 0o600 });
  await db.query("commit");
  console.log("Read-only export saved. Protect this file: it includes private customer and seller data.");
} catch (error) { await db.query("rollback"); console.error("Export failed; no source data changed."); process.exitCode = 1; }
finally { db.release(); await pool.end(); }
