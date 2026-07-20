// app/api/convai/webhooks/recall_memory/route.ts
import { getDiscovery } from '@/lib/kira/discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return getDiscovery().webhookRoutes().recallMemory(req);
}
