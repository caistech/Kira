'use client';

// components/BetaCodeCarrier.tsx
//
// The one job: carry a beta code from the landing page to /plan.
//
// An invited tester arrives at the landing page with `?code=` in the URL — that is what the
// invitation email links to now. The code must survive the journey (landing → the thirteen
// questions → /plan) WITHOUT being validated or consumed along the way: redemption happens only at
// /plan, at the BetaRedeem step, after the tester has walked the same path a paying owner walks.
//
// Parking it in sessionStorage (under the same key the plan page reads) is context, not redemption:
// nothing here touches the network. A code is not a secret — it is bound to one email and
// single-use — so holding it in the tab is safe, and matching where the valuation itself is parked
// means it dies with the visit.

import { useEffect } from 'react';

export const BETA_CODE_STORAGE_KEY = 'kira_beta_code';

export function BetaCodeCarrier() {
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('code');
    if (!fromUrl) return;
    try {
      window.sessionStorage.setItem(BETA_CODE_STORAGE_KEY, fromUrl.trim());
    } catch {
      // Private mode or a full quota. He still has the code in the URL; the journey simply asks him
      // to enter it at /plan, which is strictly better than losing it.
    }
  }, []);

  return null;
}