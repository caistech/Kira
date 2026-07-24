import { getAuthUser, getCurrentAppUser } from '@/lib/auth';
import { PasswordChange } from '@/components/PasswordChange';
import { DeleteAccount } from '@/components/DeleteAccount';
import { updateProfile, updateNotifications } from './actions';

export const metadata = { title: 'Settings · Kira' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const authUser = await getAuthUser();
  const appUser = await getCurrentAppUser();

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
