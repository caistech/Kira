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

import { AddressAutocomplete } from '@caistech/corporate-components/address-autocomplete';
import { useActionState, useEffect, useRef, useState } from 'react';
import { formatAbn } from '@caistech/abn-lookup';
import { AbnLookupField } from '@/components/AbnLookupField';
import { type BusinessIdentity } from '@/lib/business-identity';
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

  // WHY A SUMMARY EXISTS AT ALL.
  //
  // Every field below already renders its own error, and that was not enough. This form is eleven
  // fields tall — taller than a phone screen — so the Save button and the field that failed are
  // rarely visible at the same time. Press Save with an empty business name, and on a phone the
  // page does not move, nothing near your thumb changes, and the only feedback is red text several
  // hundred pixels above the fold.
  //
  // What that looks like from the outside is a button that does nothing. It was reported as exactly
  // that — "the form is failing and the edits are not being saved" — by someone who was in fact
  // being told what was wrong, in a place he could not see. The server was working correctly the
  // whole time, which is why nothing showed up in the logs: three POSTs, three 200s, no row.
  //
  // It lands on the FIRST screen after paying, for an owner in his sixties. A silent button there
  // is not a papercut.
  const errorList = Object.entries(errors).filter(([, message]) => Boolean(message)) as [string, string][];
  const summaryRef = useRef<HTMLDivElement>(null);

  // Move him TO the problem rather than hoping he finds it. Focus, not just scroll — a screen reader
  // has the identical problem and gets no help from scrolling.
  useEffect(() => {
    if (errorList.length) summaryRef.current?.focus();
  }, [state, errorList.length]);

  // Held in state ONLY so a chosen address can fill them. They remain fully editable — a lookup that
  // takes the pen away is worse than no lookup, and rural and new-estate addresses are exactly where
  // Mapbox is weakest and this owner is strongest.
  // Controlled so the register can fill it — see the onSelect on AbnLookupField below.
  const [abn, setAbn] = useState(identity?.abn ? formatAbn(identity.abn) : '');
  const [locality, setLocality] = useState(identity?.locality ?? '');
  const [stateCode, setStateCode] = useState(identity?.state ?? '');
  const [postcode, setPostcode] = useState(identity?.postcode ?? '');

  return (
    <form action={formAction} className="space-y-6">
      {errorList.length ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 outline-none"
        >
          <p className="text-base font-semibold text-rose-800">
            {errorList.length === 1
              ? 'One thing needs fixing before this can save:'
              : `${errorList.length} things need fixing before this can save:`}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-rose-700">
            {errorList.map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

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
          // SHOW what the register found, don't just submit it. The hidden abn_lookup field was
          // enough for the server and wrong for the person: he picked his business, read "ABN
          // 54 672 395 685 · QLD — matched on the business register", and then looked straight at a
          // box labelled ABN that was still empty with "11 digits" in it. The only reasonable
          // conclusion is that it did not take.
          onSelect={(picked) => {
            setAbn(picked ? formatAbn(picked.abn) : '');
            // The register knows the entity's state; no reason to make him supply it again.
            if (picked?.state) setStateCode(picked.state);
          }}
        />
        {errors.legalName ? (
          <p className="text-sm font-medium text-rose-600" role="alert">
            {errors.legalName}
          </p>
        ) : null}

        <Field
          label="ABN"
          hint="Filled in when you pick your business above. Type it yourself if the register didn't find you."
          error={errors.abn}
        >
          <input
            name="abn"
            inputMode="numeric"
            autoComplete="off"
            value={abn}
            onChange={(e) => setAbn(e.target.value)}
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

        {/* LOOKUP, NOT A PLAIN BOX — the standing portfolio rule, and a tester named it precisely:
            "if you're doing lookups for the ABN, do them for the address too." He had just watched
            the ABN field return five real ABNs with states and called it "the sort of thing that
            tells me a grown-up built it", and then typed his address into an empty box.
            Consumes the shared @caistech/corporate-components/address-autocomplete over
            @caistech/mapbox rather than a local Mapbox call. Picking a suggestion fills suburb,
            state and postcode below it, so the three fields that were four separate chances to
            mistype become one. Typing still works untouched if the lookup finds nothing or the
            token is unset — degrade, never block. */}
        <Field label="Street address" error={errors.street}>
          <AddressAutocomplete
            name="street"
            defaultValue={identity?.street ?? ''}
            placeholder="Start typing the address"
            inputClassName={INPUT}
            onSelect={(a) => {
              setLocality(a.suburb ?? '');
              setStateCode(a.state ?? '');
              setPostcode(a.postcode ?? '');
            }}
          />
        </Field>

        <Field label="Suburb or town" error={errors.locality}>
          <input
            name="locality"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            autoComplete="address-level2"
            className={INPUT}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* A FILLED FIELD, NOT A DROPDOWN — for the same reason suburb and postcode are.
              Picking an address fills all three; making one of them a menu meant the owner chose his
              address and then still had to operate a select, which is the fiddliest control on a
              phone and the one this age group least enjoys.

              It was also silently failing. @caistech/mapbox returns "WA" when Mapbox supplies a
              short code and "Western Australia" when it does not — same lookup, same day. A select
              can only hold the first; the second matched no option, so the box quietly reverted to
              "Choose…" after an address had been picked, with suburb and postcode visibly correct
              either side of it. normaliseState now accepts both, plus anything typed by hand. */}
          <Field label="State" error={errors.state}>
            <input
              name="state"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              autoComplete="address-level1"
              placeholder="WA"
              className={INPUT}
            />
          </Field>

          <Field label="Postcode" error={errors.postcode}>
            <input
              name="postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={4}
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
