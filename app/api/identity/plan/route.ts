import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext, getAuthUser,} from '@/lib/auth';
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
 *   getCurrentOrganisationContext()
 *          ↓
 *   Person
 *          ↓
 *   Organisation Membership
 *          ↓
 *   Organisation
 *
 * The client may provide identity/onboarding values, but it does NOT
 * establish organisational authority.
 *
 * Canonical rule:
 *
 *   organisation_id = resolved server-side organisation context
 *
 * Never:
 *
 *   organisation_id = client supplied organisationId
 *
 * A client-supplied organisationId may only be accepted when it matches
 * the authenticated organisation context.
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
     * Read the canonical Organisation record.
     *
     * IMPORTANT:
     * organisationId comes from getCurrentOrganisationContext(),
     * never from the request.
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
      identity: {
        organisationId: organisation.organisation_id,
        organisationName: organisation.name ?? null,

        /*
         * These are contextual identity values.
         * They are NOT organisational ownership identifiers.
         */
        personId: ctx.personId ?? null,
        role: ctx.role ?? null,
      },
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
 * /plan is the identity-establishment boundary.
 *
 * IMPORTANT:
 * This route MUST NOT require getCurrentOrganisationContext(),
 * because a new user may not have an organisation yet.
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
 * organisationId supplied by the client is only accepted when it
 * already exists and belongs to the authenticated Person.
 *
 * If no organisationId is supplied, a new Organisation is created.
 */
export async function POST(request: Request) { // Beta code redemption path
  try {
    const supabase = createServiceClient();

    // -------------------------------------------------------------------------
    // 1. AUTHENTICATE THE CALLER
    // -------------------------------------------------------------------------
    //
    // Use the cookie-aware session client via getAuthUser().
    // The service-role client above is deliberately retained for canonical
    // database writes/lookups after authentication.
    //

    const user = await getAuthUser();
const betaSessionCookie = request.cookies.get('betaSession')?.value;

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorised',
          code: 'NO_AUTHENTICATED_USER_AND_NO_BETA_ACCESS',
        },
        { status: 401 },
      );
    }



    // -------------------------------------------------------------------------
    // 2. RESOLVE / CREATE PERSON
    // -------------------------------------------------------------------------
    //
    // Person is the human identity.
    // users.id is NOT the organisation identity.
    //
    const { data: personByAuth, error: personLookupError } = await supabase
      .from('persons')
      .select('person_id, first_name, last_name')
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
      const { data: personByEmail, error: personEmailError } = await supabase
        .from('persons')
        .select('person_id')
        .eq('email', user.email ?? '')
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

        // Repair the Auth → Person bridge if necessary.
        const { error: bridgeError } = await supabase
          .from('persons')
          .update({ auth_user_id: user.id })
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
      } else {
        const { data: createdPerson, error: createPersonError } =
          await supabase
            .from('persons')
            .insert({
              auth_user_id: user.id,
              email: user.email ?? null,
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
    // 3. READ REQUEST
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
    const submittedOrganisationId = normaliseString(body.organisationId);
    const organisationName = normaliseName(body.organisationName);
    const betaCode = normaliseString(body.betaCode);

    const isOwner =
      typeof body.isOwner === 'boolean' ? body.isOwner : false;

    // -------------------------------------------------------------------------
    // 4. UPDATE PERSON IDENTITY
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
    // 5. RESOLVE OR CREATE ORGANISATION
    // -------------------------------------------------------------------------
    //
    // organisation_id is the canonical organisational anchor.
    //
    // Client-supplied organisationId NEVER creates authority.
    //
    // If supplied, it must already exist and the Person must already have
    // membership in it.
    //
    // If not supplied, /plan creates the initial Organisation.
    //

    let canonicalOrganisationId: string;
    let canonicalOrganisationName: string | null = null;

    if (submittedOrganisationId) {
      const { data: organisation, error: organisationError } =
        await supabase
          .from('organisations')
          .select('organisation_id, name')
          .eq('organisation_id', submittedOrganisationId)
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

      canonicalOrganisationId = organisation.organisation_id;
      canonicalOrganisationName = organisation.name ?? null;

      // Existing organisation: verify this Person is actually a member.
      const { data: membership, error: membershipLookupError } =
        await supabase
          .from('organisation_memberships')
          .select('membership_id, role, status')
          .eq('organisation_id', canonicalOrganisationId)
          .eq('person_id', personId)
          .eq('status', 'active')
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

      if (!membership) {
        return NextResponse.json(
          {
            error: 'You are not a member of that organisation',
            code: 'NOT_ORGANISATION_MEMBER',
          },
          { status: 403 },
        );
      }
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

      const { data: createdOrganisation, error: createOrganisationError } =
        await supabase
          .from('organisations')
          .insert({
            name: organisationName,
          })
          .select('organisation_id, name')
          .single();

      if (createOrganisationError || !createdOrganisation) {
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

      canonicalOrganisationId = createdOrganisation.organisation_id;
      canonicalOrganisationName = createdOrganisation.name ?? null;
    }

    // -------------------------------------------------------------------------
    // 6. ESTABLISH MEMBERSHIP
    // -------------------------------------------------------------------------
    //
    // This is the actual point at which the Person enters the Organisation
    // context.
    //

    const { data: membership, error: membershipError } = await supabase
      .from('organisation_memberships')
      .upsert(
        {
          organisation_id: canonicalOrganisationId,
          person_id: personId,
          role: isOwner ? 'owner' : 'member',
          status: 'active',
          valid_from: new Date().toISOString(),
        },
        {
          onConflict: 'organisation_id,person_id,role',
        },
      )
      .select('membership_id, role')
      .single();

    if (membershipError || !membership) {
      console.error(
        '[identity/plan][POST] membership creation/update failed:',
        membershipError,
      );

      return NextResponse.json(
        {
          error: 'Unable to establish organisation membership',
          code: 'MEMBERSHIP_UPDATE_FAILED',
        },
        { status: 500 },
      );
    }

    // -------------------------------------------------------------------------
    // 7. INITIAL SELF-DECLARED OWNERSHIP
    // -------------------------------------------------------------------------
    //
    // Ownership is separate from membership.
    //
    // It exists only when the Person explicitly checked "I am the Owner".
    //

    if (isOwner) {
      const { error: ownershipError } = await supabase
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

    // -------------------------------------------------------------------------
    // 8. RETURN CANONICAL IDENTITY
    // -------------------------------------------------------------------------

    return NextResponse.json({
      ok: true,

      identity: {
        organisationId: canonicalOrganisationId,
        organisationName: canonicalOrganisationName,
        personId,
        membershipId: membership.membership_id,
        role: membership.role,
      },

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