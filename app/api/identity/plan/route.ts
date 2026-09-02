import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
 * Ownership is queried separately because ownership is temporal:
 *
 *   Person → Ownership Period → Organisation
 *
 * IMPORTANT:
 * - organisation_id is the organisational anchor.
 * - person_id identifies the human actor.
 * - membership_id identifies the person's organisational relationship.
 * - ownership_periods identifies ownership history/current ownership.
 * - users.id is NOT used as the organisation identity.
 */
export async function GET() {
  try {
    const context = await getCurrentOrganisationContext();

    if (!context) {
      return NextResponse.json(
        { error: 'Unauthenticated' },
        { status: 401 },
      );
    }

    const {
      organisationId,
      personId,
      membershipId,
    } = context;

    if (!organisationId || !personId || !membershipId) {
      console.error('[identity/plan] incomplete canonical identity context', {
        organisationId,
        personId,
        membershipId,
      });

      return NextResponse.json(
        { error: 'Incomplete organisation identity context' },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    /*
     * Load the four canonical dimensions independently.
     *
     * Do not collapse these into a users lookup.
     */
    const [
      organisationResult,
      personResult,
      membershipResult,
      ownershipResult,
    ] = await Promise.all([
      supabase
        .from('organisations')
        .select(
          [
            'organisation_id',
            'legal_name',
            'trading_name',
            'status',
            'created_at',
            'updated_at',
          ].join(', '),
        )
        .eq('organisation_id', organisationId)
        .maybeSingle(),

      supabase
        .from('persons')
        .select(
          [
            'person_id',
            'first_name',
            'last_name',
            'email',
            'created_at',
            'updated_at',
          ].join(', '),
        )
        .eq('person_id', personId)
        .maybeSingle(),

      supabase
        .from('organisation_memberships')
        .select(
          [
            'membership_id',
            'organisation_id',
            'person_id',
            'role',
            'status',
            'valid_from',
            'valid_to',
            'created_at',
            'updated_at',
          ].join(', '),
        )
        .eq('membership_id', membershipId)
        .eq('organisation_id', organisationId)
        .eq('person_id', personId)
        .maybeSingle(),

      supabase
        .from('ownership_periods')
        .select(
          [
            'ownership_period_id',
            'organisation_id',
            'person_id',
            'status',
            'valid_from',
            'valid_to',
            'created_at',
            'updated_at',
          ].join(', '),
        )
        .eq('organisation_id', organisationId)
        .eq('person_id', personId)
        .order('valid_from', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (organisationResult.error) {
      console.error(
        '[identity/plan] organisation lookup failed',
        organisationResult.error,
      );

      return NextResponse.json(
        { error: 'Unable to load organisation identity' },
        { status: 500 },
      );
    }

    if (personResult.error) {
      console.error(
        '[identity/plan] person lookup failed',
        personResult.error,
      );

      return NextResponse.json(
        { error: 'Unable to load person identity' },
        { status: 500 },
      );
    }

    if (membershipResult.error) {
      console.error(
        '[identity/plan] membership lookup failed',
        membershipResult.error,
      );

      return NextResponse.json(
        { error: 'Unable to load organisation membership' },
        { status: 500 },
      );
    }

    if (ownershipResult.error) {
      console.error(
        '[identity/plan] ownership lookup failed',
        ownershipResult.error,
      );

      return NextResponse.json(
        { error: 'Unable to load ownership history' },
        { status: 500 },
      );
    }

    const organisation = organisationResult.data;
    const person = personResult.data;
    const membership = membershipResult.data;
    const ownershipPeriod = ownershipResult.data;

    /*
     * The context resolver has already established the canonical
     * organisation/person/membership relationship.
     *
     * We still fail closed if the canonical rows cannot be found.
     */
    if (!organisation) {
      return NextResponse.json(
        { error: 'Canonical organisation not found' },
        { status: 403 },
      );
    }

    if (!person) {
      return NextResponse.json(
        { error: 'Canonical person not found' },
        { status: 403 },
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'Canonical organisation membership not found' },
        { status: 403 },
      );
    }

    /*
     * Ownership is intentionally nullable.
     *
     * A Person can be a legitimate member without being an owner.
     * The absence of an ownership period must therefore NOT be treated
     * as an identity failure.
     */
    return NextResponse.json({
      identity: {
        organisation: {
          id: organisation.organisation_id,
          legalName: organisation.legal_name ?? null,
          tradingName: organisation.trading_name ?? null,
          status: organisation.status ?? null,
        },

        person: {
          id: person.person_id,
          firstName: person.first_name ?? null,
          lastName: person.last_name ?? null,
          email: person.email ?? null,
        },

        membership: {
          id: membership.membership_id,
          organisationId: membership.organisation_id,
          personId: membership.person_id,
          role: membership.role ?? null,
          status: membership.status ?? null,
          validFrom: membership.valid_from ?? null,
          validTo: membership.valid_to ?? null,
        },

        ownershipPeriod: ownershipPeriod
          ? {
              id: ownershipPeriod.ownership_period_id,
              organisationId: ownershipPeriod.organisation_id,
              personId: ownershipPeriod.person_id,
              status: ownershipPeriod.status ?? null,
              validFrom: ownershipPeriod.valid_from ?? null,
              validTo: ownershipPeriod.valid_to ?? null,
            }
          : null,
      },

      /*
       * Keep the canonical IDs available to the Plan flow.
       * These are explicit projections, not replacement semantics.
       */
      organisationId,
      personId,
      membershipId,
    });
  } catch (error) {
    console.error('[identity/plan] unexpected error', error);

    return NextResponse.json(
      { error: 'Unable to resolve canonical identity' },
      { status: 500 },
    );
  }
}