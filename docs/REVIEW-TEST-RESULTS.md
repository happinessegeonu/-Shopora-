# Website review results — 7 November 2026 (Africa/Lagos)

Scope: `codex/website-review-preview`, website only. All accounts, orders, bank details, uploads and messages used for this run were synthetic. The preview used a disposable embedded PostgreSQL (PGlite) database through the actual Node PostgreSQL driver and Next.js standalone application. Separate browser contexts isolated the customer and seller sessions. No live site, production database, DNS, Mailgun mailbox, Google account, or payment service was changed or used for test data.

## Results on the review branch

| Check | Evidence |
|---|---|
| Service, SQL and route tests | `npm test`: **20 passed, 0 failed**. Includes email challenge expiry/use, hashed sessions, rate limits, authorization, safe legacy mapping with synthetic data, order prices/stock/commission, and restricted database roles. |
| Browser scenarios | `npm run test:browser -- --built`: **4 passed, 0 failed**, headless Microsoft Edge using the production standalone build and fresh synthetic database. |
| Account creation and verification | Browser creates fictional account, reads simulated mail, opens link in the same tab, rejects login before verification, rejects a mismatched password, saves a valid password. Resend invalidates the earlier token. A non-test address is rejected in preview. |
| Login, logout and session lifecycle | Wrong password fails. Correct sign-in persists on reload. Signing out revokes that browser's session. Password reset revokes the second browser's existing session, rejects the old password and a reused token, and accepts the new password. Cross-origin logout returns 403. |
| Customer shopping | Desktop: Selena search, no-match message, clear filters, category filters, collection navigation, both price sorts, add/increment/decrement/close/reload bag, and same-account bag in a second tab. Guest bag add/remove also tested. |
| Checkout and emails | Checkout disabled until a delivery state is selected; receiver toggle uses sender details. Lagos shipping + Selena total ₦65,000. Simulated connection failure offers retry; replaying the same checkout key returns the original order without duplicate order/email. Purchased items disappear from the cart. Unsupported state rejected. Customer and owner simulated messages contain order details. No real bank instructions displayed in the test receipt. |
| Private account, cart and order access | Cookie session returns only the signed-in user. An independent account sees an empty cart/order list and gets 404 when requesting the other account's actual order reference. Signed-out cart/orders/listings/payout APIs return 401. |
| Seller login, listing and photo | Phone-sized browser opens mobile navigation, signs in from the seller prompt and returns to Sell. Valid JPG submission appears Awaiting review. Commission consent must be checked. Invalid photo rejected; another account cannot attach the seller's photo. |
| Private seller bank details | Invalid account number rejected; a fictional number with leading zeros is saved and survives reload. Another account cannot read it by supplying the seller ID or overwrite it with a forged owner field. |
| Reviews | Signed-in review submission succeeds and remains unpublished while awaiting moderation; anonymous submission rejected. |
| Responsive/navigation | Checked `/`, `/app`, `/sell`, `/checkout`, `/account`, `/orders` and `/preview` at 360 px, and the seller workflow at 390 px. No horizontal document overflow in the checked states. Seller sign-in routing, dialog Escape, empty guest bag and 404 page exercised. This is browser viewport emulation, not a physical-phone test. |
| Build and static smoke | `npm run build` and `npm run typecheck` passed. Standalone homepage and key pages/assets HTTP 200, www redirect 308, cross-origin login 403, disabled auth fails closed, and `/preview`, `/preview-access`, `/api/preview/inbox` return 404 with preview mode off. |
| Lint | `npm run lint`: 0 errors, 3 existing image optimization warnings. |
| Temporary public HTTPS link | Verified reachability, health, access-code gate, blocked unauthenticated catalogue/inbox, synthetic catalogue, captured verification link with the correct HTTPS origin, secure login cookie and logout revocation. This is a temporary tunnel to the isolated local application, not a Railway or production deployment. |

## Fixes and retests

- Added private order history and confirmed a second account cannot read a known order reference.
- Fixed same-tab verification/recovery links so hash-only navigation opens the password form and strips the token from the address bar without destroying browser navigation state.
- Fixed the missing narrow-screen menu and the preview banner intercepting the bag close button. Retested the corresponding navigation and bag actions.
- Removed an unreachable second checkout form. Added a receiver shortcut, clear network-error feedback and checkout retry protection. Added `checkout-requests.sql` as a new migration, without editing the original applied migration files.
- Added the isolated access-code gate, test inbox and review checklist. The test sandbox refuses non-`@example.test` account/checkout emails, never sends real mail, and has no payment action. Test database credentials and user data are not checked into Git.
- Fixed the preview test database connection contention and the tunnel URL selection. Browser and HTTPS checks use the final implementation.

## Pending and prerequisites

- **Your review on a physical phone and computer.** Use the temporary link or [start an isolated preview](TEST-PREVIEW.md). Try the checklist and report issues before DevOps proceeds. Other browsers (especially Safari/iOS), real device keyboard/touch behavior and PWA installation were not tested.
- **Real delivery of email.** Mailgun SMTP/API credentials, verified sending-domain DNS and dedicated staging inboxes are required. The preview tests prove message capture, link handling and message contents, not inbox delivery or spam placement.
- **Optional Google login.** Disabled in the preview. It needs a staging Google OAuth client and a registered HTTPS callback. Live consent and callbacks were not tested.
- **Real production data migration.** The importer was tested with synthetic rows only. DevOps needs an authorized read-only export, a private target PostgreSQL database, a restorable backup and a full reconciliation rehearsal. Real data was not accessed or changed.
- **Railway/Linux and domain.** DevOps still needs to build/run the Linux image on Railway, apply migrations and least-privilege grants on a real PostgreSQL server, test HTTPS/backup restoration/load behavior, and configure `maketechlimited.com` DNS. Embedded PostgreSQL does not prove multi-process production locking or capacity.
- **Payments, delivery, publication and settlement.** Bank transfer is manual in production; Paystack is deferred. No money, package delivery, listing approval, payout verification or seller settlement was performed. Test listings stay pending. Newsletter/support are mail-client links and no messages were sent through them.
- **External services and native app.** Legacy native APK and external mail-client behavior are outside this website review. No native app update or deployment was made.

[Preview instructions and checklist](TEST-PREVIEW.md) · [Railway and domain runbook](RAILWAY.md) · [Data migration guide](../database/MIGRATION.md)
