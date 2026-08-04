// What may travel in the buyer's document.
//
// MOVED HERE from app/api/genome/export/route.ts (2026-08-05) so the renderer can use it without a
// lib → app/api dependency. That direction matters more than it looks: the route carries
// `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`, and importing a route for one pure function
// drags its segment config along with it.
//
// The route re-exports it, so `export-filter.test.ts` and every existing caller are untouched —
// the guarantee keeps its test, which is the point. That test is the assertion that was MISSING
// when the leak happened.

/**
 * Everything in the Genome that may travel in the buyer's document.
 *
 * PURE, and exported, so the guarantee can be tested rather than trusted: nothing carrying a
 * `privateReason` survives this, across BOTH collections. Both are rendered, so filtering only the
 * sections would leak everything that happened to be unfiled — which is exactly the shape of a bug
 * you do not notice until someone reads the document.
 */
export function buyerView<E extends { privateReason: unknown }, S extends { entries: E[] }>(g: {
  sections: S[];
  unsorted: E[];
}): { sections: S[]; unsorted: E[] } {
  const exportable = (e: E) => !e.privateReason;
  return {
    sections: g.sections.map((s) => ({ ...s, entries: s.entries.filter(exportable) })),
    unsorted: g.unsorted.filter(exportable),
  };
}
