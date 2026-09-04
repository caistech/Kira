// app/api/identity/plan/route.ts
//
// CANONICAL IDENTITY BOUNDARY
// ---------------------------
//
// /plan is the single convergence point for application identity.
//
// Canonical identity chain:
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
// INVARIANTS:
//
// - Supabase Auth user.id is NOT a Person ID.
// - persons.auth_user_id is NOT used.
// - auth_credentials is the ONLY Auth → Person bridge.
// - An existing non-null auth_credentials.person_id is IMMUTABLE here.
// - Client-supplied organisationId is NEVER authority.
// - Existing organisation access requires canonical active membership.
// - isOwner NEVER grants access to an existing organisation.
// - Ownership is separate from membership.
// - Ownership is temporal.
// - No organisation is inferred from email.
// - Email may only be used to recover a Person when no Auth → Person
//   credential exists.
// - No identity relationship is silently rebound.
//

import { NextResponse } from 'next/server';
import {
  getCurrentOrganisationContext,
  getAuthUser,
} from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

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
  email?: string | null;
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

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseName(value: unknown): string {
  return normaliseString(value).replace(/\s+/g, ' ');
}

/**
 * Resolve the canonical Person for the authenticated Supabase user.
 *
 * AUTHORITY:
 *
 *   Supabase Auth user.id
 *          ↓
 *   auth_credentials.auth_user_id
 *          ↓
 *   auth_credentials.person_id
 *          ↓
 *   persons.person_id
 *
 * This function NEVER queries persons.auth_user_id.
 *
 * IMPORTANT:
 * An existing credential with a non-null person_id is authoritative and
 * MUST NOT be rebound to another Person by this endpoint.
 */
async function resolvePersonFromAuth(
  userId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalPerson | null> {
  const {
    data: credential,
    error: credentialError,
  } = await supabase
    .from('auth_credentials')
    .select(
      'auth_credential_id, person_id, status',
    )
    .eq('auth_user_id', userId)
    .limit(1)
    .maybeSingle();

  if (credentialError) {
    console.error(
      '[identity/plan] auth credential lookup failed:',
      credentialError,
    );

    throw new Error('AUTH_CREDENTIAL_LOOKUP_FAILED');
  }

  if (!credential?.person_id) {
    return null;
  }

  const {
    data: person,
    error: personError,
  } = await supabase
    .from('persons')
    .select(
      'person_id, first_name, last_name, email',
    )
    .eq('person_id', credential.person_id)
    .maybeSingle();

  if (personError) {
    console.error(
      '[identity/plan] person lookup failed:',
      personError,
    );

    throw new Error('PERSON_LOOKUP_FAILED');
  }

  if (!person) {
    console.error(
      '[identity/plan] auth credential points to missing person:',
      credential.person_id,
    );

    throw new Error('PERSON_NOT_FOUND');
  }

  return person;
}

/**
 * Resolve the Auth → Person credential without filtering by status.
 *
 * Status is NOT part of identity lookup authority.
 *
 * A credential can be inactive and still represent the canonical
 * Auth → Person relationship. In that case it may be reactivated,
 * but its person_id must never be changed.
 */
async function getAuthCredential(
  userId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalCredential | null> {
  const {
    data: credential,
    error,
  } = await supabase
    .from('auth_credentials')
    .select(
      'auth_credential_id, person_id, status',
    )
    .eq('auth_user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '[identity/plan] auth credential lookup failed:',
      error,
    );

    throw new Error('AUTH_CREDENTIAL_LOOKUP_FAILED');
  }

  return credential;
}

/**
 * Recover an existing Person by email.
 *
 * This is ONLY a Person recovery mechanism.
 *
 * It does NOT establish organisation authority.
 * It does NOT establish membership.
 * It does NOT establish ownership.
 */
async function findPersonByEmail(
  email: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalPerson | null> {
  const {
    data: person,
    error,
  } = await supabase
    .from('persons')
    .select(
      'person_id, first_name, last_name, email',
    )
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '[identity/plan] person email lookup failed:',
      error,
    );

    throw new Error('PERSON_LOOKUP_FAILED');
  }

  return person;
}

/**
 * Establish the canonical Auth → Person relationship.
 *
 * Rules:
 *
 * 1. Existing credential + non-null person_id:
 *      - MUST remain attached to that Person.
 *      - It may only be reactivated.
 *
 * 2. Existing credential + null person_id:
 *      - This is an incomplete/corrupt canonical bridge.
 *      - We establish the missing Person link only.
 *
 * 3. No credential:
 *      - Create one pointing to the resolved Person.
 *
 * NEVER:
 *
 *   existing person A → person B
 *
 * This function will never perform that rebinding.
 */
async function establishAuthCredential(
  userId: string,
  personId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<void> {
  const credential = await getAuthCredential(
    userId,
    supabase,
  );

  if (!credential) {
    const {
      error: createCredentialError,
    } = await supabase
      .from('auth_credentials')
      .insert({
        auth_user_id: userId,
        person_id: personId,
        status: 'active',
      });

    if (createCredentialError) {
      console.error(
        '[identity/plan] auth credential creation failed:',
        createCredentialError,
      );

      throw new Error(
        'AUTH_CREDENTIAL_CREATE_FAILED',
      );
    }

    return;
  }

  // Existing credential already has a canonical Person.
  if (credential.person_id) {
    if (credential.person_id !== personId) {
      console.error(
        '[identity/plan] auth credential/person mismatch:',
        {
          authUserId: userId,
          credentialPersonId: credential.person_id,
          resolvedPersonId: personId,
        },
      );

      throw new Error(
        'AUTH_CREDENTIAL_PERSON_MISMATCH',
      );
    }

    // Reactivation is allowed.
    // Rebinding is not.
    if (credential.status !== 'active') {
      const {
        error: credentialRepairError,
      } = await supabase
        .from('auth_credentials')
        .update({
          status: 'active',
        })
        .eq(
          'auth_credential_id',
          credential.auth_credential_id,
        );

      if (credentialRepairError) {
        console.error(
          '[identity/plan] auth credential reactivation failed:',
          credentialRepairError,
        );

        throw new Error(
          'AUTH_CREDENTIAL_UPDATE_FAILED',
        );
      }
    }

    return;
  }

  // Existing credential has no Person attached.
  //
  // This is the only situation where an existing credential's person_id
  // may be populated by this endpoint. We are completing an incomplete
  // bridge, not rebinding an established identity.
  const {
    error: credentialRepairError,
  } = await supabase
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

  if (credentialRepairError) {
    console.error(
      '[identity/plan] incomplete auth credential repair failed:',
      credentialRepairError,
    );

    throw new Error(
      'AUTH_CREDENTIAL_UPDATE_FAILED',
    );
  }

  // Re-read after repair to ensure the canonical relationship is actually
  // the one we expect. This also protects against a concurrent change.
  const repairedCredential =
    await getAuthCredential(
      userId,
      supabase,
    );

  if (
    !repairedCredential ||
    repairedCredential.person_id !== personId
  ) {
    console.error(
      '[identity/plan] auth credential repair verification failed:',
      {
        authUserId: userId,
        expectedPersonId: personId,
        actualPersonId:
          repairedCredential?.person_id ?? null,
      },
    );

    throw new Error(
      'AUTH_CREDENTIAL_PERSON_MISMATCH',
    );
  }

  if (repairedCredential.status !== 'active') {
    throw new Error(
      'AUTH_CREDENTIAL_UPDATE_FAILED',
    );
  }
}

/**
 * Resolve or create the canonical Person.
 *
 * Resolution order:
 *
 *   1. Existing auth_credentials.person_id
 *   2. Existing Person by authenticated email
 *   3. New Person
 *
 * Email never establishes organisation authority.
 */
async function resolveOrCreatePerson(
  user: {
    id: string;
    email?: string | null;
  },
  firstName: string,
  lastName: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<string> {
  const credential =
    await getAuthCredential(
      user.id,
      supabase,
    );

  // ---------------------------------------------------------------------------
  // EXISTING AUTH → PERSON BRIDGE
  // ---------------------------------------------------------------------------

  if (credential?.person_id) {
    // The credential is authoritative.
    //
    // Do not search by email.
    // Do not create another Person.
    // Do not change person_id.
    const personId = credential.person_id;

    const {
      data: person,
      error: personError,
    } = await supabase
      .from('persons')
      .select('person_id')
      .eq('person_id', personId)
      .maybeSingle();

    if (personError) {
      console.error(
        '[identity/plan] canonical person verification failed:',
        personError,
      );

      throw new Error(
        'PERSON_LOOKUP_FAILED',
      );
    }

    if (!person) {
      console.error(
        '[identity/plan] credential references missing Person:',
        personId,
      );

      throw new Error('PERSON_NOT_FOUND');
    }

    await establishAuthCredential(
      user.id,
      personId,
      supabase,
    );

    return personId;
  }

  // ---------------------------------------------------------------------------
  // NO ESTABLISHED AUTH → PERSON BRIDGE
  // ---------------------------------------------------------------------------

  let person: CanonicalPerson | null = null;

  if (user.email) {
    person = await findPersonByEmail(
      user.email,
      supabase,
    );
  }

  // ---------------------------------------------------------------------------
  // EXISTING PERSON RECOVERED BY EMAIL
  // ---------------------------------------------------------------------------

  if (person) {
    const personId = person.person_id;

    await establishAuthCredential(
      user.id,
      personId,
      supabase,
    );

    return personId;
  }

  // ---------------------------------------------------------------------------
  // CREATE NEW PERSON
  // ---------------------------------------------------------------------------

  const {
    data: createdPerson,
    error: createPersonError,
  } = await supabase
    .from('persons')
    .insert({
      email: user.email ?? null,
      first_name: firstName,
      last_name: lastName,
    })
    .select(
      'person_id, first_name, last_name, email',
    )
    .single();

  if (createPersonError || !createdPerson) {
    console.error(
      '[identity/plan] person creation failed:',
      createPersonError,
    );

    throw new Error('PERSON_CREATE_FAILED');
  }

  const personId = createdPerson.person_id;

  try {
    await establishAuthCredential(
      user.id,
      personId,
      supabase,
    );
  } catch (error) {
    // Do not leave an apparently usable Person silently detached from
    // the authenticated identity.
    //
    // We deliberately do not attempt to delete the Person here because
    // deletion may violate FK/history semantics. The failure is surfaced
    // and must be handled by the caller/transaction boundary.
    throw error;
  }

  return personId;
}

/**
 * Update the authenticated Person's profile fields.
 *
 * This does NOT alter any identity relationship.
 */
async function updatePerson(
  personId: string,
  firstName: string,
  lastName: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<void> {
  const {
    error,
  } = await supabase
    .from('persons')
    .update({
      first_name: firstName,
      last_name: lastName,
    })
    .eq('person_id', personId);

  if (error) {
    console.error(
      '[identity/plan] person update failed:',
      error,
    );

    throw new Error('PERSON_UPDATE_FAILED');
  }
}

/**
 * Resolve an organisation by its canonical ID.
 */
async function resolveOrganisation(
  organisationId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
) {
  const {
    data: organisation,
    error,
  } = await supabase
    .from('organisations')
    .select(
      'organisation_id, name',
    )
    .eq(
      'organisation_id',
      organisationId,
    )
    .maybeSingle();

  if (error) {
    console.error(
      '[identity/plan] organisation lookup failed:',
      error,
    );

    throw new Error(
      'ORGANISATION_LOOKUP_FAILED',
    );
  }

  if (!organisation) {
    throw new Error(
      'ORGANISATION_NOT_FOUND',
    );
  }

  return organisation;
}

/**
 * Resolve the Person's current active membership in an organisation.
 *
 * Membership is canonical organisation authority.
 *
 * No membership = no authority.
 */
async function resolveActiveMembership(
  organisationId: string,
  personId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalMembership | null> {
  const {
    data: membership,
    error,
  } = await supabase
    .from('organisation_memberships')
    .select(
      `
        membership_id,
        organisation_id,
        person_id,
        role,
        status
      `,
    )
    .eq(
      'organisation_id',
      organisationId,
    )
    .eq(
      'person_id',
      personId,
    )
    .eq(
      'status',
      'active',
    )
    .or(
      'valid_to.is.null,valid_to.gt.now()',
    )
    .order(
      'valid_from',
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '[identity/plan] membership lookup failed:',
      error,
    );

    throw new Error(
      'MEMBERSHIP_LOOKUP_FAILED',
    );
  }

  return membership;
}

/**
 * Create membership for a newly-created organisation.
 *
 * This function is ONLY used for the new-organisation path.
 *
 * Existing organisation membership is never upserted here.
 */
async function createOrganisationMembership(
  organisationId: string,
  personId: string,
  role: 'owner' | 'member',
  validFrom: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalMembership> {
  const {
    data: membership,
    error,
  } = await supabase
    .from('organisation_memberships')
    .insert({
      organisation_id: organisationId,
      person_id: personId,
      role,
      status: 'active',
      valid_from: validFrom,
    })
    .select(
      `
        membership_id,
        organisation_id,
        person_id,
        role,
        status
      `,
    )
    .single();

  if (error || !membership) {
    console.error(
      '[identity/plan] membership creation failed:',
      error,
    );

    throw new Error(
      'MEMBERSHIP_CREATE_FAILED',
    );
  }

  return membership;
}

/**
 * Resolve or create current ownership.
 *
 * Ownership is separate from membership.
 *
 * IMPORTANT:
 * This is only called when the user is establishing a NEW organisation
 * and has explicitly declared themselves owner.
 */
async function establishOwnership(
  organisationId: string,
  personId: string,
  validFrom: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<void> {
  const {
    data: existingOwnership,
    error: ownershipLookupError,
  } = await supabase
    .from('ownership_periods')
    .select('ownership_id')
    .eq(
      'organisation_id',
      organisationId,
    )
    .eq(
      'person_id',
      personId,
    )
    .eq(
      'status',
      'current',
    )
    .limit(1)
    .maybeSingle();

  if (ownershipLookupError) {
    console.error(
      '[identity/plan] ownership lookup failed:',
      ownershipLookupError,
    );

    throw new Error(
      'OWNERSHIP_LOOKUP_FAILED',
    );
  }

  if (existingOwnership) {
    return;
  }

  const {
    error: ownershipError,
  } = await supabase
    .from('ownership_periods')
    .insert({
      organisation_id: organisationId,
      person_id: personId,
      status: 'current',
      valid_from: validFrom,
    });

  if (ownershipError) {
    console.error(
      '[identity/plan] ownership creation failed:',
      ownershipError,
    );

    throw new Error(
      'OWNERSHIP_CLAIM_FAILED',
    );
  }
}

/**
 * GET /api/identity/plan
 *
 * Returns canonical identity state.
 *
 * Anonymous:
 *   signedIn = false
 *
 * Authenticated without a Person:
 *   signedIn = true
 *   personId = null
 *
 * Authenticated Person without organisation:
 *   signedIn = true
 *   personId = resolved Person
 *   organisationId = null
 *
 * Authenticated Person with organisation:
 *   complete canonical identity is returned.
 */
export async function GET() {
  try {
    // =========================================================================
    // 1. AUTHENTICATE
    // =========================================================================

    const user = await getAuthUser();

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
      });
    }

    const supabase = createServiceClientV2();

    // =========================================================================
    // 2. RESOLVE CANONICAL PERSON FIRST
    // =========================================================================
    //
    // Organisation context must never be allowed to establish Person
    // identity. The Auth → Person bridge is resolved independently first.
    // =========================================================================

    let person: CanonicalPerson | null;

    try {
      person = await resolvePersonFromAuth(
        user.id,
        supabase,
      );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : 'IDENTITY_RESOLUTION_FAILED';

      switch (code) {
        case 'AUTH_CREDENTIAL_LOOKUP_FAILED':
          return NextResponse.json(
            {
              error:
                'Unable to resolve authenticated identity',
              code,
            },
            { status: 500 },
          );

        case 'PERSON_LOOKUP_FAILED':
          return NextResponse.json(
            {
              error:
                'Unable to resolve person identity',
              code,
            },
            { status: 500 },
          );

        case 'PERSON_NOT_FOUND':
          return NextResponse.json(
            {
              error:
                'Authenticated identity references a missing person',
              code,
            },
            { status: 500 },
          );

        default:
          return NextResponse.json(
            {
              error:
                'Unable to resolve organisational identity',
              code,
            },
            { status: 500 },
          );
      }
    }

    // =========================================================================
    // 3. NO ESTABLISHED PERSON
    // =========================================================================

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
      });
    }

    // =========================================================================
    // 4. RESOLVE CURRENT ORGANISATION CONTEXT
    // =========================================================================

    const ctx =
      await getCurrentOrganisationContext();

    if (!ctx) {
      return NextResponse.json({
        ok: true,
        signedIn: true,
        firstName:
          person.first_name ?? null,
        lastName:
          person.last_name ?? null,
        organisationId: null,
        organisationName: null,
        isOwner: false,
        personId: person.person_id,
      });
    }

    // =========================================================================
    // 5. SECURITY CHECK — CONTEXT PERSON MUST MATCH AUTH PERSON
    // =========================================================================

    if (ctx.personId !== person.person_id) {
      console.error(
        '[identity/plan][GET] organisation context/person mismatch:',
        {
          authPersonId: person.person_id,
          contextPersonId: ctx.personId,
          organisationId: ctx.organisationId,
        },
      );

      return NextResponse.json(
        {
          error:
            'Organisation context does not match authenticated identity',
          code:
            'ORGANISATION_CONTEXT_PERSON_MISMATCH',
        },
        { status: 403 },
      );
    }

    // =========================================================================
    // 6. RESOLVE ORGANISATION
    // =========================================================================

    let organisation;

    try {
      organisation =
        await resolveOrganisation(
          ctx.organisationId,
          supabase,
        );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : 'ORGANISATION_LOOKUP_FAILED';

      if (code === 'ORGANISATION_NOT_FOUND') {
        return NextResponse.json(
          {
            error: 'Organisation not found',
            code,
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          error:
            'Unable to resolve organisation',
          code,
        },
        { status: 500 },
      );
    }

    // =========================================================================
    // 7. VERIFY CANONICAL MEMBERSHIP
    // =========================================================================

    let membership;

    try {
      membership =
        await resolveActiveMembership(
          organisation.organisation_id,
          person.person_id,
          supabase,
        );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : 'MEMBERSHIP_LOOKUP_FAILED';

      return NextResponse.json(
        {
          error:
            'Unable to verify organisation membership',
          code,
        },
        { status: 500 },
      );
    }

    if (!membership) {
      console.error(
        '[identity/plan][GET] context has no canonical active membership:',
        {
          organisationId:
            organisation.organisation_id,
          personId: person.person_id,
        },
      );

      return NextResponse.json(
        {
          error:
            'Authenticated identity is not an active member of the organisation',
          code:
            'NOT_ORGANISATION_MEMBER',
        },
        { status: 403 },
      );
    }

    // =========================================================================
    // 8. RESOLVE OWNERSHIP
    // =========================================================================

    const {
      data: ownership,
      error: ownershipError,
    } = await supabase
      .from('ownership_periods')
      .select('ownership_id')
      .eq(
        'organisation_id',
        organisation.organisation_id,
      )
      .eq(
        'person_id',
        person.person_id,
      )
      .eq(
        'status',
        'current',
      )
      .limit(1)
      .maybeSingle();

    if (ownershipError) {
      console.error(
        '[identity/plan][GET] ownership lookup failed:',
        ownershipError,
      );

      return NextResponse.json(
        {
          error:
            'Unable to resolve ownership',
          code:
            'OWNERSHIP_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    // =========================================================================
    // 9. RETURN CANONICAL IDENTITY
    // =========================================================================

    return NextResponse.json({
      ok: true,
      signedIn: true,

      firstName:
        person.first_name ?? null,

      lastName:
        person.last_name ?? null,

      organisationId:
        organisation.organisation_id,

      organisationName:
        organisation.name ?? null,

      isOwner:
        Boolean(ownership),

      personId:
        person.person_id,

      membershipId:
        membership.membership_id,

      role:
        membership.role,
    });
  } catch (error) {
    console.error(
      '[identity/plan][GET] unexpected error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Unable to resolve organisational identity',
        code:
          'IDENTITY_RESOLUTION_FAILED',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/identity/plan
 *
 * Canonical identity-establishment boundary.
 *
 * EXISTING ORGANISATION:
 *
 *   organisationId supplied
 *        ↓
 *   organisation must exist
 *        ↓
 *   authenticated Person must already be an active member
 *        ↓
 *   existing membership is returned unchanged
 *
 * NEW ORGANISATION:
 *
 *   no organisationId
 *        ↓
 *   organisation created
 *        ↓
 *   Person becomes member
 *        ↓
 *   if isOwner === true:
 *        ownership_period created
 *
 * IMPORTANT:
 *
 * Client-supplied organisationId is NEVER authority.
 *
 * Client-supplied isOwner is NEVER sufficient to obtain authority
 * over an existing organisation.
 */
export async function POST(
  request: Request,
) {
  try {
    // =========================================================================
    // 1. AUTHENTICATE
    // =========================================================================

    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorised',
          code:
            'NO_AUTHENTICATED_USER',
        },
        { status: 401 },
      );
    }

    const supabase =
      createServiceClientV2();

    // =========================================================================
    // 2. READ REQUEST
    // =========================================================================

    let body: PlanRequestBody;

    try {
      body =
        (await request.json()) as PlanRequestBody;
    } catch {
      return NextResponse.json(
        {
          error:
            'Invalid JSON body',
          code:
            'INVALID_JSON',
        },
        { status: 400 },
      );
    }

    const firstName =
      normaliseName(
        body.firstName,
      );

    const lastName =
      normaliseName(
        body.lastName,
      );

    const submittedOrganisationId =
      normaliseString(
        body.organisationId,
      );

    const organisationName =
      normaliseName(
        body.organisationName,
      );

    const betaCode =
      normaliseString(
        body.betaCode,
      );

    const isOwner =
      typeof body.isOwner === 'boolean'
        ? body.isOwner
        : false;

    // =========================================================================
    // 3. VALIDATE PERSON DATA
    // =========================================================================

    if (!firstName) {
      return NextResponse.json(
        {
          error:
            'Please enter your first name.',
          code:
            'FIRST_NAME_REQUIRED',
        },
        { status: 400 },
      );
    }

    if (!lastName) {
      return NextResponse.json(
        {
          error:
            'Please enter your last name.',
          code:
            'LAST_NAME_REQUIRED',
        },
        { status: 400 },
      );
    }

    // =========================================================================
    // 4. RESOLVE / CREATE CANONICAL PERSON
    // =========================================================================

    let personId: string;

    try {
      personId =
        await resolveOrCreatePerson(
          {
            id: user.id,
            email:
              user.email ?? null,
          },
          firstName,
          lastName,
          supabase,
        );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : 'IDENTITY_RESOLUTION_FAILED';

      switch (code) {
        case 'AUTH_CREDENTIAL_LOOKUP_FAILED':
          return NextResponse.json(
            {
              error:
                'Unable to resolve authenticated identity',
              code,
            },
            { status: 500 },
          );

        case 'AUTH_CREDENTIAL_PERSON_MISMATCH':
          return NextResponse.json(
            {
              error:
                'Authenticated identity is already linked to a different person',
              code,
            },
            { status: 409 },
          );

        case 'AUTH_CREDENTIAL_CREATE_FAILED':
          return NextResponse.json(
            {
              error:
                'Unable to establish authenticated identity',
              code,
            },
            { status: 500 },
          );

        case 'AUTH_CREDENTIAL_UPDATE_FAILED':
          return NextResponse.json(
            {
              error:
                'Unable to establish authenticated identity',
              code,
            },
            { status: 500 },
          );

        case 'PERSON_LOOKUP_FAILED':
          return NextResponse.json(
            {
              error:
                'Unable to resolve person identity',
              code,
            },
            { status: 500 },
          );

        case 'PERSON_NOT_FOUND':
          return NextResponse.json(
            {
              error:
                'Authenticated identity references a missing person',
              code,
            },
            { status: 500 },
          );

        case 'PERSON_CREATE_FAILED':
          return NextResponse.json(
            {
              error:
                'Unable to create person identity',
              code,
            },
            { status: 500 },
          );

        default:
          return NextResponse.json(
            {
              error:
                'Unable to resolve authenticated identity',
              code,
            },
            { status: 500 },
          );
      }
    }

    // =========================================================================
    // 5. UPDATE PERSON PROFILE
    // =========================================================================

    try {
      await updatePerson(
        personId,
        firstName,
        lastName,
        supabase,
      );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : 'PERSON_UPDATE_FAILED';

      return NextResponse.json(
        {
          error:
            'Unable to save person identity',
          code,
        },
        { status: 500 },
      );
    }

    // =========================================================================
    // 6. EXISTING ORGANISATION PATH
    // =========================================================================
    //
    // This path is intentionally NOT an upsert.
    //
    // The caller must already possess canonical membership.
    //
    // isOwner is deliberately ignored for authority purposes here.
    // A client cannot promote itself merely by posting isOwner=true.
    // =========================================================================

    if (submittedOrganisationId) {
      let organisation;

      try {
        organisation =
          await resolveOrganisation(
            submittedOrganisationId,
            supabase,
          );
      } catch (error) {
        const code =
          error instanceof Error
            ? error.message
            : 'ORGANISATION_LOOKUP_FAILED';

        if (
          code ===
          'ORGANISATION_NOT_FOUND'
        ) {
          return NextResponse.json(
            {
              error:
                'Organisation not found',
              code,
            },
            { status: 404 },
          );
        }

        return NextResponse.json(
          {
            error:
              'Unable to resolve organisation',
            code,
          },
          { status: 500 },
        );
      }

      let membership:
        | CanonicalMembership
        | null;

      try {
        membership =
          await resolveActiveMembership(
            organisation.organisation_id,
            personId,
            supabase,
          );
      } catch (error) {
        const code =
          error instanceof Error
            ? error.message
            : 'MEMBERSHIP_LOOKUP_FAILED';

        return NextResponse.json(
          {
            error:
              'Unable to verify organisation membership',
            code,
          },
          { status: 500 },
        );
      }

      if (!membership) {
        return NextResponse.json(
          {
            error:
              'You are not a member of that organisation',
            code:
              'NOT_ORGANISATION_MEMBER',
          },
          { status: 403 },
        );
      }

      // Existing membership is authoritative.
      //
      // Do NOT:
      // - change role
      // - change valid_from
      // - create another membership
      // - create ownership because client says isOwner=true
      //
      // The endpoint is an identity-establishment boundary, not an
      // authorisation escalation endpoint.

      const {
        data: ownership,
        error: ownershipError,
      } = await supabase
        .from('ownership_periods')
        .select('ownership_id')
        .eq(
          'organisation_id',
          organisation.organisation_id,
        )
        .eq(
          'person_id',
          personId,
        )
        .eq(
          'status',
          'current',
        )
        .limit(1)
        .maybeSingle();

      if (ownershipError) {
        console.error(
          '[identity/plan][POST] existing organisation ownership lookup failed:',
          ownershipError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to resolve ownership',
            code:
              'OWNERSHIP_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,

        identity: {
          organisationId:
            organisation.organisation_id,

          organisationName:
            organisation.name ?? null,

          personId,

          membershipId:
            membership.membership_id,

          role:
            membership.role,

          isOwner:
            Boolean(ownership),
        },

        betaCode:
          betaCode || undefined,
      });
    }

    // =========================================================================
    // 7. NEW ORGANISATION PATH
    // =========================================================================

    if (!organisationName) {
      return NextResponse.json(
        {
          error:
            'Please enter your business name',
          code:
            'ORGANISATION_NAME_REQUIRED',
        },
        { status: 400 },
      );
    }

    const {
      data: createdOrganisation,
      error: createOrganisationError,
    } = await supabase
      .from('organisations')
      .insert({
        name: organisationName,
      })
      .select(
        'organisation_id, name',
      )
      .single();

    if (
      createOrganisationError ||
      !createdOrganisation
    ) {
      console.error(
        '[identity/plan][POST] organisation creation failed:',
        createOrganisationError,
      );

      return NextResponse.json(
        {
          error:
            'Unable to create organisation',
          code:
            'ORGANISATION_CREATE_FAILED',
        },
        { status: 500 },
      );
    }

    const canonicalOrganisationId =
      createdOrganisation.organisation_id;

    const canonicalOrganisationName =
      createdOrganisation.name ?? null;

    const now =
      new Date().toISOString();

    // =========================================================================
    // 8. CREATE MEMBERSHIP FOR NEW ORGANISATION
    // =========================================================================

    let membership:
      CanonicalMembership;

    try {
      membership =
        await createOrganisationMembership(
          canonicalOrganisationId,
          personId,
          isOwner
            ? 'owner'
            : 'member',
          now,
          supabase,
        );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : 'MEMBERSHIP_CREATE_FAILED';

      return NextResponse.json(
        {
          error:
            'Unable to establish organisation membership',
          code,
        },
        { status: 500 },
      );
    }

    // =========================================================================
    // 9. ESTABLISH OWNERSHIP
    // =========================================================================
    //
    // Ownership is separate from membership.
    //
    // It is created ONLY for a newly-created organisation and ONLY when
    // the caller declared themselves owner.
    // =========================================================================

    if (isOwner) {
      try {
        await establishOwnership(
          canonicalOrganisationId,
          personId,
          now,
          supabase,
        );
      } catch (error) {
        const code =
          error instanceof Error
            ? error.message
            : 'OWNERSHIP_CLAIM_FAILED';

        if (
          code ===
          'OWNERSHIP_LOOKUP_FAILED'
        ) {
          return NextResponse.json(
            {
              error:
                'Unable to verify ownership declaration',
              code,
            },
            { status: 500 },
          );
        }

        return NextResponse.json(
          {
            error:
              'Unable to save ownership declaration',
            code,
          },
          { status: 500 },
        );
      }
    }

    // =========================================================================
    // 10. RETURN CANONICAL IDENTITY
    // =========================================================================

    return NextResponse.json({
      ok: true,

      identity: {
        organisationId:
          canonicalOrganisationId,

        organisationName:
          canonicalOrganisationName,

        personId,

        membershipId:
          membership.membership_id,

        role:
          membership.role,

        isOwner:
          isOwner,
      },

      betaCode:
        betaCode || undefined,
    });
  } catch (error) {
    console.error(
      '[identity/plan][POST] unexpected error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Unable to save organisational identity',
        code:
          'IDENTITY_SAVE_FAILED',
      },
      { status: 500 },
    );
  }
}