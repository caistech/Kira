'use client';

// components/ClaimStoredValuation.tsx
//
// Hands a pre-signup valuation to the account, once, on first authenticated page load.
//
// WHY IT SITS HERE RATHER THAN IN EACH SIGNUP FLOW. There is more than one way into an account —
// email + password, magic link, paid checkout — and the valuation was only being captured on the
// paid one. Wiring the claim into each flow means remembering it in each flow, and the next flow
// added would forget. Mounting it on the authenticated shell means the claim happens because the
// user is signed in, which is the actual condition.
//
// Silent by design. This is a repair, not a feature: the owner already believes their valuation
// followed them in. A toast saying "we found your valuation" advertises that it might not have.

import { useEffect, useRef } from 'react';

import { clearStoredValuation, readStoredValuation } from '@/lib/valuation/share';

export function ClaimStoredValuation() {
  // Strict mode double-invokes effects in development; the endpoint is idempotent but there is no
  // reason to make the request twice.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const payload = readStoredValuation();
    if (!payload) return;

    void (async () => {
      try {
        const res = await fetch('/api/valuation/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Clear only on a definite answer. A network failure keeps the handoff parked so the next
        // authenticated page load can try again — the tab still has it, and losing it here would
        // reproduce the exact bug this component exists to fix.
        if (res.ok) clearStoredValuation();
      } catch {
        /* keep the handoff; the next mount retries */
      }
    })();
  }, []);

  return null;
}
