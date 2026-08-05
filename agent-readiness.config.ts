import type { AgentReadinessConfig } from "@caistech/webmcp-kit";

// PRODUCT_STANDARDS §11 Layer 1 (DISCOVERABLE). Drives /llms.txt, landing JSON-LD, /.well-known/agent.json.
//
// REWRITTEN 2026-08-01. Every description here still sold the ORIGINAL Kira — "a patient,
// knowledgeable AI companion who guides you through learning new skills" — a product this one
// stopped being when it was repositioned to business-exit. That is not a stale string in a corner:
// this file is the single thing AI search and browser agents read to decide what Kira IS, so an
// agent asked "what does kira-rho do" answered with the wrong product entirely, and the two key
// pages it pointed at (/create-kira, /personal-journey) are from that older shape.
//
// It matters more now than it would have a year ago. Agents are a distribution channel, not just
// traffic — a product an agent describes wrongly is one it recommends to the wrong person, and the
// audience most likely to be reached this way is exactly the advisor/broker channel.
//
// The pricing sentence was also actively false as of today: it read "there is no price list", which
// stopped being true the moment the landing page began quoting a floor.

export const agentConfig: AgentReadinessConfig = {
  "name": "Kira",
  "displayName": "Kira — get the business out of your head",
  "url": "https://kiraexec.com",
  "description":
    "An AI executive who interviews a business owner in ordinary conversation and turns what only he knows into a written, transferable operations manual — the Business Genome. Built for owners in their 60s preparing to sell a business that currently runs on them, where the value locked in the founder's head is exactly what a buyer discounts. Voice-first, because the people who need it least want to type.",
  "applicationCategory": "BusinessApplication",
  "keyPages": [
    {
      "title": "Home",
      "url": "https://kiraexec.com/",
      "description":
        "What Kira does: talks to a business owner, writes down how the business actually runs, and turns that into a document a buyer's advisor can read. Plans start at $499 + GST per month."
    },
    {
      "title": "Free business valuation",
      "url": "https://kiraexec.com/business-valuation",
      "description":
        "A free 3-minute valuation: what the business is worth today, and the value still locked in the owner's head. No sign-up and no card. Kira's monthly fee is set as a small fraction of that gap, so the personalised price appears after the valuation; the floor is $499 + GST per month."
    },
    {
      "title": "An example Business Genome",
      "url": "https://kiraexec.com/genome",
      "description":
        "A worked example of the deliverable, organised by the questions a buyer's advisor asks — what is documented, and what is still only in the owner's head."
    },
    {
      "title": "What she does",
      "url": "https://kiraexec.com/what-she-does",
      "description":
        "The work Kira does between conversations: drafting quotes and follow-ups for approval, filing documents, and keeping the Genome current."
    },
    {
      "title": "For advisors and brokers",
      "url": "https://kiraexec.com/advisors",
      "description":
        "For business brokers, accountants and advisors with clients approaching an exit: how to introduce Kira to an owner, and what the referral arrangement is."
    },
    {
      "title": "About",
      "url": "https://kiraexec.com/about",
      "description": "The story behind Kira, built by one developer."
    }
  ],
  "provider": {
    "name": "Global Buildtech Australia Pty Ltd",
    "url": "https://corporateaisolutions.com",
    "legalId": "ABN 54 672 395 685"
  },
  "contactEmail": "dennis@corporateaisolutions.com"
};
