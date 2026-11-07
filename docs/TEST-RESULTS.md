# Test results — 7 November 2026 (Africa/Lagos)

This is the earlier authentication handoff baseline. See [the website review report](REVIEW-TEST-RESULTS.md) for browser evidence and [the isolated preview guide](TEST-PREVIEW.md) to test it yourself.

Website-only handoff. No production deployment, DNS change, real account migration or real email was performed. Tests use synthetic records and isolated PGlite PostgreSQL databases. Route-handler tests execute the actual handlers and SQL/services with the database/session adapters supplied by the test fixture; they are not a complete real-browser or hosted-network authentication demonstration.

## Passed

| Check | Result/evidence |
|---|---|
| `npm test` | **20 passed, 0 failed** (final complete suite). |
| Registration and verification | No password assigned before mailbox proof; single-use/purpose-bound links, resend rotation and expiry tested. |
| Login/logout/reset | Incorrect credentials rejected; opaque token hashing, current-session rotation, logout revocation and reset of all sessions/challenges tested. |
| Cookie security | Actual auth route responses tested for HttpOnly/SameSite; production __Host prefix and Secure flag verified. Browser JSON contains no session token. |
| Abuse/request checks | Shared database throttling, generic email responses, exact-origin checks and bounded JSON parsing tested. |
| Cart ownership | Two synthetic accounts retain separate carts. Forged browser owner IDs do not redirect mutations. |
| Seller listings/photos | Own listings only; browser seller ID/status cannot impersonate another seller or self-approve; another seller cannot claim the uploaded photo. Invalid image signature rejected. |
| Private bank details | Own bank details round-trip, including leading zeros; another account reads no payout record. |
| Checkout | Database prices/shipping override forged totals; customer is the session user; purchased cart quantities consumed for that account only. |
| Stock/commission | Stock decrement, insufficient-stock rollback, 10% commission and 90% seller share excluding shipping tested against actual SQL schema. |
| Email composition/failure isolation | Customer and owner order emails include item quantities/prices/totals and pending-payment details; one delivery failure does not invalidate the other. These tests use a simulated provider, not real inbox delivery. |
| Migration rehearsal logic | Synthetic legacy UUIDs, cart ownership, order totals, sender contact and private bank numbers preserved. Duplicate/non-empty-target imports rejected. Imported Google subject returns original user; email-only linking rejected. |
| Runtime database privileges | Supplied grants tested: web role cannot approve reviews/listings, mark orders paid, delete users or create auth-schema tables. |
| `npm run typecheck` | Passed. Production build also completes its TypeScript check. |
| `npm run lint` | Exit 0, no errors, three non-blocking `<img>` optimization warnings. |
| `npm run build` | Passed, Next.js 16.4.5 standalone production build. An initial sandbox filesystem error and a test-type error were resolved before the passing build. |
| Standalone local HTTP smoke | Passed using `node scripts/check-standalone.mjs`: homepage, /account, /sell, /checkout, browser /app, icon, robots and sitemap HTTP 200; production CSS HTTP 200; www host HTTP 308 to canonical apex; external-origin login HTTP 403; disabled health/auth/cart HTTP 503 as expected. Test child server stopped afterward. |
| Production dependency audit | `npm audit --omit=dev`: **0 vulnerabilities** at check time. Full audit reported 8 moderate development-tool-chain advisories; no high/critical reports after the framework upgrade. |
| Supabase removal | No Supabase package in root dependencies and no Supabase runtime import in website src. Legacy references exist only in migration/review explanations. |

The final build and smoke checks ran on Windows with Node 24.21.0. The supplied deployment image targets Node 22; its Linux build/run remains a DevOps validation item. Native mobile code/APKs are excluded and were not tested or updated.

## Pending before production cutover

1. Create the ordinary PostgreSQL service/volume on Railway, configure the limited runtime role and secrets, run checksum-tracked migrations, and verify /api/health from the deployed environment.
2. Obtain authorized read-only access to the old database and storage. Take a backup, freeze final source writes, rehearse the real export/import, migrate actual seller photos, and reconcile ALL source records/ownership/totals. Only synthetic migration data was tested here. Nothing in the real source was altered or discarded.
3. Imported verified users need a verified password-reset/setup link; old passwords and sessions are not imported. Verify actual recovery for representative existing customer and seller accounts. No automated invitation emails have been sent.
4. Configure/verify real Mailgun credentials, sending-domain DNS and customer/owner destination mailboxes. Test verification, resend, recovery and order email delivery into actual inboxes/spam folders.
5. Optional Google: supply OAuth credentials and test consent, callback, signature/nonce/state/PKCE handling end to end with Google on staging and the final domain. Offline tests cover subject mapping/collision behavior, not a live Google account login. Email login requires no Google setup.
6. Complete a real-browser staging acceptance pass: registration through the email link, sign in/reload/logout/reset, multi-tab changes, guest bag versus signed-in bag, two-browser private cart/seller/payout isolation and a staged order. HTTP smoke checks verify rendering/assets/failure states, not browser clicks or real mailbox ownership.
7. Build/run the Linux Docker image on the DevOps CI runner; exercise Railway private networking, database TLS where applicable, role grants and health checks. Docker/psql were unavailable locally; no live Railway test was performed.
8. Load-test scrypt memory/CPU, shared throttles, database pools, multi-process concurrent stock/cart/credential races and image storage. PGlite does not establish production multi-process PostgreSQL race behavior. Tune small-store limits and hosting traffic controls; consider compromised-password screening and independent security review for broad rollout.
9. Review/update the 8 moderate development-only lint/type-tool-chain advisories. They are not installed in the production runtime image. Three image-optimization lint warnings remain; they do not block the auth flow.
10. Configure and verify Railway's supplied DNS records/HTTPS for **maketechlimited.com** (and optional www); preserve mail records. Test host-specific cookies and email/Google redirects on that domain.
11. Configure encrypted backups, retention, hourly expired-auth cleanup, delivery/health monitoring and alerts. Prove a restore and agree a rollback/reconciliation window before retiring the source.

## Credentials/access DevOps needs

- Railway project/billing access and a persistent PostgreSQL service; private migration-owner and limited app-role credentials.
- Authorized legacy database read credentials and seller-storage read access for migration only.
- Mailgun delivery credentials and a verified sender; owner order-notification/support mailboxes.
- DNS provider access for maketechlimited.com and any email-sending domain.
- Optional Google Cloud OAuth web-client ID/secret; no paid authentication-provider subscription.

The ZIP deliberately contains none of these secrets or customer records. The project is a tested implementation handoff, not certification that an unseen production dataset or deployment is already migrated and working.
