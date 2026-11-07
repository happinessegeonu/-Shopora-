# Authentication code review and integration notes

The supplied docs/OWNED-AUTH.md was read before importing any code. Source files were copied selectively from the ZIP; its package files, patch and instructions were not blindly applied.

The original module was an independent email-authentication prototype. Its account page did not authorize the existing Supabase cart, seller or checkout operations. This handoff connects those operations to the same validated opaque session and removes the Supabase runtime packages and client.

Changes from the supplied module:

- Server APIs derive all row ownership from the session. Browser-supplied IDs cannot select another cart, seller listing or payout account. Price, stock and commissions are computed in a transaction from database records.
- Legacy migration preserves UUIDs, contacts, existing carts/orders and private bank details. Password recovery is used instead of incorrectly treating old hashes as compatible. Source writes/deletions and automatic account merges are forbidden by the tooling.
- Cleanup never deletes unverified users: they may own imported commerce records. It deletes expired authentication records only.
- Password hashing has a bounded per-process concurrency/queue limit. Shared PostgreSQL rate limits, bounded bodies, origin checks and secure production cookies are tested.
- Optional Google login adds verified signed ID tokens, nonce, PKCE and cookie-bound state. Provider subjects are mapped explicitly; email collisions do not silently link accounts.
- Database migrations, restricted runtime grants, health endpoint, Railway container configuration and rollback guidance are included. No production credentials or customer data are packaged.

This is an implementation review and automated functional/security-boundary test pass, not an independent penetration test. Real source migration, actual email/Google credentials, browser acceptance, Linux container execution, multi-process race/load behavior and backup restoration remain DevOps staging tasks. See TEST-RESULTS.md for exact results and limitations.
