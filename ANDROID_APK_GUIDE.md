# Android APK Build Guide (Capacitor)

## What Was Set Up

- Capacitor packages installed in this frontend project.
- Android native project created at `android/`.
- Capacitor config file created at `capacitor.config.json`.

## Important Before Build

Update the app URL in `capacitor.config.json`:

- Replace:
  - `https://your-frontend-domain.vercel.app`
- With your real deployed frontend URL.

Example:

```json
"server": {
  "url": "https://your-real-app.vercel.app",
  "cleartext": false
}
```

## Commands

Run from the frontend folder.

1. Sync config/assets to Android project:

```bash
npm run cap:sync
```

2. Open Android Studio project:

```bash
npm run cap:open
```

## Build APK in Android Studio

1. Wait for Gradle sync to finish.
2. Click Build > Build Bundle(s) / APK(s) > Build APK(s).
3. After build completes, click "locate" in the popup.

Typical APK output path:

- `android/app/build/outputs/apk/debug/app-debug.apk`

## Install APK on Phone

1. Copy `app-debug.apk` to your Android phone.
2. Open the APK file on phone.
3. Allow install from unknown sources if prompted.
4. Install and launch.

## Optional Release Build

For Play Store upload, build AAB instead of debug APK:

- Build > Generate Signed Bundle / APK
- Choose Android App Bundle (AAB)

You will need signing keystore setup for release.
