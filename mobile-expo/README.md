# Shopora Expo mobile app

Native React Native screens built with Expo SDK 57 and Expo Router. This is the primary mobile app; `mobile-android` is the older WebView prototype, and `/app` remains the optional installable website.

## Run on an Android phone

1. Install Expo Go on the phone.
2. In this folder run `npm ci`, then `npx expo start --lan`.
3. Keep phone and computer on the same Wi-Fi. Scan the terminal QR code using Expo Go. If LAN access is unavailable, use `npx expo start --tunnel` (requires the tunnel dependency and internet).
4. Sign in using the website's existing email/password, then test the shared cart using `../MOBILE-TEST.md`. Existing Google-only users need to set an email password through the website first.

The website must deploy `/api/mobile/config` and bearer-token support in `/api/orders` before starting the app. The configuration endpoint exposes only the same public Supabase URL and anonymous key used by the website. Database row-level security protects customer carts. No Mailgun keys or service-role keys belong in the app.

## Shared API and order flow

- Supabase Auth: existing customer accounts and persistent session via AsyncStorage.
- Products and shipping: same public Supabase REST endpoints as the website; shipping is read from the database.
- Cart: same `cart_items` table, `change_cart_item` RPC and account-filtered Supabase Realtime subscription. Authenticated carts update in both directions without manual refresh while online. Resume/reconnect fetches current server state. The app requires sign-in for cart changes.
- Orders: same website `POST /api/orders`, with a verified bearer access token. Totals, shipping, commission snapshots and cart cleanup remain on the server. Customer and owner emails continue through the existing server flow. Payment stays pending/manual; Paystack can be added there later.

## Build an installable Expo APK

With an Expo account, run `npx eas-cli@latest login`, then `npx eas-cli@latest build --platform android --profile preview`. EAS may prompt to associate the project and generate Android signing credentials. The preview profile creates an internally distributed APK. Production builds use the production profile. No build has been submitted automatically, and no store publication is configured.

Use the owner’s existing Google-connected Expo login. Shopora must be its own EAS project (`shopora-mobile`) under that existing login, separate from every OHealth project. Do not create a separate Expo login or modify any OHealth project. An Expo account/organization owner name is not a project ID; verify the Shopora slug and its own EAS project UUID before building. APK testing will be performed by a friend with a physical Android phone. Share the eventual Expo build install link with the friend; unlike the LAN development QR, an installed APK does not require the laptop or its Wi-Fi. `.easignore` restricts uploads to mobile source and excludes environment files, local build output and account screenshots.

## Validation

Run `npm run typecheck`, `npm run lint`, `npx expo-doctor`, and `npx expo export --platform android`. Physical phone login and cross-device synchronization still require a recorded test; a successful bundle does not establish those results.

## Native design milestone (October 2026)

Shop now uses the website's cream, peach, green, and gold palette, reusable rounded controls, serif headlines, a two-column product grid, category chips, search, and price sorting. A product detail route displays the actual catalogue photo, description, price, quantity, and shared-cart actions. Cart, checkout, and account use the shared design tokens in `src/lib/theme.ts`. System serif fonts are used for now; exact website font files are not bundled.

The catalogue supports pull-to-refresh, retry, resume refresh, and loading/empty states. Failed refreshes preserve the last loaded products. Product photos have an unavailable-photo fallback. Products not found in the active catalogue cannot be added from the detail screen.

### Acceptance checklist for this milestone

- Open on a small Android phone and an iPhone; check headline wrapping, product grid, tab bar, and large text settings.
- Search by product name, description, and category; choose category chips and both price sort directions.
- Open a product, change quantity, sign in if needed, add to bag, and check the bag count and website cart.
- Check the 50-item quantity limit, failed cart mutation, and unavailable-product route.
- Pull to refresh and retry after a connection failure; verify product photo fallback.
- Follow the seller website link and check that errors are shown when it cannot open.
- Complete a controlled checkout only when authorized; do not use a real paid order for UI testing.

### Remaining production work

Native seller submission, account registration/recovery and browser OAuth deep links, account-backed favourites, protected order history/tracking, push notifications, verified payments, account deletion, privacy/store materials, physical-device acceptance, and signed EAS builds remain planned. Seller submission still opens the website. This milestone does not make the app store-ready or publish an APK.

## Linked EAS project

Shopora has its own project at https://expo.dev/accounts/ohealthltd/projects/shopora-mobile, with project ID `b8cfe4e5-5026-4fc9-a366-77e38c8eac87`. Expo reports the existing Google-connected login’s username/owner namespace as `ohealthltd`; this is not an OHealth project link. Keep this Shopora UUID, slug, and Android package distinct from all OHealth projects. Use the preview profile to build the APK.

## First APK build

EAS build `174f21dd-8a5c-4c58-bcad-6d698b0630cf` was submitted using the preview profile: https://expo.dev/accounts/ohealthltd/projects/shopora-mobile/builds/174f21dd-8a5c-4c58-bcad-6d698b0630cf. Check the EAS status before sharing an install link; submission does not mean build success. The repository-root `.easignore` now explicitly includes the `mobile-expo` directory itself as well as its contents, which is needed for the Windows archive copier. Local archive inspection confirmed 23 app files and no environment files or signing keys.

Build `174f21dd-8a5c-4c58-bcad-6d698b0630cf` finished successfully. APK: https://expo.dev/artifacts/eas/Np0c8wsnuy6vw4DgN9Qow0LquPqtjHEKg5mkosgi_pY.apk. Version 1.0.0 (1), package `com.makatechlimited.shopora`. The EAS artifact expires October 18, 2026; preserve a local copy for testing. Physical-device acceptance remains pending.

## Google sign-in update (1.0.1)

The Account tab now opens Supabase Google OAuth in the system browser, exchanges the returned code using PKCE, and stores the same Supabase session used by email login and shared carts. Add `shopora://auth/callback` and `shopora-test://auth/callback` to Shopora Supabase Auth Redirect URLs. Google must remain enabled on the same Supabase project as the website. Browser preview OAuth additionally needs its exact local callback URL allowed. Expo Go cannot substitute for testing the standalone APK custom scheme.

Build the `preview` profile to update the original app (same package and signing credentials); 1.0.1 has Android versionCode 2. Seller submission and private payout details remain on the website opened by the app. `node --test tests/oauth.test.cjs` verifies duplicate callback handling and rejected callbacks. Full Google sign-in and cart acceptance on a physical phone remain pending.

## Android compatibility and tester installation

Expo SDK 57 supports Android 7 (API 24) and newer. The universal APK includes armeabi-v7a, arm64-v8a, x86, and x86_64; it cannot be installed on iPhones or Android versions below 7. Device security policy can still block installation.

Use `eas build --platform android --profile testing` for a standalone tester APK named **Shopora Test**, package `com.makatechlimited.shopora.testing`. This uses the same Shopora Expo project and backend, but installs alongside an older Shopora APK to avoid update signing conflicts. The production/preview package remains unchanged. This does not bypass Play Protect, and physical installation, login, and cart synchronisation must still be tested.

## Local browser preview

After exporting the React Native web bundle (`npx expo export --platform web`), run `python scripts/preview.py` and open http://localhost:8083. The loopback-only server serves `dist` and relays Shopora config, product images, and order API calls to the live website so browser cross-origin restrictions do not block the preview. It changes the website origin only in served JavaScript; native source and APK are unchanged. Catalogue browsing was verified with 47 live products. User sign-in/cart use the real Supabase project, and checkout creates real orders. Stop the terminal process to stop the preview. Browser testing does not validate APK installation or Android-native behavior.
