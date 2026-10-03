# Shopora Android app

Native Android WebView shell for the deployed Shopora mobile UI. This is not a separate native catalogue implementation: it deliberately shares website authentication, product, cart and order APIs. Requires internet, Android 8+, and email/password login using the existing website account. The APK has its own cookie/session storage; signing in on the website does not automatically sign in the APK.

Google login is unavailable inside the Android shell. Use email/password. A future external-browser OAuth/deep-link integration is required to support Google-only accounts in the APK.

The GitHub workflow builds and lints a debug APK. Download Shopora-Android-APK from the successful Actions run. It is for assignment testing, not a signed Play Store release.

To build locally: install Android Studio/SDK 35, JDK 17, and Gradle 8.9, then run `gradle assembleDebug lintDebug` in this directory. Build output: `app/build/outputs/apk/debug/app-debug.apk`.

Install the APK on your physical Android phone and follow ../MOBILE-TEST.md. Physical testing is pending. No Android SDK/JDK was available on the development computer.
