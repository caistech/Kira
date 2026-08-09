// lib/valuation/headline-numbers.ts
//
// WHAT THE THREE NUMBERS MEAN — said once, in one place, for every surface that prints them.
//
// "WALK AWAY $220k / TODAY $684k / CAPTURED $879k, with nothing saying what walk away means. Walk
// away from what? From the sale? From the business?" (Register P8.) He found out eventually — deep
// inside the valuation, on the intro screen, where the three are explained properly and always have
// been. So the most striking numbers on the landing page were a mystery on the page that has to do
// the persuading, and an argument on the page reached only by people already persuaded.
//
// ⚠️ THIS IS A COPY MOVE, NOT A WRITING JOB, and that is why it is a module rather than three lines
// pasted into two landing components. There are now FOUR surfaces printing these labels — the two
// landings, the valuation intro and the result cards — and a definition living in four places will
// drift in four directions. That is not a hypothetical here: it is precisely the class K15's unbuilt
// `single-statement` check exists to catch, and the register already records three confirmed
// instances of it in this product (P14's /about contradictions, the free-trial CTAs, the retired
// band paragraph).
//
// KEPT SHORT DELIBERATELY. On the landing these sit under a number in a three-across row, on a phone
// as often as not. The full sentence lives on the valuation intro where there is room for it; what
// travels to the landing is the clause that answers "from what?".

export interface HeadlineNumber {
  key: 'walkAway' | 'today' | 'captured';
  /** The label on the landing page's compact three-across row. */
  shortLabel: string;
  /** The label on the valuation intro, where there is room for the longer form. */
  longLabel: string;
  /** The clause that answers "what does that mean?" — the thing that was missing. */
  meaning: string;
}

export const HEADLINE_NUMBERS: readonly HeadlineNumber[] = [
  {
    key: 'walkAway',
    shortLabel: 'Walk away',
    longLabel: 'The walk-away value',
    // ANSWERS HIS ACTUAL QUESTION. "Walk away from what?" — from the business, today, without
    // selling it to anybody. Not from the sale.
    meaning: 'if you closed the doors tomorrow and sold the gear',
  },
  {
    key: 'today',
    shortLabel: 'Today',
    longLabel: "What it's worth today",
    meaning: 'what a buyer would pay as it stands, buying himself a job',
  },
  {
    key: 'captured',
    shortLabel: 'Captured',
    longLabel: "What it's worth once the knowledge in your head is captured",
    meaning: 'once it runs, and sells, without you',
  },
];
