# Builds the CASA status workbook for the Kira / Google app submission.
# Source: code inspection 2026-08-16 (kira + orchestrator repos). Verdicts and the
# "Verified" column state what was actually checked, not what is assumed.

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = r"C:\Users\denni\PycharmProjects\kira\docs\CONNECTOR_COMPLIANCE_STATUS_2026-08-16.xlsx"

HDR_FILL = PatternFill("solid", fgColor="1F3864")
HDR_FONT = Font(color="FFFFFF", bold=True, size=11)
TITLE_FONT = Font(bold=True, size=14, color="1F3864")
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

VERDICT_FILL = {
    "MATCH": PatternFill("solid", fgColor="C6E0B4"),
    "DOC-CLOSABLE": PatternFill("solid", fgColor="FFE699"),
    "GAP-EXTERNAL": PatternFill("solid", fgColor="F8CBAD"),
}
BLOCKER_FILL = PatternFill("solid", fgColor="FF6B6B")

# ---------------------------------------------------------------- Register ---
COLS = [
    ("ID", 8),
    ("Phase", 26),
    ("Area", 20),
    ("Requirement", 46),
    ("Verdict", 15),
    ("Blocker", 9),
    ("Priority", 9),
    ("Owner", 16),
    ("Evidence / what was checked", 60),
    ("Action taken to date", 52),
    ("Action to be taken", 60),
    ("Verified?", 30),
]

# Verdict: MATCH | DOC-CLOSABLE | GAP-EXTERNAL
ROWS = [
    # ---- A. MATCH -----------------------------------------------------------
    ("A1", "0 — Pre-console", "Consent surface", "Public home page, not behind login, relevance clear",
     "MATCH", "No", "P3", "—",
     "docs/DOMAIN_KIRAEXEC.md: kiraexec.com live since 2026-08-05; apex + www 308 to apex",
     "Domain stood up, DNS and redirects configured, Supabase site_url and callback allow-list corrected",
     "Re-confirm the landing page still renders for a logged-out visitor at submission time",
     "Verified in repo docs; not re-fetched live"),

    ("A2", "0 — Pre-console", "Privacy & legal", "Privacy policy hosted on same registrable domain as home page",
     "MATCH", "No", "P3", "—",
     "/privacy served from lib/privacy.ts on kiraexec.com; OAuth client on connect.kiraexec.com (same registrable domain)",
     "Policy written and shipped (feat/regulatory-inclusions, 2026-07-27)",
     "No action",
     "Verified in code"),

    ("A3", "0 — Pre-console", "Privacy & legal", "Policy contains no REPLACE placeholder (REGULATORY_INCLUSIONS §3.2)",
     "MATCH", "No", "P3", "—",
     "lib/privacy.ts — 13 authored sections, no placeholder markers",
     "Written from what the product actually does, not from the template skeleton",
     "No action",
     "Verified in code"),

    ("A4", "0 — Pre-console", "Privacy & legal", "Legal identity, ABN, postal address and contact reachable",
     "MATCH", "No", "P3", "—",
     "privacy §'Who we are': Global Buildtech Australia Pty Ltd, ABN 54 672 395 685, Fortitude Valley postal, contact email",
     "regulatory.config.json operator block confirmed by Dennis 2026-07-27",
     "No action",
     "Verified in code"),

    ("A5", "0 — Pre-console", "Privacy & legal", "Retention, deletion rights and complaint pathway disclosed",
     "MATCH", "No", "P3", "—",
     "privacy §'How long we keep it', §'Your rights' incl. OAIC pathway",
     "Shipped",
     "No action",
     "Verified in code"),

    ("A6", "0 — Pre-console", "Privacy & legal", "Subprocessors and overseas transfer disclosed",
     "MATCH", "No", "P3", "—",
     "privacy §'Who we share it with': Supabase, Vercel, Resend, Stripe, ElevenLabs, AI providers; primary copy in Mumbai named",
     "Shipped",
     "Extend the same section to name Google as a source, not only as a processor — see B1",
     "Verified in code"),

    ("A7", "0 — Pre-console", "Privacy & legal", "Terms of use published",
     "MATCH", "No", "P3", "—",
     "/terms from lib/terms.ts; accepted version recorded at signup",
     "Shipped",
     "No action",
     "Verified in code"),

    ("A8", "1 — Brand verification", "Console", "Authorised domain and OAuth redirect URI configured",
     "MATCH", "No", "P3", "Dennis",
     "CONSOLE CONFIRMED 2026-08-16: client 'KiraExec' (50096334244-…apps.googleusercontent.com), created 12 Aug 2026, redirect https://connect.kiraexec.com/api/connect/google/callback present; authorised domain kiraexec.com present",
     "Client created and wired; env vars set in Vercel prod",
     "See G2 and G3 — three of the four redirect URIs and two of the three authorised domains must be removed before verification",
     "Verified from console screenshot"),

    ("A15", "1 — Brand verification", "Console", "Branding fields populated (app name, support email, logo, home/privacy/terms, dev contact)",
     "MATCH", "No", "P3", "—",
     "CONSOLE CONFIRMED 2026-08-16: name 'KiraExec'; support email dennis@corporateaisolutions.com; logo uploaded; home https://kiraexec.com; privacy https://kiraexec.com/privacy; terms https://kiraexec.com/terms; dev contact set",
     "All fields completed and saved ('Branding changes saved')",
     "Cosmetic only: the logo is the Corporate AI Solutions globe, so the consent screen reads 'KiraExec' beside a CAS mark. Consider a Kira logo — not a blocker",
     "Verified from console screenshot"),

    ("A9", "0 — Pre-console", "Scopes / features", "A working feature exists behind drive and drive.readonly",
     "MATCH", "No", "P2", "—",
     "search_drive + read_document fleet tools; DRIVE_UPLOAD (upload/drive/v3/files) for write-back",
     "Shipped and fleet-consistent across agents",
     "Script and film these for the demo video (B4)",
     "Verified in code"),

    ("A10", "0 — Pre-console", "Scopes / features", "A working feature exists behind gmail.compose",
     "MATCH", "No", "P2", "—",
     "orchestrator/src/connectors/gmail-draft.ts — one endpoint, one verb, no path parameter",
     "Shipped; owner-selectable Gmail level wired end to end 2026-08-15",
     "Film the draft flow for the demo video (B4)",
     "Verified in code"),

    ("A11", "0 — Pre-console", "Scopes / features", "A working feature exists behind both contacts scopes",
     "MATCH", "No", "P2", "—",
     "orchestrator/src/connectors/google-contacts.ts → lookup_contact fleet tool",
     "Shipped",
     "Film contact lookup for the demo video (B4)",
     "Verified in code"),

    ("A12", "2 — Scope declaration", "Scopes / features", "Granted scope is read back, never assumed",
     "MATCH", "No", "P3", "—",
     "grantedDriveAccess / grantedGmailAccess in google.ts read the token response; oauth_states.metadata records what was requested",
     "Built deliberately because a consent screen lets a user untick scopes",
     "Cite this in the justification (B3) — it is strong reviewer evidence of least-privilege discipline",
     "Verified in code"),

    ("A13", "2 — Scope declaration", "Scopes / features", "Least privilege designed in; gmail.send never requested",
     "MATCH", "No", "P3", "—",
     "Three Drive tiers; GmailAccess defaults to none; gmail.send absent and guarded by gmail-no-send.test.ts",
     "Outbound deliberately routed through Resend so it carries ABN, Spam Act footer, suppression store and approval gate",
     "Cite in justification (B3). Widen the guard to cover Microsoft Graph Mail.Send before Graph exists",
     "Verified in code"),

    ("A14", "0 — Pre-console", "Consent surface", "Pre-consent disclosure page names what is granted",
     "MATCH", "No", "P3", "—",
     "/setup/drive + components/DriveConnectForm.tsx now disclose contacts incl. contacts.other.readonly; read-only states its cost",
     "Fixed 2026-08-15 after the page said Drive and Google asked for the address book",
     "Optional: consume orchestrator GET /api/connect/summary when it exists, so copy is derived from scopes rather than typed",
     "Verified in code"),

    # ---- B. DOC-CLOSABLE ----------------------------------------------------
    ("B1", "0 — Pre-console", "Privacy & legal", "Policy must disclose how Google user data is accessed, used, stored, shared + Limited Use",
     "DOC-CLOSABLE", "YES", "P1", "Claude Code",
     "grep of lib/privacy.ts for Google / Drive / Gmail / contacts / Limited Use returns ZERO hits",
     "None — the policy is strong on everything else and silent on the entire integration",
     "Add a Google section: which scopes, what is read, why, where it rests, retention, deletion; plus an explicit Limited Use affirmation. Reviewer's first stop",
     "Verified in code — grep returned nothing"),

    ("B2", "0 — Pre-console", "Privacy & legal", "regulatory.config.json declares the Google inclusion",
     "DOC-CLOSABLE", "No", "P2", "Claude Code",
     "regulatory.config.json has privacy / terms / voice / ip_ack / cookies / automated_decisions — no Google entry",
     "None",
     "Add a google_workspace inclusion (state: customised) pointing at the new privacy section. Silence is not acceptance",
     "Verified in code"),

    ("B3", "2 — Scope declaration", "Submission pack", "Per-scope justification: why narrower scopes are insufficient",
     "DOC-CLOSABLE", "No", "P1", "Claude Code",
     "Argument already exists in google.ts comments and BRIEF_ORCHESTRATOR_DRIVE_FILE_SCOPES.md",
     "Reasoning written during the drive.file investigation",
     "Assemble into a submission document, one paragraph per scope, in a reviewer's language. Needs assembling, not composing",
     "Source material verified in code"),

    ("B4", "2 — Scope declaration", "Submission pack", "Demo video: consent flow, app name, client ID in address bar, one feature per scope",
     "DOC-CLOSABLE", "No", "P1", "Claude Code + Dennis",
     "Google requires English narration, visible client ID, and demonstrated functionality per sensitive/restricted scope",
     "None",
     "Write the shot list and ordering so one take covers all scopes; Dennis records. Blocked on the C1 decision — do not film a scope that may be dropped",
     "Requirement from Google docs; not yet drafted"),

    ("B5", "3 — Assessment", "Submission pack", "SAQ supporting documentation (data flow, storage, access control)",
     "DOC-CLOSABLE", "No", "P2", "Claude Code",
     "Facts exist across repos (Supabase Mumbai, RLS, service-role boundary, orchestrator/Kira seam) but are not assembled",
     "None",
     "Produce a data-flow and data-handling document: where Google data rests, retention, deletion, who can reach it",
     "Not started"),

    ("B6", "3 — Assessment", "Submission pack", "Incident response plan",
     "DOC-CLOSABLE", "No", "P2", "Claude Code",
     "docs/AI_INCIDENT_RESPONSE.md exists",
     "Written for AI incidents",
     "Adapt to cover a Google-token or Google-data incident: detection, revocation, notification, OAIC obligations",
     "File exists; content not assessed against CASA"),

    ("B7", "3 — Assessment", "Security", "Owner-facing disconnect / revoke path",
     "DOC-CLOSABLE", "No", "P2", "Claude Code",
     "connections.revoked_at column exists; no owner-facing route found that sets it",
     "Column and query filters built (.is('revoked_at', null))",
     "Ship a Settings control that revokes the grant at Google and marks the row. Assessors ask how a user withdraws access",
     "Verified by search — a route may exist under a name not searched"),

    # ---- C. GAP-EXTERNAL ----------------------------------------------------
    ("C1", "0 — Pre-console", "Scopes / features", "Every declared scope has a demonstrable feature — gmail.readonly does NOT",
     "GAP-EXTERNAL", "YES", "P1", "Dennis (decision)",
     "Nothing in the orchestrator calls users/me/messages. gmail-draft.ts is the only Gmail consumer and it is compose",
     "Gmail level made owner-selectable 2026-08-15, including a 'read' level with nothing behind it",
     "⚠️ REVISED BY G5: dropping gmail.readonly alone NO LONGER exits restricted territory, because Google classifies gmail.compose as restricted too. Still drop it — an undemonstrable scope is a rejection risk — but the CASA saving now needs BOTH Gmail scopes gone",
     "Verified in code; economics revised against console screenshot"),

    ("C2", "3 — Assessment", "Security", "OAuth token storage at rest",
     "GAP-EXTERNAL", "No", "P1", "Dennis + Claude Code",
     "db/005_connections.sql: access_token and refresh_token are plaintext text columns; comment says Supabase at-rest is 'the floor rather than the ceiling'",
     "RLS in place; no browser-readable policy; tokens held only in the orchestrator, never crossing to Kira",
     "Decide on application-level encryption and key management before the DAST. First-order SAQ question for an app holding standing access to a business's documents",
     "Verified in code"),

    ("C3", "0 — Pre-console", "Console", "Separate Cloud projects for testing and production",
     "GAP-EXTERNAL", "No", "P2", "Dennis",
     "CONSOLE CONFIRMED: ONE project 'kiraexec' serves everything — prod, previews and localhost all hang off the same OAuth client",
     "Single project created 12 Aug 2026",
     "Either split test/prod projects, or clean the one client (G2, G3) so the submitted config is production-only",
     "Verified from console screenshot"),

    ("C4", "1 — Brand verification", "Console", "Brand verification completed and PUBLISHED",
     "GAP-EXTERNAL", "YES", "P1", "Dennis",
     "CONSOLE CONFIRMED: Verification centre reads 'Verification is not required since your app is configured with a testing publishing status'. So verification has NOT started",
     "All branding FIELDS are populated and saved (see A15) — the inputs are ready, the process is not begun",
     "Clean G2/G3 first, then Publish app and submit. Publishing is the act that makes verification required — do not publish before the config is clean",
     "Verified from console screenshot"),

    ("C5", "0 — Pre-console", "Console", "Domain ownership verified in Search Console",
     "GAP-EXTERNAL", "No", "P2", "Dennis",
     "Branding page warns that authorised domains must be verified in Search Console if the app goes through verification. Two of the three current domains are vercel.app — see G2",
     "kiraexec.com is ours and verifiable; the vercel.app domains are not",
     "Verify kiraexec.com under an Owner/Editor account, and delete the vercel.app entries rather than attempting to verify them",
     "Verified from console screenshot"),

    # ---- G. Console findings (new, 2026-08-16) ------------------------------
    ("G1", "0 — Pre-console", "Live defect", "⚠️ Publishing status is TESTING — refresh tokens expire after 7 days",
     "GAP-EXTERNAL", "YES", "P1", "Dennis",
     "CONSOLE CONFIRMED: Audience page shows Publishing status 'Testing', User type External. GOOGLE_WORKSPACE_CONNECTOR.md names this exact trap",
     "None — the connector was built and shipped without the app leaving Testing",
     "This is a LIVE PRODUCTION DEFECT, not just a verification item: every Google connection silently dies each week and re-consent is the only cure. It is the strongest argument for settling the scope set and publishing quickly",
     "Verified from console screenshot"),

    ("G2", "1 — Brand verification", "Console", "Authorised domains include two vercel.app hosts we cannot verify",
     "GAP-EXTERNAL", "YES", "P1", "Dennis + Claude Code",
     "CONSOLE CONFIRMED: authorised domains are kiraexec.com, orchestrator-corporate-ai-solutions.vercel.app, orchestrator-git-main-corporate-ai-solutions.vercel.app",
     "Added to make preview deployments work",
     "Ownership of vercel.app cannot be proven in Search Console, so these BLOCK verification. Remove them, and give preview deploys a kiraexec.com subdomain if OAuth is needed there",
     "Verified from console screenshot"),

    ("G3", "1 — Brand verification", "Console", "Redirect URIs include localhost and two preview hosts",
     "DOC-CLOSABLE", "No", "P2", "Claude Code",
     "CONSOLE CONFIRMED: 4 redirect URIs — connect.kiraexec.com (correct), two vercel.app previews, and http://localhost:3000",
     "Added during development",
     "Strip to the production URI before submitting. A localhost redirect on a client under review invites questions and is trivially avoidable",
     "Verified from console screenshot"),

    ("G4", "0 — Pre-console", "Scopes / features", "Code can request drive (full) but the console does not declare it",
     "GAP-EXTERNAL", "YES", "P1", "Claude Code + Dennis",
     "Console Data access lists ONLY drive.readonly and drive.file. But DRIVE_SCOPE.full in google.ts requests auth/drive, and DriveConnectForm offers it as a tier",
     "The 'full' tier was built and is on screen",
     "Either declare auth/drive (adds a second restricted Drive scope and more to justify) or REMOVE the full tier from the type, the form and the actions. An offered tier that is not declared fails at the consent screen",
     "Verified — console screenshot vs code"),

    ("G5", "2 — Scope declaration", "Scopes / features", "⚠️ CORRECTION: gmail.compose is RESTRICTED, not sensitive",
     "GAP-EXTERNAL", "YES", "P1", "Dennis (decision)",
     "CONSOLE CONFIRMED: Google lists gmail.compose under 'Your restricted scopes → Gmail scopes'. BRIEF_ORCHESTRATOR_DRIVE_FILE_SCOPES.md §2 and every prior analysis had it as sensitive",
     "None — the plan was built on the wrong classification",
     "The no-CASA path is now precisely: drop drive.readonly AND gmail.readonly AND gmail.compose, keeping drive.file + contacts. That means NO Gmail drafting at all — a bigger product cut than the brief assumed. Decide knowingly",
     "Verified from console screenshot — supersedes the repo brief"),

    ("G6", "0 — Pre-console", "Live defect", "Zero OAuth activity — the window to change scopes is open NOW",
     "MATCH", "No", "P1", "Dennis",
     "CONSOLE CONFIRMED: Overview reports no traffic, error or user data; Average Token Grant Rate 0k across 10–16 Aug; client last used 11 Aug 2026",
     "None needed",
     "Nothing is connected in production, so removing or re-tiering scopes breaks no live client today. Every week of delay makes the same edit more expensive. Act on G4 and G5 this week",
     "Verified from console screenshot"),

    ("G7", "0 — Pre-console", "Console", "9 of 100 lifetime test users consumed; real prospects are in the list",
     "DOC-CLOSABLE", "No", "P2", "Dennis",
     "CONSOLE CONFIRMED: 9 users (9 test, 0 other) / 100 cap, counted over the app's ENTIRE LIFETIME. List includes joseph@xcapitalgroup.com.au and several softrefine addresses",
     "Prospects added as test users to let them connect",
     "Testing mode is not an onboarding route — the cap never resets and tokens die weekly (G1). Publishing is the fix, not a bigger test-user list",
     "Verified from console screenshot"),

    ("C6", "3 — Assessment", "Assessment", "Engage and pay an independent assessor",
     "GAP-EXTERNAL", "YES", "P1", "Dennis",
     "Self-scan is no longer available; all restricted-scope apps go to a paid lab. Discounted Tier 2 rate negotiated with TAC Security",
     "None",
     "Engage after Google assigns the tier. Real invoice and real calendar time",
     "External — commercial step"),

    ("C7", "3 — Assessment", "Assessment", "DAST scan, remediation, rescan",
     "GAP-EXTERNAL", "No", "P1", "Assessor + Claude Code",
     "The unpredictable tail — a finding in Supabase config or token handling can add a fortnight",
     "None",
     "Their run, our fixes, their rescan. Budget slack here rather than in the earlier phases",
     "External — cannot be pre-run"),

    ("C8", "0 — Pre-console", "Privacy & legal", "Legal review of the privacy policy",
     "GAP-EXTERNAL", "No", "P2", "Lawyer",
     "regulatory.config.json review block already records: 'A lawyer should review before real volume'",
     "Policy written to operational-baseline standard, explicitly not legal advice",
     "Submitting to Google raises this from prudent to load-bearing. Review together with the introducer agreement",
     "Verified in config; review not commissioned"),

    ("C9", "5 — Ongoing", "Ongoing", "Annual reverification and reassessment",
     "GAP-EXTERNAL", "No", "P2", "Dennis",
     "Required at least every 12 months from Letter of Assessment approval; Google emails the notice",
     "None",
     "Name an owner and diarise. Keep support and developer contact emails live and add a second Owner/Editor account. Missing it revokes access to a product holding client handover documents",
     "External — process step"),
]

# ------------------------------------------------------------------ Scopes ---
SCOPE_COLS = [
    ("Scope", 42), ("Offered via (code)", 26), ("Declared in console?", 20),
    ("Google's own tier", 20), ("Shipped feature behind it", 40), ("Demoable today?", 18),
    ("Action", 50), ("Source", 26),
]
SCOPE_ROWS = [
    ("openid / userinfo.email / userinfo.profile", "Always", "YES", "Non-sensitive",
     "Account identity", "Yes",
     "Declare. No burden", "Console 2026-08-16"),
    ("auth/drive.file", "Drive level: picked", "YES", "NON-SENSITIVE (confirmed)",
     "read_document via a picked handle", "Partly — no Picker UI found",
     "The repo brief's hoped-for row is CORRECT. If this stays an offered tier it needs a Google Picker to function", "Console 2026-08-16"),
    ("auth/contacts.readonly", "Unconditional — every connection", "YES", "Sensitive",
     "lookup_contact (google-contacts.ts)", "Yes",
     "Keep. Disclosed on /setup/drive since 2026-08-15", "Console 2026-08-16"),
    ("auth/contacts.other.readonly", "Unconditional — every connection", "YES", "Sensitive",
     "lookup_contact (google-contacts.ts)", "Yes",
     "Keep, and keep naming it explicitly — it is wider than owners assume", "Console 2026-08-16"),
    ("auth/drive.readonly", "Drive level: readonly (recommended)", "YES", "RESTRICTED",
     "search_drive, read_document", "Yes",
     "Keep if CASA is accepted — the product promise depends on reading existing quotes", "Console 2026-08-16"),
    ("auth/gmail.compose", "Gmail levels: draft AND read", "YES", "⚠️ RESTRICTED (not sensitive)",
     "gmail-draft.ts", "Yes",
     "CORRECTION (G5): every prior analysis had this as sensitive. Gmail cannot be offered at all without CASA", "Console 2026-08-16 — supersedes repo brief"),
    ("auth/gmail.readonly", "Gmail level: read", "YES", "RESTRICTED",
     "NONE — no consumer of users/me/messages", "NO",
     "Drop regardless (C1) — an undemonstrable scope is a rejection risk", "Console 2026-08-16"),
    ("auth/drive (full)", "Drive level: full — ON THE FORM", "⚠️ NO", "RESTRICTED (if declared)",
     "search_drive, read_document, DRIVE_UPLOAD write-back", "Yes, but would fail consent",
     "MISMATCH (G4): the code offers a tier the console does not declare. Declare it or remove the tier", "Console vs code, 2026-08-16"),
    ("auth/gmail.send", "Never requested", "No", "Restricted",
     "n/a — outbound goes via Resend", "n/a",
     "Keep out. Guarded by gmail-no-send.test.ts; widen the guard to Microsoft Graph", "Code 2026-08-16"),
]

# ---------------------------------------------------------------- Sequence ---
SEQ_COLS = [("Step", 8), ("Phase", 26), ("Action", 62), ("Status", 18),
            ("Register ref", 16), ("Owner", 18), ("Notes", 52)]
SEQ_ROWS = [
    ("0.0a", "0 — Pre-console", "DECIDE the Gmail question: CASA for Gmail, or no Gmail at all", "DECISION OPEN", "G5 / C1", "Dennis",
     "gmail.compose is restricted, so drafting cannot ship without CASA. This is now the single decision the rest of the plan hangs off"),
    ("0.0b", "0 — Pre-console", "Fix the drive-full mismatch: declare auth/drive or remove the tier", "NOT STARTED", "G4", "Claude Code",
     "The form offers a tier the console does not declare. Cheap now — nothing is connected (G6)"),
    ("0.0c", "0 — Pre-console", "Remove the two vercel.app authorised domains", "NOT STARTED", "G2", "Dennis",
     "Unverifiable in Search Console, so they block verification outright"),
    ("0.0d", "0 — Pre-console", "Strip localhost and preview redirect URIs from the submission client", "NOT STARTED", "G3", "Claude Code",
     "Leave only connect.kiraexec.com"),
    ("0.1", "0 — Pre-console", "Split test and production Cloud projects", "NOT STARTED", "C3", "Dennis", "One project 'kiraexec' currently serves prod, previews and localhost"),
    ("0.2", "0 — Pre-console", "FREEZE the scope set", "BLOCKED", "C1", "Dennis", "Blocked on the gmail.readonly decision. Changing the set later triggers reassessment"),
    ("0.3", "0 — Pre-console", "Ship a working feature for every declared scope", "PARTIAL", "C1 / A9-A11", "Dennis", "Only gmail.readonly is unbacked"),
    ("0.4", "0 — Pre-console", "Privacy policy discloses Google data use + Limited Use", "NOT STARTED", "B1", "Claude Code", "Hard blocker. Reviewer's first stop"),
    ("0.5", "0 — Pre-console", "Public home page on the policy's domain", "DONE", "A1 / A2", "—", "kiraexec.com live since 2026-08-05"),
    ("0.6", "0 — Pre-console", "Verify domain ownership in Search Console", "NOT STARTED", "C5", "Dennis", "Owner/Editor account required"),
    ("0.7", "0 — Pre-console", "⚠️ Leave TESTING status — refresh tokens currently die every 7 days", "LIVE DEFECT", "G1", "Dennis",
     "Not merely a verification step. Connections silently break weekly until the app is published"),
    ("1.1", "1 — Brand verification", "Verify branding, then PUBLISH within 7 days", "READY ONCE 0.0a-0.0d DONE", "C4 / A15", "Dennis",
     "All branding fields are already populated and saved. 2-3 business days. Do not publish before the config is clean"),
    ("2.1", "2 — Scope declaration", "Declare scopes + up to 3 documentation links", "NOT STARTED", "B3", "Dennis", "Needs published branding first"),
    ("2.2", "2 — Scope declaration", "Write the per-scope justification", "NOT STARTED", "B3", "Claude Code", "Material already in google.ts comments"),
    ("2.3", "2 — Scope declaration", "Record the unlisted demo video", "NOT STARTED", "B4", "Dennis", "Consent flow + client ID visible + one feature per scope"),
    ("3.1", "3 — Assessment", "Google assigns Tier 2 or Tier 3", "PENDING GOOGLE", "—", "Google", "Not our call. Determines assessor scope"),
    ("3.2", "3 — Assessment", "Engage and pay the assessor", "NOT STARTED", "C6", "Dennis", "TAC Security discounted Tier 2 rate"),
    ("3.3", "3 — Assessment", "Complete the SAQ", "NOT STARTED", "B5 / C2", "Claude Code + Dennis", "Token-at-rest is the exposed answer"),
    ("3.4", "3 — Assessment", "DAST scan, remediate, rescan", "NOT STARTED", "C7", "Assessor", "The unpredictable tail"),
    ("3.5", "3 — Assessment", "Assessor issues the Letter of Validation to Google", "NOT STARTED", "—", "Assessor", ""),
    ("4.1", "4 — Google review", "Answer Trust & Safety follow-ups promptly", "NOT STARTED", "—", "Dennis", "The clock stops on their side while they wait on you. This is what turns 3 weeks into 8"),
    ("5.1", "5 — Ongoing", "Diarise annual reverification", "NOT STARTED", "C9", "Dennis", "Missing it revokes access to client handover documents"),
]


def style_sheet(ws, cols, rows, title, subtitle, verdict_col=None, blocker_col=None):
    ws.sheet_view.showGridLines = False
    ws["A1"] = title
    ws["A1"].font = TITLE_FONT
    ws["A2"] = subtitle
    ws["A2"].font = Font(italic=True, size=9, color="595959")
    ws.row_dimensions[1].height = 22

    hdr_row = 4
    for i, (name, width) in enumerate(cols, start=1):
        c = ws.cell(row=hdr_row, column=i, value=name)
        c.fill, c.font, c.border = HDR_FILL, HDR_FONT, BORDER
        c.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.row_dimensions[hdr_row].height = 30

    for r, row in enumerate(rows, start=hdr_row + 1):
        for i, val in enumerate(row, start=1):
            c = ws.cell(row=r, column=i, value=val)
            c.border = BORDER
            c.alignment = Alignment(vertical="top", wrap_text=True)
            c.font = Font(size=10)
        if verdict_col:
            v = ws.cell(row=r, column=verdict_col).value
            if v in VERDICT_FILL:
                ws.cell(row=r, column=verdict_col).fill = VERDICT_FILL[v]
                ws.cell(row=r, column=verdict_col).font = Font(size=10, bold=True)
        if blocker_col and ws.cell(row=r, column=blocker_col).value == "YES":
            bc = ws.cell(row=r, column=blocker_col)
            bc.fill = BLOCKER_FILL
            bc.font = Font(size=10, bold=True, color="FFFFFF")

    ws.freeze_panes = ws.cell(row=hdr_row + 1, column=1)
    ws.auto_filter.ref = (
        f"A{hdr_row}:{get_column_letter(len(cols))}{hdr_row + len(rows)}"
    )
    return hdr_row


# ============================ MICROSOFT GRAPH ================================
# ⚠️ CONFIDENCE NOTE: nothing below is verified against Microsoft's live docs. It is
# general knowledge as at a May 2026 cutoff, and these programmes change. Treat every
# row as "what to check", exactly as BRIEF_ORCHESTRATOR_DRIVE_FILE_SCOPES.md treats
# its own Google tier table. No Microsoft code exists in either repo today (grep for
# graph.microsoft / microsoftonline / msal returned nothing) — this side is greenfield.

MSG_ROWS = [
    ("M1", "0 — Pre-build", "Console", "App registration in Microsoft Entra ID, multi-tenant",
     "GAP-EXTERNAL", "No", "P2", "Dennis",
     "No Microsoft code exists in kira or orchestrator (verified by grep). Entirely greenfield",
     "None",
     "Register the app under the Global Buildtech tenant. Multi-tenant from day one — single-tenant cannot serve clients",
     "Verified absent in code; Microsoft process NOT verified"),

    ("M2", "1 — Verification", "Console", "Publisher Verification (verified Partner Center / MPN ID)",
     "GAP-EXTERNAL", "YES", "P1", "Dennis",
     "The brand-verification analogue. Without it a multi-tenant app shows an 'unverified publisher' warning and many M365 tenants block consent outright",
     "None. Unknown whether Global Buildtech holds a Partner Center account with a verified MPN ID",
     "Stand up Partner Center and verify the publisher ID BEFORE any client sees a consent screen. Org-level setup with its own lead time",
     "NOT verified — Partner Center status unknown"),

    ("M3", "1 — Verification", "Submission pack", "Publisher Attestation (self-declared security & privacy)",
     "DOC-CLOSABLE", "No", "P2", "Claude Code + Dennis",
     "Free, self-serve questionnaire covering data handling, security practices and compliance. The cheap tier of the App Compliance Program",
     "None. Much of the answer material exists — same facts as the CASA SAQ (B5)",
     "Complete once M2 exists. Reuse the B5 data-flow document — write it once, spend it twice",
     "Programme detail NOT verified"),

    ("M4", "3 — Assessment", "Assessment", "Microsoft 365 Certification (the CASA analogue)",
     "GAP-EXTERNAL", "No", "P3", "Dennis (decision)",
     "External assessment, evidence collection, pen test, annual recertification. Understood to be NOT mandatory for plain Graph API access — unlike Google, where restricted scopes force CASA",
     "None",
     "DECIDE LATER. Skip for v1; revisit when an enterprise client demands it. This is the single biggest cost difference between the two platforms",
     "Materially NOT verified — confirm before relying on the 'not mandatory' reading"),

    ("M5", "2 — Consent", "Consent surface", "Tenant admin consent policy is the real gate, not a scope tier",
     "GAP-EXTERNAL", "No", "P1", "Dennis",
     "Many M365 tenants block user consent to unverified third-party apps by default. Our ICP helps: a 60-70yo owner of an SME is usually his own tenant admin",
     "None",
     "Test against a real client tenant early — garda.com.au resolves to Microsoft and is the live first-customer lead. Do not discover this at the demo",
     "Vendor behaviour NOT verified; MX finding is from the repo brief"),

    ("M6", "0 — Pre-build", "Privacy & legal", "Privacy policy and terms URLs on the app registration",
     "MATCH", "No", "P3", "—",
     "kiraexec.com/privacy and /terms already exist and are real (see A2, A7)",
     "Already shipped for Google — the same URLs serve Microsoft",
     "Add a Microsoft section to the policy at the same time as the Google one (B1), so the disclosure is written once",
     "Verified in code"),

    ("M7", "0 — Pre-build", "Console", "Redirect URI under a controlled domain",
     "MATCH", "No", "P3", "—",
     "The connect.kiraexec.com pattern is already proven for Google and Xero",
     "Subdomain, DNS and Vercel routing live since 2026-08-05",
     "Add /api/connect/microsoft/callback to the same host. No new infrastructure",
     "Pattern verified in code"),

    ("M8", "3 — Assessment", "Security", "Token storage at rest — same exposure as Google",
     "GAP-EXTERNAL", "No", "P1", "Dennis + Claude Code",
     "Graph refresh tokens would land in the same plaintext connections columns as the Google ones (db/005_connections.sql)",
     "None",
     "Fix once, in C2, and both platforms inherit it. Do not solve this twice",
     "Verified in code"),

    ("M9", "0 — Pre-build", "Scopes / features", "Mail.Send must never be requested",
     "DOC-CLOSABLE", "YES", "P1", "Claude Code",
     "BRIEF_ORCHESTRATOR_DRIVE_FILE_SCOPES.md §7 asks for exactly this, BEFORE Graph exists: Graph's Mail.Send routes around the Resend compliance path — ABN, Spam Act footer, suppression store, AU-only jurisdiction guard, approval gate",
     "gmail-no-send.test.ts guards Gmail only. It will pass a Graph send path on day one",
     "Rewrite the assertion as 'nothing in this repository sends mail outside the compliance path'. Costs nothing today; much harder to argue after someone has a working Graph draft flow and a deadline",
     "Verified in code — the guard is Gmail-specific"),

    ("M10", "0 — Pre-build", "Scopes / features", "⚠️ Graph has NO draft-only scope — the Gmail tier model does not map",
     "GAP-EXTERNAL", "YES", "P1", "Dennis (decision)",
     "Creating a draft in Graph needs Mail.ReadWrite, which also grants reading the entire mailbox. Gmail's compose tier at least stops short of read; Graph's equivalent does not",
     "None",
     "DECIDE: either the Microsoft 'draft' tier is honestly disclosed as also granting read, or drafting is not offered on Microsoft. Do NOT present a none/draft/read choice that is really none/read/read — that is the /setup/drive contacts surprise repeating on a new platform",
     "Scope behaviour NOT verified — confirm against Graph permission reference"),

    ("M11", "0 — Pre-build", "Architecture", "Build in the orchestrator, tokens never cross the seam",
     "DOC-CLOSABLE", "No", "P2", "Claude Code",
     "docs/CONNECTOR_POLICY.md §D: Kira never holds a connector token; the orchestrator owns credentials; the seam carries facts",
     "Policy written 2026-07-31 and already followed by Google and Xero",
     "Follow the canonical connector shape — signed tenant claim, granted-scope read-back, status endpoint returning facts, agent tool gated on the connection, then re-provision agents",
     "Verified in code"),

    ("M12", "0 — Pre-build", "Architecture", "Build alike so the eventual extraction is a lift, not a rewrite",
     "DOC-CLOSABLE", "No", "P2", "Claude Code",
     "SHARED_SERVICES.md already names @caistech/google-workspace as an open extraction candidate with two divergent implementations",
     "None",
     "Mirror the DriveAccess / GmailAccess shape for Microsoft — same field names, signatures and UX. A third divergent connector makes the extraction a rewrite",
     "Verified in shared docs"),

    ("M13", "2 — Consent", "Scopes / features", "Least-privilege tiering, and only offer what is built",
     "DOC-CLOSABLE", "No", "P1", "Claude Code",
     "The C1 lesson: Kira offered a Gmail read level with no feature behind it. Microsoft is the chance not to repeat it",
     "None",
     "Ship one tier at a time, each with a working feature. The union of offerable scopes is what any reviewer or tenant admin judges",
     "Verified by analogy to C1"),
]

MSG_SCOPE_ROWS = [
    ("User.Read", "Sign-in and basic profile", "No", "Account identity", "Baseline — request",
     "Direct analogue of Google openid/email/profile", "Moderate"),
    ("offline_access", "Refresh token", "No", "Persistent connection", "Baseline — request",
     "Without it every connection dies at first expiry", "High"),
    ("Files.Read", "Own OneDrive, read", "No", "read_document equivalent", "Likely v1",
     "Narrowest useful Drive-read analogue", "Moderate"),
    ("Files.Read.All", "All files the user can reach, incl. shared/SharePoint", "Believed no", "search_drive equivalent", "Needed for discovery",
     "The drive.readonly analogue. Wider than it sounds in a tenant with SharePoint", "Low-to-moderate"),
    ("Files.ReadWrite", "Own OneDrive, read + write", "No", "Filing a handover pack back", "Likely v1",
     "The write-back half of the promise", "Moderate"),
    ("Files.ReadWrite.All", "All reachable files, read + write", "Believed no", "Filing into an existing shared folder", "Only if needed",
     "Largest blast radius on the list. Justify hard or omit", "Low-to-moderate"),
    ("Sites.Read.All", "SharePoint document libraries", "Believed YES", "Reaching company document libraries", "Defer",
     "Admin consent turns a self-serve connect into an IT ticket. Defer past v1", "Low"),
    ("Mail.Read", "Read the mailbox", "No", "NOT BUILT — same gap as gmail.readonly", "Do not request yet",
     "Do not repeat C1: no feature, no scope", "Moderate"),
    ("Mail.ReadWrite", "Create drafts — AND read everything", "No", "Draft equivalent", "⚠️ See M10",
     "No draft-only scope exists. This is the finding that breaks the Gmail tier model", "Low-to-moderate"),
    ("Mail.Send", "Send as the user", "No", "NEVER — outbound goes via Resend", "NEVER REQUEST",
     "Routes around ABN, Spam Act footer, suppression store, jurisdiction guard, approval gate", "High"),
    ("Contacts.Read", "Read contacts", "No", "lookup_contact equivalent", "Likely v1",
     "Analogue of contacts.readonly", "Moderate"),
    ("People.Read", "Relevant people, incl. inferred", "No", "Nearest 'other contacts' analogue", "Disclose loudly if used",
     "Same surprise risk as contacts.other.readonly — name it on screen", "Low-to-moderate"),
]

PLATFORM_COLS = [
    ("Platform", 22), ("Status in our stack", 26), ("Verification regime", 40),
    ("Paid external security assessment?", 30), ("Real gate / friction", 44),
    ("Est. calendar cost", 20), ("Our exposure", 40), ("Recommendation", 44), ("Confidence", 22),
]
PLATFORM_ROWS = [
    ("Google Workspace", "LIVE — Drive, Contacts, Gmail drafts",
     "Brand verification → scope declaration → CASA (Tier 2 or 3)",
     "YES — mandatory for restricted scopes",
     "Restricted scopes force a paid lab assessment for every tenant, even ones who never use them",
     "Weeks to months", "3 restricted scopes in the union; tokens plaintext at rest",
     "Proceed. Settle C1 first — dropping gmail.readonly removes a third of the restricted surface",
     "High — verified in code"),

    ("Microsoft Graph (Mail + OneDrive/SharePoint)", "NOT BUILT — greenfield",
     "App registration → Publisher Verification → optional Publisher Attestation → optional M365 Certification",
     "Believed NO for plain Graph API access; certification is optional",
     "Tenant ADMIN CONSENT policy, not a scope tier. Many tenants block unverified publishers by default",
     "Days to weeks (verification), not months", "None yet — decisions still open",
     "Likely the better platform economically, and roughly two thirds of our contact base is Microsoft. Verify the 'no mandatory assessment' reading before planning on it",
     "LOW — not verified against vendor docs"),

    ("OneDrive / SharePoint", "NOT BUILT — part of Graph",
     "Same app registration as Graph; no separate programme",
     "Same as Graph",
     "Sites.Read.All is believed to need admin consent; personal OneDrive scopes do not",
     "Shared with Graph", "None yet",
     "Ship personal OneDrive first (Files.Read / ReadWrite). Defer SharePoint until a client asks",
     "LOW — not verified"),

    ("Xero", "LIVE — granular read scopes",
     "App registration; certification / App Store listing for scale",
     "No security lab; a Xero app review",
     "⚠️ Uncertified apps are understood to face a hard connection ceiling (order of 25 tenants)",
     "Unknown", "Live connector already in production use",
     "CHECK THE CEILING NOW. If it exists, it caps client count on a connector we already ship — a surprise best found before the tenth client, not after",
     "LOW — flagged for verification, not verified"),

    ("Dropbox", "NOT BUILT",
     "App console; production approval to pass the development user cap",
     "No",
     "Approval review to exceed the dev-mode user limit",
     "Days", "None",
     "Only if a client asks. Low cost, low priority",
     "LOW — not verified"),

    ("Box", "NOT BUILT",
     "App authorization by each enterprise admin",
     "No",
     "Per-enterprise admin authorization — a per-client tax, which CONNECTOR_POLICY.md §A names as a deferral trigger",
     "Days per client", "None",
     "Defer. Fails the 'one app, many consents' preference",
     "LOW — not verified"),

    ("Generic IMAP / SMTP", "NOT BUILT",
     "None",
     "No",
     "Credential custody — app passwords or basic auth, which Google and Microsoft are both retiring",
     "n/a", "None",
     "Avoid. It trades a vendor review for holding a client's mailbox password, which is worse",
     "Moderate"),

    ("Apple / iCloud", "NOT BUILT",
     "No usable mail or file API",
     "n/a",
     "No route",
     "n/a", "None",
     "Not viable. Rule it out rather than re-asking",
     "Moderate"),
]

wb = Workbook()

# Sheet 1 — register
ws = wb.active
ws.title = "CASA Status Register"
hdr = style_sheet(
    ws, COLS, ROWS,
    "CASA readiness — Kira / Google app",
    "Compiled 2026-08-16 from code inspection of the kira and orchestrator repos, PLUS the Google Cloud "
    "Console screenshots of the same date (project 'kiraexec'). Rows G1-G7 are console findings. "
    "The 'Verified?' column states what was actually checked. Search Console and a live OAuth run were NOT inspected.",
    verdict_col=5, blocker_col=6,
)
dv = DataValidation(type="list", formula1='"MATCH,DOC-CLOSABLE,GAP-EXTERNAL"', allow_blank=True)
ws.add_data_validation(dv)
dv.add(f"E{hdr+1}:E{hdr+len(ROWS)}")

# Sheet 2 — scopes
ws2 = wb.create_sheet("Scope Union")
style_sheet(
    ws2, SCOPE_COLS, SCOPE_ROWS,
    "Scope union — what is actually being submitted",
    "Tiers are now GOOGLE'S OWN, read off the console Data access page 2026-08-16 — they supersede the "
    "estimates in BRIEF_ORCHESTRATOR_DRIVE_FILE_SCOPES.md §2. Two corrections: drive.file is confirmed "
    "NON-SENSITIVE, and gmail.compose is RESTRICTED rather than sensitive. Declared restricted scopes are "
    "drive.readonly, gmail.readonly and gmail.compose. The no-CASA path is therefore drive.file + contacts only.",
)

# Sheet 3 — sequence
ws3 = wb.create_sheet("Sequence to Full CASA")
style_sheet(
    ws3, SEQ_COLS, SEQ_ROWS,
    "Sequence to full CASA, with current position",
    "Phase 0 gates everything and is where the weeks hide — none of it runs on Google's clock.",
)

# Sheet 4 — Microsoft Graph register (same columns as the Google register)
ws4 = wb.create_sheet("MS Graph Register")
style_sheet(
    ws4, COLS, MSG_ROWS,
    "Microsoft Graph — readiness analysis (Mail + OneDrive/SharePoint)",
    "NOT BUILT: grep for graph.microsoft / microsoftonline / msal returned nothing in either repo. "
    "⚠️ Microsoft programme detail is general knowledge as at a May 2026 cutoff and is NOT verified against "
    "vendor documentation — treat every Microsoft row as what to check, not what to rely on. "
    "Roughly two thirds of our known contact base is Microsoft, including the live first-customer lead.",
    verdict_col=5, blocker_col=6,
)

# Sheet 5 — Graph scopes
ws5 = wb.create_sheet("MS Graph Scopes")
style_sheet(
    ws5, [("Permission", 26), ("What it grants", 42), ("Admin consent?", 16),
          ("Our feature equivalent", 40), ("v1 position", 24), ("Note", 52), ("Confidence", 22)],
    MSG_SCOPE_ROWS,
    "Microsoft Graph — candidate permission set",
    "The union of offerable permissions is what a tenant admin judges, exactly as with Google. "
    "⚠️ Admin-consent column is NOT verified — confirm each against the Graph permissions reference before building.",
)

# Sheet 6 — platform comparison
ws6 = wb.create_sheet("Platform Comparison")
style_sheet(
    ws6, PLATFORM_COLS, PLATFORM_ROWS,
    "Email & storage platforms — verification regimes compared",
    "Only the Google and Xero rows are grounded in inspected code. Everything else is general knowledge "
    "pending verification. The Confidence column is not decoration — read it before spending money on any row.",
)

wb.save(OUT)
print("written:", OUT)
print("sheets:", wb.sheetnames)
print("google register:", len(ROWS), "| google scopes:", len(SCOPE_ROWS),
      "| sequence:", len(SEQ_ROWS), "| graph register:", len(MSG_ROWS),
      "| graph scopes:", len(MSG_SCOPE_ROWS), "| platforms:", len(PLATFORM_ROWS))
