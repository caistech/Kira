// lib/kira/memory-entity-def.mjs
// SINGLE SOURCE of the entity classification on save_memory — the mechanism behind the
// "ONE ACCOUNT, ONE BUSINESS" rule.
//
// WHY A DECORATOR AND NOT A TOOL DEFINITION. save_memory belongs to the canonical
// @caistech/elevenlabs-convai loop, and its body contract has to keep matching the canonical
// handlers. Re-declaring it here would fork the one tool whose shape must not drift. So this takes
// the canonical output and adds one parameter — Kira's own question, on Kira's own handler, with the
// canonical shape untouched. No package change is needed for either half: the ?uid path already
// routes to handleKiraSaveMemory in lib/kira/uid-tools.ts, which is entirely ours.
//
// WHY IT EXISTS. Kira's account IS one business. Every fact she keeps is a claim about that business
// and lands in the handover document a buyer's accountant reads. On 31 July, 52 of 112 active
// memories in the Factory2Key Genome belonged to a different company — the majority of the record
// was about the wrong entity — and a $60k quote for AI work went out under Factory2Key's ABN.
//
// The rule was then written into her prompt, and the red team measured it: 0 of 3. She acknowledged
// the separation unprompted every single time — "Corvid Holdings is a separate company with its own
// ABN" — and filed it anyway. She HAS the judgement; what she lacked was a consequence. That is the
// same finding as record_refusal, where a description in the strongest terms available was ignored 24
// minutes after it shipped, and the fix was a required, constrained parameter.
//
// FAILS SAFE, DELIBERATELY. An absent value is treated as this business, so the post-call distil path
// (which calls the canonical handler without this parameter) and any older agent can never LOSE a
// fact. The guard fires only on an explicit admission that the material belongs elsewhere — which is
// exactly the case she demonstrably recognises.

/** The parameter name, shared by the tool schema and the handler so the two cannot drift apart. */
export const ENTITY_PARAM = 'about_business';

/** The only two answers. `another_business` is the one that changes what the server does. */
export const THIS_BUSINESS = 'this_business';
export const ANOTHER_BUSINESS = 'another_business';

/** The name of the other company, so later facts about it can be recognised. */
export const OTHER_BUSINESS_NAME_PARAM = 'other_business_name';

const OTHER_BUSINESS_NAME_SCHEMA = {
  type: 'string',
  description:
    "REQUIRED when about_business is another_business: the name of that other company, exactly as he said it — e.g. \"Corvid Holdings\", \"Nolan Civil Pty Ltd\". Leave empty for this business. It is recorded once so that everything else he later tells you about that company is kept out of this record too, without you having to classify each fact separately.",
};

const ENTITY_PARAM_SCHEMA = {
  type: 'string',
  enum: [THIS_BUSINESS, ANOTHER_BUSINESS],
  description:
    "Which business this fact is about. this_business: the business this account is for — the one whose Genome you are building, including its trading names, brands, divisions and sites. another_business: a DIFFERENT company the owner is involved in — a separate entity, its own ABN, a side venture, a trust, work he does under another name. If he has just told you it is a separate company, that is another_business even if he asks you to keep it here anyway. Facts about another business are kept out of this record rather than filed into it, because everything in here is read as a statement about this business.",
};

/**
 * Add the entity question to save_memory, leaving every other canonical tool untouched.
 *
 * Returns a new array; the tool object is shallow-copied down to `parameters` so a caller that also
 * mutates webhook headers (both provisioning paths do) cannot accidentally write through to the
 * canonical module's own objects.
 *
 * @param {Array<Record<string, any>>} tools output of createConversationTools()
 * @returns {Array<Record<string, any>>}
 */
export function withEntityClassification(tools) {
  let decorated = false;
  const out = tools.map((tool) => {
    if (tool?.name !== 'save_memory') return tool;
    decorated = true;
    const parameters = tool.parameters ?? { type: 'object', properties: {}, required: [] };
    const required = Array.isArray(parameters.required) ? parameters.required : [];
    return {
      ...tool,
      parameters: {
        ...parameters,
        properties: {
          ...(parameters.properties ?? {}),
          [ENTITY_PARAM]: ENTITY_PARAM_SCHEMA,
          // NOT in `required`. It only applies to one of the two answers, and a parameter she must
          // fill on every save — including the overwhelmingly common "this business" one — invites
          // her to put something in it, which is worse than leaving it blank: a junk name here parks
          // real facts. The server treats an absent name as "no new other business to remember".
          [OTHER_BUSINESS_NAME_PARAM]: OTHER_BUSINESS_NAME_SCHEMA,
        },
        // REQUIRED, so she has to answer on every save rather than only when it occurs to her. The
        // handler still defaults an absent value, so requiring it here costs nothing if a path ever
        // omits it — this makes the question unavoidable, it does not make the save fragile.
        required: required.includes(ENTITY_PARAM) ? required : [...required, ENTITY_PARAM],
      },
    };
  });

  // Loud, because the silent version of this failure is a fleet provisioned with an unguarded
  // save_memory that looks exactly like a guarded one. If the canonical tool is ever renamed, this
  // must fail rather than quietly decorate nothing.
  if (!decorated) {
    throw new Error(
      'withEntityClassification: no save_memory tool in the canonical set — the entity guard would ' +
        'be silently absent from every provisioned agent.',
    );
  }
  return out;
}
