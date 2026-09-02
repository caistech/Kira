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
 * GET /api/identity/plan
 *
 * Existing authenticated users are resolved exclusively through the
 * canonical identity chain:
 *
 *   Supabase Auth
 *      ↓
 *   auth_credentials
 *      ↓
 *   persons
 *      ↓
 *   organisation_memberships
 *      ↓
 *   organisations
 *
 * Anonymous/new users receive a normal empty identity response rather than
 * an error. POST remains responsible for establishing the canonical identity.
 */
export async function GET() {
  try {
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
      });
    }

    const ctx = await getCurrentOrganisationContext();

    /*
     * Authenticated but not yet associated with an active organisation.
     *
     * This is a valid /plan state for a newly established Person.
     */
    if (!ctx) {
      const supabase = createServiceClientV2();

      const { data: person, error: personError } = await supabase
        .from('persons')
        .select('person_id, first_name, last_name')
        .eq('auth_user_id', user.id)
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
        personId: person?.person_id ?? null,
      });
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
 * Client-supplied organisationId is NEVER authority.
 *
 * If supplied, it must already be an organisation in which this Person
 * has an active membership.
 *
 * If absent, a new Organisation is created and the Person is made a member.
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
    const submittedOrganisationId = normaliseString(body.organisationId);
    const organisationName = normaliseName(body.organisationName);
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
    // 3. RESOLVE / CREATE PERSON
    // -------------------------------------------------------------------------

    /*
     * IMPORTANT:
     *
     * auth_credentials is the canonical Auth → Person bridge.
     *
     * persons.auth_user_id may still exist as historical/compatibility data,
     * but it must NOT be the mechanism used to establish canonical authority.
     */

    const {
      data: credential,
      error: credentialLookupError,
    } = await supabase
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
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
      // Existing canonical Person
      // -----------------------------------------------------------------------

      personId = credential.person_id;
    } else {
      // -----------------------------------------------------------------------
      // Resolve existing Person by auth bridge, then email.
      //
      // These are Person-resolution fallbacks only.
      // They do NOT establish organisation authority.
      // -----------------------------------------------------------------------

      const {
        data: personByAuth,
        error: personAuthLookupError,
      } = await supabase
        .from('persons')
        .select('person_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (personAuthLookupError) {
        console.error(
          '[identity/plan][POST] person auth lookup failed:',
          personAuthLookupError,
        );

        return NextResponse.json(
          {
            error: 'Unable to resolve person identity',
            code: 'PERSON_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (personByAuth?.person_id) {
        personId = personByAuth.person_id;
      } else if (user.email) {
        const {
          data: personByEmail,
          error: personEmailLookupError,
        } = await supabase
          .from('persons')
          .select('person_id')
          .ilike('email', user.email)
          .maybeSingle();

        if (personEmailLookupError) {
          console.error(
            '[identity/plan][POST] person email lookup failed:',
            personEmailLookupError,
          );

          return NextResponse.json(
            {
              error: 'Unable to resolve person identity',
              code: 'PERSON_LOOKUP_FAILED',
            },
            { status: 500 },
          );
        }

        if (personByEmail?.person_id) {
          personId = personByEmail.person_id;
        } else {
          // ---------------------------------------------------------------
          // Create canonical Person
          // ---------------------------------------------------------------

          const {
            data: createdPerson,
            error: createPersonError,
          } = await supabase
            .from('persons')
            .insert({
              auth_user_id: user.id,
              email: user.email,
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
        }
      } else {
        const {
          data: createdPerson,
          error: createPersonError,
        } = await supabase
          .from('persons')
          .insert({
            auth_user_id: user.id,
            email: null,
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
      }

      // -----------------------------------------------------------------------
      // ESTABLISH CANONICAL AUTH → PERSON BRIDGE
      // -----------------------------------------------------------------------

      const {
        data: existingCredential,
        error: existingCredentialError,
      } = await supabase
        .from('auth_credentials')
        .select('auth_credential_id, person_id, status')
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
            error: 'Unable to establish authenticated identity',
            code: 'AUTH_CREDENTIAL_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (existingCredential) {
        if (
          existingCredential.person_id !== personId ||
          existingCredential.status !== 'active'
        ) {
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
              existingCredential.auth_credential_id,
            );

          if (credentialRepairError) {
            console.error(
              '[identity/plan][POST] auth credential repair failed:',
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

          return NextResponse.json(
            {
              error: 'Unable to establish authenticated identity',
              code: 'AUTH_CREDENTIAL_CREATE_FAILED',
            },
            { status: 500 },
          );
        }
      }
    }

    // -------------------------------------------------------------------------
    // 4. UPDATE PERSON
    // -------------------------------------------------------------------------

    const personUpdate: Record<string, string> = {
      first_name: firstName,
      last_name: lastName,
    };

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

    // -------------------------------------------------------------------------
    // 5. RESOLVE / CREATE ORGANISATION
    // -------------------------------------------------------------------------

    let canonicalOrganisationId: string;
    let canonicalOrganisationName: string | null = null;

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

      /*
       * Client organisationId is accepted only because the canonical Person
       * already has an active membership in that Organisation.
       */
      const {
        data: existingMembership,
        error: membershipLookupError,
      } = await supabase
        .from('organisation_memberships')
        .select(
          'membership_id, organisation_id, person_id, role, status',
        )
        .eq('organisation_id', canonicalOrganisationId)
        .eq('person_id', personId)
        .eq('status', 'active')
        .or('valid_to.is.null,valid_to.gt.now()')
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

    // -------------------------------------------------------------------------
    // 6. ESTABLISH MEMBERSHIP
    // -------------------------------------------------------------------------

    const now = new Date().toISOString();

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('organisation_memberships')
      .upsert(
        {
          organisation_id: canonicalOrganisationId,
          person_id: personId,
          role: isOwner ? 'owner' : 'member',
          status: 'active',
          valid_from: now,
        },
        {
          onConflict: 'organisation_id,person_id,role',
        },
      )
      .select(
        'membership_id, organisation_id, person_id, role, status',
      )
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
    // 7. SELF-DECLARED OWNERSHIP
    // -------------------------------------------------------------------------

    if (isOwner) {
      /*
       * Ownership is temporal and separate from membership.
       *
       * Do not insert a duplicate current ownership period on every
       * submission of /plan.
       */

      const {
        data: existingOwnership,
        error: ownershipLookupError,
      } = await supabase
        .from('ownership_periods')
        .select('ownership_period_id')
        .eq('organisation_id', canonicalOrganisationId)
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
            valid_from: now,
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