// The 404 page — the only screen in the product that offered nothing but the logo.
//
// Ray found it by mistyping a path and reported it as the one dead end in an otherwise well-signed
// product: "main flows always offer a next step; the 404 page offers nothing but the logo."
//
// That matters more here than on most products. He is 66, he did not think the URL was something he
// could get wrong, and his working assumption when a screen goes blank is that HE broke it. A page
// that says nothing confirms that. So this says plainly that the address is wrong rather than
// anything he did, and gives him both doors — back to his own work if he is signed in, or the front
// page if he is not — because we cannot tell from here which one he is.

import Link from 'next/link';

export const metadata = { title: 'Page not found · Kira' };

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 px-4 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-stone-900">That page isn&apos;t here</h1>
        <p className="mt-3 text-base leading-relaxed text-stone-700">
          The address doesn&apos;t match anything in Kira — most likely a link that has moved or a
          typo in the bar at the top. Nothing is wrong with your account and nothing has been lost.
        </p>

        {/* Both doors, because this page cannot know which side of the auth gate he is on, and
            guessing wrong would send a signed-in owner to a marketing page. 44px targets: he is
            often on a phone. */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-base font-semibold text-white"
          >
            Back to my dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-stone-800"
          >
            Go to the front page
          </Link>
        </div>

        <p className="mt-8 text-sm text-stone-500">
          If you followed a link from us and landed here, it is worth telling us — that is our
          mistake to fix, not yours.
        </p>
      </div>
    </main>
  );
}
