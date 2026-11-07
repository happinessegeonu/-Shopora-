# Try Shopora before the DevOps handoff

Use the `codex/website-review-preview` branch. This preview has its own synthetic product catalogue and local embedded PostgreSQL database. It never imports customer data or connects to production, Supabase, Neon or a paid authentication provider. It does not deploy the website or change DNS.

## On your computer

Use Node 22.18+ and the website repository root. In PowerShell:

```powershell
git clone --branch codex/website-review-preview https://github.com/happinessegeonu/-Shopora-.git Shopora-Review
cd Shopora-Review
npm ci
npm run preview
```

If you already have this review branch checked out, skip cloning. Open the URL printed by the command (normally `http://127.0.0.1:3037`). Enter the generated **preview access code** shown in the terminal. The code is not a customer password; create your own fictional customer and seller accounts separately. The test inbox and click-through checklist are at `/preview` after unlocking.

No Docker, PostgreSQL installer, email service or environment file is needed for this local preview. The launch script sets a fresh private database socket on loopback. Test data and access code stay under `.shopora-preview/`, which is ignored by Git. Do not run two interactive preview instances against this directory. Press Ctrl+C to stop it; the next start preserves local test data. Do not copy these files into a production deployment.

## Open it on a phone or another computer

A loopback link (`127.0.0.1`) only works on the computer running Shopora. For a temporary HTTPS link on Windows x64, stop the local preview first, then run:

```powershell
npm run build
node scripts/download-preview-tunnel.mjs
npm run preview:public
```

The download helper verifies the official Cloudflare release asset SHA-256 and saves it inside the ignored preview directory. Other operating systems can install `cloudflared` from Cloudflare and set CLOUDFLARED_PATH to its executable. The tunnel exposes only the built, access-code-protected preview HTTP server. Its database socket remains local and is never published. Copy the printed `https://…trycloudflare.com` URL and the access code to your phone. The computer and the terminal process must remain running; closing or sleeping the computer, a tunnel outage, or restarting the tunnel can invalidate the URL. Do not share the code publicly.

If the network blocks the tunnel, use the desktop-only preview above. Your engineer can run the same commands on a separate test machine with outbound tunnel access. Do not point a tunnel at the live store or connect a production database. [Cloudflare Quick Tunnel instructions](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## What is simulated

- **Email:** messages are stored in the shared preview inbox. Nothing goes to a real email address. Use an address such as `customer1@example.test` or `seller1@example.test`; use `owner@example.test` to inspect the simulated owner order copy. Everyone who has the preview access code can look up fictional mail. This is a test mail catcher, not production email privacy.
- **Payments and deliveries:** checkout saves a test order only. No real transfer account is displayed in a test receipt or test email; do not transfer money. No stock, real order or payout is changed outside the preview. A submitted listing stays pending until staff approval; no automatic publication or payment is simulated.
- **Google:** intentionally disabled in this preview. Email authentication is Shopora-owned; live Google consent/callback and Mailgun delivery need separate approved staging credentials and are not represented as tested here.
- **Newsletter/support links:** these are ordinary mail-client links, not an in-app subscription or live support simulator. Do not send real mail during testing.

## Click-through checklist

| Click | Expected result |
|---|---|
| **Create account / sign in → Create account**, enter `customer1@example.test` | A verification message appears in the simulated inbox. No usable password is set before opening that link. |
| **Test checklist & inbox → Refresh test inbox → Open this test email link** | Choose a password of at least 15 characters. Short/mismatched passwords are rejected; a valid pair saves. Resend creates a new link and invalidates the old one. |
| **Sign in**, reload, then **Sign out** | Correct credentials work; incorrect ones fail. Reload keeps the session; sign out removes it. |
| **Forgot password?**, then open the newest reset message | Choose a different password. Old password and old sessions stop working. A used reset link cannot be reused. |
| **Open shop → Search Selena → Perfumes / Wigs → Sort by → Clear filters** | Search/category results change, price order matches the selection, and an unmatched search offers Clear filters. |
| **Add Selena to bag → + / − → close → reload** | Quantities update, zero removes the line, and the signed-in bag follows the account. A guest bag is separate. |
| **Continue to checkout**, fill fictional fields, choose **Lagos**, optionally check **I’m receiving this order** | Receiver fields are copied from sender when selected. Missing delivery/invalid details prevent checkout. Shipping and total appear before placing the order. |
| **Place order → Your orders**, then inspect the inbox | Test reference and correct total appear. The purchased items are removed. Customer and owner get separate simulated copies. No money is taken. |
| Create `seller1@example.test` in a private window → **Sell** → **Save payout details** | Invalid numbers fail. A fictional 10-digit number such as `0001234567` saves and reloads with its leading zeros. |
| **Submit for review**, with a JPG/PNG/WebP test photo and commission checked | A listing appears in Your products as Awaiting review. Invalid photo or incomplete form is rejected. |
| Switch between the two accounts and visit Bag, Your orders and Sell | Each account sees only its own private data. A second account cannot claim another seller's uploaded photo. |
| Open the same preview on your phone | Navigation, form fields and scrolling should be usable. Try the mobile navigation button and the bag separately. |

Use the feedback form on `/preview`, or paste the following into our chat: **device/browser, account type, steps, expected result, actual result**. Saved preview feedback stays in the local sandbox; it is not sent to GitHub, DevOps or email. Do not include passwords or real personal information. Review and report issues before the production handoff.

## Reproduce automated checks

`npm test` runs service/SQL and handler tests. `npm run test:browser` starts its own disposable in-memory database and isolated preview on port 3038, runs headless Playwright, and stops it. To reproduce the verified built-site run, run `npm run build` followed by `npm run test:browser -- --built`. Windows uses installed Microsoft Edge; on Linux install Playwright Chromium (`npx playwright install chromium`) and run the same command. No browser history, cookies or credentials from your normal browser profile are used. Browser traces and screenshots are ignored by Git. See `docs/REVIEW-TEST-RESULTS.md` for the latest evidence and limits.
