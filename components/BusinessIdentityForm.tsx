'use client';

// Who Kira writes as.
//
// Framed as a question about the owner's business, not as a compliance form, because that is what it
// is from his side: before Kira can send anything on his behalf, she has to know whose name goes at
// the bottom. The legal reason (the Spam Act requires the sender's name, ABN and a reply-capable
// address) is stated once, in one line, at the point it explains the ask — not as a wall of policy.
//
// Built for the ICP: a 60–70 year old owner. So — one search that fills three fields, plain labels,
// no icon-only controls, 16px+ text and 44px+ targets throughout, and every error next to the field
// it belongs to rather than gathered in a heap at the top.
//
// ONE BUSINESS PER ACCOUNT (operator, 2026-07-31). A second business gets its own account and its
// own Kira, so there is no list here and no "add another" — the copy says so, because an owner with
// two businesses will otherwise look for the button and conclude the product cannot do it.

import { useActionState } from 'react';
import { AbnLookupField } from '@/components/AbnLookupField';
import { AU_STATES, type BusinessIdentity } from '@/lib/business-identity';
import { saveBusinessIdentity, type IdentityFormState } from '@/app/setup/business/actions';

const INPUT =
  'mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none min-h-[48px] focus:border-stone-500 focus:ring-2 focus:ring-stone-200';

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-base font-medium text-stone-800">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1 block text-sm text-stone-500">{hint}</span> : null}
      {error ? (
        <span className="mt-1 block text-sm font-medium text-rose-600" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function BusinessIdentityForm({
  identity,
  defaultReplyEmail,
  defaultSignOffName,
  submitLabel = 'Save and continue',
}: {
  identity: BusinessIdentity | null;
  /** The account email, offered as the default for replies — almost always the right answer. */
  defaultReplyEmail: string;
  defaultSignOffName: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<IdentityFormState | null, FormData>(
    saveBusinessIdentity,
    null,
  );
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {/* ── The entity ─────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <AbnLookupField
          nameField="legal_name"
          abnField="abn_lookup"
          label="Your registered business name"
          hint="Start typing and pick your business from the register — that fills in your ABN too."
          required
          defaultValue={identity?.legal_name ?? ''}
          inputClassName={INPUT}
        />
        {errors.legalName ? (
          <p className="text-sm font-medium text-rose-600" role="alert">
            {errors.legalName}
          </p>
        ) : null}

        <Field
          label="ABN"
          hint="Only needed if you couldn't find your business above."
          error={errors.abn}
        >
          <input
            name="abn"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={identity?.abn ?? ''}
            placeholder="11 digits"
            className={INPUT}
          />
        </Field>

        <Field
          label="Trading name"
          hint="Only if customers know you by a different name to the registered one — a trust, say, trading as something simpler. Leave it blank and we'll use the registered name."
          error={errors.tradingName}
        >
          <input
            name="trading_name"
            autoComplete="organization"
            defaultValue={identity?.trading_name ?? ''}
            className={INPUT}
          />
        </Field>
      </div>

      {/* ── The address ────────────────────────────────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-stone-900">Business address</legend>
        <p className="-mt-1 text-sm text-stone-500">
          This appears at the bottom of everything Kira sends, so someone who gets an email from you can
          see who it is from and write back.
        </p>

        <Field label="Street address" error={errors.street}>
          <input
            name="street"
            autoComplete="street-address"
            defaultValue={identity?.street ?? ''}
            className={INPUT}
          />
        </Field>

        <Field label="Suburb or town" error={errors.locality}>
          <input
            name="locality"
            autoComplete="address-level2"
            defaultValue={identity?.locality ?? ''}
            className={INPUT}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="State" error={errors.state}>
            <select name="state" defaultValue={identity?.state ?? ''} className={INPUT}>
              <option value="">Choose…</option>
              {AU_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Postcode" error={errors.postcode}>
            <input
              name="postcode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={4}
              defaultValue={identity?.postcode ?? ''}
              className={INPUT}
            />
          </Field>
        </div>
      </fieldset>

      {/* ── Replies and sign-off ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <Field
          label="Where replies should go"
          hint="When someone replies to a quote or a follow-up, this is the inbox it lands in."
          error={errors.replyEmail}
        >
          <input
            name="reply_email"
            type="email"
            autoComplete="email"
            defaultValue={identity?.reply_email ?? defaultReplyEmail}
            className={INPUT}
          />
        </Field>

        <Field
          label="How Kira signs off"
          hint="Your name, as you'd sign an email to a customer."
          error={errors.signOffName}
        >
          <input
            name="sign_off_name"
            autoComplete="name"
            defaultValue={identity?.sign_off_name ?? defaultSignOffName}
            className={INPUT}
          />
        </Field>
      </div>

      {/* ── Authority ──────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-stone-50 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="authorised"
            defaultChecked={Boolean(identity?.authorised_at)}
            className="mt-1 h-5 w-5 shrink-0 rounded border-stone-400"
          />
          <span className="text-base text-stone-800">
            I authorise Kira to send email as this business. Australian law requires every business email
            to carry the sender&apos;s name, ABN and a reply address — these are the details that will
            appear.
          </span>
        </label>
        {errors.authorised ? (
          <p className="mt-2 text-sm font-medium text-rose-600" role="alert">
            {errors.authorised}
          </p>
        ) : null}
      </div>

      {state?.message ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-base text-rose-700" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-stone-900 px-6 py-4 text-base font-semibold text-white min-h-[52px] disabled:opacity-60"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>

      <p className="text-center text-sm text-stone-500">
        Running a second business? That gets its own account and its own Kira, so the right name always
        goes on the right email.
      </p>
    </form>
  );
}
