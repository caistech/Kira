<# KIRA 5E-D user_id Semantic Sweep
===================================

PURPOSE

Forensically identify EVERY remaining user_id / userId reference in the Kira
repository and classify each occurrence against the canonical 5E-D rules.

CLASSIFICATIONS

A = Legitimate person / provenance context
B = Legacy organisation ownership / tenancy authority
C = Auth identity user_id
D = Historical / compatibility user_id
E = Unsafe / ambiguous usage requiring review or quarantine

IMPORTANT
---------
This script is READ-ONLY.

It does NOT:
- modify source code
- modify SQL
- modify the database
- migrate records
- assign organisation_id
- delete user_id
- "fix" ambiguous records

It produces evidence for the next implementation step.

5E-D PRINCIPLES
---------------
- organisation_id is the canonical organisational anchor.
- user_id remains contextual/person/provenance information where appropriate.
- user_id must not silently remain the tenancy/ownership authority.
- kira_agent_id is Kira Instance context, not ownership.
- ambiguous/conflicting organisational context must be quarantined.
- no organisation is invented merely to satisfy a constraint.
- compatibility mechanisms must not manufacture semantics.
- one user_id must NOT be assumed to equal one organisation.

OUTPUT
------
.\audit\5e-d-user-id-sweep.csv
.\audit\5e-d-user-id-sweep.md
.\audit\5e-d-user-id-summary.txt

USAGE
-----
From repository root:

    .\scripts\5e-d-user-id-sweep.ps1

Optional:

    .\scripts\5e-d-user-id-sweep.ps1 -Root "C:\Users\denni\PycharmProjects\Kira"

    .\scripts\5e-d-user-id-sweep.ps1 -IncludeTests

    .\scripts\5e-d-user-id-sweep.ps1 -ContextLines 8

#>

[CmdletBinding()]
param(
    [string]$Root = (Get-Location).Path,

    [int]$ContextLines = 5,

    [switch]$IncludeTests,

    [string]$OutputDirectory = ".\audit"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

$Root = (Resolve-Path $Root).Path

$ExcludedDirectories = @(
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "coverage",
    ".turbo",
    ".vercel",
    "out",
    "tmp",
    "temp",
    "__pycache__"
)

$Extensions = @(
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".sql",
    ".json",
    ".md",
    ".mjs",
    ".cjs"
)

if (-not $IncludeTests) {
    # Test files are still scanned unless explicitly excluded here.
    # We keep them because tests frequently expose old tenancy assumptions.
    # This variable exists only to make the switch explicit.
}

# These are the canonical tokens we are auditing.
$Patterns = @(
    "user_id",
    "userId",
    "userID",
    "userid"
)

# ---------------------------------------------------------------------------
# Output setup
# ---------------------------------------------------------------------------

$OutputDirectoryPath = Join-Path $Root $OutputDirectory

if (-not (Test-Path $OutputDirectoryPath)) {
    New-Item -ItemType Directory -Path $OutputDirectoryPath -Force | Out-Null
}

$CsvPath = Join-Path $OutputDirectoryPath "5e-d-user-id-sweep.csv"
$MarkdownPath = Join-Path $OutputDirectoryPath "5e-d-user-id-sweep.md"
$SummaryPath = Join-Path $OutputDirectoryPath "5e-d-user-id-summary.txt"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Get-RelativePath {
    param(
        [string]$FullPath
    )

    $resolved = (Resolve-Path $FullPath).Path

    if ($resolved.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $resolved.Substring($Root.Length).TrimStart("\")
    }

    return $resolved
}

function Get-Context {
    param(
        [string[]]$Lines,
        [int]$Index,
        [int]$Radius
    )

    $start = [Math]::Max(0, $Index - $Radius)
    $end   = [Math]::Min($Lines.Count - 1, $Index + $Radius)

    $result = New-Object System.Collections.Generic.List[string]

    for ($i = $start; $i -le $end; $i++) {
        $prefix = if ($i -eq $Index) { ">>> " } else { "    " }
        $result.Add(
            ("{0}{1,5}: {2}" -f $prefix, ($i + 1), $Lines[$i])
        )
    }

    return ($result -join [Environment]::NewLine)
}

function Get-Classification {
    param(
        [string]$Line,
        [string]$Context,
        [string]$RelativePath
    )

    $text = ($Line + "`n" + $Context).ToLowerInvariant()
    $path = $RelativePath.ToLowerInvariant()

    $signals = New-Object System.Collections.Generic.List[string]

    # -----------------------------------------------------------------------
    # D — Historical / compatibility
    # -----------------------------------------------------------------------

    $historicalSignals = @(
        "legacy",
        "compatibility",
        "backward compatibility",
        "historical",
        "migration",
        "deprecated",
        "old user_id",
        "legacy user_id",
        "will be removed",
        "transition layer",
        "adapter",
        "legacy-compatible",
        "provenance"
    )

    foreach ($signal in $historicalSignals) {
        if ($text.Contains($signal)) {
            $signals.Add("D signal: '$signal'")
        }
    }

    # -----------------------------------------------------------------------
    # C — Auth identity
    # -----------------------------------------------------------------------

    $authSignals = @(
        "auth_user_id",
        "auth.uid()",
        "auth.uid",
        "supabase.auth",
        "getuser(",
        "get_user(",
        "authenticated",
        "auth identity",
        "authentication",
        "auth_user",
        "session.user",
        "user.id"
    )

    foreach ($signal in $authSignals) {
        if ($text.Contains($signal)) {
            $signals.Add("C signal: '$signal'")
        }
    }

    # -----------------------------------------------------------------------
    # A — Person / provenance / actor
    # -----------------------------------------------------------------------

    $personSignals = @(
        "created_by",
        "updated_by",
        "actor",
        "person",
        "provenance",
        "provided_by",
        "captured_by",
        "submitted_by",
        "confirmed_by",
        "reviewed_by",
        "person_id",
        "actor_id",
        "user context",
        "user context",
        "who provided",
        "who captured"
    )

    foreach ($signal in $personSignals) {
        if ($text.Contains($signal)) {
            $signals.Add("A signal: '$signal'")
        }
    }

    # -----------------------------------------------------------------------
    # B — Possible legacy ownership / tenancy
    #
    # This is intentionally more conservative.
    #
    # Merely seeing:
    #
    #     .eq('user_id', ...)
    #
    # does NOT automatically make this B.
    #
    # We need ownership/tenancy semantics around it.
    # -----------------------------------------------------------------------

    $ownershipSignals = @(
        "owner",
        "ownership",
        "tenant",
        "tenancy",
        "tenant_id",
        "account owner",
        "owned by",
        "one-agent-per-owner",
        "per-owner",
        "rls",
        "policy",
        "organisation owner",
        "organization owner",
        "belongs to user",
        "user owns",
        "ownership authority",
        "canonical owner",
        "resource owner"
    )

    foreach ($signal in $ownershipSignals) {
        if ($text.Contains($signal)) {
            $signals.Add("B signal: '$signal'")
        }
    }

    # Explicit dangerous patterns are strong B signals.
    if ($text -match "\.eq\s*\(\s*['""]user_id['""]") {
        $signals.Add("B/Ambiguous signal: query filters resource directly by user_id")
    }

    if ($text -match "unique.*user_id" -or $text -match "user_id.*unique") {
        $signals.Add("B signal: user_id participates in uniqueness semantics")
    }

    if ($text -match "user_id.*rls" -or $text -match "rls.*user_id") {
        $signals.Add("B signal: user_id participates in RLS/tenancy semantics")
    }

    if ($text -match "where.*user_id" -and
        $text -match "owner|tenant|account|organisation|organization") {
        $signals.Add("B signal: user_id used in apparent ownership/tenancy predicate")
    }

    # -----------------------------------------------------------------------
    # Explicit canonical migration language
    # -----------------------------------------------------------------------

    $canonicalSignals = @(
        "organisation_id",
        "organization_id",
        "getcurrentorganisationcontext",
        "organisationcontext",
        "canonical organisation",
        "canonical organization",
        "organisation-scoped",
        "organisation scoped",
        "org-scoped",
        "org scoped"
    )

    foreach ($signal in $canonicalSignals) {
        if ($text.Contains($signal)) {
            $signals.Add("Canonical signal: '$signal'")
        }
    }

    # -----------------------------------------------------------------------
    # Determine classification.
    #
    # Safety rule:
    # If evidence conflicts or is weak, return E.
    # -----------------------------------------------------------------------

    $hasA = ($signals | Where-Object { $_ -like "A signal:*" }).Count -gt 0
    $hasB = ($signals | Where-Object { $_ -like "B signal:*" }).Count -gt 0
    $hasC = ($signals | Where-Object { $_ -like "C signal:*" }).Count -gt 0
    $hasD = ($signals | Where-Object { $_ -like "D signal:*" }).Count -gt 0

    $hasCanonical = ($signals | Where-Object { $_ -like "Canonical signal:*" }).Count -gt 0

    # Explicit dangerous combination:
    # user_id + ownership + organisation_id/context
    if ($hasB -and $hasCanonical) {
        return [PSCustomObject]@{
            Classification = "E"
            Confidence     = "HIGH"
            Reason         = "user_id participates in ownership/tenancy semantics despite canonical organisation context being present; manual review required"
            Signals        = ($signals -join " | ")
        }
    }

    # Conflicting identity interpretations.
    if (($hasA -and $hasB) -or
        ($hasB -and $hasC) -or
        ($hasA -and $hasC)) {

        return [PSCustomObject]@{
            Classification = "E"
            Confidence     = "HIGH"
            Reason         = "Conflicting semantic signals; cannot safely determine whether user_id is actor, auth identity, or ownership authority"
            Signals        = ($signals -join " | ")
        }
    }

    # Strong D.
    if ($hasD -and -not $hasB) {
        return [PSCustomObject]@{
            Classification = "D"
            Confidence     = "MEDIUM"
            Reason         = "Occurrence appears to exist for historical, migration, compatibility, or transitional purposes"
            Signals        = ($signals -join " | ")
        }
    }

    # Strong C.
    if ($hasC -and -not $hasB) {
        return [PSCustomObject]@{
            Classification = "C"
            Confidence     = "HIGH"
            Reason         = "Occurrence appears to represent authentication identity rather than organisational ownership"
            Signals        = ($signals -join " | ")
        }
    }

    # Strong A.
    if ($hasA -and -not $hasB) {
        return [PSCustomObject]@{
            Classification = "A"
            Confidence     = "HIGH"
            Reason         = "Occurrence appears to represent person/actor/provenance context"
            Signals        = ($signals -join " | ")
        }
    }

    # Strong B.
    if ($hasB) {
        return [PSCustomObject]@{
            Classification = "B"
            Confidence     = "MEDIUM"
            Reason         = "Occurrence appears to preserve legacy ownership/tenancy semantics; organisation-scoped replacement should be audited"
            Signals        = ($signals -join " | ")
        }
    }

    # Default is E.
    #
    # This is intentional.
    # Lack of evidence is not evidence of legitimate provenance.
    return [PSCustomObject]@{
        Classification = "E"
        Confidence     = "LOW"
        Reason         = "Insufficient semantic evidence to safely classify user_id"
        Signals        = ($signals -join " | ")
    }
}

# ---------------------------------------------------------------------------
# File discovery
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " KIRA 5E-D user_id Semantic Sweep" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository: $Root"
Write-Host ""

$files = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $extensionOK = $Extensions -contains $_.Extension.ToLowerInvariant()

        $excluded = $false

        foreach ($directory in $ExcludedDirectories) {
            if ($_.FullName -match [regex]::Escape("\$directory\")) {
                $excluded = $true
                break
            }
        }

        $extensionOK -and -not $excluded
    }

Write-Host "Files considered: $($files.Count)"
Write-Host ""

# ---------------------------------------------------------------------------
# Sweep
# ---------------------------------------------------------------------------

$results = New-Object System.Collections.Generic.List[object]

$fileNumber = 0

foreach ($file in $files) {

    $fileNumber++

    if (($fileNumber % 100) -eq 0) {
        Write-Host "Scanning $fileNumber / $($files.Count)..."
    }

    try {
        $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
        $lines = Get-Content -LiteralPath $file.FullName -ErrorAction Stop
    }
    catch {
        $results.Add([PSCustomObject]@{
            Classification = "E"
            Confidence = "HIGH"
            File = Get-RelativePath $file.FullName
            Line = 0
            Token = "[FILE READ ERROR]"
            Reason = "Unable to read file: $($_.Exception.Message)"
            Signals = ""
            Context = ""
        })

        continue
    }

    for ($i = 0; $i -lt $lines.Count; $i++) {

        $line = $lines[$i]

        $matchedToken = $null

        foreach ($pattern in $Patterns) {
            if ($line -match [regex]::Escape($pattern)) {
                $matchedToken = $pattern
                break
            }
        }

        if ($null -eq $matchedToken) {
            continue
        }

        $relative = Get-RelativePath $file.FullName

        $context = Get-Context `
            -Lines $lines `
            -Index $i `
            -Radius $ContextLines

        $classification = Get-Classification `
            -Line $line `
            -Context $context `
            -RelativePath $relative

        $results.Add([PSCustomObject]@{
            Classification = $classification.Classification
            Confidence     = $classification.Confidence
            File           = $relative
            Line           = $i + 1
            Token          = $matchedToken
            Reason         = $classification.Reason
            Signals        = $classification.Signals
            Context        = $context
        })
    }
}

# ---------------------------------------------------------------------------
# Sort
# ---------------------------------------------------------------------------

$results = $results |
    Sort-Object `
        @{ Expression = {
            switch ($_.Classification) {
                "E" { 1 }
                "B" { 2 }
                "C" { 3 }
                "A" { 4 }
                "D" { 5 }
                default { 9 }
            }
        }},
        File,
        Line

# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------

$results |
    Export-Csv `
        -LiteralPath $CsvPath `
        -NoTypeInformation `
        -Encoding UTF8

# ---------------------------------------------------------------------------
# Counts
# ---------------------------------------------------------------------------

$total = $results.Count

$countA = @($results | Where-Object Classification -eq "A").Count
$countB = @($results | Where-Object Classification -eq "B").Count
$countC = @($results | Where-Object Classification -eq "C").Count
$countD = @($results | Where-Object Classification -eq "D").Count
$countE = @($results | Where-Object Classification -eq "E").Count

$filesAffected = @($results | Select-Object -ExpandProperty File -Unique).Count

$highRisk = @(
    $results |
        Where-Object {
            $_.Classification -in @("B","E") -and
            $_.Confidence -in @("HIGH","MEDIUM")
        }
).Count

# ---------------------------------------------------------------------------
# Markdown report
# ---------------------------------------------------------------------------

$md = New-Object System.Text.StringBuilder

[void]$md.AppendLine("# KIRA 5E-D `user_id` Semantic Sweep")
[void]$md.AppendLine("")
[void]$md.AppendLine("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$md.AppendLine("")
[void]$md.AppendLine("## Governing rule")
[void]$md.AppendLine("")
[void]$md.AppendLine("`organisation_id` is the canonical organisational anchor. `user_id` may remain as person/actor/provenance context, but must not silently remain the tenancy or ownership authority. Ambiguous organisational context is a quarantine condition, not permission to invent an organisation.")
[void]$md.AppendLine("")
[void]$md.AppendLine("## Summary")
[void]$md.AppendLine("")
[void]$md.AppendLine("| Classification | Meaning | Count |")
[void]$md.AppendLine("|---|---|---:|")
[void]$md.AppendLine("| A | Legitimate person / provenance context | $countA |")
[void]$md.AppendLine("| B | Legacy organisation ownership / tenancy authority | $countB |")
[void]$md.AppendLine("| C | Auth identity | $countC |")
[void]$md.AppendLine("| D | Historical / compatibility | $countD |")
[void]$md.AppendLine("| E | Unsafe / ambiguous | $countE |")
[void]$md.AppendLine("| **TOTAL** | | **$total** |")
[void]$md.AppendLine("")
[void]$md.AppendLine("Files containing matches: **$filesAffected**")
[void]$md.AppendLine("")
[void]$md.AppendLine("High/medium-risk B/E occurrences: **$highRisk**")
[void]$md.AppendLine("")

# ---------------------------------------------------------------------------
# Classification sections
# ---------------------------------------------------------------------------

foreach ($class in @("E","B","C","A","D")) {

    $classResults = @(
        $results |
            Where-Object Classification -eq $class
    )

    if ($classResults.Count -eq 0) {
        continue
    }

    switch ($class) {
        "A" {
            $title = "A = Legitimate person / provenance"
            $description = "These occurrences appear to use user_id as actor, person, creator, confirmer, provenance, or similar contextual identity."
        }
        "B" {
            $title = "B = Legacy organisation ownership / tenancy"
            $description = "These occurrences appear to use user_id as a resource owner, tenant, account authority, RLS boundary, uniqueness boundary, or similar organisational authority."
        }
        "C" {
            $title = "C = Auth identity"
            $description = "These occurrences appear to represent authentication identity rather than canonical organisational identity."
        }
        "D" {
            $title = "D = Historical / compatibility"
            $description = "These occurrences appear to be intentionally retained for migration, historical truth, compatibility, adapters, or transitional behaviour."
        }
        "E" {
            $title = "E = Unsafe / ambiguous"
            $description = "These occurrences cannot safely be assigned a semantic role from static evidence. They require human/code-level review and, where they concern data resolution, quarantine rather than arbitrary assignment."
        }
    }

    [void]$md.AppendLine("## $title")
    [void]$md.AppendLine("")
    [void]$md.AppendLine($description)
    [void]$md.AppendLine("")

    foreach ($item in $classResults) {

        [void]$md.AppendLine("### `$($item.File):$($item.Line)`")
        [void]$md.AppendLine("")
        [void]$md.AppendLine("**Confidence:** $($item.Confidence)")
        [void]$md.AppendLine("")
        [void]$md.AppendLine("**Reason:** $($item.Reason)")
        [void]$md.AppendLine("")

        if ($item.Signals) {
            [void]$md.AppendLine("**Signals:** $($item.Signals)")
            [void]$md.AppendLine("")
        }

        [void]$md.AppendLine("```text")
        [void]$md.AppendLine($item.Context)
        [void]$md.AppendLine("```")
        [void]$md.AppendLine("")
    }
}

$md.ToString() |
    Set-Content `
        -LiteralPath $MarkdownPath `
        -Encoding UTF8

# ---------------------------------------------------------------------------
# Summary text
# ---------------------------------------------------------------------------

$summary = @"
KIRA 5E-D user_id Semantic Sweep
====================================

Repository:
$Root

Generated:
$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

FILES
-----
Files considered: $($files.Count)
Files containing user_id matches: $filesAffected

OCCURRENCES
-----------
Total: $total

A = Legitimate person / provenance:       $countA
B = Legacy ownership / tenancy:           $countB
C = Auth identity:                        $countC
D = Historical / compatibility:           $countD
E = Unsafe / ambiguous:                   $countE

HIGH-RISK REVIEW
----------------
B/E with medium/high confidence: $highRisk

INTERPRETATION
--------------
A:
Retain user_id where it genuinely represents a Person/actor/provenance
dimension. It must not become an organisational ownership substitute.

B:
Audit and migrate to canonical organisation-scoped semantics. Do not simply
delete user_id; determine whether it must remain as actor/provenance context.

C:
Resolve through the canonical Person/Auth model. Authentication identity is
not the same thing as organisational identity.

D:
Retain only where the historical/compatibility purpose is deliberate and
documented. Compatibility must not become a hidden semantic authority.

E:
Do not guess. These require manual review. For DATA migration, unresolved or
conflicting organisational context must be quarantined rather than assigned
arbitrarily.

OUTPUT FILES
------------
CSV:
$CsvPath

Markdown:
$MarkdownPath

Summary:
$SummaryPath
"@

$summary |
    Set-Content `
        -LiteralPath $SummaryPath `
        -Encoding UTF8

# ---------------------------------------------------------------------------
# Console summary
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " SWEEP COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Write-Host ("Total user_id occurrences : {0}" -f $total)
Write-Host ("A  Person / provenance    : {0}" -f $countA)
Write-Host ("B  Ownership / tenancy   : {0}" -f $countB) -ForegroundColor Yellow
Write-Host ("C  Auth identity         : {0}" -f $countC)
Write-Host ("D  Historical / compat   : {0}" -f $countD)
Write-Host ("E  Unsafe / ambiguous    : {0}" -f $countE) -ForegroundColor Red
Write-Host ""
Write-Host ("High/medium-risk B/E     : {0}" -f $highRisk) -ForegroundColor Yellow
Write-Host ""
Write-Host "Reports:"
Write-Host "  $CsvPath"
Write-Host "  $MarkdownPath"
Write-Host "  $SummaryPath"
Write-Host ""

if ($countE -gt 0) {
    Write-Host "IMPORTANT: E-classified occurrences require review." -ForegroundColor Red
    Write-Host "No automatic semantic migration has been performed." -ForegroundColor Red
}

if ($countB -gt 0) {
    Write-Host "IMPORTANT: B-classified occurrences may represent residual tenancy/ownership authority." -ForegroundColor Yellow
}

Write-Host ""