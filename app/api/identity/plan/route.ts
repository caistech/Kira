// app/api/identity/plan/route.ts
//
// CANONICAL IDENTITY BOUNDARY
// ---------------------------
//
// /plan is the single convergence point for application identity.
//
// Canonical chain:
//
//   Supabase Auth
//        ↓
//   auth_credentials
//        ↓
//   persons
//        ↓
//   organisation_memberships
//        ↓
//   organisations
//        ↓
//   ownership_periods
//
// HARD RULES:
//
// - Supabase Auth user.id is NOT a Person ID.
// - persons.auth_user_id is NOT used.
// - auth_credentials is the ONLY Auth → Person bridge.
// - An existing non-null auth_credentials.person_id is IMMUTABLE here.
// - Client-supplied organisationId is NEVER authority.
// - Existing-organisation access requires an existing active, time-valid membership.
// - isOwner NEVER grants access to an existing organisation.
// - Membership and ownership are separate concepts.
// - Ownership is temporal.
// - Email is only a Person-recovery mechanism when no Auth → Person bridge exists.
// - users.id is NEVER used for canonical identity or organisation resolution.
// - Legacy users.id may be consulted only for beta-code provenance compatibility.
// - Beta code/type NEVER selects an organisation and NEVER changes canonical role.
// - GET is read-only: it does not create or repair identity records.
//
// IMPORTANT SCHEMA FACTS USED HERE:
// - organisations uses legal_name, not name.
// - ownership_periods uses ownership_period_id.
// - organisation_memberships has the canonical uniqueness shape
//   (organisation_id, person_id, role), so this route does NOT use an
//   invalid onConflict (organisation_id, person_id) upsert.

import { NextResponse } from 'next/server';
import {
  getCurrentOrganisationContext,
  getAuthUser,
} from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { getBetaGate } from '@/lib/billing';
import { resolveBoundOrganisation } from '@/lib/billing/beta-codes';

export const dynamic = 'force-dynamic';

type PlanRequestBody = {
  firstName?: unknown;
  lastName?: unknown;
  organisationId?: unknown;
  organisationName?: unknown;
  isOwner?: unknown;
  betaCode?: unknown;
};

type CanonicalPerson = {
  person_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type CanonicalCredential = {
  auth_credential_id: string;
  person_id: string | null;
  status: string | null;
};

type CanonicalMembership = {
  membership_id: string;
  organisation_id: string;
  person_id: string;
  role: string;
  status: string;
};

type OrganisationRow = {
  organisation_id: string;
  legal_name: string | null;
};

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseName(value: unknown): string {
  return normaliseString(value).replace(/\s+/g, ' ');
}

/**
 * Beta-code normalisation is intentionally local to beta provenance/entitlement.
 * It has NO identity or organisation authority.
 */
function normaliseBetaCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Read the canonical Auth → Person credential.
 *
 * Status is deliberately NOT part of the lookup. An inactive credential can
 * still be the canonical identity relationship and may be reactivated, but
 * its person_id must never be silently changed.
 */
async function getAuthCredential(
  userId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalCredential | null> {
  const { data, error } = await supabase
    .from('auth_credentials')
    .select('auth_credential_id, person_id, status')
    .eq('auth_user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[identity/plan] auth credential lookup failed:', error);
    throw new Error('AUTH_CREDENTIAL_LOOKUP_FAILED');
  }

  return data;
}

/**
 * Resolve the Person attached to the authenticated Supabase user.
 *
 * This is the ONLY canonical Auth → Person resolution path.
 * It never queries persons.auth_user_id.
 */
async function resolvePersonFromAuth(
  userId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalPerson | null> {
  const credential = await getAuthCredential(userId, supabase);

  if (!credential?.person_id) {
    return null;
  }

  const { data: person, error } = await supabase
    .from('persons')
    .select('person_id, first_name, last_name, email')
    .eq('person_id', credential.person_id)
    .maybeSingle();

  if (error) {
    console.error('[identity/plan] person lookup failed:', error);
    throw new Error('PERSON_LOOKUP_FAILED');
  }

  if (!person) {
    console.error(
      '[identity/plan] auth credential references missing person:',
      credential.person_id,
    );
    throw new Error('PERSON_NOT_FOUND');
  }

  return person;
}

/**
 * Recover an existing Person by authenticated email ONLY when there is no
 * established Auth → Person credential.
 *
 * Email is not an organisation resolver and is never used to grant org access.
 * Multiple matches are deliberately treated as an error rather than choosing
 * an arbitrary Person.
 */
async function findPersonByEmail(
  email: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalPerson | null> {
  const { data, error } = await supabase
    .from('persons')
    .select('person_id, first_name, last_name, email')
    .ilike('email', email)
    .limit(2);

  if (error) {
    console.error('[identity/plan] person email lookup failed:', error);
    throw new Error('PERSON_LOOKUP_FAILED');
  }

  if (!data || data.length === 0) {
    return null;
  }

  if (data.length > 1) {
    console.error(
      '[identity/plan] multiple Persons match authenticated email:',
      email,
    );
    throw new Error('PERSON_EMAIL_AMBIGUOUS');
  }

  return data[0];
}

/**
 * Establish the Auth → Person bridge.
 *
 * Allowed transitions:
 *
 *   no credential
 *       → create credential for resolved Person
 *
 *   credential.person_id IS NULL
 *       → populate the missing Person link
 *
 *   credential.person_id = personId
 *       → optionally reactivate credential
 *
 * Forbidden transition:
 *
 *   credential.person_id = Person A
 *       → Person B
 *
 * That is an identity conflict and returns AUTH_PERSON_CONFLICT.
 */
async function establishAuthCredential(
  userId: string,
  personId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<void> {
  const credential = await getAuthCredential(userId, supabase);

  if (!credential) {
    const { error } = await supabase
      .from('auth_credentials')
      .insert({
        auth_user_id: userId,
        person_id: personId,
        status: 'active',
      });

    if (!error) {
      return;
    }

    // A concurrent request may have created the credential between the read
    // and insert. Re-read and verify the canonical Person rather than retrying
    // with a potentially different identity.
    const concurrent = await getAuthCredential(userId, supabase);

    if (concurrent?.person_id === personId) {
      if (concurrent.status !== 'active') {
        const { error: reactivateError } = await supabase
          .from('auth_credentials')
          .update({ status: 'active' })
          .eq(
            'auth_credential_id',
            concurrent.auth_credential_id,
          )
          .eq('person_id', personId);

        if (reactivateError) {
          console.error(
            '[identity/plan] concurrent credential reactivation failed:',
            reactivateError,
          );
          throw new Error('AUTH_CREDENTIAL_UPDATE_FAILED');
        }
      }
      return;
    }

    if (concurrent?.person_id) {
      console.error(
        '[identity/plan] credential creation encountered canonical Person conflict:',
        {
          authUserId: userId,
          existingPersonId: concurrent.person_id,
          attemptedPersonId: personId,
        },
      );
      throw new Error('AUTH_PERSON_CONFLICT');
    }

    console.error(
      '[identity/plan] auth credential creation failed:',
      error,
    );
    throw new Error('AUTH_CREDENTIAL_CREATE_FAILED');
  }

  if (credential.person_id) {
    if (credential.person_id !== personId) {
      console.error(
        '[identity/plan] existing Auth → Person relationship conflicts with resolved Person:',
        {
          authUserId: userId,
          credentialPersonId: credential.person_id,
          resolvedPersonId: personId,
        },
      );
      throw new Error('AUTH_PERSON_CONFLICT');
    }

    if (credential.status !== 'active') {
      const { error } = await supabase
        .from('auth_credentials')
        .update({ status: 'active' })
        .eq(
          'auth_credential_id',
          credential.auth_credential_id,
        )
        .eq('person_id', personId);

      if (error) {
        console.error(
          '[identity/plan] auth credential reactivation failed:',
          error,
        );
        throw new Error('AUTH_CREDENTIAL_UPDATE_FAILED');
      }
    }

    return;
  }

  // Existing credential is incomplete. Completing a NULL person_id is allowed;
  // rebinding an established person_id is not.
  const { error } = await supabase
    .from('auth_credentials')
    .update({
      person_id: personId,
      status: 'active',
    })
    .eq(
      'auth_credential_id',
      credential.auth_credential_id,
    )
    .is('person_id', null);

  if (error) {
    console.error(
      '[identity/plan] incomplete auth credential repair failed:',
      error,
    );
    throw new Error('AUTH_CREDENTIAL_UPDATE_FAILED');
  }

  const repaired = await getAuthCredential(userId, supabase);

  if (!repaired || repaired.person_id !== personId) {
    console.error(
      '[identity/plan] auth credential repair verification failed:',
      {
        authUserId: userId,
        expectedPersonId: personId,
        actualPersonId: repaired?.person_id ?? null,
      },
    );
    throw new Error('AUTH_PERSON_CONFLICT');
  }

  if (repaired.status !== 'active') {
    throw new Error('AUTH_CREDENTIAL_UPDATE_FAILED');
  }
}

/**
 * Resolve or create the canonical Person.
 *
 * Resolution order:
 *
 *   1. Existing auth_credentials.person_id
 *   2. Existing Person recovered by authenticated email
 *   3. New Person
 */
async function resolveOrCreatePerson(
  user: { id: string; email?: string | null },
  firstName: string,
  lastName: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<string> {
  const credential = await getAuthCredential(user.id, supabase);

  if (credential?.person_id) {
    // Existing canonical Auth → Person relationship wins absolutely.
    const { data: person, error } = await supabase
      .from('persons')
      .select('person_id')
      .eq('person_id', credential.person_id)
      .maybeSingle();

    if (error) {
      console.error(
        '[identity/plan] canonical Person verification failed:',
        error,
      );
      throw new Error('PERSON_LOOKUP_FAILED');
    }

    if (!person) {
      throw new Error('PERSON_NOT_FOUND');
    }

    await establishAuthCredential(user.id, credential.person_id, supabase);
    return credential.person_id;
  }

  let recoveredPerson: CanonicalPerson | null = null;

  if (user.email) {
    recoveredPerson = await findPersonByEmail(
      user.email,
      supabase,
    );
  }

  if (recoveredPerson) {
    await establishAuthCredential(
      user.id,
      recoveredPerson.person_id,
      supabase,
    );
    return recoveredPerson.person_id;
  }

  const { data: createdPerson, error } = await supabase
    .from('persons')
    .insert({
      email: user.email ?? null,
      first_name: firstName,
      last_name: lastName,
    })
    .select('person_id')
    .single();

  if (error || !createdPerson) {
    console.error('[identity/plan] person creation failed:', error);
    throw new Error('PERSON_CREATE_FAILED');
  }

  try {
    await establishAuthCredential(
      user.id,
      createdPerson.person_id,
      supabase,
    );
  } catch (error) {
    // Do not delete the Person here. Historical/FK semantics may depend on it.
    // The canonical identity failure is surfaced to the caller.
    throw error;
  }

  return createdPerson.person_id;
}

/**
 * Update Person profile fields without altering identity relationships.
 */
async function updatePerson(
  personId: string,
  firstName: string,
  lastName: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<void> {
  const { error } = await supabase
    .from('persons')
    .update({
      first_name: firstName,
      last_name: lastName,
    })
    .eq('person_id', personId);

  if (error) {
    console.error('[identity/plan] person update failed:', error);
    throw new Error('PERSON_UPDATE_FAILED');
  }
}

/**
 * Resolve an organisation by canonical organisation_id.
 *
 * The schema uses legal_name, not name.
 */
async function resolveOrganisation(
  organisationId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<OrganisationRow> {
  const { data, error } = await supabase
    .from('organisations')
    .select('organisation_id, legal_name')
    .eq('organisation_id', organisationId)
    .maybeSingle();

  if (error) {
    console.error('[identity/plan] organisation lookup failed:', error);
    throw new Error('ORGANISATION_LOOKUP_FAILED');
  }

  if (!data) {
    throw new Error('ORGANISATION_NOT_FOUND');
  }

  return data;
}

/**
 * Existing-organisation authority check.
 *
 * This requires an existing active and time-valid membership.
 * It does not create, update, upsert, promote or otherwise alter membership.
 */
async function resolveActiveMembership(
  organisationId: string,
  personId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalMembership | null> {
  const { data, error } = await supabase
    .from('organisation_memberships')
    .select(
      'membership_id, organisation_id, person_id, role, status',
    )
    .eq('organisation_id', organisationId)
    .eq('person_id', personId)
    .eq('status', 'active')
    .or('valid_to.is.null,valid_to.gt.now()')
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[identity/plan] membership lookup failed:', error);
    throw new Error('MEMBERSHIP_LOOKUP_FAILED');
  }

  return data;
}

/**
 * Create membership ONLY for a newly-created organisation.
 *
 * We deliberately use INSERT rather than upsert because the schema's unique
 * key is (organisation_id, person_id, role), not (organisation_id, person_id).
 * More importantly, an existing organisation path must never mutate membership.
 */
async function createOrganisationMembership(
  organisationId: string,
  personId: string,
  role: 'owner' | 'member',
  validFrom: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalMembership> {
  const { data, error } = await supabase
    .from('organisation_memberships')
    .insert({
      organisation_id: organisationId,
      person_id: personId,
      role,
      status: 'active',
      valid_from: validFrom,
    })
    .select(
      'membership_id, organisation_id, person_id, role, status',
    )
    .single();

  if (error || !data) {
    console.error(
      '[identity/plan] membership creation failed:',
      error,
    );
    throw new Error('MEMBERSHIP_CREATE_FAILED');
  }

  return data;
}

/**
 * Establish ownership for a newly-created organisation only.
 *
 * Ownership is separate from membership and is temporal. Never create a
 * duplicate current ownership period.
 */
async function establishOwnership(
  organisationId: string,
  personId: string,
  validFrom: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<boolean> {
  const { data: existing, error: lookupError } = await supabase
    .from('ownership_periods')
    .select('ownership_period_id')
    .eq('organisation_id', organisationId)
    .eq('person_id', personId)
    .eq('status', 'current')
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error('[identity/plan] ownership lookup failed:', lookupError);
    throw new Error('OWNERSHIP_LOOKUP_FAILED');
  }

  if (existing) {
    return true;
  }

  const { error: insertError } = await supabase
    .from('ownership_periods')
    .insert({
      organisation_id: organisationId,
      person_id: personId,
      status: 'current',
      valid_from: validFrom,
    });

  if (!insertError) {
    return true;
  }

  // A concurrent request may have created the same current ownership period.
  // Re-read and accept only if canonical ownership now exists.
  const { data: concurrent, error: verifyError } = await supabase
    .from('ownership_periods')
    .select('ownership_period_id')
    .eq('organisation_id', organisationId)
    .eq('person_id', personId)
    .eq('status', 'current')
    .limit(1)
    .maybeSingle();

  if (!verifyError && concurrent) {
    return true;
  }

  console.error(
    '[identity/plan] ownership creation failed:',
    insertError,
  );
  throw new Error('OWNERSHIP_CLAIM_FAILED');
}

/**
 * Legacy users.id helper.
 *
 * THIS IS NOT CANONICAL IDENTITY RESOLUTION.
 * It exists solely so existing beta-code provenance records can still be
 * matched during the transition. It must never determine Person, Organisation,
 * membership or ownership.
 */
async function getLegacyUserIdForBetaProvenance(
  supabase: ReturnType<typeof createServiceClientV2>,
  authUserId: string,
  email: string | null,
): Promise<string | null> {
  const { data: byAuthUserId } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (byAuthUserId?.id) {
    return String(byAuthUserId.id);
  }

  if (!email) {
    return null;
  }

  const { data: byEmail } = await supabase
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  return byEmail?.id ? String(byEmail.id) : null;
}

/**
 * Resolve the server-minted organisation carried by a beta code, if the code
 * is entitled to the authenticated user.
 *
 * THIS IS THE ONE AUTHORISED EXCEPTION TO "beta never selects an
 * organisation". It is safe for four reasons, all of which must hold:
 *
 *   1. The organisation comes from the `beta_codes` row, written by the
 *      OPERATOR at mint time — it is never client-supplied, so this is
 *      authority from the server, not from the form.
 *   2. The code must be entitled to THIS authenticated user (redeemed_user_id
 *      or the legacy users bridge), so a stranger cannot steer someone else's
 *      invitation into their own org.
 *   3. The code row must actually carry an organisation_id — a normal code
 *      (null org) falls through to the standard new-organisation path.
 *   4. Membership role is derived ONLY from beta_type (superadmin → owner,
 *      user → member). An already-existing membership is never modified:
 *      no promotion, no demotion, no ownership claim on an existing org.
 *
 * Returns null when any of these conditions fail, so the caller falls through
 * to the existing organisation / new organisation paths unchanged.
 */
async function resolveBoundOrganisationForCode(
  betaCode: string,
  user: { id: string; email?: string | null },
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<{
  organisationId: string;
  betaType: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
} | null> {
  const normalisedCode = normaliseBetaCode(betaCode);

  if (!normalisedCode) {
    return null;
  }

  const { organisationId, betaType, email, firstName, lastName } =
    await resolveBoundOrganisation(normalisedCode);

  if (!organisationId) {
    return null;
  }

  const { data: entitlement, error } = await supabase
    .from('beta_codes')
    .select('redeemed_user_id, redeemed_at, revoked_at')
    .eq('code', normalisedCode)
    .maybeSingle();

  if (error) {
    console.error(
      '[identity/plan] bound-code entitlement lookup failed (non-fatal):',
      error,
    );
    return null;
  }

  if (!entitlement?.redeemed_at) {
    return null;
  }

  if (entitlement.revoked_at) {
    return null;
  }

  let entitledToThisUser =
    Boolean(entitlement.redeemed_user_id) &&
    entitlement.redeemed_user_id === user.id;

  if (!entitledToThisUser && entitlement.redeemed_user_id) {
    const legacyUserId = await getLegacyUserIdForBetaProvenance(
      supabase,
      user.id,
      user.email ?? null,
    );

    entitledToThisUser =
      legacyUserId === entitlement.redeemed_user_id;
  }

  if (!entitledToThisUser) {
    return null;
  }

  return {
    organisationId,
    betaType,
    email,
    firstName,
    lastName,
  };
}

/**
 * Apply beta entitlement AFTER canonical organisation resolution.
 *
 * Beta data cannot select the organisation, establish membership, establish
 * ownership or change canonical role. Entitlement failure is deliberately
 * non-fatal because beta is an entitlement/provenance concern, not identity.
 */
async function applyBetaEntitlement(
  betaCode: string,
  user: { id: string; email?: string | null },
  organisationId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<boolean> {
  const normalisedCode = normaliseBetaCode(betaCode);

  if (!normalisedCode) {
    return false;
  }

  const { data: betaRecord, error } = await supabase
    .from('beta_codes')
    .select('redeemed_user_id, redeemed_at')
    .eq('code', normalisedCode)
    .maybeSingle();

  if (error) {
    console.error(
      '[identity/plan] beta entitlement lookup failed (non-fatal):',
      error,
    );
    return false;
  }

  if (!betaRecord?.redeemed_at) {
    return false;
  }

  let entitledToThisUser =
    betaRecord.redeemed_user_id === user.id;

  if (!entitledToThisUser && betaRecord.redeemed_user_id) {
    const legacyUserId = await getLegacyUserIdForBetaProvenance(
      supabase,
      user.id,
      user.email ?? null,
    );

    entitledToThisUser =
      legacyUserId === betaRecord.redeemed_user_id;
  }

  if (!entitledToThisUser) {
    return false;
  }

  try {
    return Boolean(
      await getBetaGate().ensureTrial(organisationId),
    );
  } catch (error) {
    console.error(
      '[identity/plan] beta entitlement application failed (non-fatal):',
      error,
    );
    return false;
  }
}

function identityErrorResponse(
  error: unknown,
  phase: 'GET' | 'POST',
) {
  const code =
    error instanceof Error
      ? error.message
      : 'IDENTITY_RESOLUTION_FAILED';

  const messages: Record<string, string> = {
    AUTH_CREDENTIAL_LOOKUP_FAILED:
      'Unable to resolve authenticated identity',
    AUTH_CREDENTIAL_CREATE_FAILED:
      'Unable to establish authenticated identity',
    AUTH_CREDENTIAL_UPDATE_FAILED:
      'Unable to establish authenticated identity',
    AUTH_PERSON_CONFLICT:
      'Authenticated identity is already linked to a different person',
    PERSON_LOOKUP_FAILED:
      'Unable to resolve person identity',
    PERSON_EMAIL_AMBIGUOUS:
      'Multiple person records match the authenticated email address',
    PERSON_NOT_FOUND:
      'Authenticated identity references a missing person',
    PERSON_CREATE_FAILED:
      'Unable to create person identity',
    PERSON_UPDATE_FAILED:
      'Unable to save person identity',
    ORGANISATION_LOOKUP_FAILED:
      'Unable to resolve organisation',
    ORGANISATION_NOT_FOUND:
      'Organisation not found',
    MEMBERSHIP_LOOKUP_FAILED:
      'Unable to verify organisation membership',
    MEMBERSHIP_CREATE_FAILED:
      'Unable to establish organisation membership',
    OWNERSHIP_LOOKUP_FAILED:
      'Unable to verify ownership declaration',
    OWNERSHIP_CLAIM_FAILED:
      'Unable to save ownership declaration',
  };

  const statusByCode: Record<string, number> = {
    AUTH_PERSON_CONFLICT: 409,
    PERSON_EMAIL_AMBIGUOUS: 409,
    PERSON_NOT_FOUND: 500,
    ORGANISATION_NOT_FOUND: 404,
    // POST-specific authorisation is returned directly by the handler.
  };

  return NextResponse.json(
    {
      error:
        messages[code] ??
        (phase === 'GET'
          ? 'Unable to resolve organisational identity'
          : 'Unable to save organisational identity'),
      code,
    },
    { status: statusByCode[code] ?? 500 },
  );
}

/**
 * GET /api/identity/plan
 *
 * Read-only canonical identity projection.
 *
 * Accepts an optional `?code=<betaCode>` so the identity surface can resolve
 * an operator-minted, org-bound invitation before the user submits anything —
 * letting /plan render "You're joining CAIS Beta" as a read-only notice and
 * skip the business-name step. Read-only: nothing here is minted or claimed.
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();

    const url = new URL(request.url);
    const requestCode = normaliseString(url.searchParams.get('code'));

    const boundOrganisation = requestCode
      ? await resolveBoundOrganisationForCode(
          requestCode,
          {
            id: user?.id ?? '',
            email: user?.email ?? null,
          },
          createServiceClientV2(),
        )
      : null;

    let boundOrganisationInfo: {
      organisationId: string | null;
      organisationName: string | null;
      boundRole: 'owner' | 'member' | null;
      boundBetaType: string | null;
      boundFirstName: string | null;
      boundLastName: string | null;
    } = {
      organisationId: null,
      organisationName: null,
      boundRole: null,
      boundBetaType: null,
      boundFirstName: null,
      boundLastName: null,
    };

    if (boundOrganisation) {
      const org = await resolveOrganisation(
        boundOrganisation.organisationId,
        createServiceClientV2(),
      ).catch(() => null);

      boundOrganisationInfo = {
        organisationId: org?.organisation_id ?? null,
        organisationName: org?.legal_name ?? null,
        boundRole:
          boundOrganisation.betaType === 'superadmin' ? 'owner' : 'member',
        boundBetaType: boundOrganisation.betaType,
        boundFirstName: boundOrganisation.firstName ?? null,
        boundLastName: boundOrganisation.lastName ?? null,
      };
    }

    if (!user) {
      return NextResponse.json({
        ok: true,
        signedIn: false,
        firstName: null,
        lastName: null,
        organisationId: null,
        organisationName: null,
        isOwner: false,
        personId: null,
        boundOrganisation: boundOrganisationInfo,
      });
    }

    const supabase = createServiceClientV2();

    // Resolve Person independently of organisation context first.
    const person = await resolvePersonFromAuth(user.id, supabase);

    if (!person) {
      return NextResponse.json({
        ok: true,
        signedIn: true,
        firstName: null,
        lastName: null,
        organisationId: null,
        organisationName: null,
        isOwner: false,
        personId: null,
        boundOrganisation: boundOrganisationInfo,
      });
    }

    // getCurrentOrganisationContext is canonical membership context, not Person
    // identity. Verify its Person matches the Auth → Person resolution above.
    const context = await getCurrentOrganisationContext();

    if (!context) {
      return NextResponse.json({
        ok: true,
        signedIn: true,
        firstName: person.first_name,
        lastName: person.last_name,
        organisationId: null,
        organisationName: null,
        isOwner: false,
        personId: person.person_id,
        boundOrganisation: boundOrganisationInfo,
      });
    }

    if (context.personId !== person.person_id) {
      console.error(
        '[identity/plan][GET] organisation context Person mismatch:',
        {
          authPersonId: person.person_id,
          contextPersonId: context.personId,
          organisationId: context.organisationId,
        },
      );

      return NextResponse.json(
        {
          error:
            'Organisation context does not match authenticated identity',
          code: 'ORGANISATION_CONTEXT_PERSON_MISMATCH',
        },
        { status: 403 },
      );
    }

    const organisation = await resolveOrganisation(
      context.organisationId,
      supabase,
    );

    const membership = await resolveActiveMembership(
      organisation.organisation_id,
      person.person_id,
      supabase,
    );

    if (!membership) {
      return NextResponse.json(
        {
          error:
            'Authenticated identity is not an active member of the organisation',
          code: 'NOT_ORGANISATION_MEMBER',
        },
        { status: 403 },
      );
    }

    const { data: ownership, error: ownershipError } = await supabase
      .from('ownership_periods')
      .select('ownership_period_id')
      .eq('organisation_id', organisation.organisation_id)
      .eq('person_id', person.person_id)
      .eq('status', 'current')
      .limit(1)
      .maybeSingle();

    if (ownershipError) {
      console.error(
        '[identity/plan][GET] ownership lookup failed:',
        ownershipError,
      );
      throw new Error('OWNERSHIP_LOOKUP_FAILED');
    }

    return NextResponse.json({
      ok: true,
      signedIn: true,
      firstName: person.first_name,
      lastName: person.last_name,
      organisationId: organisation.organisation_id,
      organisationName: organisation.legal_name,
      isOwner: Boolean(ownership),
      personId: person.person_id,
      membershipId: membership.membership_id,
      role: membership.role,
    });
  } catch (error) {
    console.error('[identity/plan][GET] unexpected error:', error);
    return identityErrorResponse(error, 'GET');
  }
}

/**
 * POST /api/identity/plan
 *
 * EXISTING ORGANISATION:
 *   supplied organisationId
 *       ↓
 *   organisation exists
 *       ↓
 *   authenticated Person already has active/time-valid membership
 *       ↓
 *   return existing membership unchanged
 *
 * NEW ORGANISATION:
 *   no organisationId
 *       ↓
 *   create organisation
 *       ↓
 *   create membership
 *       ↓
 *   if isOwner=true, create current ownership period
 *
 * Beta entitlement is processed only AFTER canonical organisation resolution.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorised',
          code: 'NO_AUTHENTICATED_USER',
        },
        { status: 401 },
      );
    }

    const supabase = createServiceClientV2();

    let body: PlanRequestBody;

    try {
      body = (await request.json()) as PlanRequestBody;
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON body',
          code: 'INVALID_JSON',
        },
        { status: 400 },
      );
    }

    const firstName = normaliseName(body.firstName);
    const lastName = normaliseName(body.lastName);
    const submittedOrganisationId = normaliseString(
      body.organisationId,
    );
    const organisationName = normaliseName(
      body.organisationName,
    );
    const betaCode = normaliseString(body.betaCode);
    const isOwner =
      typeof body.isOwner === 'boolean'
        ? body.isOwner
        : false;

    if (!firstName) {
      return NextResponse.json(
        {
          error: 'Please enter your first name.',
          code: 'FIRST_NAME_REQUIRED',
        },
        { status: 400 },
      );
    }

    if (!lastName) {
      return NextResponse.json(
        {
          error: 'Please enter your last name.',
          code: 'LAST_NAME_REQUIRED',
        },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // 1. AUTH → PERSON
    // -----------------------------------------------------------------------
    const personId = await resolveOrCreatePerson(
      {
        id: user.id,
        email: user.email ?? null,
      },
      firstName,
      lastName,
      supabase,
    );

    // Profile update is separate from identity establishment.
    await updatePerson(
      personId,
      firstName,
      lastName,
      supabase,
    );

    // -----------------------------------------------------------------------
    // 2. BOUND-ORGANISATION BETA PATH
    // -----------------------------------------------------------------------
    // An operator-minted code names an organisation on the server. When it does,
    // onboarding skips the "enter your business name" step entirely: the tester
    // joins the bound org, with their persona role derived from beta_type.
    //
    // RULES (see resolveBoundOrganisationForCode):
    // - The org comes from the beta_codes row (server-minted), never the client.
    // - The code must be entitled to this authenticated user.
    // - Role: superadmin → owner, user → member. No promotion/demotion of an
    //   existing membership. No ownership claim on an existing organisation.
    // - A code without a bound org falls through to the paths below unchanged.
    const boundOrganisation = betaCode
      ? await resolveBoundOrganisationForCode(
          betaCode,
          {
            id: user.id,
            email: user.email ?? null,
          },
          supabase,
        )
      : null;

    if (boundOrganisation) {
      const organisation = await resolveOrganisation(
        boundOrganisation.organisationId,
        supabase,
      );

      const existingMembership = await resolveActiveMembership(
        organisation.organisation_id,
        personId,
        supabase,
      );

      const invitedRole =
        boundOrganisation.betaType === 'superadmin'
            ? 'owner'
            : 'member';

      const membership =
        existingMembership ??
        (await createOrganisationMembership(
          organisation.organisation_id,
          personId,
          invitedRole,
          new Date().toISOString(),
          supabase,
        ));

      const { data: ownership, error: ownershipError } = await supabase
        .from('ownership_periods')
        .select('ownership_period_id')
        .eq('organisation_id', organisation.organisation_id)
        .eq('person_id', personId)
        .eq('status', 'current')
        .limit(1)
        .maybeSingle();

      if (ownershipError) {
        console.error(
          '[identity/plan][POST:bound] ownership lookup failed:',
          ownershipError,
        );
        throw new Error('OWNERSHIP_LOOKUP_FAILED');
      }

      const betaEntitled = await applyBetaEntitlement(
        betaCode,
        {
          id: user.id,
          email: user.email ?? null,
        },
        organisation.organisation_id,
        supabase,
      );

      return NextResponse.json({
        ok: true,
        identity: {
          organisationId: organisation.organisation_id,
          organisationName: organisation.legal_name,
          personId,
          membershipId: membership.membership_id,
          role: membership.role,
          isOwner: Boolean(ownership),
        },
        betaCode: betaCode || undefined,
        betaEntitled,
        boundOrganisation: true,
      });
    }

    // -----------------------------------------------------------------------
    // 3. EXISTING ORGANISATION PATH
    // -----------------------------------------------------------------------
    if (submittedOrganisationId) {
      const organisation = await resolveOrganisation(
        submittedOrganisationId,
        supabase,
      );

      const membership = await resolveActiveMembership(
        organisation.organisation_id,
        personId,
        supabase,
      );

      if (!membership) {
        // isOwner is intentionally ignored here. A client cannot self-promote
        // into an existing organisation.
        return NextResponse.json(
          {
            error: 'You are not a member of that organisation',
            code: 'NOT_ORGANISATION_MEMBER',
          },
          { status: 403 },
        );
      }

      const { data: ownership, error: ownershipError } = await supabase
        .from('ownership_periods')
        .select('ownership_period_id')
        .eq('organisation_id', organisation.organisation_id)
        .eq('person_id', personId)
        .eq('status', 'current')
        .limit(1)
        .maybeSingle();

      if (ownershipError) {
        console.error(
          '[identity/plan][POST] existing organisation ownership lookup failed:',
          ownershipError,
        );
        throw new Error('OWNERSHIP_LOOKUP_FAILED');
      }

      // Beta is entitlement only. It is evaluated after the organisation is
      // already canonically established and cannot modify membership/role.
      const betaEntitled = betaCode
        ? await applyBetaEntitlement(
            betaCode,
            {
              id: user.id,
              email: user.email ?? null,
            },
            organisation.organisation_id,
            supabase,
          )
        : false;

      return NextResponse.json({
        ok: true,
        identity: {
          organisationId: organisation.organisation_id,
          organisationName: organisation.legal_name,
          personId,
          membershipId: membership.membership_id,
          role: membership.role,
          isOwner: Boolean(ownership),
        },
        betaCode: betaCode || undefined,
        betaEntitled,
      });
    }

    // -----------------------------------------------------------------------
    // 4. NEW ORGANISATION PATH
    // -----------------------------------------------------------------------
    if (!organisationName) {
      return NextResponse.json(
        {
          error: 'Please enter your business name',
          code: 'ORGANISATION_NAME_REQUIRED',
        },
        { status: 400 },
      );
    }

    // betaCode is deliberately NOT consulted before this creation. It has no
    // authority over which organisation is created or selected.
    const { data: createdOrganisation, error: organisationError } =
      await supabase
        .from('organisations')
        .insert({
          legal_name: organisationName,
        })
        .select('organisation_id, legal_name')
        .single();

    if (organisationError || !createdOrganisation) {
      console.error(
        '[identity/plan][POST] organisation creation failed:',
        organisationError,
      );
      throw new Error('ORGANISATION_CREATE_FAILED');
    }

    const canonicalOrganisationId =
      createdOrganisation.organisation_id;
    const canonicalOrganisationName =
      createdOrganisation.legal_name;
    const now = new Date().toISOString();

    // Membership role is derived ONLY from the user's explicit ownership
    // declaration for this NEW organisation. Beta type does not change role.
    const membership = await createOrganisationMembership(
      canonicalOrganisationId,
      personId,
      isOwner ? 'owner' : 'member',
      now,
      supabase,
    );

    let isOwnerFinal = false;

    if (isOwner) {
      isOwnerFinal = await establishOwnership(
        canonicalOrganisationId,
        personId,
        now,
        supabase,
      );
    }

    // Beta entitlement is strictly downstream of canonical organisation
    // creation and membership establishment.
    const betaEntitled = betaCode
      ? await applyBetaEntitlement(
          betaCode,
          {
            id: user.id,
            email: user.email ?? null,
          },
          canonicalOrganisationId,
          supabase,
        )
      : false;

    return NextResponse.json({
      ok: true,
      identity: {
        organisationId: canonicalOrganisationId,
        organisationName: canonicalOrganisationName,
        personId,
        membershipId: membership.membership_id,
        role: membership.role,
        isOwner: isOwnerFinal,
      },
      betaCode: betaCode || undefined,
      betaEntitled,
    });
  } catch (error) {
    console.error('[identity/plan][POST] unexpected error:', error);

    const response = identityErrorResponse(error, 'POST');

    // identityErrorResponse cannot know this code until it is generated above;
    // handle it explicitly here without changing the canonical semantics.
    if (
      error instanceof Error &&
      error.message === 'ORGANISATION_CREATE_FAILED'
    ) {
      return NextResponse.json(
        {
          error: 'Unable to create organisation',
          code: 'ORGANISATION_CREATE_FAILED',
        },
        { status: 500 },
      );
    }

    if (
      error instanceof Error &&
      error.message === 'NOT_ORGANISATION_MEMBER'
    ) {
      return NextResponse.json(
        {
          error: 'You are not a member of that organisation',
          code: 'NOT_ORGANISATION_MEMBER',
        },
        { status: 403 },
      );
    }

    return response;
  }
}


