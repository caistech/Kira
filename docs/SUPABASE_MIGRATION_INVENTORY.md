# Supabase API Key Migration Inventory

Target Architecture: V2 API Key Model (Service Role for privileged server ops, Publishable for browser/session auth).

## Phase 1: Batch 1 — Production Server Consumers (Service Role -> V2 Service Role)
Target: `createServiceClient()` -> `createServiceClientV2()`

| Consumer | File | Status |
|---|---|---|
| Kira Agent | `app/api/kira/agent/route.ts` | ✅ Migrated |
| Chat Start | `app/api/kira/chat/start/route.ts` | ⏳ Pending |
| Text Chat | `app/api/kira/chat/text/route.ts` | ⏳ Pending |
| ... | ... | ... |

## Phase 2: Batch 2 — Browser/Session (Anon -> V2 Session/Browser)
Target: `createClient()` -> `createClientV2()`, `createSessionClient()` -> `createSessionClientV2()`

| Consumer | File | Status |
|---|---|---|
| Start Page | `app/start/page.tsx` | ✅ Migrated |
| ... | ... | ... |

## Phase 3: Batch 3 — Scripts
Target: `SUPABASE_SERVICE_ROLE_KEY` -> V2 Service Role environment access

| Script | File | Status |
|---|---|---|
| ... | ... | ⏳ Pending |
