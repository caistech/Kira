#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPORT_DIR="$ROOT/scripts/tsc-remediation"
mkdir -p "$REPORT_DIR"

ERROR_LOG="$REPORT_DIR/current-errors.log"
QUEUE="$REPORT_DIR/semantic-queue.log"
LEDGER="$REPORT_DIR/remediation-ledger.log"

MAX_PASSES="${MAX_PASSES:-10}"

echo "============================================================"
echo " KIRA CANONICAL TYPESCRIPT REMEDIATION"
echo "============================================================"
echo
echo "Root:        $ROOT"
echo "Report dir:  $REPORT_DIR"
echo "Max passes:  $MAX_PASSES"
echo

touch "$LEDGER"

run_tsc() {
    echo
    echo "------------------------------------------------------------"
    echo "Running TypeScript compiler"
    echo "------------------------------------------------------------"

    if npx tsc --noEmit >"$ERROR_LOG" 2>&1; then
        return 0
    fi

    return 1
}

extract_queue() {
    python3 - "$ERROR_LOG" "$QUEUE" <<'PY'
import re
import sys
from pathlib import Path

src = Path(sys.argv[1])
dst = Path(sys.argv[2])

text = src.read_text(errors="replace")

lines = []

for line in text.splitlines():
    if re.search(r'\.(ts|tsx)\(\d+,\d+\): error TS\d+:', line):
        lines.append(line)

dst.write_text("\n".join(lines) + ("\n" if lines else ""))
PY
}

show_summary() {
    echo
    echo "============================================================"
    echo " CURRENT TYPESCRIPT ERROR QUEUE"
    echo "============================================================"

    if [[ ! -s "$QUEUE" ]]; then
        echo "No TypeScript errors."
        return
    fi

    echo
    echo "Errors by code:"
    grep -oE 'TS[0-9]+' "$QUEUE" \
        | sort \
        | uniq -c \
        | sort -nr \
        || true

    echo
    echo "Errors by file:"
    sed -E 's/^([^:]+:[0-9]+:[0-9]+).*/\1/' "$QUEUE" \
        | sed -E 's/\([0-9]+,[0-9]+\)$//' \
        | sort \
        | uniq -c \
        | sort -nr \
        | head -50 \
        || true

    echo
    echo "Semantic queue:"
    cat "$QUEUE"
}

record_pass() {
    local pass="$1"
    local result="$2"

    {
        echo
        echo "============================================================"
        echo "PASS $pass — $result"
        echo "Timestamp: $(date -Iseconds)"
        echo "============================================================"
    } >>"$LEDGER"
}

for pass in $(seq 1 "$MAX_PASSES"); do

    echo
    echo "############################################################"
    echo "# CANONICAL REMEDIATION PASS $pass/$MAX_PASSES"
    echo "############################################################"

    if run_tsc; then
        extract_queue

        record_pass "$pass" "CLEAN"

        echo
        echo "============================================================"
        echo "TYPESCRIPT IS CLEAN"
        echo "============================================================"

        exit 0
    fi

    extract_queue
    show_summary

    record_pass "$pass" "ERRORS PRESENT"

    echo
    echo "Running canonical-safe remediation..."

    if ! bash scripts/tsc-canonical-pass.sh "$pass"; then
        echo
        echo "Canonical remediation stopped."
        echo
        echo "Remaining errors:"
        cat "$QUEUE"
        echo
        echo "These require semantic review rather than TypeScript suppression."
        exit 2
    fi

    if git diff --quiet; then
        echo
        echo "No source changes were made."
        echo
        echo "The remaining errors cannot be safely remediated mechanically."
        echo
        cat "$QUEUE"
        exit 3
    fi

    echo
    echo "Changes made during pass $pass:"
    git diff --stat
done

echo
echo "Maximum remediation passes reached."
echo
cat "$QUEUE"

exit 4