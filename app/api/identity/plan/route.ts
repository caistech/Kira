import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
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
 * Persists the person's Plan/onboarding identity information against
 * the canonical Person + Organisation context.
 *
 * The authenticated organisation context is authoritative.
 *
 * Client supplied:
 *   organisationId
 *
 * is NEVER allowed to select another organisation.
 */
export async function POST(request: Request) {
  try {
    /*
     * Resolve the caller from the authenticated session first.
     *
     * This is the canonical authority boundary.
     */
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

    const canonicalOrganisationId = normaliseString(ctx.organisationId);
    const personId = normaliseString(ctx.personId);

    if (!canonicalOrganisationId) {
      return NextResponse.json(
        {
          error: 'No active organisation membership',
          code: 'NO_ACTIVE_ORGANISATION',
        },
        { status: 403 },
      );
    }

    if (!personId) {
      return NextResponse.json(
        {
          error: 'Unable to resolve person identity',
          code: 'NO_PERSON_CONTEXT',
        },
        { status: 401 },
      );
    }

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

    /*
     * If the client sends an organisationId, it is merely a claim about
     * the current context.
     *
     * It must match the server-resolved organisation.
     *
     * We NEVER switch context to the submitted value.
     */
    if (
      submittedOrganisationId &&
      submittedOrganisationId !== canonicalOrganisationId
    ) {
      return NextResponse.json(
        {
          error: 'Organisation context mismatch',
          code: 'ORGANISATION_CONTEXT_MISMATCH',
        },
        { status: 403 },
      );
    }

    /*
     * isOwner is a relationship/role assertion.
     *
     * Do not use it to create organisational identity.
     */
    const isOwner =
      typeof body.isOwner === 'boolean' ? body.isOwner : undefined;

    const supabase = createServiceClient();

    /*
     * Verify that the canonical Organisation exists.
     */
    const { data: organisation, error: organisationError } =
      await supabase
        .from('organisations')
        .select('organisation_id, name')
        .eq('organisation_id', canonicalOrganisationId)
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

    /*
     * Update canonical Person identity.
     *
     * Person remains separate from Organisation.
     */
    const personUpdate: Record<string, string> = {};

    if (firstName) {
      personUpdate.first_name = firstName;
    }

    if (lastName) {
      personUpdate.last_name = lastName;
    }

    if (Object.keys(personUpdate).length > 0) {
      const { error: personError } = await supabase
        .from('persons')
        .update(personUpdate)
        .eq('person_id', personId);

      if (personError) {
        console.error(
          '[identity/plan][POST] person update failed:',
          personError,
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

    /*
     * If the Plan flow explicitly identifies the caller as an owner,
     * update the canonical membership relationship.
     *
     * The organisation is STILL the server-resolved organisation.
     */
    if (isOwner === true) {
      const { error: membershipError } = await supabase
        .from('organisation_memberships')
        .upsert(
          {
            organisation_id: canonicalOrganisationId,
            person_id: personId,
            role: 'owner',
            status: 'active',
            valid_from: new Date().toISOString(),
          },
          {
            onConflict: 'organisation_id,person_id,role',
          },
        );

      if (membershipError) {
        console.error(
          '[identity/plan][POST] owner membership update failed:',
          membershipError,
        );

        return NextResponse.json(
          {
            error: 'Unable to save organisation relationship',
            code: 'MEMBERSHIP_UPDATE_FAILED',
          },
          { status: 500 },
        );
      }
    }

    /*
     * Do not allow organisationName from the client to overwrite the
     * canonical Organisation name merely because it was submitted here.
     *
     * If an organisation name was supplied, it is only used when the
     * canonical Organisation currently has no name.
     *
     * This avoids turning a Plan form into an authority boundary for
     * changing organisational identity.
     */
    if (!organisation.name && organisationName) {
      const { error: organisationUpdateError } = await supabase
        .from('organisations')
        .update({
          name: organisationName,
        })
        .eq('organisation_id', canonicalOrganisationId);

      if (organisationUpdateError) {
        console.error(
          '[identity/plan][POST] organisation name update failed:',
          organisationUpdateError,
        );

        return NextResponse.json(
          {
            error: 'Unable to save organisation identity',
            code: 'ORGANISATION_UPDATE_FAILED',
          },
          { status: 500 },
        );
      }
    }

    /*
     * betaCode is intentionally NOT used to establish identity or
     * organisational ownership.
     *
     * Beta redemption remains a separate commercial/acquisition concern.
     *
     * If the Plan page needs to pass the code onward, return it as
     * contextual state rather than allowing it to alter organisation
     * resolution here.
     */
    return NextResponse.json({
      ok: true,

      identity: {
        organisationId: canonicalOrganisationId,
        organisationName:
          organisation.name ?? (organisationName || null),
        personId,
        role: isOwner === true ? 'owner' : ctx.role ?? null,
      },

      /*
       * Preserve the beta code for the next stage of the Plan flow,
       * without making it an identity authority.
       */
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