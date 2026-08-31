-- Owned RAG for Kira Exec — chunk-level store (DATA_STANDARD owned-RAG: authoritative prose you
-- must cite lives in OUR infra, not a vendor knowledge base). kira_knowledge stays the DOCUMENT
-- parent (title/url/source for citation); this table holds the embedded CHUNKS the agent retrieves.
--
-- Mirrors the portfolio planning_chunks shape so it lifts cleanly into the canonical package (#4).

create extension if not exists vector;

create table if not exists kira_knowledge_chunks (
  id            uuid primary key default gen_random_uuid(),
  knowledge_id  uuid not null references kira_knowledge(id) on delete cascade,
  -- Denormalised for the user-scoped match RPC + RLS (retrieval never joins to resolve ownership).
  user_id       uuid not null references users(id) on delete cascade,
  kira_agent_id uuid references kira_agents(id) on delete set null,
  chunk_index   int  not null,
  content       text not null,
  embedding     vector(1536),           -- text-embedding-3-small (EMBEDDING_DIMENSIONS)
  token_count   int  default 0,
  created_at    timestamptz default now()
);

create index if not exists idx_kk_chunks_knowledge on kira_knowledge_chunks(knowledge_id);
create index if not exists idx_kk_chunks_user      on kira_knowledge_chunks(user_id);
-- HNSW cosine index (pgvector >=0.5, supported on Supabase). The per-user corpus is small, so this
-- is a nicety, not load-bearing — cosine ordering is correct without it.
do $$
begin
  create index idx_kk_chunks_embedding on kira_knowledge_chunks
    using hnsw (embedding vector_cosine_ops);
exception when others then
  -- HNSW unavailable on this instance — skip; ordering still works via seq scan at this scale.
  raise notice 'hnsw index skipped: %', sqlerrm;
end $$;

alter table kira_knowledge_chunks enable row level security;

do $$
begin
  drop policy if exists "own chunks select" on kira_knowledge_chunks;
  drop policy if exists "service role chunks" on kira_knowledge_chunks;
end $$;

create policy "own chunks select" on kira_knowledge_chunks
  for select using (auth.uid() = user_id);
create policy "service role chunks" on kira_knowledge_chunks
  for all using (auth.role() = 'service_role');

-- User-scoped cosine match, joining the parent for citation. SECURITY DEFINER + an explicit
-- p_user_id the CALLER supplies: the retrieval handler derives that id server-side from the
-- conversation binding (never from the agent), exactly like recall_memory — so the tier filter
-- (which user's corpus) can only narrow, never widen. search_path pinned per Supabase lint.
create or replace function match_kira_knowledge_chunks(
  p_user_id          uuid,
  p_query_embedding  vector(1536),
  p_match_count      int   default 6,
  p_min_similarity   float default 0.15
) returns table (
  chunk_id     uuid,
  knowledge_id uuid,
  content      text,
  similarity   float,
  title        text,
  url          text,
  source_type  text
) language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.knowledge_id,
    c.content,
    1 - (c.embedding <=> p_query_embedding) as similarity,
    k.title,
    k.url,
    k.source_type
  from kira_knowledge_chunks c
  join kira_knowledge k on k.id = c.knowledge_id
  where c.user_id = p_user_id
    and c.embedding is not null
    and 1 - (c.embedding <=> p_query_embedding) > p_min_similarity
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
$$;
