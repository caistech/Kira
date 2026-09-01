// business-genome/extract-prompt.ts
//
// THE STRUCTURED EXTRACTION PROMPT — instructs the LLM to extract typed entities,
// facts, and relationships from a conversation transcript.
//
// This prompt is BUSINESS-AGNOSTIC. It does not assume any industry. The LLM
// infers entities and relationships dynamically from the conversation content.

/**
 * Build the system prompt for structured genome extraction.
 * The ontology is injected so the LLM knows the 9 canonical areas.
 */
export function buildExtractionPrompt(ontologySummary: string): string {
  return `You are a business knowledge extraction engine. Your job is to read a conversation transcript and extract structured business knowledge.

ONTOLOGY — THE 9 CANONICAL AREAS:
${ontologySummary}

YOUR JOB:
Extract every piece of business-relevant information from the transcript and classify it into one of the 9 areas above.

VISIBILITY RULES — some knowledge belongs to the OWNER'S POSITION, not the org:
- Mark visibility: "owner" for facts about succession plans, exit intent, owner compensation/salary/dividends, personal guarantees, owner health/family constraints, ownership transfer intent, or any fact the owner explicitly says "this is for my eyes only".
- Mark visibility: "org" (default) for everything else — SOPs, pricing rules, customer processes, delivery workflows, asset lists, compliance dates, systems, team roles.

OUTPUT FORMAT — return a JSON array of extraction items. Each item is one of three types:

1. ENTITY — a business thing (person, organisation, system, asset, etc.)
{
  "type": "entity",
  "area_key": "one of the 9 area keys",
  "entity_type": "person|organisation|system|asset|vehicle|equipment|property|licence|insurance|pricing_rule|cost_category|process|service|insight|preference|correction|document|financial_account|role",
  "name": "the entity name (e.g. 'Sarah', 'Xero', 'ABC Plumbing')",
  "confidence": 0.85,
  "visibility": "org" | "owner"
}

2. FACT — a specific piece of knowledge about something
{
  "type": "fact",
  "area_key": "one of the 9 area keys",
  "entity_name": "the entity this fact is about (optional — null if area-level)",
  "entity_type": "the entity type if entity_name is provided (optional)",
  "subject": "what this fact is about (e.g. 'standard call-out fee')",
  "predicate": "is|has|costs|charges|employs|generates|uses|requires|manages|performs",
  "value": "the specific value mentioned (e.g. '180', '14 employees', '25%')",
  "value_type": "text|number|boolean|date|money|percentage",
  "unit": "AUD|days|percent|hours/week|null",
  "confidence": 0.85,
  "visibility": "org" | "owner"
}

3. RELATIONSHIP — how two entities connect
{
  "type": "relationship",
  "area_key": "one of the 9 area keys",
  "subject_name": "the first entity",
  "subject_type": "its entity type",
  "predicate": "buys|supplies_to|employs|contracted_by|manages|performs|uses|is_system_for|costs|charges|owns|leases|supplies|depends_on|precedes|integrates_with|required_for|refers",
  "object_name": "the second entity (optional — null for inline values)",
  "object_type": "its entity type (optional)",
  "object_value": "inline value if no object entity (e.g. '30 days', '$180')",
  "confidence": 0.85,
  "visibility": "org" | "owner"
}

RULES:
- Be SPECIFIC. "Call-out fee is $180" not "they have pricing".
- Keep names as spoken. "Sarah" stays "Sarah", "Xero" stays "Xero".
- Every item must have a confidence score (0.0 to 1.0).
- If the speaker is uncertain, lower the confidence (e.g. 0.4-0.6).
- If the speaker is definitive, use higher confidence (e.g. 0.8-0.95).
- Don't extract opinions or speculation — only factual business knowledge.
- Don't extract the same fact twice in different words.
- Map each item to exactly ONE of the 9 canonical area keys.
- If something doesn't clearly fit an area, use your best judgment.
- Return ONLY the JSON array. No prose, no explanation, no markdown.

TRANSCRIPT:
`;
}

/**
 * Build the summary of the ontology for the prompt.
 * This is a compact representation the LLM can work with.
 */
export function buildOntologySummary(): string {
  return `1. work_sources — "Where the work comes from" — lead generation, referrals, channels, pipeline, demand sources
2. pricing — "How work is priced and quoted" — pricing logic, estimates, proposals, margins, quoting
3. delivery — "How the work actually gets done" — processes, workflows, dependencies, delivery, exceptions
4. money — "Money in, money out and terms" — revenue, costs, payment terms, cash flow, financial obligations
5. customers — "Who buys, and who owns the relationship" — customers, buyers, decision-makers, relationship ownership
6. people — "Who does the work" — employees, contractors, roles, responsibilities, capacity
7. assets — "What the business owns" — assets, IP, property, equipment, inventory, owned resources
8. compliance_calendar — "Licences, insurance and the calendar" — licences, insurance, compliance, renewals, important dates
9. systems_records — "Systems & records" — software, documents, spreadsheets, databases, source systems`;
}
