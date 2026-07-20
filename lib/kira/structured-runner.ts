// lib/kira/structured-runner.ts
// The injected StructuredRunner for @caistech/discovery-agent — the frontier transcript→schema
// extraction step. Anthropic, via a direct fetch (no SDK weight). The package validates the
// result against the Zod schema (schema.parse), so this just has to return well-formed JSON.

import { z, type ZodType } from 'zod';

interface ModelRef {
  provider: 'anthropic' | 'openrouter';
  model: string;
}

interface RunArgs<T> {
  model: ModelRef;
  system: string;
  input: string;
  schema: ZodType<T>;
}

/** Pull the JSON object out of a model reply (tolerates ```json fences / stray prose). */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) throw new Error('No JSON object in extraction reply');
  return body.slice(start, end + 1);
}

export function createAnthropicRunner(apiKey: string) {
  if (!apiKey) throw new Error('createAnthropicRunner: ANTHROPIC_API_KEY is required');
  return {
    async run<T>({ model, system, input, schema }: RunArgs<T>): Promise<{ result: T; usage?: { input: number; output: number } }> {
      let jsonSchema: string | null = null;
      try {
        jsonSchema = JSON.stringify(z.toJSONSchema(schema as ZodType));
      } catch {
        jsonSchema = null; // fall back to prose-only guidance
      }
      const sys =
        `${system}\n\n` +
        `Return ONLY a single JSON object — no prose, no markdown fences. Use null for anything the ` +
        `transcript does not establish; never invent facts.` +
        (jsonSchema ? `\n\nIt must conform to this JSON Schema:\n${jsonSchema}` : '');

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: model.model,
          max_tokens: 4096,
          system: sys,
          messages: [{ role: 'user', content: input }],
        }),
      });
      if (!res.ok) {
        throw new Error(`Anthropic extraction failed: ${res.status} ${await res.text()}`);
      }
      const data = await res.json();
      const text: string = (data.content || [])
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('');
      const result = schema.parse(JSON.parse(extractJson(text)));
      const usage = data.usage
        ? { input: data.usage.input_tokens ?? 0, output: data.usage.output_tokens ?? 0 }
        : undefined;
      return { result, usage };
    },
  };
}
