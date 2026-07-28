import { getAuthUser, getCurrentAppUser } from '@/lib/auth';
import { getBetaGate, VOICE_ACTION, VOICE_COST_CAP_USD } from '@/lib/billing';
import { denyReason, derivePlanState } from '@/lib/billing/plan-state';
import { PasswordChange } from '@/components/PasswordChange';
import { DeleteAccount } from '@/components/DeleteAccount';
import { CancelPlanButton } from '@/components/CancelPlanButton';
import { ManageBillingButton } from '@/components/ManageBillingButton';
import { UsageMeter } from '@/components/UsageMeter';
import { updateProfile, updateNotifications } from './actions';

export const metadata = { title: 'Settings · Kira' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const authUser = await getAuthUser();
  const appUser = await getCurrentAppUser();

  // Read the free-month meter server-side. Degrade, don't fake: if the gate can't be read we omit
  // the panel rather than render a reassuring but fictional 0%.
  //
  // TWO reads, deliberately. status() is the authority on the trial CLOCK; check() is the authority
  // on the BUDGET. Inferring the clock from the budget's zeroes is what told a brand-new account
  // its free month had ended (naive-tester, 2026-07-27).
  let usage: Awaited<ReturnType<ReturnType<typeof getBetaGate>['check']>> | null = null;
  let trialStatus: Awaited<ReturnType<ReturnType<typeof getBetaGate>['status']>> | null = null;
  if (appUser?.id) {
    try {
      const gate = getBetaGate();
      [trialStatus, usage] = await Promise.all([
        gate.status(appUser.id),
        gate.check(appUser.id, VOICE_ACTION),
      ]);
    } catch (error) {
      console.error('[settings] usage meter unavailable:', error);
    }
  }

  const plan = derivePlanState({
    trialStatus,
    hasCard: Boolean(appUser?.stripe_customer_id),
    subscriptionStatus: appUser?.subscription_status ?? null,
  });

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
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Last name</span>
              <input
                name="last_name"
                defaultValue={String(appUser?.last_name ?? '')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Email</span>
            <p className="mt-1 text-base text-gray-500">{authUser?.email}</p>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Save profile
          </button>
        </form>
      </section>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Plan &amp; usage</h2>
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
          <ManageBillingButton disabled={!appUser?.stripe_customer_id} />
          {!appUser?.stripe_customer_id && (
            <p className="mt-2 text-sm text-gray-500">
              You don&apos;t have a subscription yet, so there&apos;s nothing to manage.
            </p>
          )}
          {/* Cancelling is OURS, not the portal's. Kira bills in arrears and waives the month in
              progress; Stripe's portal cancel would invoice it. See lib/billing/arrears.ts. */}
          {appUser?.stripe_subscription_id &&
            appUser?.subscription_status !== 'cancelled' && <CancelPlanButton />}
        </div>
      </section>

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
              defaultChecked={appUser?.email_notifications_opt_in ?? true}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
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
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Save notifications
          </button>
        </form>
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
