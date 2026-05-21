import Link from "next/link";

export const metadata = {
  title: "Pricing — Kira",
  description:
    "Simple pricing for Kira. Free to start, $12/month for unlimited Kiras, BYOK option for power users. AUD ex-GST.",
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For your first Kira and the first journey.",
    features: [
      "1 active Kira",
      "Conversation memory up to 30 days",
      "Standard model (Claude Haiku)",
      "Email support",
    ],
    cta: "Create your first Kira",
    href: "/start",
    popular: false,
  },
  {
    name: "Unlimited",
    price: "$12",
    period: "/month",
    description: "For the person running multiple journeys in parallel.",
    features: [
      "Unlimited Kiras",
      "Persistent memory (no expiry)",
      "Premium models (Claude Sonnet)",
      "Voice mode (when launched)",
      "Priority support",
      "Export your Kira conversations",
    ],
    cta: "Go Unlimited",
    href: "/start",
    popular: true,
  },
  {
    name: "BYOK",
    price: "$0",
    period: "+ your API key",
    description: "For power users who want to run on their own AI provider account.",
    features: [
      "Unlimited Kiras",
      "Persistent memory",
      "Choose your own model (Anthropic, OpenAI, Google)",
      "All inference billed to your provider account",
      "Same export rights as Unlimited",
    ],
    cta: "Add your API key",
    href: "/start",
    popular: false,
  },
];

const FAQ = [
  {
    q: "What does 'Kira' mean as a unit of pricing?",
    a: "One Kira = one dedicated agent built around one journey (career pivot, finance reset, trip planning, etc.). Free plan gets one Kira at a time — you can archive and create a new one. Unlimited gets as many parallel Kiras as you want.",
  },
  {
    q: "What does BYOK mean?",
    a: "Bring Your Own Key. You provide an Anthropic / OpenAI / Google API key, Kira uses it for all inference, you pay the AI provider directly. The Kira app itself is free under BYOK — we're not making a margin on tokens.",
  },
  {
    q: "Will my Kira conversations be used to train AI models?",
    a: "No. The AI providers we use (Anthropic, OpenAI, Google) are used through paid APIs under terms that exclude training on customer data. Your conversations stay between you and your Kira.",
  },
  {
    q: "What happens to my Kira if I cancel?",
    a: "Your conversations and Kira configurations are exportable at any time. After cancellation we keep the data for 30 days in case you re-activate, then delete. Export early if you want a copy outside the app.",
  },
  {
    q: "Are prices in AUD?",
    a: "Yes — Australian dollars, ex-GST. International customers billed via Stripe in their local currency at the prevailing rate.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-amber-50 text-stone-800">
      <article className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <header className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-700 mb-3 font-semibold">
            Pricing
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Three ways to use Kira
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            What this page is: every Kira cost spelled out. What to do here:
            pick the plan that matches how many journeys you&apos;re running
            at once. Why it matters: most personal-AI apps either charge a
            premium for what is essentially API access or hide a low-quality
            default model behind a high price. Kira does neither.
          </p>
          <p className="text-sm text-stone-500 mt-3">
            AUD ex-GST &middot; Cancel any time
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-6 mb-16">
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
                  Most Popular
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
                className={`block text-center text-sm font-semibold py-2.5 rounded-full transition-colors ${
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
          <h2 className="text-2xl font-bold mb-3">Ready to create yours?</h2>
          <p className="text-stone-600 mb-6">
            Three minutes. Tell Kira what you&apos;re trying to figure out.
          </p>
          <Link
            href="/start"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full font-semibold hover:opacity-90 transition"
          >
            Create your first Kira
          </Link>
        </section>
      </article>
    </main>
  );
}
