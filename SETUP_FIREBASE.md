# Firebase Setup

Daymark uses Firebase Authentication and Cloud Firestore on the free Spark plan. No credit card is required for this setup.

## 1. Create the project

1. Open the Firebase Console: https://console.firebase.google.com/
2. Click **Create a project**.
3. Enter a project name such as `daymark-team`.
4. Keep Google Analytics disabled for this first setup.
5. Click **Create project**.

## 2. Enable email authentication

1. Open the project.
2. Select **Build > Authentication**.
3. Click **Get started**.
4. Open the **Sign-in method** tab.
5. Select **Email/Password**.
6. Enable **Email/Password**.
7. Click **Save**.

## 3. Create Firestore

1. Select **Build > Firestore Database**.
2. Click **Create database**.
3. Choose a location near your users.
4. Select **Production mode**.
5. Click **Create**.

Firestore rules will be added in a later phase before shared data is enabled.

## 4. Register the Android app

1. In Project Overview, click the Android icon.
2. Enter this Android package name exactly:

```text
com.muhiudin.daymarkmobile
```

3. Use `Daymark` as the app nickname.
4. Do not add a SHA-1 yet; it is not needed for email/password authentication.
5. Click **Register app**.
6. Downloading `google-services.json` is optional for the Firebase JS SDK path used here. Do not commit Firebase secrets or downloaded files into this repository.

## 5. Copy the web Firebase configuration

1. In Firebase Console, open **Project settings** using the gear icon.
2. Scroll to **Your apps**.
3. Click the web `</>` icon to register a web app if one is not already present.
4. Name it `Daymark web config`.
5. Click **Register app**.
6. Copy the values from the Firebase configuration object.
7. Create a local file named `.env` beside `package.json`.
8. Copy `.env.example` into `.env` and fill these values:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_oauth_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_oauth_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_oauth_client_id
```

Do not commit `.env`. It is ignored by Git. The `EXPO_PUBLIC_` prefix is required by Expo so the values are available to the app bundle. These client configuration values identify the Firebase project; Firestore rules and Authentication still enforce access.

## 6. Configure Google sign-in client IDs

Enabling Google in Firebase is necessary but does not automatically give Expo the OAuth client IDs.

1. Open **Google Cloud Console > APIs & Services > Credentials** for the same Firebase project.
2. Create or locate a **Web application** OAuth client and copy its client ID into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
3. Create an **Android** OAuth client using package name `com.muhiudin.daymarkmobile`.
4. Add the SHA-1 certificate fingerprint for the Android build you will install. EAS and local release builds can have different certificates.
5. Copy that client ID into `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.
6. Add an iOS client only when an iOS build is needed.
7. Restart Expo after editing `.env`.

If the client IDs are absent, the Google button remains visible but explains that OAuth setup is incomplete instead of failing silently.

## 7. Start the app with Firebase enabled

From the project folder:

```powershell
npx expo start -c
```

The auth screen should now allow account creation and login. Phase 2 will stop here so the Firebase setup can be completed and tested before Firestore data features are added.
