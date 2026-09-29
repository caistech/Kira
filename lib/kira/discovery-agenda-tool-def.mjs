// lib/kira/discovery-agenda-tool-def.mjs
// SINGLE SOURCE of the discovery_agenda tool — the mandatory, one-time, first-conversation
// interview, pulled fresh every call rather than baked into the static prompt.
//
// WHY A TOOL. The system prompt is fixed at agent creation; whether discovery is complete changes
// over the life of the account. Baking "ask her about the business" into static prompt text would
// mean re-provisioning the agent the day the profile finally fills in, or she interviews someone
// forever. Instead the STATIC prompt carries one evergreen instruction — call this first, always —
// and this tool tells her, fresh, whether to run the interview or get on with ordinary work.
//
// MANDATORY, NOT ONE OF NINE. Unlike area_agenda (called when a genome area comes up), this is
// called at the START of every business-journey call, unconditionally, before anything else.

export const KIRA_DISCOVERY_AGENDA_WEBHOOK_PATH = '/api/kira/webhooks/discovery_agenda';

/**
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraDiscoveryAgendaToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'discovery_agenda',
    description:
      "Call this FIRST, before anything else, at the start of EVERY conversation — even before you greet him. It tells you whether this business still owes you its one-time discovery interview.\n\nIf `complete` is false: this is a mandatory, ONE-TIME session, not ordinary work. Say so plainly and warmly, in your own words — something like \"before we get into day-to-day things, I want to properly understand your business — this is a one-off, not something we do every time.\" Then work through `stage.goal` using `outstanding` as your guide. ASK ONE THING. Not a list, not a form — a conversation. Let him talk, follow up, then move to the next outstanding item next turn. Do NOT draft quotes, chase debtors, or do ordinary exec work while `complete` is false — understanding comes first.\n\nIf `complete` is true: say nothing about discovery at all, and get straight into being his fractional executive as normal.\n\nNo parameters — it reads the account, not a topic you choose.",
    webhook: { url: `${baseUrl}${KIRA_DISCOVERY_AGENDA_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: { type: 'object', properties: {} },
  };
}
