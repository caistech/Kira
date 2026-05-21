import Link from "next/link";

export const metadata = {
  title: "Personal Journey — Kira",
  description:
    "Kira as your personal thinking partner — for life decisions, career moves, habits, relationships, learning, and the things you're trying to figure out for yourself.",
};

const SCENARIOS = [
  {
    label: "Career pivot",
    body: "You're thinking about leaving a role, switching industries, or going independent. Kira holds the context across weeks of conversations — what you've tried, what worked, what you ruled out — so you don't restart the same conversation every Sunday night.",
  },
  {
    label: "Finance reset",
    body: "Budgeting, debt strategy, investment principles, big-purchase decisions. Kira learns your numbers and your risk appetite, then asks the next-step question you'd ask yourself if you had more energy on a Tuesday evening.",
  },
  {
    label: "Habit build",
    body: "You want to read more, exercise consistently, learn an instrument, drink less, sleep better. Kira tracks what you actually do (not what you intended), surfaces patterns honestly, and resists the trap of motivational pep-talk.",
  },
  {
    label: "Relationship work",
    body: "Conversations you're rehearsing, conflicts you're sitting with, boundaries you're trying to set. Kira holds confidentiality, doesn't judge, and asks the harder question when you're avoiding it.",
  },
  {
    label: "Trip planning",
    body: "Three weeks in Japan, a long weekend somewhere you've never been, a sabbatical. Kira knows your travel style, your budget, and what you actually enjoy — not the generic top-10 list a search engine returns.",
  },
  {
    label: "Learning a thing",
    body: "Picking up Spanish, learning to code, getting fluent in chess openings, training for a half-marathon. Kira sets the next bite-size milestone, checks in on the pace, and adjusts when life happens.",
  },
];

export default function PersonalJourneyPage() {
  return (
    <main className="min-h-screen bg-amber-50 text-stone-800">
      <article className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-700 mb-3 font-semibold">
            Personal journey
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Kira for the stuff that&apos;s about{" "}
            <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
              you
            </span>
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">
            What this page is: how Kira shows up as a personal thinking partner.
            What to do here: scan the six scenarios, recognise one as
            yours, then create a Kira for it. Why it matters: most chatbots
            forget the conversation the moment you close the tab — a
            personal Kira remembers what matters and asks the next-step
            question without you having to re-explain.
          </p>
        </header>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Six things Kira holds for you</h2>
          <div className="space-y-4">
            {SCENARIOS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white border border-stone-200 p-5 shadow-sm"
              >
                <h3 className="font-semibold text-stone-800 mb-2">{s.label}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-gradient-to-br from-violet-100 via-pink-50 to-amber-100 border border-amber-200 p-6 mb-12">
          <h2 className="text-xl font-bold mb-3">What Kira won&apos;t do</h2>
          <ul className="space-y-2 text-sm text-stone-700 leading-relaxed">
            <li>
              <span className="text-violet-500 mr-2">→</span>
              Pretend to be a licensed therapist, doctor, lawyer, or financial
              advisor. For those calls you need a real one.
            </li>
            <li>
              <span className="text-violet-500 mr-2">→</span>
              Share your conversations across Kiras. Each Kira knows only the
              context you gave it for that one journey.
            </li>
            <li>
              <span className="text-violet-500 mr-2">→</span>
              Be used to train a foundation model. The AI providers are used
              through paid APIs under terms that exclude training on customer
              data.
            </li>
            <li>
              <span className="text-violet-500 mr-2">→</span>
              Push notifications begging for engagement. You come back when
              you have something to think about — that&apos;s the point.
            </li>
          </ul>
        </section>

        <section className="text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to create yours?</h2>
          <p className="text-stone-600 mb-6">
            Three minutes. Tell Kira what you&apos;re trying to figure out.
            She&apos;ll create a Kira built for that one journey.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/start"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full font-semibold hover:opacity-90 transition"
            >
              Create your Kira
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 border border-stone-300 text-stone-700 rounded-full font-semibold hover:border-stone-400 transition"
            >
              See pricing
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
