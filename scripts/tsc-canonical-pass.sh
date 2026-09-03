#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PASS="${1:-unknown}"

REPORT_DIR="$ROOT/scripts/tsc-remediation"
QUEUE="$REPORT_DIR/current-errors.log"
CHANGES="$REPORT_DIR/pass-${PASS}-changes.log"
AMBIGUOUS="$REPORT_DIR/pass-${PASS}-ambiguous.log"

touch "$CHANGES"
touch "$AMBIGUOUS"

echo "Canonical remediation pass: $PASS"

###############################################################################
# SAFETY
###############################################################################

fail_ambiguous() {
    local message="$1"

    echo "$message" | tee -a "$AMBIGUOUS"

    return 0
}

###############################################################################
# 1. REMOVE TYPESCRIPT-ONLY ESCAPES
#
# These are explicitly NOT allowed because they make the compiler quiet
# without restoring the semantic model.
###############################################################################

echo
echo "[1] Checking for semantic suppression patterns..."

if grep -RInE \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=.git \
    --exclude='*.map' \
    -E '(@ts-ignore|@ts-expect-error|as any|<any>|: any\b)' \
    app components lib \
    >"$REPORT_DIR/pass-${PASS}-type-suppressions.log" 2>/dev/null; then

    echo
    echo "WARNING: TypeScript suppression patterns detected."
    echo
    cat "$REPORT_DIR/pass-${PASS}-type-suppressions.log"

    echo
    echo "No automatic suppression changes will be made."
fi

###############################################################################
# 2. IDENTIFY LEGACY USER-ID SEMANTICS
###############################################################################

echo
echo "[2] Scanning for legacy users.id semantics..."

grep -RInE \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=.git \
    --exclude='*.map' \
    '\b(users|user)\.(id|user_id)\b|\buser_id\b|\buserId\b|getCurrentAppUser|getCurrentUser' \
    app components lib \
    >"$REPORT_DIR/pass-${PASS}-legacy-identifiers.log" 2>/dev/null \
    || true

###############################################################################
# 3. SAFE AUTH CONTEXT REPLACEMENTS
#
# Only replace direct helper usage where the canonical helper has the same
# operational purpose.
###############################################################################

echo
echo "[3] Checking authentication helper usage..."

while IFS= read -r file; do

    [[ -f "$file" ]] || continue

    if grep -q "getCurrentAppUser" "$file"; then

        if grep -q "getCurrentOrganisationContext" "$file"; then
            fail_ambiguous \
                "$file: contains both getCurrentAppUser and getCurrentOrganisationContext — manual review"
            continue
        fi

        cp "$file" "$file.bak.canonical"

        python3 - "$file" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
text = p.read_text()

text = text.replace(
    "getCurrentAppUser()",
    "getCurrentOrganisationContext()"
)

text = text.replace(
    "getCurrentAppUser",
    "getCurrentOrganisationContext"
)

p.write_text(text)
PY

        rm -f "$file.bak.canonical"

        echo "$file: getCurrentAppUser -> getCurrentOrganisationContext" \
            | tee -a "$CHANGES"
    fi

done < <(
    grep -RIl \
        --exclude-dir=node_modules \
        --exclude-dir=.next \
        --exclude-dir=.git \
        "getCurrentAppUser" \
        app components lib 2>/dev/null || true
)

###############################################################################
# 4. DETECT CONTEXT DESTRUCTURING THAT STILL ASSUMES USER ID
###############################################################################

echo
echo "[4] Checking organisation-context consumers..."

while IFS= read -r file; do

    [[ -f "$file" ]] || continue

    if grep -q "getCurrentOrganisationContext" "$file"; then

        if grep -Eq '\bctx\.userId\b|\bcontext\.userId\b|\bcurrentUser\.id\b' "$file"; then
            fail_ambiguous \
                "$file: canonical organisation context still consumed through userId"
        fi

    fi

done < <(
    grep -RIl \
        --exclude-dir=node_modules \
        --exclude-dir=.next \
        --exclude-dir=.git \
        "getCurrentOrganisationContext" \
        app components lib 2>/dev/null || true
)

###############################################################################
# 5. DETECT DATABASE QUERIES USING users AS ORGANISATIONAL AUTHORITY
###############################################################################

echo
echo "[5] Checking Supabase users-table authority..."

while IFS= read -r file; do

    [[ -f "$file" ]] || continue

    if grep -Eq "\.from\(['\"]users['\"]\)" "$file"; then
        fail_ambiguous \
            "$file: queries users table — determine whether this is authentication provenance or organisational authority"
    fi

done < <(
    grep -RIl \
        --exclude-dir=node_modules \
        --exclude-dir=.next \
        --exclude-dir=.git \
        "\.from(['\"]users['\"])" \
        app components lib 2>/dev/null || true
)

###############################################################################
# 6. DETECT DIRECT USER_ID FILTERS
###############################################################################

echo
echo "[6] Checking user_id filters..."

while IFS= read -r file; do

    [[ -f "$file" ]] || continue

    if grep -Eq \
        "\.(eq|neq|in|is|contains)\(['\"]user_id['\"]" \
        "$file"; then

        fail_ambiguous \
            "$file: direct user_id query filter — determine canonical resource owner"
    fi

done < <(
    grep -RIl \
        --exclude-dir=node_modules \
        --exclude-dir=.next \
        --exclude-dir=.git \
        "user_id" \
        app components lib 2>/dev/null || true
)

###############################################################################
# 7. DETECT userId PROPAGATION
###############################################################################

echo
echo "[7] Checking userId propagation..."

while IFS= read -r file; do

    [[ -f "$file" ]] || continue

    if grep -Eq \
        '\b(userId|user_id)\s*:' \
        "$file"; then

        fail_ambiguous \
            "$file: userId/user_id propagated into object — canonical ownership must be determined"
    fi

done < <(
    grep -RIl \
        --exclude-dir=node_modules \
        --exclude-dir=.next \
        --exclude-dir=.git \
        -E '\b(userId|user_id)\b' \
        app components lib 2>/dev/null || true
)

###############################################################################
# 8. DETECT AUTH USER ID USED AS RESOURCE OWNER
###############################################################################

echo
echo "[8] Checking auth user IDs used as resource ownership..."

while IFS= read -r file; do

    [[ -f "$file" ]] || continue

    if grep -Eq \
        '\buser\.id\b.*(insert|update|upsert|\.eq|\.match)' \
        "$file"; then

        fail_ambiguous \
            "$file: auth user.id appears adjacent to resource persistence/query — ownership semantics require review"
    fi

done < <(
    grep -RIl \
        --exclude-dir=node_modules \
        --exclude-dir=.next \
        --exclude-dir=.git \
        "user.id" \
        app components lib 2>/dev/null || true
)

###############################################################################
# 9. NEVER AUTO-CONVERT user_id -> organisation_id
###############################################################################

echo
echo "[9] Enforcing ownership rule..."

cat >>"$CHANGES" <<EOF

PASS $PASS:
No blanket user_id -> organisation_id replacements are permitted.

Reason:
user_id may represent authentication provenance, historical attribution,
person identity, or legacy ownership. The canonical owner must be determined
from the resource-specific ownership matrix.

EOF

###############################################################################
# 10. REPORT AMBIGUOUS CASES
###############################################################################

echo
echo "============================================================"
echo "CANONICAL REMEDIATION RESULT"
echo "============================================================"

if [[ -s "$CHANGES" ]]; then
    echo
    echo "Safe changes:"
    cat "$CHANGES"
fi

if [[ -s "$AMBIGUOUS" ]]; then
    echo
    echo "Ambiguous semantic cases:"
    cat "$AMBIGUOUS"
    echo
    echo "These were intentionally NOT modified."
fi

echo
echo "============================================================"

exit 0