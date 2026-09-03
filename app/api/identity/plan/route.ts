// app/api/identity/plan/route.ts
//
// CANONICAL IDENTITY BOUNDARY
// ---------------------------
//
// /plan is the single convergence point for application identity.
//
// The canonical chain is:
//
//   Supabase Auth
//        ↓
//   auth_credentials
//        ↓
//   persons
//        ↓
//   organisations
//        ↓
//   organisation_memberships
//        ↓
//   ownership_periods
//
// Beta is NOT an alternative identity path.
//
// A beta code can:
//   - prove invitation/provisioning provenance;
//   - grant beta entitlement;
//
// but it cannot:
//   - define Organisation identity;
//   - define Person identity;
//   - define membership;
//   - define ownership.
//
// For beta users:
//
//   /api/beta/redeem
//        ↓
//   Auth account
//        ↓
//   /plan
//        ↓
//   canonical Organisation
//        ↓
//   beta entitlement
//
// Client-supplied organisationId is never authority.
//
// If supplied, it must already be an Organisation in which this Person has
// an active membership.
//
// If absent, a new Organisation is created.

import { NextResponse } from 'next/server';

import {
  getCurrentOrganisationContext,
  getAuthUser,
} from '@/lib/auth';

import { createServiceClientV2 } from '@/lib/supabase/server';

import { getBetaGate } from '@/lib/billing';

import { TERMS_VERSION } from '@/lib/terms';

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
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function normaliseName(value: unknown): string {
  return normaliseString(value).replace(
    /\s+/g,
    ' ',
  );
}

/**
 * Normalise a beta code for direct database comparison.
 *
 * beta-codes.ts performs the authoritative normalisation when validating and
 * claiming a code. This local normalisation mirrors the established wire
 * format:
 *
 *   KIRA-XXXX-XXXX
 *
 * into the stored alphanumeric form.
 *
 * IMPORTANT:
 *
 * This function is used only for a post-redemption provenance lookup.
 * It never establishes Organisation authority.
 */
function normaliseBetaCodeForLookup(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Resolve the legacy users.id bridge for the authenticated Auth identity.
 *
 * This is provenance/compatibility only.
 *
 * It is never used as Organisation authority.
 */
async function getLegacyUserId(
  supabase: ReturnType<typeof createServiceClientV2>,
  authUserId: string,
  email: string | null,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    console.warn(
      '[identity/plan] legacy users bridge lookup failed:',
      error.message,
    );

    return null;
  }

  if (data?.id) {
    return data.id;
  }

  if (!email) {
    return null;
  }

  const { data: byEmail, error: emailError } =
    await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

  if (emailError) {
    console.warn(
      '[identity/plan] legacy users email lookup failed:',
      emailError.message,
    );

    return null;
  }

  return byEmail?.id ?? null;
}

/**
 * Determine whether the supplied betaCode was actually redeemed for this
 * authenticated account.
 *
 * The code must be:
 *
 *   - present;
 *   - redeemed;
 *   - bound to this Auth identity OR its legacy users.id bridge.
 *
 * We deliberately do NOT trust beta_codes.organisation_id to select the
 * canonical Organisation.
 *
 * The canonical Organisation is determined by the normal /plan flow.
 */
async function isBetaCodeBoundToAuthenticatedUser(
  supabase: ReturnType<typeof createServiceClientV2>,
  betaCode: string,
  authUserId: string,
  email: string | null,
): Promise<boolean> {
  const code = normaliseBetaCodeForLookup(
    betaCode,
  );

  if (!code) {
    return false;
  }

  const { data, error } = await supabase
    .from('beta_codes')
    .select(
      'code, email, redeemed_at, redeemed_user_id',
    )
    .eq('code', code)
    .maybeSingle();

  if (error) {
    console.error(
      '[identity/plan] beta provenance lookup failed:',
      error,
    );

    return false;
  }

  if (!data?.redeemed_at) {
    return false;
  }

  if (
    typeof data.email === 'string' &&
    email &&
    data.email.toLowerCase() !== email.toLowerCase()
  ) {
    return false;
  }

  const legacyUserId = await getLegacyUserId(
    supabase,
    authUserId,
    email,
  );

  /*
   * redeem.ts stores:
   *
   *   legacy users.id when available
   *   otherwise auth.users.id
   *
   * Accept either because both are explicitly provenance bridges.
   */
  return (
    data.redeemed_user_id === authUserId ||
    (!!legacyUserId &&
      data.redeemed_user_id === legacyUserId)
  );
}

/**
 * Apply the beta entitlement to the already-resolved canonical Organisation.
 *
 * IMPORTANT:
 *
 * This function receives the canonical Organisation ID from /plan.
 *
 * It does not derive Organisation from:
 *   - beta code;
 *   - email;
 *   - Auth user ID;
 *   - users.id.
 */
async function ensureBetaEntitlement(
  supabase: ReturnType<typeof createServiceClientV2>,
  betaCode: string,
  authUserId: string,
  email: string | null,
  organisationId: string,
): Promise<boolean> {
  const bound = await isBetaCodeBoundToAuthenticatedUser(
    supabase,
    betaCode,
    authUserId,
    email,
  );

  if (!bound) {
    return false;
  }

  try {
    await getBetaGate().ensureTrial(
      organisationId,
    );

    return true;
  } catch (error) {
    /*
     * Identity has already been established.
     *
     * Entitlement failure must not cause the user to retry account creation.
     *
     * The caller receives a successful identity response with beta entitlement
     * reported as false so the application can retry entitlement separately.
     */
    console.error(
      '[identity/plan] beta entitlement failed:',
      error,
    );

    return false;
  }
}

/**
 * GET /api/identity/plan
 *
 * Resolve existing authenticated identity through the canonical chain.
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

    const ctx =
      await getCurrentOrganisationContext();

    /*
     * Authenticated but not yet associated with an active Organisation.
     *
     * This is a valid /plan state for a newly established Person.
     */
    if (!ctx) {
      const supabase =
        createServiceClientV2();

      /*
       * Resolve Person through the canonical auth_credentials bridge.
       *
       * persons has no auth_user_id column; the Auth identity → Person
       * mapping lives in auth_credentials (auth_user_id → person_id).
       */
      const {
        data: credential,
        error: credentialError,
      } = await supabase
        .from('auth_credentials')
        .select('person_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (credentialError) {
        console.error(
          '[identity/plan][GET] auth_credentials lookup failed:',
          credentialError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to resolve person identity',
            code: 'PERSON_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      const credentialPersonId =
        credential?.person_id ?? null;

      let firstName: string | null = null;
      let lastName: string | null = null;
      let personId: string | null =
        credentialPersonId;

      if (credentialPersonId) {
        const {
          data: person,
          error: personError,
        } = await supabase
          .from('persons')
          .select(
            'person_id, first_name, last_name',
          )
          .eq('person_id', credentialPersonId)
          .maybeSingle();

        if (personError) {
          console.error(
            '[identity/plan][GET] person lookup failed:',
            personError,
          );

          return NextResponse.json(
            {
              error:
                'Unable to resolve person identity',
              code: 'PERSON_LOOKUP_FAILED',
            },
            { status: 500 },
          );
        }

        firstName = person?.first_name ?? null;
        lastName = person?.last_name ?? null;
        personId = person?.person_id ?? credentialPersonId;
      }

      return NextResponse.json({
        ok: true,
        signedIn: true,
        firstName,
        lastName,
        organisationId: null,
        organisationName: null,
        isOwner: false,
        personId,
      });
    }

    const supabase =
      createServiceClientV2();

    const {
      data: organisation,
      error: organisationError,
    } = await supabase
      .from('organisations')
      .select(
        'organisation_id, legal_name',
      )
      .eq(
        'organisation_id',
        ctx.organisationId,
      )
      .maybeSingle();

    if (organisationError) {
      console.error(
        '[identity/plan][GET] organisation lookup failed:',
        organisationError,
      );

      return NextResponse.json(
        {
          error:
            'Unable to resolve organisation',
          code:
            'ORGANISATION_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    if (!organisation) {
      return NextResponse.json(
        {
          error: 'Organisation not found',
          code:
            'ORGANISATION_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    const {
      data: ownership,
      error: ownershipError,
    } = await supabase
      .from('ownership_periods')
      .select(
        'ownership_period_id',
      )
      .eq(
        'organisation_id',
        ctx.organisationId,
      )
      .eq(
        'person_id',
        ctx.personId,
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

    const {
      data: person,
      error: personError,
    } = await supabase
      .from('persons')
      .select(
        'person_id, first_name, last_name',
      )
      .eq(
        'person_id',
        ctx.personId,
      )
      .maybeSingle();

    if (personError) {
      console.error(
        '[identity/plan][GET] person lookup failed:',
        personError,
      );

      return NextResponse.json(
        {
          error:
            'Unable to resolve person identity',
          code:
            'PERSON_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      signedIn: true,
      firstName:
        person?.first_name ?? null,
      lastName:
        person?.last_name ?? null,
      organisationId:
        organisation.organisation_id,
      organisationName:
        organisation.legal_name ?? null,
      isOwner: Boolean(ownership),
      personId: ctx.personId,
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
 * Establish canonical identity and, when a valid redeemed beta invitation is
 * supplied, attach the beta entitlement to the resulting canonical
 * Organisation.
 */
export async function POST(
  request: Request,
) {
  try {
    // -----------------------------------------------------------------------
    // 1. AUTHENTICATE
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // 2. READ REQUEST
    // -----------------------------------------------------------------------

    let body: PlanRequestBody;

    try {
      body =
        (await request.json()) as PlanRequestBody;
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON body',
          code: 'INVALID_JSON',
        },
        { status: 400 },
      );
    }

    const firstName =
      normaliseName(body.firstName);

    const lastName =
      normaliseName(body.lastName);

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

    // -----------------------------------------------------------------------
    // 3. RESOLVE / CREATE PERSON
    // -----------------------------------------------------------------------

    const {
      data: credential,
      error: credentialLookupError,
    } = await supabase
      .from('auth_credentials')
      .select('person_id')
      .eq(
        'auth_user_id',
        user.id,
      )
      .eq(
        'status',
        'active',
      )
      .limit(1)
      .maybeSingle();

    if (credentialLookupError) {
      console.error(
        '[identity/plan][POST] auth credential lookup failed:',
        credentialLookupError,
      );

      return NextResponse.json(
        {
          error:
            'Unable to resolve authenticated identity',
          code:
            'AUTH_CREDENTIAL_LOOKUP_FAILED',
        },
        { status: 500 },
      );
    }

    let personId: string;

    if (credential?.person_id) {
      personId = credential.person_id;
    } else if (user.email) {
      const {
        data: personByEmail,
        error:
          personEmailLookupError,
      } = await supabase
        .from('persons')
        .select('person_id')
        .ilike(
          'email',
          user.email,
        )
        .maybeSingle();

      if (personEmailLookupError) {
        console.error(
          '[identity/plan][POST] person email lookup failed:',
          personEmailLookupError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to resolve person identity',
            code:
              'PERSON_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (personByEmail?.person_id) {
        personId =
          personByEmail.person_id;
      } else {
        const {
          data: createdPerson,
          error:
            createPersonError,
        } = await supabase
          .from('persons')
          .insert({
            email: user.email,
            first_name: firstName,
            last_name: lastName,
          })
          .select('person_id')
          .single();

        if (
          createPersonError ||
          !createdPerson
        ) {
          console.error(
            '[identity/plan][POST] person creation failed:',
            createPersonError,
          );

          return NextResponse.json(
            {
              error:
                'Unable to create person identity',
              code:
                'PERSON_CREATE_FAILED',
            },
            { status: 500 },
          );
        }

        personId =
          createdPerson.person_id;
      }
    } else {
      const {
        data: createdPerson,
        error:
          createPersonError,
      } = await supabase
        .from('persons')
        .insert({
          email: null,
          first_name: firstName,
          last_name: lastName,
        })
        .select('person_id')
        .single();

      if (
        createPersonError ||
        !createdPerson
      ) {
        console.error(
          '[identity/plan][POST] person creation failed:',
          createPersonError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to create person identity',
            code:
              'PERSON_CREATE_FAILED',
          },
          { status: 500 },
        );
      }

      personId =
        createdPerson.person_id;
    }

    // ---------------------------------------------------------------------    
    // ESTABLISH AUTH → PERSON BRIDGE
      // ---------------------------------------------------------------------

      const {
        data: existingCredential,
        error:
          existingCredentialError,
      } = await supabase
        .from('auth_credentials')
        .select(
          'auth_credential_id, person_id, status',
        )
        .eq(
          'auth_user_id',
          user.id,
        )
        .limit(1)
        .maybeSingle();

      if (existingCredentialError) {
        console.error(
          '[identity/plan][POST] auth credential re-check failed:',
          existingCredentialError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to establish authenticated identity',
            code:
              'AUTH_CREDENTIAL_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (existingCredential) {
        if (
          existingCredential.person_id !==
            personId ||
          existingCredential.status !==
            'active'
        ) {
          const {
            error:
              credentialRepairError,
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

          if (
            credentialRepairError
          ) {
            console.error(
              '[identity/plan][POST] auth credential repair failed:',
              credentialRepairError,
            );

            return NextResponse.json(
              {
                error:
                  'Unable to establish authenticated identity',
                code:
                  'AUTH_CREDENTIAL_UPDATE_FAILED',
              },
              { status: 500 },
            );
          }
        }
      } else {
        const {
          error:
            createCredentialError,
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
              error:
                'Unable to establish authenticated identity',
              code:
                'AUTH_CREDENTIAL_CREATE_FAILED',
            },
            { status: 500 },
          );
        }
      }

    // -----------------------------------------------------------------------    
    // 4. UPDATE PERSON
    // -----------------------------------------------------------------------

    const personUpdate: Record<
      string,
      string
    > = {
      first_name: firstName,
      last_name: lastName,
    };

    const {
      error: personUpdateError,
    } = await supabase
      .from('persons')
      .update(personUpdate)
      .eq(
        'person_id',
        personId,
      );

    if (personUpdateError) {
      console.error(
        '[identity/plan][POST] person update failed:',
        personUpdateError,
      );

      return NextResponse.json(
        {
          error:
            'Unable to save person identity',
          code:
            'PERSON_UPDATE_FAILED',
        },
        { status: 500 },
      );
    }

    // -----------------------------------------------------------------------
    // 5. RESOLVE / CREATE ORGANISATION
    // -----------------------------------------------------------------------

    let canonicalOrganisationId: string;
    let canonicalOrganisationName:
      | string
      | null = null;

    if (submittedOrganisationId) {
      // ---------------------------------------------------------------------
      // EXISTING ORGANISATION
      // ---------------------------------------------------------------------

      const {
        data: organisation,
        error:
          organisationError,
      } = await supabase
        .from('organisations')
        .select(
          'organisation_id, legal_name',
        )
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
            error:
              'Unable to resolve organisation',
            code:
              'ORGANISATION_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (!organisation) {
        return NextResponse.json(
          {
            error:
              'Organisation not found',
            code:
              'ORGANISATION_NOT_FOUND',
          },
          { status: 404 },
        );
      }

      canonicalOrganisationId =
        organisation.organisation_id;

      canonicalOrganisationName =
        organisation.legal_name ?? null;

      /*
       * Client organisationId is accepted only because the Person already has
       * an active membership in that Organisation.
       */
      const {
        data: existingMembership,
        error:
          membershipLookupError,
      } = await supabase
        .from(
          'organisation_memberships',
        )
        .select(
          'membership_id, organisation_id, person_id, role, status',
        )
        .eq(
          'organisation_id',
          canonicalOrganisationId,
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

      if (membershipLookupError) {
        console.error(
          '[identity/plan][POST] membership lookup failed:',
          membershipLookupError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to verify organisation membership',
            code:
              'MEMBERSHIP_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (!existingMembership) {
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
    } else {
      // ---------------------------------------------------------------------
      // NEW ORGANISATION
      // ---------------------------------------------------------------------

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
        error:
          createOrganisationError,
      } = await supabase
        .from('organisations')
        .insert({
          legal_name: organisationName,
        })
        .select(
          'organisation_id, legal_name',
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

      canonicalOrganisationId =
        createdOrganisation.organisation_id;

      canonicalOrganisationName =
        createdOrganisation.legal_name ?? null;
    }

    // -----------------------------------------------------------------------
    // 6. ESTABLISH MEMBERSHIP
    // -----------------------------------------------------------------------

    const now =
      new Date().toISOString();

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from(
        'organisation_memberships',
      )
      .upsert(
        {
          organisation_id:
            canonicalOrganisationId,
          person_id: personId,
          role: isOwner
            ? 'owner'
            : 'member',
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
      .single();

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
          code:
            'MEMBERSHIP_UPDATE_FAILED',
        },
        { status: 500 },
      );
    }

    // -----------------------------------------------------------------------
    // 7. SELF-DECLARED OWNERSHIP
    // -----------------------------------------------------------------------

    if (isOwner) {
      const {
        data: existingOwnership,
        error:
          ownershipLookupError,
      } = await supabase
        .from(
          'ownership_periods',
        )
        .select(
          'ownership_period_id',
        )
        .eq(
          'organisation_id',
          canonicalOrganisationId,
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
          '[identity/plan][POST] ownership lookup failed:',
          ownershipLookupError,
        );

        return NextResponse.json(
          {
            error:
              'Unable to verify ownership declaration',
            code:
              'OWNERSHIP_LOOKUP_FAILED',
          },
          { status: 500 },
        );
      }

      if (!existingOwnership) {
        const {
          error: ownershipError,
        } = await supabase
          .from(
            'ownership_periods',
          )
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
              code:
                'OWNERSHIP_CLAIM_FAILED',
            },
            { status: 500 },
          );
        }
      }
    }

    // -----------------------------------------------------------------------
    // 8. BETA ENTITLEMENT
    // -----------------------------------------------------------------------
    //
    // This is deliberately AFTER canonical Organisation establishment.
    //
    // betaCode is provenance/access evidence.
    //
    // canonicalOrganisationId is the identity authority.
    //

    let betaEntitled = false;

    if (betaCode) {
      betaEntitled =
        await ensureBetaEntitlement(
          supabase,
          betaCode,
          user.id,
          user.email ?? null,
          canonicalOrganisationId,
        );
    }

    // -----------------------------------------------------------------------
    // 9. RETURN CANONICAL IDENTITY
    // -----------------------------------------------------------------------

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
       * betaCode is retained as provenance information for the client.
       *
       * It is NOT an identity authority.
       */
      betaCode:
        betaCode || undefined,

      /*
       * Explicitly tell the caller whether the verified beta invitation
       * resulted in an entitlement attempt/success.
       *
       * This prevents the client from assuming that simply supplying a string
       * called betaCode means beta access was granted.
       */
      betaEntitled,
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