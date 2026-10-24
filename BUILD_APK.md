# Build an Android APK

## EAS preview APK

From PowerShell:

```powershell
cd D:\Claude\todo-list-test
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Choose the existing EAS project if prompted. The `preview` profile in `eas.json` produces an installable APK. Download the APK from the build URL and install it on Android. Enable **Install unknown apps** for the browser or file manager used to open it.

The app reads `EXPO_PUBLIC_` values during the EAS build. Make sure the same Firebase and Google OAuth values are configured in the EAS environment, or use an EAS project environment with those names before building.

## Production bundle

For Google Play, create an Android App Bundle:

```powershell
eas build -p android --profile production
```

Upload the resulting `.aab` to Google Play Console. Play Console requires its own developer registration fee.

## Local fallback

A local Android build requires Android Studio, Android SDK, platform tools, Java 21, and an Android SDK license setup:

```powershell
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

On Windows PowerShell, use `gradlew.bat assembleRelease`. The APK is produced under `android\app\build\outputs\apk\release\`. Back up the signing keystore and passwords; losing them prevents updates to an already distributed app.
