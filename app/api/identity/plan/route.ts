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

type PersonRow = {
  person_id: string;
  first_name: string | null;
  last_name: string | null;
};

type OrganisationRow = {
  organisation_id: string;
  name: string | null;
};

type MembershipRow = {
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
 * GET /api/identity/plan
 *
 * Canonical identity resolution:
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
 * This route does NOT use persons.auth_user_id.
 *
 * auth_credentials is the canonical Auth → Person bridge.
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

    const supabase = createServiceClientV2();

    /*
     * Resolve the Person exclusively through auth_credentials.
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

    /*
     * Authenticated user may legitimately have no canonical Person yet.
     *
     * POST /api/identity/plan is responsible for establishing that identity.
     */
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
      });
    }

    const personId = credential.person_id;

    /*
     * Resolve Person.
     */
    const {
      data: person,
      error: personError,
    } = await supabase
      .from('persons')
      .select('person_id, first_name, last_name')
      .eq('person_id', personId)
      .maybeSingle<PersonRow>();

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
          error: 'Person identity not found',
          code: 'PERSON_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    /*
     * Resolve current canonical organisation context.
     *
     * getCurrentOrganisationContext() is the authority for which
     * Organisation this authenticated Person is currently acting for.
     */
    const ctx = await getCurrentOrganisationContext();

    if (!ctx) {
      return NextResponse.json({
        ok: true,
        signedIn: true,
        firstName: person.first_name,
        lastName: person.last_name,
        organisationId: null,
        organisationName: null,
        isOwner: false,
        personId: person.person_id,
      });
    }

    /*
     * Resolve Organisation.
     */
    const {
      data: organisation,
      error: organisationError,
    } = await supabase
      .from('organisations')
      .select('organisation_id, name')
      .eq('organisation_id', ctx.organisationId)
      .maybeSingle<OrganisationRow>();

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
     * Ownership is separate from membership.
     *
     * Current ownership is established through ownership_periods.
     */
    const {
      data: ownership,
      error: ownershipError,
    } = await supabase
      .from('ownership_periods')
      .select('ownership_period_id')
      .eq('organisation_id', ctx.organisationId)
      .eq('person_id', person.person_id)
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

      firstName: person.first_name,
      lastName: person.last_name,

      organisationId: organisation.organisation_id,
      organisationName: organisation.name,

      isOwner: Boolean(ownership),

      personId: person.person_id,
      membershipId: ctx.membershipId,
      role: ctx.role,
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
 * Rules:
 *
 * 1. Authenticated Supabase Auth user is the starting authority.
 * 2. auth_credentials is the only Auth → Person bridge.
 * 3. organisationId supplied by the browser is NEVER authority.
 * 4. An existing organisation may only be selected when the Person
 *    already has an active membership in that organisation.
 * 5. If no organisationId is supplied, a new Organisation is created.
 * 6. Membership is separate from ownership.
 * 7. Ownership is only established from the explicit isOwner assertion.
 * 8. Existing ownership periods are never duplicated.
 */
export async function POST(request: Request) {
  try {
    // =========================================================================
    // 1. AUTHENTICATE
    // =========================================================================

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

    // =========================================================================
    // 2. READ REQUEST
    // =========================================================================

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

    // =========================================================================
    // 3. RESOLVE / CREATE PERSON
    // =========================================================================

    /*
     * auth_credentials is the canonical Auth → Person bridge.
     *
     * DO NOT query:
     *
     *   persons.auth_user_id
     *
     * That column is not part of the canonical identity path.
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
      /*
       * Existing canonical Person.
       */
      personId = credential.person_id;
    } else {
      /*
       * No canonical credential exists.
       *
       * Resolve Person by email if possible.
       *
       * This is ONLY Person resolution.
       * It does not establish Organisation authority.
       */
      let existingPerson: Pick<PersonRow, 'person_id'> | null = null;

      if (user.email) {
        const {
          data: personByEmail,
          error: personEmailLookupError,
        } = await supabase
          .from('persons')
          .select('person_id')
          .ilike('email', user.email)
          .limit(1)
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

        existingPerson = personByEmail;
      }

      if (existingPerson?.person_id) {
        personId = existingPerson.person_id;
      } else {
        /*
         * Create a new canonical Person.
         *
         * IMPORTANT:
         * No auth_user_id is written to persons.
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
      }

      /*
       * Establish the canonical Auth → Person bridge.
       *
       * If a credential already appeared between the initial lookup and
       * this insert, update that credential rather than creating a duplicate.
       */
      if (credential?.auth_credential_id) {
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
      } else {
        const {
          data: createdCredential,
          error: createCredentialError,
        } = await supabase
          .from('auth_credentials')
          .insert({
            person_id: personId,
            auth_user_id: user.id,
            status: 'active',
          })
          .select('auth_credential_id')
          .single();

        if (createCredentialError || !createdCredential) {
          /*
           * A concurrent request may have created the credential.
           *
           * Re-read before treating this as a hard failure.
           */
          const {
            data: concurrentCredential,
            error: concurrentCredentialError,
          } = await supabase
            .from('auth_credentials')
            .select(
              'auth_credential_id, person_id, status',
            )
            .eq('auth_user_id', user.id)
            .limit(1)
            .maybeSingle();

          if (
            concurrentCredentialError ||
            !concurrentCredential
          ) {
            console.error(
              '[identity/plan][POST] auth credential creation failed:',
              createCredentialError,
              concurrentCredentialError,
            );

            return NextResponse.json(
              {
                error: 'Unable to establish authenticated identity',
                code: 'AUTH_CREDENTIAL_CREATE_FAILED',
              },
              { status: 500 },
            );
          }

          /*
           * Existing credential belongs to another Person.
           *
           * Do not silently reassign canonical identity.
           */
          if (
            concurrentCredential.person_id !== personId
          ) {
            console.error(
              '[identity/plan][POST] auth credential conflict:',
              {
                authUserId: user.id,
                requestedPersonId: personId,
                existingPersonId:
                  concurrentCredential.person_id,
              },
            );

            return NextResponse.json(
              {
                error:
                  'Authenticated identity is already associated with another person.',
                code: 'AUTH_CREDENTIAL_CONFLICT',
              },
              { status: 409 },
            );
          }
        }
      }
    }

    // =========================================================================
    // 4. UPDATE PERSON
    // =========================================================================

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

    // =========================================================================
    // 5. RESOLVE / CREATE ORGANISATION
    // =========================================================================

    let canonicalOrganisationId: string;
    let canonicalOrganisationName: string | null = null;

    if (submittedOrganisationId) {
      /*
       * =======================================================================
       * EXISTING ORGANISATION
       * =======================================================================
       */

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
        .maybeSingle<OrganisationRow>();

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
       * The browser supplied an organisation ID.
       *
       * That ID is NOT trusted as authority.
       *
       * We only accept it if the canonical Person already has an active
       * membership in that Organisation.
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
          organisation.organisation_id,
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
        .maybeSingle<MembershipRow>();

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

      canonicalOrganisationId =
        organisation.organisation_id;

      canonicalOrganisationName =
        organisation.name ?? null;
    } else {
      /*
       * =======================================================================
       * NEW ORGANISATION
       * =======================================================================
       */

      if (!organisationName) {
        return NextResponse.json(
          {
            error:
              'Please enter your business name',
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
        .single<OrganisationRow>();

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

    // =========================================================================
    // 6. ESTABLISH MEMBERSHIP
    // =========================================================================

    const now = new Date().toISOString();

    /*
     * For an existing organisation, membership has already been verified.
     *
     * For a new organisation, this establishes the Person's membership.
     *
     * Membership and ownership remain separate concepts.
     */
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
          role: isOwner ? 'owner' : 'member',
          status: 'active',
          valid_from: now,
        },
        {
          onConflict:
            'organisation_id,person_id,role',
        },
      )
      .select(
        'membership_id, organisation_id, person_id, role, status',
      )
      .single<MembershipRow>();

    if (
      membershipError ||
      !membership
    ) {
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

    // =========================================================================
    // 7. SELF-DECLARED OWNERSHIP
    // =========================================================================

    if (isOwner) {
      /*
       * Ownership is temporal and independent of membership.
       *
       * Do not create another current ownership period if one already exists.
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
            valid_from: now,
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

    // =========================================================================
    // 8. RETURN CANONICAL IDENTITY
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

        role: membership.role,
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
        code: 'IDENTITY_SAVE_FAILED',
      },
      { status: 500 },
    );
  }
}