// lib/kira/structured-runner.ts
// The injected StructuredRunner for @caistech/discovery-agent — the transcript→schema extraction
// step. Uses OpenAI (Kira's ANTHROPIC_API_KEY is not valid; OPENAI_API_KEY is), via a direct fetch
// with JSON-object response format. The package validates the result against the Zod schema
// (schema.parse), so this just returns well-formed JSON.

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

function schemaHint(schema: ZodType): string {
  try {
    return `\n\nConform to this JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`;
  } catch {
    return '';
  }
}

/** OpenAI-backed structured runner (json_object response format). model.model is the OpenAI id. */
export function createOpenAIRunner(apiKey: string) {
  if (!apiKey) throw new Error('createOpenAIRunner: OPENAI_API_KEY is required');
  return {
    async run<T>({ model, system, input, schema }: RunArgs<T>): Promise<{ result: T; usage?: { input: number; output: number } }> {
      const sys =
        `${system}\n\nReturn ONLY a single JSON object. Use null for anything the transcript does ` +
        `not establish; never invent.${schemaHint(schema as ZodType)}`;
      // Base URL is env-configurable so the LLM layer can point at any OpenAI-compatible endpoint
      // (open-weight servers — vLLM / TGI / Ollama / openrouter — all speak this shape). Defaults to
      // OpenAI, so today's behaviour is unchanged; an acquirer swaps the model runtime via one env var.
      const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.model,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: input },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI extraction failed: ${res.status} ${await res.text()}`);
      }
      const data = await res.json();
      const text: string = data.choices?.[0]?.message?.content || '{}';
      const result = schema.parse(JSON.parse(text));
      const usage = data.usage
        ? { input: data.usage.prompt_tokens ?? 0, output: data.usage.completion_tokens ?? 0 }
        : undefined;
      return { result, usage };
    },
  };
}

/**
 * The plain-text sibling of the runner above — `(system, prompt) => text`.
 *
 * WHY IT LIVES HERE rather than beside its caller. `@caistech/extractors` takes an INJECTED llm of
 * exactly this shape (that is what makes the package framework-agnostic), and the obvious place to
 * satisfy it is a small fetch next to the code doing the extraction. That would be Kira's second
 * OpenAI transport, and the two would drift on the first change — the base-URL override below is
 * precisely the kind of thing that gets fixed in one copy and not the other.
 *
 * So: same env vars, same `OPENAI_BASE_URL` convention, same failure shape as `createOpenAIRunner`.
 * One place in Kira talks to OpenAI. The difference is only that this one does NOT ask for JSON and
 * does not parse — its callers want prose or their own schema handling.
 */
export function createOpenAITextRunner(apiKey: string, model = 'gpt-4.1-mini') {
  if (!apiKey) throw new Error('createOpenAITextRunner: OPENAI_API_KEY is required');
  return async function run(system: string, prompt: string): Promise<string> {
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI text completion failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return String(data.choices?.[0]?.message?.content ?? '');
  };
}
