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

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseName(value: unknown): string {
  return normaliseString(value).replace(/\s+/g, ' ');
}

/**
 * /api/identity/plan
 *
 * Canonical identity boundary.
 *
 * Canonical identity model:
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
 * Ownership is separate:
 *
 *   person + organisation
 *        ↓
 *   ownership_periods
 *
 * IMPORTANT:
 *
 * - auth.users.id is authentication identity only.
 * - auth_credentials is the Auth → Person bridge.
 * - persons.auth_user_id is NOT used.
 * - users.id is NOT organisational authority.
 * - organisation_id is the canonical organisational anchor.
 * - client-supplied organisationId never creates authority.
 * - betaCode is provenance/access information only.
 * - ownership is only established from an explicit isOwner declaration.
 */

/**
 * GET /api/identity/plan
 *
 * Returns the canonical organisational identity for the authenticated
 * caller.
 *
 * This endpoint is read-only.
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

    if (!ctx.organisationId) {
      return NextResponse.json(
        {
          error: 'No active organisation membership',
          code: 'NO_ACTIVE_ORGANISATION',
        },
        { status: 403 },
      );
    }

    const supabase = createServiceClientV2();

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

    /*
     * Ownership is deliberately resolved independently from membership.
     */
    const { data: ownership, error: ownershipError } =
      await supabase
        .from('ownership_periods')
        .select(
          'ownership_period_id, status, valid_from, valid_to',
        )
        .eq('organisation_id', ctx.organisationId)
        .eq('person_id', ctx.personId)
        .eq('status', 'current')
        .maybeSingle();

    if (ownershipError) {
      console.error(
        '[identity/plan][GET] ownership lookup failed:',
        ownershipError,
      );

      return NextResponse.json(
        {
          error: 'Unable to resolve ownership status',
          code: 'OWNERSHIP_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      signedIn: true,

      identity: {
        organisationId: organisation.organisation_id,
        organisationName: organisation.name ?? null,
        personId: ctx.personId,
        membershipId: ctx.membershipId,
        role: ctx.role,
        membershipStatus: ctx.membershipStatus,
        canSpend: ctx.canSpend,
        validFrom: ctx.validFrom,
        validTo: ctx.validTo,
        isOwner: Boolean(ownership),
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
 * Establishes or confirms the canonical Person → Organisation relationship.
 *
 * This route deliberately does NOT call getCurrentOrganisationContext()
 * because a newly authenticated Person may not have an Organisation or
 * Membership yet.
 *
 * Canonical flow:
 *
 *   1. Authenticate Supabase user.
 *   2. Resolve/create Person through auth_credentials.
 *   3. Save Person name.
 *   4. Resolve existing Organisation OR create one.
 *   5. Verify/create membership.
 *   6. Optionally establish SELF_DECLARED ownership.
 *   7. Return canonical identity.
 */
export async function POST(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATE CALLER
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

    // -------------------------------------------------------------------------
    // 2. SERVICE CLIENT
    // -------------------------------------------------------------------------
    //
    // Authentication has already been established through getAuthUser().
    //
    // V2 service client is used for privileged canonical identity writes.
    //

    const supabase = createServiceClientV2();

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

    // -------------------------------------------------------------------------
    // 4. RESOLVE / CREATE PERSON
    // -------------------------------------------------------------------------
    //
    // CANONICAL PATH:
    //
    //   auth.users.id
    //        ↓
    //   auth_credentials.auth_user_id
    //        ↓
    //   auth_credentials.person_id
    //        ↓
    //   persons.person_id
    //
    // NEVER:
    //
    //   persons.auth_user_id
    //
    // The Person table is not used as an Auth bridge.
    //

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
        '[identity/plan][POST] auth credential lookup failed:',
        credentialError,
      );

      return NextResponse.json(
        {
          error: 'Unable to resolve authentication identity',
          code: 'AUTH_CREDENTIAL_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    let personId: string;

    if (credential?.person_id) {
      // -----------------------------------------------------------------------
      // 4A. EXISTING CANONICAL AUTH → PERSON BRIDGE
      // -----------------------------------------------------------------------

      personId = credential.person_id;
    } else {
      // -----------------------------------------------------------------------
      // 4B. NO AUTH → PERSON BRIDGE
      // -----------------------------------------------------------------------
      //
      // We may locate an existing Person by email.
      //
      // Email is identity-resolution evidence only.
      // It does NOT establish organisational authority.
      //

      const email = normaliseString(user.email).toLowerCase();

      if (!email) {
        return NextResponse.json(
          {
            error: 'Authenticated account has no email address',
            code: 'AUTH_EMAIL_REQUIRED',
          },
          { status: 400 },
        );
      }

      const {
        data: personByEmail,
        error: personEmailError,
      } = await supabase
        .from('persons')
        .select('person_id, email')
        .ilike('email', email)
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
        // Existing Person found.
        personId = personByEmail.person_id;
      } else {
        // ---------------------------------------------------------------------
        // 4C. CREATE PERSON
        // ---------------------------------------------------------------------

        const {
          data: createdPerson,
          error: createPersonError,
        } = await supabase
          .from('persons')
          .insert({
            email,
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

      // -----------------------------------------------------------------------
      // 4D. CREATE CANONICAL AUTH → PERSON BRIDGE
      // -----------------------------------------------------------------------
      //
      // This is the ONLY Auth → Person bridge.
      //
      // NEVER write auth_user_id to persons.
      //

      const {
        data: existingCredential,
        error: existingCredentialError,
      } = await supabase
        .from('auth_credentials')
        .select('person_id')
        .eq('auth_user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (existingCredentialError) {
        console.error(
          '[identity/plan][POST] auth credential re-check failed:',
          existingCredentialError,
        );

        return NextResponse.json(
          {
            error: 'Unable to establish authentication identity',
            code: 'AUTH_CREDENTIAL_RECHECK_FAILED',
          },
          { status: 500 },
        );
      }

      if (existingCredential) {
        /*
         * Another request may have established the bridge concurrently.
         *
         * If it points at a different Person, fail safely rather than
         * silently reassigning the authenticated identity.
         */
        if (existingCredential.person_id !== personId) {
          return NextResponse.json(
            {
              error:
                'Authenticated identity is already linked to a different person',
              code: 'AUTH_PERSON_CONFLICT',
            },
            { status: 409 },
          );
        }
      } else {
        const {
          error: credentialInsertError,
        } = await supabase
          .from('auth_credentials')
          .insert({
            auth_user_id: user.id,
            person_id: personId,
            status: 'active',
          });

        if (credentialInsertError) {
          /*
           * A concurrent request may have inserted the same credential.
           * Re-read before treating this as fatal.
           */
          const {
            data: concurrentCredential,
          } = await supabase
            .from('auth_credentials')
            .select('person_id')
            .eq('auth_user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

          if (
            !concurrentCredential ||
            concurrentCredential.person_id !== personId
          ) {
            console.error(
              '[identity/plan][POST] auth credential creation failed:',
              credentialInsertError,
            );

            return NextResponse.json(
              {
                error:
                  'Unable to establish authentication identity',
                code: 'AUTH_CREDENTIAL_CREATE_FAILED',
              },
              { status: 500 },
            );
          }
        }
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
      const {
        error: personUpdateError,
      } = await supabase
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
    // A client-supplied UUID is NEVER treated as authority.
    //
    // Existing organisation:
    //   - must exist;
    //   - Person must already be an active member.
    //
    // New organisation:
    //   - organisation is created;
    //   - membership is then created below.
    //

    let canonicalOrganisationId: string;
    let canonicalOrganisationName: string | null = null;

    let existingMembership:
      | {
          membership_id: string;
          role: string;
          status: string;
          valid_from: string;
          valid_to: string | null;
        }
      | null = null;

    if (submittedOrganisationId) {
      // -----------------------------------------------------------------------
      // 6A. EXISTING ORGANISATION
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
      // 6B. VERIFY ACTIVE MEMBERSHIP
      // -----------------------------------------------------------------------
      //
      // A Person cannot claim an existing Organisation merely by knowing its
      // UUID.
      //

      const {
        data: membership,
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
        .order('valid_from', { ascending: false })
        .limit(1)
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

      if (!membership) {
        return NextResponse.json(
          {
            error:
              'You are not a member of that organisation',
            code: 'NOT_ORGANISATION_MEMBER',
          },
          { status: 403 },
        );
      }

      existingMembership = membership;
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
    // 7. ESTABLISH / PRESERVE MEMBERSHIP
    // -------------------------------------------------------------------------
    //
    // Membership is distinct from ownership.
    //
    // IMPORTANT:
    //
    // For an existing Organisation, preserve the existing canonical
    // membership. Do NOT downgrade an owner to member merely because the
    // current /plan request has isOwner=false.
    //
    // For a newly-created Organisation, establish the initial membership.
    //

    let membership:
      | {
          membership_id: string;
          role: string;
          status: string;
          valid_from: string;
          valid_to: string | null;
        }
      | null = existingMembership;

    if (!membership) {
      const membershipRole = isOwner
        ? 'owner'
        : 'member';

      const validFrom =
        new Date().toISOString();

      const {
        data: createdMembership,
        error: membershipError,
      } = await supabase
        .from('organisation_memberships')
        .insert({
          organisation_id:
            canonicalOrganisationId,
          person_id: personId,
          role: membershipRole,
          status: 'active',
          valid_from: validFrom,
        })
        .select(
          'membership_id, role, status, valid_from, valid_to',
        )
        .single();

      if (
        membershipError ||
        !createdMembership
      ) {
        console.error(
          '[identity/plan][POST] membership creation failed:',
          membershipError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to establish organisation membership',
            code: 'MEMBERSHIP_CREATE_FAILED',
          },
          { status: 500 },
        );
      }

      membership = createdMembership;
    }

    // -------------------------------------------------------------------------
    // 8. INITIAL SELF-DECLARED OWNERSHIP
    // -------------------------------------------------------------------------
    //
    // Ownership is independent from membership.
    //
    // It is established ONLY when the Person explicitly declares:
    //
    //   isOwner === true
    //
    // Repeated /plan visits must not create duplicate current ownership
    // periods.
    //

    if (isOwner) {
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
          error: ownershipInsertError,
        } = await supabase
          .from('ownership_periods')
          .insert({
            organisation_id:
              canonicalOrganisationId,
            person_id: personId,
            status: 'current',
            valid_from:
              membership.valid_from ||
              new Date().toISOString(),
          });

        if (ownershipInsertError) {
          /*
           * If another request created the ownership period concurrently,
           * verify before failing.
           */
          const {
            data: concurrentOwnership,
          } = await supabase
            .from('ownership_periods')
            .select('ownership_period_id')
            .eq(
              'organisation_id',
              canonicalOrganisationId,
            )
            .eq('person_id', personId)
            .eq('status', 'current')
            .maybeSingle();

          if (!concurrentOwnership) {
            console.error(
              '[identity/plan][POST] ownership claim failed:',
              ownershipInsertError,
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

        role:
          membership.role,

        membershipStatus:
          membership.status,

        validFrom:
          membership.valid_from,

        validTo:
          membership.valid_to,

        isOwner,
      },

      /*
       * Beta code is provenance/access information only.
       *
       * Its presence does NOT establish ownership.
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
        error:
          'Unable to save organisational identity',
        code: 'IDENTITY_SAVE_FAILED',
      },
      { status: 500 },
    );
  }
}