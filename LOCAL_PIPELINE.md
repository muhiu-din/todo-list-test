# Local Pipeline

This pipeline is local-only. It does not deploy production infrastructure.

## Start the Dockerized web app

Make sure Docker Desktop is running, then:

```powershell
cd D:\Claude\todo-list-test
npm run docker:local
```

Open:

```text
http://localhost:8088
```

Stop it with:

```powershell
npm run docker:local:down
```

## Validate, rebuild, commit, and optionally push

```powershell
npm run pipeline:local -- -CommitMessage "chore: update local Daymark build" -Push
```

The pipeline does this in order:

1. Runs strict TypeScript validation.
2. Runs unit tests.
3. Runs Firestore emulator rules tests.
4. Rebuilds the `daymark-web:local` image.
5. Recreates the `daymark-web-local` container.
6. Runs `git add -A`.
7. Creates a commit when staged changes exist.
8. Pushes only when the `-Push` switch is supplied.

Without `-Push`, it creates the commit and leaves pushing to you:

```powershell
npm run pipeline:local -- -CommitMessage "chore: update local Daymark build"
```

Skip rules or Docker only when deliberately debugging:

```powershell
npm run pipeline:local -- -SkipRules -SkipDocker
```

The pipeline never copies `.env` into the Docker build context. Expo public Firebase configuration is passed as local Docker build arguments so the web bundle can authenticate against the configured Firebase project.
