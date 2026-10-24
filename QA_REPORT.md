# QA Report

## Automated checks

- TypeScript strict check: passed with `npm run typecheck`.
- Expo diagnostics: passed with `npx expo-doctor`.
- Web bundle: passed with `npx expo export --platform web`.
- Firestore rules emulator: passed with 5 tests in `npm run test:rules`.

## Covered security cases

- Team creation by an authenticated owner
- Shared team member reads
- Shared task reads
- Outsider team access denied
- Personal list isolation
- Cross-team invite-code abuse denied

## Manual coverage still required

- Two physical devices joining the same team
- Real-time task updates between devices
- Native Android reminder timing
- Google Android OAuth with the release SHA-1
- Airplane-mode reconnect behavior
- APK installation and update flow

## Known risks

- Firebase Spark quotas can be reached by large teams or very active listeners.
- Native notification reliability varies with Android battery optimization settings.
- Firestore emulator tests do not prove native notification behavior.
