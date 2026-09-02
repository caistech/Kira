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

type CanonicalPerson = {
  person_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type CanonicalOrganisation = {
  organisation_id: string;
  legal_name: string | null;
  trading_name: string | null;
  status: string | null;
};

type CanonicalMembership = {
  membership_id: string;
  organisation_id: string;
  person_id: string;
  role: string;
  status: string;
  can_spend: boolean | null;
  valid_from: string;
  valid_to: string | null;
};

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseName(value: unknown): string {
  return normaliseString(value).replace(/\s+/g, ' ');
}

function organisationDisplayName(
  organisation: CanonicalOrganisation,
): string {
  return (
    organisation.trading_name?.trim() ||
    organisation.legal_name?.trim() ||
    ''
  );
}

function jsonError(
  error: string,
  code: string,
  status: number,
) {
  return NextResponse.json(
    {
      error,
      code,
    },
    { status },
  );
}

/**
 * GET /api/identity/plan
 *
 * Canonical identity read boundary.
 *
 * Authority:
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
 * Ownership is resolved separately through ownership_periods.
 *
 * No users.id lookup is performed here.
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
        personId: null,
        membershipId: null,
        role: null,
      });
    }

    const supabase = createServiceClientV2();

    /*
     * -----------------------------------------------------------------------
     * AUTH → PERSON
     * -----------------------------------------------------------------------
     *
     * auth_credentials is the canonical Auth → Person bridge.
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
        '[identity/plan][GET] credential lookup failed:',
        credentialError,
      );

      return jsonError(
        'Unable to resolve authenticated identity',
        'AUTH_CREDENTIAL_LOOKUP_FAILED',
        500,
      );
    }

    /*
     * No canonical Person yet.
     *
     * This is valid for an authenticated user who has not completed the
     * /plan identity boundary.
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
        membershipId: null,
        role: null,
      });
    }

    const personId = credential.person_id;

    /*
     * -----------------------------------------------------------------------
     * PERSON
     * -----------------------------------------------------------------------
     */
    const {
      data: person,
      error: personError,
    } = await supabase
      .from('persons')
      .select(
        'person_id, first_name, last_name, email',
      )
      .eq('person_id', personId)
      .maybeSingle();

    if (personError) {
      console.error(
        '[identity/plan][GET] person lookup failed:',
        personError,
      );

      return jsonError(
        'Unable to resolve person identity',
        'PERSON_LOOKUP_FAILED',
        500,
      );
    }

    if (!person) {
      return jsonError(
        'Canonical person identity not found',
        'PERSON_NOT_FOUND',
        500,
      );
    }

    /*
     * -----------------------------------------------------------------------
     * PERSON → ACTIVE MEMBERSHIP
     * -----------------------------------------------------------------------
     *
     * Use the same canonical resolution rules as lib/auth.ts.
     */
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('organisation_memberships')
      .select(
        [
          'membership_id',
          'organisation_id',
          'person_id',
          'role',
          'status',
          'can_spend',
          'valid_from',
          'valid_to',
        ].join(', '),
      )
      .eq('person_id', personId)
      .eq('status', 'active')
      .or('valid_to.is.null,valid_to.gt.now()')
      .order('valid_from', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(
        '[identity/plan][GET] membership lookup failed:',
        membershipError,
      );

      return jsonError(
        'Unable to resolve organisation membership',
        'MEMBERSHIP_LOOKUP_FAILED',
        500,
      );
    }

    /*
     * Authenticated Person without an active Organisation membership.
     *
     * This is a legitimate /plan state.
     */
    if (!membership) {
      return NextResponse.json({
        ok: true,
        signedIn: true,
        firstName: person.first_name,
        lastName: person.last_name,
        organisationId: null,
        organisationName: null,
        isOwner: false,
        personId,
        membershipId: null,
        role: null,
      });
    }

    /*
     * -----------------------------------------------------------------------
     * ORGANISATION
     * -----------------------------------------------------------------------
     *
     * IMPORTANT:
     *
     * Canonical organisations use legal_name / trading_name.
     *
     * There is no canonical organisations.name field.
     */
    const {
      data: organisation,
      error: organisationError,
    } = await supabase
      .from('organisations')
      .select(
        'organisation_id, legal_name, trading_name, status',
      )
      .eq(
        'organisation_id',
        membership.organisation_id,
      )
      .maybeSingle();

    if (organisationError) {
      console.error(
        '[identity/plan][GET] organisation lookup failed:',
        organisationError,
      );

      return jsonError(
        'Unable to resolve organisation',
        'ORGANISATION_LOOKUP_FAILED',
        500,
      );
    }

    if (!organisation) {
      return jsonError(
        'Canonical organisation not found',
        'ORGANISATION_NOT_FOUND',
        404,
      );
    }

    /*
     * -----------------------------------------------------------------------
     * OWNERSHIP
     * -----------------------------------------------------------------------
     *
     * Membership role and ownership are deliberately separate concepts.
     *
     * Ownership is temporal and lives in ownership_periods.
     */
    const {
      data: ownership,
      error: ownershipError,
    } = await supabase
      .from('ownership_periods')
      .select('ownership_period_id')
      .eq(
        'organisation_id',
        membership.organisation_id,
      )
      .eq('person_id', personId)
      .eq('status', 'current')
      .limit(1)
      .maybeSingle();

    if (ownershipError) {
      console.error(
        '[identity/plan][GET] ownership lookup failed:',
        ownershipError,
      );

      return jsonError(
        'Unable to resolve ownership',
        'OWNERSHIP_LOOKUP_FAILED',
        500,
      );
    }

    return NextResponse.json({
      ok: true,
      signedIn: true,

      firstName: person.first_name,
      lastName: person.last_name,

      organisationId:
        organisation.organisation_id,

      organisationName:
        organisationDisplayName(organisation),

      isOwner: Boolean(ownership),

      personId,
      membershipId: membership.membership_id,
      role: membership.role,
    });
  } catch (error) {
    console.error(
      '[identity/plan][GET] unexpected error:',
      error,
    );

    return jsonError(
      'Unable to resolve organisational identity',
      'IDENTITY_RESOLUTION_FAILED',
      500,
    );
  }
}

/**
 * POST /api/identity/plan
 *
 * Canonical identity-establishment boundary.
 *
 * The browser may submit descriptive information, but it does NOT establish
 * organisational authority.
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
 * Ownership:
 *
 *   organisation + person
 *        ↓
 *   ownership_periods
 *
 * IMPORTANT:
 *
 * - users.id is never used.
 * - organisation_id is never derived from users.id.
 * - organisation name is never read from organisations.name.
 * - client organisationId is only accepted when the Person is already an
 *   active member of that Organisation.
 * - a new Organisation is created only when there is no selected existing
 *   Organisation and the Person has no active canonical membership.
 */
export async function POST(request: Request) {
  try {
    /*
     * -----------------------------------------------------------------------
     * 1. AUTHENTICATE
     * -----------------------------------------------------------------------
     */
    const user = await getAuthUser();

    if (!user) {
      return jsonError(
        'Unauthorised',
        'NO_AUTHENTICATED_USER',
        401,
      );
    }

    const supabase = createServiceClientV2();

    /*
     * -----------------------------------------------------------------------
     * 2. PARSE REQUEST
     * -----------------------------------------------------------------------
     */
    let body: PlanRequestBody;

    try {
      body = (await request.json()) as PlanRequestBody;
    } catch {
      return jsonError(
        'Invalid JSON body',
        'INVALID_JSON',
        400,
      );
    }

    const firstName = normaliseName(body.firstName);
    const lastName = normaliseName(body.lastName);
    const submittedOrganisationId =
      normaliseString(body.organisationId);
    const submittedOrganisationName =
      normaliseName(body.organisationName);
    const betaCode =
      normaliseString(body.betaCode);

    const isOwner =
      typeof body.isOwner === 'boolean'
        ? body.isOwner
        : false;

    if (!firstName) {
      return jsonError(
        'Please enter your first name.',
        'FIRST_NAME_REQUIRED',
        400,
      );
    }

    if (!lastName) {
      return jsonError(
        'Please enter your last name.',
        'LAST_NAME_REQUIRED',
        400,
      );
    }

    if (!submittedOrganisationName) {
      return jsonError(
        'Please enter your business name.',
        'ORGANISATION_NAME_REQUIRED',
        400,
      );
    }

    /*
     * -----------------------------------------------------------------------
     * 3. RESOLVE PERSON THROUGH CANONICAL AUTH BRIDGE
     * -----------------------------------------------------------------------
     *
     * auth_credentials is authoritative.
     *
     * We do not use persons.auth_user_id to establish authority.
     */
    const {
      data: credential,
      error: credentialLookupError,
    } = await supabase
      .from('auth_credentials')
      .select('auth_credential_id, person_id, status')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (credentialLookupError) {
      console.error(
        '[identity/plan][POST] credential lookup failed:',
        credentialLookupError,
      );

      return jsonError(
        'Unable to resolve authenticated identity',
        'AUTH_CREDENTIAL_LOOKUP_FAILED',
        500,
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
       * ---------------------------------------------------------------------
       * 3A. RESOLVE EXISTING PERSON BY EMAIL
       * ---------------------------------------------------------------------
       *
       * This is Person deduplication only.
       *
       * It does NOT establish organisation authority.
       */
      let existingPerson: CanonicalPerson | null =
        null;

      if (user.email) {
        const {
          data: personByEmail,
          error: personEmailError,
        } = await supabase
          .from('persons')
          .select(
            'person_id, first_name, last_name, email',
          )
          .ilike('email', user.email)
          .limit(1)
          .maybeSingle();

        if (personEmailError) {
          console.error(
            '[identity/plan][POST] person email lookup failed:',
            personEmailError,
          );

          return jsonError(
            'Unable to resolve person identity',
            'PERSON_LOOKUP_FAILED',
            500,
          );
        }

        existingPerson =
          personByEmail ?? null;
      }

      if (existingPerson) {
        personId = existingPerson.person_id;
      } else {
        /*
         * -------------------------------------------------------------------
         * 3B. CREATE PERSON
         * -------------------------------------------------------------------
         *
         * Person is a human identity.
         *
         * The canonical Auth → Person relationship is established in
         * auth_credentials below.
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
          .select(
            'person_id, first_name, last_name, email',
          )
          .single();

        if (createPersonError || !createdPerson) {
          console.error(
            '[identity/plan][POST] person creation failed:',
            createPersonError,
          );

          return jsonError(
            'Unable to create person identity',
            'PERSON_CREATE_FAILED',
            500,
          );
        }

        personId = createdPerson.person_id;
      }

      /*
       * ---------------------------------------------------------------------
       * 3C. ESTABLISH AUTH → PERSON CANONICAL BRIDGE
       * ---------------------------------------------------------------------
       */
      const {
        data: existingCredential,
        error: existingCredentialError,
      } = await supabase
        .from('auth_credentials')
        .select(
          'auth_credential_id, person_id, status',
        )
        .eq('auth_user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (existingCredentialError) {
        console.error(
          '[identity/plan][POST] credential re-check failed:',
          existingCredentialError,
        );

        return jsonError(
          'Unable to establish authenticated identity',
          'AUTH_CREDENTIAL_LOOKUP_FAILED',
          500,
        );
      }

      if (existingCredential) {
        /*
         * Repair an existing credential only if it does not represent the
         * canonical Person we have just resolved.
         */
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
              '[identity/plan][POST] credential repair failed:',
              credentialRepairError,
            );

            return jsonError(
              'Unable to establish authenticated identity',
              'AUTH_CREDENTIAL_UPDATE_FAILED',
              500,
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
            '[identity/plan][POST] credential creation failed:',
            createCredentialError,
          );

          return jsonError(
            'Unable to establish authenticated identity',
            'AUTH_CREDENTIAL_CREATE_FAILED',
            500,
          );
        }
      }
    }

    /*
     * -----------------------------------------------------------------------
     * 4. UPDATE PERSON
     * -----------------------------------------------------------------------
     */
    const {
      error: personUpdateError,
    } = await supabase
      .from('persons')
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq('person_id', personId);

    if (personUpdateError) {
      console.error(
        '[identity/plan][POST] person update failed:',
        personUpdateError,
      );

      return jsonError(
        'Unable to save person identity',
        'PERSON_UPDATE_FAILED',
        500,
      );
    }

    /*
     * -----------------------------------------------------------------------
     * 5. RESOLVE CURRENT CANONICAL ORGANISATION CONTEXT
     * -----------------------------------------------------------------------
     *
     * This is deliberately resolved from the canonical chain.
     *
     * The browser's organisationId is NOT authority.
     */
    const currentContext =
      await getCurrentOrganisationContext();

    /*
     * -----------------------------------------------------------------------
     * 6. RESOLVE / CREATE ORGANISATION
     * -----------------------------------------------------------------------
     */
    let canonicalOrganisationId: string;
    let canonicalOrganisationName: string;
    let existingMembership: CanonicalMembership | null =
      null;

    if (submittedOrganisationId) {
      /*
       * ---------------------------------------------------------------------
       * EXISTING ORGANISATION REQUEST
       * ---------------------------------------------------------------------
       *
       * A submitted organisation ID is acceptable only if:
       *
       *   1. the organisation exists; and
       *   2. this Person has an active membership in it.
       *
       * This prevents the browser from selecting an arbitrary tenant.
       */
      const {
        data: organisation,
        error: organisationLookupError,
      } = await supabase
        .from('organisations')
        .select(
          'organisation_id, legal_name, trading_name, status',
        )
        .eq(
          'organisation_id',
          submittedOrganisationId,
        )
        .maybeSingle();

      if (organisationLookupError) {
        console.error(
          '[identity/plan][POST] organisation lookup failed:',
          organisationLookupError,
        );

        return jsonError(
          'Unable to resolve organisation',
          'ORGANISATION_LOOKUP_FAILED',
          500,
        );
      }

      if (!organisation) {
        return jsonError(
          'Organisation not found',
          'ORGANISATION_NOT_FOUND',
          404,
        );
      }

      /*
       * Verify Person → Organisation relationship.
       */
      const {
        data: membership,
        error: membershipLookupError,
      } = await supabase
        .from('organisation_memberships')
        .select(
          [
            'membership_id',
            'organisation_id',
            'person_id',
            'role',
            'status',
            'can_spend',
            'valid_from',
            'valid_to',
          ].join(', '),
        )
        .eq(
          'organisation_id',
          organisation.organisation_id,
        )
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

        return jsonError(
          'Unable to verify organisation membership',
          'MEMBERSHIP_LOOKUP_FAILED',
          500,
        );
      }

      if (!membership) {
        return jsonError(
          'You are not a member of that organisation',
          'NOT_ORGANISATION_MEMBER',
          403,
        );
      }

      existingMembership =
        membership as CanonicalMembership;

      canonicalOrganisationId =
        organisation.organisation_id;

      canonicalOrganisationName =
        organisationDisplayName(organisation);
    } else if (currentContext) {
      /*
       * ---------------------------------------------------------------------
       * EXISTING CANONICAL CONTEXT
       * ---------------------------------------------------------------------
       *
       * If the Person already has an active canonical Organisation context,
       * that context wins.
       *
       * We do NOT create a second Organisation merely because the browser
       * supplied a name.
       */
      canonicalOrganisationId =
        currentContext.organisationId;

      const {
        data: organisation,
        error: organisationLookupError,
      } = await supabase
        .from('organisations')
        .select(
          'organisation_id, legal_name, trading_name, status',
        )
        .eq(
          'organisation_id',
          canonicalOrganisationId,
        )
        .maybeSingle();

      if (organisationLookupError) {
        console.error(
          '[identity/plan][POST] current organisation lookup failed:',
          organisationLookupError,
        );

        return jsonError(
          'Unable to resolve current organisation',
          'ORGANISATION_LOOKUP_FAILED',
          500,
        );
      }

      if (!organisation) {
        return jsonError(
          'Current organisation not found',
          'ORGANISATION_NOT_FOUND',
          500,
        );
      }

      canonicalOrganisationName =
        organisationDisplayName(organisation);

      /*
       * The canonical context already gives us the membership.
       */
      const {
        data: membership,
        error: membershipLookupError,
      } = await supabase
        .from('organisation_memberships')
        .select(
          [
            'membership_id',
            'organisation_id',
            'person_id',
            'role',
            'status',
            'can_spend',
            'valid_from',
            'valid_to',
          ].join(', '),
        )
        .eq(
          'membership_id',
          currentContext.membershipId,
        )
        .eq('person_id', personId)
        .eq(
          'organisation_id',
          canonicalOrganisationId,
        )
        .eq('status', 'active')
        .maybeSingle();

      if (membershipLookupError) {
        console.error(
          '[identity/plan][POST] current membership lookup failed:',
          membershipLookupError,
        );

        return jsonError(
          'Unable to resolve current organisation membership',
          'MEMBERSHIP_LOOKUP_FAILED',
          500,
        );
      }

      if (!membership) {
        return jsonError(
          'Current organisation membership is no longer active',
          'MEMBERSHIP_NOT_ACTIVE',
          403,
        );
      }

      existingMembership =
        membership as CanonicalMembership;
    } else {
      /*
       * ---------------------------------------------------------------------
       * NEW ORGANISATION
       * ---------------------------------------------------------------------
       *
       * No canonical organisation membership exists.
       *
       * Therefore the explicit organisation name can establish a NEW
       * Organisation.
       *
       * We write the actual canonical organisation columns:
       *
       *   legal_name
       *   trading_name
       *
       * NOT:
       *
       *   name
       */
      const {
        data: createdOrganisation,
        error: createOrganisationError,
      } = await supabase
        .from('organisations')
        .insert({
          legal_name: submittedOrganisationName,
          trading_name: submittedOrganisationName,
        })
        .select(
          'organisation_id, legal_name, trading_name, status',
        )
        .single();

      if (createOrganisationError || !createdOrganisation) {
        console.error(
          '[identity/plan][POST] organisation creation failed:',
          createOrganisationError,
        );

        return jsonError(
          'Unable to create organisation',
          'ORGANISATION_CREATE_FAILED',
          500,
        );
      }

      canonicalOrganisationId =
        createdOrganisation.organisation_id;

      canonicalOrganisationName =
        organisationDisplayName(
          createdOrganisation,
        );
    }

    /*
     * -----------------------------------------------------------------------
     * 7. ESTABLISH / CONFIRM MEMBERSHIP
     * -----------------------------------------------------------------------
     *
     * Membership is separate from ownership.
     *
     * The canonical membership schema has:
     *
     *   organisation_id
     *   person_id
     *   role
     *   status
     *   can_spend
     *   valid_from
     *   valid_to
     *
     * Its uniqueness is:
     *
     *   UNIQUE (organisation_id, person_id, role)
     */
    let membership: CanonicalMembership;

    if (existingMembership) {
      /*
       * Existing membership is authoritative.
       *
       * Do not rewrite role merely because /plan was revisited.
       */
      membership = existingMembership;
    } else {
      const now =
        new Date().toISOString();

      const requestedRole =
        isOwner ? 'owner' : 'member';

      /*
       * First check whether this exact canonical membership already exists.
       *
       * This avoids depending on an upsert conflict target that may differ
       * from the actual live constraint.
       */
      const {
        data: membershipByKey,
        error: membershipByKeyError,
      } = await supabase
        .from('organisation_memberships')
        .select(
          [
            'membership_id',
            'organisation_id',
            'person_id',
            'role',
            'status',
            'can_spend',
            'valid_from',
            'valid_to',
          ].join(', '),
        )
        .eq(
          'organisation_id',
          canonicalOrganisationId,
        )
        .eq('person_id', personId)
        .eq('role', requestedRole)
        .limit(1)
        .maybeSingle();

      if (membershipByKeyError) {
        console.error(
          '[identity/plan][POST] membership existence lookup failed:',
          membershipByKeyError,
        );

        return jsonError(
          'Unable to resolve organisation membership',
          'MEMBERSHIP_LOOKUP_FAILED',
          500,
        );
      }

      if (membershipByKey) {
        /*
         * Reactivate only if the same canonical membership already exists.
         *
         * This does not manufacture a new membership identity.
         */
        if (
          membershipByKey.status !== 'active'
        ) {
          const {
            data: reactivatedMembership,
            error: reactivationError,
          } = await supabase
            .from('organisation_memberships')
            .update({
              status: 'active',
            })
            .eq(
              'membership_id',
              membershipByKey.membership_id,
            )
            .select(
              [
                'membership_id',
                'organisation_id',
                'person_id',
                'role',
                'status',
                'can_spend',
                'valid_from',
                'valid_to',
              ].join(', '),
            )
            .single();

          if (
            reactivationError ||
            !reactivatedMembership
          ) {
            console.error(
              '[identity/plan][POST] membership reactivation failed:',
              reactivationError,
            );

            return jsonError(
              'Unable to establish organisation membership',
              'MEMBERSHIP_UPDATE_FAILED',
              500,
            );
          }

          membership =
            reactivatedMembership as CanonicalMembership;
        } else {
          membership =
            membershipByKey as CanonicalMembership;
        }
      } else {
        /*
         * New canonical membership.
         *
         * can_spend deliberately uses the schema's default rather than
         * inventing a commercial permission in this route.
         */
        const {
          data: createdMembership,
          error: membershipCreateError,
        } = await supabase
          .from('organisation_memberships')
          .insert({
            organisation_id:
              canonicalOrganisationId,
            person_id: personId,
            role: requestedRole,
            status: 'active',
            valid_from: now,
          })
          .select(
            [
              'membership_id',
              'organisation_id',
              'person_id',
              'role',
              'status',
              'can_spend',
              'valid_from',
              'valid_to',
            ].join(', '),
          )
          .single();

        if (
          membershipCreateError ||
          !createdMembership
        ) {
          console.error(
            '[identity/plan][POST] membership creation failed:',
            membershipCreateError,
          );

          return jsonError(
            'Unable to establish organisation membership',
            'MEMBERSHIP_CREATE_FAILED',
            500,
          );
        }

        membership =
          createdMembership as CanonicalMembership;
      }
    }

    /*
     * -----------------------------------------------------------------------
     * 8. SELF-DECLARED OWNERSHIP
     * -----------------------------------------------------------------------
     *
     * Ownership is temporal and separate from membership.
     *
     * We only create a current ownership period when the Person explicitly
     * declares ownership.
     */
    if (isOwner) {
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

        return jsonError(
          'Unable to verify ownership declaration',
          'OWNERSHIP_LOOKUP_FAILED',
          500,
        );
      }

      if (!existingOwnership) {
        const {
          error: ownershipCreateError,
        } = await supabase
          .from('ownership_periods')
          .insert({
            organisation_id:
              canonicalOrganisationId,
            person_id: personId,
            status: 'current',
            valid_from:
              new Date().toISOString(),
          });

        if (ownershipCreateError) {
          console.error(
            '[identity/plan][POST] ownership creation failed:',
            ownershipCreateError,
          );

          return jsonError(
            'Unable to save ownership declaration',
            'OWNERSHIP_CREATE_FAILED',
            500,
          );
        }
      }
    }

    /*
     * -----------------------------------------------------------------------
     * 9. RETURN CANONICAL IDENTITY
     * -----------------------------------------------------------------------
     */
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
      },

      betaCode:
        betaCode || undefined,
    });
  } catch (error) {
    console.error(
      '[identity/plan][POST] unexpected error:',
      error,
    );

    return jsonError(
      'Unable to save organisational identity',
      'IDENTITY_SAVE_FAILED',
      500,
    );
  }
}