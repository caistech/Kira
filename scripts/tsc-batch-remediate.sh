#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPORT_DIR="scripts/tsc-remediation"
mkdir -p "$REPORT_DIR"

ERROR_LOG="$REPORT_DIR/tsc-errors.log"
REMAINING="$REPORT_DIR/remaining-errors.txt"
SUMMARY="$REPORT_DIR/summary.txt"

echo
echo "============================================================"
echo " KIRA — BATCH TYPESCRIPT REMEDIATION"
echo "============================================================"
echo

# ------------------------------------------------------------
# 0. Protect the canonical identity architecture
# ------------------------------------------------------------

echo "[1/8] Checking for forbidden legacy identity reintroduction..."

if grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  --exclude="tsc-batch-remediate.sh" \
  "getCurrentAppUser()" \
  app lib components 2>/dev/null \
  | grep -v "canonical-identity-backup-" \
  > "$REPORT_DIR/legacy-getCurrentAppUser.txt"; then

  echo
  echo "WARNING: Legacy getCurrentAppUser() remains in production source:"
  cat "$REPORT_DIR/legacy-getCurrentAppUser.txt"
  echo
  echo "These will NOT be automatically restored or replaced blindly."
fi

# ------------------------------------------------------------
# 1. Remove generated / backup trees from TS compilation
# ------------------------------------------------------------

echo "[2/8] Updating tsconfig exclusions..."

node <<'NODE'
const fs = require('fs');

const file = 'tsconfig.json';

if (!fs.existsSync(file)) {
  console.error('tsconfig.json not found');
  process.exit(1);
}

const tsconfig = JSON.parse(fs.readFileSync(file, 'utf8'));

tsconfig.exclude = Array.from(new Set([
  ...(tsconfig.exclude || []),
  '.next',
  'node_modules',
  'scripts/canonical-identity-backup-*',
  'scripts/tsc-remediation'
]));

fs.writeFileSync(
  file,
  JSON.stringify(tsconfig, null, 2) + '\n'
);

console.log('tsconfig exclusions updated');
NODE

# ------------------------------------------------------------
# 2. Safe source cleanup
# ------------------------------------------------------------

echo "[3/8] Applying safe mechanical source fixes..."

python - <<'PY'
from pathlib import Path

ROOT = Path(".")

def replace(path, old, new):
    p = ROOT / path
    if not p.exists():
        return False

    text = p.read_text(encoding="utf-8")

    if old not in text:
        return False

    text2 = text.replace(old, new)

    if text2 != text:
        p.write_text(text2, encoding="utf-8")
        print(f"FIXED  {path}")
        print(f"       {old!r} -> {new!r}")
        return True

    return False


# ------------------------------------------------------------
# app/plan/page.tsx
# These are direct property-renames exposed by the current type.
# ------------------------------------------------------------

replace(
    "app/plan/page.tsx",
    "figures.worthPotentialText",
    "figures.potentialText"
)

# worthTodayText requires knowing whether the display layer renamed it.
# Do NOT blindly invent a replacement.


# ------------------------------------------------------------
# lib/voice-agent-checks.ts
# Explicitly type the Supabase variable if the existing import/client
# pattern makes the intended client unambiguous.
# ------------------------------------------------------------

p = ROOT / "lib/voice-agent-checks.ts"

if p.exists():
    text = p.read_text(encoding="utf-8")

    if "let supabase;" in text:
        # Look for an existing Supabase client type import.
        if "SupabaseClient" in text:
            text = text.replace(
                "let supabase;",
                "let supabase: SupabaseClient;"
            )
            p.write_text(text, encoding="utf-8")
            print("FIXED  lib/voice-agent-checks.ts: typed supabase")


# ------------------------------------------------------------
# scripts/send-beta-invite.ts
# unknown errors -> safe String(error) conversion.
# ------------------------------------------------------------

replace(
    "scripts/send-beta-invite.ts",
    "error.message",
    "error instanceof Error ? error.message : String(error)"
)

replace(
    "scripts/send-beta-invite.ts",
    "lastError.message",
    "lastError instanceof Error ? lastError.message : String(lastError)"
)


# ------------------------------------------------------------
# lib/kira/swarm/stub.ts
# Interface now requires taskGroupId.
#
# Do NOT invent an ID. Use the existing task/task-group value if
# one is already available in the function scope.
# ------------------------------------------------------------

p = ROOT / "lib/kira/swarm/stub.ts"

if p.exists():
    text = p.read_text(encoding="utf-8")

    old = (
        "return { status: 'failed', "
        "message: 'No owning organisation could be resolved for this task.' };"
    )

    if old in text:
        print(
            "REVIEW  lib/kira/swarm/stub.ts: "
            "DispatchResult requires taskGroupId; semantic value required."
        )


# ------------------------------------------------------------
# Duplicate mock properties
#
# These are safe to flag, but automatic deletion is avoided because
# the duplicate functions may intentionally differ.
# ------------------------------------------------------------

for path in [
    "lib/kira/area-agenda.test.ts",
    "lib/kira/memory-entity.test.ts",
    "lib/kira/save-memory-dedupe.test.ts",
]:
    p = ROOT / path
    if p.exists():
        text = p.read_text(encoding="utf-8")
        count = text.count("createServiceClientV2:")
        if count > 1:
            print(
                f"REVIEW  {path}: {count} createServiceClientV2 "
                f"properties detected"
            )

PY

# ------------------------------------------------------------
# 4. Run TypeScript
# ------------------------------------------------------------

run_tsc() {
  echo
  echo "Running TypeScript..."
  echo

  set +e
  npx tsc --noEmit --pretty false > "$ERROR_LOG" 2>&1
  STATUS=$?
  set -e

  return $STATUS
}

# ------------------------------------------------------------
# 5. Iterative safe remediation
# ------------------------------------------------------------

echo "[4/8] First TypeScript pass..."

if run_tsc; then
  echo "TYPESCRIPT: PASS"
else
  echo "TYPESCRIPT: FAIL — continuing with classification"
fi

# ------------------------------------------------------------
# 6. Classify known semantic errors
# ------------------------------------------------------------

echo "[5/8] Classifying remaining errors..."

python - <<'PY'
from pathlib import Path
import re

log = Path("scripts/tsc-remediation/tsc-errors.log")

if not log.exists():
    raise SystemExit(0)

text = log.read_text(encoding="utf-8")

categories = {
    "CANONICAL_IDENTITY": [
        "getCurrentAppUser",
        "resolveOrganisationForPerson",
        "OrganisationContext",
        "organisationId",
        "userId",
    ],

    "SUPABASE_TYPES": [
        "GenericStringError",
        "MembershipRecord",
        "maybeSingle",
    ],

    "API_TYPE_DRIFT": [
        "worthTodayText",
        "worthPotentialText",
        "periodLabel",
        "onRedeemed",
        "framework",
    ],

    "TEST_FIXTURE": [
        "TS1117",
        "BetaCodeRow",
    ],

    "DEPENDENCY_TYPES": [
        "nodemailer",
        "TS7016",
    ],

    "GENERATED_OR_BACKUP": [
        ".next/",
        "canonical-identity-backup-",
    ],
}

classified = {k: [] for k in categories}
unclassified = []

lines = text.splitlines()

for line in lines:
    matched = False

    for category, patterns in categories.items():
        if any(pattern in line for pattern in patterns):
            classified[category].append(line)
            matched = True
            break

    if not matched and (
        "error TS" in line or
        "error" in line.lower()
    ):
        unclassified.append(line)

out = []

for category, entries in classified.items():
    if not entries:
        continue

    out.append("")
    out.append("=" * 70)
    out.append(category)
    out.append("=" * 70)

    # Deduplicate while preserving order
    seen = set()

    for entry in entries:
        if entry not in seen:
            seen.add(entry)
            out.append(entry)

if unclassified:
    out.append("")
    out.append("=" * 70)
    out.append("UNCLASSIFIED")
    out.append("=" * 70)
    out.extend(dict.fromkeys(unclassified))

Path("scripts/tsc-remediation/remaining-errors.txt").write_text(
    "\n".join(out) + "\n",
    encoding="utf-8"
)

print("\n".join(out))
PY

# ------------------------------------------------------------
# 7. Run tsc again after safe fixes
# ------------------------------------------------------------

echo
echo "[6/8] Second TypeScript pass..."

if run_tsc; then
  echo "TYPESCRIPT: PASS"
else
  echo "TYPESCRIPT: STILL FAILING"
fi

# ------------------------------------------------------------
# 8. Produce final report
# ------------------------------------------------------------

echo "[7/8] Producing summary..."

{
  echo "KIRA TypeScript Batch Remediation"
  echo "================================="
  echo
  echo "Date: $(date)"
  echo
  echo "Final TypeScript status:"
  if npx tsc --noEmit --pretty false >/dev/null 2>&1; then
    echo "PASS"
  else
    echo "FAIL"
  fi
  echo
  echo "Legacy getCurrentAppUser references:"
  if [ -s "$REPORT_DIR/legacy-getCurrentAppUser.txt" ]; then
    echo "PRESENT — manual canonical migration required"
  else
    echo "NONE FOUND"
  fi
  echo
  echo "Remaining error report:"
  echo "$REMAINING"
  echo
} > "$SUMMARY"

echo "[8/8] Complete."

echo
echo "============================================================"
echo " REMEDIATION COMPLETE"
echo "============================================================"
echo
echo "Reports:"
echo "  $ERROR_LOG"
echo "  $REMAINING"
echo "  $SUMMARY"
echo

if npx tsc --noEmit --pretty false >/dev/null 2>&1; then
  echo "TYPESCRIPT: PASS"
  exit 0
else
  echo "TYPESCRIPT: FAIL"
  echo
  echo "Remaining errors:"
  cat "$ERROR_LOG"
  exit 1
fi
