// lib/kira/document.ts
//
// read_document — what is actually INSIDE one of the owner's Drive files.
//
// WHY. Search shipped on 31 July and he used it within the minute: found his Lot 109 pre-contract
// quote, opened it, and then asked the obvious next question — is this the one we sent, or the
// final? She could only see the filename. She then offered to "check the contents", which she could
// not do, and had to take it back two turns later. Finding a document and being unable to say
// anything about it is barely half an answer.
//
// WHY IT IS NOT JUST readFileText. The orchestrator's Drive connector reads Google-native documents,
// CSV and plain text. Both of the files he actually asked about were a PDF and a .docx — bytes with
// no text until something extracts them. Shipping the native-only read would have answered "I can't
// read that" on the two documents that prompted the work.
//
// SO EXTRACTION HAPPENS HERE, reusing the one this repo already has. lib/kira/knowledge-ingest.ts
// gets docx/pdf text by pushing the file through ElevenLabs' knowledge base and reading back the
// parsed HTML. That is a commodity step and already the sanctioned path in this product; adding
// mammoth + pdf-parse instead would be a THIRD copy of document extraction in the portfolio, which
// SHARED_SERVICES explicitly names as belonging in @caistech/dataroom-core rather than forked per
// product.
//
// THE VENDOR COPY IS DELETED AFTER EXTRACTION. The upload is a parser call, not storage. Leaving it
// would accumulate copies of a business's private documents in a third party's knowledge base as a
// side effect of someone asking a question out loud, which nobody consented to and nobody would
// think to go and clean up.
//
// NOTHING IS PERSISTED HERE, deliberately. Making a document permanently part of what she knows is
// the /knowledge upload path, where the owner chooses it. A voice question is a question, not a
// filing decision.

import { htmlToText } from '@/lib/kira/knowledge-ingest';

const ORCHESTRATOR_AUTH_HEADER = 'x-orchestrator-secret';

/** The owner is mid-sentence. Beyond this, an honest "still working on it" beats a longer silence. */
const FETCH_TIMEOUT_MS = 12_000;
const EXTRACT_BUDGET_MS = 9_000;

/**
 * How much text comes back. Enough to answer "what is this and what's in it" and to draft from;
 * not so much that a long document floods the model's context mid-call. Truncation is REPORTED,
 * never silent — an agent that does not know it saw half a document will speak about the half it
 * saw as though it were the whole.
 */
const MAX_CHARS = 6000;

export interface DocumentAnswer {
  ok: boolean;
  name?: string;
  mimeType?: string;
  link?: string | null;
  text?: string;
  truncated?: boolean;
  /** True when the file arrived but extraction had not finished inside the budget. */
  pending?: boolean;
  reason?: string;
  message?: string;
}

interface WireFile {
  ok?: boolean;
  reason?: string;
  name?: string;
  mimeType?: string;
  link?: string | null;
  text?: string;
  contentBase64?: string;
}

function clip(text: string): { text: string; truncated: boolean } {
  const clean = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= MAX_CHARS) return { text: clean, truncated: false };
  return { text: clean.slice(0, MAX_CHARS), truncated: true };
}

/**
 * Push bytes through ElevenLabs purely to get text out, then delete the copy.
 *
 * Returns null when extraction produced nothing within the budget — which is a real state and not
 * an error: a scanned PDF with no text layer genuinely has no text to give.
 */
async function extractFromBytes(
  bytes: Buffer,
  name: string,
  mimeType: string,
): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY || '';
  if (!apiKey) {
    console.error('[document] ELEVENLABS_API_KEY missing — cannot extract.');
    return null;
  }

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mimeType || 'application/octet-stream' }), name);

  const upload = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/file', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });
  if (!upload.ok) {
    console.error(`[document] extraction upload failed: ${upload.status} ${(await upload.text()).slice(0, 200)}`);
    return null;
  }
  const documentId = String(((await upload.json()) as { id?: string }).id ?? '');
  if (!documentId) return null;

  try {
    const deadline = Date.now() + EXTRACT_BUDGET_MS;
    let attempt = 0;
    while (true) {
      const res = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${documentId}`, {
        headers: { 'xi-api-key': apiKey },
      });
      if (!res.ok) return null;
      const doc = (await res.json()) as { extracted_inner_html?: string; extracted_text?: string };
      const text = htmlToText(String(doc.extracted_inner_html || doc.extracted_text || ''));
      if (text.length >= 20) return text;
      if (Date.now() >= deadline) return null;
      attempt += 1;
      await new Promise((r) => setTimeout(r, Math.min(1200 * attempt, 2500)));
    }
  } finally {
    // Always, including on the failure paths above — an extraction that went wrong is exactly when
    // a stray copy is most likely to be left behind and least likely to be noticed.
    fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${documentId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
    }).catch((e) => console.error('[document] could not delete the extraction copy:', e));
  }
}

/**
 * Get one file from the orchestrator, or the spoken failure explaining why not.
 *
 * Shared by read and keep so the failure wording cannot drift between them: "you didn't grant Drive
 * access" must read identically whether he asked to see a document or to hold on to it.
 */
async function fetchDriveFile(
  userId: string,
  fileId: string,
): Promise<{ file: WireFile } | { failure: DocumentAnswer }> {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';

  if (!baseUrl || !secret) {
    console.error('[document] ORCHESTRATOR_URL / ORCHESTRATOR_SECRET missing — cannot read.');
    return {
      failure: {
        ok: false,
        reason: 'not_configured',
        message: "I can't open your files just now — that's a problem at my end, not yours.",
      },
    };
  }

  const id = fileId.trim();
  if (!id) {
    return {
      failure: {
        ok: false,
        reason: 'no_file_id',
        message: "Search for the document first and I'll open the one you mean.",
      },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let body: WireFile;
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/tenants/${encodeURIComponent(userId)}/lookup?kind=file&id=${encodeURIComponent(id)}`,
      { headers: { [ORCHESTRATOR_AUTH_HEADER]: secret }, signal: controller.signal },
    );
    if (!res.ok) {
      console.error(`[document] file fetch → ${res.status}`);
      return {
        failure: {
          ok: false,
          reason: 'upstream_error',
          message: "I couldn't open that file just now — nothing's wrong with it, I just couldn't get to it.",
        },
      };
    }
    body = (await res.json()) as WireFile;
  } catch (error) {
    console.error('[document] file fetch failed:', error);
    return {
      failure: {
        ok: false,
        reason: 'upstream_error',
        message: "I couldn't reach your Drive just now — worth trying again in a moment.",
      },
    };
  } finally {
    clearTimeout(timer);
  }

  if (!body.ok) {
    // Written by the orchestrator to be spoken; carried through unaltered for the same reason as
    // every other lookup — "you didn't grant Drive access" must not become "I found nothing".
    return {
      failure: { ok: false, reason: 'upstream_declined', message: body.reason || "I couldn't open that file." },
    };
  }

  return { file: body };
}

export async function readDocument(userId: string, fileId: string): Promise<DocumentAnswer> {
  const fetched = await fetchDriveFile(userId, fileId);
  if ('failure' in fetched) return fetched.failure;
  const body = fetched.file;

  const name = body.name ?? 'that file';
  const common = { name, mimeType: body.mimeType, link: body.link ?? null };

  if (typeof body.text === 'string' && body.text.trim()) {
    const { text, truncated } = clip(body.text);
    return { ok: true, ...common, text, truncated };
  }

  if (!body.contentBase64) {
    return {
      ok: false,
      ...common,
      reason: 'unreadable_type',
      message: `I can see "${name}" but I can't read what's inside it — tell me what you need from it and I'll work from that.`,
    };
  }

  const extracted = await extractFromBytes(
    Buffer.from(body.contentBase64, 'base64'),
    name,
    body.mimeType ?? '',
  );

  if (extracted === null) {
    return {
      ok: true,
      ...common,
      pending: true,
      message: `I've got "${name}" but I'm still reading it — ask me again in a moment. If it's a scan rather than a document, there may be no text in it for me to read at all.`,
    };
  }

  const { text, truncated } = clip(extracted);
  return { ok: true, ...common, text, truncated };
}

/* ========================================================================== */
/*  KEEPING a document — the half that only ever runs on an explicit yes.      */
/* ========================================================================== */
//
// Reading and filing are different acts and only one of them is a question. "What's in the Lot 109
// quote?" asks her to look at something; it does not say "this document is part of my business
// record." Collapsing the two means a fifteen-minute call in which she opens nine files — a
// superseded draft, someone else's confidential quote, a personal document that happened to match —
// silently deposits all nine into the corpus the Genome is built from, with nothing to tell him it
// happened.
//
// The sharpest case is real: the owner separated Global Buildtech material out of the Factory2Key
// Genome by hand. Auto-filing every document she reads would quietly undo that the first time he
// asked about an AI-side file while signed in to the Factory2Key account.
//
// So she offers, and this runs only when he says yes. That is also simply what a good assistant
// does, which is the more important half — the behaviour generalises past documents.

export interface KeepAnswer {
  ok: boolean;
  name?: string;
  /** True when this document was already in the store, so nothing was duplicated. */
  already?: boolean;
  chunks?: number;
  reason?: string;
  message?: string;
}

/** Stable identity for a Drive file in the knowledge store, so keeping it twice is not two copies. */
function driveUrlFor(fileId: string, link?: string | null): string {
  return link || `https://drive.google.com/file/d/${fileId}`;
}

export async function keepDocument(userId: string, fileId: string): Promise<KeepAnswer> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const { ingestKnowledgeDocument, indexKnowledgeText, supersedeOlderVersions } = await import(
    '@/lib/kira/knowledge-ingest'
  );

  const fetched = await fetchDriveFile(userId, fileId);
  if ('failure' in fetched) return fetched.failure;
  const body = fetched.file;

  const name = body.name ?? 'that file';
  const url = driveUrlFor(fileId.trim(), body.link);
  const supabase = createServiceClient();

  // Already kept? Say so rather than making a second copy — retrieval that returns the same document
  // twice reads as two sources agreeing with each other.
  const { data: existing } = await supabase
    .from('kira_knowledge')
    .select('id, status')
    .eq('user_id', userId)
    .eq('url', url)
    .maybeSingle();
  if (existing?.id) {
    return { ok: true, name, already: true, message: `I already have "${name}" — no need to keep it twice.` };
  }

  try {
    // A Google Doc arrives as text and is indexed directly. Sending text to a third-party parser to
    // get the same text back would be a pointless export of a private document.
    if (typeof body.text === 'string' && body.text.trim()) {
      const { data: row, error } = await supabase
        .from('kira_knowledge')
        .insert({
          user_id: userId,
          created_by: userId,
          source_type: 'google_drive',
          title: name,
          file_name: name,
          file_type: body.mimeType ?? null,
          url,
          summary: `From your Google Drive: ${name}`,
          status: 'ready',
        })
        .select()
        .single();
      if (error || !row) throw new Error(`knowledge insert failed: ${error?.message}`);

      const result = await indexKnowledgeText(row.id, body.text);
      await supersedeOlderVersions(row.id, userId, { url });
      return {
        ok: true,
        name,
        chunks: result.chunks,
        message: `Kept "${name}" — I can refer to it from now on.`,
      };
    }

    if (!body.contentBase64) {
      return {
        ok: false,
        name,
        reason: 'unreadable_type',
        message: `I can't read what's inside "${name}", so there'd be nothing for me to keep.`,
      };
    }

    // Everything else goes through the extractor — and THIS copy is not deleted, because here the
    // upload is the storage step rather than a parser call. That asymmetry with readDocument is the
    // whole point: a question borrows the vendor, a decision to keep uses it.
    const apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing');

    const bytes = Buffer.from(body.contentBase64, 'base64');
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(bytes)], { type: body.mimeType || 'application/octet-stream' }),
      name,
    );
    const upload = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/file', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    });
    if (!upload.ok) throw new Error(`extraction upload failed: ${upload.status}`);
    const documentId = String(((await upload.json()) as { id?: string }).id ?? '');
    if (!documentId) throw new Error('extraction upload returned no id');

    const { data: row, error } = await supabase
      .from('kira_knowledge')
      .insert({
        user_id: userId,
        created_by: userId,
        elevenlabs_document_id: documentId,
        source_type: 'google_drive',
        title: name,
        file_name: name,
        file_size: bytes.byteLength,
        file_type: body.mimeType ?? null,
        url,
        summary: `From your Google Drive: ${name}`,
        status: 'ready',
      })
      .select()
      .single();
    if (error || !row) throw new Error(`knowledge insert failed: ${error?.message}`);

    const result = await ingestKnowledgeDocument(row.id);
    await supersedeOlderVersions(row.id, userId, { url });

    if (!result.chunks) {
      // Recorded, but there is nothing to retrieve. Say that — "kept" implying she can now answer
      // from it, when she cannot, is the same broken promise in a smaller frame.
      return {
        ok: true,
        name,
        chunks: 0,
        message: `I've saved "${name}", but there was no readable text in it — if it's a scan I won't be able to answer from it.`,
      };
    }

    return { ok: true, name, chunks: result.chunks, message: `Kept "${name}" — I can refer to it from now on.` };
  } catch (e) {
    console.error('[document] keep failed:', e);
    return {
      ok: false,
      name,
      reason: 'keep_failed',
      message: `I couldn't hold on to "${name}" just now — nothing was saved, so it's worth asking me again.`,
    };
  }
}
