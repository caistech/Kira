// app/api/kira/knowledge/upload/route.ts
// Upload files to ElevenLabs knowledge base and optionally attach to agent

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { ingestKnowledgeDocument, supersedeOlderVersions } from '@/lib/kira/knowledge-ingest';
import { getCurrentOrganisationContext } from '@/lib/auth';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY missing' },
        { status: 500 }
      );
    }

    // P0.6: Resolve canonical organisation context from session, never from client input.
    const organisationContext = await getCurrentOrganisationContext();
    if (!organisationContext) {
      return NextResponse.json({ error: 'Not signed in or no organisation access' }, { status: 401 });
    }
    const userId = organisationContext.personId;

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const agentId = formData.get('agentId') as string | null;
    const customName = formData.get('name') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`[knowledge/upload] Uploading file: ${file.name} (${file.size} bytes)`);

    // Create form data for ElevenLabs
    const elevenFormData = new FormData();
    elevenFormData.append('file', file);
    if (customName) {
      elevenFormData.append('name', customName);
    }

    // Upload to ElevenLabs knowledge base
    const elevenRes = await fetch(
      'https://api.elevenlabs.io/v1/convai/knowledge-base/file',
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: elevenFormData,
      }
    );

    if (!elevenRes.ok) {
      const errorText = await elevenRes.text();
      console.error('[knowledge/upload] ElevenLabs error:', errorText);
      return NextResponse.json(
        { error: 'Failed to upload to ElevenLabs', details: errorText },
        { status: 502 }
      );
    }

    const elevenData = await elevenRes.json();
    const documentId = elevenData.id;
    const documentName = elevenData.name || customName || file.name;

    console.log(`[knowledge/upload] Created document: ${documentId}`);

    // Save to our database for tracking
    const supabase = createServiceClientV2();

    const { data: knowledgeRecord, error: dbError } = await supabase
      .from('kira_knowledge')
      .insert({
        user_id: userId,
        organisation_id: organisationContext.organisationId,
        created_by: userId,
        elevenlabs_document_id: documentId,
        source_type: 'user_upload',
        title: customName || file.name,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        summary: customName || `Uploaded file: ${file.name}`,
        status: 'ready',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[knowledge/upload] DB error:', dbError);
      // Don't fail - the document was uploaded to ElevenLabs
    }

    // Ingest into the OWNED RAG store (extract → chunk → embed → kira_knowledge_chunks) so the agent
    // can actually retrieve it via search_knowledge. This is the moat; the ElevenLabs upload above is
    // now just a commodity text-extraction step. Best-effort: a failure here doesn't fail the upload
    // (a backfill can re-ingest), but it's the point of the upload so we log loudly.
    if (knowledgeRecord?.id) {
      try {
        const result = await ingestKnowledgeDocument(knowledgeRecord.id);
        console.log(`[knowledge/upload] ingested ${result.chunks} chunk(s) from ${result.chars} chars${result.skipped ? ` (skipped: ${result.skipped})` : ''}`);
        // Latest upload of the same file wins — remove older versions so a re-upload (draft → final)
        // doesn't leave both in the store.
        if (organisationContext.organisationId) {
          const superseded = await supersedeOlderVersions(knowledgeRecord.id, organisationContext.organisationId, { fileName: file.name });
          if (superseded) console.log(`[knowledge/upload] superseded ${superseded} older version(s) of ${file.name}`);
        }
      } catch (e) {
        console.error('[knowledge/upload] owned-RAG ingest failed:', e);
      }
    }

    // If agentId provided, attach document to agent
    if (agentId) {
      const attachResult = await attachDocumentToAgent(agentId, documentId, documentName);
      if (!attachResult.success) {
        console.error('[knowledge/upload] Failed to attach to agent:', attachResult.error);
      } else {
        console.log(`[knowledge/upload] Attached document to agent: ${agentId}`);
      }
    }

    return NextResponse.json({
      success: true,
      documentId,
      documentName,
      knowledgeId: knowledgeRecord?.id,
    });

  } catch (error) {
    console.error('[knowledge/upload] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to attach document to an existing agent
async function attachDocumentToAgent(
  agentId: string,
  documentId: string,
  documentName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First get current agent config to preserve existing knowledge base
    const getRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!getRes.ok) {
      return { success: false, error: 'Failed to get agent' };
    }

    const agentData = await getRes.json();
    const existingKnowledgeBase = agentData.conversation_config?.agent?.prompt?.knowledge_base || [];

    // Add new document to knowledge base with required name field
    const updatedKnowledgeBase = [
      ...existingKnowledgeBase,
      {
        type: 'file',
        id: documentId,
        name: documentName,
      }
    ];

    // Update agent with new knowledge base
    const updateRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                knowledge_base: updatedKnowledgeBase,
              },
            },
          },
        }),
      }
    );

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      return { success: false, error: errorText };
    }

    return { success: true };

  } catch (error) {
    return { success: false, error: String(error) };
  }
}