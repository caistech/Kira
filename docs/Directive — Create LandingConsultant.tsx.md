# Kira — Create Consultant-Focused Landing Page Variant

## Objective

Create a new landing-page component:

`C:\Users\denni\PycharmProjects\Kira\components\landing\LandingConsultant.tsx`

This is a **consultant-focused positioning variant of the existing Kira landing page**.

The strategic objective is to make `kiraexec.com` speak primarily to **business consultants/advisers who could incorporate Kira into their own client-delivery process**.

### Critical principle

**We are changing who the landing page speaks to — NOT changing what Kira does.**

`LandingConsultant.tsx` must therefore be a **front-door/content variant of the existing Kira experience**, not a separate consultant product or workflow.

---

# Existing Kira journey must remain unchanged

The consultant should enter Kira through the same experience that ultimately exists for a business owner.

The flow remains:

**Consultant arrives at `kiraexec.com`**

↓

**Consultant-focused landing page**

The page explains, in substance:

> Kira helps consultants deliver better outcomes for their business-owner clients by capturing what is in their heads, identifying business value gaps, and providing an ongoing AI capability that works alongside the consultant's advisory process.

↓

**Consultant starts the existing Kira journey**

↓

**Business valuation — existing 11-step valuation**

↓

**Existing valuation result / Value Gap**

↓

**Existing beta invitation / identity gate**

↓

**Existing CAIS Beta user portal**

↓

**Dashboard / My Genome / Plan / Knowledge / etc.**

↓

**Existing Kira voice-agent experience**

Nothing about this underlying journey should change.

---

# Strategic positioning

The strategic model behind this landing page is:

**Consultant adopts Kira**

→ Consultant uses Kira with clients

→ Clients get better visibility and control over their businesses

→ Business-owner dependency and knowledge gaps are identified and addressed

→ Business becomes more transferable and valuable

→ Consultant delivers a stronger client outcome

→ Consultant has a differentiated, ongoing AI capability embedded in their advisory offering

The landing page should therefore position Kira as:

**A capability the consultant can use as part of their business and client service.**

It should NOT primarily position Kira as:

- an AI receptionist
- a standalone chatbot
- an exit-readiness tool
- a software product the business owner buys independently
- merely a valuation calculator
- a generic AI assistant

The valuation is the **demonstration and entry point into Kira's capability**, not the entire product proposition.

---

# Example positioning direction

Instead of leading primarily with:

> "Your business has a value gap."

the consultant version should lead toward a proposition such as:

> **Give your clients a better path to a stronger business — and give yourself a powerful new capability to help them get there.**

The exact wording is up to you, but the underlying idea must remain:

**Better client outcomes + stronger consultant capability + Kira working alongside the consultant.**

---

# What should change

Change the landing-page presentation and messaging to focus on the consultant.

This includes:

### 1. Hero messaging

The hero should immediately make clear why a consultant should care about Kira.

Focus on:

- improving client outcomes
- helping clients uncover business value gaps
- capturing business knowledge
- reducing owner dependency
- helping make businesses more transferable
- giving the consultant an ongoing AI capability
- extending the consultant's ability to work with clients between advisory engagements
- making Kira part of the consultant's service offering

Do not make the hero primarily about Kira's underlying technology.

---

### 2. Consultant problems

Explain the problems consultants commonly face when helping owner-operated businesses.

For example:

- The owner has too much critical knowledge in their head.
- Important business information is fragmented or undocumented.
- Clients often don't see the weaknesses that affect business value.
- Advisory engagements can identify issues without creating an ongoing mechanism for addressing them.
- Consultants need better visibility into what is actually happening inside the client's business.
- Owners may understand what needs to improve but struggle to turn that understanding into consistent action.
- The consultant may only see the business periodically while the business operates every day.

Do not overstate or invent unsupported claims.

---

### 3. Consultant benefits

Emphasise the benefits of having Kira as part of the consultant's capability.

Potential themes include:

- Extend your advisory capability with AI.
- Give clients a mechanism for continuously capturing business knowledge.
- Surface issues and value gaps that might otherwise remain hidden.
- Help clients become less dependent on the owner.
- Create a more structured client-development journey.
- Stay connected to what is happening between advisory sessions.
- Help clients build a stronger, more transferable business.
- Differentiate the consultant's offering.
- Potentially support more clients without simply adding equivalent consultant hours.

These should be presented credibly rather than as exaggerated AI promises.

---

### 4. Consultant + Kira + Business Owner continuum

The page should communicate that Kira is **not replacing the consultant**.

Instead:

**Consultant + Kira + Business Owner**

work together.

The consultant remains the human adviser and relationship holder.

Kira provides the ongoing AI capability that helps capture, organise, surface and work with the business owner's knowledge and business information.

This distinction is strategically important.

Do not frame Kira as:

> "AI replaces your consulting work."

Frame it as:

> **Kira makes your consulting capability more continuous, informed and scalable.**

---

### 5. Client outcomes

Explain that the consultant's ultimate value comes from helping the business owner achieve a better business outcome.

Those outcomes can include:

- greater business visibility
- reduced owner dependency
- stronger systems and knowledge transfer
- improved transferability
- identification of business value gaps
- a stronger and more valuable business
- greater freedom for the owner
- a better position for whatever transition eventually occurs

The consultant is therefore not selling "AI".

They are using Kira to help deliver a better business outcome.

---

### 6. CTA language

CTAs should be appropriate for a consultant discovering Kira.

The CTA should invite the consultant to **experience Kira**, rather than requiring them to understand the complete product architecture first.

The existing valuation journey should remain the mechanism for doing this.

The landing page should make the transition feel natural:

**See what Kira can uncover → experience the valuation → enter the Kira experience → access the beta portal.**

Do not create a separate consultant onboarding process.

---

# What MUST NOT change

This is a hard boundary.

`LandingConsultant.tsx` must NOT modify or duplicate the underlying Kira product logic.

Do not modify:

- valuation logic
- valuation questions
- valuation calculations
- valuation result calculations
- sessionStorage/resume behaviour
- authentication
- magic-link behaviour
- beta-code handling
- beta identity gate
- beta provisioning
- organisation assignment
- organisation membership logic
- dashboard
- My Genome
- Plan
- Knowledge
- Admin functionality
- voice-agent routing
- ElevenLabs integration
- Kira agent logic
- existing APIs
- existing database behaviour
- Supabase logic
- existing routes

Do not introduce a separate consultant account type.

Do not introduce a separate consultant valuation.

Do not create a consultant-specific portal.

Do not create a consultant-specific voice-agent architecture.

Do not change the existing user journey to accommodate the new positioning.

---

# Component architecture

The intended architecture is:

```text
LandingNew.tsx
    │
    └── Existing/current Kira positioning
            │
            ▼
       SAME KIRA FLOW
            │
            ▼
        Valuation
            │
            ▼
      Beta / Identity
            │
            ▼
        User Portal
```

and:

```text
LandingConsultant.tsx
    │
    └── Consultant-focused positioning
            │
            ▼
       SAME KIRA FLOW
            │
            ▼
        Valuation
            │
            ▼
      Beta / Identity
            │
            ▼
        User Portal
```

The two components should therefore differ primarily in:

- copy
- messaging
- positioning
- section emphasis
- visual storytelling where appropriate
- consultant-oriented benefits
- consultant-oriented problems
- consultant-oriented outcomes
- CTA wording

---

# Reuse the existing landing-page design language

Use the existing `LandingNew.tsx` as the structural/design reference.

Do not unnecessarily redesign the entire page.

The goal is to create a **clean A/B positioning variant**, so that we can switch between:

- current/general Kira positioning
- consultant positioning

without introducing unrelated UI or product changes.

Where existing components, styles, animations, assets or patterns can be reused, reuse them.

Do not create unnecessary dependencies.

---

# Important strategic distinction

Do NOT think of this as:

> "Build Kira for Consultants."

Think of it as:

> **"Create a consultant-oriented front door to the existing Kira experience."**

The consultant should be able to discover Kira, understand why it could be valuable to their practice, and then experience the same Kira journey that they may eventually introduce to their own clients.

That is particularly important for the beta.

The consultant should effectively be able to say:

> "I want to understand what my client would experience."

And the existing Kira journey gives them that experience.

---

# Implementation requirements

1. Create only:

`components/landing/LandingConsultant.tsx`

2. Do not modify `LandingNew.tsx`.

3. Do not modify any downstream Kira flow.

4. Do not alter routes, APIs, database logic or authentication.

5. Ensure the component can be substituted for `LandingNew.tsx` by the existing landing-page entry point with minimal/no additional architectural work.

6. Preserve the existing landing-page responsiveness and general design quality.

7. Ensure all links and CTAs continue into the **existing Kira routes and flow**.

8. Do not create fake consultant functionality simply to support the new messaging.

9. Do not claim capabilities that do not currently exist in Kira.

10. Keep the implementation clean enough that `LandingNew.tsx` can remain the existing/general version and `LandingConsultant.tsx` can be used as the alternative positioning experiment.

---

# Validation

After implementation, verify:

### Component

- `LandingConsultant.tsx` exists.
- It compiles.
- It does not introduce TypeScript errors.
- It does not modify `LandingNew.tsx`.

### Landing experience

Verify that:

- the page clearly speaks to consultants
- the consultant value proposition is immediately understandable
- Kira is positioned as working alongside the consultant
- client outcomes remain central
- the valuation is still the existing entry mechanism
- CTAs lead into the existing Kira journey

### Flow integrity

Verify that the downstream journey remains exactly the existing one:

**Landing → valuation → valuation result/value gap → beta/identity → CAIS Beta portal → existing Kira functionality**

Do not change any of those downstream mechanics.

---

# Final success criterion

The result should feel like:

**"This is the same Kira, but now the person arriving at the front door is a consultant, and the page explains why Kira is valuable to them and their clients."**

It should NOT feel like:

**"We built a separate consultant version of Kira."**

The purpose of this component is to allow us to switch the **market positioning** of Kira without changing the **product experience** underneath it.