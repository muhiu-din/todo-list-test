# Daymark

Daymark is a React Native and Expo team todo app for Personal and shared team lists.

## Features

- Email/password authentication with persistent sessions
- Google sign-in through Expo Auth Session
- Personal tasks stored in Firestore
- Team creation and six-character invite codes
- Shared lists and real-time shared tasks
- Add, edit, complete, delete, search, and sort tasks
- Optional notes and local reminder alarms
- Settings dashboard with password reset and logout
- Offline status banner
- Firestore security rules and emulator tests

## Run locally

```powershell
npm install
npx expo start
```

Use `npx expo start --web` for browser preview or Expo Go for a device. Add Firebase and Google OAuth values to `.env` using `.env.example`.

## Validate

```powershell
npm run typecheck
npm run test:rules
npx expo-doctor
npx expo export --platform web
```

## Structure

- `app/`: Expo Router routes and tabs
- `src/features/auth/`: authentication and account UI
- `src/features/tasks/`: Personal and shared task UI/services
- `src/features/teams/`: team types and Firestore operations
- `src/features/lists/`: list types and services
- `src/services/`: Firebase, notifications, storage, network UI
- `firestore.rules`: production access rules
- `tests/`: rules and task tests

## Honest limitations

- Local reminder delivery requires notification permission and a native build.
- Shared reminders schedule on each member's device after that device syncs the task; this is not guaranteed push delivery while the app has never opened.
- Firebase Spark quotas apply.
- Android vendor battery optimization can delay alarms.
- Google Android sign-in requires the correct SHA-1 certificate for the installed build.
- Offline writes have UI status coverage, but full queued-write reconciliation remains a follow-up.
