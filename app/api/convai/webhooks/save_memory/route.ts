// app/api/convai/webhooks/save_memory/route.ts
import { getDiscovery } from '@/lib/kira/discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return getDiscovery().webhookRoutes().saveMemory(req);
}
