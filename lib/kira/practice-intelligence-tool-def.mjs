// lib/kira/practice-intelligence-tool-def.mjs
// SINGLE SOURCE of the research_organisation ConvAI tool shape.
//
// .mjs for the same reason every other tool def here is: three consumers that cannot share a TS
// module — lib/kira/convai.ts (new agents), scripts/reprovision-kira-agents.mjs (live agents) and
// lib/kira/text-tools.ts (the typed transport). A duplicated definition drifts on the first edit.
//
// The secret header and the ?uid identity are added by the caller at build time, not here.
//
// NO `withSpeakingTo` GATE, and that is a considered omission rather than an oversight. The
// disclosure gate exists to stop the owner's OWN confidential material being read out to whoever
// else is in the room — his Drive, his contacts, his books. This tool reads the public website of a
// third-party business, which is exactly as confidential as it was before we looked. Adding the gate
// would put a required field in front of the model for no protection.
//
// THE DESCRIPTION IS THE ROUTING. Kira has no skill loader; a tool is invoked because its
// description names a trigger she can recognise. So this one is explicit that research comes AFTER a
// research question has been agreed — the whole point of the capability is that she pushes back
// first, and a description saying "call this when the owner mentions a practice" would produce the
// reflexive search this capability exists to avoid.

export const KIRA_RESEARCH_ORG_WEBHOOK_PATH = '/api/kira/webhooks/research_organisation';

/**
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraResearchOrganisationToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'research_organisation',
    description:
      "Gather publicly observable evidence about ONE named organisation — today that means a healthcare practice; the sector argument exists so this is not limited to one industry forever — its website, whether it uses an online booking system such as Healthengine or HotDoc, the services and hours it publishes, and any people it names publicly. " +
      "WHEN TO CALL IT: only once you and the owner have agreed a specific question worth testing. Do NOT call it the moment a practice or a market is mentioned — your job first is to press on what the actual hypothesis is and what evidence would change his mind. Research is what you do after that, not instead of it. " +
      "WHAT IT GIVES YOU: evidence, not a verdict. It deliberately does not say whether this is an opportunity or whether to approach anyone — that is your judgement and his, and you should be willing to conclude the signal is too weak. " +
      "HOW TO READ IT: `status` is 'ok', 'partial' or 'failed'. `technology.booking` is one of healthengine, hotdoc, other_online_booking, no_visible_online_booking, unknown — and `technology.inspected` tells you whether any page was actually read. IF `inspected` IS FALSE, or `status` IS 'failed', SAY THAT WE COULD NOT LOOK. Do not report it as the practice having no online booking; those are completely different facts and only one of them is about the practice. `research.failures` lists exactly what did not complete — read those out rather than glossing them. `organisation.unknowns` lists what is NOT knowable from a website; treat it as a boundary and do not fill it with plausible guesses. " +
      "Every technology conclusion carries the URL it came from in `evidence`; quote that if the owner doubts it.",
    webhook: { url: `${baseUrl}${KIRA_RESEARCH_ORG_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        organisation: {
          type: 'string',
          description:
            'The name of the organisation, as the owner said it — e.g. "Joondalup Family Medical Centre".',
        },
        sector: {
          type: 'string',
          description:
            "The industry, if it is not healthcare. Omit for a medical, dental or allied-health practice. Only 'healthcare' is supported today; anything else comes back saying so plainly rather than researching with the wrong industry's assumptions.",
        },
        location: {
          type: 'string',
          description:
            'Suburb, city or state, if the owner gave one. Improves the search considerably. Omit if unknown — never invent one.',
        },
        website: {
          type: 'string',
          description:
            "The practice's website, if the owner already knows it. Omit it and the search will find it.",
        },
        research_question: {
          type: 'string',
          description:
            'The specific question the two of you agreed to test, in one sentence. Recorded with the evidence so the answer can be read against the question that prompted it.',
        },
      },
      required: ['organisation'],
    },
  };
}
