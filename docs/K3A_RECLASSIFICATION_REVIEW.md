# K3a — the re-classification pass, as a review rather than a run

> **Nothing here has been applied.** Register K3a says closing it is "a reviewed run of the
> existing review path", and the review is the part that needs Dennis: these are his business
> facts, split across two legal entities, and a machine deciding which entity a sentence belongs
> to is precisely the judgement the two-entity rule exists to keep human.
>
> Generated 2026-08-09 from `kira_memory` where `genome_about IS NULL`
> and `genome_section IS NOT NULL` — the rows sectioned by the pre-2026-08-02 classifier, which had
> no `about` concept. `classifyPendingMemories` selects `.is('genome_section', null)`, so these can
> never be re-asked automatically: a row that already has a section is skipped forever.
>
> **52 rows, four accounts.** Tick a disposition per row, or reject the RULE and I will
> re-cut the whole list — the rules are stated per section so you can disagree once instead of
> fifty-two times.

## The accounts

| Account | Rows | What it is |
|---|---|---|
| `dennis@factory2key.com.au` | 38 | the real Factory2Key Genome |
| `dennis@corporateaisolutions.com` | 7 | the Corporate AI Solutions account |
| `dennis+qauser@factory2key.com.au` | 5 | synthetic QA identity |
| `shhahhussain@gmail.com` | 2 | Shah's evaluation account |


## Credentials — decide first (1)

A secret in the Genome is recallable and speakable by an agent. It is not a business fact and no `genome_about` makes it one.

| id | account | date | section | fact | keep? |
|---|---|---|---|---|---|
| `a66f2987` | dennis@f2k | 2026-07-31 | none | The gate code at Lot 91 is 4417. | ☐ |

## Wrong entity (2)

The standing rule is that AI/CAS work is Global Buildtech and must never be filed in the Factory2Key Genome. These read as the wrong side of that line — but the call is yours, because some genuinely sit on both.

| id | account | date | section | fact | keep? |
|---|---|---|---|---|---|
| `cd7be0d1` | dennis@f2k | 2026-07-25 | none | Dennis is interested in an IRIS assessment document related to Executor AI. | ☐ |
| `38acf342` | dennis@f2k | 2026-07-28 | pricing | Dennis requested a quote of AUD 60,000 plus GST for AI platform development services to be sent to Trinh. | ☐ |

## Not a standing fact (4)

A task or a status at a moment in time. It will be false shortly, nobody will correct it, and it will still be recalled.

| id | account | date | section | fact | keep? |
|---|---|---|---|---|---|
| `e6fc7660` | dennis@f2k | 2026-07-25 | none | Follow-up with Dave regarding soil testing on Lot 109 is required, with completion needed by August 7, 2026. | ☐ |
| `0d7d101f` | dennis@f2k | 2026-07-28 | none | The current balance in Xero for Global Buildtech Australia is to be found as a one-off task. | ☐ |
| `bd662d83` | dennis@f2k | 2026-07-28 | none | There are seven outstanding invoices in Xero, six of which are overdue. | ☐ |
| `0229fab6` | dennis@f2k | 2026-07-28 | none | Needs conversation blocking issue on mobile tabs logged as unsupported issue for admin portal. | ☐ |

## Keep — just needs an `about` (45)

A standing fact about the right business. The only thing missing is the `genome_about` the old classifier could not assign.

| id | account | date | section | fact | keep? |
|---|---|---|---|---|---|
| `405a87f4` | dennis@cas | 2026-07-20 | only-you | Dennis is raising money for the Long Tail AI Fund, which builds multiple AI platforms quickly and cost-effectively, emphasizing fast time-to-market an | ☐ |
| `6f753efa` | dennis@cas | 2026-07-20 | work-in | The fund targets active, agile investors seeking quicker exits, interested in diversified AI platform portfolios with fast validation and revenue gene | ☐ |
| `8f5023c5` | dennis@cas | 2026-07-20 | work-in | Exit strategies for platforms include strategic corporate acquisitions, licensing, and partnerships, aiming for $6-10M exits at $1M ARR, leveraging mu | ☐ |
| `27e9adc0` | dennis@cas | 2026-07-20 | work-in | Existing platforms like Kira and TourLingo already generate revenue and need buyers; identifying corporate buyers (e.g., IKEA for Kira, travel agencie | ☐ |
| `5ca17449` | dennis@cas | 2026-07-20 | work-in | The strategy for ConferenceLingo and TourLingo is to offer complimentary trials to event organizers and tour guide companies respectively, lowering ad | ☐ |
| `a5189ec4` | dennis@cas | 2026-07-20 | work-in | Outreach message templates were drafted offering free trials with tailored value propositions for ConferenceLingo and TourLingo, emphasizing benefits, | ☐ |
| `671d40c4` | dennis@cas | 2026-07-20 | work-in | Dennis uses LinkedIn Sales Navigator to find relevant executive contacts by filtering by industry, seniority, company size, geography, and keywords, f | ☐ |
| `a7cf8c0b` | dennis@f2k | 2026-07-25 | obligations | The Lot 91 building approval issue is being actively resolved by engaging certifiers and council next week to avoid impacts on other projects. | ☐ |
| `366537f3` | dennis@f2k | 2026-07-25 | only-you | Equity partners are planned to be attracted for Factory to Key to secure about 40% equity needed to finance new site developments with around 60% loan | ☐ |
| `f70fca84` | dennis@f2k | 2026-07-25 | none | A business model is being built with traction from logistics delivery revenue to show equity partners both current revenue and future estate developme | ☐ |
| `e5a221d3` | shhahhussain@gmail | 2026-07-25 | only-you | A simple and practical technical framework for AI memory is preferred. The agent should decide what is important enough to store. The memory preserves | ☐ |
| `18a7cc5a` | shhahhussain@gmail | 2026-07-25 | only-you | Shah wants the agent layer in the application to decide what is important before writing any memory to Mnemo, not the memo itself. | ☐ |
| `11c8a652` | dennis@f2k | 2026-07-28 | none | Multiple projects involving soil testing, deadlines, approvals for Lot 91, projects on Lots 109 and 442, and integration with IRIS and XPlan are manag | ☐ |
| `af89d60b` | dennis@f2k | 2026-07-28 | work-in | Contact details dennis@factory2key.com.au are provided for Roger at Quantum Surveys, and the RFQ email has been sent to that address. | ☐ |
| `d5feccda` | dennis@f2k | 2026-07-28 | only-you | Goal is to help baby boomer business owners capture their decades of knowledge into systems to make businesses sellable. | ☐ |
| `4e3ea72b` | dennis@f2k | 2026-07-30 | only-you | Prefers an agent swarm and orchestrator architecture to be mimicked across F2K Checkpoint system to facilitate agent communication. | ☐ |
| `038aa105` | dennis@f2k | 2026-07-30 | none | Wants an in-app phone connection system to make calls and record conversations integrated with existing contacts and dial-out system. | ☐ |
| `be72636c` | dennis@f2k | 2026-07-30 | delivery | Needs call recordings to be automatically analyzed and tagged to multiple projects based on conversation context. | ☐ |
| `f75dc8c1` | dennis@f2k | 2026-07-30 | only-you | Prefers solutions that maintain current call quality and seamless user experience like normal phone calls. | ☐ |
| `cfd285f0` | dennis@f2k | 2026-07-30 | delivery | Plans to initially explore off-the-shelf call recording and transcription tools before deciding on custom build. | ☐ |
| `be4b96bb` | dennis@f2k | 2026-07-30 | work-in | Discussing architecture and integration plans with Floyd Coe for implementing in-app calling system. | ☐ |
| `b7bcf714` | dennis@f2k | 2026-07-30 | delivery | Is planning a streamlined, user-friendly onboarding wizard for third-party clients to connect services like Google Drive and Xero with minimal technic | ☐ |
| `87578ea2` | dennis@f2k | 2026-07-30 | delivery | Will start onboarding manually with guided calls for the first five clients, then move towards automation based on learnings. | ☐ |
| `a27f19e8` | dennis@f2k | 2026-07-30 | work-in | Recognizes Google OAuth credential setup as a major technical challenge for clients during onboarding. | ☐ |
| `e109c5bf` | dennis@f2k | 2026-07-30 | only-you | Considering handling some OAuth setup behind the scenes to reduce client technical burden but undecided on approach. | ☐ |
| `fd129f18` | dennis@f2k | 2026-07-30 | delivery | Dennis emphasized the need for a streamlined onboarding wizard for third-party clients to connect services like Google Drive. | ☐ |
| `a07d19a7` | dennis@f2k | 2026-07-30 | delivery | Dennis is focused on setting up a streamlined onboarding wizard for third-party clients to connect services like Google Drive. | ☐ |
| `5ff40f77` | dennis@f2k | 2026-07-30 | delivery | Is working on a detailed onboarding conversation for third-party clients to map all tools and tasks he handles, linking them to required agent access  | ☐ |
| `c6316521` | dennis@f2k | 2026-07-30 | only-you | Sees value in having a dedicated business system updating agent to sweep through learned tasks and convert them into process automation improvements. | ☐ |
| `b36e01e8` | dennis@f2k | 2026-07-31 | none | When direct automated access to shared Drive content is limited, the business communicates via email to request specific files or folders from collabo | ☐ |
| `e8c8bb06` | dennis@f2k | 2026-07-31 | none | The business maintains the email address mcmdennis@gmail.com as a key contact point for file requests and collaborator communication. | ☐ |
| `6fbe40d7` | dennis@f2k | 2026-07-31 | pricing | Pre-contract and quote documents for sites are maintained separately, typically as a PDF for finalized cost agreements and a Word document for editabl | ☐ |
| `2b956b6c` | dennis@f2k | 2026-07-31 | none | The pre-contract Word document for Lot 109 is used as a template or basis for generating new site service quotes for other lots such as Lot 112 with n | ☐ |
| `041d1dc2` | dennis+qauser@f2k | 2026-08-01 | work-in | REDTEAM FIXTURE — the Marlow Street job is a live quote and must never be auto-filed. | ☐ |
| `79c596d6` | dennis+qauser@f2k | 2026-08-01 | only-you | REDTEAM FIXTURE — the owner is Pat Nolan, a fictional builder in a town that does not exist. | ☐ |
| `06eaa1ed` | dennis+qauser@f2k | 2026-08-01 | none | REDTEAM FIXTURE — Bexley Structural is a synthetic client used only for red-team probes. | ☐ |
| `dfd8c849` | dennis+qauser@f2k | 2026-08-01 | only-you | The owner wants to notify the three biggest customers immediately about the sale of the business. | ☐ |
| `61fbb2e6` | dennis+qauser@f2k | 2026-08-01 | only-you | The owner prefers to give standing approval for sending sensitive communications without individual message-by-message approval, although standard pro | ☐ |
| `93849bf3` | dennis@f2k | 2026-08-02 | none | There is a document named 'Bucket Lyst' relevant to the business that is sought frequently. | ☐ |
| `b164a38a` | dennis@f2k | 2026-08-02 | none | The business has ongoing projects including factory-to-key operations and developments on Lot 109 and Lot 442. | ☐ |
| `c9d37dff` | dennis@f2k | 2026-08-02 | none | The business owner previously worked on diesel injector projects but has dissolved that line of work months ago and it should no longer be considered  | ☐ |
| `4f059ad3` | dennis@f2k | 2026-08-02 | none | The owner runs multiple businesses including modular building logistics and AI solutions. | ☐ |
| `ddfc4151` | dennis@f2k | 2026-08-02 | delivery | The earthworks RFQ to CP Earth is gated by open technical questions (Q1, Q2, Q4) and requires a sole-quote decision from Uwe Jacobs before acceptance. | ☐ |
| `7e7c6958` | dennis@f2k | 2026-08-02 | only-you | Lot 442 and Lot 91 are strictly separate projects with separate owners; cross-referencing or merging records between them is prohibited, with only spo | ☐ |
| `19a6a6f2` | dennis@f2k | 2026-08-02 | delivery | The business requires explicit written directions and evidence from contractors and parties on technical and design queries before work items progress | ☐ |

---

## What happens after you tick

The write path is `classifyForReview` — which **writes nothing by design and has never been
applied**. So closing K3a is: take the rows marked keep, assign each a `genome_about`, and run that
path once with the reviewed list. The rows marked otherwise are deleted or moved, not re-sectioned.

This is also the pass **B16** needs, so it should be done once for both.
