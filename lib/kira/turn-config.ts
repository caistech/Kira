// lib/kira/turn-config.ts
//
// The ONE turn-taking config every Kira agent is created and re-briefed with. Three creation paths
// used to carry their own "mirrored" copy, and a mirror is a copy someone forgets to update.
//
// TWO DIFFERENT SETTINGS, AND CONFUSING THEM IS HOW THIS SHIPPED WRONG ONCE (2026-09-30):
//
//   turn_eagerness — how quickly she decides he has FINISHED SPEAKING. `patient` lets him pause
//                    mid-thought without being talked over.
//   turn_timeout   — how long she waits in SILENCE before re-engaging him ("are you still there?").
//                    ElevenLabs' default is 7 seconds.
//
// John Orian's complaint — "the constant checking to see if I am still here" — is turn_timeout. The
// first fix changed turn_eagerness and pinned turn_timeout at 7 explicitly, so the fleet kept asking
// every seven seconds while he went to find a spreadsheet. His transcript shows her re-engaging at
// 329s, 341s, 354s and 373s after he had said "Stop asking if I'm here".
//
// -1 = never re-engage. An owner who leaves to fetch a file comes back to a quiet line. The cost
// bound for an abandoned open call is max_duration_seconds (1 hour), not a nag; and because the
// post-call webhook now distils every call, a dropped session resumes from memory.
// Valid range per the live API: -1, or 1–300 seconds.
export const KIRA_TURN_CONFIG = {
  mode: 'turn',
  turn_eagerness: 'patient',
  turn_timeout: -1,
  silence_end_call_timeout: -1,
  turn_model: 'turn_v3',
} as const;
