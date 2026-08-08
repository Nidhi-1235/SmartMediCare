# Building SmartMediCare as an Android app (APK)

SmartMediCare is wrapped with [Capacitor](https://capacitorjs.com), which puts the app inside a real
native Android shell. You get an installable APK with an app icon, splash screen, native camera,
native voice (English / Hindi / Kannada), scheduled reminder notifications and haptic feedback.

The APK must be compiled on your own machine — Android Studio and the Android SDK cannot run inside
Lovable. Everything else is already configured.

---

## 1. Get the code

1. In Lovable, click **GitHub → Export to GitHub**.
2. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd <your-repo>
   npm install
   ```

## 2. Install prerequisites

- [Android Studio](https://developer.android.com/studio) (includes the Android SDK)
- Java JDK 21 (bundled with recent Android Studio)
- Node.js 20+

## 3. Add the Android platform

```bash
npx cap add android
npx cap sync android
```

This creates the `android/` folder. It is generated — you can commit it or regenerate it any time.

## 4. Open and run

```bash
npx cap open android
```

Android Studio opens. Connect a phone with USB debugging on (or start an emulator) and press **Run**.

## 5. Build the APK

In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.

The file lands at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Copy it to a phone and install it. For the Play Store, use **Build → Generate Signed Bundle/APK**
and choose *Android App Bundle* with a signing key you create in the same dialog.

---

## How the app is configured

`capacitor.config.ts`:

```ts
appId: "app.lovable.smartmedicare"
appName: "SmartMediCare"
server.url: "https://dev-my-mobile.lovable.app"
```

The APK loads the published site rather than a bundled offline copy. This is deliberate:

- The AI features (medicine label scanning, prescription reading, safety checks, voice assistant)
  run in secure server functions that hold the API key. A fully bundled offline app would either
  break those features or ship the key inside the APK where anyone could extract it.
- You can publish changes from Lovable and every installed phone gets them instantly — no rebuild,
  no re-install.

If you publish to a custom domain later, change `server.url` in `capacitor.config.ts` and run
`npx cap sync android` again.

## Permissions

Capacitor adds these to `android/app/src/main/AndroidManifest.xml` when you sync the plugins:

| Permission | Used for |
| --- | --- |
| `INTERNET` | Loading the app and calling the backend |
| `CAMERA` | Scanning medicine labels and prescriptions |
| `READ_MEDIA_IMAGES` | Choosing an existing photo from the gallery |
| `POST_NOTIFICATIONS` | Dose reminders (Android 13+) |
| `SCHEDULE_EXACT_ALARM` | Reminders firing at the exact dose time |
| `VIBRATE` | Confirmation buzz on dose taken and SOS |

If a permission is missing after `npx cap sync`, add it manually inside the `<manifest>` tag:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.VIBRATE" />
```

## App icon and splash screen

Source icons are in `public/icons/`. To generate every Android density automatically:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```

Or set them by hand in Android Studio: right-click `app/res` → **New → Image Asset**.

## Native features and their web fallbacks

| Feature | Android | Browser |
| --- | --- | --- |
| Camera | Native camera app | In-page `getUserMedia` preview |
| Gallery | Native photo picker | File input |
| Voice output | Android text-to-speech engine | Web Speech API |
| Reminders | Scheduled OS notifications (work when the app is closed) | Browser notifications while a tab is open |
| Haptics | Native vibration | `navigator.vibrate` |

The switch happens in `src/lib/native.ts` via `Capacitor.isNativePlatform()`, so the same code runs
correctly in the Lovable preview and in the APK.

## Troubleshooting

- **Blank screen in the APK** — check `server.url` matches your live published URL and that the site
  loads in a phone browser.
- **Camera does nothing** — the permission prompt was denied. Clear it in Android Settings → Apps →
  SmartMediCare → Permissions.
- **Reminders never arrive** — allow notifications, and disable battery optimisation for the app.
- **Gradle sync fails** — in Android Studio: **File → Invalidate Caches / Restart**, then re-sync.
