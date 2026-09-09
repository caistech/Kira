// @no-voice-route: a settings form — name, password, notifications. Nothing here is a question
// worth asking out loud, and a voice surface on it would be decoration competing with the fields.
import Link from 'next/link';
import { getAuthUser, getCurrentAppUser, getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { composePostalAddress, displayName, formatAbn } from '@/lib/business-identity';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { fetchConnections, DRIVE_ACCESS_LABEL } from '@/lib/connectors/status';
import { retryIdentitySync } from '@/app/setup/business/actions';
import { getBetaGate, VOICE_ACTION, VOICE_COST_CAP_USD } from '@/lib/billing';
import { denyReason, derivePlanState } from '@/lib/billing/plan-state';
import { getSubscriptionPrice } from '@/lib/billing/subscription-price';
import { PasswordChange } from '@/components/PasswordChange';
import { DeleteAccount } from '@/components/DeleteAccount';
import { SignOutEverywhere } from '@/components/SignOutEverywhere';
import { CancelPlanButton } from '@/components/CancelPlanButton';
import { ManageBillingButton } from '@/components/ManageBillingButton';
import { UsageMeter } from '@/components/UsageMeter';
import { TeamSectionClient } from '@/components/TeamSectionClient';
import { updateProfile, updateNotifications } from './actions';

export const metadata = { title: 'Settings · Kira' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const authUser = await getAuthUser();
  const appUser = await getCurrentAppUser();
  const org = await getCurrentOrganisationContext();

  // LEGACY COMPATIBILITY BOUNDARY:
  // The settings page still reads billing and connector data from the legacy users table.
  // This lookup is isolated here — not scattered across the codebase — and should be
  // replaced when billing migrates to organisation-scoped subscriptions.
  // CanonicalPerson intentionally does NOT carry these fields.
  let legacyUser: {
    id: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_status: string | null;
    email_notifications_opt_in: boolean;
  } | null = null;
  if (authUser) {
    const svc = createServiceClientV2();
    const { data } = await svc
      .from('users')
      .select('id, stripe_customer_id, stripe_subscription_id, subscription_status, email_notifications_opt_in')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();
    legacyUser = data as { id: string; stripe_customer_id: string | null; stripe_subscription_id: string | null; subscription_status: string | null; email_notifications_opt_in: boolean } | null;
  }

  // Degrade, don't fake: a read failure omits the section rather than rendering an empty one that
  // reads as "you have no business details" and invites a pointless re-entry.
  let identity = null;
  try {
    identity = org?.organisationId ? await getBusinessIdentity(org.organisationId) : null;
  } catch (error) {
    console.error('[settings] business identity unavailable:', error);
  }

  // null means "we could not find out", which is NOT the same as "nothing is connected" — telling
  // an owner his Drive is disconnected when it is working would send him to reconnect it for nothing.
  const connections = legacyUser?.id ? await fetchConnections(legacyUser.id) : null;
  const google = connections?.find((c) => c.provider === 'google' && !c.revoked) ?? null;

  // Read the free-month meter server-side. Degrade, don't fake: if the gate can't be read we omit
  // the panel rather than render a reassuring but fictional 0%.
  //
  // TWO reads, deliberately. status() is the authority on the trial CLOCK; check() is the authority
  // on the BUDGET. Inferring the clock from the budget's zeroes is what told a brand-new account
  // its free month had ended (naive-tester, 2026-07-27).
  let usage: Awaited<ReturnType<ReturnType<typeof getBetaGate>['check']>> | null = null;
  let trialStatus: Awaited<ReturnType<ReturnType<typeof getBetaGate>['status']>> | null = null;
  if (legacyUser?.id) {
    try {
      const gate = getBetaGate();
      [trialStatus, usage] = await Promise.all([
        gate.status(legacyUser.id),
        gate.check(legacyUser.id, VOICE_ACTION),
      ]);
    } catch (error) {
      console.error('[settings] usage meter unavailable:', error);
    }
  }

  const plan = derivePlanState({
    trialStatus,
    hasCard: Boolean(legacyUser?.stripe_customer_id),
    subscriptionStatus: legacyUser?.subscription_status ?? null,
  });

  // What he is actually charged, from Stripe. Settings showed no figure at all, so an owner
  // wondering what he pays had to leave for the billing portal to find out — and the GST qualifier,
  // mandatory on every displayed price, had nowhere to render on an authenticated surface. Null
  // when it cannot be read honestly; the block below simply does not appear.
  const price = await getSubscriptionPrice(legacyUser?.stripe_subscription_id);

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-base text-gray-600">
          Manage your account. Changes here apply to your Kira and how you sign in.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        <form action={updateProfile} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">First name</span>
              <input
                name="first_name"
                defaultValue={String(appUser?.first_name ?? '')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Last name</span>
              <input
                name="last_name"
                defaultValue={String(appUser?.last_name ?? '')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Email</span>
            <p className="mt-1 text-base text-gray-500">{authUser?.email}</p>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Save profile
          </button>
        </form>
      </section>

      {/*
        Business identity — whose name is on the mail Kira sends.
        A summary and a link rather than a second copy of the form: one form, at /setup/business, so
        the validation and the two writes cannot drift apart between the place it is first entered
        and the place it is corrected.
      */}
      <section id="business" className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Your business</h2>
        <p className="mt-1 text-base text-gray-600">
          The name, ABN and address that appear at the bottom of every email Kira sends for you.
        </p>

        {identity ? (
          <>
            <dl className="mt-4 space-y-1 text-base text-gray-800">
              <div>
                <dt className="sr-only">Business</dt>
                <dd className="font-medium">{displayName(identity)}</dd>
              </div>
              {identity.trading_name ? (
                <div>
                  <dt className="sr-only">Registered entity</dt>
                  <dd className="text-gray-600">{identity.legal_name}</dd>
                </div>
              ) : null}
              <div>
                <dt className="sr-only">ABN</dt>
                <dd className="text-gray-600">ABN {formatAbn(identity.abn)}</dd>
              </div>
              <div>
                <dt className="sr-only">Address</dt>
                <dd className="text-gray-600">{composePostalAddress(identity)}</dd>
              </div>
              <div>
                <dt className="sr-only">Replies</dt>
                <dd className="text-gray-600">Replies go to {identity.reply_email}</dd>
              </div>
            </dl>

            {identity.synced_to_orchestrator_at ? null : (
              <div className="mt-4 rounded-xl bg-amber-50 p-4">
                <p className="text-base text-gray-800">
                  These are saved here, but the system that sends your email hasn&apos;t confirmed them
                  yet. Until it does, Kira can draft but not send.
                </p>
                <form action={retryIdentitySync}>
                  <button
                    type="submit"
                    className="mt-3 min-h-[44px] rounded-lg bg-gray-900 px-4 py-2.5 text-base font-semibold text-white"
                  >
                    Try again
                  </button>
                </form>
              </div>
            )}

            <Link
              href="/setup/business?edit=1"
              className="mt-4 inline-block min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 text-base font-semibold text-gray-800"
            >
              Edit business details
            </Link>
          </>
        ) : (
          <Link
            href="/setup/business"
            className="mt-4 inline-block min-h-[44px] rounded-lg bg-violet-600 px-4 py-2.5 text-base font-semibold text-white"
          >
            Add your business details
          </Link>
        )}
      </section>

      {/*
        Connected accounts. Shows the GRANTED access, not what was asked for — those differ whenever
        a permission is unticked at consent, and a page reading "connected" over a Drive that returns
        nothing is the failure this section exists to prevent.
      */}
      <section id="connections" className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Connected accounts</h2>
        <p className="mt-1 text-base text-gray-600">
          Where Kira reads your existing work from, so she writes in your format instead of inventing
          one.
        </p>

        {connections === null ? (
          <p className="mt-4 text-base text-gray-600">
            Can&apos;t check your connections right now. Nothing has changed — try again shortly.
          </p>
        ) : google ? (
          <div className="mt-4">
            <p className="text-base text-gray-900">
              <span className="font-medium">Google</span> — connected as {google.account}
            </p>
            <p className="mt-1 text-base text-gray-600">
              Drive:{' '}
              {google.driveAccess ? (
                DRIVE_ACCESS_LABEL[google.driveAccess]
              ) : (
                <span className="font-medium text-amber-700">not granted</span>
              )}
              {google.gmail ? ' · Gmail: connected' : null}
            </p>
            {/* Only stated when the seam actually told us. An older orchestrator returns nothing
                here, and rendering that silence as "not granted" would send him to reconnect a
                connection that is working perfectly. */}
            {google.contacts ? (
              <p className="mt-1 text-base text-gray-600">
                Contacts:{' '}
                {google.contacts.contacts || google.contacts.otherContacts ? (
                  <>
                    can look up an address by name
                    {google.contacts.contacts && google.contacts.otherContacts
                      ? ' (saved and auto-saved contacts)'
                      : google.contacts.otherContacts
                        ? ' (auto-saved contacts only)'
                        : ' (saved contacts only)'}
                  </>
                ) : (
                  <span className="font-medium text-amber-700">
                    not granted — Kira will ask you for an address every time you name someone
                  </span>
                )}
              </p>
            ) : null}
            {google.lastError ? (
              <p className="mt-2 text-base text-rose-600">{google.lastError}</p>
            ) : null}
            <Link
              href="/setup/drive"
              className="mt-4 inline-block min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 text-base font-semibold text-gray-800"
            >
              Change access or reconnect
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-4 text-base text-gray-600">Nothing connected yet.</p>
            <Link
              href="/setup/drive"
              className="mt-4 inline-block min-h-[44px] rounded-lg bg-violet-600 px-4 py-2.5 text-base font-semibold text-white"
            >
              Connect Google Drive
            </Link>
          </>
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Plan &amp; usage</h2>

        {/* The figure first, because it is the question this section is opened to answer. Shown
            only when Stripe confirmed it — an owner who sees no number here still has the portal,
            whereas one who sees the wrong number has been told something false about his money. */}
        {price && (
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {price.formatted}
            <span className="text-base font-medium text-gray-500"> /month</span>
          </p>
        )}

        {/* One sentence, true of exactly this account's state — never the card claim by default. */}
        <p className="mt-1 text-base text-gray-500">{plan.billingSentence}</p>

        {usage ? (
          <div className="mt-4">
            <UsageMeter
              trialState={plan.trial}
              daysLeft={plan.daysLeft}
              capUsd={VOICE_COST_CAP_USD}
              usedUsd={Math.round(usage.usedCost * 100) / 100}
              pctUsed={usage.pctUsed}
              warn={usage.warn}
              allowed={usage.allowed}
              reason={denyReason(usage)}
            />
          </div>
        ) : (
          <p className="mt-4 text-base text-gray-500">
            Usage isn&apos;t available right now. Nothing has changed on your account.
          </p>
        )}

        <div className="mt-5 space-y-4">
          <ManageBillingButton disabled={!legacyUser?.stripe_customer_id} />
          {!legacyUser?.stripe_customer_id && (
            <p className="mt-2 text-sm text-gray-500">
              You don&apos;t have a subscription yet, so there&apos;s nothing to manage.
            </p>
          )}
          {/* Cancelling is OURS, not the portal's. Kira bills in arrears and waives the month in
              progress; Stripe's portal cancel would invoice it. See lib/billing/arrears.ts. */}
          {legacyUser?.stripe_subscription_id &&
            legacyUser?.subscription_status !== 'cancelled' && <CancelPlanButton />}
        </div>
      </section>

      <TeamSectionClient organisationId={org?.organisationId ?? ''} />

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Password</h2>
        <p className="mt-1 text-sm text-gray-500">Set a new password for signing in.</p>
        <div className="mt-4">
          <PasswordChange />
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose what Kira emails you. You can change this any time.
        </p>
        <form action={updateNotifications} className="mt-4 space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="email_notifications_opt_in"
              defaultChecked={legacyUser?.email_notifications_opt_in ?? true}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">Email updates</span>
              <span className="block text-sm text-gray-500">
                Product updates, tips, and occasional check-ins about your Kira.
              </span>
            </span>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Save notifications
          </button>
        </form>
      </section>

      {/* SESSIONS, above the delete block and separate from it.
          "There's no 'sign me out everywhere.' I use three machines and one of them is a shared
          office PC. That matters to me more than most." It does: what is behind this login says he
          is thinking of selling a business he has not told his staff about, and ordinary Sign Out
          only ends the session on the machine he is already sitting at.
          Its own section rather than inside the red Account card, because ending sessions is
          recoverable — he signs back in — and putting it beside Delete Account would make a safe
          action look like a dangerous one. */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Signed-in devices</h2>
        <p className="mt-1 text-sm text-gray-500">
          Signs you out of Kira everywhere — this browser, your phone, and any machine you have used
          and left signed in. You can sign back in whenever you like; nothing is deleted.
        </p>
        <div className="mt-4">
          <SignOutEverywhere />
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Account</h2>
        <p className="mt-1 text-sm text-gray-500">
          Permanently delete your account and everything in it. This cannot be undone.
        </p>
        <div className="mt-4">
          <DeleteAccount email={authUser?.email ?? ''} />
        </div>
      </section>
    </div>
  );
}
