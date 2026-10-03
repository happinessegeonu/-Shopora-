# Physical phone acceptance test

Status: pending. Browser emulation is not physical-phone verification.

## Expo app (primary mobile app)

1. Install Expo Go on the Android phone. Start the app from `mobile-expo` with `npx expo start --lan` and scan its QR code in Expo Go. Keep both devices on the same Wi-Fi, or use a tunnel.
2. Sign in under Account with the same email/password as the desktop website. If the account uses only Google login, set a password on the website first.
3. Open Cart in Expo and the bag on the website. Wait for both to say “Cart sync connected”. Add an item on the website and record that Expo displays it without refreshing, including quantity and approximate delay.
4. Increase, decrease and remove an item in Expo; record the corresponding website changes without refresh. Rapidly add from both devices and check the final server quantity matches both views.
5. Close and reopen Expo Go: confirm login and cart persist. Sign out and sign in with another account; ensure the previous cart is absent. Repeat for a second customer's own cart.
6. Disconnect and reconnect the phone; verify attempted offline changes show an error and reconnect brings the cart back to the server state.
7. Record Android model, OS, Expo Go version, date, screenshots and pass/fail below. Do not submit a real order or payment just for the cart test.

Expo phone model / OS / Expo Go version: pending
Same-account login: pending
Website → Expo cart: pending
Expo → website cart: pending
Persistence / account isolation / reconnect: pending

## Optional installed website / older WebView prototype

1. On your phone open https://shopora-amber.vercel.app/app. Install Shopora using the browser menu on Android, or Safari Share → Add to Home Screen on iPhone.
2. Open the installed app and sign in with your existing Shopora email/password. Use the same account on the desktop website. Never include passwords in test evidence.
3. Keep both online and open. Confirm both show “Cart sync connected”. Add an item on the website. Check the phone cart updates without reloading. Record the product, quantity and approximate delay.
4. Add the same item on the phone. Confirm the website quantity increases. Decrease the quantity and remove the item; confirm both devices match.
5. Close and reopen the app: confirm account login and cart persist. Switch to a second account and confirm it cannot see the first account’s cart.
6. Disconnect the phone briefly, then reconnect and reopen the app. Confirm its cart refreshes to match the website. Changes attempted offline should show an error, not claim to be saved.
7. Record phone model, OS, browser, date, pass/fail and screenshots of both devices. Do not place a real order or transfer money for this test.

Guest carts are local to a device; sign in before adding items for cross-device sync. Existing guest items are retained locally and are not automatically merged into an account cart.

Also install the Android debug APK from the successful GitHub Actions build and repeat steps 2–7. Use email/password in the APK; Google sign-in currently works only in the browser/PWA. Record APK and PWA results separately. Play Store signing and iOS packaging are not included.
