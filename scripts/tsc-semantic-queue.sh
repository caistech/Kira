#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPORT_DIR="$ROOT/scripts/tsc-remediation"
mkdir -p "$REPORT_DIR"

TS_LOG="$REPORT_DIR/semantic-tsc.log"
QUEUE="$REPORT_DIR/semantic-remediation-queue.md"

echo "Running TypeScript..."
npx tsc --noEmit >"$TS_LOG" 2>&1 || true

python3 - "$TS_LOG" "$QUEUE" <<'PY'
import re
import sys
from pathlib import Path
from collections import defaultdict

log = Path(sys.argv[1])
out = Path(sys.argv[2])

text = log.read_text(errors="replace")

errors = []

pattern = re.compile(
    r'^(.*?\.(?:ts|tsx))\((\d+),(\d+)\): error (TS\d+): (.*)$'
)

for line in text.splitlines():
    m = pattern.match(line.strip())
    if not m:
        continue

    file, row, col, code, message = m.groups()

    errors.append({
        "file": file,
        "line": row,
        "column": col,
        "code": code,
        "message": message,
    })

groups = defaultdict(list)

for error in errors:
    groups[error["file"]].append(error)

with out.open("w") as f:

    f.write("# TypeScript Semantic Remediation Queue\n\n")

    f.write(
        "> Every item must restore the canonical semantic model. "
        "Do not resolve errors through `any`, suppression, unsafe casts, "
        "or arbitrary `user_id → organisation_id` substitution.\n\n"
    )

    f.write(f"Total compiler errors: **{len(errors)}**\n\n")

    for file, file_errors in sorted(groups.items()):

        f.write(f"## `{file}`\n\n")

        for error in file_errors:

            message = error["message"].lower()

            if "user" in message or "organisation" in message:
                category = "IDENTITY / ORGANISATION SEMANTICS"

            elif "property" in message:
                category = "TYPE / CONTRACT"

            elif "argument" in message:
                category = "FUNCTION CONTRACT"

            elif "assign" in message:
                category = "DATA SHAPE"

            else:
                category = "SEMANTIC REVIEW"

            f.write(
                f"- [ ] **{category}** "
                f"`{error['code']}` "
                f"line {error['line']}:{error['column']}\n"
            )

            f.write(
                f"  - Compiler: {error['message']}\n"
            )

            f.write(
                "  - Canonical owner: **UNRESOLVED**\n"
            )

            f.write(
                "  - Required chain: "
                "`Auth → Person → Membership → Organisation`\n"
            )

            f.write(
                "  - Resolution: **SEMANTIC DECISION REQUIRED**\n\n"
            )

    if not errors:
        f.write("No TypeScript errors detected.\n")

print(f"Wrote {len(errors)} semantic queue entries to {out}")
PY

echo
echo "============================================================"
echo "SEMANTIC REMEDIATION QUEUE"
echo "============================================================"
echo
cat "$QUEUE"