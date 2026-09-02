import { NextResponse } from 'next/server';
import {
  getAuthUser,
  getCurrentOrganisationContext,
} from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PlanRequestBody = {
  firstName?: unknown;
  lastName?: unknown;

  /**
   * This is never authoritative.
   *
   * If supplied, it means:
   * "I believe I am already associated with this Organisation."
   *
   * The server must independently prove that relationship.
   */
  organisationId?: unknown;

  /**
   * Used only when establishing a new Organisation.
   */
  organisationName?: unknown;

  /**
   * Explicit Person assertion.
   *
   * This is not inferred from invitation, beta, email, membership,
   * subscription or arrival order.
   */
  isOwner?: unknown;

  /**
   * Provenance only.
   *
   * Beta redemption itself is handled by the beta flow.
   */
  betaCode?: unknown;
};

type IdentityResponse = {
  ok: true;
  signedIn: boolean;

  firstName: string | null;
  lastName: string | null;

  organisationId: string | null;
  organisationName: string | null;

  isOwner: boolean;

  personId: string | null;
  membershipId: string | null;
  role: string | null;
};

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseName(value: unknown): string {
  return normaliseString(value).replace(/\s+/g, ' ');
}

function emptyIdentityResponse(): IdentityResponse {
  return {
    ok: true,
    signedIn: false,

    firstName: null,
    lastName: null,

    organisationId: null,
    organisationName: null,

    isOwner: false,

    personId: null,
    membershipId: null,
    role: null,
  };
}

/**
 * Resolve the canonical Person for the authenticated Supabase user.
 *
 * Authority order:
 *
 *   auth_credentials
 *        ↓
 *   persons
 *
 * `persons.auth_user_id` and email are fallback mechanisms for recovering
 * Person identity only. They never establish Organisation authority.
 */
async function resolvePerson(
  supabase: ReturnType<typeof createServiceClientV2>,
  user: {
    id: string;
    email?: string | null;
  },
  firstName: string,
  lastName: string,
): Promise<
  | { ok: true; personId: string }
  | { ok: false; response: NextResponse }
> {
  // ---------------------------------------------------------------------------
  // 1. Canonical Auth → Person bridge
  // ---------------------------------------------------------------------------

  const { data: credential, error: credentialError } = await supabase
    .from('auth_credentials')
    .select('person_id')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (credentialError) {
    console.error(
      '[identity/plan] auth credential lookup failed:',
      credentialError,
    );

    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Unable to resolve authenticated identity',
          code: 'AUTH_CREDENTIAL_LOOKUP_FAILED',
        },
        { status: 500 },
      ),
    };
  }

  if (credential?.person_id) {
    return {
      ok: true,
      personId: credential.person_id,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Existing Person by auth_user_id
  //
  // Recovery only.
  // ---------------------------------------------------------------------------

  const { data: personByAuth, error: personAuthError } = await supabase
    .from('persons')
    .select('person_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (personAuthError) {
    console.error(
      '[identity/plan] person auth lookup failed:',
      personAuthError,
    );

    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Unable to resolve person identity',
          code: 'PERSON_LOOKUP_FAILED',
        },
        { status: 500 },
      ),
    };
  }

  if (personByAuth?.person_id) {
    return {
      ok: true,
      personId: personByAuth.person_id,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Existing Person by email
  //
  // Recovery only.
  //
  // Email is never used to establish Organisation authority.
  // ---------------------------------------------------------------------------

  if (user.email) {
    const { data: personByEmail, error: personEmailError } = await supabase
      .from('persons')
      .select('person_id')
      .ilike('email', user.email)
      .limit(1)
      .maybeSingle();

    if (personEmailError) {
      console.error(
        '[identity/plan] person email lookup failed:',
        personEmailError,
      );

      return {
        ok: false,
        response: NextResponse.json(
          {
            error: 'Unable to resolve person identity',
            code: 'PERSON_LOOKUP_FAILED',
          },
          { status: 500 },
        ),
      };
    }

    if (personByEmail?.person_id) {
      return {
        ok: true,
        personId: personByEmail.person_id,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Create Person
  // ---------------------------------------------------------------------------

  const { data: createdPerson, error: createPersonError } = await supabase
    .from('persons')
    .insert({
      auth_user_id: user.id,
      email: user.email ?? null,
      first_name: firstName,
      last_name: lastName,
    })
    .select('person_id')
    .single();

  if (createPersonError || !createdPerson) {
    console.error(
      '[identity/plan] person creation failed:',
      createPersonError,
    );

    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Unable to create person identity',
          code: 'PERSON_CREATE_FAILED',
        },
        { status: 500 },
      ),
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Establish canonical Auth → Person bridge
  // ---------------------------------------------------------------------------

  const { data: existingCredential, error: credentialRecheckError } =
    await supabase
      .from('auth_credentials')
      .select('auth_credential_id, person_id, status')
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle();

  if (credentialRecheckError) {
    console.error(
      '[identity/plan] auth credential re-check failed:',
      credentialRecheckError,
    );

    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Unable to establish authenticated identity',
          code: 'AUTH_CREDENTIAL_LOOKUP_FAILED',
        },
        { status: 500 },
      ),
    };
  }

  if (existingCredential) {
    if (
      existingCredential.person_id !== createdPerson.person_id ||
      existingCredential.status !== 'active'
    ) {
      const { error: repairError } = await supabase
        .from('auth_credentials')
        .update({
          person_id: createdPerson.person_id,
          status: 'active',
        })
        .eq(
          'auth_credential_id',
          existingCredential.auth_credential_id,
        );

      if (repairError) {
        console.error(
          '[identity/plan] auth credential repair failed:',
          repairError,
        );

        return {
          ok: false,
          response: NextResponse.json(
            {
              error: 'Unable to establish authenticated identity',
              code: 'AUTH_CREDENTIAL_UPDATE_FAILED',
            },
            { status: 500 },
          ),
        };
      }
    }
  } else {
    const { error: createCredentialError } = await supabase
      .from('auth_credentials')
      .insert({
        person_id: createdPerson.person_id,
        auth_user_id: user.id,
        status: 'active',
      });

    if (createCredentialError) {
      console.error(
        '[identity/plan] auth credential creation failed:',
        createCredentialError,
      );

      return {
        ok: false,
        response: NextResponse.json(
          {
            error: 'Unable to establish authenticated identity',
            code: 'AUTH_CREDENTIAL_CREATE_FAILED',
          },
          { status: 500 },
        ),
      };
    }
  }

  return {
    ok: true,
    personId: createdPerson.person_id,
  };
}

/**
 * GET /api/identity/plan
 *
 * Read-only canonical identity projection.
 *
 * Anonymous visitors receive an empty identity projection.
 *
 * Authenticated users without an Organisation are still valid /plan users.
 */
export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(emptyIdentityResponse());
    }

    const supabase = createServiceClientV2();

    const ctx = await getCurrentOrganisationContext();

    // -------------------------------------------------------------------------
    // Authenticated Person but no Organisation yet.
    // -------------------------------------------------------------------------

    if (!ctx) {
      const { data: credential, error: credentialError } = await supabase
        .from('auth_credentials')
        .select('person_id')
        .eq('auth_user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (credentialError) {
        console.error(
          '[identity/plan][GET] credential lookup failed:',
          credentialError,
        );

        return NextResponse.json(
          {
            error: 'Unable to resolve authenticated identity',
            code: 'AUTH_CREDENTIAL_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (!credential?.person_id) {
        return NextResponse.json({
          ok: true,
          signedIn: true,

          firstName: null,
          lastName: null,

          organisationId: null,
          organisationName: null,

          isOwner: false,

          personId: null,
          membershipId: null,
          role: null,
        });
      }

      const { data: person, error: personError } = await supabase
        .from('persons')
        .select('person_id, first_name, last_name')
        .eq('person_id', credential.person_id)
        .maybeSingle();

      if (personError) {
        console.error(
          '[identity/plan][GET] person lookup failed:',
          personError,
        );

        return NextResponse.json(
          {
            error: 'Unable to resolve person identity',
            code: 'PERSON_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        signedIn: true,

        firstName: person?.first_name ?? null,
        lastName: person?.last_name ?? null,

        organisationId: null,
        organisationName: null,

        isOwner: false,

        personId: person?.person_id ?? credential.person_id,
        membershipId: null,
        role: null,
      });
    }

    // -------------------------------------------------------------------------
    // Canonical Organisation context exists.
    // -------------------------------------------------------------------------

    const { data: organisation, error: organisationError } = await supabase
      .from('organisations')
      .select('organisation_id, name')
      .eq('organisation_id', ctx.organisationId)
      .maybeSingle();

    if (organisationError) {
      console.error(
        '[identity/plan][GET] organisation lookup failed:',
        organisationError,
      );

      return NextResponse.json(
        {
          error: 'Unable to resolve organisation',
          code: 'ORGANISATION_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    if (!organisation) {
      return NextResponse.json(
        {
          error: 'Organisation not found',
          code: 'ORGANISATION_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('person_id, first_name, last_name')
      .eq('person_id', ctx.personId)
      .maybeSingle();

    if (personError) {
      console.error(
        '[identity/plan][GET] person lookup failed:',
        personError,
      );

      return NextResponse.json(
        {
          error: 'Unable to resolve person identity',
          code: 'PERSON_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    const { data: ownership, error: ownershipError } = await supabase
      .from('ownership_periods')
      .select('ownership_period_id')
      .eq('organisation_id', ctx.organisationId)
      .eq('person_id', ctx.personId)
      .eq('status', 'current')
      .limit(1)
      .maybeSingle();

    if (ownershipError) {
      console.error(
        '[identity/plan][GET] ownership lookup failed:',
        ownershipError,
      );

      return NextResponse.json(
        {
          error: 'Unable to resolve ownership',
          code: 'OWNERSHIP_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      signedIn: true,

      firstName: person?.first_name ?? null,
      lastName: person?.last_name ?? null,

      organisationId: organisation.organisation_id,
      organisationName: organisation.name ?? null,

      isOwner: Boolean(ownership),

      personId: ctx.personId,
      membershipId: ctx.membershipId,
      role: ctx.role,
    });
  } catch (error) {
    console.error('[identity/plan][GET] unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Unable to resolve organisational identity',
        code: 'IDENTITY_RESOLUTION_FAILED',
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
 * IMPORTANT:
 *
 * This route authenticates the Person but does NOT require an existing
 * Organisation context.
 *
 * That distinction is what allows a newly authenticated person to establish
 * their first Organisation here.
 *
 * The resulting canonical Organisation is always determined server-side.
 */
export async function POST(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // 2. PARSE REQUEST
    // -------------------------------------------------------------------------

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

    const submittedOrganisationId =
      normaliseString(body.organisationId);

    const submittedOrganisationName =
      normaliseName(body.organisationName);

    const betaCode = normaliseString(body.betaCode);

    const isOwner =
      typeof body.isOwner === 'boolean'
        ? body.isOwner
        : false;

    // -------------------------------------------------------------------------
    // 3. VALIDATE PERSON INPUT
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // 4. RESOLVE CANONICAL PERSON
    // -------------------------------------------------------------------------

    const personResult = await resolvePerson(
      supabase,
      user,
      firstName,
      lastName,
    );

    if (!personResult.ok) {
      return personResult.response;
    }

    const personId = personResult.personId;

    // -------------------------------------------------------------------------
    // 5. UPDATE PERSON
    // -------------------------------------------------------------------------

    const { error: personUpdateError } = await supabase
      .from('persons')
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq('person_id', personId);

    if (personUpdateError) {
      console.error(
        '[identity/plan] person update failed:',
        personUpdateError,
      );

      return NextResponse.json(
        {
          error: 'Unable to save person identity',
          code: 'PERSON_UPDATE_FAILED',
        },
        { status: 500 },
      );
    }

    // -------------------------------------------------------------------------
    // 6. DETERMINE ORGANISATION PATH
    // -------------------------------------------------------------------------
    //
    // There are exactly two valid paths:
    //
    // A. Existing Organisation:
    //      submitted organisation ID
    //      ↓
    //      Organisation exists
    //      ↓
    //      Person already belongs to it
    //
    // B. New Organisation:
    //      no organisation ID
    //      ↓
    //      explicit organisation name
    //      ↓
    //      create Organisation
    //
    // The browser never gets to choose an Organisation merely by supplying
    // its UUID.
    // -------------------------------------------------------------------------

    let canonicalOrganisationId: string;
    let canonicalOrganisationName: string | null = null;

    let existingMembership:
      | {
          membership_id: string;
          organisation_id: string;
          person_id: string;
          role: string;
          status: string;
        }
      | null = null;

    if (submittedOrganisationId) {
      // -----------------------------------------------------------------------
      // EXISTING ORGANISATION
      // -----------------------------------------------------------------------

      const { data: organisation, error: organisationError } =
        await supabase
          .from('organisations')
          .select('organisation_id, name')
          .eq('organisation_id', submittedOrganisationId)
          .maybeSingle();

      if (organisationError) {
        console.error(
          '[identity/plan] organisation lookup failed:',
          organisationError,
        );

        return NextResponse.json(
          {
            error: 'Unable to resolve organisation',
            code: 'ORGANISATION_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (!organisation) {
        return NextResponse.json(
          {
            error: 'Organisation not found',
            code: 'ORGANISATION_NOT_FOUND',
          },
          { status: 404 },
        );
      }

      canonicalOrganisationId = organisation.organisation_id;
      canonicalOrganisationName = organisation.name ?? null;

      // -----------------------------------------------------------------------
      // Prove Person ↔ Organisation membership.
      // -----------------------------------------------------------------------

      const { data: membership, error: membershipLookupError } =
        await supabase
          .from('organisation_memberships')
          .select(
            'membership_id, organisation_id, person_id, role, status',
          )
          .eq('organisation_id', canonicalOrganisationId)
          .eq('person_id', personId)
          .eq('status', 'active')
          .or('valid_to.is.null,valid_to.gt.now()')
          .order('valid_from', { ascending: false })
          .limit(1)
          .maybeSingle();

      if (membershipLookupError) {
        console.error(
          '[identity/plan] membership lookup failed:',
          membershipLookupError,
        );

        return NextResponse.json(
          {
            error: 'Unable to verify organisation membership',
            code: 'MEMBERSHIP_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (!membership) {
        return NextResponse.json(
          {
            error: 'You are not a member of that organisation',
            code: 'NOT_ORGANISATION_MEMBER',
          },
          { status: 403 },
        );
      }

      existingMembership = membership;
    } else {
      // -----------------------------------------------------------------------
      // NEW ORGANISATION
      // -----------------------------------------------------------------------

      if (!submittedOrganisationName) {
        return NextResponse.json(
          {
            error: 'Please enter your business name.',
            code: 'ORGANISATION_NAME_REQUIRED',
          },
          { status: 400 },
        );
      }

      const { data: createdOrganisation, error: organisationError } =
        await supabase
          .from('organisations')
          .insert({
            name: submittedOrganisationName,
          })
          .select('organisation_id, name')
          .single();

      if (organisationError || !createdOrganisation) {
        console.error(
          '[identity/plan] organisation creation failed:',
          organisationError,
        );

        return NextResponse.json(
          {
            error: 'Unable to create organisation',
            code: 'ORGANISATION_CREATE_FAILED',
          },
          { status: 500 },
        );
      }

      canonicalOrganisationId =
        createdOrganisation.organisation_id;

      canonicalOrganisationName =
        createdOrganisation.name ?? null;
    }

    // -------------------------------------------------------------------------
    // 7. ESTABLISH / PRESERVE MEMBERSHIP
    // -------------------------------------------------------------------------
    //
    // Membership is distinct from ownership.
    //
    // For an existing organisation, preserve the existing role unless the
    // caller is explicitly establishing ownership.
    //
    // For a new organisation, the first membership is created as owner/member
    // according to the explicit assertion.
    // -------------------------------------------------------------------------

    const now = new Date().toISOString();

    let membershipId: string;
    let membershipRole: string;

    if (existingMembership) {
      membershipId = existingMembership.membership_id;
      membershipRole = existingMembership.role;

      /*
       * An existing member does not become an owner merely because the page
       * was submitted again without an ownership declaration.
       *
       * If they explicitly declare ownership, upgrade the membership role
       * only when that is the canonical role model already in use.
       */
      if (isOwner && existingMembership.role !== 'owner') {
        const { data: updatedMembership, error: membershipUpdateError } =
          await supabase
            .from('organisation_memberships')
            .update({
              role: 'owner',
            })
            .eq(
              'membership_id',
              existingMembership.membership_id,
            )
            .select(
              'membership_id, organisation_id, person_id, role, status',
            )
            .single();

        if (membershipUpdateError || !updatedMembership) {
          console.error(
            '[identity/plan] membership role update failed:',
            membershipUpdateError,
          );

          return NextResponse.json(
            {
              error: 'Unable to establish organisation membership',
              code: 'MEMBERSHIP_UPDATE_FAILED',
            },
            { status: 500 },
          );
        }

        membershipId = updatedMembership.membership_id;
        membershipRole = updatedMembership.role;
      }
    } else {
      const { data: membership, error: membershipError } =
        await supabase
          .from('organisation_memberships')
          .insert({
            organisation_id: canonicalOrganisationId,
            person_id: personId,
            role: isOwner ? 'owner' : 'member',
            status: 'active',
            valid_from: now,
          })
          .select(
            'membership_id, organisation_id, person_id, role, status',
          )
          .single();

      if (membershipError || !membership) {
        console.error(
          '[identity/plan] membership creation failed:',
          membershipError,
        );

        return NextResponse.json(
          {
            error: 'Unable to establish organisation membership',
            code: 'MEMBERSHIP_CREATE_FAILED',
          },
          { status: 500 },
        );
      }

      membershipId = membership.membership_id;
      membershipRole = membership.role;
    }

    // -------------------------------------------------------------------------
    // 8. ESTABLISH EXPLICIT OWNERSHIP
    // -------------------------------------------------------------------------
    //
    // Ownership is temporal and separate from membership.
    //
    // Never create duplicate current periods.
    // -------------------------------------------------------------------------

    if (isOwner) {
      const { data: currentOwnership, error: ownershipLookupError } =
        await supabase
          .from('ownership_periods')
          .select('ownership_period_id')
          .eq('organisation_id', canonicalOrganisationId)
          .eq('person_id', personId)
          .eq('status', 'current')
          .limit(1)
          .maybeSingle();

      if (ownershipLookupError) {
        console.error(
          '[identity/plan] ownership lookup failed:',
          ownershipLookupError,
        );

        return NextResponse.json(
          {
            error: 'Unable to verify ownership declaration',
            code: 'OWNERSHIP_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (!currentOwnership) {
        const { error: ownershipInsertError } = await supabase
          .from('ownership_periods')
          .insert({
            organisation_id: canonicalOrganisationId,
            person_id: personId,
            status: 'current',
            valid_from: now,
          });

        if (ownershipInsertError) {
          console.error(
            '[identity/plan] ownership claim failed:',
            ownershipInsertError,
          );

          return NextResponse.json(
            {
              error: 'Unable to save ownership declaration',
              code: 'OWNERSHIP_CLAIM_FAILED',
            },
            { status: 500 },
          );
        }
      }
    }

    // -------------------------------------------------------------------------
    // 9. RETURN CANONICAL RESULT
    // -------------------------------------------------------------------------

    /*
     * betaCode is deliberately returned as provenance only.
     *
     * It does not establish ownership.
     */
    return NextResponse.json({
      ok: true,

      identity: {
        organisationId: canonicalOrganisationId,
        organisationName: canonicalOrganisationName,

        personId,

        membershipId,
        role: membershipRole,
      },

      firstName,
      lastName,

      isOwner,

      betaCode: betaCode || undefined,
    });
  } catch (error) {
    console.error('[identity/plan][POST] unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Unable to save organisational identity',
        code: 'IDENTITY_SAVE_FAILED',
      },
      { status: 500 },
    );
  }
}