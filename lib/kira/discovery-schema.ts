// lib/kira/discovery-schema.ts
// The Client Profile — the structured artifact the deep-discovery phase extracts and the
// operational Kira is briefed from. This is the "fully briefed" shape: identity, business,
// goals, working style, relationships, priorities. Every field is nullable because discovery
// ACCUMULATES across coaching sessions — a session fills what it can and leaves the rest for
// the next one (the gate tracks how full it is).

import { z } from 'zod';

const nstr = z.string().trim().min(1).nullable().default(null);
const nstrArr = z.array(z.string().trim().min(1)).default([]);

export const ClientProfileSchema = z.object({
  identity: z
    .object({
      name: nstr,
      location: nstr,
      background_summary: nstr, // who they are, their history in a few sentences
    })
    .default({ name: null, location: null, background_summary: null }),

  life_context: nstr, // personal situation, family, what matters to them outside work

  business: z
    .object({
      name: nstr,
      type: nstr, // e.g. "civil / earthmoving contractor"
      size: nstr, // staff / scale
      stage: nstr, // early / established / scaling
      description: nstr,
    })
    .default({ name: null, type: null, size: null, stage: null, description: null }),

  role: nstr, // what they actually do day-to-day
  working_style: nstr, // how they work, decide, communicate, what they will/won't do
  communication_preferences: nstr, // how they like to be spoken to / kept in the loop

  goals_near_term: nstrArr,
  goals_long_term: nstrArr,
  domain_expertise: nstrArr,
  constraints: nstrArr, // budget, time, capacity, "won't become a corporate machine"
  key_relationships: nstrArr, // crew, clients, partners, family in the business
  current_priorities: nstrArr,
  pain_points: nstrArr,

  notes: nstr, // anything else material the transcript surfaced
});

export type ClientProfile = z.infer<typeof ClientProfileSchema>;

// The subset of fields whose presence defines "how briefed are we" (drives the gate).
const KEY_FIELDS: Array<(p: ClientProfile) => boolean> = [
  (p) => !!p.identity?.name,
  (p) => !!p.identity?.background_summary,
  (p) => !!p.life_context,
  (p) => !!p.business?.type || !!p.business?.description,
  (p) => !!p.role,
  (p) => !!p.working_style,
  (p) => (p.goals_near_term?.length ?? 0) + (p.goals_long_term?.length ?? 0) > 0,
  (p) => (p.constraints?.length ?? 0) > 0,
  (p) => (p.key_relationships?.length ?? 0) > 0,
  (p) => (p.current_priorities?.length ?? 0) > 0,
];

/** Fraction (0..1) of key fields populated. */
export function computeCompleteness(profile: ClientProfile): number {
  const hit = KEY_FIELDS.filter((f) => {
    try {
      return f(profile);
    } catch {
      return false;
    }
  }).length;
  return Math.round((hit / KEY_FIELDS.length) * 100) / 100;
}

/** Threshold above which the operational Kira is considered "briefed enough to operate." */
export const DISCOVERY_COMPLETE_THRESHOLD = 0.7;

/** A compact, recall-friendly briefing string the operational agent can pull. */
export function buildProfileBriefing(p: ClientProfile): string {
  const parts: string[] = [];
  if (p.identity?.name) parts.push(`This is ${p.identity.name}.`);
  if (p.identity?.background_summary) parts.push(p.identity.background_summary);
  if (p.business?.description || p.business?.type) parts.push(`Business: ${p.business.description || p.business.type}.`);
  if (p.role) parts.push(`Their role: ${p.role}.`);
  if (p.working_style) parts.push(`How they work: ${p.working_style}.`);
  if (p.goals_near_term?.length) parts.push(`Near-term goals: ${p.goals_near_term.join('; ')}.`);
  if (p.goals_long_term?.length) parts.push(`Long-term goals: ${p.goals_long_term.join('; ')}.`);
  if (p.key_relationships?.length) parts.push(`Key people: ${p.key_relationships.join('; ')}.`);
  if (p.constraints?.length) parts.push(`Constraints: ${p.constraints.join('; ')}.`);
  if (p.current_priorities?.length) parts.push(`Current priorities: ${p.current_priorities.join('; ')}.`);
  return `CLIENT PROFILE (from discovery). ${parts.join(' ')}`.trim();
}

/** Deepen (never regress) the stored profile with a fresh session's extraction: a non-null
 *  scalar overrides, arrays union (deduped), nested objects merge field-wise. */
export function mergeProfile(prev: Partial<ClientProfile>, next: ClientProfile): ClientProfile {
  const base = ClientProfileSchema.parse(prev ?? {});
  const mergedScalar = (a: string | null, b: string | null) => b ?? a;
  const mergedArr = (a: string[] = [], b: string[] = []) => Array.from(new Set([...a, ...b]));
  const mergeObj = <O extends Record<string, string | null>>(a: O, b: O): O => {
    const out = { ...a } as O;
    for (const k of Object.keys(b) as Array<keyof O>) {
      out[k] = (mergedScalar(a[k] as string | null, b[k] as string | null) as O[keyof O]);
    }
    return out;
  };

  return {
    identity: mergeObj(base.identity, next.identity),
    life_context: mergedScalar(base.life_context, next.life_context),
    business: mergeObj(base.business, next.business),
    role: mergedScalar(base.role, next.role),
    working_style: mergedScalar(base.working_style, next.working_style),
    communication_preferences: mergedScalar(base.communication_preferences, next.communication_preferences),
    goals_near_term: mergedArr(base.goals_near_term, next.goals_near_term),
    goals_long_term: mergedArr(base.goals_long_term, next.goals_long_term),
    domain_expertise: mergedArr(base.domain_expertise, next.domain_expertise),
    constraints: mergedArr(base.constraints, next.constraints),
    key_relationships: mergedArr(base.key_relationships, next.key_relationships),
    current_priorities: mergedArr(base.current_priorities, next.current_priorities),
    pain_points: mergedArr(base.pain_points, next.pain_points),
    notes: mergedScalar(base.notes, next.notes),
  };
}
