'use client';

// The button that runs the assessment for one area.
//
// A client island rather than a form action on the page, for one reason: the model call takes a few
// seconds and a man in his sixties pressing a button that does nothing visible presses it again.
// `useTransition` gives him "Checking…" and a disabled control for exactly as long as it takes.

import { useState, useTransition } from 'react';

import { assessArea } from '@/app/my-genome/[area]/actions';

export function AssessAreaButton({
  area,
  label = 'Check this area',
  disabled = false,
}: {
  area: string;
  label?: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const result = await assessArea(area);
            if (result.error) {
              setMessage(result.error);
            } else if (result.assessed === 0) {
              // Degrade, don't fake. Nothing was established, and saying "0 answered" would report
              // a finding we do not have — an outage and an empty area look identical from here.
              setMessage('Nothing could be checked yet. Talk to Kira about this area first.');
            } else if (result.readinessNow != null && result.baseline != null) {
              // ⚠️ THE DIRECTION IS REPORTED, NOT HIDDEN, AND DOWN IS THE IMPORTANT ONE.
              // Capture reveals dependencies nobody had priced — "nobody can step into my job" is
              // evidence that should LOWER transferability however diligently he answered it. A
              // product where every answer raises the score rewards talking, and he would find out
              // in a data room instead of here.
              const now = Math.round(result.readinessNow * 100);
              const was = Math.round(result.baseline * 100);
              const delta = now - was;
              setMessage(
                delta === 0
                  ? `Transferability is unchanged at ${now} out of 100.`
                  : delta > 0
                    ? `Transferability is now ${now} out of 100, up ${delta} from your baseline of ${was}.`
                    : `Transferability is now ${now} out of 100, down ${Math.abs(delta)} from your baseline of ${was}. That is what the answers actually show — it is worth knowing now rather than from a buyer.`,
              );
            }
          })
        }
        className="min-h-[48px] rounded-full border border-stone-400 bg-white px-6 text-base font-semibold text-stone-900 disabled:opacity-50"
      >
        {pending ? 'Checking…' : label}
      </button>
      {message && (
        <p className="mt-2 text-base text-stone-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
