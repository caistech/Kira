// The four questions an advisor actually asks before she puts her name on a referral.
//
// WHY THIS EXISTS AS ITS OWN FILE. The alternative on the table was a memory-governance layer — a
// real build, with a partner, justified as the thing that would satisfy a professional referrer.
// It would not have. An advisor introducing a client is risking her licence and a relationship she
// has held for years, and what she needs is not an architecture diagram: it is four answers she can
// forward to whoever asks her to justify the introduction. That is a page, not a platform.
//
// Each answer describes something that is TRUE OF THE BUILD, not something we intend. If a claim
// here stops being true, this file is wrong and must change — an advisor forwarding a stale
// assurance to her compliance officer is a worse outcome than never having written one.
//
// Single source: the advisor FAQ, the on-page panel, and the downloadable one-pager all read from
// here, because three copies of a compliance answer is three chances to drift and the drift is
// invisible until someone relies on the wrong one.

export interface TrustAnswer {
  /** Her question, in the words she would use — not ours. */
  q: string;
  /** The answer. Plain, specific, and checkable. */
  a: string;
  /** What in the build makes it true. Shown in the one-pager, so it survives being forwarded. */
  basis: string;
}

export const TRUST_ANSWERS: TrustAnswer[] = [
  {
    q: 'If Kira tells my client something wrong, whose problem is that?',
    a:
      'Ours to fix, and nobody’s to rely on as advice. Kira is not a licensed adviser and does not ' +
      'give financial, legal, tax or valuation advice. The valuation she produces is an indicative ' +
      'figure from the owner’s own self-reported numbers — it is labelled that way on the screen ' +
      'where it appears, in the document she exports, and in the terms your client accepts at ' +
      'signup. It is a conversation-starter for the work you do, not a substitute for it. Nothing ' +
      'she produces displaces your engagement or your professional judgement.',
    basis:
      'Indicative-not-appraisal wording appears at the point of display, in the exported document, ' +
      'and in the accepted terms — not only in the terms.',
  },
  {
    q: 'Two of my clients are competitors. Can anything cross between them?',
    a:
      'No. Every owner’s conversations, memory and documents are isolated at the database row ' +
      'level and scoped to their own account — one owner’s data cannot be returned to another ' +
      'account by any path, including Kira herself. The isolation is enforced by the database, not ' +
      'by application code remembering to filter, which is the difference between a rule and a ' +
      'guarantee. Their data also stays on our own infrastructure; we do not hand the substance of ' +
      'their business to a third-party memory service.',
    basis:
      'Row-level security on every table, keyed to the owner’s account; memory and documents stored ' +
      'in our own database rather than an external service.',
  },
  {
    q: 'If my client sells, retires or dies, does their information come out?',
    a:
      'Yes, at any time and without asking us. The owner can export the whole Business Genome ' +
      'themselves in two forms: a handover document written for a buyer’s accountant to read cold, ' +
      'and the raw data in a form another system can read. Every entry is dated to the ' +
      'conversation in which the owner said it, so it reads as evidence rather than assertion. If ' +
      'they stop paying us, they keep it. An executor or a buyer’s adviser gets a document, not a ' +
      'negotiation with a vendor.',
    basis:
      'Self-serve export in both a readable and a machine-readable form, each entry carrying the ' +
      'date it was stated; no export request, no retrieval fee, no lock-in.',
  },
  {
    q: 'Can I see what she told him?',
    a:
      'No — and that is deliberate, because it is what makes your client willing to speak freely. ' +
      'You see whether they opened your link, whether they signed up, and how their valuation is ' +
      'moving. You never see their conversations, their transcripts, or anything Kira remembers ' +
      'about them. The boundary is built into what your dashboard can query, not a policy we ' +
      'promise to observe. Most of these owners have not yet told their own family they are ' +
      'thinking about selling; a referrer who could read the transcript would change what they say ' +
      'to her, and the whole product depends on them saying it.',
    basis:
      'The introducer role can read referral status and valuation movement only; conversation ' +
      'content is outside what that role can query at all.',
  },
];

/** The one-pager, as markdown — the thing she forwards. Generated, never hand-maintained. */
export function trustOnePager(): string {
  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  return [
    '# Kira — what an introducing adviser should know',
    '',
    `Prepared ${today}. Written for advisers introducing a client, and for whoever asks them to`,
    'justify the introduction.',
    '',
    ...TRUST_ANSWERS.flatMap((t) => [`## ${t.q}`, '', t.a, '', `*How that is enforced: ${t.basis}*`, '']),
    '---',
    '',
    'Kira is a software product, not a licensed adviser. It does not provide financial, legal, tax',
    'or valuation advice, and the valuations it produces are indicative figures derived from the',
    'owner’s own self-reported information. Introducing advisers are paid a disclosed ongoing',
    'commission on what the owners they introduce pay us; that disclosure is made to the owner.',
    '',
  ].join('\n');
}
