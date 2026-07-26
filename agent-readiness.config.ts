import type { AgentReadinessConfig } from "@caistech/webmcp-kit";

// PRODUCT_STANDARDS §11 Layer 1 (DISCOVERABLE). Drives /llms.txt, landing JSON-LD, /.well-known/agent.json.
export const agentConfig: AgentReadinessConfig = {
  "name": "Kira",
  "displayName": "Kira — Your Friendly Guide Through Anything",
  "url": "https://kira-rho.vercel.app",
  "description": "A patient, knowledgeable AI companion who guides you through learning new skills, planning projects, or mastering anything. Like having a brilliant friend available 24/7.",
  "applicationCategory": "BusinessApplication",
  "keyPages": [
    {
      "title": "Home",
      "url": "https://kira-rho.vercel.app/",
      "description": "Meet Kira, your friendly AI guide through learning, planning, and mastering anything."
    },
    {
      "title": "Create your Kira",
      "url": "https://kira-rho.vercel.app/create-kira",
      "description": "Set up your own personalised Kira companion and start your first journey."
    },
    {
      "title": "Personal Journey",
      "url": "https://kira-rho.vercel.app/personal-journey",
      "description": "Follow a guided, step-by-step journey tailored to what you want to learn or achieve."
    },
    {
      "title": "Free business valuation",
      "url": "https://kira-rho.vercel.app/business-valuation",
      "description": "A free 3-minute valuation: what the business is worth today, and the value still locked in the owner's head. Kira's monthly fee is a small fraction of that gap and is only shown once the valuation has run — there is no price list."
    },
    {
      "title": "About",
      "url": "https://kira-rho.vercel.app/about",
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
