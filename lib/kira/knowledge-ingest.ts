// lib/kira/knowledge-ingest.ts
// Owned-RAG ingestion (#11, DATA_STANDARD owned-RAG).
//
// The document's TEXT is extracted by ElevenLabs (a commodity — it already parses docx/pdf/url into
// clean HTML when the upload/url route pushes the file). We pull that extracted text back and do the
// part that is the MOAT entirely in OUR infra: chunk -> embed -> store in kira_knowledge_chunks, so
// retrieval (search_knowledge) runs against our corpus + our embeddings, cited, never a vendor RAG.
//
// Swapping ElevenLabs for local mammoth/pdf-parse later is a one-function change (extractText); the
// owned store + retrieval do not change.

import { createServiceClient } from '@/lib/supabase/server';
import { generateEmbeddings, EMBEDDING_DIMENSIONS } from '@/lib/embeddings/client';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

// ~1500 chars ≈ 375 tokens per chunk with 200-char overlap — a good default for prose retrieval.
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

/** Strip ElevenLabs' extracted HTML to readable plain text (no cheerio dependency). */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*(h[1-6]|p|div|li|br|tr)[^>]*>/gi, '\n') // block elements → newlines
    .replace(/<[^>]+>/g, ' ') // remaining tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

/**
 * Pull the extracted text for a document. ElevenLabs-backed today; the only vendor-coupled step.
 * Extraction can lag a beat behind a fresh upload, so poll briefly (bounded) rather than race it —
 * a business owner who uploads then immediately asks about the doc must find it there.
 */
export async function extractText(elevenlabsDocumentId: string, maxWaitMs = 12_000): Promise<string> {
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;
  // Note: this is a plain script/route context (not a workflow), so Date.now() is available.
  while (true) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/knowledge-base/${elevenlabsDocumentId}`,
      { headers: { 'xi-api-key': ELEVENLABS_API_KEY } },
    );
    if (!res.ok) throw new Error(`ElevenLabs document fetch failed: ${res.status}`);
    const doc = await res.json();
    const text = htmlToText(String(doc.extracted_inner_html || doc.extracted_text || ''));
    if (text.length >= 20 || Date.now() >= deadline) return text;
    attempt++;
    await new Promise((r) => setTimeout(r, Math.min(1500 * attempt, 3000)));
  }
}

/** Split text into overlapping chunks on paragraph/sentence boundaries where possible. */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+\n/g, '\n').trim();
  if (clean.length <= CHUNK_SIZE) return clean ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      // Prefer to break at a paragraph, then a sentence, then a space — within the last 40%.
      const window = clean.slice(start, end);
      const floor = start + Math.floor(CHUNK_SIZE * 0.6);
      const para = clean.lastIndexOf('\n\n', end);
      const sentence = Math.max(clean.lastIndexOf('. ', end), clean.lastIndexOf('.\n', end));
      const space = clean.lastIndexOf(' ', end);
      const brk = [para, sentence, space].find((p) => p > floor);
      if (brk && brk > start) end = brk + 1;
      void window;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

export interface IngestResult {
  knowledgeId: string;
  chunks: number;
  chars: number;
  skipped?: string;
}

/**
 * Ingest one kira_knowledge document into the owned chunk store. Idempotent: clears any existing
 * chunks for the document first, so a re-ingest replaces rather than duplicates. Degrade-don't-fake:
 * a document with no extractable text is recorded (status) and skipped, never faked.
 */
export async function ingestKnowledgeDocument(knowledgeId: string): Promise<IngestResult> {
  const supabase = createServiceClient();

  const { data: doc, error } = await supabase
    .from('kira_knowledge')
    .select('id, user_id, kira_agent_id, elevenlabs_document_id, title')
    .eq('id', knowledgeId)
    .single();
  if (error || !doc) throw new Error(`knowledge row not found: ${knowledgeId}`);
  if (!doc.elevenlabs_document_id) {
    return { knowledgeId, chunks: 0, chars: 0, skipped: 'no elevenlabs_document_id' };
  }

  const text = await extractText(doc.elevenlabs_document_id);
  if (!text || text.length < 20) {
    await supabase.from('kira_knowledge').update({ status: 'empty', raw_content: text || null }).eq('id', knowledgeId);
    return { knowledgeId, chunks: 0, chars: text.length, skipped: 'no extractable text' };
  }

  const pieces = chunkText(text);
  const embeddings = await generateEmbeddings(pieces);
  if (embeddings.length !== pieces.length || embeddings[0]?.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`embedding mismatch: ${embeddings.length} vecs for ${pieces.length} chunks`);
  }

  // Replace existing chunks for this document (idempotent re-ingest).
  await supabase.from('kira_knowledge_chunks').delete().eq('knowledge_id', knowledgeId);

  const rows = pieces.map((content, i) => ({
    knowledge_id: knowledgeId,
    user_id: doc.user_id,
    kira_agent_id: doc.kira_agent_id ?? null,
    chunk_index: i,
    content,
    embedding: embeddings[i],
    token_count: Math.round(content.length / 4),
  }));

  const { error: insErr } = await supabase.from('kira_knowledge_chunks').insert(rows);
  if (insErr) throw new Error(`chunk insert failed: ${insErr.message}`);

  await supabase
    .from('kira_knowledge')
    .update({
      raw_content: text.slice(0, 100_000),
      token_count: Math.round(text.length / 4),
      status: 'indexed',
    })
    .eq('id', knowledgeId);

  return { knowledgeId, chunks: pieces.length, chars: text.length };
}
