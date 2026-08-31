// business-genome/genome-area-focus.ts
//
// GENOME-AWARE AREA FOCUS — the bridge between the genome gaps and the voice conversation.
//
// This module replaces the old area-focus.ts with a version that uses the new genome
// to decide what to ask about. It answers: "When Kira enters an area, what should she ask?"
//
// RULE: The opener carries the TRIGGER, not the CONTENT. The questions are pulled
// dynamically via area_agenda during the call, not baked in at the start.

import { ONTOLOGY_AREAS, type OntologyArea } from './ontology/v1/areas';

/**
 * Build the first message when the owner arrives from an area link.
 *
 * This is the genome-aware version that uses the new ontology.
 * It carries the trigger, not the content — Kira pulls questions dynamically.
 */
export function buildGenomeAreaFocusFirstMessage(
  area: string | null | undefined,
  firstName?: string | null
): string | null {
  if (!area) return null;
  const def = ONTOLOGY_AREAS.find((a) => a.key === area);
  if (!def) return null;

  const name = firstName ? `${firstName}, ` : '';
  return `${name}let's look at ${def.name.toLowerCase()}.`;
}

/**
 * Build the first message for the genome overview.
 */
export function buildGenomeOverviewFirstMessage(
  firstName?: string | null
): string | null {
  const name = firstName ? `${firstName}, ` : '';
  return `${name}let's take a look at your business genome.`;
}

/**
 * Check if a string is a valid area key.
 */
export function isGenomeAreaKey(key: string): boolean {
  return ONTOLOGY_AREAS.some((a) => a.key === key);
}

/**
 * Get the buyer question for an area.
 * This is what a buyer's advisor would ask about this area.
 */
export function getBuyerQuestion(areaKey: string): string | null {
  const area = ONTOLOGY_AREAS.find((a) => a.key === areaKey);
  return area?.buyerQuestion ?? null;
}

/**
 * Get the owner-facing question for an area.
 * This is what Kira would ask the owner about this area.
 */
export function getOwnerQuestion(areaKey: string): string | null {
  const area = ONTOLOGY_AREAS.find((a) => a.key === areaKey);
  return area?.ownerFacingQuestion ?? null;
}

/**
 * Get all area keys.
 */
export function getAllAreaKeys(): string[] {
  return ONTOLOGY_AREAS.map((a) => a.key);
}

/**
 * Get area definition by key.
 */
export function getAreaDefinition(key: string): OntologyArea | undefined {
  return ONTOLOGY_AREAS.find((a) => a.key === key);
}
