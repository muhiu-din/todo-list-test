[CmdletBinding()]
param(
  [string]$CommitMessage = "chore: update Daymark local build",
  [switch]$Push,
  [switch]$SkipRules,
  [switch]$SkipDocker,
  [switch]$StopContainer
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "[1/5] TypeScript validation"
npm run typecheck

Write-Host "[2/5] Unit tests"
npm test

if (-not $SkipRules) {
  Write-Host "[3/5] Firestore rules tests"
  npm run test:rules
} else {
  Write-Host "[3/5] Firestore rules tests skipped"
}

if (-not $SkipDocker) {
  Write-Host "[4/5] Rebuilding localhost Docker image"
  docker compose build --pull
  if ($StopContainer) {
    docker compose down
  } else {
    docker compose up -d --force-recreate
    Write-Host "Local app: http://localhost:8088"
  }
} else {
  Write-Host "[4/5] Docker rebuild skipped"
}

Write-Host "[5/5] Git change handling"
git add -A
if (git diff --cached --quiet) {
  Write-Host "No staged changes to commit."
} else {
  git commit -m $CommitMessage
  if ($Push) {
    git push
  } else {
    Write-Host "Commit created. Push was skipped; rerun with -Push when ready."
  }
}

Write-Host "Pipeline complete."
