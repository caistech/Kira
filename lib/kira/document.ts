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

export async function readDocument(userId: string, fileId: string): Promise<DocumentAnswer> {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';

  if (!baseUrl || !secret) {
    console.error('[document] ORCHESTRATOR_URL / ORCHESTRATOR_SECRET missing — cannot read.');
    return {
      ok: false,
      reason: 'not_configured',
      message: "I can't open your files just now — that's a problem at my end, not yours.",
    };
  }

  const id = fileId.trim();
  if (!id) {
    return {
      ok: false,
      reason: 'no_file_id',
      message: "Search for the document first and I'll open the one you mean.",
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
        ok: false,
        reason: 'upstream_error',
        message: "I couldn't open that file just now — nothing's wrong with it, I just couldn't get to it.",
      };
    }
    body = (await res.json()) as WireFile;
  } catch (error) {
    console.error('[document] file fetch failed:', error);
    return {
      ok: false,
      reason: 'upstream_error',
      message: "I couldn't reach your Drive just now — worth trying again in a moment.",
    };
  } finally {
    clearTimeout(timer);
  }

  if (!body.ok) {
    // Written by the orchestrator to be spoken; carried through unaltered for the same reason as
    // every other lookup — "you didn't grant Drive access" must not become "I found nothing".
    return { ok: false, reason: 'upstream_declined', message: body.reason || "I couldn't open that file." };
  }

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
