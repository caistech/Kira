#!/usr/bin/env node
// scripts/seed-cais-beta.mjs
//
// Seed the CAIS Beta organisation with a realistic trade-services business profile.
//
//   node scripts/seed-cais-beta.mjs                         # seed for CAIS Beta owner (Dennis)
//   node scripts/seed-cais-beta.mjs --email dennis@x.com    # seed for a specific tester
//   node scripts/seed-cais-beta.mjs --clear                 # remove all seeded data for CAIS Beta
//   node scripts/seed-cais-beta.mjs --dry-run               # print what would be seeded, no writes
//
// SYNTHETIC BUSINESS: Valley Electrical Solutions
//   Electrical & mechanical contracting, Fortitude Valley QLD
//   ~$5M revenue, 20% margin (~$1M SDE before owner comp)
//   Owner heavily involved, some systems, moderate client concentration
//   SDE multiple ~2.94x (Electrical & Mechanical Contracting)
//
// SEEDS:
//   1. conversations          — 3 sample Kira conversations
//   2. kira_memory            — ~15 classified memories (genome_section set)
//   3. business_valuations    — 1 valuation row (the three honest numbers)
//   4. genome_entities        — ~40 entities across 9 ontology areas
//   5. genome_facts           — ~60 facts (subject/predicate/value triples)
//   6. genome_relationships   — ~10 entity-to-entity connections
//   7. genome_item_status     — ~22 answered/weak items (half-green verdict panel)
//   8. kira_knowledge         — 2 knowledge files
//
// IDEMPOTENT: running twice clears previous seed data and re-inserts.

import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────

const CAIS_BETA_ORG_ID = '11f7dfa8-14fd-4994-9738-42927c0555b6';
const DENNIS_AUTH_USER_ID = '0adbd5a8-6a14-4df8-8983-791bf7cbc20e';
const SEED_TAG = '[cais-beta-seed]';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const has = (name) => process.argv.includes(`--${name}`);

// ── Helpers ─────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

const now = new Date().toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

// ── Resolve target user ─────────────────────────────────────────────────────
//
// Returns BOTH ids: `legacyUserId` (users.id — the row a conversation's kira_agent_id
// lineage and legacy events still key on) and `personId` (the canonical persons row,
// which the modern writes use as provenance).

async function resolveUser() {
  const email = arg('email');
  let authUserId = DENNIS_AUTH_USER_ID;
  if (email) {
    const { data: cred } = await db
      .from('auth_credentials')
      .select('auth_user_id, person_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (!cred) {
      console.error(`No auth_credentials row for ${email}. Redeem a beta code first.`);
      process.exit(1);
    }
    authUserId = cred.auth_user_id;
  }
  const { data: user } = await db
    .from('users')
    .select('id, first_name')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (!user) {
    console.error(`No users row for auth_user_id ${authUserId}.`);
    process.exit(1);
  }
  const { data: cred } = await db
    .from('auth_credentials')
    .select('person_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  const personId = cred?.person_id ?? user.id;
  return { legacyUserId: user.id, personId, firstName: user.first_name ?? 'Dennis' };
}

// ── Clear (idempotent) ──────────────────────────────────────────────────────

async function clearSeedData() {
  console.log(`${SEED_TAG} Clearing previous seed data for CAIS Beta...`);
  // Delete in dependency order (children first)
  await db.from('genome_relationships').delete().eq('organisation_id', CAIS_BETA_ORG_ID).like('source_reference', `${SEED_TAG}%`);
  await db.from('genome_facts').delete().eq('organisation_id', CAIS_BETA_ORG_ID).like('source_reference', `${SEED_TAG}%`);
  await db.from('genome_entities').delete().eq('organisation_id', CAIS_BETA_ORG_ID).like('source_reference', `${SEED_TAG}%`);
  await db.from('genome_item_status').delete().eq('organisation_id', CAIS_BETA_ORG_ID).like('assessed_by', `${SEED_TAG}%`);
  await db.from('kira_memory').delete().eq('organisation_id', CAIS_BETA_ORG_ID).like('content', `${SEED_TAG}%`);
  await db.from('conversations').delete().eq('organisation_id', CAIS_BETA_ORG_ID).like('title', `${SEED_TAG}%`);
  await db.from('kira_knowledge').delete().eq('organisation_id', CAIS_BETA_ORG_ID).like('title', `${SEED_TAG}%`);
  console.log(`${SEED_TAG} Clear complete.`);
}

// ── Synthetic business data ─────────────────────────────────────────────────

const BUSINESS = {
  name: 'Valley Electrical Solutions',
  industry: 'Electrical & Mechanical Contracting',
  sdeMultiple: 2.94,
  turnover: 5_000_000,
  annualProfit: 1_000_000,
  // SDE = profit + owner salary ($200K) + perks ($50K)
  sde: 1_250_000,
  readiness: 0.38,
  // Valuation outputs (approximate, believable)
  worthToday: 2_300_000,
  worthPotential: 3_300_000,
  gap: 1_000_000,
  tangibleAssets: 450_000,
  // Input choices
  profitTrend: 'flat',
  marginTrend: 'stable',
  clientTrend: 'stable',
  clientConcentration: 'moderate',
  ownerDependence: 'heavily_involved',
  systems: 'some',
  recurringRevenue: 'some',
};

// ── 1. Conversations ────────────────────────────────────────────────────────
//
// conversations still carries `user_id` + `kira_agent_id` NOT NULL. The FK to
// users was dropped in Phase 1B (column remains), but kira_agent_id still
// references kira_agents(id) — so the seeded conversations bind the org's real
// Kira agent so memory source links resolve to a conversation that exists.

function conversationRows(legacyUserId, agentId) {
  return [
    {
      id: uuid(),
      organisation_id: CAIS_BETA_ORG_ID,
      user_id: legacyUserId,
      kira_agent_id: agentId,
      started_at: daysAgo(14),
      title: `${SEED_TAG} Operations overview`,
      status: 'active',
      visibility: 'org',
    },
    {
      id: uuid(),
      organisation_id: CAIS_BETA_ORG_ID,
      user_id: legacyUserId,
      kira_agent_id: agentId,
      started_at: daysAgo(7),
      title: `${SEED_TAG} Customer relationships`,
      status: 'active',
      visibility: 'org',
    },
    {
      id: uuid(),
      organisation_id: CAIS_BETA_ORG_ID,
      user_id: legacyUserId,
      kira_agent_id: agentId,
      started_at: daysAgo(3),
      title: `${SEED_TAG} People and compliance`,
      status: 'active',
      visibility: 'org',
    },
  ];
}

// ── 2. Kira memory ──────────────────────────────────────────────────────────

function memoryRows(conversations, personId, agentId) {
  const convIds = conversations.map((c) => c.id);
  const memories = [
    // OPERATIONS
    { section: 'operations', headline: 'Standard installation workflow exists but is undocumented', importance: 8,
      content: `${SEED_TAG} The standard electrical installation workflow — site assessment, quote, materials order, install, inspection — lives in Dennis's head. His two leading hands follow it by routine, but there is no written procedure. If Dennis is unavailable for a day, the team calls him for decisions.` },
    { section: 'operations', headline: 'Dennis still quotes most jobs personally', importance: 7,
      content: `${SEED_TAG} Dennis personally handles quoting for jobs over $20K. Smaller jobs are quoted by the leading hands, but Dennis reviews and adjusts most of them before they go out. He estimates this takes 8-10 hours per week.` },
    // PRICING
    { section: 'pricing', headline: 'Pricing is experience-based, not formula-driven', importance: 7,
      content: `${SEED_TAG} Rates are set by Dennis based on 25 years in the trade. There is no rate card or pricing matrix. Commercial jobs are quoted at cost-plus; residential is fixed-price. The team knows roughly what to charge but cannot explain the methodology.` },
    // CUSTOMERS
    { section: 'customers', headline: 'Top 5 clients represent 45% of revenue', importance: 9,
      content: `${SEED_TAG} Five commercial clients — three property managers and two builders — account for roughly 45% of annual revenue. The strongest relationship (Brisbane Property Group, ~$600K/yr) is personally held by Dennis. No contracts in place; all on monthly invoicing.` },
    { section: 'customers', headline: 'Repeat work from builders drives residential revenue', importance: 6,
      content: `${SEED_TAG} Two builder relationships (Metro Builders, Greenfield Constructions) generate steady residential work — new builds and renovations. Combined ~$800K/yr. These relationships are semi-personal: the builders know the team, but Dennis handles the initial contact and quoting.` },
    // DEMAND
    { section: 'demand', headline: 'Most work comes from referrals and repeat clients', importance: 7,
      content: `${SEED_TAG} Approximately 70% of new work comes from repeat clients and word-of-mouth referrals. The remaining 30% comes from Google searches and the website. No active marketing spend. Dennis attends two industry networking events per year.` },
    // CASH
    { section: 'cash', headline: 'Net 30 terms across the board', importance: 6,
      content: `${SEED_TAG} All commercial clients are on Net 30 terms. Average debtor days are 38. Material suppliers are on Net 14. The business carries a $120K overdraft facility that is drawn to about $80K on average. Cash flow is tight in January-February when builders are slow to pay.` },
    { section: 'cash', headline: 'Annual turnover ~$5M, net margin ~20%', importance: 8,
      content: `${SEED_TAG} Revenue is approximately $5M with a net profit margin of around 20%. The margin has been stable for three years. Gross margin on labour is ~55%; on materials it is ~15%. The blended margin holds because labour makes up ~65% of job cost.` },
    // PEOPLE
    { section: 'people', headline: 'Two leading hands are critical to operations', importance: 9,
      content: `${SEED_TAG} Mark (12 years) and Sarah (7 years) are the two leading hands. Mark runs commercial jobs; Sarah runs residential. Both hold electrical licences. If either left, the business would struggle to deliver. Neither has a formal employment contract or restraint clause.`,
      why: 'Key person risk — no contracts, long tenure, critical roles.' },
    { section: 'people', headline: 'Total team of 14 including Dennis', importance: 6,
      content: `${SEED_TAG} The business employs 14 people: Dennis (owner), two leading hands, eight electricians, two apprentices, and one office administrator. All are full-time except the admin role (3 days/week). Superannuation and workers comp are current.` },
    // ASSETS
    { section: 'assets', headline: 'Fleet of 6 vehicles, all leased', importance: 5,
      content: `${SEED_TAG} Six work vehicles — four utes and two vans — all on operating leases ($4,200/month total). Two vehicles are in the business name; four are in Dennis's personal name for tax reasons. Tooling is approximately $80K across the team.` },
    // COMPLIANCE
    { section: 'compliance', headline: 'Electrical licence current, insurance renewed annually', importance: 6,
      content: `${SEED_TAG} The business holds an Electrical Contractor Licence (QLD, renewed July each year). Public liability ($20M), professional indemnity ($5M), and workers compensation are all current. The compliance calendar is managed by the office admin — she sends reminders but the process is not documented.` },
    { section: 'compliance', headline: 'Safety record is good but undocumented', importance: 5,
      content: `${SEED_TAG} No lost-time injuries in the last three years. Toolbox talks happen informally. There is no formal safety management system or SWMS template library. The team follows safe work practices by habit and supervision.` },
    // SYSTEMS
    { section: 'systems', headline: 'Xero for accounting, no job management system', importance: 7,
      content: `${SEED_TAG} The business uses Xero for invoicing and bookkeeping (managed by an external accountant). There is no job management, scheduling, or time-tracking system. Job allocations are done verbally in a Monday morning meeting. Timesheets are handwritten and entered monthly.` },
    { section: 'systems', headline: 'No formal IP protection or trade secrets', importance: 4,
      content: `${SEED_TAG} There are no trade secrets, patents, or proprietary processes. The business value is in the relationships, reputation, and team capability. There is no non-compete or restraint of trade agreements with any staff.` },
  ];
  return memories.map((m, i) => ({
    id: uuid(),
    organisation_id: CAIS_BETA_ORG_ID,
    user_id: personId,
    agent_id: agentId,
    kira_agent_id: agentId,
    memory_type: 'context',
    content: m.content,
    importance: m.importance,
    genome_section: m.section,
    genome_headline: m.headline,
    genome_about: 'business',
    genome_classified_at: now,
    genome_privacy_classified_at: now,
    genome_private_reason: null,
    active: true,
    source_conversation_id: convIds[i % convIds.length],
    created_at: daysAgo(14 - i),
    visibility: 'org',
  }));
}

// ── 3. Business valuation ───────────────────────────────────────────────────

function valuationRow(personId) {
  const inputs = {
    industry: 'Electrical & Mechanical Contracting',
    turnover: BUSINESS.turnover,
    annualProfit: BUSINESS.annualProfit,
    tangibleAssets: BUSINESS.tangibleAssets,
    profitTrend: BUSINESS.profitTrend,
    marginTrend: BUSINESS.marginTrend,
    clientTrend: BUSINESS.clientTrend,
    clientConcentration: BUSINESS.clientConcentration,
    ownerDependence: BUSINESS.ownerDependence,
    systems: BUSINESS.systems,
    recurringRevenue: BUSINESS.recurringRevenue,
  };
  return {
    id: uuid(),
    user_id: personId, // provenance (canonical person), matching the claim route
    organisation_id: CAIS_BETA_ORG_ID,
    inputs,
    currency: 'AUD',
    gap: BUSINESS.gap,
    worth_today: BUSINESS.worthToday,
    worth_potential: BUSINESS.worthPotential,
    walk_away: BUSINESS.worthToday - 200_000, // rough net of debt
    sde_multiple: BUSINESS.sdeMultiple,
    readiness: BUSINESS.readiness,
    industry: BUSINESS.industry,
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
  };
}

// ── 4. Genome entities ──────────────────────────────────────────────────────

function entityRows(personId) {
  const e = (area, type, name, conf = 0.7) => ({
    id: uuid(),
    organisation_id: CAIS_BETA_ORG_ID,
    user_id: personId,
    area_key: area,
    entity_type: type,
    name,
    status: 'confirmed',
    confidence: conf,
    source_type: 'conversation',
    source_reference: `${SEED_TAG} synthetic seed`,
    observed_at: daysAgo(10),
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
    visibility: 'org',
  });
  return [
    // WORK SOURCES (demand)
    e('work_sources', 'system', 'Google Business Profile'),
    e('work_sources', 'system', 'Word of mouth referrals'),
    e('work_sources', 'process', 'Builder relationships'),
    e('work_sources', 'event', 'Industry networking events'),
    // PRICING
    e('pricing', 'process', 'Experience-based quoting'),
    e('pricing', 'document', 'No rate card exists'),
    e('pricing', 'process', 'Cost-plus for commercial'),
    e('pricing', 'process', 'Fixed-price for residential'),
    // DELIVERY (operations)
    e('delivery', 'process', 'Standard installation workflow'),
    e('delivery', 'process', 'Monday morning job allocation'),
    e('delivery', 'event', 'Site assessment and quoting'),
    e('delivery', 'process', 'Quality inspection before handover'),
    // MONEY (cash)
    e('money', 'metric', 'Net 30 commercial terms'),
    e('money', 'metric', '38 average debtor days'),
    e('money', 'system', 'Xero accounting'),
    e('money', 'metric', '$80K average overdraft draw'),
    // CUSTOMERS
    e('customers', 'organisation', 'Brisbane Property Group'),
    e('customers', 'organisation', 'Metro Builders'),
    e('customers', 'organisation', 'Greenfield Constructions'),
    e('customers', 'organisation', 'Valley Real Estate'),
    e('customers', 'metric', 'Top 5 clients = 45% revenue'),
    // PEOPLE
    e('people', 'person', 'Mark (leading hand, commercial)'),
    e('people', 'person', 'Sarah (leading hand, residential)'),
    e('people', 'person', 'Dennis McMahon (owner)'),
    e('people', 'group', '8 electricians'),
    e('people', 'group', '2 apprentices'),
    e('people', 'person', 'Office administrator (part-time)'),
    // ASSETS
    e('assets', 'asset', 'Fleet of 6 vehicles (leased)'),
    e('assets', 'asset', 'Electrical tooling (~$80K)'),
    e('assets', 'metric', '4 vehicles in Dennis personal name'),
    // COMPLIANCE CALENDAR
    e('compliance_calendar', 'obligation', 'Electrical Contractor Licence (QLD)'),
    e('compliance_calendar', 'obligation', 'Public liability insurance ($20M)'),
    e('compliance_calendar', 'obligation', 'Workers compensation insurance'),
    e('compliance_calendar', 'obligation', 'Professional indemnity insurance ($5M)'),
    // SYSTEMS RECORDS
    e('systems_records', 'system', 'Xero accounting software'),
    e('systems_records', 'gap', 'No job management system'),
    e('systems_records', 'gap', 'No time-tracking system'),
    e('systems_records', 'gap', 'No safety management system'),
  ];
}

// ── 5. Genome facts ─────────────────────────────────────────────────────────

function factRows(personId, entities) {
  const byName = Object.fromEntries(entities.map((e) => [e.name, e.id]));
  const f = (area, subject, predicate, value, type = 'text', entityName = null, conf = 0.7) => ({
    id: uuid(),
    organisation_id: CAIS_BETA_ORG_ID,
    user_id: personId,
    entity_id: entityName ? byName[entityName] ?? null : null,
    area_key: area,
    subject,
    predicate,
    value,
    value_type: type,
    status: 'confirmed',
    confidence: conf,
    source_type: 'conversation',
    source_reference: `${SEED_TAG} synthetic seed`,
    observed_at: daysAgo(10),
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
    visibility: 'org',
  });
  return [
    // Financial
    f('money', 'Valley Electrical Solutions', 'annual_revenue', '$5,000,000', 'money', 'Valley Electrical Solutions'),
    f('money', 'Valley Electrical Solutions', 'net_profit_margin', '20%', 'percentage', 'Valley Electrical Solutions'),
    f('money', 'Valley Electrical Solutions', 'owner_salary', '$200,000', 'money', 'Valley Electrical Solutions'),
    f('money', 'Valley Electrical Solutions', 'sde', '$1,250,000', 'money', 'Valley Electrical Solutions'),
    f('money', 'Valley Electrical Solutions', 'gross_margin_labour', '55%', 'percentage'),
    f('money', 'Valley Electrical Solutions', 'gross_margin_materials', '15%', 'percentage'),
    f('money', 'Valley Electrical Solutions', 'labour_cost_share', '65%', 'percentage'),
    f('money', 'Valley Electrical Solutions', 'overdraft_facility', '$120,000', 'money'),
    f('money', 'Valley Electrical Solutions', 'average_overdraft_draw', '$80,000', 'money'),
    // Customers
    f('customers', 'Brisbane Property Group', 'annual_revenue', '$600,000', 'money', 'Brisbane Property Group'),
    f('customers', 'Brisbane Property Group', 'relationship_owner', 'Dennis', 'text', 'Brisbane Property Group'),
    f('customers', 'Brisbane Property Group', 'contract_status', 'No contract, monthly invoicing', 'text'),
    f('customers', 'Metro Builders', 'annual_revenue', '$450,000', 'money', 'Metro Builders'),
    f('customers', 'Greenfield Constructions', 'annual_revenue', '$350,000', 'money', 'Greenfield Constructions'),
    f('customers', 'Valley Electrical Solutions', 'top_5_client_share', '45%', 'percentage'),
    f('customers', 'Valley Electrical Solutions', 'repeat_work_share', '70%', 'percentage'),
    f('customers', 'Valley Electrical Solutions', 'new_work_share', '30%', 'percentage'),
    f('customers', 'Valley Electrical Solutions', 'average_debtor_days', '38', 'number'),
    // People
    f('people', 'Mark', 'role', 'Leading hand (commercial)', 'text', 'Mark (leading hand, commercial)'),
    f('people', 'Mark', 'tenure_years', '12', 'number', 'Mark (leading hand, commercial)'),
    f('people', 'Mark', 'has_contract', 'No', 'boolean', 'Mark (leading hand, commercial)'),
    f('people', 'Mark', 'has_restraint', 'No', 'boolean'),
    f('people', 'Sarah', 'role', 'Leading hand (residential)', 'text', 'Sarah (leading hand, residential)'),
    f('people', 'Sarah', 'tenure_years', '7', 'number', 'Sarah (leading hand, residential)'),
    f('people', 'Sarah', 'has_contract', 'No', 'boolean', 'Sarah (leading hand, residential)'),
    f('people', 'Valley Electrical Solutions', 'total_employees', '14', 'number'),
    f('people', 'Valley Electrical Solutions', 'full_time_count', '13', 'number'),
    f('people', 'Valley Electrical Solutions', 'apprentice_count', '2', 'number'),
    // Assets
    f('assets', 'Valley Electrical Solutions', 'vehicle_count', '6', 'number'),
    f('assets', 'Valley Electrical Solutions', 'vehicle_ownership', 'All leased', 'text'),
    f('assets', 'Valley Electrical Solutions', 'monthly_lease_cost', '$4,200', 'money'),
    f('assets', 'Valley Electrical Solutions', 'vehicles_in_dennis_name', '4', 'number'),
    f('assets', 'Valley Electrical Solutions', 'tooling_value', '$80,000', 'money'),
    // Compliance
    f('compliance_calendar', 'Electrical Contractor Licence', 'status', 'Current (renewed July)', 'text', 'Electrical Contractor Licence (QLD)'),
    f('compliance_calendar', 'Public Liability Insurance', 'cover', '$20M', 'text', 'Public liability insurance ($20M)'),
    f('compliance_calendar', 'Professional Indemnity', 'cover', '$5M', 'text', 'Professional indemnity insurance ($5M)'),
    f('compliance_calendar', 'Safety Management System', 'status', 'Not documented', 'text'),
    // Systems
    f('systems_records', 'Xero', 'purpose', 'Invoicing and bookkeeping', 'text', 'Xero accounting software'),
    f('systems_records', 'Xero', 'managed_by', 'External accountant', 'text'),
    // Work sources
    f('work_sources', 'Google Business Profile', 'channel', 'Online search', 'text', 'Google Business Profile'),
    f('work_sources', 'Word of mouth referrals', 'share', '70% of new work', 'text'),
    // Delivery
    f('delivery', 'Standard installation workflow', 'documented', 'No', 'boolean', 'Standard installation workflow'),
    f('delivery', 'Monday morning job allocation', 'method', 'Verbal meeting', 'text', 'Monday morning job allocation'),
    f('delivery', 'Timesheet tracking', 'method', 'Handwritten, entered monthly', 'text'),
  ];
}

// ── 6. Genome relationships ─────────────────────────────────────────────────

function relationshipRows(personId, entities) {
  const byName = Object.fromEntries(entities.map((e) => [e.name, e.id]));
  const r = (area, subjectName, predicate, objectName, conf = 0.7) => ({
    id: uuid(),
    organisation_id: CAIS_BETA_ORG_ID,
    user_id: personId,
    subject_entity_id: byName[subjectName],
    predicate,
    object_entity_id: objectName ? byName[objectName] ?? null : null,
    object_value: objectName ? null : predicate,
    area_key: area,
    status: 'confirmed',
    confidence: conf,
    source_type: 'conversation',
    source_reference: `${SEED_TAG} synthetic seed`,
    observed_at: daysAgo(10),
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
    visibility: 'org',
  });
  return [
    r('customers', 'Brisbane Property Group', 'generates_work_for', 'Valley Electrical Solutions'),
    r('customers', 'Metro Builders', 'generates_work_for', 'Valley Electrical Solutions'),
    r('customers', 'Greenfield Constructions', 'generates_work_for', 'Valley Electrical Solutions'),
    r('people', 'Mark (leading hand, commercial)', 'manages', '8 electricians'),
    r('people', 'Sarah (leading hand, residential)', 'manages', '2 apprentices'),
    r('people', 'Mark (leading hand, commercial)', 'leads', 'Standard installation workflow'),
    r('people', 'Sarah (leading hand, residential)', 'leads', 'Monday morning job allocation'),
    r('delivery', 'Standard installation workflow', 'uses', 'No job management system'),
    r('delivery', 'Monday morning job allocation', 'uses', 'No time-tracking system'),
  ];
}

// ── 7. Genome item status (half-green) ──────────────────────────────────────

// ~22 answered/weak out of ~45 total items → roughly half-green
function itemStatusRows(personId) {
  const items = [
    // CUSTOMERS (6 items) — mostly answered, this is their strongest area
    { key: 'customers.top-named', area: 'customers', status: 'answered' },
    { key: 'customers.relationship-owner', area: 'customers', status: 'answered', why: 'Dennis holds the key relationships personally — buyer risk.' },
    { key: 'customers.contracted', area: 'customers', status: 'answered' },
    { key: 'customers.would-follow', area: 'customers', status: 'weak', why: 'No contracts in place — clients might not follow a new owner.' },
    { key: 'customers.tenure', area: 'customers', status: 'answered' },
    { key: 'customers.unusual-terms', area: 'customers', status: 'answered' },
    // PRICING (6 items) — partially answered
    { key: 'pricing.method', area: 'pricing', status: 'answered' },
    { key: 'pricing.rates', area: 'pricing', status: 'weak', why: 'Rates are experience-based, not documented — nobody else can replicate the pricing.' },
    { key: 'pricing.non-standard', area: 'pricing', status: 'open' },
    { key: 'pricing.discount-authority', area: 'pricing', status: 'open' },
    { key: 'pricing.list-location', area: 'pricing', status: 'open' },
    { key: 'pricing.last-moved', area: 'pricing', status: 'open' },
    // OPERATIONS (6 items) — partially answered
    { key: 'operations.standard-job', area: 'operations', status: 'answered' },
    { key: 'operations.who-does-each-step', area: 'operations', status: 'weak', why: 'Workflow exists but is undocumented — team follows by routine.' },
    { key: 'operations.owner-still-does', area: 'operations', status: 'answered' },
    { key: 'operations.quality-check', area: 'operations', status: 'open' },
    { key: 'operations.common-failure', area: 'operations', status: 'open' },
    { key: 'operations.owner-only-jobs', area: 'operations', status: 'open' },
    // PEOPLE (7 items) — some answered
    { key: 'people.roster', area: 'people', status: 'answered' },
    { key: 'people.engagement-type', area: 'people', status: 'answered' },
    { key: 'people.critical', area: 'people', status: 'weak', why: 'Mark and Sarah are critical — no contracts, no restraints, either could leave.' },
    { key: 'people.successor', area: 'people', status: 'weak', why: 'No succession plan — Dennis is the only person who can run the business end to end.' },
    { key: 'people.tenure', area: 'people', status: 'answered' },
    { key: 'people.contracts-restraints', area: 'people', status: 'answered' },
    { key: 'people.flight-risk', area: 'people', status: 'open' },
    // COMPLIANCE (5 items) — partially answered
    { key: 'compliance.licences', area: 'compliance', status: 'answered' },
    { key: 'compliance.insurance', area: 'compliance', status: 'answered' },
    { key: 'compliance.who-watches', area: 'compliance', status: 'weak', why: 'Office admin manages the calendar but the process is not documented.' },
    { key: 'compliance.disputes', area: 'compliance', status: 'open' },
    { key: 'compliance.change-of-control', area: 'compliance', status: 'open' },
    // CASH (6 items) — some answered
    { key: 'cash.customer-terms', area: 'cash', status: 'answered' },
    { key: 'cash.chasing', area: 'cash', status: 'weak', why: 'Chasing is ad hoc — no formal process.' },
    { key: 'cash.spend-authority', area: 'cash', status: 'open' },
    { key: 'cash.personal-supplier-terms', area: 'cash', status: 'open' },
    { key: 'cash.tied-up', area: 'cash', status: 'open' },
    { key: 'cash.other-obligations', area: 'cash', status: 'open' },
    // ASSETS (5 items) — partially answered
    { key: 'assets.owned', area: 'assets', status: 'answered' },
    { key: 'assets.financed', area: 'assets', status: 'answered' },
    { key: 'assets.personally-held', area: 'assets', status: 'answered', why: '4 of 6 vehicles are in Dennis personal name — complicates transfer.' },
    { key: 'assets.premises', area: 'assets', status: 'open' },
    { key: 'assets.replacement-due', area: 'assets', status: 'open' },
    { key: 'assets.deferred-maintenance', area: 'assets', status: 'open' },
    // SYSTEMS (6 items) — partially answered
    { key: 'systems.software', area: 'systems', status: 'answered' },
    { key: 'systems.admin-access', area: 'systems', status: 'open' },
    { key: 'systems.file-location', area: 'systems', status: 'open' },
    { key: 'systems.ip-ownership', area: 'systems', status: 'answered' },
    { key: 'systems.written-vs-habit', area: 'systems', status: 'weak', why: 'Most operational knowledge is habit, not documentation.' },
    { key: 'systems.access-if-unavailable', area: 'systems', status: 'open' },
    // DEMAND (4 items)
    { key: 'demand.sources', area: 'demand', status: 'answered' },
    { key: 'demand.comes-to-owner', area: 'demand', status: 'weak', why: 'Some demand comes to Dennis personally (builder relationships).' },
    { key: 'demand.repeat-split', area: 'demand', status: 'answered' },
    { key: 'demand.marketing', area: 'demand', status: 'weak', why: 'No active marketing spend — relying on referrals and reputation.' },
  ];
  return items.map((item) => ({
    id: uuid(),
    organisation_id: CAIS_BETA_ORG_ID,
    user_id: personId,
    item_key: item.key,
    area: item.area,
    status: item.status,
    why: item.why ?? null,
    evidence: [],
    assessed_at: daysAgo(10),
    assessed_by: `${SEED_TAG} synthetic seed`,
  }));
}

// ── 8. Knowledge files ──────────────────────────────────────────────────────

function knowledgeRows(personId) {
  return [
    {
      id: uuid(),
      organisation_id: CAIS_BETA_ORG_ID,
      user_id: personId,
      source_type: 'user_note',
      title: `${SEED_TAG} Business Overview`,
      summary: 'Company overview for Valley Electrical Solutions.',
      raw_content: `Valley Electrical Solutions is an electrical and mechanical contracting business based in Fortitude Valley, Brisbane. Founded in 2012 by Dennis McMahon, the business has grown from a one-man operation to a team of 14. Annual revenue is approximately $5M with a 20% net profit margin. The business serves both commercial and residential clients, with the majority of work coming from repeat clients and referrals.`,
      created_by: 'user',
      created_at: daysAgo(10),
      visibility: 'org',
    },
    {
      id: uuid(),
      organisation_id: CAIS_BETA_ORG_ID,
      user_id: personId,
      source_type: 'user_note',
      title: `${SEED_TAG} Staffing and Operations`,
      summary: 'Team structure and operations for Valley Electrical Solutions.',
      raw_content: `The business employs 14 people: Dennis (owner/operator), two experienced leading hands (Mark - 12 years, Sarah - 7 years), eight electricians, two apprentices, and one part-time office administrator. Mark manages commercial projects while Sarah oversees residential work. Operations are managed through a weekly Monday morning meeting where jobs are allocated verbally. There is no formal job management or time-tracking system.`,
      created_by: 'user',
      created_at: daysAgo(10),
      visibility: 'org',
    },
  ];
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = has('dry-run');
  const doClear = has('clear');

  console.log(`\n${SEED_TAG} CAIS Beta Synthetic Business Seed`);
  console.log(`${SEED_TAG} Org: ${CAIS_BETA_ORG_ID}`);
  console.log(`${SEED_TAG} Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log('');

  const user = await resolveUser();
  console.log(`${SEED_TAG} Target user: ${user.firstName} (person ${user.personId})`);
  console.log('');

  // Conversations reference the org's real Kira agent (kira_agent_id FK still live).
  const { data: agent } = await db
    .from('kira_agents')
    .select('id')
    .eq('organisation_id', CAIS_BETA_ORG_ID)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  const agentId = agent?.id ?? null;
  if (!agentId) {
    console.error(`${SEED_TAG} No active kira_agents row for the org. Voice/Kira is not set up yet.`);
    process.exit(1);
  }

  if (doClear) {
    if (!dryRun) await clearSeedData();
    else console.log(`${SEED_TAG} DRY RUN: would clear seed data`);
    return;
  }

  // Build all rows
  const conversations = conversationRows(user.legacyUserId, agentId);
  const memories = memoryRows(conversations, user.personId, agentId);
  const valuation = valuationRow(user.personId);
  const entities = entityRows(user.personId);
  const facts = factRows(user.personId, entities);
  const relationships = relationshipRows(user.personId, entities);
  const itemStatus = itemStatusRows(user.personId);
  const knowledge = knowledgeRows(user.personId);

  console.log(`${SEED_TAG} Would insert:`);
  console.log(`  conversations:        ${conversations.length} (bound to kira_agent ${agentId.slice(0, 8)}...)`);
  console.log(`  kira_memory:          ${memories.length}`);
  console.log(`  business_valuations:  1 (upsert on organisation_id — org-unique)`);
  console.log(`  genome_entities:      ${entities.length}`);
  console.log(`  genome_facts:         ${facts.length}`);
  console.log(`  genome_relationships: ${relationships.length}`);
  console.log(`  genome_item_status:   ${itemStatus.length} (of 52 total checklist items)`);
  console.log(`  kira_knowledge:       ${knowledge.length}`);
  console.log('');

  if (dryRun) {
    console.log(`${SEED_TAG} DRY RUN complete. No data written.`);
    return;
  }

  // Clear previous seed data first
  await clearSeedData();

  // Insert in dependency order
  console.log(`${SEED_TAG} Inserting conversations...`);
  const { error: convErr } = await db.from('conversations').insert(conversations);
  if (convErr) console.error(`${SEED_TAG} conversations error:`, convErr.message);
  else console.log(`${SEED_TAG}   ✓ ${conversations.length} conversations`);

  console.log(`${SEED_TAG} Inserting kira_memory...`);
  const { error: memErr } = await db.from('kira_memory').insert(memories);
  if (memErr) console.error(`${SEED_TAG} kira_memory error:`, memErr.message);
  else console.log(`${SEED_TAG}   ✓ ${memories.length} memories`);

  console.log(`${SEED_TAG} Upserting business_valuations...`);
  const { error: valErr } = await db
    .from('business_valuations')
    .upsert(valuation, { onConflict: 'organisation_id' });
  if (valErr) console.error(`${SEED_TAG} business_valuations error:`, valErr.message);
  else console.log(`${SEED_TAG}   ✓ 1 valuation (readiness ${BUSINESS.readiness}, gap $${(BUSINESS.gap / 1e6).toFixed(1)}M)`);

  console.log(`${SEED_TAG} Inserting genome_entities...`);
  const { error: entErr } = await db.from('genome_entities').insert(entities);
  if (entErr) console.error(`${SEED_TAG} genome_entities error:`, entErr.message);
  else console.log(`${SEED_TAG}   ✓ ${entities.length} entities`);

  console.log(`${SEED_TAG} Inserting genome_facts...`);
  const { error: factErr } = await db.from('genome_facts').insert(facts);
  if (factErr) console.error(`${SEED_TAG} genome_facts error:`, factErr.message);
  else console.log(`${SEED_TAG}   ✓ ${facts.length} facts`);

  console.log(`${SEED_TAG} Inserting genome_relationships...`);
  const { error: relErr } = await db.from('genome_relationships').insert(relationships);
  if (relErr) console.error(`${SEED_TAG} genome_relationships error:`, relErr.message);
  else console.log(`${SEED_TAG}   ✓ ${relationships.length} relationships`);

  console.log(`${SEED_TAG} Inserting genome_item_status...`);
  const { error: itemErr } = await db.from('genome_item_status').insert(itemStatus);
  if (itemErr) console.error(`${SEED_TAG} genome_item_status error:`, itemErr.message);
  else console.log(`${SEED_TAG}   ✓ ${itemStatus.length} item verdicts (${itemStatus.filter((i) => i.status === 'answered').length} answered, ${itemStatus.filter((i) => i.status === 'weak').length} weak)`);

  console.log(`${SEED_TAG} Inserting kira_knowledge...`);
  const { error: knowErr } = await db.from('kira_knowledge').insert(knowledge);
  if (knowErr) console.error(`${SEED_TAG} kira_knowledge error:`, knowErr.message);
  else console.log(`${SEED_TAG}   ✓ ${knowledge.length} knowledge files`);

  console.log('');
  console.log(`${SEED_TAG} Seed complete.`);
  console.log(`${SEED_TAG} Business: ${BUSINESS.name} (${BUSINESS.industry})`);
  console.log(`${SEED_TAG} Revenue: $${(BUSINESS.turnover / 1e6).toFixed(0)}M | SDE: $${(BUSINESS.sde / 1e6).toFixed(2)}M | Readiness: ${BUSINESS.readiness}`);
  console.log(`${SEED_TAG} Three numbers: today $${(BUSINESS.worthToday / 1e6).toFixed(1)}M → potential $${(BUSINESS.worthPotential / 1e6).toFixed(1)}M (gap $${(BUSINESS.gap / 1e6).toFixed(1)}M)`);
  console.log('');
}

main().catch((error) => {
  console.error(`${SEED_TAG} Fatal:`, error);
  process.exit(1);
});
