import { Pool } from "pg";
const url = process.env.MIGRATION_DATABASE_URL, host = process.env.LEGACY_STORAGE_HOST;
if (!url || !host || host.includes("/")) throw new Error("Set MIGRATION_DATABASE_URL and the exact LEGACY_STORAGE_HOST hostname privately.");
const pool = new Pool({ connectionString: url, max: 1 });
let migrated = 0;
try {
 const { rows } = await pool.query("select image_url,(array_agg(seller_id))[1] as seller_id from shopora_seller_listings where image_url like 'https://%' group by image_url");
 for (const row of rows) {
  const source = new URL(row.image_url);
  if (source.protocol !== "https:" || source.hostname !== host || source.username || source.password || !source.pathname.startsWith("/storage/v1/object/public/seller-products/")) throw new Error("Unapproved legacy image origin");
  const response = await fetch(source, { redirect: "error", signal: AbortSignal.timeout(30000) });
  const mime = response.headers.get("content-type")?.split(";")[0];
  if (!response.ok || !["image/jpeg","image/png","image/webp"].includes(mime)) throw new Error("Could not download legacy photo");
  const reader = response.body.getReader(), parts = []; let bytes = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > 5242880) { await reader.cancel(); throw new Error("Legacy photo exceeds 5 MB"); } parts.push(part.value); } } finally { reader.releaseLock(); }
  const data = Buffer.concat(parts), db = await pool.connect();
  try {
   await db.query("begin");
   const media = await db.query("insert into shopora_media(owner_id,content_type,data) values($1,$2,$3) returning id", [row.seller_id,mime,data]);
   const path = `/api/store/media/${media.rows[0].id}`;
   await db.query("update shopora_seller_listings set image_url=$1 where image_url=$2", [path,row.image_url]);
   await db.query("update shopora_products set image_url=$1 where image_url=$2", [path,row.image_url]);
   await db.query("commit"); migrated++;
  } catch(error) { await db.query("rollback"); throw error; } finally { db.release(); }
 }
 console.log(JSON.stringify({ migrated, note: "Verify all public images before retiring legacy storage. Re-running skips completed images." }));
} catch { console.error("Media migration stopped. Completed images remain migrated; unresolved images still use the old URLs. Check privately before cutover."); process.exitCode=1; }
finally { await pool.end(); }
