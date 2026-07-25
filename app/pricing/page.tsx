import { PRICING_FAQ } from '@/lib/faq';
import Link from "next/link";

export const metadata = {
  title: "Pricing — Kira",
  description:
    "Kira for business owners. A free 3-minute valuation, then a fractional exec that captures your business and makes it worth more. Priced in your currency, AUD default.",
};

const PLANS = [
  {
    name: "Free valuation",
    price: "$0",
    period: "no sign-up",
    description: "See what your business is worth today — and the gap hiding in your head.",
    features: [
      "3-minute business valuation",
      "Three honest numbers: walk-away, today, captured",
      "The gap that's locked in your head, in dollars",
      "An itemised 'where value is hiding' breakdown",
    ],
    cta: "Value my business",
    href: "/business-valuation",
    popular: false,
  },
  {
    name: "Kira Exec",
    price: "from $249",
    period: "/month",
    description: "Your fractional exec — captures the business, gets things done, makes it sellable.",
    features: [
      "A voice-first exec that acts, not just advises",
      "Captures your business into a transferable Business Genome",
      "Remembers everything across every conversation",
      "Drafts quotes, emails and reminders — nothing sent without your OK",
      "Your documents, searchable in conversation",
      "First month free · cancel any time",
    ],
    cta: "Start with my valuation",
    href: "/business-valuation",
    popular: true,
  },
];

const FAQ = PRICING_FAQ;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-amber-50 text-stone-800">
      <article className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <header className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-700 mb-3 font-semibold">
            Pricing
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Start free. Pay when it&apos;s worth it.
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            What this page is: what Kira costs a business owner. What to do here: run the free
            valuation, see your number, then decide. Why it matters: you should never pay for the
            exec before you&apos;ve seen the size of the gap she&apos;s helping you close.
          </p>
          <p className="text-sm text-stone-500 mt-3">
            Priced in your currency (AUD default, ex-GST) &middot; Cancel any time
          </p>
        </header>

        <section className="grid md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl bg-white border-2 p-6 ${
                p.popular
                  ? "border-violet-400 shadow-lg shadow-violet-500/10 scale-[1.02]"
                  : "border-stone-200"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  The exec
                </div>
              )}
              <h2 className="text-sm font-semibold text-stone-700">{p.name}</h2>
              <div className="mt-3 mb-2">
                <span className="text-4xl font-bold tracking-tight">
                  {p.price}
                </span>
                <span className="text-sm text-stone-400 ml-1">{p.period}</span>
              </div>
              <p className="text-sm text-stone-500 mb-5">{p.description}</p>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-stone-600"
                  >
                    <span className="text-violet-500 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`block text-center text-sm font-semibold py-3 rounded-full transition-colors min-h-[44px] flex items-center justify-center ${
                  p.popular
                    ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:opacity-90"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </section>

        <section className="max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">
            Pricing questions, answered
          </h2>
          <div className="space-y-5">
            {FAQ.map(({ q, a }) => (
              <div
                key={q}
                className="rounded-xl bg-white border border-stone-200 p-5"
              >
                <h3 className="font-semibold mb-2">{q}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-2xl font-bold mb-3">See your number first.</h2>
          <p className="text-stone-600 mb-6">
            Three minutes, no sign-up. Then decide whether the exec is worth it.
          </p>
          <Link
            href="/business-valuation"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full font-semibold hover:opacity-90 transition min-h-[44px]"
          >
            Value my business →
          </Link>
        </section>
      </article>
    </main>
  );
}
