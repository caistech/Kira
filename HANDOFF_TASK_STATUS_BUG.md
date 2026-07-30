> **RESOLVED 2026-07-30 in the Kira session. The root cause below is WRONG — read this box first.**
>
> There was no deploy drift. Deployed production == `origin/main` == `c0a53ac`. The writer was a
> **third path neither side checked: `app/api/cron/reconcile-tasks/route.ts`**, which polls
> `getTaskState()` — returning a TaskStatus **object** — and wrote `status: live` (the object) instead
> of `live.status`. Its guard hid it: `live === task.status` compares an object to a string, so it is
> never equal, every row looked changed, and the cron rewrote the same damage every 20 minutes.
>
> Fixed: `live.status` + a runtime `asTaskState()` validator replacing the three bare casts, a CHECK
> constraint on `kira_tasks.status` (applied to prod, live-fire tested — it now refuses the blob), the
> three rows repaired (0 blobs remain), a recipient guard for voice-transcribed addresses, and a
> "Still open" section on `/admin/asked-for`, which read only `unsupported`+`failed` and was therefore
> the reason the rows were invisible even *after* their status was correct. 111/111 tests pass.
>
> Still open for the operator: the Trinh quote's recipient is still `mcdennis@gmail.com` — one letter
> short — and lives in the orchestrator, so it is corrected by confirming the address at approval, not
> by editing Kira's row.

# Handoff — three tasks are stuck and invisible; nothing you asked for was sent

**Written 2026-07-30 from the F2K-Checkpoint session.** Investigated read-only against Kira's
production database (`kmrskyewwnwettlycpfe`). No Kira code or data was changed.

---

## The short version

You asked Kira for three things on 28 July. All three were **drafted correctly and never sent**,
and two independent bugs each explain that on their own:

1. **The whole result object was written into `kira_tasks.status`** instead of the status string.
   Those rows now match no query on any surface — not the approval flow, not `/admin/asked-for`.
   They are in the database and on no page.
2. **The recipient addresses are wrong**, mis-transcribed from voice. Even with (1) fixed, the
   sends would go nowhere.

The drafts themselves are intact and good — including a client-ready **$60,000 + GST quote for
Trinh** that has been sitting invisible for two days.

---

## The three stuck rows

```sql
select id, intent_id, kind, created_at,
       status::json->>'status'                              as embedded_status,
       status::json->'draft'->>'summary'                    as draft_summary,
       status::json->'draft'->'artifact'->'recipients'->>0  as recipient
from kira_tasks
where status like '{%'
order by created_at;
```

| `kira_tasks.id` | kind | should be | drafted | recipient as captured |
|---|---|---|---|---|
| `8cd24bf2-b849-4bbf-b83b-2cadac83550d` | email | `awaiting_approval` | Forwarding Kira's test message to myself | *(none)* |
| `ae1259fd-4145-40cd-a72a-8df482baa249` | email | `queued` | Test email to Kira | `m-c-m-d-e-n-n-i-s@gmail.com` |
| `73a94806-6a1b-4f2d-89e9-11d9281afcc2` | quote | `queued` | **Quote — AI platform development, $60,000 AUD + GST, for Trinh** | `mcdennis@gmail.com` |

All three: `handled_by = 'orchestrator'`, `intent_id = orch:<taskGroupId>`.

`status` on each contains a full Kira-side `DispatchResult` — `{"taskGroupId":…,"status":"queued",
"draft":{…},"message":…}` — rather than one of the six valid `TaskState` strings.

---

## Why nothing surfaced it

- `app/admin/(panel)/asked-for/page.tsx` queries `.in('status', ['unsupported','failed'])`.
- The approval flow looks for `awaiting_approval`.

A row whose status is a JSON blob matches neither, so the page looked calm while three things
waited. `tool-handlers.ts` already carries a comment about exactly this class of failure —
*"a surface that looks calm because it queries the wrong database"* — and this is its sibling:
a surface that looks calm because the rows it wants no longer answer to their own status.

---

## Root cause — what is proven, and what is not

**Proven:** the value in the column is wrong, and it was written by the orchestrator path
(`handled_by='orchestrator'`, `intent_id` prefixed `orch:`).

**Not proven — do not assume the fix is already in:** both current sources look *correct*.

- `lib/kira/swarm/tool-handlers.ts` → `mirrorTask({ … status: result.status … })` ✅
- `lib/kira/swarm/orchestrator-adapter.ts` → `status: (wire.status as TaskState) ?? 'queued'` ✅
- Orchestrator `app/api/v1/dispatch/route.ts` → `status: data.status` (a string column) ✅

So **the build deployed on 28 July differed from what is on disk now**, on one side or the other.
`lib/kira/swarm/` was last edited 28 July 08:10 — the same morning. First job for the Kira session
is to establish whether the deployed Kira and orchestrator are running current `main`, because if
they are, the writer has not been found and the bug will recur.

**The real defect is structural, not the typo.** Three layers should have caught this and none did:

1. `wire.status as TaskState` — a bare cast. TypeScript asserts the shape and validates nothing, so
   an object crossing the wire as `status` is accepted silently.
2. `kira_tasks.status` has **no CHECK constraint**. Any string is storable.
3. The mirror is deliberately fail-soft (`catch { console.error(…) }`) — correct for a live voice
   call, but it means a malformed write is indistinguishable from a healthy one.

---

## Fixes, in priority order

### 1. Repair the three rows (recoverable — the drafts are intact)

```sql
-- Verify first. Expect exactly 3 rows, all with a sane embedded status.
select id, status::json->>'status' from kira_tasks where status like '{%';

update kira_tasks
set status = status::json->>'status'
where status like '{%'
  and status::json->>'status' in
      ('queued','awaiting_approval','scheduled','done','failed','unsupported');
```

The Trinh quote becomes approvable immediately. **Fix the recipient before approving it** — see §3.

### 2. Make the column refuse this

```sql
alter table kira_tasks add constraint kira_tasks_status_check
  check (status in ('queued','awaiting_approval','scheduled','done','failed','unsupported'));
```

This would have rejected the write at source instead of letting it sit for two days. Run it *after*
the repair or it will fail on the existing rows.

Pair it with runtime validation at the wire boundary — replace `wire.status as TaskState` with a
check against the six valid values, defaulting to `'failed'` with a logged reason rather than
passing an unknown value through. A cast is not a check.

### 3. Guard voice-transcribed email addresses

`m-c-m-d-e-n-n-i-s@gmail.com` is your address spelled out letter by letter and taken literally.
`mcdennis@gmail.com` is missing an `m`. Both would have bounced.

Suggested: reject a local-part matching `^([a-z]-){3,}` outright, and have Kira **read the address
back** before drafting a send. The classifier is already forbidden from inventing an address; it
should be equally suspicious of one it heard.

### 4. Confirm `RESEND_API_KEY` in the deployed environment

One task failed 27 July 14:32 with `Error: RESEND_API_KEY is not set`, while another succeeded at
14:27. Something was rotating or partially applied in that window. Worth confirming rather than
assuming it settled.

---

## Secondary finding — "done" looks healthier than it is

13 tasks show `done` in 14 days. **One** was a real request (27 July 14:27, provider id
`8f94204c-a48…`, to `dennis@factory2key.com.au` — the "Follow-up about the Wavecrest quote" that
arrived signed *"Thanks, [Owner's Name]"*, the placeholder bug the code says is since fixed).

The other twelve are **orchestrator dev-tenant seed traffic** on a daily cron — Kowalski Electrical
insurance, Q-3390 Westgate Yard slab, INV-1001 Ellis Plumbing. They are real emails arriving in the
Factory2Key inbox at 00:00/00:15, and they inflate every "is it working?" glance.

`Orchestrator/STATE.md` already flags the related risk in its own words: the cron routes are pinned
to `SEED_TENANT`, which is *"a safeguard by construction, not by intent"* — it protects only because
a constant points somewhere harmless. Worth resolving in the same pass, since a real tenant going
live on that schedule is one changed import away.

---

## Verification once fixed

```sql
-- 0 expected
select count(*) from kira_tasks where status like '{%';

-- the three should now appear with real statuses
select id, kind, status, summary from kira_tasks
where id in ('8cd24bf2-b849-4bbf-b83b-2cadac83550d',
             'ae1259fd-4145-40cd-a72a-8df482baa249',
             '73a94806-6a1b-4f2d-89e9-11d9281afcc2');
```

Then dispatch one task end to end through the orchestrator path and confirm `status` lands as a
bare string — that is the only proof the writer is actually fixed rather than merely absent from
the current source.
