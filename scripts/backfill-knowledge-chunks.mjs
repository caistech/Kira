// scripts/backfill-knowledge-chunks.mjs
// One-off: ingest EXISTING kira_knowledge documents into the owned chunk store (kira_knowledge_chunks)
// so already-uploaded docs become retrievable via search_knowledge. New uploads ingest automatically
// in the upload/url routes; this catches the ones uploaded before owned RAG existed.
//
// Self-contained (mirrors lib/kira/knowledge-ingest.ts) because that module uses @/ path aliases and
// can't be imported by a plain node script. Chunk params kept identical.
//
// Usage: node --env-file=.env.local scripts/backfill-knowledge-chunks.mjs [--force]

import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY } = process.env;
const FORCE = process.argv.includes('--force');
const CHUNK_SIZE = 1500, CHUNK_OVERLAP = 200, DIMS = 1536;

if (!SUPABASE_SERVICE_ROLE_KEY || !ELEVENLABS_API_KEY || !OPENAI_API_KEY) {
  throw new Error('Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY');
}
const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function htmlToText(html) {
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*(h[1-6]|p|div|li|br|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/gm, '').trim();
}

function chunkText(text) {
  const clean = text.replace(/\s+\n/g, '\n').trim();
  if (clean.length <= CHUNK_SIZE) return clean ? [clean] : [];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const floor = start + Math.floor(CHUNK_SIZE * 0.6);
      const para = clean.lastIndexOf('\n\n', end);
      const sentence = Math.max(clean.lastIndexOf('. ', end), clean.lastIndexOf('.\n', end));
      const space = clean.lastIndexOf(' ', end);
      const brk = [para, sentence, space].find((p) => p > floor);
      if (brk && brk > start) end = brk + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

async function extractText(docId) {
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${docId}`, { headers: { 'xi-api-key': ELEVENLABS_API_KEY } });
  if (!r.ok) throw new Error(`EL fetch ${docId}: ${r.status}`);
  const d = await r.json();
  return htmlToText(String(d.extracted_inner_html || d.extracted_text || ''));
}

async function embed(texts) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts, dimensions: DIMS }),
  });
  if (!r.ok) throw new Error(`OpenAI embeddings: ${r.status} ${await r.text()}`);
  const d = await r.json();
  return d.data.sort((a, b) => a.index - b.index).map((x) => x.embedding);
}

const { data: docs } = await sb
  .from('kira_knowledge')
  .select('id, user_id, kira_agent_id, elevenlabs_document_id, title')
  .not('elevenlabs_document_id', 'is', null);

console.log(`${docs.length} document(s) with an ElevenLabs id\n`);
let ingested = 0, skipped = 0, failed = 0;

for (const doc of docs) {
  try {
    if (!FORCE) {
      const { count } = await sb.from('kira_knowledge_chunks').select('*', { count: 'exact', head: true }).eq('knowledge_id', doc.id);
      if (count > 0) { console.log(`  = ${doc.title} — already has ${count} chunks, skipping`); skipped++; continue; }
    }
    const text = await extractText(doc.elevenlabs_document_id);
    if (!text || text.length < 20) { console.log(`  · ${doc.title} — no extractable text, skipping`); skipped++; continue; }
    const pieces = chunkText(text);
    const embeddings = await embed(pieces);
    await sb.from('kira_knowledge_chunks').delete().eq('knowledge_id', doc.id);
    const rows = pieces.map((content, i) => ({
      knowledge_id: doc.id, user_id: doc.user_id, kira_agent_id: doc.kira_agent_id ?? null,
      chunk_index: i, content, embedding: embeddings[i], token_count: Math.round(content.length / 4),
    }));
    const { error } = await sb.from('kira_knowledge_chunks').insert(rows);
    if (error) throw new Error(error.message);
    await sb.from('kira_knowledge').update({ raw_content: text.slice(0, 100000), token_count: Math.round(text.length / 4), status: 'indexed' }).eq('id', doc.id);
    console.log(`  ✓ ${doc.title} — ${pieces.length} chunks from ${text.length} chars`);
    ingested++;
  } catch (e) {
    console.error(`  ✗ ${doc.title}: ${e.message}`);
    failed++;
  }
}

console.log(`\nDone. ${ingested} ingested, ${skipped} skipped, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
