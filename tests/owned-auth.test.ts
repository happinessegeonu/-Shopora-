import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { OwnedAuth, AuthError } from "../src/lib/owned-auth/service";
import type { Database } from "../src/lib/owned-auth/database";
import { checkOrigin, readBody } from "../src/lib/owned-auth/http";
import { tokenHash } from "../src/lib/owned-auth/crypto";

const password = "a unique long password for Shopora";
async function fixture() {
  const pg = new PGlite();
  await pg.exec(readFileSync("database/owned-auth.sql", "utf8"));
  const adapter = (connection: any): Database => ({
    query: (sql, values) => connection.query(sql, values),
    transaction: work => connection.transaction((transaction: any) => work(adapter(transaction))),
  });
  const emails: { email: string; purpose: string; token: string }[] = [];
  const auth = new OwnedAuth(adapter(pg), async (email, purpose, token) => { emails.push({ email, purpose, token }); }, "test-secret-".repeat(4));
  return { pg, auth, emails };
}
test("registration, email ownership, login, reset and logout lifecycle", async () => {
  const { pg, auth, emails } = await fixture();
  try {
    await auth.requestEmail(" Owner@Example.com ", "verify");
    assert.equal(emails[0].email, "owner@example.com");
    await assert.rejects(auth.login("owner@example.com", password), /incorrect/);
    const row = await pg.query<{ password_hash: string | null }>("SELECT password_hash FROM shopora_auth.users");
    assert.equal(row.rows[0].password_hash, null, "no password before mailbox ownership");
    await assert.rejects(auth.complete(emails[0].token, "short", "verify"), /15 characters/);
    await assert.rejects(auth.complete(emails[0].token, password, "reset"), /invalid or expired/);
    await auth.complete(emails[0].token, password, "verify");
    await assert.rejects(auth.complete(emails[0].token, password, "verify"), /invalid or expired/);
    await assert.rejects(auth.login("owner@example.com", "wrong password"), /incorrect/);
    const first = await auth.login("owner@example.com", password);
    assert.equal((await auth.session(first.token))?.email, "owner@example.com");
    assert.equal(await auth.session("invented-cookie"), null);
    const stored = await pg.query<{ token_hash: string }>("SELECT token_hash FROM shopora_auth.sessions");
    assert.equal(stored.rows[0].token_hash, tokenHash(first.token));
    const second = await auth.login("owner@example.com", password, first.token);
    assert.equal(await auth.session(first.token), null, "login rotates current browser session");
    await auth.requestEmail("owner@example.com", "reset");
    await auth.complete(emails.at(-1)!.token, password + " new", "reset");
    assert.equal(await auth.session(second.token), null, "reset revokes all sessions");
    await assert.rejects(auth.login("owner@example.com", password), /incorrect/);
    const third = await auth.login("owner@example.com", password + " new");
    await auth.logout(third.token);
    assert.equal(await auth.session(third.token), null);
  } finally { await pg.close(); }
});
test("expired challenges, resend rotation and expired sessions", async () => {
  const { pg, auth, emails } = await fixture();
  try {
    await auth.requestEmail("expiry@example.com", "verify");
    const old = emails[0].token;
    await auth.requestEmail("expiry@example.com", "verify");
    await assert.rejects(auth.complete(old, password, "verify"), /invalid or expired/);
    await pg.exec("UPDATE shopora_auth.challenges SET expires_at=now()-interval '1 second'");
    await assert.rejects(auth.complete(emails.at(-1)!.token, password, "verify"), /invalid or expired/);
    await auth.requestEmail("expiry@example.com", "verify");
    await auth.complete(emails.at(-1)!.token, password, "verify");
    const session = await auth.login("expiry@example.com", password);
    await pg.exec("UPDATE shopora_auth.sessions SET expires_at=now()-interval '1 second'");
    assert.equal(await auth.session(session.token), null);
  } finally { await pg.close(); }
});
test("shared database throttling and generic account responses", async () => {
  const { pg, auth, emails } = await fixture();
  try {
    const missing = await auth.requestEmail("unknown@example.com", "reset");
    assert.equal(emails.length, 0);
    const registration = await auth.requestEmail("known@example.com", "verify");
    assert.deepEqual(missing, registration);
    for (let i = 0; i < 8; i++) await assert.rejects(auth.login("unknown@example.com", "invalid"), /incorrect/);
    await assert.rejects(auth.login("unknown@example.com", "invalid"), (error: unknown) => error instanceof AuthError && error.status === 429);
  } finally { await pg.close(); }
});
test("CSRF origin and bounded JSON parsing", async () => {
  process.env.AUTH_APP_ORIGIN = "http://localhost:3000";
  assert.throws(() => checkOrigin(new Request("http://localhost:3000", { method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" } })), /origin/);
  assert.throws(() => checkOrigin(new Request("http://localhost:3000", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "text/plain" } })), /JSON/);
  checkOrigin(new Request("http://localhost:3000", { headers: { origin: "http://localhost:3000", "content-type": "application/json" } }));
  await assert.rejects(readBody(new Request("http://localhost:3000", { method: "POST", body: "x".repeat(4097) })), /too large/);
  await assert.rejects(readBody(new Request("http://localhost:3000", { method: "POST", body: "[]" })), /JSON object/);
});
