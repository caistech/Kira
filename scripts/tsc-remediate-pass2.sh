#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPORT_DIR="scripts/tsc-remediation"
mkdir -p "$REPORT_DIR"

ERROR_LOG="$REPORT_DIR/pass2-errors.log"
REMAINING="$REPORT_DIR/pass2-remaining.txt"
CHANGES="$REPORT_DIR/pass2-changes.log"

touch "$CHANGES"

echo
echo "============================================================"
echo " KIRA — TYPESCRIPT REMEDIATION PASS 2"
echo "============================================================"
echo

# ------------------------------------------------------------
# SAFETY
# ------------------------------------------------------------

echo "[1/9] Checking git state..."

git status --short > "$REPORT_DIR/git-before.txt"

echo "Git state captured."

# ------------------------------------------------------------
# HELPER
# ------------------------------------------------------------

fix_file() {
    local file="$1"
    local description="$2"

    echo "FIX  $file — $description"
    echo "$file — $description" >> "$CHANGES"
}

# ------------------------------------------------------------
# 1. NODEMAILER TYPES
# ------------------------------------------------------------

echo "[2/9] Checking dependency types..."

if ! npm ls @types/nodemailer --depth=0 >/dev/null 2>&1; then
    echo "Installing @types/nodemailer..."
    npm install --save-dev @types/nodemailer
    echo "Installed @types/nodemailer" >> "$CHANGES"
else
    echo "@types/nodemailer already installed."
fi

# ------------------------------------------------------------
# 2. FIX SIMPLE UNKNOWN ERROR HANDLING
# ------------------------------------------------------------

echo "[3/9] Fixing unknown error handling..."

python - <<'PY'
from pathlib import Path

p = Path("scripts/send-beta-invite.ts")

if p.exists():
    text = p.read_text(encoding="utf-8")

    old1 = "console.warn(`Attempt ${attempt} failed for ${to}:`, error.message);"
    new1 = (
        "console.warn(`Attempt ${attempt} failed for ${to}:`, "
        "error instanceof Error ? error.message : String(error));"
    )

    old2 = (
        "console.error(`Failed to send email to ${to} after ${maxRetries} attempts. "
        "Last error:`, lastError.message);"
    )

    new2 = (
        "console.error(`Failed to send email to ${to} after ${maxRetries} attempts. "
        "Last error:`, lastError instanceof Error ? lastError.message : String(lastError));"
    )

    if old1 in text:
        text = text.replace(old1, new1)
        print("FIXED send-beta-invite error handling")

    if old2 in text:
        text = text.replace(old2, new2)
        print("FIXED send-beta-invite lastError handling")

    p.write_text(text, encoding="utf-8")
PY

# ------------------------------------------------------------
# 3. SAFE PROPERTY RENAMES
# ------------------------------------------------------------

echo "[4/9] Applying known API/type renames..."

python - <<'PY'
from pathlib import Path

def replace(path, old, new):
    p = Path(path)

    if not p.exists():
        return

    text = p.read_text(encoding="utf-8")

    if old in text:
        p.write_text(
            text.replace(old, new),
            encoding="utf-8"
        )
        print(f"FIXED {path}: {old} -> {new}")

replace(
    "app/plan/page.tsx",
    "figures.worthPotentialText",
    "figures.potentialText"
)
PY

# ------------------------------------------------------------
# 4. REMOVE DUPLICATE MOCK DEFINITIONS
#
# We don't blindly delete them. Instead, identify their exact
# locations so the codemod below can safely collapse them.
# ------------------------------------------------------------

echo "[5/9] Inspecting duplicate test mocks..."

python - <<'PY'
from pathlib import Path
import re

files = [
    "lib/kira/area-agenda.test.ts",
    "lib/kira/memory-entity.test.ts",
    "lib/kira/save-memory-dedupe.test.ts",
]

for name in files:
    p = Path(name)

    if not p.exists():
        continue

    text = p.read_text(encoding="utf-8")

    matches = list(re.finditer(
        r'createServiceClientV2\s*:',
        text
    ))

    if len(matches) > 1:
        print(
            f"REVIEW {name}: "
            f"{len(matches)} createServiceClientV2 definitions"
        )

        for m in matches:
            line = text[:m.start()].count("\n") + 1
            print(f"       line {line}")
PY

# ------------------------------------------------------------
# 5. TYPECHECK
# ------------------------------------------------------------

echo "[6/9] Running TypeScript..."

set +e
npx tsc --noEmit --pretty false > "$ERROR_LOG" 2>&1
TSC_STATUS=$?
set -e

if [ "$TSC_STATUS" -eq 0 ]; then
    echo
    echo "============================================================"
    echo " TYPESCRIPT PASS"
    echo "============================================================"
    exit 0
fi

# ------------------------------------------------------------
# 6. EXTRACT REMAINING ERRORS
# ------------------------------------------------------------

echo "[7/9] Extracting remaining errors..."

grep -E "error TS[0-9]+" "$ERROR_LOG" > "$REMAINING" || true

ERROR_COUNT="$(grep -c "error TS" "$ERROR_LOG" || true)"

echo
echo "Remaining TypeScript errors: $ERROR_COUNT"
echo

cat "$REMAINING"

# ------------------------------------------------------------
# 7. CANONICAL IDENTITY GUARD
# ------------------------------------------------------------

echo
echo "[8/9] Running canonical identity guard..."

LEGACY="$REPORT_DIR/pass2-legacy-identity.txt"

grep -RIn \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=.git \
    --exclude-dir=canonical-identity-backup-* \
    "getCurrentAppUser()" \
    app lib components 2>/dev/null \
    > "$LEGACY" || true

echo
echo "Legacy getCurrentAppUser() references:"
cat "$LEGACY" || true

# ------------------------------------------------------------
# 8. SEMANTIC REMEDIATION QUEUE
# ------------------------------------------------------------

echo
echo "[9/9] Building semantic remediation queue..."

cat > "$REPORT_DIR/SEMANTIC-QUEUE.md" <<'EOF'
# KIRA — Semantic TypeScript Remediation Queue

These errors must be resolved against the canonical identity model.
Do NOT solve them with blind user_id/organisation_id replacement.

## Canonical identity

- resolveOrganisationForPerson
- getCurrentAppUser
- string -> OrganisationContext
- organisationId missing from ScanRequest
- userId -> OrganisationContext

## Identity plan / Supabase

- GenericStringError -> MembershipRecord
- membership possibly null

## Genome

- appUser missing
- svc missing
- docExportDate missing
- userId missing

## API/type drift

- journeyType string -> "personal" | "business"
- worthTodayText
- periodLabel
- onRedeemed
- framework projection

## Swarm

- DispatchResult.taskGroupId

## Voice checks

- Supabase client typing

## Tests

- duplicate createServiceClientV2
- BetaCodeRow.organisation_id
EOF

echo
echo "============================================================"
echo " PASS 2 COMPLETE"
echo "============================================================"
echo
echo "Errors:      $ERROR_LOG"
echo "Remaining:   $REMAINING"
echo "Semantic:    $REPORT_DIR/SEMANTIC-QUEUE.md"
echo "Changes:     $CHANGES"
echo
echo "TYPESCRIPT: FAIL — semantic remediation remains"
exit 1
