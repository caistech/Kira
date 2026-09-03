#!/usr/bin/env bash
set -euo pipefail

echo
echo "============================================================"
echo " KIRA — CANONICAL IDENTITY SEMANTIC SWEEP"
echo "============================================================"
echo

FILES=(
  "components/UserShell.tsx"
  "components/KiraShapeSection.tsx"
  "app/setup/drive/page.tsx"
  "components/BackToAccount.tsx"
  "app/setup/drive/actions.ts"
  "app/setup/business/page.tsx"
  "app/setup/business/actions.ts"
  "app/settings/page.tsx"
  "lib/auth.ts"
  "app/api/loi/route.ts"
  "app/api/voice/telemetry/route.ts"
  "app/api/genome/redact/route.ts"
  "app/api/kira/create/route.ts"
  "app/api/kira/chat/text/route.ts"
)

PATTERNS=(
  "getCurrentAppUser"
  "getUser"
  "auth\\.user"
  "user\\.id"
  "user\\.email"
  "user_metadata"
  "from\\(['\"]users['\"]"
  "\\busers\\b"
  "\\buser_id\\b"
  "\\bfirst_name\\b"
  "\\blast_name\\b"
  "\\brole\\b"
  "membership"
  "membership_id"
  "organisation"
  "organisation_id"
)

STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT="scripts/canonical-identity-sweep-${STAMP}.report.txt"
BACKUP_DIR="scripts/canonical-identity-backup-${STAMP}"

echo "Report: ${REPORT}"
echo "Backup: ${BACKUP_DIR}"
echo

# ------------------------------------------------------------
# 1. Verify exact file set
# ------------------------------------------------------------

echo "=== 1. FILE EXISTENCE CHECK ===" | tee "$REPORT"

MISSING=0

for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "PASS  $file" | tee -a "$REPORT"
  else
    echo "FAIL  MISSING: $file" | tee -a "$REPORT"
    MISSING=$((MISSING + 1))
  fi
done

if [[ "$MISSING" -ne 0 ]]; then
  echo
  echo "ERROR: Required files are missing."
  exit 1
fi

echo | tee -a "$REPORT"

# ------------------------------------------------------------
# 2. Git safety checkpoint
# ------------------------------------------------------------

echo "=== 2. GIT WORKTREE ===" | tee -a "$REPORT"
git status --short | tee -a "$REPORT"
echo | tee -a "$REPORT"

read -r -p "Continue with semantic identity sweep? [y/N] " ANSWER
if [[ "${ANSWER,,}" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

# ------------------------------------------------------------
# 3. Backup exact files
# ------------------------------------------------------------

echo "=== 3. BACKUP ===" | tee -a "$REPORT"

mkdir -p "$BACKUP_DIR"

for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP_DIR/$(dirname "$file")"
  cp "$file" "$BACKUP_DIR/$file"
done

echo "Backup created: $BACKUP_DIR" | tee -a "$REPORT"
echo | tee -a "$REPORT"

# ------------------------------------------------------------
# 4. Full semantic inventory
# ------------------------------------------------------------

echo "=== 4. SEMANTIC IDENTITY INVENTORY ===" | tee -a "$REPORT"

for pattern in "${PATTERNS[@]}"; do
  echo | tee -a "$REPORT"
  echo "----- PATTERN: $pattern -----" | tee -a "$REPORT"

  FOUND=0

  for file in "${FILES[@]}"; do
    if rg -n -C 3 "$pattern" "$file" 2>/dev/null; then
      FOUND=1
    fi
  done

  if [[ "$FOUND" -eq 0 ]]; then
    echo "(none)" | tee -a "$REPORT"
  fi
done

echo | tee -a "$REPORT"

# ------------------------------------------------------------
# 5. Explicit legacy authority checks
# ------------------------------------------------------------

echo "=== 5. LEGACY AUTHORITY CHECK ===" | tee -a "$REPORT"

echo "--- getCurrentAppUser ---" | tee -a "$REPORT"
rg -n "getCurrentAppUser" "${FILES[@]}" 2>/dev/null || true

echo "--- direct users table ---" | tee -a "$REPORT"
rg -n "\\.from\\(['\"]users['\"]" "${FILES[@]}" 2>/dev/null || true

echo "--- user.id ---" | tee -a "$REPORT"
rg -n "\\buser\\.id\\b" "${FILES[@]}" 2>/dev/null || true

echo "--- user.email ---" | tee -a "$REPORT"
rg -n "\\buser\\.email\\b" "${FILES[@]}" 2>/dev/null || true

echo "--- user_metadata ---" | tee -a "$REPORT"
rg -n "user_metadata" "${FILES[@]}" 2>/dev/null || true

echo "--- user_id ---" | tee -a "$REPORT"
rg -n "\\buser_id\\b" "${FILES[@]}" 2>/dev/null || true

echo | tee -a "$REPORT"

# ------------------------------------------------------------
# 6. Canonical authority checks
# ------------------------------------------------------------

echo "=== 6. CANONICAL AUTHORITY CHECK ===" | tee -a "$REPORT"

echo "--- getAuthUser ---" | tee -a "$REPORT"
rg -n "getAuthUser" "${FILES[@]}" 2>/dev/null || true

echo "--- getCurrentOrganisationContext ---" | tee -a "$REPORT"
rg -n "getCurrentOrganisationContext" "${FILES[@]}" 2>/dev/null || true

echo "--- ctx.personId ---" | tee -a "$REPORT"
rg -n "ctx\\.personId" "${FILES[@]}" 2>/dev/null || true

echo "--- ctx.organisationId ---" | tee -a "$REPORT"
rg -n "ctx\\.organisationId" "${FILES[@]}" 2>/dev/null || true

echo "--- ctx.membershipId ---" | tee -a "$REPORT"
rg -n "ctx\\.membershipId" "${FILES[@]}" 2>/dev/null || true

echo "--- ctx.role ---" | tee -a "$REPORT"
rg -n "ctx\\.role" "${FILES[@]}" 2>/dev/null || true

echo | tee -a "$REPORT"

# ------------------------------------------------------------
# 7. TypeScript
# ------------------------------------------------------------

echo "=== 7. TYPESCRIPT ===" | tee -a "$REPORT"

if [[ -f package.json ]]; then
  if npm exec tsc -- --noEmit; then
    echo "TYPESCRIPT: PASS" | tee -a "$REPORT"
  else
    echo "TYPESCRIPT: FAIL" | tee -a "$REPORT"
    exit 1
  fi
else
  echo "package.json not found" | tee -a "$REPORT"
  exit 1
fi

echo | tee -a "$REPORT"

# ------------------------------------------------------------
# 8. Targeted tests
# ------------------------------------------------------------

echo "=== 8. TARGETED TESTS ===" | tee -a "$REPORT"

if npm exec vitest -- --run --passWithNoTests; then
  echo "VITEST: PASS" | tee -a "$REPORT"
else
  echo "VITEST: FAIL" | tee -a "$REPORT"
  exit 1
fi

echo | tee -a "$REPORT"

# ------------------------------------------------------------
# 9. Final exact-file legacy sweep
# ------------------------------------------------------------

echo "=== 9. FINAL LEGACY-AUTHORITY GREP ===" | tee -a "$REPORT"

LEGACY_FOUND=0

for pattern in \
  "getCurrentAppUser" \
  "\\.from\\(['\"]users['\"]" \
  "\\buser\\.id\\b" \
  "\\buser\\.email\\b" \
  "user_metadata" \
  "\\buser_id\\b"
do
  echo | tee -a "$REPORT"
  echo "PATTERN: $pattern" | tee -a "$REPORT"

  if rg -n "$pattern" "${FILES[@]}" 2>/dev/null; then
    LEGACY_FOUND=1
  else
    echo "(none)" | tee -a "$REPORT"
  fi
done

echo | tee -a "$REPORT"

# ------------------------------------------------------------
# 10. Diff
# ------------------------------------------------------------

echo "=== 10. FINAL DIFF ===" | tee -a "$REPORT"
git diff -- "${FILES[@]}" | tee -a "$REPORT"

echo | tee -a "$REPORT"
echo "============================================================"
echo " SWEEP COMPLETE"
echo "============================================================"
echo
echo "Report : $REPORT"
echo "Backup : $BACKUP_DIR"
echo

if [[ "$LEGACY_FOUND" -eq 1 ]]; then
  echo "RESULT: LEGACY REFERENCES REMAIN."
  echo "Review the report semantically before committing."
  exit 2
else
  echo "RESULT: NO TARGETED LEGACY AUTHORITY REFERENCES REMAIN."
fi
