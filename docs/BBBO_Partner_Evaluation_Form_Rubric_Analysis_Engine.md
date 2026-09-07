# BBBO Partner Evaluation — Form, Rubric & Analysis Engine
## Coding Assistant Implementation Directive

### 1. Objective

Build the BBBO Founding Partner Evaluation system as a **structured assessment, scoring and analysis capability**, not merely a questionnaire.

The system must allow BBBO to evaluate prospective ecosystem partners consistently against the requirements of the 10,000 BBBO True-Value Mission and produce structured, comparable, evidence-backed analysis.

The output must allow us to answer:

1. **Should we work with this organisation?**
2. **What capability does it bring to the BBBO ecosystem?**
3. **How many relevant BBBO businesses can it reach?**
4. **Which specific value gaps can it address?**
5. **Can its intervention produce measurable improvement?**
6. **Can that improvement ultimately contribute to proven True-Value?**
7. **What role should this organisation play?**
8. **Should it be a founding, strategic, capability, technology, network or other partner?**
9. **Should we work with multiple organisations in the same capability category?**
10. **What should BBBO ask of the organisation next?**

The system must therefore produce both:

- a **quantitative partner score**, and
- a **qualitative strategic analysis/recommendation**.

---

# 2. CRITICAL FIRST STEP — REPOSITORY FORENSIC AUDIT

Before writing new application code, perform a comprehensive inspection of:

`C:\Users\denni\PycharmProjects\`

Do **not** assume that the correct architecture is contained in Kira or corporate-ai-solutions.

Search the entire portfolio for existing implementations of:

- forms
- assessments
- questionnaires
- surveys
- scoring
- rubrics
- weighted scoring
- assessment dimensions
- maturity models
- recommendations
- AI analysis
- response analysis
- report generation
- dashboards
- structured JSON assessment outputs
- Supabase assessment tables
- question definitions
- scoring configuration
- score calculation
- evidence capture
- recommendation engines
- assessment history
- comparison of assessment results
- admin review workflows
- PDF/report outputs
- OpenAI/LLM analysis of structured form responses

At minimum explicitly inspect:

- `Kira`
- `corporate-ai-solutions`
- `prelabzAI`
- `LingoPureAI`
- `partner-pilot`

Also inspect **every other repository in `PycharmProjects`**, not merely these named repositories, for similar architectural shapes.

The objective is to discover whether a mature pattern already exists.

### Do not duplicate an existing pattern.

If an existing implementation has:

- a reusable form schema,
- question model,
- scoring engine,
- rubric structure,
- response storage,
- AI analysis layer,
- report generation,
- dashboard,
- or reusable UI component,

determine whether the BBBO system should reuse or extract that pattern.

Document the findings before implementation.

---

# 3. REQUIRED FORENSIC OUTPUT

Create a short repository comparison before making architectural decisions.

For each relevant repository record:

| Repository | Relevant capability | Existing implementation | Reusable? | Why/why not |
|---|---|---|---|---|
| Kira | ... | ... | ... | ... |
| corporate-ai-solutions | ... | ... | ... | ... |
| prelabzAI | ... | ... | ... | ... |
| LingoPureAI | ... | ... | ... | ... |
| partner-pilot | ... | ... | ... | ... |
| other repos | ... | ... | ... | ... |

Identify the **best existing implementation pattern**.

If several repositories contain different approaches, compare them and select the strongest architecture rather than automatically copying the newest implementation.

---

# 4. DO NOT BUILD A SIMPLE GOOGLE-FORM CLONE

The form is only the collection layer.

The underlying system must have four distinct layers:

### Layer 1 — Assessment Definition

Defines:

- sections
- questions
- question types
- answer options
- scoring rules
- weights
- evidence requirements
- category mappings
- recommendation mappings

### Layer 2 — Response Capture

Stores:

- respondent
- organisation
- assessment instance
- answers
- evidence
- comments
- confidence
- timestamps
- completion state

### Layer 3 — Scoring & Analysis Engine

Calculates:

- dimension scores
- weighted scores
- overall score
- evidence quality
- confidence
- strategic fit
- capability fit
- ecosystem value
- reach
- intervention potential
- measurability
- commercial potential
- execution capability
- partner priority

### Layer 4 — Decision / Intelligence Output

Produces:

- scorecard
- strengths
- weaknesses
- gaps
- risks
- opportunities
- recommended partner category
- recommended engagement model
- recommended next actions
- questions requiring follow-up
- whether partnership should proceed
- whether the organisation should be evaluated alongside/against other providers in the same capability category

---

# 5. FORM STRUCTURE

Design the assessment around the actual BBBO ecosystem proposition.

The mission defines the BBBO as the beneficiary, the ecosystem as the capability provider, the marketplace as the proving ground, and resulting transaction data as intelligence that progressively improves the ecosystem.

The form should therefore evaluate the partner across the following core dimensions.

## A. Organisation & Strategic Fit

Capture:

- organisation
- respondent
- role
- geography
- business model
- customer profile
- target-market alignment
- strategic objectives
- current ecosystem position

Assess:

**Does this organisation naturally belong in the BBBO ecosystem?**

---

## B. BBBO Reach

Assess:

- number of relevant business-owner customers/members
- approximate number of BBBOs
- geographic reach
- industry reach
- existing distribution channels
- relationship depth
- ability to recruit businesses into the programme
- expected annual recruitment capacity

This is critical because the founding-partner proposition specifically asks:

> What BBBOs can you reach?

Do not reduce this to a single number.

Capture both:

**Reach = quantity**

and

**Reach Quality = relevance × relationship × accessibility × conversion potential**

---

# 6. CAPABILITY / VALUE-GAP ASSESSMENT

Map the partner against the BBBO value-gap framework.

Initial categories should include:

- owner dependence
- undocumented operational knowledge
- management depth
- financial information quality
- customer concentration
- recurring revenue
- operational efficiency
- technology maturity
- data quality
- organisational clarity
- documented systems
- succession readiness
- legal/structural readiness
- visibility of true performance

These value gaps are explicitly identified in the BBBO mission.

For each capability, determine:

1. Does the partner address it?
2. How strongly?
3. For what types of business?
4. Through what mechanism?
5. What evidence exists?
6. Can improvement be measured?
7. Could improvement plausibly affect transferability?
8. Could improvement plausibly affect valuation?

---

# 7. INTERVENTION CAPABILITY

Do not merely ask what the organisation sells.

Determine what it can actually **change inside a BBBO business**.

Capture:

- intervention type
- methodology
- implementation model
- implementation timeframe
- customer effort
- partner effort
- dependencies
- scalability
- repeatability
- implementation capacity
- expected outcomes

Distinguish:

**Capability claimed**

from

**Capability demonstrated**

from

**Capability independently evidenced**

---

# 8. EVIDENCE SCORE

Evidence quality must be a first-class scoring dimension.

For every significant capability capture evidence such as:

- customer case studies
- measured outcomes
- before/after data
- independent validation
- customer retention data
- valuation impact
- operational metrics
- documented methodology
- references
- transaction evidence

Do not award maximum scores simply because a partner makes a claim.

The system must distinguish:

### Level 0
No evidence.

### Level 1
Claim/assertion.

### Level 2
Example/customer anecdote.

### Level 3
Measured customer outcome.

### Level 4
Repeated measured outcomes across customers.

### Level 5
Independent/transaction/valuation evidence.

The precise scale may be adjusted if an existing repository contains a superior established rubric.

---

# 9. MEASURABILITY

A core question is:

**Can we prove that this partner's intervention actually improved the business?**

Score:

- baseline measurability
- intervention measurability
- outcome measurability
- repeatability
- attribution
- evidence availability

This is directly aligned with the mission's Proof Year requirements: identify factors, intervene, measure improvement and determine whether improvement translates into demonstrable value.

---

# 10. TRUE-VALUE CONTRIBUTION

Evaluate the partner's potential contribution to:

**Assess → Improve → Measure → Prove → Sell**

The mission explicitly defines this progression around Maximum Proven True-Value.

The engine should therefore determine whether the partner contributes primarily to:

- Assessment
- Improvement
- Measurement
- Evidence
- Valuation
- Transferability
- Buyer readiness
- Transaction
- Post-acquisition opportunity

A partner can score highly without contributing to every stage.

---

# 11. BUYER-SIDE VALUE

Assess whether the partner's capability helps create businesses matching:

**Quality + Transferability + Visibility + Upside**

These are explicit components of the buyer proposition.

Evaluate:

- acquisition-risk reduction
- transferability
- operational visibility
- integration readiness
- scalability
- remaining growth opportunity
- buyer attractiveness

---

# 12. COMMERCIAL / ECOSYSTEM VALUE

Assess what the partnership creates for BBBO itself.

Potential dimensions:

- customer acquisition
- BBBO distribution
- sponsorship potential
- cohort funding
- recurring revenue
- technology revenue
- service revenue
- marketplace participation
- buyer access
- data contribution
- benchmarking value
- strategic credibility
- brand leverage

The mission explicitly identifies partner membership, sponsored cohorts, technology, transaction revenue, buyer subscriptions, data/benchmarking and marketplace services as potential commercial layers.

---

# 13. PARTNER CATEGORY

The engine should recommend an appropriate partner classification.

At minimum evaluate:

- Founding Partner
- Strategic Partner
- Capability Partner
- Technology Partner
- Network Partner

These categories are already defined in the BBBO mission.

Do not hard-code category selection solely from one score.

Use a combination of:

**score + evidence + strategic fit + reach + capability + commercial value + ecosystem gap**

---

# 14. CAN WE WORK WITH MORE THAN ONE PARTNER?

This is an explicit requirement.

The system must NOT assume:

> one capability = one partner.

Instead identify:

- overlapping capability
- complementary capability
- competitive capability
- geographic specialisation
- vertical specialisation
- customer-segment specialisation
- technology differentiation
- evidence differentiation

For example, if three organisations provide broadly similar technology capability, the analysis should be capable of concluding:

> Work with all three

or

> Select one

or

> Use one as strategic partner and others as capability providers

or

> Run a competitive pilot.

The system must therefore support **comparative partner analysis**.

---

# 15. SCORING ENGINE

Do not bury scoring logic inside React components or form handlers.

Scoring must be configuration-driven.

Prefer a structure such as:

```text
Assessment
  ├── Sections
  │    ├── Questions
  │    │    ├── Options
  │    │    ├── Score
  │    │    ├── Weight
  │    │    └── Evidence requirement
  │    └── Dimension
  └── Rubric
```

The actual architecture must follow the best existing pattern discovered during repository forensics.

Scores should be reproducible from stored responses.

Given identical inputs:

**the scoring engine must always produce the same deterministic score.**

LLM analysis must not silently alter the underlying numeric score.

---

# 16. WEIGHTING

Create explicit weighting at multiple levels where appropriate:

**Question → Dimension → Overall Assessment**

Do not arbitrarily assign equal weights simply because it is convenient.

Document why each major dimension is weighted.

The initial dimensions should be considered candidates:

- Strategic Fit
- BBBO Reach
- Capability
- Value-Gap Coverage
- Intervention Strength
- Evidence Quality
- Measurability
- True-Value Contribution
- Buyer Value
- Commercial Value
- Scalability
- Strategic Differentiation
- Execution Readiness

The coding assistant should validate these against existing scoring frameworks found in the portfolio before freezing them.

---

# 17. QUALITATIVE AI ANALYSIS

Use the LLM as an **analysis layer**, not the source of truth for scoring.

Input:

- structured answers
- deterministic scores
- evidence
- organisation information
- capability mappings
- relevant assessment history
- comparative partner data

Output structured JSON containing:

```text
executive_summary
strategic_fit
key_strengths
key_weaknesses
value_gap_coverage
evidence_assessment
risks
opportunities
competitive_position
recommended_partner_category
recommended_engagement_model
recommended_next_steps
follow_up_questions
partnership_recommendation
confidence
```

The LLM must cite the specific assessment answers/evidence it relied upon wherever the existing architecture supports this.

Do not allow unsupported AI assertions to appear as factual findings.

---

# 18. ANALYSIS OUTPUT

Produce a human-readable partner scorecard containing:

### Executive Recommendation

- Recommended / Conditional / Do Not Proceed
- confidence
- overall score

### Strategic Fit

### BBBO Reach

### Capability Map

### Evidence Strength

### Measurability

### True-Value Contribution

### Buyer Value

### Commercial/Ecosystem Value

### Risks

### Competitive/Overlap Analysis

### Recommended Partner Role

### Recommended Pilot

### Questions To Resolve

### Next Action

The analysis should make it possible for Dennis/BBBO leadership to review a prospective partner in minutes rather than reading the raw questionnaire.

---

# 19. COMPARATIVE ANALYSIS

Build the data model so multiple completed assessments can be compared.

Example:

```text
Partner A
Partner B
Partner C
Partner D
```

The system should be able to generate:

- ranked comparison
- dimension-by-dimension comparison
- capability overlap
- capability gaps
- evidence comparison
- reach comparison
- commercial comparison
- recommended portfolio of partners

This is particularly important where BBBO is assessing competing technology/integration/AI providers.

The objective is not necessarily to find **the winner**.

The objective is to determine the **best ecosystem configuration**.

---

# 20. DATA MODEL

Before implementation, inspect existing schemas in the relevant repositories.

Prefer reuse of established patterns.

The final model should support at least:

```text
assessment_definitions
assessment_sections
assessment_questions
assessment_options
assessment_rubrics
assessment_instances
assessment_responses
assessment_evidence
assessment_scores
assessment_analyses
partner_capabilities
partner_categories
partner_comparisons
```

Do not create these exact tables if an existing canonical architecture already provides equivalent structures.

First determine whether existing assessment infrastructure can be extended.

---

# 21. VERSIONING

Assessment definitions and rubrics must be versioned.

A completed assessment must retain the exact:

- questions
- options
- weights
- rubric
- scoring rules

used when it was completed.

Changing the rubric later must not retroactively change historical partner scores.

---

# 22. EVIDENCE & AUDITABILITY

Every score should be explainable.

For example:

```text
Overall Score: 78/100

BBBO Reach: 92
  Evidence:
  - X existing customers
  - Y relevant businesses
  - Z distribution channels

Evidence Quality: 61
  Evidence:
  - 3 customer case studies
  - limited independent valuation evidence
```

A reviewer must be able to drill down from:

**Overall score → dimension → question → response → evidence**

---

# 23. FORM UX

The form should be designed for a real partner meeting.

Do not create a giant intimidating questionnaire.

Use logical sections and progressive disclosure.

Potential flow:

1. Organisation
2. Strategic Fit
3. BBBO Reach
4. Capabilities
5. Value Gaps
6. Intervention
7. Evidence
8. Measurement
9. Commercial/Ecosystem Opportunity
10. Sponsorship / Cohort
11. Strategic Partnership
12. Final Comments

Allow save/resume if the existing platform supports it.

---

# 24. MEETING MODE

The assessment should work particularly well when used immediately following or during a partner meeting.

The form should capture both:

**what the partner says**

and

**what BBBO subsequently determines**.

Do not conflate partner self-assessment with BBBO evaluation.

Where appropriate maintain separate fields:

```text
partner_claim
partner_evidence
bbbo_assessment
bbbo_score
bbbo_confidence
```

---

# 25. SPONSORSHIP / COHORT ASSESSMENT

Explicitly capture whether the partner would sponsor a defined cohort.

The mission identifies sponsored cohorts as a potentially attractive early commercial model.

Capture:

- willingness to sponsor
- number of businesses
- target customer population
- funding appetite
- preferred cohort
- desired outcomes
- measurement requirements
- commercial objectives

This should feed the partner's commercial score.

---

# 26. ANALYSIS ENGINE — SECONDARY INTELLIGENCE

Once multiple assessments exist, create portfolio-level analysis.

Examples:

### Capability Coverage

Which BBBO value gaps are adequately covered?

### Capability Gaps

Where do we have no ecosystem capability?

### Partner Redundancy

Where do we have too many overlapping providers?

### Best-in-Class

Which provider has strongest evidence in each capability?

### Reach

Which partners can bring the largest number of relevant BBBOs?

### Intervention Potential

Which capabilities are most likely to create measurable improvement?

### Commercial Potential

Which partners can materially help fund or scale the mission?

### Ecosystem Design

What combination of partners gives BBBO the strongest overall ecosystem?

This is where the dataset starts becoming strategically valuable.

---

# 27. DO NOT INVENT A NEW ARCHITECTURE IF ONE ALREADY EXISTS

This is a hard requirement.

The coding assistant must inspect the portfolio before implementation.

If Prelabz or LingoPure already contains a superior:

- scoring engine
- assessment schema
- AI analysis architecture
- report engine
- reusable UI
- Supabase structure

then determine whether it can be:

1. reused directly,
2. extracted into a shared pattern,
3. adapted,
4. or deliberately rejected with documented reasons.

Likewise inspect Kira and corporate-ai-solutions.

The purpose is to leverage accumulated implementation experience rather than create a fifth divergent version.

---

# 28. IMPLEMENTATION SEQUENCE

Execute in this order:

### Phase A — Discovery

1. Inventory all `PycharmProjects` repositories.
2. Search every repository for assessment/form/scoring/analysis patterns.
3. Identify candidate implementations.
4. Compare architectures.
5. Document recommendation.

### Phase B — Architecture

6. Identify target repository.
7. Identify reusable components.
8. Define canonical assessment data model.
9. Define scoring model.
10. Define AI analysis contract.
11. Define comparative-analysis model.

### Phase C — Build

12. Implement form definition.
13. Implement response capture.
14. Implement deterministic scoring.
15. Implement evidence capture.
16. Implement analysis engine.
17. Implement scorecard.
18. Implement comparative analysis.

### Phase D — Validate

19. Create representative partner test data.
20. Test scoring determinism.
21. Test edge cases.
22. Test incomplete assessments.
23. Test contradictory evidence.
24. Test multiple partners in the same capability.
25. Test historical assessment versioning.
26. Test AI output schema.
27. Test permissions/security.
28. Run existing repository tests.
29. Run TypeScript/build/lint checks.

### Phase E — Review

30. Compare implementation against the repository-forensic findings.
31. Confirm no duplicated functionality was unnecessarily created.
32. Confirm scoring is deterministic.
33. Confirm AI analysis cannot mutate canonical scores.
34. Confirm all scores are explainable.
35. Confirm comparative partner analysis works.
36. Produce final implementation report.

---

# 29. ACCEPTANCE CRITERIA

The task is **not complete** merely because a form renders.

It is complete only when:

- [ ] Entire `PycharmProjects` portfolio has been searched for similar patterns.
- [ ] Kira inspected.
- [ ] corporate-ai-solutions inspected.
- [ ] prelabzAI inspected.
- [ ] LingoPureAI inspected.
- [ ] partner-pilot inspected.
- [ ] Other relevant repositories identified and inspected.
- [ ] Existing patterns documented.
- [ ] Reuse opportunities evaluated.
- [ ] Assessment is configuration-driven.
- [ ] Rubric is explicit.
- [ ] Scoring is deterministic.
- [ ] Scores are weighted and explainable.
- [ ] Evidence is captured.
- [ ] Evidence quality affects analysis.
- [ ] Partner claims are distinguishable from BBBO assessment.
- [ ] AI analysis is structured.
- [ ] AI does not determine the canonical numeric score.
- [ ] Partner categories are generated from the rubric.
- [ ] Multiple partners can be compared.
- [ ] Multiple partners can coexist in one capability category.
- [ ] Historical assessments remain reproducible.
- [ ] Analysis identifies gaps, overlaps and opportunities.
- [ ] Scorecard is usable by BBBO leadership.
- [ ] Tests pass.
- [ ] Build/type/lint checks pass.
- [ ] No unnecessary parallel assessment architecture has been introduced.

---

# 30. FINAL DELIVERABLE

At completion provide:

### 1. Repository Forensic Report

What already existed and what was reused.

### 2. Architecture Decision

Why the chosen implementation is the correct pattern.

### 3. Assessment Specification

Questions, sections, dimensions and scoring.

### 4. Rubric

Complete scoring rules and weights.

### 5. Analysis Specification

Exact deterministic and AI-generated outputs.

### 6. Database / Schema Changes

What was added or reused.

### 7. Implementation Summary

Files changed and functionality delivered.

### 8. Test Results

Exact commands and outcomes.

### 9. Example Partner Analysis

Run at least one realistic test assessment through the complete pipeline.

### 10. Outstanding Issues

Anything deliberately deferred or requiring a business decision.

---

## Governing principle

Do not optimise this project for:

**“We have a form.”**

Optimise it for:

**“We now have a repeatable intelligence system that can evaluate, compare and select the ecosystem capabilities required to help 10,000 BBBO businesses maximise proven True-Value.”**

The assessment is the data-entry interface.

The rubric is the decision framework.

The scoring engine is the deterministic analytical layer.

The AI analysis is the interpretation layer.

The accumulated assessments become the proprietary ecosystem intelligence.

That distinction is fundamental to the BBBO model: the mission explicitly intends the first 1,000 businesses to prove the methodology, measurement, valuation, buyer proposition and economics before scaling to 10,000.