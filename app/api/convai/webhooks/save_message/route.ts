// app/api/convai/webhooks/save_message/route.ts
import { getDiscovery } from '@/lib/kira/discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return getDiscovery().webhookRoutes().saveMessage(req);
}
