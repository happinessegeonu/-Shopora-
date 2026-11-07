# Shopora-owned authentication

Read this together with RAILWAY.md and TEST-RESULTS.md. This replaces the independent module described in the supplied ZIP: the website account screens, cart, reviews, seller listings, private bank details and checkout now use this backend. Native mobile is outside this handoff.

## Design

The Next.js Node backend uses PostgreSQL `shopora_auth` for users, hashed sessions, email challenges, shared rate limits and optional Google identities. Commerce tables have a `shopora_` prefix and foreign keys to the same UUID user IDs. There is no Supabase runtime, public SQL gateway or paid authentication provider. Email delivery uses a replaceable Mailgun adapter; it is not the identity store.

Registration requests an email link before accepting a password. Opening the link does not consume it. The mailbox owner chooses a password at `/account#purpose=verify&token=...`. Reset links use the same page with purpose=reset. Fragments are erased from the address bar on initial load. Links expire after 30 minutes and can be used once. Resend replaces the prior link. Registration/reset responses are generic; sending email synchronously still leaves a timing difference and delivery failures must be monitored.

Passwords are not trimmed. New passwords require at least 15 Unicode characters and at most 256 UTF-8 bytes. scrypt N=131072, r=8, p=1 uses 16 random salt bytes and constant-time comparisons. At most two derivations run at once per process; queued work is bounded. Allow at least 1 GiB for the web service initially and load-test the chosen tier; this is guidance, not a measured capacity guarantee.

Only SHA-256 hashes of random 256-bit session and email-link tokens are stored. Sessions expire after seven days; login rotates the current browser session, logout revokes it, and reset revokes all sessions/challenges transactionally. Production cookies are `__Host-shopora_session`, Secure, HttpOnly, SameSite=Lax, Path=/, with no Domain attribute. No browser session token is put into localStorage or response JSON.

All state-changing browser requests require the exact AUTH_APP_ORIGIN. JSON authentication bodies are limited to 4096 bytes; checkout allows 16384. API authorization never accepts seller_id/customer_id/user_id from the browser as identity. Cart, listing and payout queries filter by the validated server-session user. Seller photos must belong to that user; listing status is forced pending. Uploaded image types/signatures and size are checked; new uploads allow up to 4 MiB. Legacy photos up to 5 MiB are retained by migration. Photo bytes are stored in PostgreSQL, so backups include them and capacity planning must account for them.

The API retains an explicit no-Origin native-header/bearer transport for future clients, but no mobile client or APK migration is part of this release. Native authentication does not accept ambient browser cookies. Browser CORS access is not enabled.

## Endpoints

POST `/api/owned-auth/register` and `/resend`: email. POST `/forgot`: email. POST `/verify` and `/reset`: token,password. POST `/login`: email,password. POST `/logout`: empty object. GET `/session`: current user or null. Paths after the first endpoint share the `/api/owned-auth` prefix.

Store APIs: `/api/store/catalog`, `/cart`, `/listings`, `/payouts`, `/reviews`, `/media`, `/media/:id`; checkout remains POST `/api/orders`. Private GETs and all private mutations authenticate server-side. Approved reviews and active products are public. Checkout also supports a guest with no account, while an expired or invalid presented session is rejected. Signed-in checkout attaches the session's user and consumes only that user's purchased quantities in the same transaction. Cart polling refreshes visible pages roughly every two seconds; it is not a push/realtime guarantee.

No customer-facing admin endpoints exist. Approval, order payment status, delivery confirmation and seller settlement require a separate private operations role. Never grant those abilities to a customer session.

## Google (optional)

Google OAuth is an optional social identity check, not a hosted Shopora authentication service. Configure GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET on the server only. Callback: `https://maketechlimited.com/api/owned-auth/google/callback` (use the exact staging origin separately).

State is tied to an HttpOnly browser cookie and consumed once from the database. Authorization uses PKCE S256 and nonce; Google's library verifies the signed ID token, issuer, audience and expiry; Shopora also requires verified email and matching nonce. Browser return paths are a fixed allowlist. No email-only automatic account merge is permitted. Imported Google subjects map to the original UUID. An email-account collision without an imported identity must use email recovery and a controlled support/admin linking process; there is no self-service linking UI. Do not insert a Google subject from an unverified browser claim.

## Operational limits

Shared throttles default to 8 attempts per identity/action and 100 per action per 15 minutes. Email requests share a budget. Google-start and guest-checkout currently use small-store shared identity buckets, so capacity/abuse tuning is required for launch. A determined attacker can exhaust shared budgets. Add hosting traffic controls and monitor 429s, database latency, process memory and email failures.

Schedule `node scripts/cleanup.mjs` hourly using DATABASE_URL. It deletes expired sessions, challenges, OAuth flows and rate counters, never user records (including unverified imported owners). Enable verified TLS on public database connections; never disable certificate validation. Keep the database private where possible, use the supplied limited-role grants, and schedule/test encrypted backups.

A broad rollout still needs operational load/concurrency testing, compromised-password screening, independent security review as appropriate, real email inbox testing and Google callback verification with actual credentials. See the precise evidence and pending items in TEST-RESULTS.md.
