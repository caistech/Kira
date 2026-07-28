// Generate the demo narration as audio files, in Kira's own voice.
//
//   node --env-file=.env.local scripts/generate-demo-audio.mjs
//
// PRE-GENERATED, NOT A LIVE AGENT — and the reason is the ICP, not cost. A live agent needs
// microphone permission and shows the vendor consent modal about sharing with third-party
// processors. For a 66-year-old who has told nobody he is selling, being asked for his microphone on
// a first visit is exactly the thing that closes the tab. Pre-generated narration plays like a
// video: no prompt, no modal, no mic — and it still does the one thing that matters, which is that
// he HEARS her. Every line is captioned, so it also works with the sound off.
//
// THE VOICE ID IS PINNED AND THIS SCRIPT REFUSES TO GUESS. lib/kira/discovery-config.ts falls back
// to a DIFFERENT ElevenLabs voice when the env is missing, so a generator written with the usual
// `process.env.X || DEFAULT` would silently narrate the demo in a woman the product does not use —
// and it would look like it worked. A demo that sounds like someone else is worse than no audio,
// because it is the one thing a listener cannot un-hear.

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'public', 'demo-audio');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.NEXT_PUBLIC_KIRA_VOICE_ID;

if (!API_KEY) {
  console.error('ELEVENLABS_API_KEY is required.');
  process.exit(1);
}
if (!VOICE_ID) {
  // Deliberately fatal. See the note above — a fallback here is silent and unrecoverable-looking.
  console.error(
    'NEXT_PUBLIC_KIRA_VOICE_ID is required and must be the PRODUCT voice (M7ya1YbaeFaPXljg9BpK,\n' +
      '"Hannah Jayne"). Refusing to substitute a default: the demo would be narrated by a different\n' +
      'woman than the product, which is worse than shipping no audio at all.',
  );
  process.exit(1);
}

/** Content-addressed filenames: the same line never regenerates, a changed line always does. */
function fileFor(text) {
  return `${createHash('sha256').update(`${VOICE_ID}:${text}`).digest('hex').slice(0, 16)}.mp3`;
}

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function synthesise(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      // Steady rather than expressive: she is explaining something to a sceptical 66-year-old, not
      // performing. High similarity keeps her recognisably the same person as the live agent.
      voice_settings: { stability: 0.55, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  // Import the narration from the single source, so the audio can never drift from the captions.
  const { ICP_BEATS, ADVISOR_BEATS } = await import('../lib/genome/timeline.ts').catch(async () => {
    // .ts import needs a loader; fall back to reading the literal strings out of the module.
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(path.join(process.cwd(), 'lib', 'genome', 'timeline.ts'), 'utf8');
    const grab = (name) => {
      const block = src.split(`export const ${name}`)[1] ?? '';
      return [...block.matchAll(/narration:\s*\n?\s*((?:'[^']*'|"[^"]*")(?:\s*\+\s*(?:'[^']*'|"[^"]*"))*)/g)]
        .map((m) => m[1].split('+').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).join(''))
        .map((narration) => ({ narration }));
    };
    return { ICP_BEATS: grab('ICP_BEATS'), ADVISOR_BEATS: grab('ADVISOR_BEATS') };
  });

  await mkdir(OUT_DIR, { recursive: true });
  const manifest = {};
  let made = 0, skipped = 0;

  for (const [label, beats] of [['icp', ICP_BEATS], ['advisor', ADVISOR_BEATS]]) {
    for (const beat of beats) {
      const text = beat.narration;
      if (!text) continue;
      const file = fileFor(text);
      const full = path.join(OUT_DIR, file);
      if (await exists(full)) {
        skipped += 1;
      } else {
        process.stdout.write(`  generating ${label}: ${text.slice(0, 46)}…\n`);
        await writeFile(full, await synthesise(text));
        made += 1;
      }
      manifest[createHash('sha256').update(text).digest('hex').slice(0, 16)] = `/demo-audio/${file}`;
    }
  }

  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n  ${made} generated, ${skipped} already present. Voice: ${VOICE_ID}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
