# Release and Free Distribution

## GitHub Release APK

1. Build the APK with the preview profile in `BUILD_APK.md`.
2. Create a GitHub repository without committing `.env`.
3. Create a GitHub Release and upload the APK as an asset.
4. Share the release download URL.

Android users install the APK after enabling **Install unknown apps** for their browser or file manager.

## Updating the app

1. Increase `versionCode` in `app.json`.
2. Update the version string if needed.
3. Run `eas build -p android --profile preview`.
4. Upload the new APK to a new GitHub Release.

For Google Play, use the production `.aab` and keep the same Android package name and signing credentials.
