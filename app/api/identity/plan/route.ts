import { NextResponse } from 'next/server';
import {
  getCurrentOrganisationContext,
  getAuthUser,
} from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PlanRequestBody = {
  firstName?: unknown;
  lastName?: unknown;
  organisationId?: unknown;
  organisationName?: unknown;
  isOwner?: unknown;
  betaCode?: unknown;
};

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseName(value: unknown): string {
  return normaliseString(value).replace(/\s+/g, ' ');
}

/**
 * Canonical identity projection for the Plan / onboarding flow.
 *
 * Authority chain:
 *
 *   authenticated session
 *          ↓
 *   Person
 *          ↓
 *   Organisation
 *          ↓
 *   Organisation Membership
 *          ↓
 *   optional SELF_DECLARED ownership
 *
 * The client may provide onboarding information, but it does not
 * establish organisational authority.
 *
 * organisationId supplied by the client is therefore never trusted
 * as authority. If supplied, it must already exist and the Person
 * must already be an active member of that Organisation.
 *
 * If no organisationId is supplied, a new Organisation is created
 * for the authenticated Person.
 *
 * Beta provenance is independent of ownership.
 */

/**
 * GET /api/identity/plan
 *
 * Returns the canonical organisational identity for the authenticated
 * caller.
 *
 * This endpoint is intentionally read-only.
 */
export async function GET() {
  try {
    const ctx = await getCurrentOrganisationContext();

    if (!ctx) {
      return NextResponse.json(
        {
          error: 'Unauthorised',
          code: 'NO_ORGANISATION_CONTEXT',
        },
        { status: 401 },
      );
    }

    const organisationId = ctx.organisationId;

    if (!organisationId) {
      return NextResponse.json(
        {
          error: 'No active organisation membership',
          code: 'NO_ACTIVE_ORGANISATION',
        },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    /*
     * organisationId comes exclusively from the canonical
     * organisational context resolver.
     */
    const { data: organisation, error: organisationError } =
      await supabase
        .from('organisations')
        .select('organisation_id, name')
        .eq('organisation_id', organisationId)
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

    return NextResponse.json({
      ok: true,
      signedIn: true,

      identity: {
        organisationId: organisation.organisation_id,
        organisationName: organisation.name ?? null,
        personId: ctx.personId ?? null,
        role: ctx.role ?? null,
      },
    });
  } catch (error) {
    console.error(
      '[identity/plan][GET] unexpected error:',
      error,
    );

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
 * /plan is the identity-establishment boundary.
 *
 * IMPORTANT:
 *
 * This route intentionally does NOT require
 * getCurrentOrganisationContext(), because a newly authenticated
 * Person may not yet have an Organisation or Membership.
 *
 * Authority:
 *
 *   authenticated session
 *        ↓
 *   Person
 *        ↓
 *   Organisation
 *        ↓
 *   Membership
 *        ↓
 *   optional SELF_DECLARED ownership
 *
 * Beta code:
 *
 *   Beta code establishes beta provenance/access only.
 *
 * It does NOT:
 *
 *   - establish Person identity
 *   - establish Organisation ownership
 *   - create organisational authority
 *   - replace authentication
 *   - replace membership
 *
 * The authenticated Supabase user remains the identity authority.
 */
export async function POST(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATE THE CALLER
    // -------------------------------------------------------------------------
    //
    // getAuthUser() uses the cookie-aware Supabase session client.
    // See lib/auth.ts.
    //
    // There is deliberately ONE declaration of `user` in this route.
    //

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
    const betaCode = normaliseString(body.betaCode);

    const isOwner =
      typeof body.isOwner === 'boolean'
        ? body.isOwner
        : false;

    /*
     * Beta code is provenance/access information.
     *
     * It is deliberately NOT converted into ownership.
     *
     * The actual beta entitlement/redeem flow remains responsible for
     * validating the beta code itself.
     *
     * We therefore retain the supplied code for the downstream response
     * without treating its presence as organisational authority.
     */

    // -------------------------------------------------------------------------
    // 3. SERVICE CLIENT
    // -------------------------------------------------------------------------
    //
    // Authentication has already been established through getAuthUser().
    //
    // The service-role client is used for the canonical Person,
    // Organisation, Membership and Ownership writes below.
    //

    const supabase = createServiceClient();

    // -------------------------------------------------------------------------
    // 4. RESOLVE / CREATE PERSON
    // -------------------------------------------------------------------------
    //
    // Person is the human identity.
    //
    // users.id is NOT used as organisation identity.
    //

    const { data: personByAuth, error: personLookupError } =
      await supabase
        .from('persons')
        .select(
          'person_id, first_name, last_name, email, auth_user_id',
        )
        .eq('auth_user_id', user.id)
        .maybeSingle();

    if (personLookupError) {
      console.error(
        '[identity/plan][POST] person lookup failed:',
        personLookupError,
      );

      return NextResponse.json(
        {
          error: 'Unable to resolve person identity',
          code: 'PERSON_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    let personId: string;

    if (personByAuth) {
      personId = personByAuth.person_id;
    } else {
      // -----------------------------------------------------------------------
      // 4A. AUTH → PERSON BRIDGE BY EMAIL
      // -----------------------------------------------------------------------
      //
      // Email is used only to locate an existing Person record when the
      // canonical auth_user_id bridge is not yet present.
      //
      // Email itself does NOT establish organisation authority.
      //

      if (!user.email) {
        return NextResponse.json(
          {
            error: 'Authenticated account has no email address',
            code: 'AUTH_EMAIL_REQUIRED',
          },
          { status: 400 },
        );
      }

      const { data: personByEmail, error: personEmailError } =
        await supabase
          .from('persons')
          .select('person_id, auth_user_id')
          .ilike('email', user.email)
          .maybeSingle();

      if (personEmailError) {
        console.error(
          '[identity/plan][POST] person email lookup failed:',
          personEmailError,
        );

        return NextResponse.json(
          {
            error: 'Unable to resolve person identity',
            code: 'PERSON_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (personByEmail) {
        personId = personByEmail.person_id;

        /*
         * Only repair an unclaimed Person bridge.
         *
         * Never overwrite an existing auth_user_id belonging to another
         * authenticated identity.
         */
        if (!personByEmail.auth_user_id) {
          const { error: bridgeError } = await supabase
            .from('persons')
            .update({
              auth_user_id: user.id,
            })
            .eq('person_id', personId)
            .is('auth_user_id', null);

          if (bridgeError) {
            console.error(
              '[identity/plan][POST] person auth bridge update failed:',
              bridgeError,
            );

            return NextResponse.json(
              {
                error: 'Unable to establish person identity',
                code: 'PERSON_BRIDGE_FAILED',
              },
              { status: 500 },
            );
          }
        } else if (personByEmail.auth_user_id !== user.id) {
          /*
           * An existing Person already belongs to another auth identity.
           *
           * Do not silently reassign it merely because the email matched.
           */
          return NextResponse.json(
            {
              error:
                'A different authenticated identity is already linked to this person record',
              code: 'PERSON_AUTH_CONFLICT',
            },
            { status: 409 },
          );
        }
      } else {
        // ---------------------------------------------------------------------
        // 4B. CREATE PERSON
        // ---------------------------------------------------------------------

        const { data: createdPerson, error: createPersonError } =
          await supabase
            .from('persons')
            .insert({
              auth_user_id: user.id,
              email: user.email,
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
      }
    }

    // -------------------------------------------------------------------------
    // 5. UPDATE PERSON IDENTITY
    // -------------------------------------------------------------------------

    const personUpdate: Record<string, string> = {};

    if (firstName) {
      personUpdate.first_name = firstName;
    }

    if (lastName) {
      personUpdate.last_name = lastName;
    }

    if (Object.keys(personUpdate).length > 0) {
      const { error: personUpdateError } = await supabase
        .from('persons')
        .update(personUpdate)
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
    }

    // -------------------------------------------------------------------------
    // 6. RESOLVE OR CREATE ORGANISATION
    // -------------------------------------------------------------------------
    //
    // organisation_id is the canonical organisational anchor.
    //
    // A client-supplied organisationId NEVER creates authority.
    //
    // If supplied:
    //
    //   1. Organisation must exist.
    //   2. Person must already be an active member.
    //
    // If not supplied:
    //
    //   A new Organisation is created.
    //
    // The Person is then attached through organisation_memberships.
    //

    let canonicalOrganisationId: string;
    let canonicalOrganisationName: string | null = null;

    if (submittedOrganisationId) {
      // -----------------------------------------------------------------------
      // 6A. EXISTING ORGANISATION
      // -----------------------------------------------------------------------

      const { data: organisation, error: organisationError } =
        await supabase
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
      // 6B. VERIFY EXISTING MEMBERSHIP
      // -----------------------------------------------------------------------
      //
      // An existing organisation cannot simply be claimed by presenting its
      // UUID. The Person must already have an active membership.
      //

      const {
        data: existingMembership,
        error: membershipLookupError,
      } = await supabase
        .from('organisation_memberships')
        .select(
          'membership_id, role, status, valid_from, valid_to',
        )
        .eq(
          'organisation_id',
          canonicalOrganisationId,
        )
        .eq('person_id', personId)
        .eq('status', 'active')
        .or('valid_to.is.null,valid_to.gt.now()')
        .maybeSingle();

      if (membershipLookupError) {
        console.error(
          '[identity/plan][POST] membership lookup failed:',
          membershipLookupError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to verify organisation membership',
            code: 'MEMBERSHIP_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (!existingMembership) {
        return NextResponse.json(
          {
            error:
              'You are not a member of that organisation',
            code: 'NOT_ORGANISATION_MEMBER',
          },
          { status: 403 },
        );
      }
    } else {
      // -----------------------------------------------------------------------
      // 6C. CREATE NEW ORGANISATION
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
    }

    // -------------------------------------------------------------------------
    // 7. ESTABLISH MEMBERSHIP
    // -------------------------------------------------------------------------
    //
    // Membership establishes the Person's organisational context.
    //
    // Ownership remains separate.
    //

    const membershipRole = isOwner
      ? 'owner'
      : 'member';

    const validFrom = new Date().toISOString();

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('organisation_memberships')
      .upsert(
        {
          organisation_id:
            canonicalOrganisationId,
          person_id: personId,
          role: membershipRole,
          status: 'active',
          valid_from: validFrom,
        },
        {
          onConflict:
            'organisation_id,person_id,role',
        },
      )
      .select(
        'membership_id, role, status, valid_from, valid_to',
      )
      .single();

    if (membershipError || !membership) {
      console.error(
        '[identity/plan][POST] membership creation/update failed:',
        membershipError,
      );

      return NextResponse.json(
        {
          error:
            'Unable to establish organisation membership',
          code: 'MEMBERSHIP_UPDATE_FAILED',
        },
        { status: 500 },
      );
    }

    // -------------------------------------------------------------------------
    // 8. INITIAL SELF-DECLARED OWNERSHIP
    // -------------------------------------------------------------------------
    //
    // Ownership is deliberately separate from membership.
    //
    // The ownership record is created ONLY because the Person explicitly
    // declared:
    //
    //   "I am the Owner of this Business"
    //
    // Beta status, invitation provenance, email and first arrival do not
    // establish ownership.
    //

    if (isOwner) {
      /*
       * Prevent repeated visits to /plan from creating multiple current
       * ownership records for the same Person/Organisation relationship.
       *
       * We first check for an existing current ownership period.
       */
      const {
        data: existingOwnership,
        error: ownershipLookupError,
      } = await supabase
        .from('ownership_periods')
        .select(
          'ownership_period_id, status, valid_from, valid_to',
        )
        .eq(
          'organisation_id',
          canonicalOrganisationId,
        )
        .eq('person_id', personId)
        .eq('status', 'current')
        .maybeSingle();

      if (ownershipLookupError) {
        console.error(
          '[identity/plan][POST] ownership lookup failed:',
          ownershipLookupError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to verify ownership declaration',
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
            organisation_id:
              canonicalOrganisationId,
            person_id: personId,
            status: 'current',
            valid_from: validFrom,
          });

        if (ownershipError) {
          console.error(
            '[identity/plan][POST] ownership claim failed:',
            ownershipError,
          );

          return NextResponse.json(
            {
              error:
                'Unable to save ownership declaration',
              code: 'OWNERSHIP_CLAIM_FAILED',
            },
            { status: 500 },
          );
        }
      }
    }

    // -------------------------------------------------------------------------
    // 9. RETURN CANONICAL IDENTITY
    // -------------------------------------------------------------------------

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
        role: membership.role,
      },

      /*
       * Beta code is returned as provenance/access information only.
       *
       * Its presence does not mean ownership.
       */
      betaCode: betaCode || undefined,
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
        code: 'IDENTITY_SAVE_FAILED',
      },
      { status: 500 },
    );
  }
}