'use client';

// Firm name → the Australian Business Register, in one field.
//
// Why a lookup rather than a text input: we ask for a firm on forms that end in paying that firm.
// A typed name is a guess ("Smith & Co", "smith and co pty ltd"), and an ABN typed from memory is
// wrong often enough to matter. Searching the register instead returns the REGISTERED entity name,
// its ABN and its state together, so one interaction produces three verified fields and the person
// filling it in does less work, not more.
//
// Three rules this component holds to:
//
//  1. It NEVER blocks submission. If ABR_GUID is unset, or the ABR is down, or nothing matches, the
//     field silently becomes an ordinary text input and whatever was typed is submitted as-is
//     (PRODUCT_STANDARDS "degrade, don't fake"). An outage at the registry is not the applicant's
//     problem, and losing a broker enquiry to it would cost far more than an unverified name.
//  2. Typing after a selection CLEARS the selection. The hidden abn/state belong to the entity that
//     was picked; leaving them attached to edited text would silently misattribute an ABN.
//  3. What was typed is always submitted under `nameField`, verified or not — so an unverified
//     entry is a slightly weaker record, never a lost one.

import { useCallback, useEffect, useRef, useState } from 'react';

interface AbrResult {
  abn: string;
  name: string;
  state: string;
  postcode: string;
  isCurrent: boolean;
}

interface Props {
  /** Form field name for the business name itself — always submitted, verified or not. */
  nameField: string;
  /** Form field name for the ABN. Submitted only when an entity was actually selected. */
  abnField: string;
  /** Optional form field name for the entity's state, which the register gives us for free. */
  stateField?: string;
  label: string;
  /** Shown under the field before anything is typed. */
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  /** Tailwind classes for the input, so this fits whichever surface mounts it. */
  inputClassName: string;
  /**
   * Told when a register entity is picked, and when a selection is cleared (`null`).
   *
   * Exists so a surface can SHOW the matched ABN in its own visible field. Submitting it in a hidden
   * input is enough for the server and not enough for the person: the owner sees "ABN 54 672 395 685
   * · QLD — matched on the business register" directly above a box labelled ABN that is still empty,
   * and reasonably concludes it did not take.
   */
  onSelect?: (result: { abn: string; state: string | null } | null) => void;
}

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

export function AbnLookupField({
  nameField,
  abnField,
  stateField,
  label,
  hint,
  required,
  defaultValue = '',
  inputClassName,
  onSelect,
}: Props) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<AbrResult[]>([]);
  const [selected, setSelected] = useState<AbrResult | null>(null);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  // null = we haven't heard from the route yet. false = no ABR_GUID, so stop offering a lookup that
  // cannot work and let the field behave as plain text.
  const [configured, setConfigured] = useState<boolean | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  // Guards against a slow early request overwriting the results of a later, more specific one.
  const requestSeq = useRef(0);

  const search = useCallback(async (term: string) => {
    const seq = ++requestSeq.current;
    const digits = term.replace(/\s/g, '');
    const param = /^\d{11}$/.test(digits) ? `abn=${digits}` : `name=${encodeURIComponent(term)}`;

    setSearching(true);
    try {
      const response = await fetch(`/api/abn-lookup?${param}`);
      const data = await response.json();
      if (seq !== requestSeq.current) return; // A newer keystroke already superseded this.

      if (data.configured === false) {
        setConfigured(false);
        setResults([]);
        return;
      }
      setConfigured(true);

      if (Array.isArray(data.results)) {
        setResults(data.results.filter((r: AbrResult) => r.isCurrent).slice(0, 8));
        setOpen(true);
      } else if (data.found) {
        // A direct ABN hit — same shape as a name result so selection is one code path.
        setResults([
          {
            abn: data.abn,
            name: data.entityName,
            state: data.state,
            postcode: data.postcode,
            isCurrent: true,
          },
        ]);
        setOpen(true);
      } else {
        setResults([]);
      }
    } catch {
      // Registry unreachable. Say nothing and let them type — see rule 1.
      if (seq === requestSeq.current) setResults([]);
    } finally {
      if (seq === requestSeq.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (configured === false) return;
    if (selected) return; // Already resolved; don't re-search our own fill.
    const term = query.trim();
    if (term.length < MIN_QUERY) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => search(term), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, selected, configured, search]);

  // Close the list on an outside click — a dropdown that survives clicking away feels broken.
  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  function choose(result: AbrResult) {
    setSelected(result);
    onSelect?.({ abn: result.abn, state: result.state ?? null });
    setQuery(result.name);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="block">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <input
          type="text"
          value={query}
          required={required}
          autoComplete="organization"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onChange={(event) => {
            setQuery(event.target.value);
            // Rule 2: the ABN belonged to the entity they picked, not to whatever this is now.
            if (selected) {
              setSelected(null);
              onSelect?.(null);
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          className={inputClassName}
        />
      </label>

      {/* Rule 3: what they typed always submits. The verified fields ride alongside it. */}
      <input type="hidden" name={nameField} value={query} />
      <input type="hidden" name={abnField} value={selected?.abn ?? ''} />
      {stateField && <input type="hidden" name={stateField} value={selected?.state ?? ''} />}

      {selected ? (
        <p className="mt-1.5 text-sm text-emerald-700">
          ABN {formatAbn(selected.abn)} · {selected.state} — matched on the business register
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-stone-500">{searching ? 'Searching…' : hint}</p>
      )}

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-stone-300 bg-white shadow-lg"
        >
          {results.map((result) => (
            <li key={result.abn}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => choose(result)}
                className="flex min-h-[44px] w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-amber-50 focus:bg-amber-50 focus:outline-none"
              >
                <span className="text-base text-stone-900">{result.name}</span>
                <span className="text-sm text-stone-500">
                  ABN {formatAbn(result.abn)} · {result.state} {result.postcode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 51 824 753 556 — how an ABN is written everywhere except in a database. */
function formatAbn(abn: string): string {
  const digits = abn.replace(/\D/g, '');
  if (digits.length !== 11) return abn;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}
