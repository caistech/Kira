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
 * GET /api/identity/plan
 *
 * API contract is deliberately shaped to match the existing /plan page.
 *
 * The page expects:
 *
 * {
 *   signedIn,
 *   firstName,
 *   lastName,
 *   organisationId,
 *   organisationName,
 *   isOwner
 * }
 *
 * Canonical authority remains:
 *
 *   auth
 *     → auth_credentials
 *     → persons
 *     → organisation_memberships
 *     → organisations
 *
 * The response shape is only a projection.
 * It does not change the canonical ownership model.
 */
export async function GET() {
  try {
    const ctx = await getCurrentOrganisationContext();

    if (!ctx) {
      return NextResponse.json(
        {
          signedIn: false,
          firstName: null,
          lastName: null,
          organisationId: null,
          organisationName: null,
          isOwner: false,
        },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();

    // -----------------------------------------------------------------------
    // Resolve Person
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // Resolve Organisation
    // -----------------------------------------------------------------------

    const { data: organisation, error: organisationError } =
      await supabase
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

    // -----------------------------------------------------------------------
    // Resolve ownership separately from membership.
    //
    // Ownership is NOT inferred merely from role.
    // The canonical ownership_periods table is authoritative.
    // -----------------------------------------------------------------------

    const { data: ownership, error: ownershipError } =
      await supabase
        .from('ownership_periods')
        .select('ownership_period_id')
        .eq('organisation_id', ctx.organisationId)
        .eq('person_id', ctx.personId)
        .eq('status', 'current')
        .or('valid_to.is.null,valid_to.gt.now()')
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

    // -----------------------------------------------------------------------
    // IMPORTANT:
    //
    // Return the shape the page already expects.
    //
    // Do NOT nest these under `identity`.
    // -----------------------------------------------------------------------

    return NextResponse.json({
      signedIn: true,
      firstName: person?.first_name ?? null,
      lastName: person?.last_name ?? null,
      organisationId: organisation.organisation_id,
      organisationName: organisation.name ?? null,
      isOwner: Boolean(ownership),
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
 * Establishes:
 *
 *   Person
 *   Organisation
 *   Membership
 *   optional Ownership Period
 *
 * The response is also projected into the exact shape expected by
 * the existing /plan page.
 */
export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();

    // -----------------------------------------------------------------------
    // 1. AUTHENTICATE
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // 2. RESOLVE / CREATE PERSON
    // -----------------------------------------------------------------------

    const { data: personByAuth, error: personLookupError } =
      await supabase
        .from('persons')
        .select('person_id, first_name, last_name, email')
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
      const email = normaliseString(user.email);

      const { data: personByEmail, error: personEmailError } =
        await supabase
          .from('persons')
          .select('person_id')
          .eq('email', email)
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

    // -----------------------------------------------------------------------
    // 3. READ REQUEST
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // 4. UPDATE PERSON
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // 5. RESOLVE OR CREATE ORGANISATION
    // -----------------------------------------------------------------------

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

      // Existing organisation requires existing membership.
      const { data: existingMembership, error: membershipLookupError } =
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

      if (!existingMembership) {
        return NextResponse.json(
          {
            error: 'You are not a member of that organisation',
            code: 'NOT_ORGANISATION_MEMBER',
          },
          { status: 403 },
        );
      }
    } else {
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

      canonicalOrganisationId =
        createdOrganisation.organisation_id;

      canonicalOrganisationName =
        createdOrganisation.name ?? null;
    }

    // -----------------------------------------------------------------------
    // 6. ESTABLISH MEMBERSHIP
    // -----------------------------------------------------------------------

    const { data: membership, error: membershipError } =
      await supabase
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

    // -----------------------------------------------------------------------
    // 7. OWNERSHIP
    // -----------------------------------------------------------------------

    if (isOwner) {
      const { data: existingOwnership, error: ownershipLookupError } =
        await supabase
          .from('ownership_periods')
          .select('ownership_period_id')
          .eq('organisation_id', canonicalOrganisationId)
          .eq('person_id', personId)
          .eq('status', 'current')
          .or('valid_to.is.null,valid_to.gt.now()')
          .limit(1)
          .maybeSingle();

      if (ownershipLookupError) {
        console.error(
          '[identity/plan][POST] ownership lookup failed:',
          ownershipLookupError,
        );

        return NextResponse.json(
          {
            error: 'Unable to resolve ownership',
            code: 'OWNERSHIP_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (!existingOwnership) {
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
    }

    // -----------------------------------------------------------------------
    // 8. RETURN THE PAGE'S EXISTING RESPONSE SHAPE
    // -----------------------------------------------------------------------

    return NextResponse.json({
      signedIn: true,
      firstName: firstName || null,
      lastName: lastName || null,
      organisationId: canonicalOrganisationId,
      organisationName: canonicalOrganisationName,
      isOwner,
      betaCode: betaCode || undefined,
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