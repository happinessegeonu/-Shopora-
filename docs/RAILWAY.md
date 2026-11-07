# Railway and maketechlimited.com deployment handoff

DevOps owns deployment. No Railway project, database, domain record or live application was changed by this work. The ZIP contains website source and synthetic tests, not production secrets or customer exports.

## Services and costs

Run two services in the same Railway project/environment/region:

- **Shopora web:** supplied Dockerfile; Node 22, Next.js standalone backend and frontend. It binds 0.0.0.0 and Railway's PORT. No web-service volume is required.
- **PostgreSQL:** your ordinary PostgreSQL 17 service/container with a persistent volume. This is your database deployment, not a managed authentication provider. Use Railway's PostgreSQL template or your own PostgreSQL container with the correct PGDATA and volume mount. Do not use ephemeral web-container disk for PostgreSQL.

Keep the database private. Railway's private service hostname works inside its project environment, not from a developer laptop. If temporary public migration access is necessary, restrict and secure it, verify TLS, and remove it afterward. `railway run` locally does not make private DNS reachable from a laptop.

Start with web memory headroom of at least 1 GiB for bounded scrypt work; measure CPU/memory and database connections under load. The app uses a five-connection pool per instance. Configure database capacity for the number of web replicas and migration jobs. Railway compute, persistent volumes, network traffic, backups and email delivery may be billed; set alerts and review the current plan. No free-forever assumption.

## Build and secrets

Use the existing repository `https://github.com/happinessegeonu/-Shopora-` and select the handoff branch `codex/standalone-backend`. Review it before merging into a branch that deploys automatically. Select the repository root, not a mobile directory. `railway.json` selects the Dockerfile and `/api/health`. Docker builds require no database credentials. The image runs as a non-root user and starts `node server.js`. If using source/Railpack instead, build with `npm ci && npm run build`, start with `npm start -- --hostname 0.0.0.0`, and ensure PORT is set by Railway.

Set these web-service environment variables privately:

| Variable | Value/purpose |
|---|---|
| DATABASE_URL | Limited shopora_app role, private database hostname, correct password/database. No browser/public prefix. |
| OWNED_AUTH_ENABLED | true, after schema/data validation |
| SHOPORA_BACKEND | postgres |
| AUTH_APP_ORIGIN | exact HTTPS origin; staging domain for staging, `https://maketechlimited.com` for production, no trailing slash |
| AUTH_RATE_SECRET | random secret of at least 32 characters; generate securely and store in Railway |
| MAILGUN_API_KEY | server-only delivery key |
| MAILGUN_DOMAIN / MAILGUN_FROM_EMAIL | verified sending domain and sender; existing valid sending domain may be reused |
| MAILGUN_REGION | US or EU, matching the account |
| ORDER_NOTIFICATION_EMAIL | owner's destination for complete order details |
| ORDER_REPLY_TO_EMAIL | support/reply mailbox, optional fallback to owner |
| STORE_CURRENCY / NEXT_PUBLIC_STORE_CURRENCY | NGN |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | optional OAuth web client, both empty if email-only |
| GOOGLE_SITE_VERIFICATION | optional Search Console verification value |

Do not add database URLs, email keys or OAuth secrets to NEXT_PUBLIC variables. Do not copy `.env.local` into Docker images. The supplied examples have no real secrets. The domain requested here is **maketechlimited.com**; existing company/support email addresses may use a differently spelled domain. Confirm which verified mailbox to use; do not silently change mail DNS or bank details.

Use MIGRATION_DATABASE_URL only in a separate one-off owner/migration job, not the running web service. For local commands, `.env.local` is explicitly loaded by npm run db:migrate; standalone node scripts otherwise need `node --env-file=.env.local ...` or securely injected variables.

## Database initialization and privileges

1. Back up the old database and storage before making changes; rehearse on an isolated target.
2. Build the image, then run a maintenance job inside the Railway environment with an owner-level MIGRATION_DATABASE_URL: `node scripts/migrate.mjs`. This creates/checks checksum-tracked migrations in order: owned-auth.sql, shopora.sql, operations.sql. It uses an advisory migration lock and transactional DDL. No migrations run automatically when the web service starts.
3. In private psql as owner: `CREATE ROLE shopora_app LOGIN;`, then `\password shopora_app` to set a strong password interactively. Apply `database/app-role-grants.sql`. Keep this role non-superuser, without schema creation or role-management permissions. The database owner/migration role owns the tables.
4. Set the web DATABASE_URL to this role. If using Railway variable references, define a private APP_DATABASE_URL with that role and reference it from the web service. Do not simply give the web process the template's owner connection.
5. Follow database/MIGRATION.md for real users, carts, orders, bank details and photos. Reconcile row counts, UUID relationships and order totals. Import defaults to a rollback-only rehearsal; only --apply commits.
6. Start the web service. `/api/health` returns 200 only when flags, core configuration and auth/catalog tables are reachable. It deliberately does not verify email inbox delivery or Google credentials.

Initial health checks will fail until the database schema, role grants and required variables are ready. Use the one-off maintenance job first. Keep production and staging databases/keys separate. Use the same app origin for browser requests and generated email links.

## Staging acceptance before DNS cutover

Use Railway's generated HTTPS web domain first and set AUTH_APP_ORIGIN to that exact origin. Verify create-account email, password setup, invalid-password message, login, reload, logout, resend, reset expiry/reuse and all-session reset revocation. Use two independent browser profiles to verify private carts, seller listings and payout details; test forged IDs and an unauthorized image. Place a synthetic order in staging, verify server prices/shipping/10% commission and separate customer/owner emails. Do not transfer money for testing.

If enabling Google, configure a separate staging OAuth callback and test it. Production callback is `https://maketechlimited.com/api/owned-auth/google/callback`; authorized JavaScript origin is `https://maketechlimited.com`. Ensure Google's consent-screen publishing/testing settings permit intended users. Real Google login is not covered by the offline automated tests. Email-only works without Google credentials.

Run `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` in CI. Build and smoke-test the Linux Docker image on the DevOps runner; Docker was unavailable on the author's Windows machine. Use docs/TEST-RESULTS.md as the evidence baseline, not as a substitute for staging.

## Domain: maketechlimited.com

1. Confirm access to the domain's authoritative DNS provider and record current web, MX, SPF, DKIM, DMARC and verification entries. Preserve email records.
2. In Shopora web service Settings → Networking, add `maketechlimited.com` as a custom domain and set the service target port to the web listener. Railway supplies the exact **CNAME target and TXT ownership-verification record**. Copy its displayed names/values; do not invent an IP or reuse another service's records.
3. For the apex (@), use the provider's CNAME flattening/ALIAS/ANAME support as appropriate. If apex aliasing is unsupported, resolve that with the DNS provider/Railway rather than placing an arbitrary A record. Add Railway's TXT verification separately.
4. Optionally add `www.maketechlimited.com` as a second Railway custom domain and copy its own displayed CNAME/TXT records. Next.js redirects that www host to the canonical apex.
5. Wait for DNS verification and Railway's HTTPS certificate. Check both the apex and optional www URL over HTTPS before announcing the site. Update AUTH_APP_ORIGIN to `https://maketechlimited.com`, any production Google callback, and your monitoring. Rebuild if canonical metadata was built for staging.
6. Test login, email links and redirects again on the final domain. __Host- cookies are host-specific; a session on the old Vercel domain will not transfer to the new domain. Users sign in again.

## Operations, restore and rollback

Schedule `node scripts/cleanup.mjs` hourly with limited DATABASE_URL. Monitor authentication/delivery failures, HTTP 429/5xx, memory, database storage and connections. Uploaded seller photos are database bytes and count toward database/backups storage.

Use encrypted scheduled PostgreSQL backups plus the volume-backup options available on the chosen Railway plan; test restore into an isolated database. An ordinary pg_dump of the owned database must include public commerce and shopora_auth. Do not log credentials, reset links or customer/bank data. Never use a database reset/drop to fix a failed rollout.

Approval/payment/settlement remains a private administrator task. Approve seller submissions in one transaction: insert a product with id `seller-<listing UUID>` from the pending listing and then mark that listing approved. Approve reviews by changing approved=true privately. Confirm actual bank receipt before marking orders paid; record delivery before settlement. The private `shopora_seller_commission_report` excludes cancelled/refunded commission and tracks payable seller shares. No automatic payout is implemented.

Before cutover, freeze writes on the old shop, take a final export/backup, apply/import into the validated target, reconcile and then change DNS. Keep the old source read-only and intact during the rollback window. If new orders exist on the target, reconcile them before rolling DNS back; a blind rollback would strand those orders. Do not retire old storage until all photos are migrated and checked.

Official references checked for this handoff: https://railway.com/guides/nextjs ; https://docs.railway.com/databases/postgresql ; https://docs.railway.com/networking/public-networking ; https://docs.railway.com/volumes . Railway supplies deployment-specific DNS and pricing; the files do not perform any deployment.
