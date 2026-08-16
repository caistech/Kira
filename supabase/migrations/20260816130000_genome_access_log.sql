-- Who has looked at an owner's Genome, and when.
--
-- ⚠️ THE ASK, AND WHY IT IS NOT A NICETY. Our own privacy copy says "our support team can see what
-- Kira has captured when they need to keep the service running." That is true, it is the honest
-- thing to say, and said on its own it is the worst sentence in the product for this reader.
--
--   "I accept that, but I'd want a page that lists it — who looked, and when. For a man who hasn't
--    told his wife yet, 'someone might look' without 'here's when they did' is the sort of thing I'd
--    lie awake on." — Ray, 2026-08-16
--
-- A permission with no record is a promise; a permission with a record is an accountability. The
-- difference costs one table.
--
-- ⚠️ THE OWNER READS HIS OWN ROWS AND NOBODY ELSE'S. RLS is on and there is no policy at all, so
-- every read goes through the service role in a route that scopes by the signed-in user — the same
-- shape as every other sensitive table here. A policy allowing a user to select their own rows
-- would be the obvious alternative and is worse: this table names OPERATORS, and a self-select
-- policy is one careless join away from an owner enumerating who works here.

create table if not exists genome_access_log (
  id uuid primary key default gen_random_uuid(),
  -- The owner whose record was opened.
  user_id uuid not null references users(id) on delete cascade,
  -- The operator who opened it, by email. Stored as text rather than a foreign key because the
  -- record must survive that account being deleted — an audit row that disappears with the person
  -- it names is not an audit row.
  viewed_by text not null,
  -- Which surface. "admin-exec" today; named so a second surface cannot be mistaken for the first.
  surface text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists genome_access_log_user_idx on genome_access_log (user_id, viewed_at desc);

alter table genome_access_log enable row level security;

comment on table genome_access_log is
  'Every operator view of an owner Genome. Read back to the owner on his own settings page.';
