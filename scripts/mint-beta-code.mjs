#!/usr/bin/env node
// scripts/mint-beta-code.mjs
//
// Mint a beta invitation code for one named person.
//
//   node scripts/mint-beta-code.mjs --email craig@garda.com.au --label "Craig, Garda (via Neil)"
//   node scripts/mint-beta-code.mjs --email x@y.com --days 60
//   node scripts/mint-beta-code.mjs --email x@y.com --org 11f7dfa8-14fd-4994-9738-42927c0555b6 --superadmin
//   node scripts/mint-beta-code.mjs --list
//   node scripts/mint-beta-code.mjs --revoke KIRA-7H2K-9QLM
//
// ⚠️ ONE CODE, ONE PERSON, ALWAYS. The email is bound here and the redemption endpoint creates an
// account for THAT address and no other — it is never taken from the form. That is what bounds the
// damage if a code is forwarded or leaked: the worst outcome is an account at an address we chose.
// A bearer code that let the redeemer name their own address would be a free-account generator.
//
// ⚠️ --org BINDS THE INVITATION TO A SPECIFIC ORGANISATION (e.g. the CAIS Beta org). When set, the
// code carries the org on the server, /plan skips the "enter your business name" step, and the
// tester joins the bound org directly. This is the operator-minted exception to "beta never
// selects an organisation": the org is written by THIS operator at mint, never by the client.
//
// ⚠️ IT PRINTS THE MESSAGE TO SEND, NOT JUST THE CODE. The 2026-08-10 invitation audit found eight
// invitees who could never sign in, because what they were sent was a one-hour magic link read three
// days later. The rule that came out of it — send the INSTRUCTION, not a link that expires — only
// holds if the instruction is the thing sitting in front of the operator at the moment they send it.

import { createClient } from '@supabase/supabase-js';

const DEFAULT_DAYS = 45;
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789'; // no O/0, I/1, S/5 — see lib/billing/beta-codes.ts

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const has = (name) => process.argv.includes(`--${name}`);

function generate(length = 12) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const group = (code) => (code.match(/.{1,4}/g) ?? []).join('-');
const normalise = (raw) => String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

async function list() {
  const { data, error } = await db
    .from('beta_codes')
    .select('code, email, label, beta_type, organisation_id, expires_at, redeemed_at, revoked_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  if (!data?.length) return console.log('No codes minted yet.');
  for (const row of data) {
    const state = row.revoked_at
      ? 'revoked'
      : row.redeemed_at
        ? `redeemed ${row.redeemed_at.slice(0, 10)}`
        : new Date(row.expires_at) <= new Date()
          ? 'EXPIRED'
          : `open until ${row.expires_at.slice(0, 10)}`;
    const tier = row.beta_type === 'superadmin' ? ' [SA]' : '';
    const org = row.organisation_id ? ' [org-bound]' : '';
    console.log(`${group(row.code).padEnd(16)} ${String(row.email).padEnd(34)} ${state}${tier}${org}${row.label ? `  — ${row.label}` : ''}`);
  }
}

async function revoke(raw) {
  const code = normalise(raw);
  // Only an UNREDEEMED code can be withdrawn. Revoking one that has already produced an account
  // would leave a misleading record — the account exists either way, and the table is the history of
  // who was invited, not a switch that closes a door already walked through.
  const { data, error } = await db
    .from('beta_codes')
    .update({ revoked_at: new Date().toISOString() })
    .eq('code', code)
    .is('redeemed_at', null)
    .select('code, email')
    .maybeSingle();
  if (error) throw error;
  if (!data) return console.log('Nothing revoked — no such code, or it has already been redeemed.');
  console.log(`Revoked ${group(data.code)} (${data.email}).`);
}

async function mint() {
  const email = String(arg('email') ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('Usage: --email someone@example.com [--first-name "Craig"] [--last-name "Roberts"] [--label "who they are"] [--days 45] [--type superadmin|user] [--org <organisation_id>]');
    process.exit(1);
  }
  const days = Number(arg('days') ?? DEFAULT_DAYS);
  const label = arg('label') ?? null;
  const firstName = arg('first-name') ?? null;
  const lastName = arg('last-name') ?? null;
  const type = arg('type') ?? (has('superadmin') ? 'superadmin' : 'user');
  if (!['superadmin', 'user'].includes(type)) {
    console.error(`--type must be 'superadmin' or 'user' (got '${type}').`);
    process.exit(1);
  }
  const organisationId = String(arg('org') ?? '').trim() || null;
  if (organisationId) {
    const { data: org, error: orgError } = await db
      .from('organisations')
      .select('organisation_id, legal_name')
      .eq('organisation_id', organisationId)
      .maybeSingle();
    if (orgError || !org) {
      console.error(`--org ${organisationId} does not resolve to an organisation.`);
      process.exit(1);
    }
    if (!org.legal_name) {
      console.error(`--org ${organisationId} exists but has no legal_name.`);
      process.exit(1);
    }
  }
  const code = generate();
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const { error } = await db.from('beta_codes').insert({
    code,
    email,
    label,
    first_name: firstName,
    last_name: lastName,
    beta_type: type,
    organisation_id: organisationId,
    expires_at: expires.toISOString(),
    created_by: process.env.USER || process.env.USERNAME || 'operator',
  });
  if (error) throw error;

  const pretty = group(code);
  const prettyName = [firstName, lastName].filter(Boolean).join(' ') || null;
  const tier =
    type === 'superadmin'
      ? 'Superadmin tester — on redemption they join the org as an owner (CEO).'
      : 'User tester — on redemption they join the org as a member.';
  console.log(`\n  Code:    ${pretty}`);
  console.log(`  For:     ${prettyName ? `${prettyName} <${email}>` : email}`);
  console.log(`  Type:    ${type}`);
  console.log(
    `  Org:     ${organisationId ? 'bound to organisation ' + organisationId : 'free-form (new organisation on redemption)'}`,
  );
  console.log(`  Expires: ${expires.toISOString().slice(0, 10)} (${days} days)\n`);
  console.log(`  ${tier}\n`);
  console.log('  ── Send them this ─────────────────────────────────────────────\n');

  if (organisationId) {
    console.log(`  Go to ${appUrl}/?code=${code} — it lands on our main page with your`);
    console.log('  code in your pocket. From there it is quick: you confirm your');
    console.log('  name and you are in — your invite has already named your');
    console.log('  organisation, so there is no business setup to do.');
    console.log('');
    console.log('  The code works for the next few weeks, so there is no rush — and');
    console.log('  it only works for this email address.\n');
  } else {
    console.log(`  Go to ${appUrl}/?code=${code} — it lands on our main page with your`);
    console.log('  code in your pocket. From there it is the same visit any owner makes:');
    console.log('  a look at what Kira does, then the questions about a business.');
    console.log('  Three honest numbers at the end.');
    console.log('  When you reach the pricing step your code is already applied.');
    console.log('  No card is asked for and nothing is charged.');
    console.log('');
    console.log('  The code works for the next few weeks, so there is no rush — and');
    console.log('  it only works for this email address.\n');
  }
  console.log('  ───────────────────────────────────────────────────────────────\n');
}

const run = has('list') ? list() : has('revoke') ? revoke(arg('revoke')) : mint();
run.catch((error) => {
  console.error(error);
  process.exit(1);
});
