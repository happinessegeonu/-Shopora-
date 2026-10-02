# Shopora Storefront Project Plan

## Goal

Build a production-ready online shop with a product catalogue, cart, checkout, persistent data, Google sign-in, and order confirmation emails.

## Recommended baseline

- **Database and authentication:** Supabase (Postgres + Supabase Auth). This keeps the database and Google OAuth integration together. Neon is a viable Postgres alternative, but would require a separate authentication provider and additional integration work.
- **Email:** Mailgun for transactional order confirmation messages.
- **Google sign-in:** Configure an OAuth client in Google Cloud Console, then register its credentials and redirect URL with Supabase Auth.
- **Payments:** Initial checkout uses manual UBA bank transfer. Orders remain pending until the transfer and final delivery amount are confirmed. Do not collect or store card details in Shopora.
- **Application stack:** Inspect and retain the repository’s existing framework when implementation begins; the current workspace is empty, so no stack is established yet.

## Phases

### 1. Confirm scope and initialize

- Decide the initial product range, currencies, shipping regions, tax rules, and whether checkout requires an account.
- Choose the payment provider and confirm it supports the intended markets.
- Select the frontend/backend framework and hosting target.
- Create the application skeleton, environment-variable conventions, and local development instructions.

**Deliverable:** A runnable application skeleton and documented product/payment decisions.

### 2. Design the data model and access rules

- Define tables for products, product images, categories, inventory, user profiles, carts/cart items (if server-persisted), orders, order items, and payment events.
- Store monetary amounts as integer minor units with an explicit currency; snapshot product name and price onto each order item.
- Add migrations, indexes, foreign keys, and created/updated timestamps.
- Configure Supabase Row Level Security: public users can read active catalogue data; customers can access only their own profile, cart, and orders; privileged mutations run on trusted server code.
- Provide Google OAuth sign-in/sign-up and email/password sign-in/sign-up through Supabase Auth.
- Keep service-role and other secret keys server-side only.

**Deliverable:** Versioned schema and tested authorization policies.

### 3. Build the storefront

- Implement responsive home, category/product listing, product detail, search/filter, and navigation views.
- Show accurate price, availability, and product imagery from the database/storage layer.
- Add accessible loading, empty, and error states.

**Deliverable:** Visitors can browse the live product catalogue across mobile and desktop layouts.

### 4. Add cart and checkout

- Implement add/remove/update quantity and cart persistence (guest cart behavior to be decided in Phase 1).
- Recalculate prices, stock, shipping, and tax on the server; never trust totals submitted by the browser.
- Collect only necessary contact and delivery information, validate it server-side, and create pending orders safely.
- Show the customer the provided UBA transfer account and order reference after the order is saved; also include them in the transactional confirmation email.
- Confirm delivery charges and final amount separately. Provide a protected way to reconcile transfers and update order/payment state before fulfillment.
- If automated payments are added later, use hosted checkout or tokenized payment components and signed, idempotent webhooks.

**Deliverable:** A customer can place a pending bank-transfer order, see instructions and reference, and receive an order email.

### 5. Configure Google authentication

- Create an OAuth consent screen and web OAuth client in Google Cloud Console.
- Register the exact Supabase callback URL as an authorized redirect URI and configure authorized origins for local and production environments.
- Enter the Google client ID/secret in Supabase Auth; configure the site URL and allowed redirect URLs.
- Implement sign-in, callback/session handling, sign-out, and account linking behavior.
- Verify login and logout locally and on the deployed domain; avoid logging tokens or credentials.

**Deliverable:** Google sign-in works with environment-specific, restricted redirect URLs.

### 6. Send confirmation email with Mailgun

- Verify a sending domain in Mailgun and configure the DNS records required for authentication and delivery.
- Store Mailgun API credentials as server-side secrets.
- Send an order-received email after the order is persisted, clearly mark it pending, and include the bank account, reference, items subtotal, and support/contact details.
- Send a separate payment-confirmed update when a transfer is reconciled and the order is marked paid.
- Make email dispatch resilient to retries and prevent duplicate messages with an idempotency key or delivery record.
- Keep email delivery failures from incorrectly reversing a paid order; record status and provide retry/monitoring.
- Use a sandbox/test recipient during development and confirm unsubscribe requirements do not apply to transactional messages unless marketing content is added.

**Deliverable:** Paid orders trigger one correctly rendered transactional confirmation email.

### 7. Admin and operations

- Provide a protected workflow for managing products, prices, stock, and order status, or document the initial use of Supabase tooling.
- Add operational logs for checkout, webhooks, and email delivery without exposing personal or payment data.
- Configure backups, database migrations, production secrets, and basic error monitoring.

**Deliverable:** The shop can be operated and diagnosed after launch.

### 8. Release readiness

- Verify the full journey: browse → cart → Google sign-in (where required) → checkout → persisted pending order → transfer instructions and order email → manual payment reconciliation.
- Check authorization boundaries, input validation, mobile usability, accessibility, and failure/retry paths.
- Deploy to staging first, configure production OAuth URLs, payment webhooks, Mailgun domain, and Supabase settings, then launch.

**Deliverable:** A production deployment with documented configuration and recovery steps.

## Key decisions still needed

1. Which shipping regions, delivery fees, and tax rules apply?
2. Which framework and hosting platform should be used?
3. Should customers be able to check out as guests, or must they sign in?
4. What shipping, tax, and inventory rules apply?
5. Is an admin product/order management screen part of the first release?

## Core acceptance criteria

- Catalogue, cart, customer, order, and payment state are persisted in the database.
- Customers cannot read or modify another customer’s private records.
- Prices and order totals are derived and validated server-side.
- An order is marked paid only after verified payment confirmation.
- Google OAuth works only for configured origins and redirect URLs.
- A persisted order generates an order-received Mailgun email with payment-pending wording and transfer instructions, with failures visible and recoverable.
- Orders are not marked paid until the bank transfer has been reconciled.
- No database service key, Mailgun secret, OAuth client secret, or payment secret is exposed to browser code.
