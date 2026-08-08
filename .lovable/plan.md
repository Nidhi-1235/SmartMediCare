## SmartMediCare — Android app (Capacitor wrapper)

Flutter isn't available on this platform, and rewriting the app in Dart would mean throwing away the working SmartMediCare app and losing the preview. Instead, the fastest real path to an installable Android APK is to wrap the existing app in a native Android shell using Capacitor.

You still get: a real APK, app icon, splash screen, native camera, native text-to-speech, local notifications and vibration — and every AI feature (label scanning, prescription reading, safety checks, voice assistant) keeps working because the secure server stays in place.

### What gets added

1. **Capacitor setup**
   - App id `app.lovable.smartmedicare`, app name "SmartMediCare".
   - `capacitor.config.ts` pointing at your published URL so the APK always shows the latest version without rebuilding.
   - Android platform scaffolding under `android/`.

2. **Native plugins**
   - Camera — replaces the browser camera on Android with the native picker/capture, with the existing web camera kept as fallback.
   - Local Notifications — dose reminders fire as real Android notifications, even when the app is closed.
   - Haptics — confirmation buzz on dose taken / SOS.
   - Text-to-Speech — native voice for English, Hindi and Kannada, falling back to the browser voice on web.

3. **Platform-aware layer**
   - A small helper that detects native vs web and routes camera, speech and notifications to the right implementation. No screen changes needed — Scan, Schedule, Assistant and Emergency keep their current UI.

4. **Android permissions and assets**
   - Camera, notifications, vibration, internet permissions in the manifest.
   - App icon and splash generated from the existing PWA icons.

5. **Build instructions**
   - A short `ANDROID.md` with the exact commands to export the project to GitHub, install dependencies, add the Android platform, and build/run the APK in Android Studio.

### Important note about building

I can add all the Capacitor configuration and native code paths here, but the actual APK has to be compiled on your machine (or a CI runner) with Android Studio and the Android SDK — that step can't run inside Lovable. The `ANDROID.md` guide will walk through it, and it's roughly: export to GitHub → `npm install` → `npx cap add android` → `npx cap sync` → open in Android Studio → Build APK.

### Technical notes

Capacitor loads the published site through `server.url` rather than bundling a static `dist/`, because the AI features run in server functions that hold the API key. Bundling a static build would either break those four features or expose the key inside the APK. Plugin calls are guarded with `Capacitor.isNativePlatform()` so the same codebase still runs correctly in the browser preview.
