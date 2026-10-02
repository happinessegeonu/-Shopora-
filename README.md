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

Checkout creates a `payment_pending` order, then shows the UBA transfer instructions and order reference. When Mailgun is configured, the confirmation email repeats the account and items subtotal. Delivery fees and the final payable amount must be confirmed separately before the customer transfers. Orders are not automatically verified or marked paid; confirm transfers and update order status through an authorized operations workflow before fulfillment. The supplied catalog has no inventory counts, so product stock is left untracked (`null`) until real counts are entered in Supabase.

## Important environment values

`NEXT_PUBLIC_STORE_CURRENCY` controls storefront display; `STORE_CURRENCY` controls email formatting. They should use the same ISO 4217 currency code. Prices in the starter seed data are NGN in minor units (kobo).

## Sellers

The `/sell` page lets signed-in users upload a product photo, submit store/contact details and pricing, and track their submissions. Run `supabase/sellers.sql` once to create the submission table, row policies, and `seller-products` image bucket. This migration has been applied to the Shopora production project.

Submissions begin as `pending`. Review them in Supabase's `seller_listings` table. Confirm product details, fulfillment, delivery fees, and settlement with the seller before approving. The transaction example at the end of `sellers.sql` publishes the product into the existing checkout catalogue and marks the submission approved. Changing only the status does not publish it. Seller payouts are handled manually; checkout continues to use Shopora's bank transfer process.

Product images use the original photos supplied in website-images.zip, with consistent contain sizing in the catalogue, hero, and checkout. Existing filenames remain stable for the Supabase catalogue. The extracted ZIP is an ignored local reference.

## Deployment

Vercel is connected to the `happinessegeonu/-Shopora-` GitHub repository. Pushing a commit to `main` triggers a new deployment.
