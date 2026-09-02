// lib/source-scan.ts
//
// Shared helpers for the tests that assert things about SOURCE FILES rather than about behaviour —
// "this page must not still say X", "every page declaring its own <header> must opt out".
//
// EXTRACTED ON THE SECOND OCCURRENCE, per the build-alike rule. `stripComments` lived inside
// `components/corporate/site-chrome.test.ts`; the valuation-claims test needs exactly the same
// thing for exactly the same reason, and a second copy is how two checks come to disagree about
// what a comment is.

/**
 * Strip comments before scanning source for a forbidden string.
 *
 * This is not a nicety, and both consumers learned it the same way. The first run of the site-chrome
 * test failed on `app/plan/page.tsx`, whose own <footer> had just been REMOVED — in a comment that
 * explained the removal by naming the element. So the check failed on the note describing the fix.
 * `@caistech/portfolio-gate`'s offer-claims audit reached the same conclusion independently:
 * punishing an honest explanation teaches people to delete the explanation, which costs more than
 * the check is worth.
 *
 * It also cuts the other way, and that is the half worth stating: a claim quoted inside a comment
 * is not on screen, so scanning raw source reports defects that were fixed. The build register
 * records exactly that trap for P14 — grepping the source returns a hit, and the string is in the
 * rewrite's header comment recording what was removed.
 */
export function stripComments(src: string): string {
  return src
    // JSX comment blocks `{/* ... */}` (and `{ /* ... */ }`). The whitespace between `{` and `/*`
    // is restricted to spaces/tabs (NOT newlines) so that an arrow-function body `{\n  /* ...code...*/ }`
    // is not mistaken for a JSX comment — previously the `\s*` let a code-block open `{` followed by a
    // later `*/ }` on a distant line swallow the code in between (see beta-code-journey.test.ts, where
    // the `const BETA_CODE_KEY = ...` line was consumed). A genuine multi-line JSX comment still matches
    // because its `/*` sits on the same line as the opening `{`.
    .replace(/\{[ \t]*\/\*[\s\S]*?\*\/[ \t]*\}/g, ' ') // JSX comment blocks
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
    .replace(/^\s*\/\/.*$/gm, ' '); // line comments
}
