// app/genome/page.tsx
//
// REDIRECT ONLY. The sample moved to /sample-genome on 2026-08-15.
//
// ⚠️ THIS FILE EXISTS BECAUSE THE OLD PATH IS PUBLISHED. `/genome` is linked from the landing (twice
// — desktop nav and mobile drawer, plus inline in the promise paragraph), from /plan, /about,
// /advisors, /what-she-does and the shared site header, and it has been in the marketing surface for
// months. Renaming a public route without a redirect turns every one of those into a 404, including
// any a broker or an introducer has already sent to a client.
//
// WHY IT MOVED. `/genome` and `/my-genome` differ by one word and mean opposite things — the sample
// versus his own. The operator hit `/genome` while signed in, expected his, and got a fictional
// plumber. "The similar naming is going to be confusing" was his verdict, before he knew that was
// exactly what had happened to him.
//
// PERMANENT, deliberately. The old path is not coming back, and a 308 tells search engines and any
// cached link to update rather than re-asking us forever.

import { permanentRedirect } from 'next/navigation';

export default function GenomeRedirect() {
  permanentRedirect('/sample-genome');
}
