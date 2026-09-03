import { NextResponse } from 'next/server';

import {
  getAuthUser,
  getCurrentOrganisationContext,
} from '@/lib/auth';

import { createServiceClientV2 } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ============================================================================
// TYPES
// ============================================================================

type PlanRequestBody = {
  firstName?: unknown;
  lastName?: unknown;
  organisationId?: unknown;
  organisationName?: unknown;
  isOwner?: unknown;
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
  personId?: string | null;
  membershipId?: string | null;
  role?: string | null;
};

// ============================================================================
// NORMALISATION
// ============================================================================

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseName(value: unknown): string {
  return normaliseString(value).replace(/\s+/g, ' ');
}

// ============================================================================
// GET /api/identity/plan
// ============================================================================

/**
 * Resolve the current canonical identity state.
 *
 * Canonical authority:
 *
 *   Supabase Auth
 *        ↓
 *   auth_credentials
 *        ↓
 *   persons
 *        ↓
 *   organisation_memberships
 *        ↓
 *   organisations
 *
 * IMPORTANT:
 *
 * This route must never use persons.auth_user_id as an authentication
 * authority. That column may remain as historical/compatibility data,
 * but auth_credentials is the canonical Auth → Person bridge.
 *
 * An authenticated user without an organisation is a valid /plan state.
 */
export async function GET() {
  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION
    // -------------------------------------------------------------------------

    const user = await getAuthUser();

    if (!user) {
      const response: IdentityResponse = {
        ok: true,
        signedIn: false,
        firstName: null,
        lastName: null,
        organisationId: null,
        organisationName: null,
        isOwner: false,
      };

      return NextResponse.json(response);
    }

    const supabase = createServiceClientV2();

    // -------------------------------------------------------------------------
    // 2. RESOLVE CANONICAL ORGANISATION CONTEXT
    // -------------------------------------------------------------------------

    const ctx = await getCurrentOrganisationContext();

    // -------------------------------------------------------------------------
    // 3. AUTHENTICATED PERSON WITHOUT ACTIVE ORGANISATION
    // -------------------------------------------------------------------------

    if (!ctx) {
      /*
       * Resolve Person ONLY through auth_credentials.
       *
       * Do not fall back to:
       *
       *   persons.auth_user_id
       *   persons.email
       *
       * Doing so would reintroduce the identity ambiguity that the canonical
       * model is specifically designed to eliminate.
       */

      const {
        data: credential,
        error: credentialError,
      } = await supabase
        .from('auth_credentials')
        .select('person_id')
        .eq('auth_user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (credentialError) {
        console.error(
          '[identity/plan][GET] auth credential lookup failed:',
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
        /*
         * No canonical Person exists yet.
         *
         * This is intentionally not treated as an error. POST is the
         * identity-establishment boundary.
         */
        const response: IdentityResponse = {
          ok: true,
          signedIn: true,
          firstName: null,
          lastName: null,
          organisationId: null,
          organisationName: null,
          isOwner: false,
          personId: null,
        };

        return NextResponse.json(response);
      }

      const {
        data: person,
        error: personError,
      } = await supabase
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

      if (!person) {
        return NextResponse.json(
          {
            error: 'Canonical person not found',
            code: 'PERSON_NOT_FOUND',
          },
          { status: 500 },
        );
      }

      const response: IdentityResponse = {
        ok: true,
        signedIn: true,
        firstName: person.first_name ?? null,
        lastName: person.last_name ?? null,
        organisationId: null,
        organisationName: null,
        isOwner: false,
        personId: person.person_id,
      };

      return NextResponse.json(response);
    }

    // -------------------------------------------------------------------------
    // 4. RESOLVE ORGANISATION
    // -------------------------------------------------------------------------

    const {
      data: organisation,
      error: organisationError,
    } = await supabase
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

    // -------------------------------------------------------------------------
    // 5. RESOLVE PERSON
    // -------------------------------------------------------------------------

    const {
      data: person,
      error: personError,
    } = await supabase
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

    if (!person) {
      return NextResponse.json(
        {
          error: 'Canonical person not found',
          code: 'PERSON_NOT_FOUND',
        },
        { status: 500 },
      );
    }

    // -------------------------------------------------------------------------
    // 6. RESOLVE OWNERSHIP
    // -------------------------------------------------------------------------

    const {
      data: ownership,
      error: ownershipError,
    } = await supabase
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

    // -------------------------------------------------------------------------
    // 7. RETURN CANONICAL IDENTITY
    // -------------------------------------------------------------------------

    const response: IdentityResponse = {
      ok: true,
      signedIn: true,
      firstName: person.first_name ?? null,
      lastName: person.last_name ?? null,
      organisationId: organisation.organisation_id,
      organisationName: organisation.name ?? null,
      isOwner: Boolean(ownership),
      personId: ctx.personId,
      membershipId: ctx.membershipId,
      role: ctx.role,
    };

    return NextResponse.json(response);
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

// ============================================================================
// POST /api/identity/plan
// ============================================================================

/**
 * Establish the canonical Person / Organisation relationship required by
 * onboarding.
 *
 * Authority:
 *
 *   Supabase Auth
 *        ↓
 *   auth_credentials
 *        ↓
 *   persons
 *        ↓
 *   organisations
 *        ↓
 *   organisation_memberships
 *        ↓
 *   ownership_periods
 *
 * Rules:
 *
 * 1. Supabase Auth identifies the authenticated account.
 * 2. auth_credentials is the only canonical Auth → Person bridge.
 * 3. A submitted organisationId is never trusted as authority.
 * 4. An existing organisation may only be selected if the Person is already
 *    an active member of it.
 * 5. If no organisationId is supplied, a new Organisation is created.
 * 6. New membership is inserted explicitly; membership upsert() is avoided.
 * 7. Ownership is temporal and separate from membership.
 * 8. Existing membership role is never changed merely because /plan receives
 *    a different isOwner value.
 */
export async function POST(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATE
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
    // 2. READ REQUEST
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
    const submittedOrganisationId = normaliseString(
      body.organisationId,
    );
    const organisationName = normaliseName(
      body.organisationName,
    );

    /*
     * betaCode is deliberately not used for identity or authorisation here.
     *
     * If the beta pathway requires a gate, that should be enforced by the
     * beta-access layer rather than allowing a client-supplied string to
     * influence canonical identity.
     */
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

    // -------------------------------------------------------------------------
    // 3. RESOLVE CANONICAL PERSON THROUGH AUTH_CREDENTIALS
    // -------------------------------------------------------------------------

    /*
     * This is the critical identity boundary.
     *
     * We intentionally do NOT query:
     *
     *   persons.auth_user_id
     *   persons.email
     *
     * to discover who the authenticated user is.
     *
     * If an auth credential already exists, its Person is authoritative.
     */

    const {
      data: credential,
      error: credentialLookupError,
    } = await supabase
      .from('auth_credentials')
      .select(
        'auth_credential_id, person_id, status',
      )
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (credentialLookupError) {
      console.error(
        '[identity/plan][POST] auth credential lookup failed:',
        credentialLookupError,
      );

      return NextResponse.json(
        {
          error: 'Unable to resolve authenticated identity',
          code: 'AUTH_CREDENTIAL_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    let personId: string;

    if (credential?.person_id) {
      // -----------------------------------------------------------------------
      // EXISTING CANONICAL PERSON
      // -----------------------------------------------------------------------

      personId = credential.person_id;

      // -----------------------------------------------------------------------
      // REACTIVATE / REPAIR EXISTING AUTH CREDENTIAL
      // -----------------------------------------------------------------------

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
            '[identity/plan][POST] auth credential activation failed:',
            credentialRepairError,
          );

          return NextResponse.json(
            {
              error: 'Unable to establish authenticated identity',
              code: 'AUTH_CREDENTIAL_UPDATE_FAILED',
            },
            { status: 500 },
          );
        }
      }
    } else {
      // -----------------------------------------------------------------------
      // NO CANONICAL PERSON EXISTS
      // -----------------------------------------------------------------------

      /*
       * Create a Person without assigning auth_user_id.
       *
       * The canonical Auth → Person relationship belongs in
       * auth_credentials. Keeping auth_user_id out of this insert prevents
       * the legacy persons.auth_user_id column from becoming a second
       * identity authority.
       */

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
        .select('person_id')
        .single();

      if (createPersonError || !createdPerson) {
        console.error(
          '[identity/plan][POST] person creation failed:',
          createPersonError,
        );

        return NextResponse.json(
          {
            error: 'Unable to create person identity',
            code: 'PERSON_CREATE_FAILED',
          },
          { status: 500 },
        );
      }

      personId = createdPerson.person_id;

      // -----------------------------------------------------------------------
      // CREATE CANONICAL AUTH → PERSON BRIDGE
      // -----------------------------------------------------------------------

      const {
        error: createCredentialError,
      } = await supabase
        .from('auth_credentials')
        .insert({
          person_id: personId,
          auth_user_id: user.id,
          status: 'active',
        });

      if (createCredentialError) {
        console.error(
          '[identity/plan][POST] auth credential creation failed:',
          createCredentialError,
        );

        /*
         * Best-effort cleanup prevents an orphan Person if creation of the
         * canonical bridge fails.
         */
        await supabase
          .from('persons')
          .delete()
          .eq('person_id', personId);

        return NextResponse.json(
          {
            error: 'Unable to establish authenticated identity',
            code: 'AUTH_CREDENTIAL_CREATE_FAILED',
          },
          { status: 500 },
        );
      }
    }

    // -------------------------------------------------------------------------
    // 4. UPDATE PERSON DETAILS
    // -------------------------------------------------------------------------

    const {
      error: personUpdateError,
    } = await supabase
      .from('persons')
      .update({
        first_name: firstName,
        last_name: lastName,
        ...(user.email
          ? { email: user.email }
          : {}),
      })
      .eq('person_id', personId);

    if (personUpdateError) {
      console.error(
        '[identity/plan][POST] person update failed:',
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
    // 5. RESOLVE / CREATE ORGANISATION
    // -------------------------------------------------------------------------

    let canonicalOrganisationId: string;
    let canonicalOrganisationName: string | null = null;
    let membershipId: string;
    let membershipRole: string;

    if (submittedOrganisationId) {
      // -----------------------------------------------------------------------
      // EXISTING ORGANISATION
      // -----------------------------------------------------------------------

      const {
        data: organisation,
        error: organisationError,
      } = await supabase
        .from('organisations')
        .select('organisation_id, name')
        .eq(
          'organisation_id',
          submittedOrganisationId,
        )
        .maybeSingle();

      if (organisationError) {
        console.error(
          '[identity/plan][POST] organisation lookup failed:',
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

      canonicalOrganisationId =
        organisation.organisation_id;

      canonicalOrganisationName =
        organisation.name ?? null;

      // -----------------------------------------------------------------------
      // VERIFY EXISTING MEMBERSHIP
      // -----------------------------------------------------------------------

      /*
       * A client-supplied organisationId is only a selector.
       *
       * Authority comes from the canonical Person → Organisation membership.
       */

      const {
        data: existingMembership,
        error: membershipLookupError,
      } = await supabase
        .from('organisation_memberships')
        .select(
          'membership_id, organisation_id, person_id, role, status',
        )
        .eq(
          'organisation_id',
          canonicalOrganisationId,
        )
        .eq('person_id', personId)
        .eq('status', 'active')
        .or(
          'valid_to.is.null,valid_to.gt.now()',
        )
        .order('valid_from', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (membershipLookupError) {
        console.error(
          '[identity/plan][POST] membership lookup failed:',
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

      if (!existingMembership) {
        return NextResponse.json(
          {
            error: 'You are not a member of that organisation',
            code: 'NOT_ORGANISATION_MEMBER',
          },
          { status: 403 },
        );
      }

      /*
       * Existing membership is authoritative.
       *
       * Do not change its role based on the current /plan submission.
       */
      membershipId = existingMembership.membership_id;
      membershipRole = existingMembership.role;
    } else {
      // -----------------------------------------------------------------------
      // NEW ORGANISATION
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

      const {
        data: createdOrganisation,
        error: createOrganisationError,
      } = await supabase
        .from('organisations')
        .insert({
          name: organisationName,
        })
        .select('organisation_id, name')
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

      // -----------------------------------------------------------------------
      // CREATE INITIAL MEMBERSHIP
      // -----------------------------------------------------------------------

      membershipRole = isOwner
        ? 'owner'
        : 'member';

      const {
        data: createdMembership,
        error: createMembershipError,
      } = await supabase
        .from('organisation_memberships')
        .insert({
          organisation_id: canonicalOrganisationId,
          person_id: personId,
          role: membershipRole,
          status: 'active',
          valid_from: new Date().toISOString(),
        })
        .select(
          'membership_id, organisation_id, person_id, role, status',
        )
        .single();

      if (
        createMembershipError ||
        !createdMembership
      ) {
        console.error(
          '[identity/plan][POST] initial membership creation failed:',
          createMembershipError,
        );

        /*
         * Best-effort cleanup of the newly-created organisation.
         *
         * No membership means the organisation should not be left behind
         * merely because onboarding failed at this step.
         */
        await supabase
          .from('organisations')
          .delete()
          .eq(
            'organisation_id',
            canonicalOrganisationId,
          );

        return NextResponse.json(
          {
            error: 'Unable to establish organisation membership',
            code: 'MEMBERSHIP_CREATE_FAILED',
          },
          { status: 500 },
        );
      }

      membershipId =
        createdMembership.membership_id;
    }

    // -------------------------------------------------------------------------
    // 6. ESTABLISH OWNERSHIP SEPARATELY FROM MEMBERSHIP
    // -------------------------------------------------------------------------

    if (isOwner) {
      /*
       * Ownership is a temporal relationship and is deliberately separate
       * from organisation membership.
       *
       * Re-submitting /plan must not create duplicate current ownership
       * periods.
       */

      const {
        data: existingOwnership,
        error: ownershipLookupError,
      } = await supabase
        .from('ownership_periods')
        .select('ownership_period_id')
        .eq(
          'organisation_id',
          canonicalOrganisationId,
        )
        .eq('person_id', personId)
        .eq('status', 'current')
        .limit(1)
        .maybeSingle();

      if (ownershipLookupError) {
        console.error(
          '[identity/plan][POST] ownership lookup failed:',
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

      if (!existingOwnership) {
        const {
          error: ownershipError,
        } = await supabase
          .from('ownership_periods')
          .insert({
            organisation_id: canonicalOrganisationId,
            person_id: personId,
            status: 'current',
            valid_from: new Date().toISOString(),
          });

        if (ownershipError) {
          console.error(
            '[identity/plan][POST] ownership claim failed:',
            ownershipError,
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
    // 7. RETURN CANONICAL IDENTITY
    // -------------------------------------------------------------------------

    return NextResponse.json({
      ok: true,

      identity: {
        organisationId: canonicalOrganisationId,
        organisationName: canonicalOrganisationName,
        personId,
        membershipId,
        role: membershipRole,
      },

      /*
       * Preserve this field for the existing beta/onboarding client if it
       * currently expects it. It has no identity authority.
       */
      ...(betaCode
        ? { betaCode }
        : {}),
    });
  } catch (error) {
    console.error(
      '[identity/plan][POST] unexpected error:',
      error,
    );

    return NextResponse.json(
      {
        error: 'Unable to save organisational identity',
        code: 'IDENTITY_SAVE_FAILED',
      },
      { status: 500 },
    );
  }
}