#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPORT_DIR="scripts/tsc-remediation"
mkdir -p "$REPORT_DIR"

ERROR_LOG="$REPORT_DIR/pass3-errors.log"
REMAINING="$REPORT_DIR/pass3-remaining.txt"
CHANGES="$REPORT_DIR/pass3-changes.log"

echo
echo "============================================================"
echo " KIRA — TYPESCRIPT REMEDIATION PASS 3"
echo "============================================================"
echo

# ------------------------------------------------------------
# SAFETY CHECK
# ------------------------------------------------------------

echo "[1/8] Capturing git state..."

git status --short > "$REPORT_DIR/pass3-git-before.txt"

# ------------------------------------------------------------
# SAFE PROPERTY FIXES
# ------------------------------------------------------------

echo "[2/8] Applying deterministic property fixes..."

python - <<'PY'
from pathlib import Path

changes = []

def replace_once(path, old, new):
    p = Path(path)

    if not p.exists():
        return

    text = p.read_text(encoding="utf-8")

    if old not in text:
        return

    count = text.count(old)

    if count != 1:
        print(f"REVIEW {path}: expected 1 occurrence, found {count}: {old}")
        return

    p.write_text(text.replace(old, new), encoding="utf-8")

    changes.append(f"{path}: {old} -> {new}")
    print(f"FIXED {path}")
    print(f"       {old}")
    print(f"       -> {new}")


# DisplayedFigures
replace_once(
    "app/plan/page.tsx",
    "figures.worthTodayText",
    "figures.worthToday"
)

replace_once(
    "app/plan/page.tsx",
    "figures.worthPotentialText",
    "figures.potentialText"
)

# PriceQuote
replace_once(
    "app/plan/page.tsx",
    "model.quote.periodLabel",
    "model.quote.period"
)

# Journey type — only if the value is clearly derived from the
# canonical business/personal discriminator.
#
# Do NOT blindly cast arbitrary strings here.
PY

# ------------------------------------------------------------
# DUPLICATE TEST MOCK DETECTION
# ------------------------------------------------------------

echo "[3/8] Detecting duplicate test mocks..."

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

    if len(matches) <= 1:
        continue

    print()
    print(f"REVIEW {name}")

    for m in matches:
        line = text[:m.start()].count("\n") + 1
        print(f"  createServiceClientV2 at line {line}")

    print("  Duplicate mocks will NOT be deleted blindly.")

# These are intentionally semantic test cleanups.
PY

# ------------------------------------------------------------
# BETA CODE FIX
# ------------------------------------------------------------

echo "[4/8] Inspecting BetaCodeRow fixture..."

python - <<'PY'
from pathlib import Path

p = Path("lib/billing/beta-codes.test.ts")

if p.exists():
    text = p.read_text(encoding="utf-8")

    # If organisation_id is mandatory in the canonical row,
    # the fixture needs a deterministic test organisation.
    #
    # Do not manufacture a UUID in production data.
    # A clearly synthetic test UUID is acceptable.
    marker = "organisation_id:"

    if marker not in text:
        print("REVIEW beta-codes.test.ts: organisation_id missing from fixture")
        print("       Manual/test-fixture semantic decision required.")
PY

# ------------------------------------------------------------
# SWARM RESULT
# ------------------------------------------------------------

echo "[5/8] Inspecting DispatchResult contract..."

python - <<'PY'
from pathlib import Path

p = Path("lib/kira/swarm/stub.ts")

if p.exists():
    text = p.read_text(encoding="utf-8")

    old = "{ status: 'failed', message: 'No owning organisation could be resolved for this task.' }"

    if old in text:
        print("REVIEW swarm stub:")
        print("  DispatchResult requires taskGroupId.")
        print("  No synthetic taskGroupId will be invented.")
        print("  The owning task group's semantic source must be determined.")
PY

# ------------------------------------------------------------
# VOICE CLIENT
# ------------------------------------------------------------

echo "[6/8] Fixing deterministic Supabase client typing..."

python - <<'PY'
from pathlib import Path

p = Path("lib/voice-agent-checks.ts")

if not p.exists():
    raise SystemExit(0)

text = p.read_text(encoding="utf-8")

if "let supabase;" not in text:
    print("Voice client already typed or changed.")
    raise SystemExit(0)

# Inspect imports first.
lines = text.splitlines()

for i, line in enumerate(lines[:40], 1):
    print(f"{i}: {line}")

print()
print("REVIEW: Supabase client constructor must be identified before replacement.")
print("       No `any` assertion will be introduced automatically.")
PY

# ------------------------------------------------------------
# TYPECHECK
# ------------------------------------------------------------

echo "[7/8] Running TypeScript..."

set +e
npx tsc --noEmit --pretty false > "$ERROR_LOG" 2>&1
STATUS=$?
set -e

grep -E "error TS[0-9]+" "$ERROR_LOG" > "$REMAINING" || true

ERROR_COUNT="$(grep -c "error TS" "$ERROR_LOG" || true)"

echo
echo "============================================================"
echo " PASS 3 RESULT"
echo "============================================================"
echo
echo "Remaining errors: $ERROR_COUNT"
echo

cat "$REMAINING"

# ------------------------------------------------------------
# BUILD NEXT QUEUE
# ------------------------------------------------------------

echo
echo "[8/8] Building next semantic queue..."

cat > "$REPORT_DIR/PASS4-QUEUE.md" <<'EOF'
# KIRA — Pass 4 Semantic Queue

## Identity / Organisation Authority

These require canonical identity reasoning.

- resolveOrganisationForPerson
- getCurrentAppUser
- string -> OrganisationContext
- ScanRequest.organisationId
- uid-tools OrganisationContext
- dedupe sweep userId

## Identity Plan

- Supabase GenericStringError -> MembershipRecord
- membership possibly null

## Genome

- docExportDate
- appUser
- svc
- agent typing

## Email

- journeyType string -> personal | business

## Plan UI

- remaining DisplayedFigures fields
- PriceQuote field
- Redemption component callback

## Agent Reprovision

- framework projection

## Tests

- BetaCodeRow.organisation_id
- duplicate createServiceClientV2 mocks

## Swarm

- DispatchResult.taskGroupId

## Voice

- Supabase client typing
EOF

if [ "$STATUS" -eq 0 ]; then
    echo
    echo "============================================================"
    echo " TYPESCRIPT PASS"
    echo "============================================================"
    exit 0
fi

echo
echo "Reports:"
echo "  $ERROR_LOG"
echo "  $REMAINING"
echo "  $REPORT_DIR/PASS4-QUEUE.md"
echo
echo "TYPESCRIPT: FAIL"
exit 1
