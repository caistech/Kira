#!/usr/bin/env node
//
// What has actually happened to voice connections. The read half of the telemetry.
//
// ⚠️ WRITTEN AT THE SAME TIME AS THE WRITER, DELIBERATELY. A table nothing reads is not
// observability, it is storage — the same distinction the voice-memory standard draws between
// keeping something and remembering it. The portfolio has already shipped a guard that ran in zero
// repos and a counter with no writer; a telemetry table with no reader is the same failure wearing
// a third hat, and it is invisible precisely because it looks finished.
//
// THE QUESTION IT ANSWERS, and it is one question: when a connection fails, is it us or is it them?
// `reachable=false` means the visitor's browser could not reach ElevenLabs at all — a corporate
// proxy, a firewall, a school or hospital network — and there is nothing to fix in this codebase.
// `reachable=true` on a failure means it reached the vendor and still did not work, which is ours.
// Every other column is context for that.
//
//   node scripts/voice-connect-report.mjs             # last 7 days
//   node scripts/voice-connect-report.mjs --days 30
//   node scripts/voice-connect-report.mjs --failures  # only the ones that did not connect

import { readFileSync } from 'node:fs';

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const DAYS = Number(arg('days') ?? 7);
const FAILURES_ONLY = process.argv.includes('--failures');

// Env from .env.local, same shape as the other operator scripts here.
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
const res = await fetch(
  `${URL_}/rest/v1/voice_connect_events?created_at=gte.${since}&select=*&order=created_at.desc&limit=500`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
);
if (!res.ok) throw new Error(`could not read voice_connect_events: ${res.status} ${await res.text()}`);
const rows = await res.json();

if (rows.length === 0) {
  // ⚠️ SAID PLAINLY, because "no rows" has two completely different meanings and the difference
  // matters more than anything else this script prints. Either nobody has failed — good — or
  // nothing is reporting, which is the state the whole exercise exists to escape, and it looks
  // identical from here.
  console.log(`No voice-connect events in the last ${DAYS} day(s).`);
  console.log('That is either a quiet week or a reporter that is not firing. If you expected');
  console.log('traffic, open a voice surface and re-run before believing the first reading.');
  process.exit(0);
}

const by = (key) =>
  rows.reduce((acc, r) => {
    const k = String(r[key] ?? '—');
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

const failures = rows.filter((r) => r.outcome !== 'connected');
const connected = rows.length - failures.length;

console.log(`\nVoice connections — last ${DAYS} day(s), ${rows.length} event(s)\n`);
console.log(`  connected : ${connected}`);
console.log(`  failed    : ${failures.length}` + (rows.length ? `  (${Math.round((failures.length / rows.length) * 100)}%)` : ''));
console.log('\n  by outcome:', JSON.stringify(by('outcome')));
console.log('  by surface:', JSON.stringify(by('surface')));

if (failures.length) {
  // THE HEADLINE NUMBER. Not "how many failed" — that says nothing actionable — but how many of the
  // failures were on a network that could not reach the vendor in the first place.
  const unreachable = failures.filter((r) => r.reachable === false).length;
  const reachable = failures.filter((r) => r.reachable === true).length;
  const unknown = failures.length - unreachable - reachable;
  console.log('\n  OF THE FAILURES:');
  console.log(`    ${unreachable} could not reach ElevenLabs at all  → their network, not our code`);
  console.log(`    ${reachable} reached the vendor and still failed   → OURS`);
  if (unknown) console.log(`    ${unknown} not probed`);
}

const shown = FAILURES_ONLY ? failures : rows;
console.log(`\n  most recent ${Math.min(shown.length, 25)}:`);
for (const r of shown.slice(0, 25)) {
  const reach = r.reachable === false ? 'unreachable' : r.reachable === true ? 'reachable  ' : '—          ';
  console.log(
    `    ${String(r.created_at).slice(0, 16)}  ${String(r.surface).padEnd(10)} ` +
      `${String(r.outcome).padEnd(18)} ${reach}  ${r.detail ? String(r.detail).slice(0, 70) : ''}`,
  );
}
console.log('');
