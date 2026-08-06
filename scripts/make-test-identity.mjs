// A synthetic Australian business identity for testing — valid in FORM, registered to NOBODY.
//
// WHY NOT JUST USE A REAL COMPANY. The ABN entered at setup is not decoration: it prints in the
// Spam Act identification footer of every email Kira sends on that owner's behalf, and in the
// handover document a buyer's accountant reads. Borrowing a real business's number means mail going
// out identifying a company that did not send it — impersonation, and the exact "whose brand
// travels" failure PRODUCT_STANDARDS §9 exists to prevent. A tester in another country cannot
// consent on that company's behalf.
//
// SO: an ABN that passes the ABR's own weighted-modulus check and is NOT ISSUED. The form validates
// the checksum (arithmetic, no network) but does not prove the entity exists — register item K19 —
// which is a gap for real owners and precisely the affordance a test identity needs.
//
// It VERIFIES non-registration against the live ABR rather than assuming. Generating a valid-looking
// number and hoping it is unallocated is how you accidentally hand someone a real business's
// identity; there are ~9 million issued ABNs and the checksum space is not sparse.
//
//   node --env-file=.env.local scripts/make-test-identity.mjs [--count 3]

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

function checksumOk(digits) {
  const nums = digits.split('').map(Number);
  nums[0] -= 1;
  return nums.reduce((acc, n, i) => acc + n * WEIGHTS[i], 0) % 89 === 0;
}

/** Deterministic sweep rather than random: reproducible, and Math.random is unavailable in some runners. */
function* candidates(seed) {
  for (let n = seed; n < seed + 4_000_000; n += 7) {
    const body = String(n).padStart(9, '0').slice(0, 9);
    for (let prefix = 11; prefix <= 99; prefix++) {
      const digits = `${prefix}${body}`;
      if (digits.length === 11 && checksumOk(digits)) yield digits;
    }
  }
}

const guid = process.env.ABR_GUID;
async function isRegistered(abn) {
  if (!guid) return null; // unknown — caller must treat as unverified
  try {
    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${guid}`;
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.replace(/^callback\(/, '').replace(/\);?$/, ''));
    // The ABR returns an empty EntityName (and often a Message) for an unissued ABN.
    return Boolean(json.EntityName && String(json.EntityName).trim());
  } catch {
    return null;
  }
}

const want = Number((() => { const i = process.argv.indexOf('--count'); return i > -1 ? process.argv[i + 1] : 3; })());
console.log(guid ? 'ABR lookup available — non-registration will be VERIFIED\n' : '⚠️  ABR_GUID unset — cannot verify non-registration\n');

const found = [];
for (const abn of candidates(100_000_000)) {
  if (found.length >= want) break;
  const registered = await isRegistered(abn);
  if (registered === true) continue; // belongs to a real business — never offer it
  found.push({ abn, verified: registered === false });
}

for (const f of found) {
  const pretty = `${f.abn.slice(0, 2)} ${f.abn.slice(2, 5)} ${f.abn.slice(5, 8)} ${f.abn.slice(8)}`;
  console.log(`  ${pretty}   checksum OK   ${f.verified ? 'confirmed NOT registered' : 'non-registration UNVERIFIED'}`);
}
