# KIRA — P0.5-2D Consultant / Engagement API Rebinding

**Status:** Implementation Guide
**Purpose:** Canonical helper functions for consultant and engagement access
**Scope:** Auth helper functions, database helper functions
**Prerequisite:** P0.5 Steps 2A-2C complete
**Date:** 26 August 2026

---

## 1. Purpose

This artifact establishes the canonical API functions for consultant and engagement access. These functions should be used by all API routes that interact with consultant and engagement data.

---

## 2. Canonical Functions

### 2.1 Consultant Functions

```typescript
// lib/consultants.ts

import { createServiceClientV2 } from '@/lib/supabase/server';

/**
 * Get all active consultants for the current organisation.
 * P0.5 Step 2D
 */
export async function getOrganisationConsultants(organisationId: string) {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .from('consultant_relationships')
    .select(`
      relationship_id,
      relationship_type,
      valid_from,
      valid_to,
      consultant_profiles (
        consultant_id,
        organisation_name,
        person:persons (first_name, last_name)
      )
    `)
    .eq('organisation_id', organisationId)
    .eq('status', 'active')
    .or('valid_to.is.null,valid_to.gt.now()');

  if (error) throw error;
  return data;
}

/**
 * Check if a consultant has an active relationship with an organisation.
 * P0.5 Step 2D
 */
export async function checkConsultantRelationship(
  consultantId: string,
  organisationId: string
): Promise<boolean> {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .from('consultant_relationships')
    .select('relationship_id')
    .eq('consultant_id', consultantId)
    .eq('organisation_id', organisationId)
    .eq('status', 'active')
    .or('valid_to.is.null,valid_to.gt.now()')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/**
 * Create a new consultant relationship.
 * P0.5 Step 2D
 */
export async function createConsultantRelationship(params: {
  consultantId: string;
  organisationId: string;
  relationshipType: string;
  validFrom?: string;
}) {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .from('consultant_relationships')
    .insert({
      consultant_id: params.consultantId,
      organisation_id: params.organisationId,
      relationship_type: params.relationshipType,
      valid_from: params.validFrom || new Date().toISOString(),
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * End a consultant relationship (create historical state).
 * P0.5 Step 2D
 */
export async function endConsultantRelationship(
  relationshipId: string,
  reason?: string
): Promise<boolean> {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .rpc('end_consultant_relationship', {
      p_relationship_id: relationshipId,
      p_reason: reason,
    });

  if (error) throw error;
  return data;
}
```

### 2.2 Engagement Functions

```typescript
// lib/engagements.ts

import { createServiceClientV2 } from '@/lib/supabase/server';

/**
 * Get all active engagements for the current organisation.
 * P0.5 Step 2D
 */
export async function getOrganisationEngagements(organisationId: string) {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .eq('organisation_id', organisationId)
    .in('status', ['active', 'paused'])
    .order('valid_from', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get participants of an engagement.
 * P0.5 Step 2D
 */
export async function getEngagementParticipants(engagementId: string) {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .from('engagement_participants')
    .select(`
      participant_id,
      participant_type,
      role,
      valid_from,
      valid_to,
      consultant_profiles:participant_id_ref (organisation_name, person:persons (first_name, last_name)),
      persons:participant_id_ref (first_name, last_name)
    `)
    .eq('engagement_id', engagementId)
    .eq('status', 'active');

  if (error) throw error;
  return data;
}

/**
 * Create a new engagement.
 * P0.5 Step 2D
 */
export async function createEngagement(params: {
  organisationId: string;
  title: string;
  description?: string;
  engagementType: string;
  priority?: string;
}) {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .from('engagements')
    .insert({
      organisation_id: params.organisationId,
      title: params.title,
      description: params.description,
      engagement_type: params.engagementType,
      priority: params.priority || 'normal',
      status: 'active',
      valid_from: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Add a participant to an engagement.
 * P0.5 Step 2D
 */
export async function addEngagementParticipant(params: {
  engagementId: string;
  participantType: string;
  participantIdRef: string;
  role?: string;
}) {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .from('engagement_participants')
    .insert({
      engagement_id: params.engagementId,
      participant_type: params.participantType,
      participant_id_ref: params.participantIdRef,
      role: params.role || 'participant',
      status: 'active',
      valid_from: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update engagement status.
 * P0.5 Step 2D
 */
export async function updateEngagementStatus(
  engagementId: string,
  status: string,
  reason?: string
) {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .from('engagements')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('engagement_id', engagementId)
    .select()
    .single();

  if (error) throw error;

  // Record in history
  await supabase
    .from('engagement_history')
    .insert({
      engagement_id: engagementId,
      action: status === 'active' ? 'started' : status,
      reason,
    });

  return data;
}
```

---

## 3. Integration with Auth Helper

The existing `lib/auth.ts` functions (`getCurrentOrganisationContext()`, `getCurrentOrganisationId()`) provide the organisation context needed for consultant and engagement access.

```typescript
// Example: Get consultants for current user's organisation
import { getCurrentOrganisationId } from '@/lib/auth';
import { getOrganisationConsultants } from '@/lib/consultants';

const organisationId = await getCurrentOrganisationId();
if (!organisationId) { /* 401 */ }

const consultants = await getOrganisationConsultants(organisationId);
```

---

## 4. Migration Ledger Entry

The migration ledger entry for Step 2D is included in the Step 2C migration file.

---

*This guide is the P0.5-2D consultant / engagement API rebinding reference.*
