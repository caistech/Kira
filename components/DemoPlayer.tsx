'use client';

// The demo player, shared by both audiences and configured per audience.
//
// TWO CONTROL MODELS, and the difference is not styling:
//   ICP     — AUTO-ADVANCE with an obvious pause. He is 66 and will not drive a stepper; he watches.
//   ADVISOR — PREV/NEXT. She is evaluating, and will want to go back and re-read the commission.
//
// AUDIO IS PRE-GENERATED, in the product's own voice. No microphone, no permission prompt, no vendor
// consent modal — for an owner who has told nobody he is selling, being asked for his mic on a first
// visit is what closes the tab. Every line is captioned, so it works with the sound off in a ute or
// an office, and autoplay is never assumed: browsers block it, and a demo that depends on sound is a
// demo that silently does nothing.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Beat } from '@/lib/genome/timeline';
import { DemoScene } from '@/components/DemoScene';

type Mode = 'auto' | 'manual';

/** Same hashing the generator used, so a caption always finds its own audio. */
async function keyFor(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export function DemoPlayer({
  beats,
  mode,
  big = false,
}: {
  beats: Beat[];
  mode: Mode;
  /** ICP sizing: larger targets and type. */
  big?: boolean;
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  // A browser refusing to play is told to the viewer rather than silently turning sound back off —
  // otherwise the button appears to do nothing and there is no way to tell why.
  const [blocked, setBlocked] = useState(false);
  const [manifest, setManifest] = useState<Record<string, string>>({});
  const [src, setSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const beat = beats[i];

  useEffect(() => {
    fetch('/demo-audio/manifest.json').then((r) => (r.ok ? r.json() : {})).then(setManifest).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    keyFor(beat.narration).then((k) => { if (!cancelled) setSrc(manifest[k] ?? null); });
    return () => { cancelled = true; };
  }, [beat, manifest]);

  const next = useCallback(() => setI((n) => (n + 1 < beats.length ? n + 1 : n)), [beats.length]);
  const prev = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  // Auto-advance. Timed off the AUDIO when sound is on, and off reading speed when it is not —
  // otherwise a muted viewer either races ahead of the captions or waits on silence.
  useEffect(() => {
    if (mode !== 'auto' || !playing) return;
    if (sound && src) return; // the audio's ended event drives it instead
    const words = beat.caption.split(/\s+/).length;
    const ms = Math.max(5200, (words / 2.6) * 1000);
    const t = setTimeout(() => { i + 1 < beats.length ? next() : setPlaying(false); }, ms);
    return () => clearTimeout(t);
  }, [mode, playing, sound, src, beat, i, beats.length, next]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !src) return;

    // "Hear Kira" must actually play her.
    //
    // This used to require `sound && playing` — but `playing` is only ever set by the auto-mode
    // Start button, so on the advisor demo (manual) audio could NEVER play, and on the ICP demo it
    // stayed silent unless you happened to press Start before Hear Kira. The button said one thing
    // and did nothing, which on a page whose whole point is "you can hear her" is worse than having
    // no button.
    const shouldPlay = sound && (mode === 'manual' || playing);
    if (shouldPlay) {
      el.currentTime = 0;
      el.play().catch(() => setBlocked(true));  // surfaced, not silently swallowed
    } else {
      el.pause();
    }
  }, [src, sound, playing, i, mode]);

  const btn = big
    ? 'min-h-[56px] px-7 text-lg rounded-full font-display font-bold'
    : 'min-h-[44px] px-5 rounded-full font-display font-semibold';

  return (
    <div className="rounded-3xl border border-amber-200 bg-white overflow-hidden">
      {/* Where we are, in time — the axis of this demo is elapsed time, not steps. */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-amber-100 bg-amber-50/60">
        <span className={`font-display font-bold ${big ? 'text-lg' : ''}`}>{beat.when}</span>
        <span className="text-sm text-stone-500">{i + 1} of {beats.length}</span>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-8">
        {/* The picture first — this audience should see the room before they read about it. */}
        {beat.scene && <DemoScene scene={beat.scene} className="mb-6" />}

        {/* A single figure, large, when the beat turns on a number. A dollar gap read aloud is
            forgettable; the same gap sitting on the screen is the argument. */}
        {beat.figure && (
          <div className="mb-5">
            <p className="font-display font-bold text-4xl sm:text-5xl leading-none"
               style={{ background: 'linear-gradient(135deg,#8b5cf6,#f472b6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {beat.figure.value}
            </p>
            <p className="text-stone-500 mt-2">{beat.figure.label}</p>
          </div>
        )}

        {typeof beat.coverage === 'number' && (
          <div className="mb-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm uppercase tracking-wide text-stone-400 font-semibold">{mode === 'auto' ? 'On the page, not in your head' : 'On the page, not in his head'}</span>
              <span className="font-display font-bold text-2xl">{beat.coverage}%</span>
            </div>
            <div className="h-2 w-full bg-amber-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${beat.coverage}%`, background: 'linear-gradient(135deg,#fb7185,#f472b6)' }} />
            </div>
          </div>
        )}

        {/* The caption IS the content. Sound is an enhancement, never a requirement. */}
        <p className={`leading-relaxed text-stone-800 ${big ? 'text-xl' : 'text-lg'}`}>{beat.caption}</p>

        {/* The action, on the beat that asks for it — not buried below the player. */}
        {beat.cta && (
          <a
            href={beat.cta.href}
            className={`mt-6 inline-flex items-center justify-center text-white font-display font-bold rounded-full ${big ? 'min-h-[60px] px-9 text-xl' : 'min-h-[52px] px-7 text-lg'}`}
            style={{ background: 'linear-gradient(135deg,#fb7185,#f472b6)' }}
          >
            {beat.cta.label} →
          </a>
        )}

        {beat.stillOpen && beat.stillOpen.length > 0 && (
          <div className="mt-5 rounded-2xl bg-amber-100/70 px-4 py-4">
            <p className="font-semibold text-stone-800">Still only in his head</p>
            <ul className="mt-2 space-y-1.5 text-stone-700">
              {beat.stillOpen.map((g) => <li key={g}>· {g}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Controls — words, never icons alone. An icon-only button is invisible to anyone who does
          not already know what it means, and this audience does not. */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-t border-amber-100 bg-amber-50/40">
        {mode === 'auto' ? (
          <button onClick={() => setPlaying((p) => !p)} className={`${btn} grad-coral text-white`} style={{ background: 'linear-gradient(135deg,#fb7185,#f472b6)' }}>
            {playing ? 'Pause' : i === 0 ? 'Start' : 'Continue'}
          </button>
        ) : (
          <>
            <button onClick={prev} disabled={i === 0} className={`${btn} border border-stone-300 disabled:opacity-40`}>Back</button>
            <button onClick={next} disabled={i + 1 >= beats.length} className={`${btn} text-white disabled:opacity-40`} style={{ background: 'linear-gradient(135deg,#fb7185,#f472b6)' }}>Next</button>
          </>
        )}

        <button onClick={() => { setBlocked(false); setSound((s) => !s); }} className={`${btn} border border-stone-300`}>
          {sound ? 'Sound off' : 'Hear Kira'}
        </button>
        {!src && sound && <span className="text-sm text-stone-500">No audio for this step yet.</span>}
        {blocked && <span className="text-sm text-amber-700">Your browser blocked the sound — press Hear Kira again.</span>}

        {i > 0 && (
          <button onClick={() => { setI(0); setPlaying(false); }} className="text-stone-500 underline underline-offset-4 min-h-[44px]">
            Start again
          </button>
        )}
      </div>

      <audio
        ref={audioRef}
        src={src ?? undefined}
        onEnded={() => { if (mode === 'auto' && playing) { i + 1 < beats.length ? next() : setPlaying(false); } }}
        preload="none"
      />
    </div>
  );
}
