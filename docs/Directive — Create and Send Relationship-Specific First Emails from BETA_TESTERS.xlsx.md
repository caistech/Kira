# DIRECTIVE — Create and Send Relationship-Specific First Emails from `BETA_TESTERS.xlsx`

## Objective

Using the contact data in:

`C:\Users\denni\PycharmProjects\Kira\docs\BETA_TESTERS.xlsx`

create and **send the first relationship-specific email** to every contact in the spreadsheet.

This is **NOT** the standard Kira Beta Tester invitation email.

A second, standard beta-testing email will be handled separately.

The purpose of this first email is to re-establish or define the relationship between Dennis / CAIS / Kira and the recipient, explain why they are being approached specifically, and introduce the broader **10,000 Baby Boomer Business Owner True-Value Mission / BBBO ecosystem** in a way appropriate to their `Contact_Type`.

---

# 1. SOURCE OF TRUTH

The spreadsheet is the authoritative source for:

- Recipient email address
- First name
- Last name
- Contact type
- Country
- Group
- Consent
- CC address
- Whether special treatment is required
- Why special treatment is required
- Additional comments

Do NOT hard-code the recipient list.

Read the workbook directly from:

`C:\Users\denni\PycharmProjects\Kira\docs\BETA_TESTERS.xlsx`

The current spreadsheet columns are:

```text
User_type
Email
FirstName
LastName
Contact_Type
Country
Group
Consent
CC_to
Special Treatment Needed
Why Special Treatment
Comment
```

---

# 2. SENDING RULE

Send the first relationship email to **every contact in the workbook**, unless there is an actual technical reason that makes delivery impossible.

For every email:

### To
Use:

`Email`

### CC
Use:

`CC_to`

The current sheet specifies:

`dennis@corporateaisolutions.com`

as the CC address.

Do not silently omit the CC.

Do not invent additional recipients.

Do not BCC anyone.

---

# 3. IMPORTANT — DO NOT SEND THE SECOND EMAIL

Only send the **relationship-specific first email** in this task.

Do NOT send the standard beta tester invitation that will follow this email.

The recipient should therefore receive:

**Email 1:** Relationship / ecosystem / partner-specific introduction  
**Email 2:** Standard Kira Beta testing invitation — handled separately

The two emails should feel like a deliberate sequence, not duplicates.

---

# 4. CORE POSITIONING

The email generation must use the following positioning.

The central initiative is:

**The 10,000 Baby Boomer Business Owner True-Value Mission**

The mission is to help 10,000 Baby Boomer-owned businesses maximise the proven value of the businesses they have spent their lives building, with:

- 1,000 businesses targeted by 31 December 2026
- 10,000 businesses targeted by 31 December 2027

2026 is the proof year and 2027 is the scale year.

The BBBO is the beneficiary.

The ecosystem provides the capabilities.

KiraExec is **one capability within that ecosystem**, particularly addressing owner dependence, organisational knowledge, operational continuity and organisational memory.

Do NOT position KiraExec as if it is the entire BBBO initiative.

Do NOT make the email sound like a Kira product sales pitch.

The broader proposition is about:

**Build Better → Prove True-Value → Find the Next Owner**

The mission is about helping owners avoid leaving unnecessary value behind when they eventually transition the business.

---

# 5. EMAIL TONE

The emails should sound like they are personally coming from Dennis.

Tone:

- personal
- direct
- intelligent
- entrepreneurial
- conversational
- confident
- collaborative
- not corporate marketing
- not AI-generated sounding
- not overly polished
- not salesy

The recipient should feel:

> "Dennis is bringing me into something he is building and thinks I have a particular role to play."

Avoid generic phrases such as:

- "I hope this email finds you well"
- "I am excited to announce"
- "We are thrilled to introduce"
- "revolutionary AI solution"
- "game-changing"
- "synergy"
- "leverage our cutting-edge technology"

Do not over-explain Kira.

The first email is primarily about the **relationship and the BBBO mission**.

---

# 6. CONTACT-TYPE MESSAGING

The email must be materially different depending on `Contact_Type`.

## A. Distribution Partner

Purpose:

Explore how the recipient could help bring the BBBO proposition into businesses they already reach.

The message should explain that the opportunity is bigger than referring people to Kira.

The proposition is potentially:

**Customer Value + Customer Retention + Customer Growth + Exit Value**

Explain that organisations already embedded in the target business community may have valuable distribution into Baby Boomer business owners.

The conversation should be about:

- how many relevant businesses they already reach
- whether BBBO owners exist within their customer/network base
- how the BBBO mission could add value to those relationships
- potentially sponsoring or supporting cohorts
- creating a measurable business outcome rather than simply another partnership

Where appropriate, reference the specific organisation and Dennis's previous relationship.

### Special-treatment examples

For Darren at Platinum Consultants:

The spreadsheet says Dennis has already met Darren, mentioned Kira, but Darren has not seen the current version. Dennis also discussed the BBBO scenario with him.

Therefore the email must acknowledge that history.

Do not write as though Darren is a cold prospect.

For Zhai:

Acknowledge that Dennis has already spoken to Zhai and discussed Kira / the BBBO scenario.

For Lisa at Boomi:

This is particularly important.

The spreadsheet says Dennis had a Zoom meeting with Lisa, Tom and Richard from Boomi.

The email should therefore build from that conversation and specifically explore the possibility of moving the relationship beyond Boomi simply being a supplier/service provider to Kira.

The proposition should be framed around:

- Boomi's existing customer base
- integration
- helping Boomi customers become more valuable and transferable
- potentially leveraging Boomi's client ecosystem
- a strategic ecosystem relationship

Do NOT make Lisa feel like she is receiving a cold beta invitation.

---

# 7. TECH PARTNER

For `Tech Partner`, the first email should focus on:

- technical collaboration
- understanding the architecture
- exploring where their technology/capability fits
- reviewing Kira's current implementation
- identifying integration opportunities
- providing technical feedback
- understanding how their capability could contribute to the broader BBBO value-creation ecosystem

Kira should be presented as one technology layer inside the broader ecosystem.

### Softrefine special treatment

For:

- Shani Shah
- Darshilp
- Yuvraj

the spreadsheet specifically states that they have already experienced the old Kira beta.

Therefore:

**Do NOT introduce them as first-time beta testers.**

Explain that this is the substantially updated version of Kira and that Dennis wants their technical review of the new version.

The email should also acknowledge the earlier experience and explain that Dennis had said he would share:

1. the new Kira beta
2. the relevant GitHub repositories

The first email should therefore establish the technical-review context.

Do not pretend they are seeing Kira for the first time.

### Gareth

Gareth is a long-term relationship.

Do not write a cold introduction.

The email should assume an existing relationship and say, in substance, that Dennis wants to bring him properly up to speed on where Kira and the BBBO mission have now got to.

### Shah Hussein

Also treat this as an existing relationship.

The spreadsheet specifically says:

"Long term relationship already, need to bring up to speed."

Therefore the email should be conversational and assume familiarity.

---

# 8. ADVISORY PARTNER

An `Advisory Partner` should be treated as part of the strategic group helping shape the initiative.

The positioning should be closer to:

> "I want your thinking around the business, strategy and ecosystem rather than simply asking you to test a piece of software."

The advisory proposition should cover:

- overall BBBO strategy
- ecosystem structure
- partner strategy
- distribution
- funding
- marketplace development
- buyer proposition
- commercial model
- what needs to be proven during 2026
- how the model can scale to 10,000 businesses

The advisory group can effectively be treated as a strategic sounding board / board-like group around the initiative, but do not formally call them directors or a board unless the source data explicitly says so.

The goal is to make the recipient feel that Dennis wants them involved in **building the model**, not merely testing Kira.

---

# 9. FEEDBACK PARTNER

For `Feedback Partner`, focus on:

- independent perspective
- challenging assumptions
- testing the proposition
- identifying what does and does not make sense
- feedback on the BBBO mission
- feedback on Kira where relevant

Do not imply they are being asked to become a commercial partner unless that is supported by the spreadsheet.

The emphasis is:

> "I value your outside perspective and want you to tell me where this works, where it doesn't and what I'm missing."

---

# 10. FUNDING PARTNER

For `Funding Partner`, focus on the larger opportunity and commercial model.

The email should explain that the initiative has the potential to become a large ecosystem involving:

- BBBO owners
- advisers
- technology providers
- business networks
- professional services
- buyers
- acquisition intelligence
- marketplace activity
- benchmarking/data

The first 1,000 businesses are intended to prove:

- market demand
- methodology
- intervention
- measurement
- valuation impact
- buyer interest
- transactions
- economics

The recipient should be invited into a conversation about the opportunity rather than immediately asked for money.

Do not make unsupported claims about valuation, investment returns or funding requirements.

---

# 11. TESTING PARTNER

For `Testing Partner`, the first email should establish the broader context for why Dennis is asking them to test Kira.

The message should explain:

- what the BBBO mission is
- why Kira exists within it
- what Kira is trying to solve
- why their testing matters
- that this is about real-world feedback rather than simply testing software features

Do not make the email excessively technical.

The actual beta access/instructions will be provided in the second email.

---

# 12. SPECIAL TREATMENT OVERRIDES

The `Special Treatment Needed` column is a hard instruction.

If:

`Special Treatment Needed = YES`

then the email must explicitly incorporate the relevant information from:

`Why Special Treatment`

and, where useful:

`Comment`

Do not send the generic Contact_Type version unchanged.

The following currently require special treatment:

### Darren — Platinum Consultants
Existing meeting / Kira already mentioned / BBBO scenario discussed.

### Zhai — Simpro
Existing conversation / Kira already mentioned / BBBO scenario discussed.

### Gareth — Plausible
Long-term relationship. Bring him up to speed.

### Lisa — Boomi
Existing Zoom meeting with Lisa, Tom and Richard. Explore broader strategic relationship, integration and Boomi customer-base opportunity.

### Shani — Softrefine
Existing relationship and previous Kira beta experience. New version plus GitHub technical review.

### Darshilp — Softrefine
Existing relationship and previous Kira beta experience. New version plus GitHub technical review.

### Yuvraj — Softrefine
Existing relationship and previous Kira beta experience. New version plus GitHub technical review.

### Shah Hussein
Long-term relationship. Bring him up to speed.

No special-treatment detail should be invented.

---

# 13. NAME HANDLING

Use:

`FirstName`

naturally in the email.

If `LastName` is blank, do not attempt to construct one.

Examples:

"Hi Darren,"

"Hi Zhai,"

"Hi Lisa,"

Do not use awkward full-name greetings when unnecessary.

---

# 14. SUBJECT LINES

Subject lines must be tailored to the relationship.

Do not use the same subject for every contact.

Good subject territory includes:

- the BBBO mission
- bringing someone up to speed
- a conversation about the BBBO ecosystem
- Kira + the bigger BBBO opportunity
- a specific partner discussion
- continuing a previous conversation

Avoid clickbait.

Avoid "URGENT".

Avoid "Invitation".

Avoid "Beta Tester" as the primary subject for this first email.

Examples of the style — do not blindly copy them:

**Distribution Partner:**
"An idea around the BBBO market"

**Existing relationship:**
"Where Kira and the BBBO idea have got to"

**Tech Partner:**
"Kira, BBBO and a technical conversation"

**Advisory:**
"The bigger BBBO proposition"

**Funding:**
"The 10,000 BBBO opportunity"

These are examples only. Generate the most appropriate subject from the actual contact context.

---

# 15. EMAIL STRUCTURE

Keep each email reasonably concise.

Target approximately:

**300–500 words maximum**, unless the special-treatment context genuinely warrants more.

Suggested structure:

### Opening
Personal reference to the relationship/context.

### Why I'm writing
Why Dennis is contacting this particular person now.

### Bigger idea
Brief explanation of the 10,000 BBBO True-Value Mission.

### Their relevance
Explain why their particular role / organisation / experience is relevant.

### Kira's role
Briefly explain KiraExec as one capability within the broader ecosystem.

### Specific invitation
State what Dennis would like from them at this stage.

### Close
Natural invitation to continue the conversation.

Do not turn the email into a brochure.

---

# 16. CORE BBBO FACTS THAT MAY BE USED

Use only the following core propositions from the BBBO mission.

The mission is:

**Help 10,000 Baby Boomer-owned businesses become genuinely sale-ready and achieve their maximum proven valuation by 31 December 2027.**

Milestones:

**1,000 businesses by 31 December 2026.**

**10,000 by 31 December 2027.**

The first 1,000 are intended to prove the model before scaling it.

The ecosystem includes:

- Baby Boomer business owners
- accountants/CFOs
- business brokers/M&A advisers
- valuers
- lawyers
- business consultants
- HR/leadership specialists
- technology/AI providers
- coaches/advisory organisations
- technology and infrastructure providers
- business-owner networks
- strategic sponsors
- ultimately buyers

KiraExec's role is particularly relevant to:

- owner dependence
- organisational knowledge
- operational continuity
- organisational memory
- helping businesses operate with greater independence from the owner

The BBBO mission is broader than KiraExec.

---

# 17. DO NOT MAKE UNSUPPORTED CLAIMS

Do not invent:

- previous meetings
- previous conversations
- partnerships
- customer numbers
- revenue
- funding amounts
- investment commitments
- technical capabilities
- integrations
- commercial agreements
- beta participation
- permissions

Use the spreadsheet's `Why Special Treatment` and `Comment` fields as the source of truth for personal context.

---

# 18. CONSENT FIELD

The `Consent` column must NOT be interpreted as permission to omit the relationship email unless there is an explicit system/business rule already implemented for this campaign.

The current instruction is to send the first relationship email to each contact.

Do not invent a new consent policy.

---

# 19. EMAIL DELIVERY IMPLEMENTATION

Before sending:

1. Read the XLSX.
2. Validate every row.
3. Generate the email content for each recipient.
4. Confirm:
   - To address
   - CC address
   - Subject
   - Body
   - Contact Type
   - Special Treatment handling
5. Do NOT send until all generated emails have passed validation.

Use the authenticated email service already available to the project/environment.

If Gmail is not technically available to the coding environment, **do not pretend the emails were sent**.

Instead, stop at the generation/validation stage and report exactly what email-sending capability is unavailable.

Do not substitute an unrelated email account or sender.

The intended sender is Dennis / Corporate AI Solutions using the configured business email account.

---

# 20. SAFETY CHECK BEFORE SEND

Before actually sending, programmatically verify for every row:

```text
recipient_email != blank
cc_email != blank
subject != blank
body != blank
first_name != blank
contact_type != blank
```

Also verify:

- no recipient appears twice
- no email is accidentally placed in CC instead of To
- no CC is placed in BCC
- no two different contacts have accidentally received the same personalised content where special treatment requires differentiation
- no placeholder text remains
- no `[FirstName]`, `[Company]`, `[INSERT...]`, etc. remains
- special-treatment recipients have their specific context incorporated

---

# 21. LOGGING

Create a send log containing at least:

```text
timestamp
recipient
cc
contact_type
special_treatment
subject
status
message_id
error
```

Record:

`SENT`

only after the email service confirms successful submission.

If a send fails:

`FAILED`

with the actual error.

Never report an email as sent merely because the code executed without raising an exception.

---

# 22. DO NOT MODIFY THE SPREADSHEET

Do not alter:

`BETA_TESTERS.xlsx`

unless explicitly instructed to do so.

The workbook is the campaign source data.

If a send log is required, create a separate log file.

---

# 23. FINAL REPORT

After execution, provide a concise factual report:

```text
FIRST RELATIONSHIP EMAIL CAMPAIGN

Total contacts:
Successfully sent:
Failed:
Skipped:

Special-treatment emails sent:
Distribution:
Tech:
Advisory:
Feedback:
Funding:
Testing:

Failures:
<recipient + actual error>

Send log:
<path>
```

Do not say "campaign complete" unless the actual email service confirms the messages were sent.

Do not fabricate message IDs.

---

# 24. MOST IMPORTANT PRINCIPLE

The recipient should understand:

**Dennis is not simply asking them to test Kira.**

He is bringing them into a broader initiative designed to help 10,000 Baby Boomer business owners maximise the proven value of the businesses they have spent decades building.

Their particular relationship to that mission determines why Dennis is contacting them.

KiraExec is an important technology capability within that ecosystem, but **Kira is not the mission**.

The first email therefore needs to answer:

> "Why is Dennis contacting me specifically, what is this bigger BBBO opportunity, and what role does he think I could play?"

That is the purpose of Email 1.