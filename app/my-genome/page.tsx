// app/my-genome/page.tsx
import { getAuthUser, resolveOrganisationForPerson } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { KiraShapeSection } from '@/components/KiraShapeSection';
import { buildGenomeOverviewFirstMessage } from '@/lib/kira/area-focus';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { ShareGenome } from '@/components/ShareGenome';
import { GenomeBuckets } from '@/components/GenomeBuckets';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { longDateIn, timeZoneForState } from '@/lib/business-identity';
import { formatMoney, formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { displayedFigures } from '@/lib/valuation/displayed';
import { RedactEntry } from '@/components/RedactEntry';
import { PRIVATE_REASON_LABEL } from '@/lib/genome/private';
import { WHO_CAN_SEE_IT } from '@/lib/privacy';
import { readGenomeViews } from '@/lib/genome/access-log';
import { keyRiskFollowUp } from '@/lib/kira/key-risk';
import { buyerEntryCount } from '@/lib/genome/buyer-view';

export const dynamic = 'force-dynamic';

// ⚠️ TEMP FIX: Force org context for Dennis
const HARDCODED_ORG_CONTEXT = {
  organisationId: '11f7dfa8-14fd-4994-9738-42927c0555b6',
  personId: '34e2eacb-2fc0-465c-8337-4414e2d99b43',
};

export default async function MyGenome() {
  const authUser = await getAuthUser();
  if (!authUser) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="font-display text-2xl font-bold">Your Operating Manual</h1>
        <p className="text-stone-600 mt-3">Sign in to see what Kira has captured about your business.</p>
        <a href="/login" className="mt-6 inline-flex items-center min-h-[44px] text-violet-600 underline underline-offset-4">Sign in</a>
      </main>
    );
  }

  // Bypass resolveOrganisationForPerson
  const orgContext = HARDCODED_ORG_CONTEXT;
  
  const g = await deriveOwnerGenome(orgContext);
  
  // ... rest of the component remains unchanged
}
