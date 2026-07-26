// app/api/abn-lookup/route.ts
//
// The canonical ABR lookup, consumed rather than re-implemented (@caistech-first). The handler
// itself lives in @caistech/corporate-components — this file exists only to mount it.
//
// `force-dynamic` is NOT optional and cannot travel through the re-export: route-segment config is
// read from the module the router loads, so without this line some Next versions prerender the
// route static and freeze a single response for every caller. DealFindrs built the identical file
// static (`○`) while BucketLyst built it dynamic (`ƒ`) — same code, different outcome.
//
// Unconfigured (no ABR_GUID) returns 200 {configured:false}, never a 500: a missing GUID is an
// operator gap, not the applicant's fault, and must not break a form mid-flow.

export { GET } from '@caistech/corporate-components/abn-lookup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
