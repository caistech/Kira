// lib/kira/financials.ts
//
// look_up_financials — Kira reading the owner's own accounting system to answer a question.
//
// The read half of the doing slice. dispatch_task changes the world and is therefore held for a
// human; this only observes, so it answers immediately. That asymmetry is deliberate and is the
// reason read access can be generous where write access cannot: the worst outcome of a wrong read
// is an embarrassing number, and the worst outcome of a wrong write is a client who received
// something.
//
// THE QUERY IS OURS, NOT THE MODEL'S. The agent names one of a fixed set of resources; it never
// supplies a URL, a filter or a date range. Anything else would make an LLM's output into a query
// against a business's complete financial position, and Xero's read surface includes payroll and
// employee records that nobody asked to expose.
//
// WHAT MAY BE REMEMBERED — the operator's decision, 2026-07-28:
//
//   Conclusions, yes.   "revenue is concentrated in a handful of clients"
//   Figures, never.     no balances, no invoice amounts, no client names, no account numbers
//
// The reason is this ICP specifically. He often has not told his staff, his broker or his wife that
// he is selling; his balance distilled into a memory store outside our infrastructure is the
// exposure that matters more than any other in this product. Conclusions make the Business Genome
// better, which is what he is paying for. Figures make it a liability. DATA_STANDARD I4/S4 says the
// same thing in general terms — only distilled, non-PII memory leaves our infrastructure — and here
// it has a face.
//
// Degrade, don't fake (DATA_STANDARD R4). "Not connected", "can't read that" and "Xero is down" are
// three different answers and stay three different answers. None of them may become a zero: an
// owner told "nothing is owing" when we simply could not look has been given a false answer about
// money by a tool he bought to be trusted about money.

const ORCHESTRATOR_AUTH_HEADER = 'x-orchestrator-secret';

/** What an owner can ask about. Mirrors the orchestrator's whitelist; it is authoritative. */
export const FINANCIAL_RESOURCES = [
  'bank_balances',
  'invoices_owed_to_you',
  'bills_you_owe',
  'profit_and_loss',
  'organisation',
] as const;

export interface FinancialAnswer {
  ok: boolean;
  /** Speech-shaped figures, for SAYING — never for saving. */
  data?: Record<string, unknown>;
  reason?: string;
  message?: string;
  /** Repeated on every successful answer so the agent cannot forget it mid-conversation. */
  memory_rule?: string;
}

const MEMORY_RULE =
  'Say these figures. Do NOT save them. You may remember what they MEAN — "money owed is ' +
  'concentrated in a few clients", "cash is tighter than last quarter" — never the amounts, the ' +
  'balances, the invoice numbers or the client names.';

export async function lookUpFinancials(userId: string, resource: string): Promise<FinancialAnswer> {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';

  if (!baseUrl || !secret) {
    // Say what is true — that the connection is not configured — rather than implying the owner has
    // no money owed. The distinction is the entire point of this function's error handling.
    console.error('[financials] ORCHESTRATOR_URL / ORCHESTRATOR_SECRET missing — cannot read.');
    return {
      ok: false,
      reason: 'not_configured',
      message: "I can't reach the accounts just now — that's a problem at my end, not yours.",
    };
  }

  if (!(FINANCIAL_RESOURCES as readonly string[]).includes(resource)) {
    return {
      ok: false,
      reason: 'unsupported_resource',
      message: `I can look up: ${FINANCIAL_RESOURCES.join(', ')}. Not that one.`,
    };
  }

  try {
    const res = await fetch(`${baseUrl}/api/v1/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [ORCHESTRATOR_AUTH_HEADER]: secret },
      body: JSON.stringify({ tenantId: userId, provider: 'xero', resource }),
    });

    if (!res.ok) {
      return {
        ok: false,
        reason: 'upstream_error',
        message: "I couldn't get into the accounts just now. Nothing's wrong with your books — I just couldn't look.",
      };
    }

    const body = (await res.json()) as Record<string, unknown>;
    if (!body.ok) {
      return {
        ok: false,
        reason: String(body.reason ?? 'unknown'),
        message:
          body.reason === 'not_connected'
            ? "Your Xero isn't connected to me yet, so I can't see the accounts. It takes a minute to link if you want me to."
            : String(body.message ?? "I couldn't look that up."),
      };
    }

    return { ok: true, data: body.data as Record<string, unknown>, memory_rule: MEMORY_RULE };
  } catch (error) {
    console.error('[financials] read failed:', error);
    return {
      ok: false,
      reason: 'upstream_error',
      message: "I couldn't reach your accounts just now — worth trying again in a moment.",
    };
  }
}
