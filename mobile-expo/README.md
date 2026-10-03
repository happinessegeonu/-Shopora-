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

The owner has requested a separate Shopora Expo account: do not link or build this project under either ohealth account. The owner will complete account signup. APK testing will be performed by a friend with a physical Android phone. Share the eventual Expo build install link with the friend; unlike the LAN development QR, an installed APK does not require the laptop or its Wi-Fi. `.easignore` restricts uploads to mobile source and excludes environment files, local build output and account screenshots.

## Validation

Run `npm run typecheck`, `npm run lint`, `npx expo-doctor`, and `npx expo export --platform android`. Physical phone login and cross-device synchronization still require a recorded test; a successful bundle does not establish those results.
