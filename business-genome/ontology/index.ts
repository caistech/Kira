// business-genome/ontology/index.ts
//
// ONTOLOGY VERSION ROUTER — resolves the correct ontology version.
//
// This file provides a single import point that resolves to the correct ontology version.
// When a new version is created, add it here and update the default.

import * as v1 from './v1';

/**
 * Get the ontology for a specific version.
 * Falls back to the latest version if the requested version doesn't exist.
 */
export function getOntology(version?: string) {
  switch (version) {
    case 'v1':
      return v1;
    default:
      return v1; // Latest version
  }
}

/**
 * The current/latest ontology version.
 * Update this when a new version is created.
 */
export const CURRENT_VERSION = 'v1';

/**
 * All available ontology versions.
 */
export const AVAILABLE_VERSIONS = ['v1'] as const;

// Re-export everything from the current version as the default
export * from './v1';
