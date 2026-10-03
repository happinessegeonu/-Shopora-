# Shopora

A responsive Shopora storefront built with Next.js, Supabase, and Mailgun. The supplied catalogue ZIP is unpacked under `public/products`; its Electronics, Wigs, and Perfumes listings and NGN prices are seeded into Supabase by `supabase/schema.sql`.

## Run locally

1. Install Node.js 18.17 or newer and npm.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the Supabase settings.
4. Run `supabase/schema.sql` in the Supabase SQL editor to create the tables, policies, order procedure, and starter products.
5. Start the app with `npm run dev` and open `http://localhost:3000`.

The catalogue has an in-memory fallback when Supabase is not configured. Orders require Supabase; they are never silently stored only in the browser. Product photos are under `public/products`; the separate price screenshots are retained only as ignored local references. If product images or records change, keep the product paths and SQL seed rows in sync.

## Supabase and Google sign-in

- Create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- In Supabase Auth, enable Google and enter the OAuth client ID and secret created in Google Cloud Console.
- In Google Cloud Console, configure the OAuth consent screen and create a Web application client. Add the Supabase callback URL shown in Supabase Auth as an authorized redirect URI.
- In Supabase Auth URL configuration, set the site URL and add local and production app URLs to the allowed redirect URLs (for example `http://localhost:3000/auth/callback`).
- Keep the OAuth client secret in Supabase settings. This app uses only the public anon key in browser/server session code.

The storefront has both Google and email/password sign-in and sign-up. Email is enabled by default for a new Supabase project; set its email confirmation behavior under Authentication settings. For Google, create a Google OAuth Web client and enter its client ID and secret in the Supabase Google provider settings. Google sign-up uses the same OAuth flow as sign-in.

Add your project URL and public anon/publishable key to `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then restart `npm run dev`. Do not use the Supabase service-role key in this file. Run `supabase/schema.sql` in the project SQL Editor to load the catalogue and order procedure.

## Mailgun

Verify a sending domain in Mailgun, configure the domain’s DNS records, then set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`, and `MAILGUN_REGION` in the server environment. Set the region to `EU` for an EU Mailgun domain or `US` for a US domain. The API key is only read by the server route. Without these values, order creation still succeeds but the response reports that email could not be sent.

## Bank transfer checkout

## Zoho inbox and order alerts

Set the server-only `ORDER_NOTIFICATION_EMAIL` to the Zoho mailbox where the store owner wants to receive new orders. Set `ORDER_REPLY_TO_EMAIL` to the business reply address (defaults to the notification address). The existing Mailgun sender delivers the alerts to Zoho; receiving alerts does not require the Zoho password or changing Zoho security settings. This does not change the sending address to Zoho: `MAILGUN_FROM_EMAIL` must remain a verified sender. Customer emails include a reply address for the store, and replying to an owner alert addresses the customer. Both messages include the stored product subtotal, shipping fee, order total, and reference. Sending failures are tracked separately and never invalidate a saved order. `node --test tests/order-email.test.cjs` checks recipient separation, totals, independent failures, and invalid notification settings without sending real emails.

Orders remain `payment_pending`. For manual transfer confirmation, check the bank account for the full amount and matching order reference; an order email or screenshot is not payment verification. Once verified, mark the matching order `paid` through the authorized Supabase order administration workflow and reply to the customer from Zoho. Changing status in Supabase does not automatically send a payment-confirmation email. Automatic bank payment verification requires a separate payment-provider integration.

## Bank transfer details

Paystack integration is deferred. Order creation persists the order and database-calculated totals first, then calls the separate `sendOrderEmails` notification module. Owner alerts go to the server-only `ORDER_NOTIFICATION_EMAIL` (production: orders@makatechlimited.com), with customer contact and delivery details, every item’s quantity, unit price and line total, subtotal, shipping and grand total. The owner can reply directly to the customer to arrange an alternative payment method. A future Paystack adapter should initialize payment against this saved order and use a verified webhook to update payment status; it must not mark an order paid from checkout or email delivery. Keep payment initialization and webhook handling separate from order persistence and notifications, preserving the existing order reference and checkout response fields.

Checkout creates a `payment_pending` order, then shows the UBA transfer instructions and order reference. When Mailgun is configured, the confirmation email repeats the account, items subtotal, shipping fee, and combined total. The total shown at checkout is the amount to transfer. Orders are not automatically verified or marked paid; confirm transfers and update order status through an authorized operations workflow before fulfillment. The supplied catalog has no inventory counts, so product stock is left untracked (`null`) until real counts are entered in Supabase.

## Important environment values

`NEXT_PUBLIC_STORE_CURRENCY` controls storefront display; `STORE_CURRENCY` controls email formatting. They should use the same ISO 4217 currency code. Prices in the starter seed data are NGN in minor units (kobo).

## Sellers

The `/sell` page lets signed-in users upload a product photo, submit store/contact details and pricing, and track their submissions. Run `supabase/sellers.sql` once to create the submission table, row policies, and `seller-products` image bucket. This migration has been applied to the Shopora production project.

Submissions begin as `pending`. Review them in Supabase's `seller_listings` table. Confirm product details, fulfillment, delivery fees, and settlement with the seller before approving. The transaction example at the end of `sellers.sql` publishes the product into the existing checkout catalogue and marks the submission approved. Changing only the status does not publish it. Seller payouts are handled manually; checkout continues to use Shopora's bank transfer process.

Product images use the original photos supplied in website-images.zip, with consistent contain sizing in the catalogue, hero, and checkout. Existing filenames remain stable for the Supabase catalogue. The extracted ZIP is an ignored local reference.

Run `supabase/order-recipient-details.sql` when deploying the sender and recipient checkout fields to an existing database.

## Deployment

Vercel is connected to the `happinessegeonu/-Shopora-` GitHub repository. Pushing a commit to `main` triggers a new deployment.

## Customer reviews

Run `supabase/reviews.sql` once in the Supabase SQL editor to enable the homepage review section. Signed-in customers can submit a public name, star rating, and review. Submissions are hidden until you set `approved` to `true` in the `reviews` table editor. The homepage displays the 12 latest approved reviews. Customers cannot approve or edit reviews through the public client.

## Google search discovery

The search metadata, `/robots.txt`, and `/sitemap.xml` use the public address `https://shopora-amber.vercel.app`. Deploy these changes before submitting the site to Google Search Console. Add a URL-prefix property for this address, choose HTML-tag verification, and set `GOOGLE_SITE_VERIFICATION` in Vercel to only the verification tag's content value. Redeploy, verify ownership in Search Console, submit `sitemap.xml`, and use URL Inspection to request indexing of the homepage. Google controls indexing and ranking; submission does not guarantee inclusion. Update the site URLs in the layout, robots, and sitemap files if the domain changes.

## Shipping-inclusive checkout

Shipping is NGN 5,000 per order for every Nigerian state and the FCT, as approved by the store owner. Apply `supabase/shipping.sql` before deploying this checkout update, then apply `supabase/shipping-retire-legacy.sql` after the deployment is live. The optional `supabase/shipping-checks.sql` verifies stored totals, quantity handling, Abuja pricing, unsupported destinations, and customer identity, with all test orders and inventory changes rolled back. Manage later fees through `shipping_rates` in Supabase (integer kobo: 500000 means NGN 5000); active states appear in the delivery dropdown. The database calculates both product prices and shipping, stores `shipping_minor` separately, and includes it in `total_minor`. Checkout, bank transfer instructions, and confirmation emails use that authoritative total. Disabling a state removes it from delivery options and rejects new orders for it.

## Phone app and shared cart

The installable PWA is at `/app`. It reuses the website UI, Supabase Auth/project APIs, product/shipping queries and `/api/orders`, so existing accounts and order notifications work unchanged. Apply `supabase/carts.sql` before deployment. Signed-in carts use `cart_items`, authenticated atomic RPC mutations, and Supabase Realtime; the shared `useCart` hook is used by the website, app and checkout. Zero-quantity rows make removals protected realtime updates. Guest carts remain local and are not automatically merged on sign-in. No cart prices are trusted by the order procedure. Reconnect/focus refetches recover missed changes. The service worker provides an offline notice and never caches authenticated pages, carts or API responses. Physical-phone acceptance testing is pending; follow MOBILE-TEST.md. The Android WebView shell is in mobile-android, with a successful debug APK build through GitHub Actions. Email/password is supported in the APK; Google-only login requires a future browser OAuth/deep-link integration. App Store and Play Store publication are not included.

## Seller commission

Apply supabase/commissions.sql for future seller sales. The database snapshots 10% of each approved seller product line, rounded to the nearest kobo, and the seller share separately from shipping. Existing seller-UUID product IDs identify approved seller listings. Shopora-owned products and past orders are excluded. The private seller_commission_report shows zero effective commission for fully refunded/cancelled orders, and payable amounts only after payment and delivery confirmation. Record delivery_confirmed_at after delivery and settled_at after an actual manual payout. No money moves automatically. Reconcile prior payouts and partial refunds manually. Obtain agreement from existing sellers before approving future sales.
