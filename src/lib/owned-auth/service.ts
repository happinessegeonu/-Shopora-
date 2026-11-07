import { createHmac, randomUUID } from "node:crypto";
import type { Database } from "./database";
import { hashPassword, newToken, tokenHash, validPassword, validToken, verifyPassword } from "./crypto";

export class AuthError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type AuthUser = { id: string; email: string };
type UserRow = AuthUser & { password_hash: string | null; verified_at: Date | null };
export type Mailer = (email: string, purpose: "verify" | "reset", token: string) => Promise<void>;
const generic = { message: "If this address is eligible, an email has been requested. Check your inbox and spam." };
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-shopora_session" : "shopora_session";

export function emailAddress(input: unknown) {
  if (typeof input !== "string") throw new AuthError("Enter a valid email address.");
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) throw new AuthError("Enter a valid email address.");
  return email;
}
export class OwnedAuth {
  constructor(private db: Database, private mail: Mailer, private rateSecret: string) {
    if (rateSecret.length < 32) throw new Error("AUTH_RATE_SECRET must contain at least 32 characters.");
  }
  async limit(action: string, identity: string) {
    // Shared PostgreSQL counters work across serverless instances. No untrusted
    // X-Forwarded-For value is used as a security boundary.
    const hash = createHmac("sha256", this.rateSecret).update(identity).digest("hex");
    for (const [bucket, max] of [["global", 100], [hash, 8]] as const) {
      const { rows } = await this.db.query<{ attempts: number }>(`
        INSERT INTO shopora_auth.rate_limits(bucket, attempts, expires_at)
        VALUES ($1, 1, now() + interval '15 minutes')
        ON CONFLICT (bucket) DO UPDATE SET
          attempts = CASE WHEN shopora_auth.rate_limits.expires_at <= now() THEN 1 ELSE shopora_auth.rate_limits.attempts + 1 END,
          expires_at = CASE WHEN shopora_auth.rate_limits.expires_at <= now() THEN now() + interval '15 minutes' ELSE shopora_auth.rate_limits.expires_at END
        RETURNING attempts`, [`${action}:${bucket}`]);
      if (rows[0].attempts > max) throw new AuthError("Too many attempts. Try again in 15 minutes.", 429);
    }
  }
  async requestEmail(input: unknown, purpose: "verify" | "reset") {
    const email = emailAddress(input);
    await this.limit("email", email);
    const token = newToken();
    const send = await this.db.transaction(async db => {
      if (purpose === "verify") await db.query(`INSERT INTO shopora_auth.users(id,email) VALUES ($1,$2) ON CONFLICT(email) DO NOTHING`, [randomUUID(), email]);
      const { rows } = await db.query<UserRow>(`SELECT * FROM shopora_auth.users WHERE email=$1 FOR UPDATE`, [email]);
      const user = rows[0];
      if (!user || (purpose === "verify" ? user.verified_at : !user.verified_at)) return false;
      await db.query(`INSERT INTO shopora_auth.challenges(token_hash,user_id,purpose,expires_at)
        VALUES($1,$2,$3,now()+interval '30 minutes') ON CONFLICT(user_id,purpose)
        DO UPDATE SET token_hash=excluded.token_hash, expires_at=excluded.expires_at`, [tokenHash(token), user.id, purpose]);
      return true;
    });
    // Do not expose account existence through delivery errors or log token URLs.
    if (send) try { await this.mail(email, purpose, token); }
    catch { console.error("Authentication email delivery failed"); }
    return generic;
  }
  async complete(input: unknown, password: unknown, purpose: "verify" | "reset") {
    if (!validToken(input)) throw new AuthError("This link is invalid or expired. Request a new email.");
    await this.limit("complete", tokenHash(input));
    if (!validPassword(password)) throw new AuthError("Use at least 15 characters and at most 256 UTF-8 bytes.");
    const encoded = await hashPassword(password);
    await this.db.transaction(async db => {
      // Every credential mutation and login locks the same user row first.
      const { rows } = await db.query<UserRow>(`SELECT u.* FROM shopora_auth.users u JOIN shopora_auth.challenges c ON c.user_id=u.id
        WHERE c.token_hash=$1 AND c.purpose=$2 FOR UPDATE OF u`, [tokenHash(input), purpose]);
      const user = rows[0];
      if (!user) throw new AuthError("This link is invalid or expired. Request a new email.");
      const consumed = await db.query(`DELETE FROM shopora_auth.challenges
        WHERE token_hash=$1 AND purpose=$2 AND expires_at>now() RETURNING user_id`, [tokenHash(input), purpose]);
      if (!consumed.rows.length || (purpose === "reset" && !user.verified_at)) throw new AuthError("This link is invalid or expired. Request a new email.");
      await db.query(`UPDATE shopora_auth.users SET password_hash=$1,verified_at=coalesce(verified_at,now()) WHERE id=$2`, [encoded, user.id]);
      await db.query(`DELETE FROM shopora_auth.sessions WHERE user_id=$1`, [user.id]);
      await db.query(`DELETE FROM shopora_auth.challenges WHERE user_id=$1`, [user.id]);
    });
    return { message: "Password saved. Sign in with your email and new password." };
  }
  async login(input: unknown, password: unknown, previousToken?: string) {
    const email = emailAddress(input);
    await this.limit("login", email);
    if (typeof password !== "string" || Buffer.byteLength(password) > 256) throw new AuthError("Email or password is incorrect.", 401);
    return this.db.transaction(async db => {
      const { rows } = await db.query<UserRow>(`SELECT * FROM shopora_auth.users WHERE email=$1 FOR UPDATE`, [email]);
      const user = rows[0];
      const valid = await verifyPassword(password, user?.password_hash ?? null);
      if (!valid || !user?.verified_at) throw new AuthError("Email or password is incorrect.", 401);
      const token = newToken();
      if (previousToken && validToken(previousToken)) await db.query(`DELETE FROM shopora_auth.sessions WHERE token_hash=$1`, [tokenHash(previousToken)]);
      await db.query(`INSERT INTO shopora_auth.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')`, [tokenHash(token), user.id]);
      return { token, user: { id: user.id, email: user.email } };
    });
  }
  async session(token?: string): Promise<AuthUser | null> {
    if (!validToken(token)) return null;
    const { rows } = await this.db.query<AuthUser>(`SELECT u.id,u.email FROM shopora_auth.users u
      JOIN shopora_auth.sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.verified_at IS NOT NULL`, [tokenHash(token)]);
    return rows[0] ?? null;
  }
  async googleIdentity(subject: string, input: string, previousToken?: string) {
    const email = emailAddress(input);
    await this.limit("google-login", subject);
    return this.db.transaction(async db => {
      // Serialize account creation with email registration and other OAuth callbacks.
      await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`google:${subject}`]);
      const identity = await db.query<AuthUser>(`select u.id,u.email from shopora_auth.google_identities g join shopora_auth.users u on u.id=g.user_id where g.subject=$1 and u.verified_at is not null for update of u`, [subject]);
      let user = identity.rows[0];
      if (!user) {
        const existing = await db.query("select id from shopora_auth.users where email=$1", [email]);
        // Existing accounts must be linked through the controlled migration, never
        // by accepting an email string from a browser or silently merging users.
        if (existing.rows.length) throw new AuthError("This email already has an account. Sign in with email or reset your password, then contact support to link Google.", 409);
        user = { id: randomUUID(), email };
        await db.query("insert into shopora_auth.users(id,email,verified_at) values($1,$2,now())", [user.id, email]);
        await db.query("insert into shopora_auth.google_identities(subject,user_id) values($1,$2)", [subject, user.id]);
      }
      const token = newToken();
      if (validToken(previousToken)) await db.query("delete from shopora_auth.sessions where token_hash=$1", [tokenHash(previousToken)]);
      await db.query("insert into shopora_auth.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '7 days')", [tokenHash(token), user.id]);
      return { token, user };
    });
  }
  async logout(token?: string) {
    if (validToken(token)) await this.db.query(`DELETE FROM shopora_auth.sessions WHERE token_hash=$1`, [tokenHash(token)]);
  }
}
