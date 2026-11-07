# Controlled legacy data migration

The new application runs on ordinary PostgreSQL. These tools read the existing backend only for export; they never modify or delete it. No real export or import has been performed. DevOps needs a read-only source PostgreSQL credential with access to auth.users, auth.identities and the old public commerce tables, plus a private owner/migration credential for the new database. No Supabase SDK or Auth service is required by the new website.

## Preserve and rehearse

1. Make an encrypted, restorable backup of the original database and seller storage. Restrict local export directories/ACLs; exports contain addresses, phones and bank account details. They must not enter Git or the handoff ZIP. `private-migration/` is ignored.
2. Freeze old-site writes for the FINAL export. A read-only snapshot is consistent at its export time, but it cannot include later orders. Do not run both old and new sites as independent writable shops during cutover.
3. With SOURCE_DATABASE_URL privately injected, run `node scripts/export-legacy.mjs private-migration/source.json`. The exporter uses a repeatable-read read-only transaction. It exports original UUIDs, emails, verified timestamps, authoritative Google subjects, and every required commerce table. It excludes password hashes/session secrets. Missing tables or inaccessible auth data cause failure; do not substitute public-only data.
4. On an isolated empty target, apply schema via `node scripts/migrate.mjs` using MIGRATION_DATABASE_URL. No production seed is automatically applied.
5. Run `node scripts/import-legacy.mjs private-migration/source.json`. Default is a full transactional import rehearsal followed by rollback. It refuses a non-empty target, missing tables, duplicate/missing emails, ID/constraint violations, count differences or changed historical order totals. Review errors privately; never delete or skip an incompatible record to make counts pass.
6. After reviewing results, run the same import with `--apply`. It commits all records atomically and prints only aggregate counts. It preserves ownership UUIDs and all mapped commerce columns. The new customer_phone field maps the legacy sender_phone. Historical totals/shipping remain unchanged. Keep the original protected export/backup as evidence for any historical fields not used by the new schema.
7. With MIGRATION_DATABASE_URL and exact LEGACY_STORAGE_HOST, run `node scripts/migrate-media.mjs`. This copies public seller photographs to bytea records in the new database and rewrites matching listing/catalog URLs. It allows only HTTPS and the approved legacy seller-products path/hostname, forbids redirects and bounds downloads to 5 MiB. Re-running skips completed images; a failure stops unresolved images from silently disappearing. Check images and query for any remaining old-host URLs before retiring old storage.
8. Reconcile users, carts, products, shipping, orders, order lines, reviews, seller listings, payout accounts and commissions against the source. Validate full source/destination row content where needed, not just counts. Restore a backup into a separate environment and exercise representative imported customer/seller accounts.

## Accounts and passwords

Original user IDs remain the account IDs in shopora_auth.users, so foreign-key ownership is preserved. No email-only ownership remap is performed. If duplicate or missing source emails exist, stop and resolve them with verified owner involvement rather than merging accounts automatically.

Existing passwords are NOT copied or treated as usable hashes. Verified email accounts use Forgot password to choose a new 15-character passphrase through a single-use email link; unverified accounts use registration/resend confirmation. Imported Google subjects map directly to the original UUID, so existing Google-only accounts can use Google once OAuth is configured. Sessions are never imported; everyone signs in again. No invitation emails are sent automatically by these scripts.

The importer assumes the schema represented by the repository's legacy SQL. Run the rehearsal on the actual source: pre-existing extra fields, unusual historical constraints, missing identities or storage objects require DevOps reconciliation. The controlled importer and its tests do not certify an unseen production export.

## Retirement

Only switch the application/domain after staging acceptance, final frozen-source import, reconciliation and backup/restore verification. Keep the old database/storage intact and read-only for the agreed rollback period. No deletion script or automatic cutover is included. No managed authentication provider needs to be created.
