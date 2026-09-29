# Daymark Project Plan

## Phase 0 Audit

### Current implementation

Daymark is currently a small Expo React Native application with a single JavaScript entry file:

- `App.js` contains the complete UI, task state, local persistence, time parsing, notification scheduling, and styles.
- Tasks are stored locally with AsyncStorage under `daymark-tasks`.
- Local notifications use `expo-notifications`.
- Time selection uses `@react-native-community/datetimepicker` plus a custom text parser.
- Icons use `@expo/vector-icons`.
- The app has no authentication, backend, teams, shared lists, Firestore, routing, theme system, or automated tests.
- `app.json` identifies the Android package as `com.muhiudin.daymarkmobile` and configures Expo asset/font/notification/date-picker plugins.
- `eas.json` has preview APK and production Android App Bundle profiles.
- `index.html`, `script.js`, and `styles.css` are a separate legacy browser todo implementation from the original prototype. The native Expo app does not import them.
- `babel.config.js` and `metro.config.js` use the standard Expo setup.
- `.gitignore` excludes `node_modules`, `.expo`, and `dist`, but does not yet exclude `.env` because no environment file exists yet.

### Existing behavior to preserve

The migration must preserve these behaviors while moving them into the new architecture:

- Add tasks at the top of the list.
- Edit a task with its title loaded into the editor.
- Mark tasks complete and reopen them.
- Delete tasks.
- Filter all, active, and completed tasks.
- Optional reminder time per task.
- Cancel reminders when tasks are completed or deleted.
- Reschedule reminders when tasks are edited or reopened.
- Persist local tasks across app reloads.
- Responsive layout on small phones.

### Current risks and known gaps

- The app has no user or team identity, so local tasks cannot be shared.
- `App.js` is a monolith and will be difficult to extend safely.
- JavaScript is untyped and has no lint or test coverage.
- Notification scheduling depends on native permissions and cannot provide true instant cross-device delivery without a paid push/backend mechanism.
- The current web prototype and native app can diverge because they have separate code paths.
- Existing local task data needs a safe migration path into the authenticated user's Personal list.
- There is no ErrorBoundary, offline status UI, retry policy, or listener cleanup layer.

## Product assumptions

- The target is Android first and the deliverable is an installable APK.
- Firebase Spark is the only backend plan. No Cloud Functions, paid APIs, or server-side scheduled jobs will be used.
- Email/password authentication is the first authentication provider. Google Sign-In is deferred until the required flow is stable and tested.
- A team member receives shared data through Firestore listeners. Each member's device schedules its own local reminder after it has synced the task. This is eventual local notification delivery, not a guaranteed push notification while the app has never synced.
- "Lists inside teams" will be modeled as team-scoped list documents with task subcollections, while a user's Personal list will be user-scoped. This keeps listeners narrow and access rules understandable.
- The requested exact-alarm behavior will be implemented with the Expo/native capabilities available in the selected stable Expo SDK. Any Android vendor battery restrictions that cannot be controlled programmatically will be documented and tested manually.
- The existing task shape will be migrated conservatively. Legacy tasks that do not contain newer fields receive safe defaults.

## Target architecture

```text
App.tsx
src/
  app/
    navigation/
    providers/
  features/
    auth/
      screens/
      authService.ts
      validation.ts
    teams/
      screens/
      teamService.ts
      inviteCode.ts
    lists/
      listService.ts
    tasks/
      components/
      screens/
      taskService.ts
      taskReducer.ts
      taskTypes.ts
    notifications/
      notificationService.ts
      reminderReconciler.ts
  components/
  hooks/
  services/
    firebase/
      config.ts
      auth.ts
      firestore.ts
  theme/
    tokens.ts
    themes.ts
  utils/
    errors.ts
    migration.ts
    validation.ts
firestore.rules
firestore.indexes.json
.env.example
PROJECT_PLAN.md
PROGRESS.md
SETUP_FIREBASE.md
BUILD_APK.md
RELEASE.md
README.md
QA_REPORT.md
MANUAL_TEST_CHECKLIST.md
tests/
```

Expo Router will provide bottom-tab navigation with Home/My Day, Teams, and Settings. Firebase access will stay behind small service modules so UI components do not call Firestore directly.

## Data model

### `users/{uid}`

```text
uid: string
email: string
displayName: string
avatarColor: string
createdAt: Timestamp
updatedAt: Timestamp
```

### `teams/{teamId}`

```text
name: string
ownerId: string
inviteCode: string
createdAt: Timestamp
updatedAt: Timestamp
```

### `teams/{teamId}/members/{uid}`

```text
uid: string
displayName: string
email: string
avatarColor: string
role: "owner" | "member"
joinedAt: Timestamp
joinedWithCode: string
```

### `invites/{code}`

```text
teamId: string
createdBy: string
createdAt: Timestamp
active: boolean
```

### `users/{uid}/lists/{listId}`

Private Personal lists. The initial list is `Personal`.

```text
name: string
ownerId: string
scope: "personal"
createdAt: Timestamp
updatedAt: Timestamp
```

### `teams/{teamId}/lists/{listId}`

Shared team lists.

```text
name: string
teamId: string
createdBy: string
createdAt: Timestamp
updatedAt: Timestamp
```

### `users/{uid}/lists/{listId}/tasks/{taskId}` and team equivalent

```text
title: string
notes: string | null
completed: boolean
completedBy: string | null
completedAt: Timestamp | null
createdBy: string
assigneeId: string | null
dueAt: Timestamp | null
reminderAt: Timestamp | null
createdAt: Timestamp
updatedAt: Timestamp
```

Task writes will validate string lengths, required fields, timestamp types, role-sensitive fields, and immutable ownership fields in Firestore rules.

## Phase list

### Phase 0 - Audit and plan

Read the existing codebase, record current behavior and risks, create this plan, and create the progress log.

### Phase 1 - Foundation

Migrate to TypeScript strict mode, Expo Router, feature folders, design tokens, light/dark themes, shared components, ErrorBoundary, and navigation shell. Keep the existing task behavior working through the migration.

### Phase 2 - Firebase and authentication

Create Firebase configuration documentation, environment variable handling, email/password signup/login/logout/password reset, persistent auth, profile creation, and friendly validation. Stop after this phase for the user's Firebase console setup and confirmation.

### Phase 3 - Firestore model and rules

Implement services, schema, security rules, indexes if needed, emulator rules tests, and negative outsider/privilege escalation tests.

### Phase 4 - Personal tasks and migration

Implement Personal lists, task notes/assignees/due/reminder fields, search/filter/sort, optimistic updates, old local task migration, and local reminder reconciliation.

### Phase 5 - Teams and real-time collaboration

Implement team creation, six-character invite codes, joining, leaving, member management, shared lists, assignees, sharing, and Firestore `onSnapshot` listeners with cleanup.

### Phase 6 - Shared reminders

Reconcile every synced task reminder on each device, persist task-to-notification IDs, handle notification permissions/channels/taps, and document the eventual-sync limitation.

### Phase 7 - Polish and resilience

Add offline banner and queued writes, loading skeletons, empty states, haptics, restrained animations, accessibility labels, keyboard/safe-area handling, dark mode, splash screen, adaptive icon, and recovery for removed members/deleted teams.

### Phase 8 - QA

Add and run unit/UI tests, Firestore emulator rules tests, TypeScript, ESLint, Expo Doctor, Expo export, a QA report, and a two-device manual checklist.

### Phase 9 - Delivery

Write Firebase setup, APK build, release, and README documentation. Validate a clean clone setup and produce the installable APK through the configured preview build.

## Phase 0 completion criteria

- Existing codebase audited.
- Current limitations and assumptions written down.
- Target architecture and data model written down.
- Phase order and stop point documented.
- `PROGRESS.md` created and updated.
