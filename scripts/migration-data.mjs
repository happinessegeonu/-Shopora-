// Offline migration helpers. These never connect to or modify the old service.
export const commerceTables = ["products", "shipping_rates", "cart_items", "orders", "order_items", "reviews", "seller_listings", "seller_payout_accounts", "seller_commissions"];
export function prepareUsers(users) {
  const emails = new Set(), ids = new Set();
  return users.map(user => {
    const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    if (!/^[a-f0-9-]{36}$/i.test(user.id || "") || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) || emails.has(email) || ids.has(user.id)) throw new Error("Resolve missing/duplicate emails or invalid IDs in the source before importing. No records were discarded.");
    emails.add(email); ids.add(user.id);
    return { id: user.id, email, password_hash: null, verified_at: user.email_confirmed_at ?? null, created_at: user.created_at };
  });
}
export function mappedRow(table, row) {
  if (table !== "orders") return { ...row };
  // Retain historical totals. Missing newer contact columns stay explicitly empty.
  const shipping = row.shipping_minor ?? 0;
  return { ...row, customer_phone: row.customer_phone ?? row.sender_phone ?? "", receiver_name: row.receiver_name ?? row.customer_name, receiver_phone: row.receiver_phone ?? row.sender_phone ?? row.customer_phone ?? "", delivery_location: row.delivery_location ?? "", delivery_state: row.delivery_state ?? "", subtotal_minor: row.subtotal_minor ?? String(BigInt(row.total_minor) - BigInt(shipping)), shipping_minor: shipping };
}
export async function importSnapshot(db, snapshot) {
  if (snapshot.format !== 1 || !Array.isArray(snapshot.users)) throw new Error("Unsupported migration snapshot.");
  for (const table of commerceTables) if (!Array.isArray(snapshot.tables?.[table])) throw new Error(`Missing source table ${table}; refusing a partial import.`);
  const occupied = await db.query("select exists(select 1 from shopora_auth.users) as occupied");
  if (occupied.rows[0].occupied) throw new Error("Import requires an empty target. Do not overwrite registered users.");
  for (const table of commerceTables) {
    if ((await db.query(`select exists(select 1 from shopora_${table}) as occupied`)).rows[0].occupied) throw new Error("Import requires empty commerce tables.");
  }
  const insert = async (table, row, columns) => {
    const names = columns.filter(name => row[name] !== undefined);
    if (!names.length) throw new Error("Empty migration record.");
    await db.query(`insert into ${table}(${names.map(name => `"${name}"`).join(",")}) values(${names.map((_, i) => `$${i + 1}`).join(",")})`, names.map(name => row[name]));
  };
  for (const user of prepareUsers(snapshot.users)) await insert("shopora_auth.users", user, ["id", "email", "password_hash", "verified_at", "created_at"]);
  for (const identity of snapshot.googleIdentities || []) {
    if (!identity.subject || !identity.user_id) throw new Error("Invalid legacy Google identity.");
    await insert("shopora_auth.google_identities", identity, ["subject", "user_id"]);
  }
  const counts = { users: snapshot.users.length };
  for (const table of commerceTables) {
    const columns = (await db.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position", [`shopora_${table}`])).rows.map(row => row.column_name);
    if (!columns.length) throw new Error(`Apply target migrations before importing ${table}.`);
    for (const row of snapshot.tables[table]) await insert(`shopora_${table}`, mappedRow(table, row), columns);
    const actual = Number((await db.query(`select count(*) as count from shopora_${table}`)).rows[0].count);
    if (actual !== snapshot.tables[table].length) throw new Error(`Count mismatch for ${table}.`);
    counts[table] = actual;
  }
  const expected = snapshot.tables.orders.reduce((total, row) => total + BigInt(row.total_minor), 0n);
  const actual = BigInt((await db.query("select coalesce(sum(total_minor),0)::text as total from shopora_orders")).rows[0].total);
  if (expected !== actual) throw new Error("Historical order totals do not reconcile.");
  return counts;
}
