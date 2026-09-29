# Daymark Progress

## Current phase: Phase 5 - Teams and real-time collaboration

### Done

- Read the existing Expo configuration and package manifest.
- Read the complete native application entry point, including local storage and notification logic.
- Read the legacy browser prototype files.
- Confirmed there are no existing screens, components, Firebase services, router, tests, Firestore rules, or environment files.
- Confirmed the Android package name is `com.muhiudin.daymarkmobile`.
- Created `PROJECT_PLAN.md` with the audit, assumptions, target architecture, data model, and phase plan.
- Confirmed the existing Expo web export succeeds before beginning the migration.
- Upgraded the project to Expo SDK 57, the current stable SDK available in this environment.
- Added strict TypeScript configuration and Expo Router entry points.
- Added design tokens, typed task models, local storage service, and notification service.
- Split the local task experience into a task screen, task composer, and task row components.
- Added bottom-tab navigation for My Day, Teams, and Settings.
- Removed the obsolete duplicate browser prototype and old monolithic native entry file.
- Validated Phase 1 with `npx tsc --noEmit`, `npx expo-doctor`, and `npx expo export --platform web`.
- Added modular Firebase Auth setup with persistent React Native auth using AsyncStorage.
- Added email/password sign up, login, logout, forgot-password, display-name capture, validation, and friendly error mapping.
- Added an auth gate so unauthenticated users see the auth screen and authenticated users enter the tab shell.
- Added `.env.example`, `.env` protection, Firebase setup instructions, and the Expo `daymark` scheme.
- Validated Phase 2 source with `npx tsc --noEmit` and `npx expo export --platform web`; Expo Doctor remains at `21/21`.
- Added a shared Firebase client for Auth and Firestore.
- Added typed team, list, and Firestore task models plus Firestore service modules with snapshot unsubscribe returns.
- Added `firestore.rules`, `firestore.indexes.json`, `firebase.json`, and emulator rule-test scaffolding.
- Added negative security tests for outsiders, personal-list isolation, shared task access, and cross-team invite-code abuse.
- Added `test:rules`, `typecheck`, and Firebase emulator tooling scripts.
- Validated Phase 3 application code with `npx tsc --noEmit`, `npx expo-doctor`, and `npx expo export --platform web`.
- Verified all six Firebase `.env` keys are present without exposing values.
- Installed Java 21 and executed the Firestore emulator suite successfully: 4 tests passed.
- Moved the Firestore emulator from occupied port 8080 to port 8082.
- Added Google OAuth session dependencies and Firebase credential sign-in wiring.
- Verified both `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` are set.
- Replaced the auth page with a centered card layout and Google sign-in button.
- Replaced the Settings placeholder with a user dashboard showing avatar initials, email, password reset, and logout.
- Validated the account UX with `npm run typecheck`, `npx expo-doctor`, and `npx expo export --platform web`.
- Added a user-scoped Personal list service with `onSnapshot` task synchronization and optimistic create/update/complete/delete writes.
- Validated Personal task sync code with `npm run typecheck`, Expo web export, and four passing Firestore rules tests.
- Added a safe first-login prompt to import legacy local tasks into the Personal list.
- Added task search and newest-first sorting.
- Restored optional reminder controls to the typed composer with one-hour, tonight, and clear actions.
- Reminder timestamps now persist on Personal Firestore tasks and schedule a local notification on save.
- Added optional notes to the Personal task composer, Firestore model, migration path, and task rows.
- Added a persisted reminder reconciler that schedules, reuses, and cancels local notifications from Firestore snapshots.
- Revalidated Phase 4 with `npm run typecheck` and `npx expo export --platform web`.
- Replaced the Teams placeholder with team creation, invite-code join, team selection, member listeners, invite sharing, and leave-team controls.
- Added invite-document creation and invite regeneration/service support.
- Validated the Teams slice with `npm run typecheck`, Expo web export, and four passing Firestore rules tests.

### Next

- Add Google OAuth client IDs to `.env` if Google sign-in is required on native builds, then implement Personal Firestore tasks and local-task migration in Phase 4.

### Known issues

- The new Router shell currently has placeholder Teams and Settings screens.
- The app is not yet a team app and does not yet contain Firebase/Auth/Firestore.
- Firebase/Auth/Firestore do not exist yet.
- Automated tests and Firestore emulator tests do not exist yet.
- Real native reminder behavior must be validated in an Android build, not only the web export.
- The current `App.js` stores local task notification IDs, but the future shared reminder reconciler will need a separate persisted map.
- Google sign-in requires `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in `.env`; Firebase provider enablement alone is not enough for Expo OAuth.

## Phase summaries

### Phase 0

Audit and plan only. No product code changed in this phase.

### Phase 1

Completed. Expo SDK 57, strict TypeScript, Expo Router, tokens, typed local task services, task components, and tab navigation are in place. TypeScript, Expo Doctor, and web export pass.

### Phase 2

Implementation complete and paused for Firebase console setup. Auth code, persistent AsyncStorage session, environment template, setup guide, and auth gate are present. Awaiting `.env` values and manual signup/login verification.

### Phase 3

Completed. Firestore services, schema, rules, indexes, emulator tooling, and four passing emulator security tests are present.

### Phase 4

Completed for the current Personal scope. Personal Firestore list/task synchronization, migration prompt, search/sort, notes, reminder composer, and snapshot reminder reconciliation are implemented. Due dates and assignees remain for later task refinement.

### Phase 5

In progress. Team creation, invite joining, member listeners, invite sharing, and leaving are implemented. Shared team lists/tasks, owner member removal/regeneration, and full two-device manual sync remain.

### Phase 6

Not started.

### Phase 7

Not started.

### Phase 8

Not started.

### Phase 9

Not started.
