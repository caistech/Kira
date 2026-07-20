// app/api/convai/webhooks/update_topic/route.ts
import { getDiscovery } from '@/lib/kira/discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return getDiscovery().webhookRoutes().updateTopic(req);
}
