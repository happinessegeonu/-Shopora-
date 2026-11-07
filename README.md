# Shopora website — owned authentication handoff

This is the website-only review branch `codex/website-review-preview` of the existing Shopora repository. It runs Shopora authentication in the Next.js backend and stores accounts and commerce data in ordinary PostgreSQL. No Supabase SDK, Neon account or paid authentication provider is required. No production deployment or DNS change has been made.

Start with [try the isolated test shop](docs/TEST-PREVIEW.md) and [the review test report](docs/REVIEW-TEST-RESULTS.md). After review, use [Railway deployment](docs/RAILWAY.md), [authentication](docs/OWNED-AUTH.md) and [data migration](database/MIGRATION.md).

## Included

- Email registration, mailbox verification/password setup, login/logout, resend and password reset.
- Salted scrypt password hashes, opaque server sessions, HttpOnly cookies, shared database rate limits, origin checks and bounded requests.
- Existing storefront account dialog, account-link page, cart, seller listings, private bank details, reviews and checkout connected to server-owned identity.
- Server-priced orders, stock checks, 10% seller commission excluding shipping, customer confirmation and separate owner order email. Paystack remains deferred.
- Optional Google sign-in verified by Google's server library. It stays hidden until credentials are configured. No external service manages the Shopora session.
- PostgreSQL schema migrations, limited runtime-role grants, controlled legacy export/import and seller-photo migration tools.
- Dockerfile, Railway configuration, local PostgreSQL Compose file, environment template and tests.

The native mobile app is outside this review and is unchanged. The existing `/app` route is the responsive browser/PWA storefront, not a new native app.

## Local development

Use Node 22.18+ (Node 22 LTS recommended) and PostgreSQL 17. `compose.yaml` can run PostgreSQL locally if Docker is installed. Set a private POSTGRES_PASSWORD before `docker compose up -d db`. An existing PostgreSQL installation also works.

1. `npm ci`
2. Copy `.env.example` to `.env.local`; replace placeholders privately. Generate AUTH_RATE_SECRET with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never send secrets in chat or commit them.
3. Set MIGRATION_DATABASE_URL to the database owner's connection and run `npm run db:migrate`. This explicitly loads `.env.local`.
4. As the owner in psql: `CREATE ROLE shopora_app LOGIN;`, then `\password shopora_app` interactively. Apply `database/app-role-grants.sql`. DATABASE_URL must use this limited role against the SAME database.
5. Import existing data following the migration guide. There is no automatic production seed and no destructive reset command.
6. Configure Mailgun for real verification/reset emails. Run `npm run dev`; open http://localhost:3000. Local AUTH_APP_ORIGIN must be exactly that origin.

`npm test` uses isolated PGlite databases and no hosted account or real emails. `npm run lint`, `npm run typecheck`, and `npm run build` check source and production compilation. `npm start` serves a conventional build; the Docker image starts `server.js` from the standalone build.

## Important release boundary

Implementation tests use synthetic users/data. The real customer database has NOT been exported, imported or changed. DevOps must rehearse and reconcile the real migration, verify mailbox delivery and optional Google login on staging, exercise browser workflows and test a backup restore before switching DNS. Existing accounts retain their original UUIDs; old passwords and sessions are deliberately not imported. Verified customers use Forgot password to choose a new password; unverified customers use confirmation/resend. Do not create replacement accounts or merge ownership by an untrusted email.

Hosting, PostgreSQL storage, backups, email delivery and domains may incur charges. This project makes no promise of permanently free hosting.
