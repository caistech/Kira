Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

(.venv) PS C:\Users\denni\PycharmProjects\Kira> opencode run @'
>> EXECUTE THE COMPLETE KIRA 5E-D SEMANTIC CLASSIFICATION.
>> 
>> THIS IS AN AUDIT TASK. PARTIAL COMPLETION IS FAILURE.
>> 
>> Repository root:
>> C:\Users\denni\PycharmProjects\Kira
>> 
>> INPUT MANIFEST:
>> C:\Users\denni\PycharmProjects\Kira\docs\user_id_conversion.md
>> 
>> CANONICAL MODEL:
>> C:\Users\denni\PycharmProjects\Kira\docs\KIRA — Canonical Organisational Model.md
>> 
>> The manifest is the Repository Sweep #3 HIT MANIFEST.
>> 
>> It contains every hit that MUST be classified.
>> 
>> The manifest is NOT the sole source of semantic context. For EVERY hit, you MUST open and inspect the actual referenced repository file and surrounding code.
>> 
>> ============================================================                                                                                                  
>> MANDATORY PROCESS                                                                                                                                             
>> ============================================================                                                                                                  
>>                                                                                                                                                               
>> Process EVERY SINGLE HIT in:                                                                                                                                  
>>                                                                                                                                                               
>> docs\user_id_conversion.md                                                                                                                                    
>>                                                                                                                                                               
>> Do not stop after 10.                                                                                                                                         
>> Do not provide partial results.                                                                                                                               
>> Do not summarise instead of classifying.                                                                                                                      
>> Do not say the remaining entries "would follow".
>> Do not ask for permission to continue.                                                                                                                        
>>                                                                                                                                                               
>> For EACH hit:                                                                                                                                                 
>>                                                                                                                                                               
>> 1. Read the actual referenced repository file.                                                                                                                
>> 2. Inspect sufficient surrounding code to understand the reference.                                                                                           
>> 3. Follow the relevant call chain where necessary.                                                                                                            
>> 4. Determine what the user_id/userId ACTUALLY represents.                                                                                                     
>> 5. Compare that meaning against:                                                                                                                              
>>    docs\KIRA — Canonical Organisational Model.md                                                                                                              
>> 6. Assign exactly ONE classification:                                                                                                                         
>>    A / B / C / D / E                                                                                                                                          
>> 7. Assign confidence:                                                                                                                                         
>>    HIGH / MEDIUM / LOW                                                                                                                                        
>> 8. State the actual semantic meaning.                                                                                                                         
>> 9. State the required action.                                                                                                                                 
>> 10. Give the precise replacement where a replacement is actually justified.                                                                                   
>> 11. Map the finding to the relevant INV-001 through INV-020.                                                                                                  
>> 12. Preserve legitimate legacy/auth/provenance semantics where the canonical model permits them.                                                              
>>                                                                                                                                                               
>> ============================================================                                                                                                  
>> CLASSIFICATION RULE                                                                                                                                           
>> ============================================================                                                                                                  
>>                                                                                                                                                               
>> DO NOT classify from the variable name alone.                                                                                                                 
>>                                                                                                                                                               
>> The classes MUST mean:                                                                                                                                        
>>                                                                                                                                                               
>> A = Legitimate Person/Auth/Provenance semantic.                                                                                                               
>> The reference genuinely represents a Person or authentication identity and is semantically valid.                                                             
>>                                                                                                                                                               
>> B = Legacy Organisation ownership/tenant semantic.                                                                                                            
>> The reference is actually being used to represent the Organisation and must be rebound to organisation context/organisation_id where appropriate.             
>>                                                                                                                                                               
>> C = Auth identity semantic.                                                                                                                                   
>> The reference represents authentication identity rather than organisational ownership.                                                                        
>> Do NOT rename legitimate auth identity references merely because they contain user_id/userId.                                                                 
>>                                                                                                                                                               
>> D = Historical/compatibility semantic.                                                                                                                        
>> The reference is intentionally retained for historical data, migration, compatibility, provenance, legacy interoperability, or other explicitly bounded transitional purposes.                                                                                                                                                 
>>                                                                                                                                                               
>> E = Unsafe/ambiguous semantic requiring review or quarantine.                                                                                                 
>> Use E when the actual semantic meaning cannot be established safely from the repository evidence, or when the reference risks violating the canonical model and cannot be resolved without an architectural decision.                                                                                                          
>>                                                                                                                                                               
>> DO NOT invent organisation IDs.                                                                                                                               
>>                                                                                                                                                               
>> DO NOT assume user_id means organisation_id.                                                                                                                  
>>                                                                                                                                                               
>> DO NOT automatically classify all user_id references as violations.                                                                                           
>>                                                                                                                                                               
>> ============================================================                                                                                                  
>> CANONICAL AUTHORITY                                                                                                                                           
>> ============================================================                                                                                                  
>>                                                                                                                                                               
>> The canonical model is authoritative:                                                                                                                         
>>                                                                                                                                                               
>> docs\KIRA — Canonical Organisational Model.md                                                                                                                 
>>                                                                                                                                                               
>> Pay particular attention to:                                                                                                                                  
>>                                                                                                                                                               
>> INV-001 Organisation persistence                                                                                                                              
>> INV-002 Person/role separation                                                                                                                                
>> INV-003 Ownership temporalisation                                                                                                                             
>> INV-004 Consultant first-class status                                                                                                                         
>> INV-005 Engagement first-class status                                                                                                                         
>> INV-006 Consultant/Introducer separation                                                                                                                      
>> INV-007 Engagement/Subscription separation                                                                                                                    
>> INV-008 Kira/Organisation separation                                                                                                                          
>> INV-009 Memory/Instance separation                                                                                                                            
>> INV-010 Conversation/Knowledge separation                                                                                                                     
>> INV-011 Knowledge provenance                                                                                                                                  
>> INV-012 Temporal knowledge                                                                                                                                    
>> INV-013 Commercial truth                                                                                                                                      
>> INV-014 Commercial versioning                                                                                                                                 
>> INV-015 Paid Kira service                                                                                                                                     
>> INV-016 Consultant economics separation                                                                                                                       
>> INV-017 Continuity                                                                                                                                            
>> INV-018 No implementation-defined semantics                                                                                                                   
>> INV-019 Historical preservation                                                                                                                               
>> INV-020 Organisational subject primacy                                                                                                                        
>>                                                                                                                                                               
>> Where implementation conflicts with the canonical model, record the conflict.                                                                                 
>>                                                                                                                                                               
>> DO NOT modify the canonical model to make the implementation appear compliant.                                                                                
>>                                                                                                                                                               
>> ============================================================                                                                                                  
>> DO NOT MODIFY CODE                                                                                                                                            
>> ============================================================                                                                                                  
>>                                                                                                                                                               
>> This is CLASSIFICATION ONLY.                                                                                                                                  
>>                                                                                                                                                               
>> DO NOT:                                                                                                                                                       
>> - edit source files                                                                                                                                           
>> - edit migrations                                                                                                                                             
>> - edit SQL                                                                                                                                                    
>> - edit tests                                                                                                                                                  
>> - rename variables                                                                                                                                            
>> - rename routes                                                                                                                                               
>> - change schemas                                                                                                                                              
>> - apply migrations                                                                                                                                            
>> - commit changes                                                                                                                                              
>>                                                                                                                                                               
>> Only inspect and report.                                                                                                                                      
>>                                                                                                                                                               
>> ============================================================                                                                                                  
>> REQUIRED OUTPUT                                                                                                                                               
>> ============================================================                                                                                                  
>>                                                                                                                                                               
>> First report:                                                                                                                                                 
>>                                                                                                                                                               
>> TOTAL MANIFEST HITS: <number>                                                                                                                                 
>>                                                                                                                                                               
>> Then provide the COMPLETE classification.                                                                                                                     
>>                                                                                                                                                               
>> Every hit must appear exactly once.                                                                                                                           
>>                                                                                                                                                               
>> Use this exact machine-readable table:                                                                                                                        
>>                                                                                                                                                               
>> | File | Line | Hit | Class | Confidence | Meaning | Action | Replacement | INV |                                                                             
>>                                                                                                                                                               
>> Do NOT omit comments.                                                                                                                                         
>> Do NOT omit tests.                                                                                                                                            
>> Do NOT omit migrations.                                                                                                                                       
>> Do NOT omit SQL.                                                                                                                                              
>> Do NOT omit compatibility references.                                                                                                                         
>> Do NOT omit generated/configuration references if present in the manifest.                                                                                    
>>                                                                                                                                                               
>> For multiline/contextual hits, classify the exact hit represented by the manifest.                                                                            
>>                                                                                                                                                               
>> ============================================================                                                                                                  
>> AFTER THE COMPLETE TABLE                                                                                                                                      
>> ============================================================                                                                                                  
>>                                                                                                                                                               
>> Provide:                                                                                                                                                      
>>                                                                                                                                                               
>> 1. A/B/C/D/E COUNTS                                                                                                                                           
>>                                                                                                                                                               
>> 2. HIGH/MEDIUM/LOW CONFIDENCE COUNTS                                                                                                                          
>>                                                                                                                                                               
>> 3. EVERY LOW-CONFIDENCE HIT                                                                                                                                   
>>    Include file, line, hit, reason for uncertainty and what evidence would resolve it.                                                                        
>>                                                                                                                                                               
>> 4. EVERY AMBIGUOUS HIT                                                                                                                                        
>>                                                                                                                                                               
>> 5. ORDERED REMEDIATION LIST                                                                                                                                   
>>                                                                                                                                                               
>> Order remediation by architectural risk:                                                                                                                      
>>                                                                                                                                                               
>> P0 = canonical identity/security/data-integrity violations                                                                                                    
>> P1 = organisation ownership/semantic rebinding                                                                                                                
>> P2 = temporal/relationship modelling defects                                                                                                                  
>> P3 = compatibility/historical cleanup                                                                                                                         
>> P4 = cosmetic/non-semantic cleanup                                                                                                                            
>>                                                                                                                                                               
>> 6. LEGITIMATE REFERENCES                                                                                                                                      
>>                                                                                                                                                               
>> Explicitly list important A/C/D references that MUST NOT be blindly renamed or removed.                                                                       
>>                                                                                                                                                               
>> 7. CANONICAL INVARIANT SUMMARY                                                                                                                                
>>                                                                                                                                                               
>> For each INV-001 through INV-020, state:                                                                                                                      
>> - affected hit count                                                                                                                                          
>> - whether violations were found                                                                                                                               
>> - highest-risk examples                                                                                                                                       
>>                                                                                                                                                               
>> ============================================================                                                                                                  
>> FINAL COMPLETENESS CHECK                                                                                                                                      
>> ============================================================                                                                                                  
>>                                                                                                                                                               
>> Before finishing:                                                                                                                                             
>>                                                                                                                                                               
>> - Count the rows in the final table.                                                                                                                          
>> - Compare that count with TOTAL MANIFEST HITS.                                                                                                                
>> - Every manifest hit MUST have exactly one classification.                                                                                                    
>> - There must be ZERO unclassified hits.                                                                                                                       
>> - There must be ZERO "remaining entries would follow".                                                                                                        
>> - There must be ZERO partial-analysis disclaimer.                                                                                                             
>>                                                                                                                                                               
>> If the table row count does not equal the manifest hit count, CONTINUE ANALYSING until it does.                                                               
>>                                                                                                                                                               
>> The final response is not complete until EVERY manifest hit has been classified.                                                                              
>>                                                                                                                                                               
>> DO NOT PROVIDE HYPOTHETICAL EXAMPLES.                                                                                                                         
>>                                                                                                                                                               
>> DO NOT PROVIDE A METHODOLOGY INSTEAD OF THE RESULTS.                                                                                                          
>>                                                                                                                                                               
>> DO THE ACTUAL COMPLETE REPOSITORY AUDIT NOW.                                                                                                                  
>> '@ -f "C:\Users\denni\PycharmProjects\Kira\docs\user_id_conversion.md" -f "C:\Users\denni\PycharmProjects\Kira\docs\KIRA — Canonical Organisational Model.md" 

> build · auto/coding

→ Read docs/user_id_conversion.md
→ Read docs/KIRA — Canonical Organisational Model.md

<persona>tool-instruction</persona>
<persona>strict-instruction</persona>
<persona>work-mode</persona>

$ pwsh -Command "git status --short"
M app/page.tsx
 M app/plan/page.tsx
 M data/beta-testers.json
 M lib/billing/beta-codes.ts
AM scripts/5e-d-user-id-sweep.ps1
 M scripts/mint-beta-code.mjs
 M scripts/send-beta-invite.ts
 M scripts/send-beta-outreach.mjs
?? components/BetaCodeCarrier.tsx
?? components/beta-code-journey.test.ts
?? docs/user_id_conversion.md
?? naive-tester-reports/2026-09-01-0800/
?? naive-tester-reports/2026-09-01-2110/

$ pwsh -Command "git branch --show-current"
main

→ Read docs/user_id_conversion.md [offset=319]
→ Read scripts/5e-d-user-id-sweep.ps1

I see. There's a `scripts/5e-d-user-id-sweep.ps1` script that was added (staged, `AM`). Let me look at it and understand the full manifest. The manifest I was given was truncated at line 318. Let me get the full manifest and the sweep script.

I see now. This is an audit task. But I notice an important discrepancy: the manifest `docs\user_id_conversion.md` lists HITs, but the file I read does NOT show the actual "hit" tokens or matched content — it only shows paths and line numbers. And importantly, all the paths reference `.claude\worktrees\au-gst\...` — a DIFFERENT worktree, not the main repo.

Wait, but the file content I read shows only paths + line numbers. The manifest does not contain the actual hit token text. This is a problem — the audit instructions say to classify each hit by reading the reference. But the manifest only gives me file + line, and the file is in a worktree `au-gst`.

Let me first understand the scope. Let me get the FULL manifest and count the hits. The manifest is large (truncated). Let me count all hits and understand the structure.

Let me determine the full total of hits. Let me read the rest of the manifest.

→ Read docs/user_id_conversion.md [offset=637]

This is an enormous manifest — it spans multiple worktrees (au-gst, plan-beta-copy, etc.) and thousands of lines. I need to understand the complete scale before proceeding. Let me count the total hits in the manifest.

$ pwsh -Command "$lines = Get-Content -LiteralPath 'docs\user_id_conversion.md'; Write-Host ('Total lines: ' + $lines.Count); Write-Host ('Data lines (excluding 2 headers): ' + ($lines.Count - 2))"
ParserError: 
Line |
   1 |  . h 'docs\user_id_conversion.md'; Write-Host ('Total lines: ' + .Count) .
     |                                                                 ~
     | You must provide a value expression following the '+' operator.

The `$` got mangled by the shell. Let me use a script file approach or escape properly.

$ pwsh -File - <<'EOF'
$lines = Get-Content -LiteralPath 'docs\user_id_conversion.md'
Write-Host ("Total lines: " + $lines.Count)
Write-Host ("Data lines: " + ($lines.Count - 2))
EOF
ParserError: 
Line |
   1 |  pwsh -File - <<'EOF'
     |                ~
     | Missing file specification after redirection operator.

← Write C:/Users/denni/AppData/Local/Temp/opencode/count-manifest.ps1
Wrote file successfully.

Let me write a helper script to analyze the manifest.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\count-manifest.ps1"
Total lines: 5727
Data lines (excluding 2 header rows): 5725
Unparseable data lines: 0
--- Breakdown by root ---
main-repo : 5725
Unique files: 737

5725 hits across 737 unique files. This is genuinely massive. Let me verify the referenced worktree files actually exist on disk before committing to a classification approach.

$ pwsh -Command "Test-Path 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst' ; Test-Path 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy' ; Test-Path 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees' ; Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"
True
True
True
au-gst
plan-beta-copy
state-save

← Write C:/Users/denni/AppData/Local/Temp/opencode/extract-hits.ps1
Wrote file successfully.

The worktrees exist. Now let me extract the exact line content for every manifest hit so I can classify each one precisely. First, let me build the extraction.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\extract-hits.ps1"
Total hits in manifest: 5725
Missing/unreadable: 0
Lines without token: 2302
Output: C:\Users\denni\AppData\Local\Temp\opencode\hits.tsv

2302 lines don't contain a user_id token — the line numbers may be shifted from a different worktree state. Let me check what those lines actually contain and compare against the git state.

$ pwsh -Command "git worktree list"
C:/Users/denni/PycharmProjects/Kira                                                                                                 cfd6e00 [main]
C:/Users/denni/AppData/Local/Temp/claude/C--Users-denni-PycharmProjects/7d2fb818-702c-4eca-bca6-c0c2785d3564/scratchpad/kira-pi-wt  b89d1a2 [feat/practice-intelligence]
C:/Users/denni/PycharmProjects/Kira/.claude/worktrees/au-gst                                                                        945c106 [feat/au-gst-tax-rate]
C:/Users/denni/PycharmProjects/Kira/.claude/worktrees/plan-beta-copy                                                                e8a1cce [worktree-plan-beta-copy]
C:/Users/denni/PycharmProjects/Kira/.claude/worktrees/state-save                                                                    b84acdc [worktree-state-save]

$ pwsh -Command "Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\hits.tsv' | Select-Object -First 30"
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   9       userId  export default async function ExecUserManagePage({ params }: { params: Promise<{ userId: string }> }) {
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   10      userId    const { userId } = await params;
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   16      userId      .eq('id', userId)
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   21      user_id     sb.from('business_valuations').select('gap, worth_today, worth_potential, readiness, currency, industry').eq('user_id', userId).maybeSingle(),
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   22      user_id     sb.from('kira_agents').select('id, agent_name, elevenlabs_agent_id, status, journey_type, total_conversations, last_conversation_at').eq('user_id', userId).neq('status', 'deleted').order('last_conversation_at', { ascending: false, nullsFirst: false }),
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   23      user_id     sb.from('kira_knowledge').select('id, title, url, file_name, source_type, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   24      user_id     sb.from('kira_memory').select('id, content, memory_type, importance, created_at').eq('user_id', userId).eq('active', true).order('importance', { ascending: false }).order('created_at', { ascending: false }),
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\page.tsx    41      userId                <section key={r.userId} className="rounded-2xl border border-gray-200 bg-white p-5">
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\page.tsx    83      userId                        href={`/admin/exec/${r.userId}`}
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\trust\page.tsx   203     user_id         'id, source, asked, reason, created_at, declined_because, users:user_id (email), agent:kira_agent_id (agent_name)',
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\admin\genome\reclassify\route.ts   43      userId    let body: { userId?: string; limit?: number; apply?: ProposedChange[]; revert?: ProposedChange[] } = {};
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\admin\genome\reclassify\route.ts   62      userId    const proposal = await classifyForReview({ userId: body.userId, limit: body.limit ?? 1000 });
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\genome-classify\route.ts      41      user_id     .select('user_id')
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\genome-classify\route.ts      51      user_id   const owners = [...new Set((waiting ?? []).map((r) => r.user_id as string))].slice(0, OWNER_BATCH);
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\genome-classify\route.ts      54      userId    for (const userId of owners) {
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\genome-classify\route.ts      56      userId        const filed = await classifyPendingMemories(userId, PER_OWNER);
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\genome-classify\route.ts      62      userId        console.error(`[cron/genome-classify] ${userId} failed (others continue):`, sweepError);
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\memory-integrity\route.ts     12      user_id // THE INVARIANT. A memory row names its owner (convai_memory.user_id) and, optionally, the agent it
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\memory-integrity\route.ts     14      user_id // must be the same person. If convai_memory.user_id ever disagrees with convai_agents.user_id for
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\memory-integrity\route.ts     42      user_id       .select('id, user_id, agent_id')
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\memory-integrity\route.ts     59      user_id       .select('id, user_id')
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\memory-integrity\route.ts     67      user_id     const ownerOfAgent = new Map((agents ?? []).map((a) => [String(a.id), String(a.user_id)]));
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\memory-integrity\route.ts     80      user_id       if (agentOwner !== String(row.user_id)) {
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\memory-integrity\route.ts     83      user_id           memoryUser: String(row.user_id),
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reconcile-tasks\route.ts      70      user_id     .select('id, user_id, intent_id, status, updated_at')
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reconcile-tasks\route.ts      94      user_id       const live = await coordinator.getTaskState(taskGroupId, task.user_id as string);
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reconcile-tasks\route.ts      155     userId        async knownIntentIds(userId: string) {
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reconcile-tasks\route.ts      159     user_id           .eq('user_id', userId);
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reconcile-tasks\route.ts      171     user_id           .upsert(rows, { onConflict: 'user_id,intent_id' });
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reengagement-emails\route.ts  54      user_id           user_id: user.user_id,

Let me examine the no-token lines to understand the discrepancy.

$ pwsh -Command "Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\hits.tsv' | Where-Object { $_ -match 'none' } | Select-Object -First 25"
...output truncated...

Full output saved to: C:\Users\denni\.local\share\opencode\tool-output\tool_060559c04001iO5YjQcJovJUsj

-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
-match: The term '-match' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.


<shell_metadata>
shell tool terminated command after exceeding timeout 60000 ms. If this command is expected to take longer and is not waiting for interactive input, retry with a larger timeout value in milliseconds.
</shell_metadata>

← Write C:/Users/denni/AppData/Local/Temp/opencode/sample-notoken.ps1
Wrote file successfully.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\sample-notoken.ps1"
total tsv lines: 5725
--- 1 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\task-events\route.ts 37      none        tenantId?: string;
--- 2 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\task-events\route.ts 51      none      if (!body.taskGroupId || !body.tenantId) {
--- 3 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\task-events\route.ts 52      none        return NextResponse.json({ error: 'taskGroupId and tenantId are required' }, { status: 400 });
--- 4 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\setup\drive\actions.ts 43      none        tenantId: user.id as string,
--- 5 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\BROKER_CHANNEL_BUILD_STATE.md 12      none      stays the **flat owner `tenantId`** (Gareth + Shah build to it unchanged); the introducer is a **read-only
--- 6 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GARETH_SHAH_INTEGRATION_SEAMS.md      134     none      tenantId: string     // the ONE canonical business+owner key (Cross-cutting)
--- 7 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GARETH_SHAH_INTEGRATION_SEAMS.md      157     none    10. **Scope key** - Gareth's working-memory scope, the Mnemo scope, and our `tenantId` must be the **same** key. Shah: Mnemo scope-id format + isolation guarantee? Gareth: same keying?
--- 8 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GARETH_SHAH_INTEGRATION_SEAMS.md      183     none    20. **Scope** - per-business / per-user / per-repo? Must align with `tenantId`.
--- 9 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GARETH_SHAH_INTEGRATION_SEAMS.md      191     none        - **Memory + task + record scope: unchanged, flat `tenantId` = the owner's business** (one owner, one
--- 10 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GARETH_SHAH_INTEGRATION_SEAMS.md      193     none          keyed on this owner `tenantId`. Gareth and Shah build to the flat key exactly as before - no change.**
--- 11 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GARETH_SHAH_INTEGRATION_SEAMS.md      204     none          - enforced server-side, same discipline as server-derived memory identity. The owner `tenantId` is the
--- 12 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GARETH_SHAH_INTEGRATION_SEAMS.md      206     none        - **Consequence for you both:** nothing to change. The flat owner `tenantId` you already assumed is
--- 13 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GENOME_WRITE_BACK.md  106     none    - `tenant_id` IS the Kira app user id, confirmed in full.
--- 14 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\KIRA_COMPONENT_INTERFACE.md   55      none      getTaskState(taskGroupId: string, tenantId: TenantId): Promise<TaskStatus>;
--- 15 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\KIRA_COMPONENT_INTERFACE.md   58      none        tenantId: TenantId,
--- 16 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\KIRA_COMPONENT_INTERFACE.md   62      none      listTasks?(tenantId: TenantId, opts?: { statuses?: TaskState[]; limit?: number }): Promise<TaskSummary[]>;
--- 17 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\KIRA_COMPONENT_INTERFACE.md   76      none    **Tenancy.** `TenantId` is the canonical business-and-owner key and is the SAME key across tasks,
--- 18 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md     217     none    `GARETH_SHAH_INTEGRATION_SEAMS.md` currently assumes a flat `tenantId` = business + owner.
--- 19 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\MIGRATION_PLAN_2026-05-19.md  191     none    `tenant_id` are all common. The migrator cannot infer the correct column
--- 20 ---
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\REUSE_AUDIT.md        87      none      project  participants(role)** model. Resolve the `tenantId` shape (cross-cutting #23 in
no-token count: 2302

← Write C:/Users/denni/AppData/Local/Temp/opencode/extract-ctx.ps1
Wrote file successfully.

The manifest covers two identity concepts (user_id/userId AND tenant/tenant_id leases) — 5725 total hits. Given the scale, I need surrounding context for every hit plus the semantic anchor files. Let me extract context windows for all hits.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\extract-ctx.ps1"
Context extraction complete. Lines: 5726

5725 hits extracted with context windows. Now I need the canonical semantic ground truth. Let me examine the schema, RLS, and whether an organisation concept exists in this worktree.

$ pwsh -Command "Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase' -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName"
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000000_kira_standalone.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000001_add_knowledge_and_setup.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\add_conversation_messages.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\add_email_logs.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\README.md
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260119000000_kira_complete.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260119100000_kira_drafts.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260119200000_create_kira_knowledge.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260120000000_reconcile_kira_agents_for_convai.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260201000000_pubguard_tables.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260201100000_pubguard_user_types.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720000000_convai_canonical_reconcile.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720100000_auth_link.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720200000_client_profiles.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720300000_auth_delete_cascade.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720400000_conversations_status_expand.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720500000_auth_link_confirm_gate.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720600000_fix_welcome_back_recall.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720700000_kira_logs.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260724000000_business_valuations.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260724130000_users_notifications_optin.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725000000_loi_commitments.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725120000_kira_knowledge_chunks.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725140000_welcome_back_newest_conversation.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725160000_kira_tasks.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725180000_subscription_billing.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260726000000_introducer_channel.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260726120000_referral_source_capture.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260726180000_introducer_undertaking.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260726200000_terms_and_suppressions.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260726210000_terms_acceptance_capture.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260726220000_advisor_enquiries.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260727000000_welcome_back_includes_tool_saved_memories.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260727010000_advisor_enquiry_practice_details.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260727020000_introducer_self_serve_link.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260727120000_valuation_history.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260727150000_kira_tasks_due_at.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260727160000_users_timezone.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260727180000_kill_switch.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260728120000_industry_match_cache.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260728160000_genome_sections.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260728180000_billing_periods_reported.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260730090000_kira_tasks_status_integrity.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260731090000_business_identity.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260731120000_kira_memory_content_original.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260731140000_kira_memory_parked_reason.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260731160000_kira_memory_genome_headline.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801000000_conversations_distilled_at.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801010000_kira_refusals.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801020000_kira_redteam_runs.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801030000_kira_memory_agent_nullable.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801120000_kira_refusals_declined_because.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801140000_kira_redteam_alerts.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801160000_kira_refusals_observed.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801180000_kira_memory_parked_entity.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802010000_kira_redteam_runs_aborted.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802020000_park_memory_naming_other_entity.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802030000_kira_fact_confirmations.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802040000_kira_redteam_inconclusive.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802050000_kira_memory_privacy_classification.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802210000_genome_nine_areas.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260804060000_recall_recency_and_exclude_none.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260805020000_drive_documents.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260805090000_business_identity_sending_domain.sql
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260806120000_stop_inventing_names.sql

$ pwsh -Command "Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\migrations' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 50 -ExpandProperty FullName"
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\pubguard\migrations
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\node_modules\@supabase\auth-js\migrations
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\node_modules\@supabase\functions-js\migrations
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\node_modules\@supabase\postgrest-js\migrations
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\node_modules\@supabase\realtime-js\migrations
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\node_modules\@supabase\storage-js\migrations
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\node_modules\@supabase\supabase-js\migrations
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations

$ pwsh -Command "Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations' -File | Sort-Object Name | Select-Object -ExpandProperty Name"
20260119000000_kira_complete.sql
20260119100000_kira_drafts.sql
20260119200000_create_kira_knowledge.sql
20260120000000_reconcile_kira_agents_for_convai.sql
20260201000000_pubguard_tables.sql
20260201100000_pubguard_user_types.sql
20260720000000_convai_canonical_reconcile.sql
20260720100000_auth_link.sql
20260720200000_client_profiles.sql
20260720300000_auth_delete_cascade.sql
20260720400000_conversations_status_expand.sql
20260720500000_auth_link_confirm_gate.sql
20260720600000_fix_welcome_back_recall.sql
20260720700000_kira_logs.sql
20260724000000_business_valuations.sql
20260724130000_users_notifications_optin.sql
20260725000000_loi_commitments.sql
20260725120000_kira_knowledge_chunks.sql
20260725140000_welcome_back_newest_conversation.sql
20260725160000_kira_tasks.sql
20260725180000_subscription_billing.sql
20260726000000_introducer_channel.sql
20260726120000_referral_source_capture.sql
20260726180000_introducer_undertaking.sql
20260726200000_terms_and_suppressions.sql
20260726210000_terms_acceptance_capture.sql
20260726220000_advisor_enquiries.sql
20260727000000_welcome_back_includes_tool_saved_memories.sql
20260727010000_advisor_enquiry_practice_details.sql
20260727020000_introducer_self_serve_link.sql
20260727120000_valuation_history.sql
20260727150000_kira_tasks_due_at.sql
20260727160000_users_timezone.sql
20260727180000_kill_switch.sql
20260728120000_industry_match_cache.sql
20260728160000_genome_sections.sql
20260728180000_billing_periods_reported.sql
20260730090000_kira_tasks_status_integrity.sql
20260731090000_business_identity.sql
20260731120000_kira_memory_content_original.sql
20260731140000_kira_memory_parked_reason.sql
20260731160000_kira_memory_genome_headline.sql
20260801000000_conversations_distilled_at.sql
20260801010000_kira_refusals.sql
20260801020000_kira_redteam_runs.sql
20260801030000_kira_memory_agent_nullable.sql
20260801120000_kira_refusals_declined_because.sql
20260801140000_kira_redteam_alerts.sql
20260801160000_kira_refusals_observed.sql
20260801180000_kira_memory_parked_entity.sql
20260802010000_kira_redteam_runs_aborted.sql
20260802020000_park_memory_naming_other_entity.sql
20260802030000_kira_fact_confirmations.sql
20260802040000_kira_redteam_inconclusive.sql
20260802050000_kira_memory_privacy_classification.sql
20260802210000_genome_nine_areas.sql
20260804060000_recall_recency_and_exclude_none.sql
20260805020000_drive_documents.sql
20260805090000_business_identity_sending_domain.sql
20260806120000_stop_inventing_names.sql

$ pwsh -Command "Select-String -Path 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\*.sql' -Pattern 'create table\s+"(organisations|organizations|companies|tenants)"' -List | Select-Object -ExpandProperty Path"
organisations: The term 'organisations' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.

This is a very large audit. Let me first establish the schema ground truth — whether `organisations`/`organisation_id` exists, and how RLS keys tenancy — since this determines classification for most hits.

$ pwsh -Command "Select-String -Path 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\*\*.sql','C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\*.sql' -Pattern 'organisation_id' -List | Select-Object -First 20 -ExpandProperty Path"
(no output)

← Write C:/Users/denni/AppData/Local/Temp/opencode/schema-probe.ps1
Wrote file successfully.

PowerShell quoting is fighting me. Let me write proper helper scripts.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\schema-probe.ps1"
=== CREATE TABLE statements (top-level) ===
20260119000000_kira_complete.sql -> users
20260119000000_kira_complete.sql -> kira_agents
20260119000000_kira_complete.sql -> conversations
20260119000000_kira_complete.sql -> conversation_messages
20260119000000_kira_complete.sql -> kira_memory
20260119000000_kira_complete.sql -> knowledge_files
20260119000000_kira_complete.sql -> knowledge_urls
20260119000000_kira_complete.sql -> setup_sessions
20260119000000_kira_complete.sql -> email_logs
20260119000000_kira_complete.sql -> user_feedback
20260119100000_kira_drafts.sql -> kira_drafts
20260119200000_create_kira_knowledge.sql -> if
20260119200000_create_kira_knowledge.sql -> kira_knowledge
20260119200000_create_kira_knowledge.sql -> kira_research_sessions
20260201000000_pubguard_tables.sql -> pubguard_scans
20260201000000_pubguard_tables.sql -> pubguard_reports
20260720200000_client_profiles.sql -> client_profiles
20260720700000_kira_logs.sql -> kira_logs
20260724000000_business_valuations.sql -> business_valuations
20260725000000_loi_commitments.sql -> loi_commitments
20260725120000_kira_knowledge_chunks.sql -> kira_knowledge_chunks
20260725160000_kira_tasks.sql -> kira_tasks
20260725180000_subscription_billing.sql -> stripe_webhook_events
20260725180000_subscription_billing.sql -> beta_trials
20260725180000_subscription_billing.sql -> beta_usage
20260726000000_introducer_channel.sql -> introducers
20260726000000_introducer_channel.sql -> introducer_magic_links
20260726000000_introducer_channel.sql -> introductions
20260726000000_introducer_channel.sql -> attribution_overrides
20260726200000_terms_and_suppressions.sql -> email_suppressions
20260726220000_advisor_enquiries.sql -> advisor_enquiries
20260727120000_valuation_history.sql -> business_valuation_snapshots
20260727180000_kill_switch.sql -> system_flags
20260728120000_industry_match_cache.sql -> industry_match_cache
20260728180000_billing_periods_reported.sql -> billing_periods_reported
20260731090000_business_identity.sql -> business_identity
20260801010000_kira_refusals.sql -> kira_refusals
20260801020000_kira_redteam_runs.sql -> kira_redteam_runs
20260801020000_kira_redteam_runs.sql -> kira_redteam_results
20260801140000_kira_redteam_alerts.sql -> kira_redteam_alerts
20260802030000_kira_fact_confirmations.sql -> kira_fact_confirmations
20260805020000_drive_documents.sql -> drive_documents

=== organisation_id / organisation references in migrations ===

=== companies / tenants / organisations table DDL search ===
20260725160000_kira_tasks.sql contains create table with tenant

$ pwsh -Command "Get-Content 'C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260119000000_kira_complete.sql' | Select-Object -First 120"
-- ============================================================================
-- KIRA PLATFORM - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Migration: 20260119000000_kira_complete.sql
-- 
-- This is the SINGLE SOURCE OF TRUTH for the Kira database schema.
-- Run this once on a fresh Supabase project.
--
-- Includes:
--   1. Core Tables (users, kira_agents, conversations, kira_memory)
--   2. Knowledge Base (knowledge_files, knowledge_urls)
--   3. Setup Sessions (setup_sessions)
--   4. Conversation Continuity (conversation_messages)
--   5. Email System (email_logs)
--   6. User Feedback (user_feedback)
--   7. All Indexes, Triggers, Functions, and RLS Policies
--
-- ============================================================================


-- ============================================================================
-- CLEAN SLATE: DROP EVERYTHING FIRST
-- ============================================================================
-- Drop tables first (CASCADE handles triggers, indexes, policies automatically)
-- Order matters due to foreign keys - drop dependent tables first

DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS conversation_messages CASCADE;
DROP TABLE IF EXISTS kira_memory CASCADE;
DROP TABLE IF EXISTS knowledge_urls CASCADE;
DROP TABLE IF EXISTS knowledge_files CASCADE;
DROP TABLE IF EXISTS setup_sessions CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS kira_agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions (after tables since tables might depend on them)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS should_send_email(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_users_for_reengagement(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_conversation_context(UUID, UUID, INTEGER) CASCADE;


-- ============================================================================
-- Enable required extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  first_name TEXT,
  last_name TEXT,

  -- Journey
  journey_type TEXT CHECK (journey_type IN ('personal', 'business')),

  -- Authentication
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'magic_link')),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  email_verified BOOLEAN DEFAULT false,

  -- Subscription & Stripe
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'trialing', 'active', 'past_due', 'canceled', 'cancelled', 'expired')),
  subscription_id TEXT,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,

  -- Email preferences (for email system)
  email_preferences JSONB DEFAULT '{
    "kira_ready": true,
    "welcome_back": true,
    "weekly_summary": false,
    "feature_announcements": true
  }'::jsonb,
  last_email_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);


-- ============================================================================
-- 2. KIRA AGENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kira_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Agent identity (both columns for compatibility)
  agent_name TEXT,
  name TEXT,
  journey_type TEXT NOT NULL CHECK (journey_type IN ('personal', 'business')),

  -- ElevenLabs
  elevenlabs_agent_id TEXT UNIQUE NOT NULL,
  elevenlabs_tool_ids TEXT[] DEFAULT '{}',

  -- Agent configuration

← Write C:/Users/denni/AppData/Local/Temp/opencode/schema-probe2.ps1
Wrote file successfully.

Let me check for an organisations table across the whole worktree (not just migrations) and understand the RLS model.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\schema-probe2.ps1"
=== search 'organisations' anywhere in DDL ===
NONE found in migrations

=== users table DDL ===
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  first_name TEXT,
  last_name TEXT,

  -- Journey
  journey_type TEXT CHECK (journey_type IN ('personal', 'business')),

  -- Authentication
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'magic_link')),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  email_verified BOOLEAN DEFAULT false,

  -- Subscription & Stripe
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'trialing', 'active', 'past_due', 'canceled', 'cancelled', 'expired')),
  subscription_id TEXT,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,

  -- Email preferences (for email system)
  email_preferences JSONB DEFAULT '{
    "kira_ready": true,
    "welcome_back": true,
    "weekly_summary": false,
    "feature_announcements": true
  }'::jsonb,
  last_email_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

→ Read scripts/5e-d-user-id-sweep.ps1 [offset=61]

The manifest's "hit" pattern must be broader than just `user_id`. Let me read the actual sweep script to understand exactly what pattern generated this manifest.

← Write C:/Users/denni/AppData/Local/Temp/opencode/analyze-none.ps1
Wrote file successfully.

The manifest appears to include non-`user_id` tokens (e.g. `tenantId`). Let me investigate whether line numbers are shifted or the manifest uses broader patterns, by checking nearby lines for token hits.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\analyze-none.ps1"
NO-TOKEN ROW: 42 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000000_kira_standalone.sql
   LINE:   subscription_id TEXT,
NO-TOKEN ROW: 25 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: -- Add subscription_id if missing
NO-TOKEN ROW: 26 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT;
NO-TOKEN ROW: 28 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: -- Update subscription_id from stripe_subscription_id if it exists
NO-TOKEN ROW: 32 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE:     UPDATE users SET subscription_id = stripe_subscription_id WHERE subscription_id IS NULL;
NO-TOKEN ROW: 78 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260119000000_kira_complete.sql
   LINE:   subscription_id TEXT,
NO-TOKEN ROW: 42 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\archive\20260119000000_kira_standalone.sql
   LINE:   subscription_id TEXT,
NO-TOKEN ROW: 25 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: -- Add subscription_id if missing
NO-TOKEN ROW: 26 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT;
NO-TOKEN ROW: 28 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: -- Update subscription_id from stripe_subscription_id if it exists
NO-TOKEN ROW: 32 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE:     UPDATE users SET subscription_id = stripe_subscription_id WHERE subscription_id IS NULL;
NO-TOKEN ROW: 78 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260119000000_kira_complete.sql
   LINE:   subscription_id TEXT,
NO-TOKEN ROW: 42 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\archive\20260119000000_kira_standalone.sql
   LINE:   subscription_id TEXT,
NO-TOKEN ROW: 25 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: -- Add subscription_id if missing
NO-TOKEN ROW: 26 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT;
NO-TOKEN ROW: 28 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: -- Update subscription_id from stripe_subscription_id if it exists
NO-TOKEN ROW: 32 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE:     UPDATE users SET subscription_id = stripe_subscription_id WHERE subscription_id IS NULL;
NO-TOKEN ROW: 78 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260119000000_kira_complete.sql
   LINE:   subscription_id TEXT,
NO-TOKEN ROW: 130 C:\Users\denni\PycharmProjects\Kira\.context\PROJECT_STATE.md
   LINE: - `generateKnowledgeAssessment(organisationId)`
NO-TOKEN ROW: 134 C:\Users\denni\PycharmProjects\Kira\.context\PROJECT_STATE.md
   LINE: - `detectFactConflicts(organisationId, incoming, options)`
NO-TOKEN ROW: 135 C:\Users\denni\PycharmProjects\Kira\.context\PROJECT_STATE.md
   LINE: - `detectCrossConversationConflicts(organisationId, areaKey?)`
NO-TOKEN ROW: 136 C:\Users\denni\PycharmProjects\Kira\.context\PROJECT_STATE.md
   LINE: - `getSupersessionChain(organisationId, factId)`
NO-TOKEN ROW: 140 C:\Users\denni\PycharmProjects\Kira\.context\PROJECT_STATE.md
   LINE: - `getUnresolvedConflicts(organisationId)`
NO-TOKEN ROW: 56 C:\Users\denni\PycharmProjects\Kira\app\admin\(panel)\exec\[userId]\page.tsx
   LINE:       ? sb.from('kira_knowledge').select('id, title, url, file_name, source_type, status, created_at').in('organisation_id', orgIds).order('created_at', { ascending: false })
NO-TOKEN ROW: 58 C:\Users\denni\PycharmProjects\Kira\app\admin\(panel)\exec\[userId]\page.tsx
   LINE:     sb.from('kira_memory').select('id, content, memory_type, importance, created_at').in('organisation_id', orgIds).eq('active', true).order('importance', { ascending: false }).order('created_at', { ascending: false }),
NO-TOKEN ROW: 67 C:\Users\denni\PycharmProjects\Kira\app\api\absences\route.ts
   LINE:       organisation_id: org.organisationId,
NO-TOKEN ROW: 38 C:\Users\denni\PycharmProjects\Kira\app\api\cron\auto-record-absence\route.ts
   LINE:     .select('organisation_id')
NO-TOKEN ROW: 54 C:\Users\denni\PycharmProjects\Kira\app\api\cron\auto-record-absence\route.ts
   LINE:       .eq('organisation_id', org.organisation_id)
NO-TOKEN ROW: 65 C:\Users\denni\PycharmProjects\Kira\app\api\cron\auto-record-absence\route.ts
   LINE:       .eq('organisation_id', org.organisation_id)
NO-TOKEN ROW: 74 C:\Users\denni\PycharmProjects\Kira\app\api\cron\auto-record-absence\route.ts
   LINE:       .eq('organisation_id', org.organisation_id)

Total 'none' rows: 2302
  - canonical token nearby (shift): 698
  - broader token on the line (tenantId/tenant_id/user.id): 322
  - no token at all nearby: 1282

Let me get just the summary statistics from that analysis.

$ pwsh -Command "& 'C:\Users\denni\AppData\Local\Temp\opencode\analyze-none.ps1' 2>\$null | Select-Object -Last 6"
Out-File: Access to the path 'C:\' is denied.

← Edit C:/Users/denni/AppData/Local/Temp/opencode/analyze-none.ps1
Index: C:\Users\denni\AppData\Local\Temp\opencode\analyze-none.ps1
===================================================================
--- C:\Users\denni\AppData\Local\Temp\opencode\analyze-none.ps1
+++ C:\Users\denni\AppData\Local\Temp\opencode\analyze-none.ps1
@@ -41,9 +41,9 @@
 if ($broad) {
     $broaderHit++
 } else {
     $noHitAnywhere++
-    if ($noHitAnywhere -le 30) {
+    if ($noHitAnywhere -le 5) {
         write-host "NO-TOKEN ROW: $lineNo $path"
         write-host "   LINE: $text"
     }
 }


$ pwsh -Command "& 'C:\Users\denni\AppData\Local\Temp\opencode\analyze-none.ps1'"
NO-TOKEN ROW: 42 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000000_kira_standalone.sql
   LINE:   subscription_id TEXT,
NO-TOKEN ROW: 25 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: -- Add subscription_id if missing
NO-TOKEN ROW: 26 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT;
NO-TOKEN ROW: 28 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE: -- Update subscription_id from stripe_subscription_id if it exists
NO-TOKEN ROW: 32 C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\20260119000001_add_knowledge_and_setup.sql
   LINE:     UPDATE users SET subscription_id = stripe_subscription_id WHERE subscription_id IS NULL;

Total 'none' rows: 2302
  - canonical token nearby (shift): 698
  - broader token on the line (tenantId/tenant_id/user.id): 322
  - no token at all nearby: 1282

← Write C:/Users/denni/AppData/Local/Temp/opencode/token-freq.ps1
Wrote file successfully.

1282 rows have no identity token even nearby. Let me understand what tokens the manifest actually matched on those lines by analyzing the full hit text.

$ pwsh -Command "& 'C:\Users\denni\AppData\Local\Temp\opencode\token-freq.ps1'"
non-canonical lines: 2302

=== token frequency on non-canonical manifest lines ===
  1410  organisation_id
   559  organisationId
   396  tenantId
    96  engagement_id
    63  person_id
    40  subscription_id
    34  consultant_id
    32  taskGroupId
    31  kira_instance_id
    29  p_organisation_id
    27  personId
    17  void
    12  tenant_id
    12  stripe_subscription_id
    12  recordId
    10  orgId
     9  ownership_period_id
     9  evidence_id
     9  intent_id
     8  intentId
     6  instance_id
     6  conversation_id
     6  membership_id
     5  knowledge_id
     5  ownerOrganisationId
     5  agentOrganisationId
     5  kira_agent_id
     4  stripe_customer_id
     4  organization_id
     4  membershipId
     4  getCurrentOrganisationId
     4  scope-id
     4  relationship_id
     4  gen_random_uuid
     4  engagementId
     3  conversationId
     3  fileId
     3  org_id
     3  agent_id
     3  uuid

← Write C:/Users/denni/AppData/Local/Temp/opencode/root-stats.ps1
Wrote file successfully.

The manifest spans multiple worktree roots. Let me identify all of them and understand the token distribution per root.

$ pwsh -Command "& 'C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1'"
ParserError: C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1:15
Line |
  15 |  . tStats[$root] = @{ total = 0; user_id = 0; userId = 0; userID = 0; us .
     |                                                           ~~~~~~
     | Duplicate keys 'userID' are not allowed in hash literals.

← Edit C:/Users/denni/AppData/Local/Temp/opencode/root-stats.ps1
Index: C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1
===================================================================
--- C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1
+++ C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1
@@ -11,19 +11,19 @@
     } elseif ($path -match 'Temp\\claude\\C--') {
         $root = 'scratchpad-wt'
     }
     if (-not $rootStats.ContainsKey($root)) {
-        $rootStats[$root] = @{ total = 0; user_id = 0; userId = 0; userID = 0; userid = 0; none = 0 }
+        $rootStats[$root] = @{ total = 0; tok_userid = 0; tok_userid_dot = 0; tok_userID = 0; tok_userId = 0; tok_none = 0 }
     }
     $rootStats[$root].total++
     $tok = $parts[2]
-    if ($tok -eq 'user_id') { $rootStats[$root].user_id++ }
-    elseif ($tok -eq 'userId') { $rootStats[$root].userId++ }
-    elseif ($tok -eq 'userID') { $rootStats[$root].userID++ }
-    elseif ($tok -eq 'userid') { $rootStats[$root].userid++ }
-    else { $rootStats[$root].none++ }
+    if ($tok -eq 'user_id') { $rootStats[$root].tok_userid++ }
+    elseif ($tok -eq 'userId') { $rootStats[$root].tok_userId++ }
+    elseif ($tok -eq 'userID') { $rootStats[$root].tok_userID++ }
+    elseif ($tok -eq 'userid') { $rootStats[$root].tok_userid_dot++ }
+    else { $rootStats[$root].tok_none++ }
 }
 write-host ("root`ttotal`tuser_id`tuserId`tuserID`tuserid`tnone")
 $rootStats.GetEnumerator() | Sort-Object Name | ForEach-Object {
     $v = $_.Value
-    write-host ("{0}`t{1}`t{2}`t{3}`t{4}`t{5}`t{6}" -f $_.Name, $v.total, $v.user_id, $v.userId, $v.userID, $v.userid, $v.none)
+    write-host ("{0}`t{1}`t{2}`t{3}`t{4}`t{5}`t{6}" -f $_.Name, $v.total, $v.tok_userid, $v.tok_userId, $v.tok_userID, $v.tok_userid_dot, $v.tok_none)
 }
\ No newline at end of file


PowerShell hashtables are case-insensitive. Let me fix the key names.

$ pwsh -Command "& 'C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1'"
ParserError: C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1:15
Line |
  15 |  .  @{ total = 0; tok_userid = 0; tok_userid_dot = 0; tok_userID = 0; to .
     |                                                       ~~~~~~~~~~
     | Duplicate keys 'tok_userID' are not allowed in hash literals.

← Edit C:/Users/denni/AppData/Local/Temp/opencode/root-stats.ps1
Index: C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1
===================================================================
--- C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1
+++ C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1
@@ -11,19 +11,19 @@
     } elseif ($path -match 'Temp\\claude\\C--') {
         $root = 'scratchpad-wt'
     }
     if (-not $rootStats.ContainsKey($root)) {
-        $rootStats[$root] = @{ total = 0; tok_userid = 0; tok_userid_dot = 0; tok_userID = 0; tok_userId = 0; tok_none = 0 }
+        $rootStats[$root] = @{ total = 0; a1 = 0; b1 = 0; c1 = 0; d1 = 0; n1 = 0 }
     }
     $rootStats[$root].total++
     $tok = $parts[2]
-    if ($tok -eq 'user_id') { $rootStats[$root].tok_userid++ }
-    elseif ($tok -eq 'userId') { $rootStats[$root].tok_userId++ }
-    elseif ($tok -eq 'userID') { $rootStats[$root].tok_userID++ }
-    elseif ($tok -eq 'userid') { $rootStats[$root].tok_userid_dot++ }
-    else { $rootStats[$root].tok_none++ }
+    if ($tok -eq 'user_id') { $rootStats[$root].a1++ }
+    elseif ($tok -eq 'userId') { $rootStats[$root].b1++ }
+    elseif ($tok -eq 'userID') { $rootStats[$root].c1++ }
+    elseif ($tok -eq 'userid') { $rootStats[$root].d1++ }
+    else { $rootStats[$root].n1++ }
 }
 write-host ("root`ttotal`tuser_id`tuserId`tuserID`tuserid`tnone")
 $rootStats.GetEnumerator() | Sort-Object Name | ForEach-Object {
     $v = $_.Value
-    write-host ("{0}`t{1}`t{2}`t{3}`t{4}`t{5}`t{6}" -f $_.Name, $v.total, $v.tok_userid, $v.tok_userId, $v.tok_userID, $v.tok_userid_dot, $v.tok_none)
+    write-host ("{0}`t{1}`t{2}`t{3}`t{4}`t{5}`t{6}" -f $_.Name, $v.total, $v.a1, $v.b1, $v.c1, $v.d1, $v.n1)
 }
\ No newline at end of file


$ pwsh -Command "& 'C:\Users\denni\AppData\Local\Temp\opencode\root-stats.ps1'"
root    total   user_id userId  userID  userid  none
au-gst  836     461     264     0       0       111
other   3809    1404    358     0       0       2047
plan-beta-copy  540     310     158     0       0       72
state-save      540     310     158     0       0       72

← Write C:/Users/denni/AppData/Local/Temp/opencode/root-stats2.ps1
Wrote file successfully.

3809 hits are outside the named worktrees. Let me identify which roots those belong to.

$ pwsh -Command "& 'C:\Users\denni\AppData\Local\Temp\opencode\root-stats2.ps1'"
=== non-worktree roots ===
  3809  C:\Users\denni\PycharmProjects\Kira

The manifest spans 4 roots: main repo (3809), au-gst worktree (836), plan-beta-copy (540), state-save (540). Notably plan-beta-copy and state-save have identical counts — likely duplicate content. Let me check prior audit outputs and plan my per-file review.

$ pwsh -Command "Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira\audit' -ErrorAction SilentlyContinue | Select-Object Name,Length,LastWriteTime"
(no output)

$ pwsh -Command "(Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\hits.tsv').Count; (Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\hits.tsv' | Select-Object -Unique -ExpandProperty { ($_ -split \"`t\")[0] }).Count"
ParserError: 
Line |
   1 |  . \hits.tsv' | Select-Object -Unique -ExpandProperty { ( -split \     \ .
     |                                                                 ~
     | Missing expression after unary operator '-split'.

← Write C:/Users/denni/AppData/Local/Temp/opencode/per-file.ps1
Wrote file successfully.

No prior audit outputs. Let me build the per-file hit inventory to plan the review, then establish semantic ground truth by reading the core files.

$ pwsh -Command "& 'C:\Users\denni\AppData\Local\Temp\opencode\per-file.ps1'"
Unique files: 737

=== Top 60 files by hit count ===
  83  C:\Users\denni\PycharmProjects\Kira\business-genome\e2e-validation.test.ts
  77  C:\Users\denni\PycharmProjects\Kira\.context\PROJECT_STATE.md
  70  C:\Users\denni\PycharmProjects\Kira\business-genome\repository.ts
  69  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1.2 Full-Stack Traceability Matrix.md
  65  C:\Users\denni\PycharmProjects\Kira\P2.4-A_CLASSIFICATION.md
  62  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260826100000_p05_canonical_identity.sql
  60  C:\Users\denni\PycharmProjects\Kira\P2.4-D2_CANONICAL_TRACEABILITY_AUDIT.md
  59  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827010000_p07_existing_data_migration.sql
  56  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Compatibility & Transition Architecture.md
  56  C:\Users\denni\PycharmProjects\Kira\P24_MIGRATION_PLAN.md
  53  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1.4 Target Production Architecture.md
  50  C:\Users\denni\PycharmProjects\Kira\docs\P2.3-D Resource Migration Matrix.md
  50  C:\Users\denni\PycharmProjects\Kira\RESOURCE_MIGRATION_MATRIX.md
  48  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828010000_phase1c_canonical_rls.sql
  46  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5A-B Memory Knowledge Ownership Trace.md
  42  C:\Users\denni\PycharmProjects\Kira\KIRA - P0.4 MEMORY REBINDING MAP.md
  42  C:\Users\denni\PycharmProjects\Kira\scripts\5e-d-user-id-sweep.ps1
  41  C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts
  41  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-D.md
  38  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-1D API Route Rebinding Guide.md
  37  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827100000_p04_kira_knowledge_org_scope.sql
  36  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827020000_p07_verification_suite.sql
  35  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830180000_kira_tasks_org_ownership.sql
  34  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260826110000_p05_membership_tenant_context.sql
  34  C:\Users\denni\PycharmProjects\Kira\lib\kira\convai.ts
  34  C:\Users\denni\PycharmProjects\Kira\lib\kira\swarm\stub.ts
  34  C:\Users\denni\PycharmProjects\Kira\docs\KIRA-CODING EXECUTION DIRECTIVE.md
  32  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.3-H Architectural Test Suite.md
  31  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260119000000_kira_complete.sql
  31  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260119000000_kira_complete.sql
  31  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260119000000_kira_complete.sql
  31  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.4-D Architectural Test Harness.md
  31  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260119000000_kira_complete.sql
  31  C:\Users\denni\PycharmProjects\Kira\lib\kira\swarm\tool-handlers.ts
  30  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-C Target Semantic Schema.md
  30  C:\Users\denni\PycharmProjects\Kira\lib\admin\exec.ts
  29  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.4-B Implementation Traceability Matrix.md
  29  C:\Users\denni\PycharmProjects\Kira\P2.4-E_PLAN.md
  29  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.4-C Gap Classification & Decision Register.md
  29  C:\Users\denni\PycharmProjects\Kira\P2.4-B_DECISION.md
  27  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1.3 Architectural Gap and Conflict Model.md
  27  C:\Users\denni\PycharmProjects\Kira\KIRA - Implementation Traceability Matrix.md
  26  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.6 INV Evidence Register.md
  26  C:\Users\denni\PycharmProjects\Kira\business-genome\repository.test.ts
  26  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260826120000_p05_rls_authority_transfer.sql
  25  C:\Users\denni\PycharmProjects\Kira\lib\kira\swarm\backfill.ts
  24  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1.1 Current-State Architecture Map.md
  24  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql
  24  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.3-G.1 Migration Safety Refinement.md
  24  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P2.1 Implementation Baseline and Migration Execution Plan.md
  23  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\research\route.ts
  23  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\research\route.ts
  23  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\research\route.ts
  22  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1.2 Full-Stack Traceability.md
  22  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql
  22  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\convai.ts
  22  C:\Users\denni\PycharmProjects\Kira\app\api\kira\chat\text\route.ts
  21  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830193000_kira_drafts_org_ownership.sql
  21  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.3-B Canonical Persistence Model.md
  21  C:\Users\denni\PycharmProjects\Kira\business-genome\extract.ts

→ Read supabase/migrations/20260826100000_p05_canonical_identity.sql

The main repo contains canonical identity migrations (P05) while the worktrees hold the pre-canonical schema. Let me establish ground truth by reading the canonical migration and core schema.

→ Read supabase/migrations/20260826100000_p05_canonical_identity.sql [offset=36, limit=260]

This is important context: the main repo already has P0.5 canonical identity migrations. Let me read the full migration and the phase 5E-D doc to understand the audit's frame of reference.

✗ Read docs/KIRA - Phase 5E-D.md failed
Error: File not found: C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-D.md

The main repo contains the P0.5 canonical identity migration. Let me read the Phase 5E-D doc to understand the sweep's exact scope and rubric.

$ pwsh -Command "Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira' -Filter '*5E-D*' -Recurse -Depth 2 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName; Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira\docs' -Filter '*.md' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-D Physical Target Schema & Migration Mapping.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-D.md
C:\Users\denni\PycharmProjects\Kira\scripts\5e-d-user-id-sweep.ps1
ADVISOR_AI_GOVERNANCE_ANSWERS.md
AI_INCIDENT_RESPONSE.md
API_KEY_MIGRATION_INVENTORY.md
BETA_FOLLOWUP_EMAILS.md
BETA_OUTREACH_2026-09-01.md
BETA_P1_OUTREACH_2026-08-17.md
BETA_REPLIES_2026-08-17.md
BETA-PRODUCTION-CRITICAL-PATH.md
BRIEF_CALL_CAPTURE_P1_AND_SIZING.md
BRIEF_CALL_CAPTURE.md
BRIEF_EXTERNAL_ARCHITECTURE_REVIEW_2026-08-14.md
BRIEF_ORCHESTRATOR_CONSENT_SUMMARY.md
BRIEF_ORCHESTRATOR_DRIVE_FILE_SCOPES.md
BRIEF_ORCHESTRATOR_METERING_AND_GUARDS.md
BROKER_CHANNEL_BUILD_STATE.md
BUILD_REGISTER.md
CALL_STRUCTURE_PETER_MCDOWELL_2026-08-11.md
CAPTURED_ASKS.md
coding-tool-policy.md
CONNECTOR_POLICY.md
DECISIONS_PRACTICE_INTELLIGENCE.md
DECISIONS.md
DECK_FEEDBACK_KIRA_INSIDE_v1.md
DECK_FEEDBACK_KIRA_INSIDE_v2.md
DEMO_SPEC.md
DOMAIN_KIRAEXEC.md
DRIFT_AND_GUARDS.md
EMAIL_TO_CARMEN_AND_ANDREW_2026-08-10.md
EMAIL_TO_NEIL_2026-08-10.md
EMAIL_UPDATE_TO_ENTRANTS_2026-08-10.md
GARETH_SHAH_INTEGRATION_SEAMS.md
GENOME_BUCKET_CHECKLIST.md
GENOME_BUYER_FORMAT.md
GENOME_WRITE_BACK.md
HANDOFF_2026-08-03_CONCURRENT_SESSION.md
HANDOFF_2026-08-03_EVENING.md
HANDOFF_2026-08-06_CONCURRENT_SESSION.md
HANDOFF_FROM_BUCKETLYST_SESSION.md
HLD.md
HUMAN_TEST_2026-08-07.md
K3A_RECLASSIFICATION_REVIEW.md
KIRA - Phase 3 Canonical Implementation Traceability Reconciliation.md
KIRA - Phase 4 Canonical Implementation Traceability Audit.md
KIRA - Phase 5A-B Memory Knowledge Ownership Trace.md
KIRA - Phase 5D kira_memory Semantic Inventory.md
KIRA - Phase 5E-A Current Schema Inventory.md
KIRA - Phase 5E-B Organisation-Context Resolution.md
KIRA - Phase 5E-C Target Semantic Schema.md
KIRA - Phase 5E-D Physical Target Schema & Migration Mapping.md
KIRA - API Contract Architecture.md
KIRA - Architectural Test Suite.md
KIRA - Canonical Organisational Model.md
KIRA - Compatibility & Transition Architecture.md
KIRA - Engagement Domain Specification.md
KIRA - MASTER ARCHITECTURAL EXECUTION PROTOCOL.md
KIRA - Migration Architecture.md
KIRA - Organisational Temporal State Machine.md
KIRA - P0.2-A.1 Canonical Identity & Relationship Model.md
KIRA - P0.2-B.1 Temporal State Machine Amendment.md
KIRA - P0.2-C Assessment to Initial Organisational State.md
KIRA - P0.3-A Implementation Traceability & Gap Matrix.md
KIRA - P0.3-B Canonical Persistence Model.md
KIRA - P0.3-C Organisational State Persistence Model.md
KIRA - P0.3-D Engagement Persistence Model.md
KIRA - P0.3-G.1 Migration Safety Refinement.md
KIRA - P0.3-H Architectural Test Suite.md
KIRA - P0.4-B Implementation Traceability Matrix.md
KIRA - P0.4-C Gap Classification & Decision Register.md
KIRA - P0.4-D Architectural Test Harness.md
KIRA - P0.4-D Physical Migration Plan.md
KIRA - P0.4-E Baseline Test Run.md
KIRA - P0.5-1A Migration Verification.md
KIRA - P0.5-1B Membership Verification.md
KIRA - P0.5-1C RLS Authority Transfer Verification.md
KIRA - P0.5-1D API Route Rebinding Guide.md
KIRA - P0.5-1D API Route Rebinding Verification.md
KIRA - P0.5-2A Consultant Relationship Verification.md
KIRA - P0.5-2B Engagement Model Verification.md
KIRA - P0.5-2D Consultant Engagement API Rebinding.md
KIRA - P0.5-3 Commercial Structures Verification.md
KIRA - P0.5-4 Kira Instance Separation Verification.md
KIRA - P0.5-5 Decision Lifecycle Verification.md
KIRA - P0.5-6 Legacy Authority Retirement Verification.md
KIRA - P0.6 Implementation Traceability Matrix.md
KIRA - P0.6 INV Evidence Register.md
KIRA - P0.7 Knowledge Layer Architecture.md
KIRA - P0.7 Knowledge Layer Verification.md
KIRA - P0.7 Verification Run.md
KIRA - P1 Production Architecture Derivation.md
KIRA - P1.1 Current-State Architecture Map.md
KIRA - P1.2 Full-Stack Traceability Matrix.md
KIRA - P1.2 Full-Stack Traceability.md
KIRA - P1.3 Architectural Gap and Conflict Model.md
KIRA - P1.4 Target Production Architecture.md
KIRA - P2.1 Implementation Baseline and Migration Execution Plan.md
KIRA - Phase 5E-D.md
KIRA - Phase 5E-E.md
KIRA - Revised Architectural Audit Priority & Persistent Organisational Intelligence Directive.md
KIRA - Semantic Disposition Register.md
kira ai search build.md
KIRA CODING - ARCHITECTURAL DIRECTIVE.md
KIRA CODING - EXECUTION & VERIFICATION DIRECTIVE.md
KIRA Coding Directive - Establish Repository Status and Canonical Traceability Baseline.md
KIRA Coding Directive - P0.6 Canonical Organisational Model Implementation & Traceability Audit.md
KIRA CODING DIRECTIVE - STOP PATCH MIGRATIONS - COMPLETE CANONICAL SCHEMA ALIGNMENT.md
KIRA Coding Instructions - P0.7 Schema Archaeology Before Migration Changes.md
KIRA PLATFORM - ARCHITECTURAL ALIGNMENT & AUDIT DIRECTIVE.md
Kira Platform - Phase 1 Architecture & Remediation Assessment.md
KIRA_COMPONENT_INTERFACE.md
KIRA_EXEC_BROKER_CHANNEL_BRIEF.md
Kira-Coding - Canonical Architecture, Small-Win Flow & Implementation Conformance Audit.md
KIRA-CODING EXECUTION DIRECTIVE.md
LLD.md
MIGRATION_PLAN_2026-05-19.md
NAIVE_TESTER_REMEDIATION_2026-05-19.md
NEXT_BUILD_SCOPE.md
NEXT_SESSION.md
OPEN_ITEMS.md
OWNER_OPERATOR_AI_EA_MODEL.md
P2.3-D Resource Migration Matrix.md
PRODUCT_MEASURED_SYSTEMISATION.md
PROPOSAL_JUST_HVAC_SOP_QUALITY.md
REBRAND_QUESTIONNAIRE.md
REUSE_AUDIT.md
SMALL_WIN_AUDIT_2026-09-01.md
SMALL_WIN_COPY_DRAFT_2026-09-01.md
SPEC_DATED_OBLIGATIONS.md
SPEC_GENOME_CHECKLIST_AND_PATHWAYS.md
STATE_2026-07-28.md
SUPABASE_API_KEY_MODEL_MIGRATION_VALIDATION.md
SUPABASE_MIGRATION_INVENTORY.md
TESTING.md
user_id_conversion.md
VOICE_MEMORY_CANONICAL_FIX_SCOPE.md
WHAT_KIRA_CAN_DO.md

# Todos
[•] Establish sweep scope + rubric (read 5E-D docs, sweep script, canonical migration)
[✓] Verify all 5725 manifest hits resolve to readable file:line locations
[ ] Classify every hit across 737 files (per-file reading + context)
[ ] Generate complete machine-readable classification table (all 5725 rows)
[ ] Produce counts, low-confidence list, ambiguous list, remediation P0-P4, INV summary

This is a very large audit (5725 hits, 737 files). Let me set up my work plan and read the key framing documents.

← Write C:/Users/denni/AppData/Local/Temp/opencode/sample-canon.ps1
Wrote file successfully.

This is a 5725-row audit. Let me design the classification by first examining the semantic patterns in the actual hit lines.

$ pwsh -Command "& 'C:\Users\denni\AppData\Local\Temp\opencode\sample-canon.ps1'"
canonical token lines: 3423
=== sample canonical hit lines ===
[WT] au-gst\app\admin\(panel)\exec\[userId]\page.tsx :: 9 :: export default async function ExecUserManagePage({ params }: { params: Promise<{ userId: string }> }) {
[WT] au-gst\app\admin\(panel)\exec\[userId]\page.tsx :: 10 :: const { userId } = await params;
[WT] au-gst\app\admin\(panel)\exec\[userId]\page.tsx :: 16 :: .eq('id', userId)
[WT] au-gst\app\admin\(panel)\exec\[userId]\page.tsx :: 21 :: sb.from('business_valuations').select('gap, worth_today, worth_potential, readiness, currency, industry').eq('user_id', userId).maybeSingle(),
[WT] au-gst\app\admin\(panel)\exec\[userId]\page.tsx :: 22 :: sb.from('kira_agents').select('id, agent_name, elevenlabs_agent_id, status, journey_type, total_conversations, last_conversation_at').eq('user_id', userId).neq('status', 'deleted').order('last_conversation_at', { ascending: false, nullsFirst: false }),
[WT] au-gst\app\admin\(panel)\exec\[userId]\page.tsx :: 23 :: sb.from('kira_knowledge').select('id, title, url, file_name, source_type, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
[WT] au-gst\app\admin\(panel)\exec\[userId]\page.tsx :: 24 :: sb.from('kira_memory').select('id, content, memory_type, importance, created_at').eq('user_id', userId).eq('active', true).order('importance', { ascending: false }).order('created_at', { ascending: false }),
[WT] au-gst\app\admin\(panel)\exec\page.tsx :: 41 :: <section key={r.userId} className="rounded-2xl border border-gray-200 bg-white p-5">
[WT] au-gst\app\admin\(panel)\exec\page.tsx :: 83 :: href={`/admin/exec/${r.userId}`}
[WT] au-gst\app\admin\(panel)\trust\page.tsx :: 203 :: 'id, source, asked, reason, created_at, declined_because, users:user_id (email), agent:kira_agent_id (agent_name)',
[WT] au-gst\app\api\admin\genome\reclassify\route.ts :: 43 :: let body: { userId?: string; limit?: number; apply?: ProposedChange[]; revert?: ProposedChange[] } = {};
[WT] au-gst\app\api\admin\genome\reclassify\route.ts :: 62 :: const proposal = await classifyForReview({ userId: body.userId, limit: body.limit ?? 1000 });
[WT] au-gst\app\api\cron\genome-classify\route.ts :: 41 :: .select('user_id')
[WT] au-gst\app\api\cron\genome-classify\route.ts :: 51 :: const owners = [...new Set((waiting ?? []).map((r) => r.user_id as string))].slice(0, OWNER_BATCH);
[WT] au-gst\app\api\cron\genome-classify\route.ts :: 54 :: for (const userId of owners) {
[WT] au-gst\app\api\cron\genome-classify\route.ts :: 56 :: const filed = await classifyPendingMemories(userId, PER_OWNER);
[WT] au-gst\app\api\cron\genome-classify\route.ts :: 62 :: console.error(`[cron/genome-classify] ${userId} failed (others continue):`, sweepError);
[WT] au-gst\app\api\cron\memory-integrity\route.ts :: 12 :: // THE INVARIANT. A memory row names its owner (convai_memory.user_id) and, optionally, the agent it
[WT] au-gst\app\api\cron\memory-integrity\route.ts :: 14 :: // must be the same person. If convai_memory.user_id ever disagrees with convai_agents.user_id for
[WT] au-gst\app\api\cron\memory-integrity\route.ts :: 42 :: .select('id, user_id, agent_id')
[WT] au-gst\app\api\cron\memory-integrity\route.ts :: 59 :: .select('id, user_id')
[WT] au-gst\app\api\cron\memory-integrity\route.ts :: 67 :: const ownerOfAgent = new Map((agents ?? []).map((a) => [String(a.id), String(a.user_id)]));
[WT] au-gst\app\api\cron\memory-integrity\route.ts :: 80 :: if (agentOwner !== String(row.user_id)) {
[WT] au-gst\app\api\cron\memory-integrity\route.ts :: 83 :: memoryUser: String(row.user_id),
[WT] au-gst\app\api\cron\reconcile-tasks\route.ts :: 70 :: .select('id, user_id, intent_id, status, updated_at')
[WT] au-gst\app\api\cron\reconcile-tasks\route.ts :: 94 :: const live = await coordinator.getTaskState(taskGroupId, task.user_id as string);
[WT] au-gst\app\api\cron\reconcile-tasks\route.ts :: 155 :: async knownIntentIds(userId: string) {
[WT] au-gst\app\api\cron\reconcile-tasks\route.ts :: 159 :: .eq('user_id', userId);
[WT] au-gst\app\api\cron\reconcile-tasks\route.ts :: 171 :: .upsert(rows, { onConflict: 'user_id,intent_id' });
[WT] au-gst\app\api\cron\reengagement-emails\route.ts :: 54 :: user_id: user.user_id,
[WT] au-gst\app\api\cron\reengagement-emails\route.ts :: 68 :: .eq('id', user.user_id);
[WT] au-gst\app\api\cron\reengagement-emails\route.ts :: 82 :: user_id: user.user_id,
[WT] au-gst\app\api\cron\trial-ending\route.ts :: 80 :: .eq('user_id', user.id)
[WT] au-gst\app\api\genome\export\route.ts :: 136 :: .eq('user_id', appUser.id)
[WT] au-gst\app\api\genome\redact\route.ts :: 61 :: // row, compares the owner and then writes has a gap between the two; putting user_id in the
[WT] au-gst\app\api\genome\redact\route.ts :: 71 :: .eq('user_id', user.id)
[WT] au-gst\app\api\genome\redact\route.ts :: 96 :: .eq('user_id', user.id)
[WT] au-gst\app\api\genome\redact\route.ts :: 107 :: .eq('user_id', user.id);
[WT] au-gst\app\api\kira\agent\complete\route.ts :: 10 :: const { agentId, userId, feedback } = body;
[WT] au-gst\app\api\kira\agent\complete\route.ts :: 70 :: userId,
[WT] au-gst\app\api\kira\agent\route.ts :: 25 :: .select('id, user_id, agent_name, journey_type, status, elevenlabs_agent_id, framework')
[WT] au-gst\app\api\kira\agent\route.ts :: 40 :: if (!admin && (!appUser || appUser.id !== agent.user_id)) {
[WT] au-gst\app\api\kira\agent\route.ts :: 46 :: user_id: agent.user_id,
[WT] au-gst\app\api\kira\chat\start\route.ts :: 49 :: .select('elevenlabs_agent_id, status, user_id')
[WT] au-gst\app\api\kira\chat\start\route.ts :: 63 :: if (!admin && (!appUser || appUser.id !== kiraAgent.user_id)) {
[WT] au-gst\app\api\kira\chat\text\route.ts :: 150 :: async function recalledFacts(supabase: ReturnType<typeof createServiceClient>, userId: string): Promise<string> {
[WT] au-gst\app\api\kira\chat\text\route.ts :: 154 :: .eq('user_id', userId)
[WT] au-gst\app\api\kira\chat\text\route.ts :: 180 :: async function taskLedgerContext(userId: string): Promise<string> {
[WT] au-gst\app\api\kira\chat\text\route.ts :: 181 :: const ledger = await readTaskLedger(userId);
[WT] au-gst\app\api\kira\chat\text\route.ts :: 236 :: .select('id, user_id, elevenlabs_agent_id, status')
[WT] au-gst\app\api\kira\chat\text\route.ts :: 240 :: if (agent.user_id !== appUser.id && !(await isCurrentUserAdmin())) {
[WT] au-gst\app\api\kira\chat\text\route.ts :: 300 :: userId: agent.user_id as string,
[WT] au-gst\app\api\kira\chat\text\route.ts :: 316 :: userId: agent.user_id as string,
[WT] au-gst\app\api\kira\chat\text\route.ts :: 325 :: agent.user_id as string,
[WT] au-gst\app\api\kira\chat\text\route.ts :: 340 :: await forgetParkedEntityLeaks(agent.user_id as string, KIRA_CONVAI_TABLES.memory);
[WT] au-gst\app\api\kira\chat\text\route.ts :: 346 :: const refiled = await refileAssistantCapabilityClaims(agent.user_id as string, KIRA_CONVAI_TABLES.memory);
[WT] au-gst\app\api\kira\chat\text\route.ts :: 398 :: user_id: agent.user_id,
[WT] au-gst\app\api\kira\chat\text\route.ts :: 424 :: recalledFacts(supabase, agent.user_id as string),
[WT] au-gst\app\api\kira\chat\text\route.ts :: 425 :: taskLedgerContext(agent.user_id as string),
[WT] au-gst\app\api\kira\chat\text\route.ts :: 489 :: // IDENTITY IS THE ROUTE'S, NOT THE MODEL'S. agent.user_id came from the authenticated

✗ Read docs/KIRA - Phase 5E-D.md failed
Error: File not found: C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-D.md

The manifest captures lines containing both legacy `user_id` and canonical `organisation_id`/`tenantId` tokens. I need the exact rubric this sweep is testing against. Let me read the governing 5E-D and classification docs.

$ pwsh -Command "Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira\docs' -Filter '*.md' | Where-Object { $_.Name -match '5E-D|P2.4|5D' } | Select-Object -ExpandProperty FullName"
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.

← Write C:/Users/denni/AppData/Local/Temp/opencode/find-docs.ps1
Wrote file successfully.

The shell keeps eating `$_`. Let me write scripts to files instead of inline.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\find-docs.ps1"
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 3 Canonical Implementation Traceability Reconciliation.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 4 Canonical Implementation Traceability Audit.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5D kira_memory Semantic Inventory.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-D Physical Target Schema & Migration Mapping.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.3-A Implementation Traceability & Gap Matrix.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.4-B Implementation Traceability Matrix.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.6 Implementation Traceability Matrix.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1.2 Full-Stack Traceability Matrix.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1.2 Full-Stack Traceability.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-D.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA Coding Directive - Establish Repository Status and Canonical Traceability Baseline.md
C:\Users\denni\PycharmProjects\Kira\docs\KIRA Coding Directive - P0.6 Canonical Organisational Model Implementation & Traceability Audit.md

← Write C:/Users/denni/AppData/Local/Temp/opencode/name-bytes.ps1
Wrote file successfully.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\name-bytes.ps1"
NAME: [KIRA - Phase 5E-D Physical Target Schema & Migration Mapping.md]
BYTES:  + 4B 49 52 41 20 2D 20 50 68 61 73 65 20 35 45 2D 44 20 50 68 79 73 69 63 61 6C 20 54 61 72 67 65 74 20 53 63 68 65 6D 61 20 26 20 4D 69 67 72 61 74 69 6F 6E 20 4D 61 70 70 69 6E 67 2E 6D 64
NAME: [KIRA - Phase 5E-D.md]
BYTES:  + 4B 49 52 41 20 E2 80 94 20 50 68 61 73 65 20 35 45 2D 44 2E 6D 64

→ Read docs/KIRA — Phase 5E-D.md

The filename uses an em dash. Let me read the governing 5E-D doc.

→ Read docs/KIRA — Phase 5E-D.md [offset=39]

← Write C:/Users/denni/AppData/Local/Temp/opencode/overlap.ps1
Wrote file successfully.

This is a large-scale audit. Let me check whether plan-beta-copy and state-save worktrees are identical, and understand the file overlap across roots.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1"
...output truncated...

Full output saved to: C:\Users\denni\.local\share\opencode\tool-output\tool_06064bb97001Td7Cs0WZ31V4Jf

  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
OperationStopped: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:13
Line |
  13 |  .   } elseif ($path -match '^C:\Users\denni\PycharmProjects\Kira\\(.+)$ .
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Invalid pattern '^C:\Users\denni\PycharmProjects\Kira\\(.+)$' at offset 5. Unrecognized escape sequence \U.
MethodInvocationException: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:18
Line |
  18 |      if (-not $byGroups.ContainsKey($key)) { $byGroups[$key] = @{} }
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Exception calling "ContainsKey" with "1" argument(s): "Value cannot be null. (Parameter 'key')"
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:19
Line |
  19 |      if (-not $byGroups[$key].ContainsKey($root)) { $byGroups[$key][$r .
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\overlap.ps1:20
Line |
  20 |      $byGroups[$key][$root]++
     |      ~~~~~~~~~~~~~~~~~~~~~~~~
     | Index operation failed; the array index evaluated to null.
rel-path roots breakdown (files appearing in >1 root):
  supabase\migrations\20260724000000_business_valuations.sql  ==>  state-save:3, plan-beta-copy:3, au-gst:3
  app\api\kira\email\send-kira-ready\route.ts  ==>  state-save:6, plan-beta-copy:6, au-gst:6
  app\dashboard\page.tsx  ==>  state-save:3, plan-beta-copy:3, au-gst:3
  lib\valuation\snapshots.ts  ==>  state-save:4, plan-beta-copy:4, au-gst:4
  components\ReferFriend.tsx  ==>  state-save:3, plan-beta-copy:3, au-gst:3
  lib\kira\recall.ts  ==>  state-save:9, plan-beta-copy:9, au-gst:9
  lib\kira\research-tools.ts  ==>  state-save:2, plan-beta-copy:2, au-gst:2
  READMEFIXES.md  ==>  state-save:14, plan-beta-copy:14, au-gst:14
  lib\kira\apply-profile.ts  ==>  state-save:6, plan-beta-copy:6, au-gst:6
  lib\supabase\server.ts  ==>  state-save:3, plan-beta-copy:3, au-gst:3
  supabase\archive\add_conversation_messages.sql  ==>  state-save:4, plan-beta-copy:4, au-gst:4
  supabase\migrations\20260727120000_valuation_history.sql  ==>  state-save:19, plan-beta-copy:19, au-gst:19
  app\setup\knowledge\page.tsx  ==>  state-save:3, plan-beta-copy:3, au-gst:3
  lib\kira\swarm\tool-handlers.ts  ==>  state-save:6, plan-beta-copy:6, au-gst:18
  app\api\pubguard\v2\scan\route.ts  ==>  state-save:4, plan-beta-copy:4, au-gst:4
  lib\elevenlabs\tools\conversation-tools.ts  ==>  state-save:2, plan-beta-copy:2, au-gst:2
  app\knowledge\page.tsx  ==>  state-save:3, plan-beta-copy:3, au-gst:3
  app\api\kira\knowledge\upload\route.ts  ==>  state-save:5, plan-beta-copy:5, au-gst:5
  app\admin\(panel)\exec\page.tsx  ==>  state-save:2, plan-beta-copy:2, au-gst:2
  supabase\migrations\20260720000000_convai_canonical_reconcile.sql  ==>  state-save:2, plan-beta-copy:2, au-gst:2
  supabase\migrations\20260728160000_genome_sections.sql  ==>  state-save:1, plan-beta-copy:1, au-gst:1
  docs\GARETH_SHAH_INTEGRATION_SEAMS.md  ==>  state-save:7, plan-beta-copy:7, au-gst:7
  scripts\backfill-kira-conversations.mjs  ==>  state-save:1, plan-beta-copy:1, au-gst:1
  docs\REUSE_AUDIT.md  ==>  state-save:1, plan-beta-copy:1, au-gst:1
  docs\MIGRATION_PLAN_2026-05-19.json  ==>  state-save:1, plan-beta-copy:1, au-gst:1
  lib\kira\uid-tools.ts  ==>  state-save:3, plan-beta-copy:3, au-gst:6
  lib\kira\tools\conversation-tools.ts  ==>  state-save:3, plan-beta-copy:3, au-gst:3
  lib\kira\swarm\orchestrator-adapter.ts  ==>  state-save:9, plan-beta-copy:9, au-gst:12
  app\api\kira\agent\route.ts  ==>  state-save:3, plan-beta-copy:3, au-gst:3
  app\api\loi\route.ts  ==>  state-save:1, plan-beta-copy:1, au-gst:1
  lib\kira\mnemo.ts  ==>  state-save:6, plan-beta-copy:6, au-gst:9
  lib\admin\exec-reprovision.ts  ==>  state-save:2, plan-beta-copy:2, au-gst:2
  app\api\cron\memory-integrity\route.ts  ==>  state-save:7, plan-beta-copy:7, au-gst:7
  app\admin\(panel)\exec\[userId]\page.tsx  ==>  state-save:7, plan-beta-copy:7, au-gst:7
  supabase\migrations\20260119000000_kira_complete.sql  ==>  state-save:31, plan-beta-copy:31, au-gst:31
  HANDOFF_RESPONSE.md  ==>  state-save:2, plan-beta-copy:2, au-gst:2
  app\api\kira\conversation\context\route.ts  ==>  state-save:4, plan-beta-copy:4, au-gst:4
  supabase\migrations\20260725000000_loi_commitments.sql  ==>  state-save:1, plan-beta-copy:1, au-gst:1
  supabase\migrations\20260720600000_fix_welcome_back_recall.sql  ==>  state-save:2, plan-beta-copy:2, au-gst:2
  docs\BROKER_CHANNEL_BUILD_STATE.md  ==>  state-save:1, plan-beta-copy:1, au-gst:1

Files in >1 root: 102
Total unique rel paths: 168

← Write C:/Users/denni/AppData/Local/Temp/opencode/overlap2.ps1
Wrote file successfully.

Regex escape issue. Let me use string prefix matching instead.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\overlap2.ps1"
Files appearing in >1 root:
  app\admin\(panel)\exec\[userId]\page.tsx  ==>  MAIN:12, plan-beta-copy:7
  app\admin\(panel)\exec\page.tsx  ==>  MAIN:2, plan-beta-copy:2
  app\api\cron\memory-integrity\route.ts  ==>  MAIN:11, plan-beta-copy:7
  app\api\cron\reengagement-emails\route.ts  ==>  MAIN:5, plan-beta-copy:3
  app\api\cron\trial-ending\route.ts  ==>  MAIN:1, plan-beta-copy:1
  app\api\kira\agent\complete\route.ts  ==>  MAIN:5, plan-beta-copy:2
  app\api\kira\agent\route.ts  ==>  MAIN:8, plan-beta-copy:3
  app\api\kira\chat\start\route.ts  ==>  MAIN:5, plan-beta-copy:2
  app\api\kira\conversation\context\route.ts  ==>  MAIN:3, plan-beta-copy:4
  app\api\kira\create\route.ts  ==>  MAIN:10, plan-beta-copy:5
  app\api\kira\email\send-kira-ready\route.ts  ==>  MAIN:8, plan-beta-copy:6
  app\api\kira\knowledge\[id]\route.ts  ==>  MAIN:4, plan-beta-copy:3
  app\api\kira\knowledge\upload\route.ts  ==>  MAIN:6, plan-beta-copy:5
  app\api\kira\knowledge\url\route.ts  ==>  MAIN:6, plan-beta-copy:6
  app\api\kira\research\route.ts  ==>  MAIN:41, plan-beta-copy:23
  app\api\kira\webhooks\save_message\route.ts  ==>  MAIN:1, plan-beta-copy:1
  app\api\kira\webhooks\task-events\route.ts  ==>  MAIN:8, plan-beta-copy:6
  app\api\loi\route.ts  ==>  MAIN:1, plan-beta-copy:1
  app\api\onboarding\complete\route.ts  ==>  MAIN:8, plan-beta-copy:4
  app\api\pubguard\scan\save\route.ts  ==>  MAIN:8, plan-beta-copy:8
  app\api\pubguard\v2\scan\route.ts  ==>  MAIN:4, plan-beta-copy:4
  app\api\pubguard\v2\supabase-migration.sql  ==>  MAIN:8, plan-beta-copy:8
  app\api\pubguard\v2\types.ts  ==>  MAIN:1, plan-beta-copy:1
  app\api\pubguard\webhook\route.ts  ==>  MAIN:14, plan-beta-copy:14
  app\api\valuation\claim\route.ts  ==>  MAIN:6, plan-beta-copy:4
  app\chat\[agentId]\page.tsx  ==>  MAIN:15, plan-beta-copy:15
  app\dashboard\page.tsx  ==>  MAIN:6, plan-beta-copy:3
  app\knowledge\KnowledgeManager.tsx  ==>  MAIN:2, plan-beta-copy:3
  app\knowledge\page.tsx  ==>  MAIN:2, plan-beta-copy:3
  app\pubguard\config.ts  ==>  MAIN:2, plan-beta-copy:2
  app\setup\knowledge\page.tsx  ==>  MAIN:3, plan-beta-copy:3
  app\talk\page.tsx  ==>  MAIN:1, plan-beta-copy:1
  CLAUDE.md  ==>  MAIN:2, plan-beta-copy:2
  components\KiraVoiceWidget.tsx  ==>  MAIN:3, plan-beta-copy:3
  components\ReferFriend.tsx  ==>  MAIN:3, plan-beta-copy:3
  docs\BROKER_CHANNEL_BUILD_STATE.md  ==>  MAIN:1, plan-beta-copy:1
  docs\GARETH_SHAH_INTEGRATION_SEAMS.md  ==>  MAIN:7, plan-beta-copy:7
  docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md  ==>  MAIN:1, plan-beta-copy:1
  docs\LLD.md  ==>  MAIN:5, plan-beta-copy:2
  docs\MIGRATION_PLAN_2026-05-19.json  ==>  MAIN:1, plan-beta-copy:1
  docs\MIGRATION_PLAN_2026-05-19.md  ==>  MAIN:2, plan-beta-copy:2
  docs\REUSE_AUDIT.md  ==>  MAIN:1, plan-beta-copy:1
  docs\VOICE_MEMORY_CANONICAL_FIX_SCOPE.md  ==>  MAIN:1, plan-beta-copy:1
  HANDOFF_RESPONSE.md  ==>  MAIN:2, plan-beta-copy:2
  lib\admin\exec-reprovision.ts  ==>  MAIN:2, plan-beta-copy:2
  lib\admin\exec.ts  ==>  MAIN:30, plan-beta-copy:15
  lib\billing\billing.integration.test.ts  ==>  MAIN:5, plan-beta-copy:5
  lib\billing\index.ts  ==>  MAIN:8, plan-beta-copy:5
  lib\elevenlabs\tools\conversation-tools.ts  ==>  MAIN:2, plan-beta-copy:2
  lib\genome\derive.ts  ==>  MAIN:19, plan-beta-copy:5

Files in >1 root: 102
Total unique rel paths: 635

← Write C:/Users/denni/AppData/Local/Temp/opencode/per-file-full.ps1
Wrote file successfully.

Let me get the full per-file inventory across all roots to plan my reading.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\per-file-full.ps1" > "C:\Users\denni\AppData\Local\Temp\opencode\per-file-list.txt" ; Get-Content "C:\Users\denni\AppData\Local\Temp\opencode\per-file-list.txt" -ErrorAction SilentlyContinue
...output truncated...

Full output saved to: C:\Users\denni\.local\share\opencode\tool-output\tool_060661291001m2yMM3xFQK1UKd

   8  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-D Physical Target Schema & Migration Mapping.md
   8  C:\Users\denni\PycharmProjects\Kira\app\api\kira\email\send-kira-ready\route.ts
   8  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\pubguard\scan\save\route.ts
   8  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\business-identity\sync.ts
   8  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\pubguard\scan\save\route.ts
   8  C:\Users\denni\PycharmProjects\Kira\lib\kira\refusal-sweep.ts
   8  C:\Users\denni\PycharmProjects\Kira\lib\business-identity\sync.ts
   8  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\task-events\route.ts
   8  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\pubguard\scan\save\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\app\api\cron\auto-record-absence\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\GARETH_SHAH_INTEGRATION_SEAMS.md
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GARETH_SHAH_INTEGRATION_SEAMS.md
   7  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.7 Knowledge Layer Verification.md
   7  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.6 Implementation Traceability Matrix.md
   7  C:\Users\denni\PycharmProjects\Kira\docs\BUILD_REGISTER.md
   7  C:\Users\denni\PycharmProjects\Kira\docs\GARETH_SHAH_INTEGRATION_SEAMS.md
   7  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830191000_business_valuations_org_ownership.sql
   7  C:\Users\denni\PycharmProjects\Kira\app\api\cron\genome-classify\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\GARETH_SHAH_INTEGRATION_SEAMS.md
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\backfill-genome-register.mjs
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\memory-integrity\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\admin\(panel)\exec\[userId]\page.tsx
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\cron\memory-integrity\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\genome\file-manual.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\create\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\lookup.ts
   7  C:\Users\denni\PycharmProjects\Kira\scripts\backfill-genome-register.mjs
   7  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260901090000_beta_codes_org_nullable.sql
   7  C:\Users\denni\PycharmProjects\Kira\scripts\provision-redteam-identity.mjs
   7  C:\Users\denni\PycharmProjects\Kira\lib\kira\lookup.ts
   7  C:\Users\denni\PycharmProjects\Kira\lib\genome\file-manual.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\[userId]\page.tsx
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\cron\memory-integrity\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\lib\kira\entity-sweep.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\apply-profile.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\email\send-kira-ready\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260810120000_public_asks_and_alert_throttle.sql
   6  C:\Users\denni\PycharmProjects\Kira\lib\genome\access-log.ts
   6  C:\Users\denni\PycharmProjects\Kira\lib\kira\knowledge-ingest.ts
   6  C:\Users\denni\PycharmProjects\Kira\scripts\rescore-valuations.mjs
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\task-events\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\reprovision-kira-agents.mjs
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\keep_document\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\knowledge\url\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\reprovision-kira-agents.mjs
   6  C:\Users\denni\PycharmProjects\Kira\lib\valuation\recompute-readiness.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\webhooks\task-events\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\lookup_contact\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\uid-tools.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\email\send-kira-ready\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-A Current Schema Inventory.md
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\search_drive\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\knowledge\url\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\apply-profile.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\knowledge-ingest.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\apply-profile.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\webhooks\task-events\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\rescore-valuations.mjs
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\knowledge\upload\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\app\api\valuation\claim\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\email\send-kira-ready\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\swarm\tool-handlers.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\mnemo.ts
   6  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260824100000_business_identity_rls.sql
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\mnemo.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\knowledge\url\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\lib\valuation\snapshots.ts
   6  C:\Users\denni\PycharmProjects\Kira\lib\kira\recall.ts
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\knowledge\url\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\swarm\tool-handlers.ts
   6  C:\Users\denni\PycharmProjects\Kira\app\dashboard\page.tsx
   6  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-E.md
   5  C:\Users\denni\PycharmProjects\Kira\scripts\test-task-loop.mjs
   5  C:\Users\denni\PycharmProjects\Kira\app\api\kira\chat\start\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\knowledge-ingest.ts
   5  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827110000_p04_search_knowledge_semantic_org.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\billing\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\test-task-loop.mjs
   5  C:\Users\denni\PycharmProjects\Kira\business-genome\post-call-hook.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\introducer\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\genome\derive.ts
   5  C:\Users\denni\PycharmProjects\Kira\app\api\kira\agent\complete\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\lib\kira\swarm\coordinator.ts
   5  C:\Users\denni\PycharmProjects\Kira\lib\introducer\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\introducer\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827120000_p04_match_kira_knowledge_chunks_org.sql
   5  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260901120000_absences_and_membership_guardrails.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\billing\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reconcile-tasks\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\add_email_logs.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\introducer\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\knowledge\upload\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\app\api\cron\reengagement-emails\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\billing\billing.integration.test.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\swarm\coordinator.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\genome\derive.ts
   5  C:\Users\denni\PycharmProjects\Kira\lib\kira\other-businesses.ts
   5  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-5 Decision Lifecycle Verification.md
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\billing\billing.integration.test.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\test-task-loop.mjs
   5  C:\Users\denni\PycharmProjects\Kira\lib\billing\billing.integration.test.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\create\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\create\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\knowledge-ingest.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\refusal.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\archive\add_email_logs.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\knowledge\upload\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.7 Verification Run.md
   5  C:\Users\denni\PycharmProjects\Kira\lib\kira\discovery.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\billing\billing.integration.test.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\test-task-loop.mjs
   5  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.2-A.1 Canonical Identity & Relationship Model.md
   5  C:\Users\denni\PycharmProjects\Kira\docs\LLD.md
   5  C:\Users\denni\PycharmProjects\Kira\lib\kira\swarm\drafts.ts
   5  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-2A Consultant Relationship Verification.md
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\knowledge\upload\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\billing\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\onboarding\complete\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\start_conversation\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\app\api\genome\redact\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\supabase\archive\add_email_logs.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\genome-classify\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\archive\add_email_logs.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\valuation\snapshots.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260725120000_kira_knowledge_chunks.sql
   4  C:\Users\denni\PycharmProjects\Kira\app\my-genome\[area]\actions.ts
   4  C:\Users\denni\PycharmProjects\Kira\scripts\reprovision-agent-full.mjs
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\archive\add_conversation_messages.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\onboarding\complete\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\business-genome\VALIDATION_REPORT.md
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\valuation\snapshots.ts
   4  C:\Users\denni\PycharmProjects\Kira\scripts\lib\redteam-tools.mjs
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725160000_kira_tasks.sql
   4  C:\Users\denni\PycharmProjects\Kira\business-genome\extract.test.ts
   4  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-1C RLS Authority Transfer Verification.md
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\pubguard\v2\scan\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\swarm\coordinator.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\purge-trial-agents.mjs
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\conversation\context\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\valuation\claim\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\KIRA_COMPONENT_INTERFACE.md
   4  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827205246_phase0_auth_security.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\conversation\context\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\app\api\cron\reconcile-tasks\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\lib\genome\dedupe-sweep-apply.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\add_conversation_messages.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\other-businesses.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\lib\redteam-tools.mjs
   4  C:\Users\denni\PycharmProjects\Kira\app\api\pubguard\v2\scan\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.4-D Physical Migration Plan.md
   4  C:\Users\denni\PycharmProjects\Kira\app\api\genome\query\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260725120000_kira_knowledge_chunks.sql
   4  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260805020000_drive_documents.sql
   4  C:\Users\denni\PycharmProjects\Kira\lib\connectors\status.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260725120000_kira_knowledge_chunks.sql
   4  C:\Users\denni\PycharmProjects\Kira\app\api\kira\knowledge\[id]\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\swarm\coordinator.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260805020000_drive_documents.sql
   4  C:\Users\denni\PycharmProjects\Kira\lib\kira\memory-contract.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\valuation\claim\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260725160000_kira_tasks.sql
   4  C:\Users\denni\PycharmProjects\Kira\app\api\kira\chat\history\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260725160000_kira_tasks.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\pubguard\v2\scan\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\onboarding\complete\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\supabase\archive\add_conversation_messages.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260725160000_kira_tasks.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\entity-sweep.ts
   4  C:\Users\denni\PycharmProjects\Kira\app\api\kira\create\one-agent-per-owner.test.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\archive\add_conversation_messages.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\valuation\claim\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\conversation\context\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\scripts\purge-trial-agents.mjs
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\pubguard\v2\scan\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\genome\redact\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\connectors\status.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725120000_kira_knowledge_chunks.sql
   4  C:\Users\denni\PycharmProjects\Kira\docs\KIRA_COMPONENT_INTERFACE.md
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\valuation\snapshots.ts
   3  C:\Users\denni\PycharmProjects\Kira\components\KiraVoiceWidget.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260724000000_business_valuations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\pubguard\supabase.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\pubguard\supabase.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\tools\conversation-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\components\genome-knowledge\GenomeKnowledgeDashboard.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\components\ReferFriend.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801010000_kira_refusals.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\file_manual\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\types.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\uid-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\look_up_financials\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\knowledge\KnowledgeManager.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260720200000_client_profiles.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802030000_kira_fact_confirmations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reengagement-emails\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\components\KiraShapeSection.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\setup\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260720200000_client_profiles.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260201100000_pubguard_user_types.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\components\KiraVoiceWidget.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260720200000_client_profiles.sql
   3  C:\Users\denni\PycharmProjects\Kira\lib\kira\confirm.test.ts
   3  C:\Users\denni\PycharmProjects\Kira\lib\kira\capability-sweep.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\LLD.md
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\types.ts
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260829140000_p24e_safe_cleanup.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\components\ReferFriend.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\components\KiraVoiceWidget.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\tools\conversation-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\kira\conversation\context\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260201100000_pubguard_user_types.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\search_drive\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\types.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\file_manual\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\cron\reengagement-emails\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\lib\kira\types.ts
   3  C:\Users\denni\PycharmProjects\Kira\scripts\reprovision-kira-agents.mjs
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\tools\conversation-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\knowledge\[id]\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260801010000_kira_refusals.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\components\ReferFriend.tsx
   3  C:\Users\denni\PycharmProjects\Kira\app\setup\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\agent\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\dashboard\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827130000_fix_missing_organisations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\knowledge\KnowledgeManager.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\capability-sweep.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260201100000_pubguard_user_types.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\pubguard\supabase.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720200000_client_profiles.sql
   3  C:\Users\denni\PycharmProjects\Kira\lib\supabase\server.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\lookup_contact\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260804060000_recall_recency_and_exclude_none.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\knowledge\[id]\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\uid-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\supabase\server.ts
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260829080000_genome_entity_unique_per_org.sql
   3  C:\Users\denni\PycharmProjects\Kira\app\chat\transcript-persistence.test.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\setup\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\connectors\google-connect.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\knowledge\KnowledgeManager.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\knowledge\[id]\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260724000000_business_valuations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\look_up_financials\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\swarm\open-tasks.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\read_document\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\read_document\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\supabase\server.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\dashboard\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\refusal-sweep.ts
   3  C:\Users\denni\PycharmProjects\Kira\lib\connectors\google-connect.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\cron\reengagement-emails\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\genome\manual\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\BUILD_REGISTER.md
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260201100000_pubguard_user_types.sql
   3  C:\Users\denni\PycharmProjects\Kira\lib\kira\swarm\backfill.test.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\agent\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\dashboard\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\setup\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\split-genome-entity.mjs
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260724000000_business_valuations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260724000000_business_valuations.sql
   3  C:\Users\denni\PycharmProjects\Kira\app\api\genome\query\[area]\[entity]\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\reprovision-kira-agents.mjs
   3  C:\Users\denni\PycharmProjects\Kira\scripts\split-genome-entity.mjs
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\components\KiraVoiceWidget.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\agent\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\supabase\server.ts
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260804060000_recall_recency_and_exclude_none.sql
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260802030000_kira_fact_confirmations.sql
   3  C:\Users\denni\PycharmProjects\Kira\lib\pubguard\supabase.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\keep_document\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\genome\confirm\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\components\ReferFriend.tsx
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260726000000_introducer_channel.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GENOME_WRITE_BACK.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\verify-agent-fleet.mjs
   2  C:\Users\denni\PycharmProjects\Kira\app\drafts\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\HANDOFF_RESPONSE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\check-agent-names.mjs
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\refusal-sweep.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\admin\genome\reclassify\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\research-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-4 Kira Instance Separation Verification.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\pubguard\config.ts
   2  C:\Users\denni\PycharmProjects\Kira\components\TeamSectionClient.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\pubguard\config.ts
   2  C:\Users\denni\PycharmProjects\Kira\scripts\test-auth-context.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260720600000_fix_welcome_back_recall.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260725140000_welcome_back_newest_conversation.sql
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\area-agenda.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\CLAUDE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260727000000_welcome_back_includes_tool_saved_memories.sql
   2  C:\Users\denni\PycharmProjects\Kira\app\api\kira\ask\records-the-ask.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\scripts\reclassify-genome.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260726000000_introducer_channel.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\MIGRATION_PLAN_2026-05-19.md
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260802020000_park_memory_naming_other_entity.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\agent\complete\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\api\genome\next-questions\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\financials.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\CLAUDE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\onboard-tester.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260727000000_welcome_back_includes_tool_saved_memories.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260726000000_introducer_channel.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720000000_convai_canonical_reconcile.sql
   2  C:\Users\denni\PycharmProjects\Kira\components\AbsenceRecord.tsx
   2  C:\Users\denni\PycharmProjects\Kira\scripts\create-missing-agent.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725140000_welcome_back_newest_conversation.sql
   2  C:\Users\denni\PycharmProjects\Kira\app\api\admin\genome\reclassify\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\voice-agent-checks.ts
   2  C:\Users\denni\PycharmProjects\Kira\scripts\backfill-knowledge-chunks.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\MIGRATION_PLAN_2026-05-19.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\README.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\refusal-sweep.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\chat\start\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\agent\complete\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\text-tools.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260720600000_fix_welcome_back_recall.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\LLD.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\chat\start\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\admin\exec-reprovision.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\billing\beta-codes.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\api\genome\quality\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\docs\SUPABASE_API_KEY_MODEL_MIGRATION_VALIDATION.md
   2  C:\Users\denni\PycharmProjects\Kira\app\team\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\lib\email\unanswered-request.ts
   2  C:\Users\denni\PycharmProjects\Kira\docs\MIGRATION_PLAN_2026-05-19.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\LLD.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260720000000_convai_canonical_reconcile.sql
   2  C:\Users\denni\PycharmProjects\Kira\app\knowledge\KnowledgeManager.tsx
   2  C:\Users\denni\PycharmProjects\Kira\README.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260720600000_fix_welcome_back_recall.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\swarm\backfill.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\components\genome-knowledge\AreaKnowledgeDetail.tsx
   2  C:\Users\denni\PycharmProjects\Kira\HANDOFF_RESPONSE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260720000000_convai_canonical_reconcile.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\research-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\README.md
   2  C:\Users\denni\PycharmProjects\Kira\scripts\check-agent-names.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\text-tools.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\financials.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\confirm.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\admin\exec-reprovision.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802020000_park_memory_naming_other_entity.sql
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830170000_kira_agents_unique_constraint.sql
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260727000000_welcome_back_includes_tool_saved_memories.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\research-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\elevenlabs\tools\conversation-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\scripts\find-user-agents.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\README.md
   2  C:\Users\denni\PycharmProjects\Kira\app\pubguard\config.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\research_organisation\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260726000000_introducer_channel.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\HANDOFF_RESPONSE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\elevenlabs\tools\conversation-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\backfill-knowledge-chunks.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\admin\exec-reprovision.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\admin\exec-reprovision.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\backfill-knowledge-chunks.mjs
   2  C:\Users\denni\PycharmProjects\Kira\app\api\kira\ask\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260727000000_welcome_back_includes_tool_saved_memories.sql
   2  C:\Users\denni\PycharmProjects\Kira\docs\SMALL_WIN_AUDIT_2026-09-01.md
   2  C:\Users\denni\PycharmProjects\Kira\app\admin\(panel)\exec\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\lib\elevenlabs\tools\conversation-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\reclassify-genome.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\chat\start\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\elevenlabs\tools\conversation-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\api\genome\conflicts\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260720000000_convai_canonical_reconcile.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\admin\(panel)\exec\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260725140000_welcome_back_newest_conversation.sql
   2  C:\Users\denni\PycharmProjects\Kira\app\api\genome\gaps\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\CLAUDE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\CLAUDE.md
   2  C:\Users\denni\PycharmProjects\Kira\docs\GENOME_WRITE_BACK.md
   2  C:\Users\denni\PycharmProjects\Kira\app\api\kira\draft\create\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260725140000_welcome_back_newest_conversation.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\MIGRATION_PLAN_2026-05-19.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\backfill-knowledge-chunks.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\HANDOFF_RESPONSE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\agent\complete\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\knowledge\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\pubguard\config.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720600000_fix_welcome_back_recall.sql
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\research-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260816130000_genome_access_log.sql
   2  C:\Users\denni\PycharmProjects\Kira\scripts\onboard-tester.mjs
   2  C:\Users\denni\PycharmProjects\Kira\scripts\verify-agent-fleet.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\api\members\invite\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\jina\reranker.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\business-identity\index.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\check_organisations.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\REUSE_AUDIT.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260725000000_loi_commitments.sql
   1  C:\Users\denni\PycharmProjects\Kira\scripts\rebind-post-call-webhook.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\VOICE_MEMORY_CANONICAL_FIX_SCOPE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\absences\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\MIGRATION_PLAN_2026-05-19.json
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\provision-discovery-agent.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\setup\drive\actions.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\keep-document.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\keep-document.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260731090000_business_identity.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\HANDOFF_2026-08-06_CONCURRENT_SESSION.md
   1  C:\Users\denni\PycharmProjects\Kira\scripts\send-apology.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\api\genome\share\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\voice-audit\2026-07-20\kira.md
   1  C:\Users\denni\PycharmProjects\Kira\scripts\record-beta-evidence.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\discovery.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260120000000_reconcile_kira_agents_for_convai.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\talk\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260802210000_genome_nine_areas.sql
   1  C:\Users\denni\PycharmProjects\Kira\.tmp-prompts.mjs
   1  C:\Users\denni\PycharmProjects\Kira\components\UserShell.tsx
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md
   1  C:\Users\denni\PycharmProjects\Kira\docs\Kira-Coding - Canonical Architecture, Small-Win Flow & Implementation Conformance Audit.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\valuation\mine\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\admin\(panel)\trust\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\app\api\genome\export\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\REUSE_AUDIT.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260728160000_genome_sections.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\pubguard\v2\types.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260725000000_loi_commitments.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\webhooks\save_message\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\genome-knowledge\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260725000000_loi_commitments.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\cron\trial-ending\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\text-tools.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\cron\trial-ending\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260728160000_genome_sections.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\loi\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\docs\HLD.md
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\area-agenda.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\valuation\mine\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\discovery.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\backfill-kira-conversations.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\VOICE_MEMORY_CANONICAL_FIX_SCOPE.md
   1  C:\Users\denni\PycharmProjects\Kira\app\talk\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\app\api\genome\plan\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260731090000_business_identity.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\pubguard\v2\types.ts
   1  C:\Users\denni\PycharmProjects\Kira\docs\DECISIONS_PRACTICE_INTELLIGENCE.md
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\save-memory-dedupe.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\BROKER_CHANNEL_BUILD_STATE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\trial-ending\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\business-identity\index.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\VOICE_MEMORY_CANONICAL_FIX_SCOPE.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\cron\trial-ending\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801180000_kira_memory_parked_entity.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\business-identity\business-identity.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Architectural Test Suite.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\PROJECT_STATUS.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\voice\telemetry\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\api\beta\redeem\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\.temp\linked-project.json
   1  C:\Users\denni\PycharmProjects\Kira\app\requests\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\MIGRATION_PLAN_2026-05-19.json
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260728160000_genome_sections.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\setup\drive\actions.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\loi\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\api\pubguard\v2\types.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\memory-entity.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\scripts\provision-discovery-agent.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\settings\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\provision-discovery-agent.mjs
   1  C:\Users\denni\PycharmProjects\Kira\docs\MIGRATION_PLAN_2026-05-19.json
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-1D API Route Rebinding Verification.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\REUSE_AUDIT.md
   1  C:\Users\denni\PycharmProjects\Kira\docs\VOICE_MEMORY_CANONICAL_FIX_SCOPE.md
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA Coding Instructions - P0.7 Schema Archaeology Before Migration Changes.md
   1  C:\Users\denni\PycharmProjects\Kira\docs\HANDOFF_2026-08-06_CONCURRENT_SESSION.md
   1  C:\Users\denni\PycharmProjects\Kira\scripts\.tmp-prompts.mjs
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260120000000_reconcile_kira_agents_for_convai.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260120000000_reconcile_kira_agents_for_convai.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\BROKER_CHANNEL_BUILD_STATE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725000000_loi_commitments.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\MIGRATION_PLAN_2026-05-19.json
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260801180000_kira_memory_parked_entity.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\save_message\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\scripts\send-owner-invite.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\backfill-kira-conversations.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\api\members\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\tools\conversation-tools.ts
   1  C:\Users\denni\PycharmProjects\Kira\scripts\backfill-kira-conversations.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\talk\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260728160000_genome_sections.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802050000_kira_memory_privacy_classification.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\talk\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\voice-audit\2026-07-20\kira.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\genome\query\[area]\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\my-genome\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\docs\BROKER_CHANNEL_BUILD_STATE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\pubguard\v2\types.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\genome\export\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1 Production Architecture Derivation.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\post-call\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\refusal.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\provision-discovery-agent.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\jina\reranker.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\refusal.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\save_message\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802210000_genome_nine_areas.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\BROKER_CHANNEL_BUILD_STATE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260120000000_reconcile_kira_agents_for_convai.sql
   1  C:\Users\denni\PycharmProjects\Kira\voice-audit\2026-07-20\kira.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\loi\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\voice-audit\2026-07-20\kira.md
   1  C:\Users\denni\PycharmProjects\Kira\app\my-genome\[area]\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\jina\reranker.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260802050000_kira_memory_privacy_classification.sql
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260818090000_voice_connect_events.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\loi\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\webhooks\save_message\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\trust\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\app\genome-knowledge\[area]\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\lib\jina\reranker.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\backfill-kira-conversations.mjs
   1  C:\Users\denni\PycharmProjects\Kira\docs\REUSE_AUDIT.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\kira\discovery\start\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\business-identity\business-identity.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\discovery.ts

TOTAL unique files: 737

The manifest captures both legacy (`user_id`) and canonical (`organisation_id`, `tenantId`) identity tokens. Let me read the repo's own classification documents to stay consistent with its taxonomy.

$ pwsh -Command "Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira' -Recurse -Depth 1 -Filter 'P2.4-A_*' -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }"
.FullName: The term '.FullName' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.

The `$_` is consistently stripped by the tool layer. I'll avoid inline `$_` and rely on script files. Let me read the classification doc and the physical target schema doc via direct paths.

✱ Glob "P2.4*.md" 4 matches
→ Read P2.4-A_CLASSIFICATION.md
→ Read P2.4-A_CLASSIFICATION.md [offset=14]
→ Read P2.4-A_CLASSIFICATION.md [offset=28]

← Write C:/Users/denni/AppData/Local/Temp/opencode/org-columns.ps1
Wrote file successfully.

This is an enormous but well-defined audit. Let me establish the ground truth: which tables have been converted to `organisation_id` in the main repo.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\org-columns.ps1"
=== ALTER/CREATE tables gaining organisation_id (MAIN repo) ===
20260826100000_p05_canonical_identity.sql:5: -- organisation_id to knowledge tables, create write triggers.
20260826100000_p05_canonical_identity.sql:24: organisation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
20260826100000_p05_canonical_identity.sql:68: canonical_organisation_id UUID NOT NULL,
20260826100000_p05_canonical_identity.sql:87: canonical_organisation_id UUID NOT NULL,
20260826100000_p05_canonical_identity.sql:93: PRIMARY KEY (legacy_user_id, canonical_person_id, canonical_organisation_id)
20260826100000_p05_canonical_identity.sql:103: -- ON CONFLICT DO NOTHING handles both PK (organisation_id) and unique (abn) conflicts
20260826100000_p05_canonical_identity.sql:104: INSERT INTO organisations (organisation_id, legal_name, trading_name, abn, entity_type, industry, status, created_at)
20260826100000_p05_canonical_identity.sql:144: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826100000_p05_canonical_identity.sql:159: INSERT INTO legacy_identity_map (legacy_user_id, canonical_person_id, canonical_organisation_id, resolution_method, confidence, resolved_at, resolved_by, notes)
20260826100000_p05_canonical_identity.sql:172: -- STEP 1A.3: Add organisation_id FK to knowledge tables
20260826100000_p05_canonical_identity.sql:176: ALTER TABLE genome_entities ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:177: CREATE INDEX IF NOT EXISTS idx_genome_entities_organisation_id ON genome_entities(organisation_id);
20260826100000_p05_canonical_identity.sql:180: ALTER TABLE genome_facts ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:181: CREATE INDEX IF NOT EXISTS idx_genome_facts_organisation_id ON genome_facts(organisation_id);
20260826100000_p05_canonical_identity.sql:184: ALTER TABLE genome_relationships ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:185: CREATE INDEX IF NOT EXISTS idx_genome_relationships_organisation_id ON genome_relationships(organisation_id);
20260826100000_p05_canonical_identity.sql:188: ALTER TABLE genome_events ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:189: CREATE INDEX IF NOT EXISTS idx_genome_events_organisation_id ON genome_events(organisation_id);
20260826100000_p05_canonical_identity.sql:192: ALTER TABLE kira_memory ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:193: CREATE INDEX IF NOT EXISTS idx_kira_memory_organisation_id ON kira_memory(organisation_id);
20260826100000_p05_canonical_identity.sql:196: ALTER TABLE kira_knowledge ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:197: CREATE INDEX IF NOT EXISTS idx_kira_knowledge_organisation_id ON kira_knowledge(organisation_id);
20260826100000_p05_canonical_identity.sql:200: ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:201: CREATE INDEX IF NOT EXISTS idx_conversations_organisation_id ON conversations(organisation_id);
20260826100000_p05_canonical_identity.sql:204: ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:205: CREATE INDEX IF NOT EXISTS idx_conversation_messages_organisation_id ON conversation_messages(organisation_id);
20260826100000_p05_canonical_identity.sql:208: ALTER TABLE kira_agents ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:209: CREATE INDEX IF NOT EXISTS idx_kira_agents_organisation_id ON kira_agents(organisation_id);
20260826100000_p05_canonical_identity.sql:211: -- STEP 1A.4: Backfill organisation_id on knowledge tables
20260826100000_p05_canonical_identity.sql:215: UPDATE genome_entities SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:216: UPDATE genome_facts SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:217: UPDATE genome_relationships SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:218: UPDATE genome_events SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:219: UPDATE kira_memory SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:220: UPDATE kira_knowledge SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:221: UPDATE conversations SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:222: UPDATE conversation_messages SET organisation_id = (SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id) WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:223: UPDATE kira_agents SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:225: -- STEP 1A.5: Create triggers to sync organisation_id on write
20260826100000_p05_canonical_identity.sql:228: -- Function to get organisation_id from user_id (Bridge phase: 1:1 mapping)
20260826100000_p05_canonical_identity.sql:229: CREATE OR REPLACE FUNCTION get_organisation_id_from_user(p_user_id UUID)
20260826100000_p05_canonical_identity.sql:236: -- Trigger: auto-populate organisation_id on genome_entities insert
20260826100000_p05_canonical_identity.sql:237: CREATE OR REPLACE FUNCTION sync_organisation_id_genome_entities()
20260826100000_p05_canonical_identity.sql:240: IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
20260826100000_p05_canonical_identity.sql:241: NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
20260826100000_p05_canonical_identity.sql:247: CREATE TRIGGER trg_genome_entities_sync_organisation_id
20260826100000_p05_canonical_identity.sql:250: EXECUTE FUNCTION sync_organisation_id_genome_entities();
20260826100000_p05_canonical_identity.sql:252: -- Trigger: auto-populate organisation_id on genome_facts insert
20260826100000_p05_canonical_identity.sql:253: CREATE OR REPLACE FUNCTION sync_organisation_id_genome_facts()
20260826100000_p05_canonical_identity.sql:256: IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
20260826100000_p05_canonical_identity.sql:257: NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
20260826100000_p05_canonical_identity.sql:263: CREATE TRIGGER trg_genome_facts_sync_organisation_id
20260826100000_p05_canonical_identity.sql:266: EXECUTE FUNCTION sync_organisation_id_genome_facts();
20260826100000_p05_canonical_identity.sql:268: -- Trigger: auto-populate organisation_id on kira_memory insert
20260826100000_p05_canonical_identity.sql:269: CREATE OR REPLACE FUNCTION sync_organisation_id_kira_memory()
20260826100000_p05_canonical_identity.sql:272: IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
20260826100000_p05_canonical_identity.sql:273: NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
20260826100000_p05_canonical_identity.sql:279: CREATE TRIGGER trg_kira_memory_sync_organisation_id
20260826100000_p05_canonical_identity.sql:282: EXECUTE FUNCTION sync_organisation_id_kira_memory();
20260826100000_p05_canonical_identity.sql:284: -- Trigger: auto-populate organisation_id on conversations insert
20260826100000_p05_canonical_identity.sql:285: CREATE OR REPLACE FUNCTION sync_organisation_id_conversations()
20260826100000_p05_canonical_identity.sql:288: IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
20260826100000_p05_canonical_identity.sql:289: NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
20260826100000_p05_canonical_identity.sql:295: CREATE TRIGGER trg_conversations_sync_organisation_id
20260826100000_p05_canonical_identity.sql:298: EXECUTE FUNCTION sync_organisation_id_conversations();
20260826100000_p05_canonical_identity.sql:306: -- Verification 1: No knowledge rows missing organisation_id
20260826100000_p05_canonical_identity.sql:308: -- SELECT 'genome_entities' as table_name, COUNT(*) as missing FROM genome_entities WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:310: -- SELECT 'genome_facts', COUNT(*) FROM genome_facts WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:312: -- SELECT 'genome_relationships', COUNT(*) FROM genome_relationships WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:314: -- SELECT 'genome_events', COUNT(*) FROM genome_events WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:316: -- SELECT 'kira_memory', COUNT(*) FROM kira_memory WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:318: -- SELECT 'kira_knowledge', COUNT(*) FROM kira_knowledge WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:320: -- SELECT 'conversations', COUNT(*) FROM conversations WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:322: -- SELECT 'kira_agents', COUNT(*) FROM kira_agents WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:324: -- Verification 2: No knowledge rows with invalid organisation_id
20260826100000_p05_canonical_identity.sql:326: -- SELECT 'genome_entities' as table_name, COUNT(*) as invalid FROM genome_entities WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)
20260826100000_p05_canonical_identity.sql:328: -- SELECT 'genome_facts', COUNT(*) FROM genome_facts WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)
20260826100000_p05_canonical_identity.sql:330: -- SELECT 'kira_memory', COUNT(*) FROM kira_memory WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations);
20260826100000_p05_canonical_identity.sql:334: -- SELECT u.id, o.organisation_id, p.person_id FROM users u LEFT JOIN organisations o ON o.organisation_id = u.id LEFT JOIN persons p ON p.person_id = u.id WHERE o.organisation_id IS NULL OR p.person_id IS NULL;
20260826110000_p05_membership_tenant_context.sql:22: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826110000_p05_membership_tenant_context.sql:30: UNIQUE (organisation_id, person_id, role)
20260826110000_p05_membership_tenant_context.sql:37: CREATE INDEX IF NOT EXISTS idx_organisation_memberships_organisation_id ON organisation_memberships(organisation_id);
20260826110000_p05_membership_tenant_context.sql:45: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826110000_p05_membership_tenant_context.sql:57: CREATE INDEX IF NOT EXISTS idx_ownership_periods_organisation_id ON ownership_periods(organisation_id);
20260826110000_p05_membership_tenant_context.sql:69: INSERT INTO organisation_memberships (organisation_id, person_id, role, status, valid_from, created_at)
20260826110000_p05_membership_tenant_context.sql:79: ON CONFLICT (organisation_id, person_id, role) DO NOTHING;
20260826110000_p05_membership_tenant_context.sql:83: INSERT INTO organisation_memberships (organisation_id, person_id, role, status, valid_from, created_at)
20260826110000_p05_membership_tenant_context.sql:95: WHERE om.organisation_id = u.id AND om.person_id = u.id AND om.role = 'owner'
20260826110000_p05_membership_tenant_context.sql:97: ON CONFLICT (organisation_id, person_id, role) DO NOTHING;
20260826110000_p05_membership_tenant_context.sql:102: INSERT INTO organisation_memberships (organisation_id, person_id, role, status, valid_from, created_at)
20260826110000_p05_membership_tenant_context.sql:114: ON CONFLICT (organisation_id, person_id, role) DO NOTHING;
20260826110000_p05_membership_tenant_context.sql:120: INSERT INTO ownership_periods (organisation_id, person_id, status, valid_from, created_at)
20260826110000_p05_membership_tenant_context.sql:138: -- This function resolves organisation_id from the current auth context.
20260826110000_p05_membership_tenant_context.sql:144: CREATE OR REPLACE FUNCTION resolve_organisation_id_from_auth()
20260826110000_p05_membership_tenant_context.sql:149: v_organisation_id UUID;
20260826110000_p05_membership_tenant_context.sql:180: SELECT organisation_id INTO v_organisation_id
20260826110000_p05_membership_tenant_context.sql:196: RETURN v_organisation_id;
20260826110000_p05_membership_tenant_context.sql:200: COMMENT ON FUNCTION resolve_organisation_id_from_auth() IS 'Resolve organisation_id from auth context using membership. NOT yet used by RLS/API (authority transfer in 1C/1D). P0.5 Step 1B.';
20260826110000_p05_membership_tenant_context.sql:207: p_organisation_id UUID,
20260826110000_p05_membership_tenant_context.sql:215: AND organisation_id = p_organisation_id
20260826110000_p05_membership_tenant_context.sql:227: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826110000_p05_membership_tenant_context.sql:243: JOIN organisation_memberships om ON om.organisation_id = u.id AND om.person_id = u.id;
20260826110000_p05_membership_tenant_context.sql:257: -- WHERE om.organisation_id NOT IN (SELECT organisation_id FROM organisations)
20260826110000_p05_membership_tenant_context.sql:262: -- SELECT organisation_id, person_id, role, COUNT(*) as cnt
20260826110000_p05_membership_tenant_context.sql:264: -- GROUP BY organisation_id, person_id, role HAVING COUNT(*) > 1;
20260826110000_p05_membership_tenant_context.sql:272: --     WHERE om.organisation_id = u.id AND om.person_id = u.id AND om.role = 'owner'
20260826110000_p05_membership_tenant_context.sql:277: -- SELECT resolve_organisation_id_from_auth();
20260826110000_p05_membership_tenant_context.sql:285: -- Verification 7: organisation_id column exists on all knowledge tables
20260826110000_p05_membership_tenant_context.sql:286: -- Expected: all tables have organisation_id column
20260826110000_p05_membership_tenant_context.sql:288: -- WHERE column_name = 'organisation_id'
20260826120000_p05_rls_authority_transfer.sql:5: -- canonical organisation_id-based policies. Every protected organisational
20260826120000_p05_rls_authority_transfer.sql:30: CREATE OR REPLACE FUNCTION auth_user_has_organisation_access(p_organisation_id UUID)
20260826120000_p05_rls_authority_transfer.sql:68: AND organisation_id = p_organisation_id
20260826120000_p05_rls_authority_transfer.sql:80: -- STEP 1C.2: Create helper function to get current user's organisation_id
20260826120000_p05_rls_authority_transfer.sql:83: CREATE OR REPLACE FUNCTION auth_user_organisation_id()
20260826120000_p05_rls_authority_transfer.sql:86: RETURN resolve_organisation_id_from_auth();
20260826120000_p05_rls_authority_transfer.sql:90: COMMENT ON FUNCTION auth_user_organisation_id() IS 'Get organisation_id for current auth user via membership. P0.5 Step 1C.';
20260826120000_p05_rls_authority_transfer.sql:96: -- These are being replaced with organisation_id-based policies.
20260826120000_p05_rls_authority_transfer.sql:197: -- STEP 1C.4: Create canonical organisation_id-based RLS policies
20260826120000_p05_rls_authority_transfer.sql:203: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:209: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:215: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:221: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:227: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:233: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:239: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:246: (SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id)
20260826120000_p05_rls_authority_transfer.sql:253: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:281: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:296: WHERE auth_user_has_organisation_access(om.organisation_id)
20260826120000_p05_rls_authority_transfer.sql:311: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:319: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826120000_p05_rls_authority_transfer.sql:329: 'RLS authority transferred from user_id to organisation_id via membership',
20260826130000_p05_api_rebinding.sql:12: --   - API routes resolve organisation_id via membership, not users.id
20260826130000_p05_api_rebinding.sql:13: --   - organisation_id is the canonical tenant key for all data access
20260826130000_p05_api_rebinding.sql:22: -- auth user: person_id, organisation_id, role, and membership details.
20260826130000_p05_api_rebinding.sql:27: organisation_id UUID,
20260826130000_p05_api_rebinding.sql:69: om.organisation_id,
20260826130000_p05_api_rebinding.sql:92: COMMENT ON FUNCTION resolve_organisational_context() IS 'Resolve full organisational context for current auth user. Returns person_id, organisation_id, role, membership details. P0.5 Step 1D.';
20260826130000_p05_api_rebinding.sql:94: -- STEP 1D.2: Create function to get user_id from organisation_id (backward compat)
20260826130000_p05_api_rebinding.sql:97: -- During transition, some code may need to resolve user_id from organisation_id.
20260826130000_p05_api_rebinding.sql:100: CREATE OR REPLACE FUNCTION resolve_user_id_from_organisation(p_organisation_id UUID)
20260826130000_p05_api_rebinding.sql:109: WHERE om.organisation_id = p_organisation_id
20260826130000_p05_api_rebinding.sql:118: COMMENT ON FUNCTION resolve_user_id_from_organisation(UUID) IS 'Resolve user_id from organisation_id (backward compat during bridge). Will need update when UUID reuse ends. P0.5 Step 1D.';
20260826130000_p05_api_rebinding.sql:123: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826140000_p05_consultant_relationship.sql:52: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826140000_p05_consultant_relationship.sql:64: CREATE INDEX IF NOT EXISTS idx_consultant_relationships_organisation_id ON consultant_relationships(organisation_id);
20260826140000_p05_consultant_relationship.sql:66: CREATE UNIQUE INDEX IF NOT EXISTS idx_consultant_relationships_active ON consultant_relationships(consultant_id, organisation_id) WHERE status = 'active';
20260826140000_p05_consultant_relationship.sql:78: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826140000_p05_consultant_relationship.sql:89: CREATE INDEX IF NOT EXISTS idx_consultant_history_organisation_id ON consultant_history(organisation_id);
20260826140000_p05_consultant_relationship.sql:107: p_organisation_id UUID
20260826140000_p05_consultant_relationship.sql:114: AND organisation_id = p_organisation_id
20260826140000_p05_consultant_relationship.sql:124: CREATE OR REPLACE FUNCTION get_organisation_consultants(p_organisation_id UUID)
20260826140000_p05_consultant_relationship.sql:143: WHERE cr.organisation_id = p_organisation_id
20260826140000_p05_consultant_relationship.sql:180: INSERT INTO consultant_history (relationship_id, consultant_id, organisation_id, action, performed_by, reason)
20260826140000_p05_consultant_relationship.sql:181: VALUES (p_relationship_id, v_relationship.consultant_id, v_relationship.organisation_id, 'ended', p_performed_by, p_reason);
20260826140000_p05_consultant_relationship.sql:192: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826150000_p05_engagement_model.sql:25: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826150000_p05_engagement_model.sql:39: CREATE INDEX IF NOT EXISTS idx_engagements_organisation_id ON engagements(organisation_id);
20260826150000_p05_engagement_model.sql:101: CREATE OR REPLACE FUNCTION get_organisation_engagements(p_organisation_id UUID)
20260826150000_p05_engagement_model.sql:122: WHERE e.organisation_id = p_organisation_id
20260826150000_p05_engagement_model.sql:169: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826160000_p05_consultant_engagement_access.sql:47: WHERE auth_user_has_organisation_access(cr.organisation_id)
20260826160000_p05_consultant_engagement_access.sql:58: auth_user_has_organisation_access(organisation_id)
20260826160000_p05_consultant_engagement_access.sql:81: auth_user_has_organisation_access(organisation_id)
20260826160000_p05_consultant_engagement_access.sql:90: auth_user_has_organisation_access(organisation_id)
20260826160000_p05_consultant_engagement_access.sql:117: WHERE auth_user_has_organisation_access(e.organisation_id)
20260826160000_p05_consultant_engagement_access.sql:145: WHERE auth_user_has_organisation_access(e.organisation_id)
20260826160000_p05_consultant_engagement_access.sql:152: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826170000_p05_commercial_structures.sql:48: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826170000_p05_commercial_structures.sql:62: CREATE INDEX IF NOT EXISTS idx_subscriptions_organisation_id ON subscriptions(organisation_id);
20260826170000_p05_commercial_structures.sql:64: CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(organisation_id) WHERE status IN ('trial', 'active');
20260826170000_p05_commercial_structures.sql:73: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826170000_p05_commercial_structures.sql:87: CREATE INDEX IF NOT EXISTS idx_commercial_arrangements_organisation_id ON commercial_arrangements(organisation_id);
20260826170000_p05_commercial_structures.sql:130: INSERT INTO subscriptions (organisation_id, tier_id, status, valid_from, created_at)
20260826170000_p05_commercial_structures.sql:168: CREATE OR REPLACE FUNCTION get_organisation_subscription(p_organisation_id UUID)
20260826170000_p05_commercial_structures.sql:188: WHERE s.organisation_id = p_organisation_id
20260826170000_p05_commercial_structures.sql:198: CREATE OR REPLACE FUNCTION is_subscription_active(p_organisation_id UUID)
20260826170000_p05_commercial_structures.sql:203: WHERE organisation_id = p_organisation_id
20260826170000_p05_commercial_structures.sql:214: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826180000_p05_kira_instance_separation.sql:24: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826180000_p05_kira_instance_separation.sql:35: CREATE INDEX IF NOT EXISTS idx_kira_instances_organisation_id ON kira_instances(organisation_id);
20260826180000_p05_kira_instance_separation.sql:37: CREATE UNIQUE INDEX IF NOT EXISTS idx_kira_instances_active ON kira_instances(organisation_id, journey_type) WHERE status = 'active';
20260826180000_p05_kira_instance_separation.sql:60: INSERT INTO kira_instances (instance_id, organisation_id, instance_name, journey_type, status, created_at)
20260826180000_p05_kira_instance_separation.sql:63: ka.organisation_id,
20260826180000_p05_kira_instance_separation.sql:69: WHERE ka.organisation_id IS NOT NULL
20260826180000_p05_kira_instance_separation.sql:77: p_organisation_id UUID,
20260826180000_p05_kira_instance_separation.sql:96: WHERE ki.organisation_id = p_organisation_id
20260826180000_p05_kira_instance_separation.sql:106: CREATE OR REPLACE FUNCTION get_organisation_kira_instances(p_organisation_id UUID)
20260826180000_p05_kira_instance_separation.sql:123: WHERE ki.organisation_id = p_organisation_id
20260826180000_p05_kira_instance_separation.sql:133: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826180000_p05_kira_instance_separation.sql:159: -- Expected: count matches kira_agents with organisation_id
20260826180000_p05_kira_instance_separation.sql:161: -- SELECT COUNT(*) FROM kira_agents WHERE organisation_id IS NOT NULL;
20260826190000_p05_decision_lifecycle.sql:24: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826190000_p05_decision_lifecycle.sql:39: CREATE INDEX IF NOT EXISTS idx_decisions_organisation_id ON decisions(organisation_id);
20260826190000_p05_decision_lifecycle.sql:65: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826190000_p05_decision_lifecycle.sql:82: CREATE INDEX IF NOT EXISTS idx_actions_organisation_id ON actions(organisation_id);
20260826190000_p05_decision_lifecycle.sql:92: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826190000_p05_decision_lifecycle.sql:106: CREATE INDEX IF NOT EXISTS idx_outcomes_organisation_id ON outcomes(organisation_id);
20260826190000_p05_decision_lifecycle.sql:115: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826190000_p05_decision_lifecycle.sql:130: CREATE INDEX IF NOT EXISTS idx_learnings_organisation_id ON learnings(organisation_id);
20260826190000_p05_decision_lifecycle.sql:139: CREATE OR REPLACE FUNCTION get_organisation_decisions(p_organisation_id UUID)
20260826190000_p05_decision_lifecycle.sql:158: WHERE d.organisation_id = p_organisation_id
20260826190000_p05_decision_lifecycle.sql:167: CREATE OR REPLACE FUNCTION get_organisation_learnings(p_organisation_id UUID)
20260826190000_p05_decision_lifecycle.sql:184: WHERE l.organisation_id = p_organisation_id
20260826190000_p05_decision_lifecycle.sql:195: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826190000_p05_decision_lifecycle.sql:220: -- Verification 2: All tables have organisation_id FK
20260826200000_p05_legacy_authority_retirement.sql:17: DROP TRIGGER IF EXISTS trg_genome_entities_sync_organisation_id ON genome_entities;
20260826200000_p05_legacy_authority_retirement.sql:18: DROP FUNCTION IF EXISTS sync_organisation_id_genome_entities();
20260826200000_p05_legacy_authority_retirement.sql:20: DROP TRIGGER IF EXISTS trg_genome_facts_sync_organisation_id ON genome_facts;
20260826200000_p05_legacy_authority_retirement.sql:21: DROP FUNCTION IF EXISTS sync_organisation_id_genome_facts();
20260826200000_p05_legacy_authority_retirement.sql:23: DROP TRIGGER IF EXISTS trg_kira_memory_sync_organisation_id ON kira_memory;
20260826200000_p05_legacy_authority_retirement.sql:24: DROP FUNCTION IF EXISTS sync_organisation_id_kira_memory();
20260826200000_p05_legacy_authority_retirement.sql:26: DROP TRIGGER IF EXISTS trg_conversations_sync_organisation_id ON conversations;
20260826200000_p05_legacy_authority_retirement.sql:27: DROP FUNCTION IF EXISTS sync_organisation_id_conversations();
20260826200000_p05_legacy_authority_retirement.sql:29: DROP FUNCTION IF EXISTS get_organisation_id_from_user(UUID);
20260826200000_p05_legacy_authority_retirement.sql:52: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:56: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:60: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:64: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:68: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:72: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:76: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:82: (SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id)
20260826200000_p05_legacy_authority_retirement.sql:88: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:117: WHERE tgname LIKE 'trg_%sync_organisation_id%'
20260826200000_p05_legacy_authority_retirement.sql:133: 'All knowledge tables have organisation_id column' as check_name,
20260826200000_p05_legacy_authority_retirement.sql:137: AND column_name = 'organisation_id'
20260826200000_p05_legacy_authority_retirement.sql:139: 'All 9 knowledge tables must have organisation_id' as details;
20260826200000_p05_legacy_authority_retirement.sql:166: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826200000_p05_legacy_authority_retirement.sql:188: -- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%sync_organisation_id%';
20260826210000_p07_knowledge_object_schema.sql:28: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826210000_p07_knowledge_object_schema.sql:90: CREATE INDEX IF NOT EXISTS idx_org_knowledge_organisation_id ON organisational_knowledge(organisation_id);
20260826210000_p07_knowledge_object_schema.sql:101: CREATE INDEX IF NOT EXISTS idx_org_knowledge_current ON organisational_knowledge(organisation_id, is_current, knowledge_type) WHERE is_current = TRUE;
20260826210000_p07_knowledge_object_schema.sql:126: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826210000_p07_knowledge_object_schema.sql:156: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826210000_p07_knowledge_object_schema.sql:163: WHERE auth_user_has_organisation_access(ok.organisation_id)
20260826210000_p07_knowledge_object_schema.sql:169: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826210000_p07_knowledge_object_schema.sql:176: p_organisation_id UUID,
20260826210000_p07_knowledge_object_schema.sql:205: WHERE ok.organisation_id = p_organisation_id
20260826210000_p07_knowledge_object_schema.sql:216: p_organisation_id UUID,
20260826210000_p07_knowledge_object_schema.sql:244: WHERE ok.organisation_id = p_organisation_id
20260826210000_p07_knowledge_object_schema.sql:286: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826220000_p07_evidence_schema.sql:25: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826220000_p07_evidence_schema.sql:60: CREATE INDEX IF NOT EXISTS idx_evidence_organisation_id ON evidence(organisation_id);
20260826220000_p07_evidence_schema.sql:94: ok.organisation_id,
20260826220000_p07_evidence_schema.sql:134: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826220000_p07_evidence_schema.sql:141: WHERE auth_user_has_organisation_access(ok.organisation_id)
20260826220000_p07_evidence_schema.sql:150: p_organisation_id UUID,
20260826220000_p07_evidence_schema.sql:177: WHERE e.organisation_id = p_organisation_id
20260826220000_p07_evidence_schema.sql:207: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826230000_p07_knowledge_promotion_pipeline.sql:26: organisation_id UUID REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826230000_p07_knowledge_promotion_pipeline.sql:39: UNIQUE(organisation_id, knowledge_type, evidence_type)
20260826230000_p07_knowledge_promotion_pipeline.sql:49: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826230000_p07_knowledge_promotion_pipeline.sql:93: CREATE INDEX IF NOT EXISTS idx_promotion_candidates_organisation_id ON promotion_candidates(organisation_id);
20260826230000_p07_knowledge_promotion_pipeline.sql:102: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826230000_p07_knowledge_promotion_pipeline.sql:117: CREATE INDEX IF NOT EXISTS idx_promotion_log_organisation_id ON promotion_log(organisation_id);
20260826230000_p07_knowledge_promotion_pipeline.sql:124: p_organisation_id UUID,
20260826230000_p07_knowledge_promotion_pipeline.sql:147: WHERE ok.organisation_id = p_organisation_id
20260826230000_p07_knowledge_promotion_pipeline.sql:163: p_organisation_id UUID,
20260826230000_p07_knowledge_promotion_pipeline.sql:181: WHERE ok.organisation_id = p_organisation_id
20260826230000_p07_knowledge_promotion_pipeline.sql:212: organisation_id,
20260826230000_p07_knowledge_promotion_pipeline.sql:228: v_candidate.organisation_id,
20260826230000_p07_knowledge_promotion_pipeline.sql:259: INSERT INTO promotion_log (organisation_id, candidate_id, knowledge_id, action, performed_by)
20260826230000_p07_knowledge_promotion_pipeline.sql:260: VALUES (v_candidate.organisation_id, p_candidate_id, v_new_knowledge_id, 'promoted', p_performed_by);
20260826230000_p07_knowledge_promotion_pipeline.sql:280: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826230000_p07_knowledge_promotion_pipeline.sql:284: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826230000_p07_knowledge_promotion_pipeline.sql:288: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826230000_p07_knowledge_promotion_pipeline.sql:293: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260827000000_p07_temporal_query_patterns.sql:21: p_organisation_id UUID,
20260827000000_p07_temporal_query_patterns.sql:54: WHERE ok.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:65: p_organisation_id UUID,
20260827000000_p07_temporal_query_patterns.sql:99: WHERE ok.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:163: p_organisation_id UUID
20260827000000_p07_temporal_query_patterns.sql:191: WHERE ok.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:205: p_organisation_id UUID
20260827000000_p07_temporal_query_patterns.sql:230: a.organisation_id = b.organisation_id
20260827000000_p07_temporal_query_patterns.sql:238: WHERE a.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:250: p_organisation_id UUID
20260827000000_p07_temporal_query_patterns.sql:274: WHERE ok.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:285: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260827010000_p07_existing_data_migration.sql:14: --      user_id -> organisation_id mapping exists.
20260827010000_p07_existing_data_migration.sql:16: --   6. Never use organisation_id = user_id as an assumed identity mapping.
20260827010000_p07_existing_data_migration.sql:82: --     organisations.organisation_id = users.id
20260827010000_p07_existing_data_migration.sql:97: organisation_id UUID NOT NULL
20260827010000_p07_existing_data_migration.sql:112: organisation_id
20260827010000_p07_existing_data_migration.sql:116: om.organisation_id
20260827010000_p07_existing_data_migration.sql:119: AND om.organisation_id IS NOT NULL
20260827010000_p07_existing_data_migration.sql:142: organisation_id
20260827010000_p07_existing_data_migration.sql:146: om.organisation_id
20260827010000_p07_existing_data_migration.sql:153: AND om.organisation_id IS NOT NULL
20260827010000_p07_existing_data_migration.sql:197: organisation_id,
20260827010000_p07_existing_data_migration.sql:211: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:254: WHERE ok.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:279: organisation_id,
20260827010000_p07_existing_data_migration.sql:293: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:340: WHERE ok.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:375: organisation_id,
20260827010000_p07_existing_data_migration.sql:387: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:493: ON e.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:498: ON ok.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:540: ON e.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:545: ON ok.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:575: organisation_id,
20260827010000_p07_existing_data_migration.sql:583: o.organisation_id,
20260827010000_p07_existing_data_migration.sql:611: WHERE pr.organisation_id = o.organisation_id
20260827010000_p07_existing_data_migration.sql:640: canonical_organisation_id,
20260827010000_p07_existing_data_migration.sql:651: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:680: canonical_organisation_id,
20260827010000_p07_existing_data_migration.sql:691: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:720: canonical_organisation_id,
20260827010000_p07_existing_data_migration.sql:731: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:839: ON o.organisation_id = ok.organisation_id
20260827010000_p07_existing_data_migration.sql:840: WHERE o.organisation_id IS NULL;
20260827010000_p07_existing_data_migration.sql:851: organisation_id,
20260827010000_p07_existing_data_migration.sql:860: organisation_id,
20260827020000_p07_verification_suite.sql:111: -- V-001.10: All knowledge tables have organisation_id FK
20260827020000_p07_verification_suite.sql:114: 'All knowledge tables have organisation_id FK' as requirement,
20260827020000_p07_verification_suite.sql:118: WHERE column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:123: WHERE column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:761: AND column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:768: AND column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:929: (SELECT COUNT(*) FROM genome_entities WHERE organisation_id IS NOT NULL) as expected,
20260827020000_p07_verification_suite.sql:940: (SELECT COUNT(*) FROM genome_facts WHERE organisation_id IS NOT NULL) as expected,
20260827020000_p07_verification_suite.sql:951: (SELECT COUNT(*) FROM kira_knowledge WHERE organisation_id IS NOT NULL) as expected,
20260827020000_p07_verification_suite.sql:965: WHERE ge.organisation_id IS NOT NULL
20260827020000_p07_verification_suite.sql:968: WHERE ok.organisation_id = ge.organisation_id
20260827020000_p07_verification_suite.sql:977: WHERE ge.organisation_id IS NOT NULL
20260827020000_p07_verification_suite.sql:980: WHERE ok.organisation_id = ge.organisation_id
20260827020000_p07_verification_suite.sql:1001: LEFT JOIN organisations o ON ok.organisation_id = o.organisation_id
20260827020000_p07_verification_suite.sql:1002: WHERE o.organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1008: LEFT JOIN organisations o ON ok.organisation_id = o.organisation_id
20260827020000_p07_verification_suite.sql:1009: WHERE o.organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1041: WHERE organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1055: WHERE organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1154: -- V-012.5: INV-017: Knowledge continuity (organisation_id FK)
20260827020000_p07_verification_suite.sql:1157: 'INV-017: Knowledge continuity (organisation_id FK)' as requirement,
20260827020000_p07_verification_suite.sql:1163: AND column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:1171: AND column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:1177: -- V-012.6: INV-020: Organisation is anchor (organisation_id NOT NULL)
20260827020000_p07_verification_suite.sql:1180: 'INV-020: Organisation is anchor (organisation_id NOT NULL)' as requirement,
20260827020000_p07_verification_suite.sql:1185: WHERE organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1191: WHERE organisation_id IS NULL
20260827100000_p04_kira_knowledge_org_scope.sql:5: -- Organisation-scoped. The P0.5 migration added organisation_id (nullable)
20260827100000_p04_kira_knowledge_org_scope.sql:7: --   1. Verifies backfill is complete (no NULL organisation_id rows)
20260827100000_p04_kira_knowledge_org_scope.sql:8: --   2. Makes organisation_id NOT NULL
20260827100000_p04_kira_knowledge_org_scope.sql:19: --   - Update read paths to filter by organisation_id (P2.4.4)
20260827100000_p04_kira_knowledge_org_scope.sql:20: --   - Update write paths to always set organisation_id (already correct)
20260827100000_p04_kira_knowledge_org_scope.sql:26: -- If any rows have organisation_id IS NULL, this migration will fail.
20260827100000_p04_kira_knowledge_org_scope.sql:35: WHERE organisation_id IS NULL;
20260827100000_p04_kira_knowledge_org_scope.sql:38: RAISE EXCEPTION 'P2.4 migration blocked: % rows have organisation_id IS NULL', null_count;
20260827100000_p04_kira_knowledge_org_scope.sql:41: RAISE NOTICE 'P2.4: All kira_knowledge rows have organisation_id populated';
20260827100000_p04_kira_knowledge_org_scope.sql:44: -- STEP 2: Make organisation_id NOT NULL
20260827100000_p04_kira_knowledge_org_scope.sql:46: -- The P0.5 backfill populated organisation_id = user_id for all rows.
20260827100000_p04_kira_knowledge_org_scope.sql:50: ALTER COLUMN organisation_id SET NOT NULL;
20260827100000_p04_kira_knowledge_org_scope.sql:58: --   - organisation_id is now the tenant boundary (NOT NULL)
20260827100000_p04_kira_knowledge_org_scope.sql:78: -- The existing idx_kira_knowledge_organisation_id covers single-column lookups.
20260827100000_p04_kira_knowledge_org_scope.sql:80: -- organisation_id + source_type + created_at
20260827100000_p04_kira_knowledge_org_scope.sql:84: ON kira_knowledge(organisation_id, source_type, created_at DESC);
20260827100000_p04_kira_knowledge_org_scope.sql:91: ON kira_knowledge(organisation_id, source_type);
20260827100000_p04_kira_knowledge_org_scope.sql:97: -- Verify no NULL organisation_id rows exist
20260827100000_p04_kira_knowledge_org_scope.sql:104: SELECT COUNT(*) INTO null_count FROM kira_knowledge WHERE organisation_id IS NULL;
20260827100000_p04_kira_knowledge_org_scope.sql:106: RAISE NOTICE 'P2.4 verification: % total rows, % with NULL organisation_id', total_count, null_count;
20260827100000_p04_kira_knowledge_org_scope.sql:109: RAISE EXCEPTION 'P2.4 verification FAILED: % rows still have NULL organisation_id', null_count;
20260827100000_p04_kira_knowledge_org_scope.sql:112: RAISE NOTICE 'P2.4 verification PASSED: all rows have organisation_id';
20260827100000_p04_kira_knowledge_org_scope.sql:148: --   organisation_id: NOT NULL (tenant boundary)
20260827100000_p04_kira_knowledge_org_scope.sql:151: --   Read paths: must be updated to filter by organisation_id (P2.4.4)
20260827110000_p04_search_knowledge_semantic_org.sql:6: -- This function filters by organisation_id, ensuring semantic search can never
20260827110000_p04_search_knowledge_semantic_org.sql:16: -- Filters by organisation_id on the kira_knowledge table (parent of chunks).
20260827110000_p04_search_knowledge_semantic_org.sql:21: p_organisation_id   uuid,
20260827110000_p04_search_knowledge_semantic_org.sql:54: WHERE k.organisation_id = p_organisation_id
20260827120000_p04_match_kira_knowledge_chunks_org.sql:5: -- organisation_id instead of user_id. This function is still called by
20260827120000_p04_match_kira_knowledge_chunks_org.sql:34: p_organisation_id   uuid,
20260827120000_p04_match_kira_knowledge_chunks_org.sql:57: WHERE k.organisation_id = p_organisation_id
20260827120000_p04_match_kira_knowledge_chunks_org.sql:90: -- voice agent search_knowledge tool. The caller now passes organisation_id
20260827130000_fix_missing_organisations.sql:2: INSERT INTO organisations (organisation_id, legal_name, status, created_at)
20260827130000_fix_missing_organisations.sql:6: WHERE NOT EXISTS (SELECT 1 FROM organisations o WHERE o.organisation_id = u.id)
20260827205246_phase0_auth_security.sql:59: auth_user_has_organisation_access(organisation_id)
20260827205246_phase0_auth_security.sql:69: WHERE om.organisation_id = organisations.organisation_id
20260827205246_phase0_auth_security.sql:80: WHERE om.organisation_id = organisations.organisation_id
20260827205246_phase0_auth_security.sql:135: AND auth_user_has_organisation_access(om.organisation_id)
20260827232920_phase1_core_org_resources.sql:17: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:51: WHERE om.organisation_id = ownership_periods.organisation_id
20260827232920_phase1_core_org_resources.sql:62: WHERE om.organisation_id = ownership_periods.organisation_id
20260827232920_phase1_core_org_resources.sql:87: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:96: WHERE om.organisation_id = subscriptions.organisation_id
20260827232920_phase1_core_org_resources.sql:107: WHERE om.organisation_id = subscriptions.organisation_id
20260827232920_phase1_core_org_resources.sql:132: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:141: WHERE om.organisation_id = commercial_arrangements.organisation_id
20260827232920_phase1_core_org_resources.sql:152: WHERE om.organisation_id = commercial_arrangements.organisation_id
20260827232920_phase1_core_org_resources.sql:171: -- organisation_id already set NOT NULL and user_id already removed via direct
20260827232920_phase1_core_org_resources.sql:174: ALTER TABLE kira_instances ALTER COLUMN organisation_id SET NOT NULL;
20260827232920_phase1_core_org_resources.sql:183: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:192: WHERE om.organisation_id = kira_instances.organisation_id
20260827232920_phase1_core_org_resources.sql:203: WHERE om.organisation_id = kira_instances.organisation_id
20260827232920_phase1_core_org_resources.sql:225: -- organisation_id already set NOT NULL and user_id already removed via direct
20260827232920_phase1_core_org_resources.sql:228: ALTER TABLE kira_agents ALTER COLUMN organisation_id SET NOT NULL;
20260827232920_phase1_core_org_resources.sql:237: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:246: WHERE om.organisation_id = kira_agents.organisation_id
20260827232920_phase1_core_org_resources.sql:257: WHERE om.organisation_id = kira_agents.organisation_id

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\org-columns.ps1" > "C:\Users\denni\AppData\Local\Temp\opencode\org-cols.txt"; Get-Content "C:\Users\denni\AppData\Local\Temp\opencode\org-cols.txt"
=== ALTER/CREATE tables gaining organisation_id (MAIN repo) ===
20260826100000_p05_canonical_identity.sql:5: -- organisation_id to knowledge tables, create write triggers.
20260826100000_p05_canonical_identity.sql:24: organisation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
20260826100000_p05_canonical_identity.sql:68: canonical_organisation_id UUID NOT NULL,
20260826100000_p05_canonical_identity.sql:87: canonical_organisation_id UUID NOT NULL,
20260826100000_p05_canonical_identity.sql:93: PRIMARY KEY (legacy_user_id, canonical_person_id, canonical_organisation_id)
20260826100000_p05_canonical_identity.sql:103: -- ON CONFLICT DO NOTHING handles both PK (organisation_id) and unique (abn) conflicts
20260826100000_p05_canonical_identity.sql:104: INSERT INTO organisations (organisation_id, legal_name, trading_name, abn, entity_type, industry, status, created_at)
20260826100000_p05_canonical_identity.sql:144: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826100000_p05_canonical_identity.sql:159: INSERT INTO legacy_identity_map (legacy_user_id, canonical_person_id, canonical_organisation_id, resolution_method, confidence, resolved_at, resolved_by, notes)
20260826100000_p05_canonical_identity.sql:172: -- STEP 1A.3: Add organisation_id FK to knowledge tables
20260826100000_p05_canonical_identity.sql:176: ALTER TABLE genome_entities ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:177: CREATE INDEX IF NOT EXISTS idx_genome_entities_organisation_id ON genome_entities(organisation_id);
20260826100000_p05_canonical_identity.sql:180: ALTER TABLE genome_facts ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:181: CREATE INDEX IF NOT EXISTS idx_genome_facts_organisation_id ON genome_facts(organisation_id);
20260826100000_p05_canonical_identity.sql:184: ALTER TABLE genome_relationships ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:185: CREATE INDEX IF NOT EXISTS idx_genome_relationships_organisation_id ON genome_relationships(organisation_id);
20260826100000_p05_canonical_identity.sql:188: ALTER TABLE genome_events ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:189: CREATE INDEX IF NOT EXISTS idx_genome_events_organisation_id ON genome_events(organisation_id);
20260826100000_p05_canonical_identity.sql:192: ALTER TABLE kira_memory ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:193: CREATE INDEX IF NOT EXISTS idx_kira_memory_organisation_id ON kira_memory(organisation_id);
20260826100000_p05_canonical_identity.sql:196: ALTER TABLE kira_knowledge ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:197: CREATE INDEX IF NOT EXISTS idx_kira_knowledge_organisation_id ON kira_knowledge(organisation_id);
20260826100000_p05_canonical_identity.sql:200: ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:201: CREATE INDEX IF NOT EXISTS idx_conversations_organisation_id ON conversations(organisation_id);
20260826100000_p05_canonical_identity.sql:204: ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:205: CREATE INDEX IF NOT EXISTS idx_conversation_messages_organisation_id ON conversation_messages(organisation_id);
20260826100000_p05_canonical_identity.sql:208: ALTER TABLE kira_agents ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
20260826100000_p05_canonical_identity.sql:209: CREATE INDEX IF NOT EXISTS idx_kira_agents_organisation_id ON kira_agents(organisation_id);
20260826100000_p05_canonical_identity.sql:211: -- STEP 1A.4: Backfill organisation_id on knowledge tables
20260826100000_p05_canonical_identity.sql:215: UPDATE genome_entities SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:216: UPDATE genome_facts SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:217: UPDATE genome_relationships SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:218: UPDATE genome_events SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:219: UPDATE kira_memory SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:220: UPDATE kira_knowledge SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:221: UPDATE conversations SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:222: UPDATE conversation_messages SET organisation_id = (SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id) WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:223: UPDATE kira_agents SET organisation_id = user_id WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:225: -- STEP 1A.5: Create triggers to sync organisation_id on write
20260826100000_p05_canonical_identity.sql:228: -- Function to get organisation_id from user_id (Bridge phase: 1:1 mapping)
20260826100000_p05_canonical_identity.sql:229: CREATE OR REPLACE FUNCTION get_organisation_id_from_user(p_user_id UUID)
20260826100000_p05_canonical_identity.sql:236: -- Trigger: auto-populate organisation_id on genome_entities insert
20260826100000_p05_canonical_identity.sql:237: CREATE OR REPLACE FUNCTION sync_organisation_id_genome_entities()
20260826100000_p05_canonical_identity.sql:240: IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
20260826100000_p05_canonical_identity.sql:241: NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
20260826100000_p05_canonical_identity.sql:247: CREATE TRIGGER trg_genome_entities_sync_organisation_id
20260826100000_p05_canonical_identity.sql:250: EXECUTE FUNCTION sync_organisation_id_genome_entities();
20260826100000_p05_canonical_identity.sql:252: -- Trigger: auto-populate organisation_id on genome_facts insert
20260826100000_p05_canonical_identity.sql:253: CREATE OR REPLACE FUNCTION sync_organisation_id_genome_facts()
20260826100000_p05_canonical_identity.sql:256: IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
20260826100000_p05_canonical_identity.sql:257: NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
20260826100000_p05_canonical_identity.sql:263: CREATE TRIGGER trg_genome_facts_sync_organisation_id
20260826100000_p05_canonical_identity.sql:266: EXECUTE FUNCTION sync_organisation_id_genome_facts();
20260826100000_p05_canonical_identity.sql:268: -- Trigger: auto-populate organisation_id on kira_memory insert
20260826100000_p05_canonical_identity.sql:269: CREATE OR REPLACE FUNCTION sync_organisation_id_kira_memory()
20260826100000_p05_canonical_identity.sql:272: IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
20260826100000_p05_canonical_identity.sql:273: NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
20260826100000_p05_canonical_identity.sql:279: CREATE TRIGGER trg_kira_memory_sync_organisation_id
20260826100000_p05_canonical_identity.sql:282: EXECUTE FUNCTION sync_organisation_id_kira_memory();
20260826100000_p05_canonical_identity.sql:284: -- Trigger: auto-populate organisation_id on conversations insert
20260826100000_p05_canonical_identity.sql:285: CREATE OR REPLACE FUNCTION sync_organisation_id_conversations()
20260826100000_p05_canonical_identity.sql:288: IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
20260826100000_p05_canonical_identity.sql:289: NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
20260826100000_p05_canonical_identity.sql:295: CREATE TRIGGER trg_conversations_sync_organisation_id
20260826100000_p05_canonical_identity.sql:298: EXECUTE FUNCTION sync_organisation_id_conversations();
20260826100000_p05_canonical_identity.sql:306: -- Verification 1: No knowledge rows missing organisation_id
20260826100000_p05_canonical_identity.sql:308: -- SELECT 'genome_entities' as table_name, COUNT(*) as missing FROM genome_entities WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:310: -- SELECT 'genome_facts', COUNT(*) FROM genome_facts WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:312: -- SELECT 'genome_relationships', COUNT(*) FROM genome_relationships WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:314: -- SELECT 'genome_events', COUNT(*) FROM genome_events WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:316: -- SELECT 'kira_memory', COUNT(*) FROM kira_memory WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:318: -- SELECT 'kira_knowledge', COUNT(*) FROM kira_knowledge WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:320: -- SELECT 'conversations', COUNT(*) FROM conversations WHERE organisation_id IS NULL
20260826100000_p05_canonical_identity.sql:322: -- SELECT 'kira_agents', COUNT(*) FROM kira_agents WHERE organisation_id IS NULL;
20260826100000_p05_canonical_identity.sql:324: -- Verification 2: No knowledge rows with invalid organisation_id
20260826100000_p05_canonical_identity.sql:326: -- SELECT 'genome_entities' as table_name, COUNT(*) as invalid FROM genome_entities WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)
20260826100000_p05_canonical_identity.sql:328: -- SELECT 'genome_facts', COUNT(*) FROM genome_facts WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)
20260826100000_p05_canonical_identity.sql:330: -- SELECT 'kira_memory', COUNT(*) FROM kira_memory WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations);
20260826100000_p05_canonical_identity.sql:334: -- SELECT u.id, o.organisation_id, p.person_id FROM users u LEFT JOIN organisations o ON o.organisation_id = u.id LEFT JOIN persons p ON p.person_id = u.id WHERE o.organisation_id IS NULL OR p.person_id IS NULL;
20260826110000_p05_membership_tenant_context.sql:22: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826110000_p05_membership_tenant_context.sql:30: UNIQUE (organisation_id, person_id, role)
20260826110000_p05_membership_tenant_context.sql:37: CREATE INDEX IF NOT EXISTS idx_organisation_memberships_organisation_id ON organisation_memberships(organisation_id);
20260826110000_p05_membership_tenant_context.sql:45: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826110000_p05_membership_tenant_context.sql:57: CREATE INDEX IF NOT EXISTS idx_ownership_periods_organisation_id ON ownership_periods(organisation_id);
20260826110000_p05_membership_tenant_context.sql:69: INSERT INTO organisation_memberships (organisation_id, person_id, role, status, valid_from, created_at)
20260826110000_p05_membership_tenant_context.sql:79: ON CONFLICT (organisation_id, person_id, role) DO NOTHING;
20260826110000_p05_membership_tenant_context.sql:83: INSERT INTO organisation_memberships (organisation_id, person_id, role, status, valid_from, created_at)
20260826110000_p05_membership_tenant_context.sql:95: WHERE om.organisation_id = u.id AND om.person_id = u.id AND om.role = 'owner'
20260826110000_p05_membership_tenant_context.sql:97: ON CONFLICT (organisation_id, person_id, role) DO NOTHING;
20260826110000_p05_membership_tenant_context.sql:102: INSERT INTO organisation_memberships (organisation_id, person_id, role, status, valid_from, created_at)
20260826110000_p05_membership_tenant_context.sql:114: ON CONFLICT (organisation_id, person_id, role) DO NOTHING;
20260826110000_p05_membership_tenant_context.sql:120: INSERT INTO ownership_periods (organisation_id, person_id, status, valid_from, created_at)
20260826110000_p05_membership_tenant_context.sql:138: -- This function resolves organisation_id from the current auth context.
20260826110000_p05_membership_tenant_context.sql:144: CREATE OR REPLACE FUNCTION resolve_organisation_id_from_auth()
20260826110000_p05_membership_tenant_context.sql:149: v_organisation_id UUID;
20260826110000_p05_membership_tenant_context.sql:180: SELECT organisation_id INTO v_organisation_id
20260826110000_p05_membership_tenant_context.sql:196: RETURN v_organisation_id;
20260826110000_p05_membership_tenant_context.sql:200: COMMENT ON FUNCTION resolve_organisation_id_from_auth() IS 'Resolve organisation_id from auth context using membership. NOT yet used by RLS/API (authority transfer in 1C/1D). P0.5 Step 1B.';
20260826110000_p05_membership_tenant_context.sql:207: p_organisation_id UUID,
20260826110000_p05_membership_tenant_context.sql:215: AND organisation_id = p_organisation_id
20260826110000_p05_membership_tenant_context.sql:227: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826110000_p05_membership_tenant_context.sql:243: JOIN organisation_memberships om ON om.organisation_id = u.id AND om.person_id = u.id;
20260826110000_p05_membership_tenant_context.sql:257: -- WHERE om.organisation_id NOT IN (SELECT organisation_id FROM organisations)
20260826110000_p05_membership_tenant_context.sql:262: -- SELECT organisation_id, person_id, role, COUNT(*) as cnt
20260826110000_p05_membership_tenant_context.sql:264: -- GROUP BY organisation_id, person_id, role HAVING COUNT(*) > 1;
20260826110000_p05_membership_tenant_context.sql:272: --     WHERE om.organisation_id = u.id AND om.person_id = u.id AND om.role = 'owner'
20260826110000_p05_membership_tenant_context.sql:277: -- SELECT resolve_organisation_id_from_auth();
20260826110000_p05_membership_tenant_context.sql:285: -- Verification 7: organisation_id column exists on all knowledge tables
20260826110000_p05_membership_tenant_context.sql:286: -- Expected: all tables have organisation_id column
20260826110000_p05_membership_tenant_context.sql:288: -- WHERE column_name = 'organisation_id'
20260826120000_p05_rls_authority_transfer.sql:5: -- canonical organisation_id-based policies. Every protected organisational
20260826120000_p05_rls_authority_transfer.sql:30: CREATE OR REPLACE FUNCTION auth_user_has_organisation_access(p_organisation_id UUID)
20260826120000_p05_rls_authority_transfer.sql:68: AND organisation_id = p_organisation_id
20260826120000_p05_rls_authority_transfer.sql:80: -- STEP 1C.2: Create helper function to get current user's organisation_id
20260826120000_p05_rls_authority_transfer.sql:83: CREATE OR REPLACE FUNCTION auth_user_organisation_id()
20260826120000_p05_rls_authority_transfer.sql:86: RETURN resolve_organisation_id_from_auth();
20260826120000_p05_rls_authority_transfer.sql:90: COMMENT ON FUNCTION auth_user_organisation_id() IS 'Get organisation_id for current auth user via membership. P0.5 Step 1C.';
20260826120000_p05_rls_authority_transfer.sql:96: -- These are being replaced with organisation_id-based policies.
20260826120000_p05_rls_authority_transfer.sql:197: -- STEP 1C.4: Create canonical organisation_id-based RLS policies
20260826120000_p05_rls_authority_transfer.sql:203: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:209: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:215: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:221: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:227: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:233: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:239: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:246: (SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id)
20260826120000_p05_rls_authority_transfer.sql:253: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:281: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:296: WHERE auth_user_has_organisation_access(om.organisation_id)
20260826120000_p05_rls_authority_transfer.sql:311: auth_user_has_organisation_access(organisation_id)
20260826120000_p05_rls_authority_transfer.sql:319: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826120000_p05_rls_authority_transfer.sql:329: 'RLS authority transferred from user_id to organisation_id via membership',
20260826130000_p05_api_rebinding.sql:12: --   - API routes resolve organisation_id via membership, not users.id
20260826130000_p05_api_rebinding.sql:13: --   - organisation_id is the canonical tenant key for all data access
20260826130000_p05_api_rebinding.sql:22: -- auth user: person_id, organisation_id, role, and membership details.
20260826130000_p05_api_rebinding.sql:27: organisation_id UUID,
20260826130000_p05_api_rebinding.sql:69: om.organisation_id,
20260826130000_p05_api_rebinding.sql:92: COMMENT ON FUNCTION resolve_organisational_context() IS 'Resolve full organisational context for current auth user. Returns person_id, organisation_id, role, membership details. P0.5 Step 1D.';
20260826130000_p05_api_rebinding.sql:94: -- STEP 1D.2: Create function to get user_id from organisation_id (backward compat)
20260826130000_p05_api_rebinding.sql:97: -- During transition, some code may need to resolve user_id from organisation_id.
20260826130000_p05_api_rebinding.sql:100: CREATE OR REPLACE FUNCTION resolve_user_id_from_organisation(p_organisation_id UUID)
20260826130000_p05_api_rebinding.sql:109: WHERE om.organisation_id = p_organisation_id
20260826130000_p05_api_rebinding.sql:118: COMMENT ON FUNCTION resolve_user_id_from_organisation(UUID) IS 'Resolve user_id from organisation_id (backward compat during bridge). Will need update when UUID reuse ends. P0.5 Step 1D.';
20260826130000_p05_api_rebinding.sql:123: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826140000_p05_consultant_relationship.sql:52: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826140000_p05_consultant_relationship.sql:64: CREATE INDEX IF NOT EXISTS idx_consultant_relationships_organisation_id ON consultant_relationships(organisation_id);
20260826140000_p05_consultant_relationship.sql:66: CREATE UNIQUE INDEX IF NOT EXISTS idx_consultant_relationships_active ON consultant_relationships(consultant_id, organisation_id) WHERE status = 'active';
20260826140000_p05_consultant_relationship.sql:78: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826140000_p05_consultant_relationship.sql:89: CREATE INDEX IF NOT EXISTS idx_consultant_history_organisation_id ON consultant_history(organisation_id);
20260826140000_p05_consultant_relationship.sql:107: p_organisation_id UUID
20260826140000_p05_consultant_relationship.sql:114: AND organisation_id = p_organisation_id
20260826140000_p05_consultant_relationship.sql:124: CREATE OR REPLACE FUNCTION get_organisation_consultants(p_organisation_id UUID)
20260826140000_p05_consultant_relationship.sql:143: WHERE cr.organisation_id = p_organisation_id
20260826140000_p05_consultant_relationship.sql:180: INSERT INTO consultant_history (relationship_id, consultant_id, organisation_id, action, performed_by, reason)
20260826140000_p05_consultant_relationship.sql:181: VALUES (p_relationship_id, v_relationship.consultant_id, v_relationship.organisation_id, 'ended', p_performed_by, p_reason);
20260826140000_p05_consultant_relationship.sql:192: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826150000_p05_engagement_model.sql:25: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826150000_p05_engagement_model.sql:39: CREATE INDEX IF NOT EXISTS idx_engagements_organisation_id ON engagements(organisation_id);
20260826150000_p05_engagement_model.sql:101: CREATE OR REPLACE FUNCTION get_organisation_engagements(p_organisation_id UUID)
20260826150000_p05_engagement_model.sql:122: WHERE e.organisation_id = p_organisation_id
20260826150000_p05_engagement_model.sql:169: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826160000_p05_consultant_engagement_access.sql:47: WHERE auth_user_has_organisation_access(cr.organisation_id)
20260826160000_p05_consultant_engagement_access.sql:58: auth_user_has_organisation_access(organisation_id)
20260826160000_p05_consultant_engagement_access.sql:81: auth_user_has_organisation_access(organisation_id)
20260826160000_p05_consultant_engagement_access.sql:90: auth_user_has_organisation_access(organisation_id)
20260826160000_p05_consultant_engagement_access.sql:117: WHERE auth_user_has_organisation_access(e.organisation_id)
20260826160000_p05_consultant_engagement_access.sql:145: WHERE auth_user_has_organisation_access(e.organisation_id)
20260826160000_p05_consultant_engagement_access.sql:152: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826170000_p05_commercial_structures.sql:48: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826170000_p05_commercial_structures.sql:62: CREATE INDEX IF NOT EXISTS idx_subscriptions_organisation_id ON subscriptions(organisation_id);
20260826170000_p05_commercial_structures.sql:64: CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(organisation_id) WHERE status IN ('trial', 'active');
20260826170000_p05_commercial_structures.sql:73: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826170000_p05_commercial_structures.sql:87: CREATE INDEX IF NOT EXISTS idx_commercial_arrangements_organisation_id ON commercial_arrangements(organisation_id);
20260826170000_p05_commercial_structures.sql:130: INSERT INTO subscriptions (organisation_id, tier_id, status, valid_from, created_at)
20260826170000_p05_commercial_structures.sql:168: CREATE OR REPLACE FUNCTION get_organisation_subscription(p_organisation_id UUID)
20260826170000_p05_commercial_structures.sql:188: WHERE s.organisation_id = p_organisation_id
20260826170000_p05_commercial_structures.sql:198: CREATE OR REPLACE FUNCTION is_subscription_active(p_organisation_id UUID)
20260826170000_p05_commercial_structures.sql:203: WHERE organisation_id = p_organisation_id
20260826170000_p05_commercial_structures.sql:214: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826180000_p05_kira_instance_separation.sql:24: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826180000_p05_kira_instance_separation.sql:35: CREATE INDEX IF NOT EXISTS idx_kira_instances_organisation_id ON kira_instances(organisation_id);
20260826180000_p05_kira_instance_separation.sql:37: CREATE UNIQUE INDEX IF NOT EXISTS idx_kira_instances_active ON kira_instances(organisation_id, journey_type) WHERE status = 'active';
20260826180000_p05_kira_instance_separation.sql:60: INSERT INTO kira_instances (instance_id, organisation_id, instance_name, journey_type, status, created_at)
20260826180000_p05_kira_instance_separation.sql:63: ka.organisation_id,
20260826180000_p05_kira_instance_separation.sql:69: WHERE ka.organisation_id IS NOT NULL
20260826180000_p05_kira_instance_separation.sql:77: p_organisation_id UUID,
20260826180000_p05_kira_instance_separation.sql:96: WHERE ki.organisation_id = p_organisation_id
20260826180000_p05_kira_instance_separation.sql:106: CREATE OR REPLACE FUNCTION get_organisation_kira_instances(p_organisation_id UUID)
20260826180000_p05_kira_instance_separation.sql:123: WHERE ki.organisation_id = p_organisation_id
20260826180000_p05_kira_instance_separation.sql:133: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826180000_p05_kira_instance_separation.sql:159: -- Expected: count matches kira_agents with organisation_id
20260826180000_p05_kira_instance_separation.sql:161: -- SELECT COUNT(*) FROM kira_agents WHERE organisation_id IS NOT NULL;
20260826190000_p05_decision_lifecycle.sql:24: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826190000_p05_decision_lifecycle.sql:39: CREATE INDEX IF NOT EXISTS idx_decisions_organisation_id ON decisions(organisation_id);
20260826190000_p05_decision_lifecycle.sql:65: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826190000_p05_decision_lifecycle.sql:82: CREATE INDEX IF NOT EXISTS idx_actions_organisation_id ON actions(organisation_id);
20260826190000_p05_decision_lifecycle.sql:92: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826190000_p05_decision_lifecycle.sql:106: CREATE INDEX IF NOT EXISTS idx_outcomes_organisation_id ON outcomes(organisation_id);
20260826190000_p05_decision_lifecycle.sql:115: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826190000_p05_decision_lifecycle.sql:130: CREATE INDEX IF NOT EXISTS idx_learnings_organisation_id ON learnings(organisation_id);
20260826190000_p05_decision_lifecycle.sql:139: CREATE OR REPLACE FUNCTION get_organisation_decisions(p_organisation_id UUID)
20260826190000_p05_decision_lifecycle.sql:158: WHERE d.organisation_id = p_organisation_id
20260826190000_p05_decision_lifecycle.sql:167: CREATE OR REPLACE FUNCTION get_organisation_learnings(p_organisation_id UUID)
20260826190000_p05_decision_lifecycle.sql:184: WHERE l.organisation_id = p_organisation_id
20260826190000_p05_decision_lifecycle.sql:195: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826190000_p05_decision_lifecycle.sql:220: -- Verification 2: All tables have organisation_id FK
20260826200000_p05_legacy_authority_retirement.sql:17: DROP TRIGGER IF EXISTS trg_genome_entities_sync_organisation_id ON genome_entities;
20260826200000_p05_legacy_authority_retirement.sql:18: DROP FUNCTION IF EXISTS sync_organisation_id_genome_entities();
20260826200000_p05_legacy_authority_retirement.sql:20: DROP TRIGGER IF EXISTS trg_genome_facts_sync_organisation_id ON genome_facts;
20260826200000_p05_legacy_authority_retirement.sql:21: DROP FUNCTION IF EXISTS sync_organisation_id_genome_facts();
20260826200000_p05_legacy_authority_retirement.sql:23: DROP TRIGGER IF EXISTS trg_kira_memory_sync_organisation_id ON kira_memory;
20260826200000_p05_legacy_authority_retirement.sql:24: DROP FUNCTION IF EXISTS sync_organisation_id_kira_memory();
20260826200000_p05_legacy_authority_retirement.sql:26: DROP TRIGGER IF EXISTS trg_conversations_sync_organisation_id ON conversations;
20260826200000_p05_legacy_authority_retirement.sql:27: DROP FUNCTION IF EXISTS sync_organisation_id_conversations();
20260826200000_p05_legacy_authority_retirement.sql:29: DROP FUNCTION IF EXISTS get_organisation_id_from_user(UUID);
20260826200000_p05_legacy_authority_retirement.sql:52: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:56: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:60: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:64: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:68: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:72: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:76: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:82: (SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id)
20260826200000_p05_legacy_authority_retirement.sql:88: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826200000_p05_legacy_authority_retirement.sql:117: WHERE tgname LIKE 'trg_%sync_organisation_id%'
20260826200000_p05_legacy_authority_retirement.sql:133: 'All knowledge tables have organisation_id column' as check_name,
20260826200000_p05_legacy_authority_retirement.sql:137: AND column_name = 'organisation_id'
20260826200000_p05_legacy_authority_retirement.sql:139: 'All 9 knowledge tables must have organisation_id' as details;
20260826200000_p05_legacy_authority_retirement.sql:166: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826200000_p05_legacy_authority_retirement.sql:188: -- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%sync_organisation_id%';
20260826210000_p07_knowledge_object_schema.sql:28: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826210000_p07_knowledge_object_schema.sql:90: CREATE INDEX IF NOT EXISTS idx_org_knowledge_organisation_id ON organisational_knowledge(organisation_id);
20260826210000_p07_knowledge_object_schema.sql:101: CREATE INDEX IF NOT EXISTS idx_org_knowledge_current ON organisational_knowledge(organisation_id, is_current, knowledge_type) WHERE is_current = TRUE;
20260826210000_p07_knowledge_object_schema.sql:126: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826210000_p07_knowledge_object_schema.sql:156: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826210000_p07_knowledge_object_schema.sql:163: WHERE auth_user_has_organisation_access(ok.organisation_id)
20260826210000_p07_knowledge_object_schema.sql:169: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826210000_p07_knowledge_object_schema.sql:176: p_organisation_id UUID,
20260826210000_p07_knowledge_object_schema.sql:205: WHERE ok.organisation_id = p_organisation_id
20260826210000_p07_knowledge_object_schema.sql:216: p_organisation_id UUID,
20260826210000_p07_knowledge_object_schema.sql:244: WHERE ok.organisation_id = p_organisation_id
20260826210000_p07_knowledge_object_schema.sql:286: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826220000_p07_evidence_schema.sql:25: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826220000_p07_evidence_schema.sql:60: CREATE INDEX IF NOT EXISTS idx_evidence_organisation_id ON evidence(organisation_id);
20260826220000_p07_evidence_schema.sql:94: ok.organisation_id,
20260826220000_p07_evidence_schema.sql:134: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826220000_p07_evidence_schema.sql:141: WHERE auth_user_has_organisation_access(ok.organisation_id)
20260826220000_p07_evidence_schema.sql:150: p_organisation_id UUID,
20260826220000_p07_evidence_schema.sql:177: WHERE e.organisation_id = p_organisation_id
20260826220000_p07_evidence_schema.sql:207: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260826230000_p07_knowledge_promotion_pipeline.sql:26: organisation_id UUID REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826230000_p07_knowledge_promotion_pipeline.sql:39: UNIQUE(organisation_id, knowledge_type, evidence_type)
20260826230000_p07_knowledge_promotion_pipeline.sql:49: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826230000_p07_knowledge_promotion_pipeline.sql:93: CREATE INDEX IF NOT EXISTS idx_promotion_candidates_organisation_id ON promotion_candidates(organisation_id);
20260826230000_p07_knowledge_promotion_pipeline.sql:102: organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
20260826230000_p07_knowledge_promotion_pipeline.sql:117: CREATE INDEX IF NOT EXISTS idx_promotion_log_organisation_id ON promotion_log(organisation_id);
20260826230000_p07_knowledge_promotion_pipeline.sql:124: p_organisation_id UUID,
20260826230000_p07_knowledge_promotion_pipeline.sql:147: WHERE ok.organisation_id = p_organisation_id
20260826230000_p07_knowledge_promotion_pipeline.sql:163: p_organisation_id UUID,
20260826230000_p07_knowledge_promotion_pipeline.sql:181: WHERE ok.organisation_id = p_organisation_id
20260826230000_p07_knowledge_promotion_pipeline.sql:212: organisation_id,
20260826230000_p07_knowledge_promotion_pipeline.sql:228: v_candidate.organisation_id,
20260826230000_p07_knowledge_promotion_pipeline.sql:259: INSERT INTO promotion_log (organisation_id, candidate_id, knowledge_id, action, performed_by)
20260826230000_p07_knowledge_promotion_pipeline.sql:260: VALUES (v_candidate.organisation_id, p_candidate_id, v_new_knowledge_id, 'promoted', p_performed_by);
20260826230000_p07_knowledge_promotion_pipeline.sql:280: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826230000_p07_knowledge_promotion_pipeline.sql:284: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826230000_p07_knowledge_promotion_pipeline.sql:288: FOR ALL USING (auth_user_has_organisation_access(organisation_id));
20260826230000_p07_knowledge_promotion_pipeline.sql:293: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260827000000_p07_temporal_query_patterns.sql:21: p_organisation_id UUID,
20260827000000_p07_temporal_query_patterns.sql:54: WHERE ok.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:65: p_organisation_id UUID,
20260827000000_p07_temporal_query_patterns.sql:99: WHERE ok.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:163: p_organisation_id UUID
20260827000000_p07_temporal_query_patterns.sql:191: WHERE ok.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:205: p_organisation_id UUID
20260827000000_p07_temporal_query_patterns.sql:230: a.organisation_id = b.organisation_id
20260827000000_p07_temporal_query_patterns.sql:238: WHERE a.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:250: p_organisation_id UUID
20260827000000_p07_temporal_query_patterns.sql:274: WHERE ok.organisation_id = p_organisation_id
20260827000000_p07_temporal_query_patterns.sql:285: INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
20260827010000_p07_existing_data_migration.sql:14: --      user_id -> organisation_id mapping exists.
20260827010000_p07_existing_data_migration.sql:16: --   6. Never use organisation_id = user_id as an assumed identity mapping.
20260827010000_p07_existing_data_migration.sql:82: --     organisations.organisation_id = users.id
20260827010000_p07_existing_data_migration.sql:97: organisation_id UUID NOT NULL
20260827010000_p07_existing_data_migration.sql:112: organisation_id
20260827010000_p07_existing_data_migration.sql:116: om.organisation_id
20260827010000_p07_existing_data_migration.sql:119: AND om.organisation_id IS NOT NULL
20260827010000_p07_existing_data_migration.sql:142: organisation_id
20260827010000_p07_existing_data_migration.sql:146: om.organisation_id
20260827010000_p07_existing_data_migration.sql:153: AND om.organisation_id IS NOT NULL
20260827010000_p07_existing_data_migration.sql:197: organisation_id,
20260827010000_p07_existing_data_migration.sql:211: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:254: WHERE ok.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:279: organisation_id,
20260827010000_p07_existing_data_migration.sql:293: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:340: WHERE ok.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:375: organisation_id,
20260827010000_p07_existing_data_migration.sql:387: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:493: ON e.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:498: ON ok.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:540: ON e.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:545: ON ok.organisation_id = m.organisation_id
20260827010000_p07_existing_data_migration.sql:575: organisation_id,
20260827010000_p07_existing_data_migration.sql:583: o.organisation_id,
20260827010000_p07_existing_data_migration.sql:611: WHERE pr.organisation_id = o.organisation_id
20260827010000_p07_existing_data_migration.sql:640: canonical_organisation_id,
20260827010000_p07_existing_data_migration.sql:651: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:680: canonical_organisation_id,
20260827010000_p07_existing_data_migration.sql:691: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:720: canonical_organisation_id,
20260827010000_p07_existing_data_migration.sql:731: m.organisation_id,
20260827010000_p07_existing_data_migration.sql:839: ON o.organisation_id = ok.organisation_id
20260827010000_p07_existing_data_migration.sql:840: WHERE o.organisation_id IS NULL;
20260827010000_p07_existing_data_migration.sql:851: organisation_id,
20260827010000_p07_existing_data_migration.sql:860: organisation_id,
20260827020000_p07_verification_suite.sql:111: -- V-001.10: All knowledge tables have organisation_id FK
20260827020000_p07_verification_suite.sql:114: 'All knowledge tables have organisation_id FK' as requirement,
20260827020000_p07_verification_suite.sql:118: WHERE column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:123: WHERE column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:761: AND column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:768: AND column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:929: (SELECT COUNT(*) FROM genome_entities WHERE organisation_id IS NOT NULL) as expected,
20260827020000_p07_verification_suite.sql:940: (SELECT COUNT(*) FROM genome_facts WHERE organisation_id IS NOT NULL) as expected,
20260827020000_p07_verification_suite.sql:951: (SELECT COUNT(*) FROM kira_knowledge WHERE organisation_id IS NOT NULL) as expected,
20260827020000_p07_verification_suite.sql:965: WHERE ge.organisation_id IS NOT NULL
20260827020000_p07_verification_suite.sql:968: WHERE ok.organisation_id = ge.organisation_id
20260827020000_p07_verification_suite.sql:977: WHERE ge.organisation_id IS NOT NULL
20260827020000_p07_verification_suite.sql:980: WHERE ok.organisation_id = ge.organisation_id
20260827020000_p07_verification_suite.sql:1001: LEFT JOIN organisations o ON ok.organisation_id = o.organisation_id
20260827020000_p07_verification_suite.sql:1002: WHERE o.organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1008: LEFT JOIN organisations o ON ok.organisation_id = o.organisation_id
20260827020000_p07_verification_suite.sql:1009: WHERE o.organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1041: WHERE organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1055: WHERE organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1154: -- V-012.5: INV-017: Knowledge continuity (organisation_id FK)
20260827020000_p07_verification_suite.sql:1157: 'INV-017: Knowledge continuity (organisation_id FK)' as requirement,
20260827020000_p07_verification_suite.sql:1163: AND column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:1171: AND column_name = 'organisation_id'
20260827020000_p07_verification_suite.sql:1177: -- V-012.6: INV-020: Organisation is anchor (organisation_id NOT NULL)
20260827020000_p07_verification_suite.sql:1180: 'INV-020: Organisation is anchor (organisation_id NOT NULL)' as requirement,
20260827020000_p07_verification_suite.sql:1185: WHERE organisation_id IS NULL
20260827020000_p07_verification_suite.sql:1191: WHERE organisation_id IS NULL
20260827100000_p04_kira_knowledge_org_scope.sql:5: -- Organisation-scoped. The P0.5 migration added organisation_id (nullable)
20260827100000_p04_kira_knowledge_org_scope.sql:7: --   1. Verifies backfill is complete (no NULL organisation_id rows)
20260827100000_p04_kira_knowledge_org_scope.sql:8: --   2. Makes organisation_id NOT NULL
20260827100000_p04_kira_knowledge_org_scope.sql:19: --   - Update read paths to filter by organisation_id (P2.4.4)
20260827100000_p04_kira_knowledge_org_scope.sql:20: --   - Update write paths to always set organisation_id (already correct)
20260827100000_p04_kira_knowledge_org_scope.sql:26: -- If any rows have organisation_id IS NULL, this migration will fail.
20260827100000_p04_kira_knowledge_org_scope.sql:35: WHERE organisation_id IS NULL;
20260827100000_p04_kira_knowledge_org_scope.sql:38: RAISE EXCEPTION 'P2.4 migration blocked: % rows have organisation_id IS NULL', null_count;
20260827100000_p04_kira_knowledge_org_scope.sql:41: RAISE NOTICE 'P2.4: All kira_knowledge rows have organisation_id populated';
20260827100000_p04_kira_knowledge_org_scope.sql:44: -- STEP 2: Make organisation_id NOT NULL
20260827100000_p04_kira_knowledge_org_scope.sql:46: -- The P0.5 backfill populated organisation_id = user_id for all rows.
20260827100000_p04_kira_knowledge_org_scope.sql:50: ALTER COLUMN organisation_id SET NOT NULL;
20260827100000_p04_kira_knowledge_org_scope.sql:58: --   - organisation_id is now the tenant boundary (NOT NULL)
20260827100000_p04_kira_knowledge_org_scope.sql:78: -- The existing idx_kira_knowledge_organisation_id covers single-column lookups.
20260827100000_p04_kira_knowledge_org_scope.sql:80: -- organisation_id + source_type + created_at
20260827100000_p04_kira_knowledge_org_scope.sql:84: ON kira_knowledge(organisation_id, source_type, created_at DESC);
20260827100000_p04_kira_knowledge_org_scope.sql:91: ON kira_knowledge(organisation_id, source_type);
20260827100000_p04_kira_knowledge_org_scope.sql:97: -- Verify no NULL organisation_id rows exist
20260827100000_p04_kira_knowledge_org_scope.sql:104: SELECT COUNT(*) INTO null_count FROM kira_knowledge WHERE organisation_id IS NULL;
20260827100000_p04_kira_knowledge_org_scope.sql:106: RAISE NOTICE 'P2.4 verification: % total rows, % with NULL organisation_id', total_count, null_count;
20260827100000_p04_kira_knowledge_org_scope.sql:109: RAISE EXCEPTION 'P2.4 verification FAILED: % rows still have NULL organisation_id', null_count;
20260827100000_p04_kira_knowledge_org_scope.sql:112: RAISE NOTICE 'P2.4 verification PASSED: all rows have organisation_id';
20260827100000_p04_kira_knowledge_org_scope.sql:148: --   organisation_id: NOT NULL (tenant boundary)
20260827100000_p04_kira_knowledge_org_scope.sql:151: --   Read paths: must be updated to filter by organisation_id (P2.4.4)
20260827110000_p04_search_knowledge_semantic_org.sql:6: -- This function filters by organisation_id, ensuring semantic search can never
20260827110000_p04_search_knowledge_semantic_org.sql:16: -- Filters by organisation_id on the kira_knowledge table (parent of chunks).
20260827110000_p04_search_knowledge_semantic_org.sql:21: p_organisation_id   uuid,
20260827110000_p04_search_knowledge_semantic_org.sql:54: WHERE k.organisation_id = p_organisation_id
20260827120000_p04_match_kira_knowledge_chunks_org.sql:5: -- organisation_id instead of user_id. This function is still called by
20260827120000_p04_match_kira_knowledge_chunks_org.sql:34: p_organisation_id   uuid,
20260827120000_p04_match_kira_knowledge_chunks_org.sql:57: WHERE k.organisation_id = p_organisation_id
20260827120000_p04_match_kira_knowledge_chunks_org.sql:90: -- voice agent search_knowledge tool. The caller now passes organisation_id
20260827130000_fix_missing_organisations.sql:2: INSERT INTO organisations (organisation_id, legal_name, status, created_at)
20260827130000_fix_missing_organisations.sql:6: WHERE NOT EXISTS (SELECT 1 FROM organisations o WHERE o.organisation_id = u.id)
20260827205246_phase0_auth_security.sql:59: auth_user_has_organisation_access(organisation_id)
20260827205246_phase0_auth_security.sql:69: WHERE om.organisation_id = organisations.organisation_id
20260827205246_phase0_auth_security.sql:80: WHERE om.organisation_id = organisations.organisation_id
20260827205246_phase0_auth_security.sql:135: AND auth_user_has_organisation_access(om.organisation_id)
20260827232920_phase1_core_org_resources.sql:17: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:51: WHERE om.organisation_id = ownership_periods.organisation_id
20260827232920_phase1_core_org_resources.sql:62: WHERE om.organisation_id = ownership_periods.organisation_id
20260827232920_phase1_core_org_resources.sql:87: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:96: WHERE om.organisation_id = subscriptions.organisation_id
20260827232920_phase1_core_org_resources.sql:107: WHERE om.organisation_id = subscriptions.organisation_id
20260827232920_phase1_core_org_resources.sql:132: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:141: WHERE om.organisation_id = commercial_arrangements.organisation_id
20260827232920_phase1_core_org_resources.sql:152: WHERE om.organisation_id = commercial_arrangements.organisation_id
20260827232920_phase1_core_org_resources.sql:171: -- organisation_id already set NOT NULL and user_id already removed via direct
20260827232920_phase1_core_org_resources.sql:174: ALTER TABLE kira_instances ALTER COLUMN organisation_id SET NOT NULL;
20260827232920_phase1_core_org_resources.sql:183: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:192: WHERE om.organisation_id = kira_instances.organisation_id
20260827232920_phase1_core_org_resources.sql:203: WHERE om.organisation_id = kira_instances.organisation_id
20260827232920_phase1_core_org_resources.sql:225: -- organisation_id already set NOT NULL and user_id already removed via direct
20260827232920_phase1_core_org_resources.sql:228: ALTER TABLE kira_agents ALTER COLUMN organisation_id SET NOT NULL;
20260827232920_phase1_core_org_resources.sql:237: auth_user_has_organisation_access(organisation_id)
20260827232920_phase1_core_org_resources.sql:246: WHERE om.organisation_id = kira_agents.organisation_id
20260827232920_phase1_core_org_resources.sql:257: WHERE om.organisation_id = kira_agents.organisation_id

→ Read supabase/migrations/20260826100000_p05_canonical_identity.sql [offset=176]
→ Read supabase/migrations/20260826100000_p05_canonical_identity.sql [offset=204]

This requires building ground truth. Let me read the key canonical migrations fully, and get the complete list of canonical tables and RLS state.

← Write C:/Users/denni/AppData/Local/Temp/opencode/pattern-freq.ps1
Wrote file successfully.

I now understand the canonical picture: main repo has P0.5 org migrations; worktrees are pre-canonical. Let me build a classification analysis pipeline by examining the actual token patterns across all hit lines.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\pattern-freq.ps1"
=== PATTERN DISTRIBUTION ===
  4502  other
   370  tenant_id
   163  eq_user_id
   144  auth_uid
   143  column_user_id
   120  eq_org
    68  column_org
    67  select
    58  user_dot_id
    41  where_org
    18  users_table
    13  from
    11  where_user_id
     7  update

=== TABLE REFERENCE DISTRIBUTION (top 60) ===
   768  user_id
   503  organisation_id
   197  kira_memory
   185  kira_agents
   175  kira_knowledge
   150  users
    94  business_valuations
    85  genome_entities
    84  conversations
    70  kira_tasks
    69  business
    66  client_profiles
    58  genome_facts
    52  organisation_memberships
    46  user
    46  person_id
    38  trial
    37  conversation
    36  personal
    30  organisational_knowledge
    30  auth_user_id
    30  kira_refusals
    28  business_identity
    27  genome_relationships
    23  genome_events
    20  agent_id
    20  kira_knowledge_chunks
    20  authoritative
    18  email
    17  subscription_status
    17  organisations
    16  email_logs
    16  file
    16  conversation_id
    16  kira_research_sessions
    16  stripe_subscription_id
    16  loi_commitments
    16  knowledge_id
    15  user_url
    15  user_upload
    13  kira_research
    13  kira_ready
    12  introductions
    12  org
    12  draft
    11  system
    10  files
    10  url
     9  engagement_id
     9  user_note
     9  persons
     9  auth_credentials
     8  knowledge_relationships
     8  stripe_webhook_events
     8  agent_name
     8  genome_section
     8  event_id
     8  file_name
     7  profile
     7  business_valuation_snapshots

The `other` bucket is too coarse — I need per-file classification. Let me get the complete file inventory sorted, then process files in batches.

$ pwsh -Command "Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\per-file-list.txt'" > "C:\Users\denni\AppData\Local\Temp\opencode\perfile-out.txt" 2>&1; Get-Content "C:\Users\denni\AppData\Local\Temp\opencode\perfile-out.txt"
...output truncated...

Full output saved to: C:\Users\denni\.local\share\opencode\tool-output\tool_0606ac27d001W4gy4KP7oYN6F1

   8  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-D Physical Target Schema & Migration Mapping.md
   8  C:\Users\denni\PycharmProjects\Kira\app\api\kira\email\send-kira-ready\route.ts
   8  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\pubguard\scan\save\route.ts
   8  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\business-identity\sync.ts
   8  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\pubguard\scan\save\route.ts
   8  C:\Users\denni\PycharmProjects\Kira\lib\kira\refusal-sweep.ts
   8  C:\Users\denni\PycharmProjects\Kira\lib\business-identity\sync.ts
   8  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\task-events\route.ts
   8  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\pubguard\scan\save\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\app\api\cron\auto-record-absence\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\GARETH_SHAH_INTEGRATION_SEAMS.md
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GARETH_SHAH_INTEGRATION_SEAMS.md
   7  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.7 Knowledge Layer Verification.md
   7  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.6 Implementation Traceability Matrix.md
   7  C:\Users\denni\PycharmProjects\Kira\docs\BUILD_REGISTER.md
   7  C:\Users\denni\PycharmProjects\Kira\docs\GARETH_SHAH_INTEGRATION_SEAMS.md
   7  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830191000_business_valuations_org_ownership.sql
   7  C:\Users\denni\PycharmProjects\Kira\app\api\cron\genome-classify\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\GARETH_SHAH_INTEGRATION_SEAMS.md
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\backfill-genome-register.mjs
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\memory-integrity\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\admin\(panel)\exec\[userId]\page.tsx
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\cron\memory-integrity\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\genome\file-manual.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\create\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\lookup.ts
   7  C:\Users\denni\PycharmProjects\Kira\scripts\backfill-genome-register.mjs
   7  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260901090000_beta_codes_org_nullable.sql
   7  C:\Users\denni\PycharmProjects\Kira\scripts\provision-redteam-identity.mjs
   7  C:\Users\denni\PycharmProjects\Kira\lib\kira\lookup.ts
   7  C:\Users\denni\PycharmProjects\Kira\lib\genome\file-manual.ts
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\[userId]\page.tsx
   7  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\cron\memory-integrity\route.ts
   7  C:\Users\denni\PycharmProjects\Kira\lib\kira\entity-sweep.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\apply-profile.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\email\send-kira-ready\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260810120000_public_asks_and_alert_throttle.sql
   6  C:\Users\denni\PycharmProjects\Kira\lib\genome\access-log.ts
   6  C:\Users\denni\PycharmProjects\Kira\lib\kira\knowledge-ingest.ts
   6  C:\Users\denni\PycharmProjects\Kira\scripts\rescore-valuations.mjs
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\task-events\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\reprovision-kira-agents.mjs
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\keep_document\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\knowledge\url\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\reprovision-kira-agents.mjs
   6  C:\Users\denni\PycharmProjects\Kira\lib\valuation\recompute-readiness.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\webhooks\task-events\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\lookup_contact\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\uid-tools.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\email\send-kira-ready\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-A Current Schema Inventory.md
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\search_drive\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\knowledge\url\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\apply-profile.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\knowledge-ingest.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\apply-profile.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\webhooks\task-events\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\rescore-valuations.mjs
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\knowledge\upload\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\app\api\valuation\claim\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\email\send-kira-ready\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\swarm\tool-handlers.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\mnemo.ts
   6  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260824100000_business_identity_rls.sql
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\mnemo.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\knowledge\url\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\lib\valuation\snapshots.ts
   6  C:\Users\denni\PycharmProjects\Kira\lib\kira\recall.ts
   6  C:\Users\denni\PycharmProjects\Kira\app\api\kira\knowledge\url\route.ts
   6  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\swarm\tool-handlers.ts
   6  C:\Users\denni\PycharmProjects\Kira\app\dashboard\page.tsx
   6  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Phase 5E-E.md
   5  C:\Users\denni\PycharmProjects\Kira\scripts\test-task-loop.mjs
   5  C:\Users\denni\PycharmProjects\Kira\app\api\kira\chat\start\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\knowledge-ingest.ts
   5  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827110000_p04_search_knowledge_semantic_org.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\billing\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\test-task-loop.mjs
   5  C:\Users\denni\PycharmProjects\Kira\business-genome\post-call-hook.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\introducer\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\genome\derive.ts
   5  C:\Users\denni\PycharmProjects\Kira\app\api\kira\agent\complete\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\lib\kira\swarm\coordinator.ts
   5  C:\Users\denni\PycharmProjects\Kira\lib\introducer\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\introducer\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827120000_p04_match_kira_knowledge_chunks_org.sql
   5  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260901120000_absences_and_membership_guardrails.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\billing\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reconcile-tasks\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\add_email_logs.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\introducer\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\knowledge\upload\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\app\api\cron\reengagement-emails\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\billing\billing.integration.test.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\swarm\coordinator.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\genome\derive.ts
   5  C:\Users\denni\PycharmProjects\Kira\lib\kira\other-businesses.ts
   5  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-5 Decision Lifecycle Verification.md
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\billing\billing.integration.test.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\test-task-loop.mjs
   5  C:\Users\denni\PycharmProjects\Kira\lib\billing\billing.integration.test.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\create\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\create\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\knowledge-ingest.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\refusal.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\archive\add_email_logs.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\knowledge\upload\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.7 Verification Run.md
   5  C:\Users\denni\PycharmProjects\Kira\lib\kira\discovery.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\billing\billing.integration.test.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\test-task-loop.mjs
   5  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.2-A.1 Canonical Identity & Relationship Model.md
   5  C:\Users\denni\PycharmProjects\Kira\docs\LLD.md
   5  C:\Users\denni\PycharmProjects\Kira\lib\kira\swarm\drafts.ts
   5  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-2A Consultant Relationship Verification.md
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\knowledge\upload\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\billing\index.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\onboarding\complete\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\start_conversation\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\app\api\genome\redact\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\supabase\archive\add_email_logs.sql
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\genome-classify\route.ts
   5  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\archive\add_email_logs.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\valuation\snapshots.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260725120000_kira_knowledge_chunks.sql
   4  C:\Users\denni\PycharmProjects\Kira\app\my-genome\[area]\actions.ts
   4  C:\Users\denni\PycharmProjects\Kira\scripts\reprovision-agent-full.mjs
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\archive\add_conversation_messages.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\onboarding\complete\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\business-genome\VALIDATION_REPORT.md
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\valuation\snapshots.ts
   4  C:\Users\denni\PycharmProjects\Kira\scripts\lib\redteam-tools.mjs
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725160000_kira_tasks.sql
   4  C:\Users\denni\PycharmProjects\Kira\business-genome\extract.test.ts
   4  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-1C RLS Authority Transfer Verification.md
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\pubguard\v2\scan\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\swarm\coordinator.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\purge-trial-agents.mjs
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\conversation\context\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\valuation\claim\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\KIRA_COMPONENT_INTERFACE.md
   4  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827205246_phase0_auth_security.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\conversation\context\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\app\api\cron\reconcile-tasks\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\lib\genome\dedupe-sweep-apply.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\archive\add_conversation_messages.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\other-businesses.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\lib\redteam-tools.mjs
   4  C:\Users\denni\PycharmProjects\Kira\app\api\pubguard\v2\scan\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.4-D Physical Migration Plan.md
   4  C:\Users\denni\PycharmProjects\Kira\app\api\genome\query\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260725120000_kira_knowledge_chunks.sql
   4  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260805020000_drive_documents.sql
   4  C:\Users\denni\PycharmProjects\Kira\lib\connectors\status.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260725120000_kira_knowledge_chunks.sql
   4  C:\Users\denni\PycharmProjects\Kira\app\api\kira\knowledge\[id]\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\swarm\coordinator.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260805020000_drive_documents.sql
   4  C:\Users\denni\PycharmProjects\Kira\lib\kira\memory-contract.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\valuation\claim\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260725160000_kira_tasks.sql
   4  C:\Users\denni\PycharmProjects\Kira\app\api\kira\chat\history\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260725160000_kira_tasks.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\pubguard\v2\scan\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\onboarding\complete\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\supabase\archive\add_conversation_messages.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260725160000_kira_tasks.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\entity-sweep.ts
   4  C:\Users\denni\PycharmProjects\Kira\app\api\kira\create\one-agent-per-owner.test.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\archive\add_conversation_messages.sql
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\valuation\claim\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\conversation\context\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\scripts\purge-trial-agents.mjs
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\pubguard\v2\scan\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\genome\redact\route.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\connectors\status.ts
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725120000_kira_knowledge_chunks.sql
   4  C:\Users\denni\PycharmProjects\Kira\docs\KIRA_COMPONENT_INTERFACE.md
   4  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\valuation\snapshots.ts
   3  C:\Users\denni\PycharmProjects\Kira\components\KiraVoiceWidget.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260724000000_business_valuations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\pubguard\supabase.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\pubguard\supabase.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\tools\conversation-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\components\genome-knowledge\GenomeKnowledgeDashboard.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\components\ReferFriend.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801010000_kira_refusals.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\file_manual\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\types.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\uid-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\look_up_financials\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\knowledge\KnowledgeManager.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260720200000_client_profiles.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802030000_kira_fact_confirmations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\reengagement-emails\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\components\KiraShapeSection.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\setup\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260720200000_client_profiles.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260201100000_pubguard_user_types.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\components\KiraVoiceWidget.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260720200000_client_profiles.sql
   3  C:\Users\denni\PycharmProjects\Kira\lib\kira\confirm.test.ts
   3  C:\Users\denni\PycharmProjects\Kira\lib\kira\capability-sweep.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\LLD.md
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\types.ts
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260829140000_p24e_safe_cleanup.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\components\ReferFriend.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\components\KiraVoiceWidget.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\tools\conversation-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\kira\conversation\context\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260201100000_pubguard_user_types.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\search_drive\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\types.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\file_manual\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\cron\reengagement-emails\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\lib\kira\types.ts
   3  C:\Users\denni\PycharmProjects\Kira\scripts\reprovision-kira-agents.mjs
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\tools\conversation-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\knowledge\[id]\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260801010000_kira_refusals.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\components\ReferFriend.tsx
   3  C:\Users\denni\PycharmProjects\Kira\app\setup\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\agent\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\dashboard\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827130000_fix_missing_organisations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\knowledge\KnowledgeManager.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\capability-sweep.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260201100000_pubguard_user_types.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\pubguard\supabase.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720200000_client_profiles.sql
   3  C:\Users\denni\PycharmProjects\Kira\lib\supabase\server.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\lookup_contact\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260804060000_recall_recency_and_exclude_none.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\knowledge\[id]\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\uid-tools.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\supabase\server.ts
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260829080000_genome_entity_unique_per_org.sql
   3  C:\Users\denni\PycharmProjects\Kira\app\chat\transcript-persistence.test.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\setup\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\connectors\google-connect.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\knowledge\KnowledgeManager.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\knowledge\[id]\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260724000000_business_valuations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\look_up_financials\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\swarm\open-tasks.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\read_document\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\read_document\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\supabase\server.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\dashboard\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\refusal-sweep.ts
   3  C:\Users\denni\PycharmProjects\Kira\lib\connectors\google-connect.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\cron\reengagement-emails\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\genome\manual\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\BUILD_REGISTER.md
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260201100000_pubguard_user_types.sql
   3  C:\Users\denni\PycharmProjects\Kira\lib\kira\swarm\backfill.test.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\agent\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\dashboard\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\setup\knowledge\page.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\split-genome-entity.mjs
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260724000000_business_valuations.sql
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260724000000_business_valuations.sql
   3  C:\Users\denni\PycharmProjects\Kira\app\api\genome\query\[area]\[entity]\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\reprovision-kira-agents.mjs
   3  C:\Users\denni\PycharmProjects\Kira\scripts\split-genome-entity.mjs
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\components\KiraVoiceWidget.tsx
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\agent\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\supabase\server.ts
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260804060000_recall_recency_and_exclude_none.sql
   3  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260802030000_kira_fact_confirmations.sql
   3  C:\Users\denni\PycharmProjects\Kira\lib\pubguard\supabase.ts
   3  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\keep_document\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\app\api\genome\confirm\route.ts
   3  C:\Users\denni\PycharmProjects\Kira\components\ReferFriend.tsx
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260726000000_introducer_channel.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\GENOME_WRITE_BACK.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\verify-agent-fleet.mjs
   2  C:\Users\denni\PycharmProjects\Kira\app\drafts\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\HANDOFF_RESPONSE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\check-agent-names.mjs
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\refusal-sweep.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\admin\genome\reclassify\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\research-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-4 Kira Instance Separation Verification.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\pubguard\config.ts
   2  C:\Users\denni\PycharmProjects\Kira\components\TeamSectionClient.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\pubguard\config.ts
   2  C:\Users\denni\PycharmProjects\Kira\scripts\test-auth-context.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260720600000_fix_welcome_back_recall.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260725140000_welcome_back_newest_conversation.sql
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\area-agenda.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\CLAUDE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260727000000_welcome_back_includes_tool_saved_memories.sql
   2  C:\Users\denni\PycharmProjects\Kira\app\api\kira\ask\records-the-ask.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\scripts\reclassify-genome.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260726000000_introducer_channel.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\MIGRATION_PLAN_2026-05-19.md
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260802020000_park_memory_naming_other_entity.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\agent\complete\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\api\genome\next-questions\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\financials.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\CLAUDE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\onboard-tester.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260727000000_welcome_back_includes_tool_saved_memories.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260726000000_introducer_channel.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720000000_convai_canonical_reconcile.sql
   2  C:\Users\denni\PycharmProjects\Kira\components\AbsenceRecord.tsx
   2  C:\Users\denni\PycharmProjects\Kira\scripts\create-missing-agent.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725140000_welcome_back_newest_conversation.sql
   2  C:\Users\denni\PycharmProjects\Kira\app\api\admin\genome\reclassify\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\voice-agent-checks.ts
   2  C:\Users\denni\PycharmProjects\Kira\scripts\backfill-knowledge-chunks.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\MIGRATION_PLAN_2026-05-19.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\README.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\refusal-sweep.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\chat\start\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\agent\complete\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\text-tools.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260720600000_fix_welcome_back_recall.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\LLD.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\chat\start\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\admin\exec-reprovision.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\billing\beta-codes.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\api\genome\quality\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\docs\SUPABASE_API_KEY_MODEL_MIGRATION_VALIDATION.md
   2  C:\Users\denni\PycharmProjects\Kira\app\team\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\lib\email\unanswered-request.ts
   2  C:\Users\denni\PycharmProjects\Kira\docs\MIGRATION_PLAN_2026-05-19.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\LLD.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260720000000_convai_canonical_reconcile.sql
   2  C:\Users\denni\PycharmProjects\Kira\app\knowledge\KnowledgeManager.tsx
   2  C:\Users\denni\PycharmProjects\Kira\README.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260720600000_fix_welcome_back_recall.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\swarm\backfill.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\components\genome-knowledge\AreaKnowledgeDetail.tsx
   2  C:\Users\denni\PycharmProjects\Kira\HANDOFF_RESPONSE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260720000000_convai_canonical_reconcile.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\research-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\README.md
   2  C:\Users\denni\PycharmProjects\Kira\scripts\check-agent-names.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\text-tools.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\financials.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\confirm.test.ts
   2  C:\Users\denni\PycharmProjects\Kira\lib\admin\exec-reprovision.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802020000_park_memory_naming_other_entity.sql
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830170000_kira_agents_unique_constraint.sql
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260727000000_welcome_back_includes_tool_saved_memories.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\research-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\elevenlabs\tools\conversation-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\scripts\find-user-agents.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\README.md
   2  C:\Users\denni\PycharmProjects\Kira\app\pubguard\config.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\research_organisation\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260726000000_introducer_channel.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\HANDOFF_RESPONSE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\elevenlabs\tools\conversation-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\backfill-knowledge-chunks.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\admin\exec-reprovision.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\admin\exec-reprovision.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\backfill-knowledge-chunks.mjs
   2  C:\Users\denni\PycharmProjects\Kira\app\api\kira\ask\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260727000000_welcome_back_includes_tool_saved_memories.sql
   2  C:\Users\denni\PycharmProjects\Kira\docs\SMALL_WIN_AUDIT_2026-09-01.md
   2  C:\Users\denni\PycharmProjects\Kira\app\admin\(panel)\exec\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\lib\elevenlabs\tools\conversation-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\reclassify-genome.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\chat\start\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\elevenlabs\tools\conversation-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\api\genome\conflicts\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260720000000_convai_canonical_reconcile.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\admin\(panel)\exec\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260725140000_welcome_back_newest_conversation.sql
   2  C:\Users\denni\PycharmProjects\Kira\app\api\genome\gaps\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\CLAUDE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\CLAUDE.md
   2  C:\Users\denni\PycharmProjects\Kira\docs\GENOME_WRITE_BACK.md
   2  C:\Users\denni\PycharmProjects\Kira\app\api\kira\draft\create\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260725140000_welcome_back_newest_conversation.sql
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\MIGRATION_PLAN_2026-05-19.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\backfill-knowledge-chunks.mjs
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\HANDOFF_RESPONSE.md
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\agent\complete\route.ts
   2  C:\Users\denni\PycharmProjects\Kira\app\knowledge\page.tsx
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\pubguard\config.ts
   2  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260720600000_fix_welcome_back_recall.sql
   2  C:\Users\denni\PycharmProjects\Kira\lib\kira\research-tools.ts
   2  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260816130000_genome_access_log.sql
   2  C:\Users\denni\PycharmProjects\Kira\scripts\onboard-tester.mjs
   2  C:\Users\denni\PycharmProjects\Kira\scripts\verify-agent-fleet.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\api\members\invite\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\jina\reranker.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\business-identity\index.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\check_organisations.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\REUSE_AUDIT.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260725000000_loi_commitments.sql
   1  C:\Users\denni\PycharmProjects\Kira\scripts\rebind-post-call-webhook.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\VOICE_MEMORY_CANONICAL_FIX_SCOPE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\absences\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\MIGRATION_PLAN_2026-05-19.json
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\provision-discovery-agent.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\setup\drive\actions.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\keep-document.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\keep-document.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260731090000_business_identity.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\HANDOFF_2026-08-06_CONCURRENT_SESSION.md
   1  C:\Users\denni\PycharmProjects\Kira\scripts\send-apology.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\api\genome\share\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\voice-audit\2026-07-20\kira.md
   1  C:\Users\denni\PycharmProjects\Kira\scripts\record-beta-evidence.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\lib\kira\discovery.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260120000000_reconcile_kira_agents_for_convai.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\talk\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260802210000_genome_nine_areas.sql
   1  C:\Users\denni\PycharmProjects\Kira\.tmp-prompts.mjs
   1  C:\Users\denni\PycharmProjects\Kira\components\UserShell.tsx
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md
   1  C:\Users\denni\PycharmProjects\Kira\docs\Kira-Coding - Canonical Architecture, Small-Win Flow & Implementation Conformance Audit.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\valuation\mine\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\admin\(panel)\trust\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\app\api\genome\export\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\KIRA_EXEC_BROKER_CHANNEL_BRIEF.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\REUSE_AUDIT.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260728160000_genome_sections.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\pubguard\v2\types.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260725000000_loi_commitments.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\kira\webhooks\save_message\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\genome-knowledge\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260725000000_loi_commitments.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\cron\trial-ending\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\text-tools.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\cron\trial-ending\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260728160000_genome_sections.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\loi\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\docs\HLD.md
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\area-agenda.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\valuation\mine\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\kira\discovery.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\backfill-kira-conversations.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\VOICE_MEMORY_CANONICAL_FIX_SCOPE.md
   1  C:\Users\denni\PycharmProjects\Kira\app\talk\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\app\api\genome\plan\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260731090000_business_identity.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\pubguard\v2\types.ts
   1  C:\Users\denni\PycharmProjects\Kira\docs\DECISIONS_PRACTICE_INTELLIGENCE.md
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\save-memory-dedupe.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\BROKER_CHANNEL_BUILD_STATE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\cron\trial-ending\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\business-identity\index.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\VOICE_MEMORY_CANONICAL_FIX_SCOPE.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\cron\trial-ending\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260801180000_kira_memory_parked_entity.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\business-identity\business-identity.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - Architectural Test Suite.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\PROJECT_STATUS.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\voice\telemetry\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\api\beta\redeem\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\.temp\linked-project.json
   1  C:\Users\denni\PycharmProjects\Kira\app\requests\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\docs\MIGRATION_PLAN_2026-05-19.json
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\supabase\migrations\20260728160000_genome_sections.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\setup\drive\actions.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\loi\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\api\pubguard\v2\types.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\memory-entity.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\scripts\provision-discovery-agent.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\settings\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\provision-discovery-agent.mjs
   1  C:\Users\denni\PycharmProjects\Kira\docs\MIGRATION_PLAN_2026-05-19.json
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P0.5-1D API Route Rebinding Verification.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\REUSE_AUDIT.md
   1  C:\Users\denni\PycharmProjects\Kira\docs\VOICE_MEMORY_CANONICAL_FIX_SCOPE.md
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA Coding Instructions - P0.7 Schema Archaeology Before Migration Changes.md
   1  C:\Users\denni\PycharmProjects\Kira\docs\HANDOFF_2026-08-06_CONCURRENT_SESSION.md
   1  C:\Users\denni\PycharmProjects\Kira\scripts\.tmp-prompts.mjs
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260120000000_reconcile_kira_agents_for_convai.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260120000000_reconcile_kira_agents_for_convai.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\BROKER_CHANNEL_BUILD_STATE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260725000000_loi_commitments.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\docs\MIGRATION_PLAN_2026-05-19.json
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260801180000_kira_memory_parked_entity.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\kira\webhooks\save_message\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\scripts\send-owner-invite.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\scripts\backfill-kira-conversations.mjs
   1  C:\Users\denni\PycharmProjects\Kira\app\api\members\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\tools\conversation-tools.ts
   1  C:\Users\denni\PycharmProjects\Kira\scripts\backfill-kira-conversations.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\talk\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260728160000_genome_sections.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802050000_kira_memory_privacy_classification.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\talk\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\voice-audit\2026-07-20\kira.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\genome\query\[area]\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\my-genome\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\docs\BROKER_CHANNEL_BUILD_STATE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\pubguard\v2\types.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\api\genome\export\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1 Production Architecture Derivation.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\post-call\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\kira\refusal.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\scripts\provision-discovery-agent.mjs
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\lib\jina\reranker.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\refusal.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\app\api\kira\webhooks\save_message\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\supabase\migrations\20260802210000_genome_nine_areas.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\docs\BROKER_CHANNEL_BUILD_STATE.md
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\supabase\migrations\20260120000000_reconcile_kira_agents_for_convai.sql
   1  C:\Users\denni\PycharmProjects\Kira\voice-audit\2026-07-20\kira.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\loi\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\voice-audit\2026-07-20\kira.md
   1  C:\Users\denni\PycharmProjects\Kira\app\my-genome\[area]\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\jina\reranker.ts
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260802050000_kira_memory_privacy_classification.sql
   1  C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260818090000_voice_connect_events.sql
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\api\loi\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\app\api\kira\webhooks\save_message\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\trust\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\app\genome-knowledge\[area]\page.tsx
   1  C:\Users\denni\PycharmProjects\Kira\lib\jina\reranker.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\state-save\scripts\backfill-kira-conversations.mjs
   1  C:\Users\denni\PycharmProjects\Kira\docs\REUSE_AUDIT.md
   1  C:\Users\denni\PycharmProjects\Kira\app\api\kira\discovery\start\route.ts
   1  C:\Users\denni\PycharmProjects\Kira\lib\business-identity\business-identity.test.ts
   1  C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\lib\kira\discovery.ts

TOTAL unique files: 737

→ Read P2.4-D2_CANONICAL_TRACEABILITY_AUDIT.md

Before classifying, I need to understand the repo's own classification conventions. Let me read the canonical traceability audit and the sweep script's classification logic.

→ Read P2.4-D2_CANONICAL_TRACEABILITY_AUDIT.md [offset=18]

This is a substantial audit. Let me load the canonical invariants list and the rest of the audit ground truth.

$ rg -o "INV-\d{3}" "C:\Users\denni\PycharmProjects\Kira\docs" --no-filename | Sort-Object -Unique
INV-001
INV-002
INV-003
INV-004
INV-005
INV-006
INV-007
INV-008
INV-009
INV-010
INV-011
INV-012
INV-013
INV-014
INV-015
INV-016
INV-017
INV-018
INV-019
INV-020

$ rg -n "INV-001|INV-002|INV-003|INV-004|INV-005|INV-006|INV-007|INV-008|INV-009|INV-010|INV-011|INV-012|INV-013|INV-014|INV-015|INV-016|INV-017|INV-018|INV-019|INV-020" "C:\Users\denni\PycharmProjects\KiraP2.4-B_DECISION.md" "C:\Users\denni\PycharmProjects\Kira\P2.4-B_DECISION.md" 2>$null | Select-Object -First 60
C:\Users\denni\PycharmProjects\Kira\P2.4-B_DECISION.md:4:**Authority:** Canonical Organisational Model (INV-001, INV-020), Phase 4 Audit, P2.4-A Classification
C:\Users\denni\PycharmProjects\Kira\P2.4-B_DECISION.md:26:- **INV-001 (Organisation Persistence):** Organisation is the enduring subject; valuations must survive owner/consultant/engagement changes.
C:\Users\denni\PycharmProjects\Kira\P2.4-B_DECISION.md:27:- **INV-020 (Organisational Subject Primacy):** Organisational knowledge (valuations, memory, genome) is anchored to Organisation.

✱ Grep "INV-\d{3} \(" in . · 15 matches
✱ Grep "INV-001\)|INV-001 \(" in . · 4 matches

Let me find the canonical invariant definitions doc.

✱ Glob "**/*canonical*" 4 matches
✱ Grep "INV-0[1-9][0-9]\b" in docs · 100 matches
→ Read docs/KIRA - Phase 4 Canonical Implementation Traceability Audit.md [offset=51, limit=130]

The scale is 5725 hits across 737 files. Let me get the complete file inventory list saved, then process methodically per file.

$ pwsh -Command "(Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\perfile-out.txt') -join [Environment]::NewLine" | Out-File -FilePath 'C:\Users\denni\AppData\Local\Temp\opencode\perfile-clean.txt' -Encoding utf8; Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\perfile-clean.txt' -TotalCount 5; "..."
83  C:\Users\denni\PycharmProjects\Kira\business-genome\e2e-validation.test.ts
  77  C:\Users\denni\PycharmProjects\Kira\.context\PROJECT_STATE.md
  70  C:\Users\denni\PycharmProjects\Kira\business-genome\repository.ts
  69  C:\Users\denni\PycharmProjects\Kira\docs\KIRA - P1.2 Full-Stack Traceability Matrix.md
  65  C:\Users\denni\PycharmProjects\Kira\P2.4-A_CLASSIFICATION.md
...

This audit is enormous, so I need ground truth first. Let me build the table-semantics map from the schema migrations.

$ pwsh -Command "Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira\supabase\migrations' -Filter *.sql | Sort-Object Name | ForEach-Object { $_.Name }" | Out-File 'C:\Users\denni\AppData\Local\Temp\opencode\mig-list.txt' -Encoding utf8; Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\mig-list.txt'
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
.Name: The term '.Name' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.

→ Read P2.4-D2_CANONICAL_TRACEABILITY_AUDIT.md [offset=46]

Let me read the full table inventory from the authoritative audit to build the semantic map.

→ Read P2.4-D2_CANONICAL_TRACEABILITY_AUDIT.md [offset=71]
→ Read P2.4-D2_CANONICAL_TRACEABILITY_AUDIT.md [offset=104]

← Write C:/Users/denni/AppData/Local/Temp/opencode/perfile3.ps1
Wrote file successfully.

This is a 5725-row audit. My approach: build ground truth from schema + read files, drive classification programmatically from the extracted hit+context data, and emit the complete table as an artifact. Let me get the full file inventory.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\perfile3.ps1"
ParserError: C:\Users\denni\AppData\Local\Temp\opencode\perfile3.ps1:11
Line |
  11 |  $perFile.GetEnumerator() | Sort-Object Value -Descending, Name | ForE .
     |                                                          ~
     | Missing argument in parameter list.

← Edit C:/Users/denni/AppData/Local/Temp/opencode/perfile3.ps1
Index: C:\Users\denni\AppData\Local\Temp\opencode\perfile3.ps1
===================================================================
--- C:\Users\denni\AppData\Local\Temp\opencode\perfile3.ps1
+++ C:\Users\denni\AppData\Local\Temp\opencode\perfile3.ps1
@@ -7,10 +7,11 @@
     if (-not $perFile.ContainsKey($path)) { $perFile[$path] = 0 }
     $perFile[$path]++
 }
 $out = New-Object System.Collections.Generic.List[string]
-$perFile.GetEnumerator() | Sort-Object Value -Descending, Name | ForEach-Object {
-    $out.Add(("{0}`t{1}" -f $_.Value, $_.Name))
+$sorted = $perFile.GetEnumerator() | Sort-Object { $_.Value } -Descending
+foreach ($k in $sorted) {
+    $out.Add(("{0}`t{1}" -f $k.Value, $k.Name))
 }
 $out.Add(("TOTAL_UNIQUE_FILES`t" + $perFile.Count))
 Set-Content -LiteralPath 'C:\Users\denni\AppData\Local\Temp\opencode\perfile2.tsv' -Value $out -Encoding utf8
 write-host ("written: " + $out.Count + " lines")
\ No newline at end of file


$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\perfile3.ps1"
written: 738 lines

→ Read C:/Users/denni/AppData/Local/Temp/opencode/perfile2.tsv
→ Read C:/Users/denni/AppData/Local/Temp/opencode/perfile2.tsv [offset=30]

The audit spans 737 files. Let me read the full inventory in chunks to plan the work.

→ Read C:/Users/denni/AppData/Local/Temp/opencode/perfile2.tsv [offset=50]

Now I need the full file inventory. Let me read the rest and then build the classification engine.

The manifest spans 737 files across 4 roots. Let me get the complete inventory in a manageable form to drive classification.

$ pwsh -Command "Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\perfile2.tsv' | Select-Object -Skip 69" | Out-File 'C:\Users\denni\AppData\Local\Temp\opencode\perfile-tail.tsv' -Encoding utf8; (Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\perfile-tail.tsv').Count
669

→ Read C:/Users/denni/AppData/Local/Temp/opencode/perfile2.tsv [offset=70, limit=300]

Let me inspect the context data format to ensure it can drive rigorous classification.

$ pwsh -Command "Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\hits-ctx.tsv' -TotalCount 3" | Out-File 'C:\Users\denni\AppData\Local\Temp\opencode\ctx-sample.txt' -Encoding utf8; Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\ctx-sample.txt'
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   9          3: import { createServiceClient } from '@/lib/supabase/server';|||   4: import { formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';|||   5: |||   6: export const metadata = { title: 'Manage Exec user   Admin' };|||   7: export const dynamic = 'force-dynamic';|||   8: |||>>>9: export default async function ExecUserManagePage({ params }: { params: Promise<{ userId: string }> }) {|||   10:   const { userId } = await params;|||   11:   const sb = createServiceClient();|||   12: |||   13:   const { data: user } = await sb|||   14:     .from('users')|||   15:     .select('id, email, first_name, subscription_status, created_at')|||
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   10         4: import { formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';|||   5: |||   6: export const metadata = { title: 'Manage Exec user   Admin' };|||   7: export const dynamic = 'force-dynamic';|||   8: |||   9: export default async function ExecUserManagePage({ params }: { params: Promise<{ userId: string }> }) {|||>>>10:   const { userId } = await params;|||   11:   const sb = createServiceClient();|||   12: |||   13:   const { data: user } = await sb|||   14:     .from('users')|||   15:     .select('id, email, first_name, subscription_status, created_at')|||   16:     .eq('id', userId)|||
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\au-gst\app\admin\(panel)\exec\[userId]\page.tsx   16         10:   const { userId } = await params;|||   11:   const sb = createServiceClient();|||   12: |||   13:   const { data: user } = await sb|||   14:     .from('users')|||   15:     .select('id, email, first_name, subscription_status, created_at')|||>>>16:     .eq('id', userId)|||   17:     .maybeSingle();|||   18:   if (!user) notFound();|||   19: |||   20:   const [{ data: val }, { data: agents }, { data: docs }, { data: memory }] = await Promise.all([|||   21:     sb.from('business_valuations').select('gap, worth_today, worth_potential, readiness, currency, industry').eq('user_id', userId).maybeSingle(),|||   22:     sb.from('kira_agents').select('id, agent_name, elevenlabs_agent_id, status, journey_type, total_conversations, last_conversation_at').eq('user_id', userId).neq('status', 'deleted').order('last_conversation_at', { ascending: false, nullsFirst: false }),|||

Given the scale (5725 hits, 737 files), I'll build a rule-driven classifier grounded in the extracted hit+context data, then manually review ambiguous/unsafe buckets. First, let me read the key files that determine tenant/owner semantics.

$ pwsh -Command "Get-ChildItem 'C:\Users\denni\PycharmProjects\Kira\docs' -Filter '*GARETH*' | ForEach-Object { $_.FullName }" | Out-File 'C:\Users\denni\AppData\Local\Temp\opencode\gar-f.txt' -Encoding utf8; Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\gar-f.txt'
.FullName: The term '.FullName' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.

→ Read docs/GARETH_SHAH_INTEGRATION_SEAMS.md

The `$_` interpolation bug is from double-quoted `-Command` strings. I'll always write to script files. Let me read the Gareth/Shah integration doc directly.

→ Read P2.4-D2_CANONICAL_TRACEABILITY_AUDIT.md [offset=125]

The scope is now clear. Let me read the remaining key semantic sources — the schema table map and the RLS/p07 migrations — then build the classifier.

→ Read app/api/kira/research/route.ts

This is a full audit. Let me read the largest semantic-carrying files to ground classification. Starting with the top code files.

→ Read app/api/kira/research/route.ts [offset=46]

← Write C:/Users/denni/AppData/Local/Temp/opencode/show-hits.ps1
Wrote file successfully.

Let me create a helper to inspect hits for a file with context, so I can classify carefully.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\show-hits.ps1" -Pattern "Kira\\app\\api\\kira\\research\\route.ts$" > "C:\Users\denni\AppData\Local\Temp\opencode\research-hits.txt"
(no output)

$ pwsh -Command "Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\research-hits.txt' -TotalCount 30"
===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 48 =====
   42:     if (!toolSecretOk(request)) {|||   43:       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });|||   44:     }|||   45: |||   46:     // Resolve user identity from conversation binding (server-derived, not client-supplied).|||   47:     const conversationId = request.headers.get('x-conversation-id');|||>>>48:     let userId: string | null = null;|||   49: |||   50:     if (conversationId) {|||   51:       const supabase = createServiceClientV2();|||   52:       const { data: conv } = await supabase|||   53:         .from('conversations')|||   54:         .select('user_id, organisation_id')|||

===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 54 =====
   48:     let userId: string | null = null;|||   49: |||   50:     if (conversationId) {|||   51:       const supabase = createServiceClientV2();|||   52:       const { data: conv } = await supabase|||   53:         .from('conversations')|||>>>54:         .select('user_id, organisation_id')|||   55:         .eq('id', conversationId)|||   56:         .single();|||   57:       userId = conv?.user_id ?? null;|||   58:     }|||   59: |||   60:     if (!userId) {|||

===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 57 =====
   51:       const supabase = createServiceClientV2();|||   52:       const { data: conv } = await supabase|||   53:         .from('conversations')|||   54:         .select('user_id, organisation_id')|||   55:         .eq('id', conversationId)|||   56:         .single();|||>>>57:       userId = conv?.user_id ?? null;|||   58:     }|||   59: |||   60:     if (!userId) {|||   61:       return NextResponse.json({ error: 'Unable to resolve user identity' }, { status: 401 });|||   62:     }|||   63: |||

===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 60 =====
   54:         .select('user_id, organisation_id')|||   55:         .eq('id', conversationId)|||   56:         .single();|||   57:       userId = conv?.user_id ?? null;|||   58:     }|||   59: |||>>>60:     if (!userId) {|||   61:       return NextResponse.json({ error: 'Unable to resolve user identity' }, { status: 401 });|||   62:     }|||   63: |||   64:     // Canonical organisation resolution: user_id  auth_credentials  persons  organisation_memberships|||   65:     const ctx = await resolveOrganisationFromUser(userId);|||   66:     if (!ctx) {|||

===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 64 =====
   58:     }|||   59: |||   60:     if (!userId) {|||   61:       return NextResponse.json({ error: 'Unable to resolve user identity' }, { status: 401 });|||   62:     }|||   63: |||>>>64:     // Canonical organisation resolution: user_id  auth_credentials  persons  organisation_memberships|||   65:     const ctx = await resolveOrganisationFromUser(userId);|||   66:     if (!ctx) {|||   67:       return NextResponse.json({ error: 'No active organisation membership' }, { status: 403 });|||   68:     }|||   69: |||   70:     const body = await request.json();|||

===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 65 =====
   59: |||   60:     if (!userId) {|||   61:       return NextResponse.json({ error: 'Unable to resolve user identity' }, { status: 401 });|||   62:     }|||   63: |||   64:     // Canonical organisation resolution: user_id  auth_credentials  persons  organisation_memberships|||>>>65:     const ctx = await resolveOrganisationFromUser(userId);|||   66:     if (!ctx) {|||   67:       return NextResponse.json({ error: 'No active organisation membership' }, { status: 403 });|||   68:     }|||   69: |||   70:     const body = await request.json();|||   71:     const { tool_name } = body;|||

===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 73 =====
   67:       return NextResponse.json({ error: 'No active organisation membership' }, { status: 403 });|||   68:     }|||   69: |||   70:     const body = await request.json();|||   71:     const { tool_name } = body;|||   72: |||>>>73:     console.log(`[research] Tool: ${tool_name}, Conversation: ${conversationId}, Org: ${ctx.organisationId}`);|||   74: |||   75:     switch (tool_name) {|||   76:       case 'start_research_session':|||   77:         return handleStartResearch(body, userId, ctx);|||   78:       case 'search_web':|||   79:         return handleSearchWeb(body, userId, ctx);|||

===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 77 =====
   71:     const { tool_name } = body;|||   72: |||   73:     console.log(`[research] Tool: ${tool_name}, Conversation: ${conversationId}, Org: ${ctx.organisationId}`);|||   74: |||   75:     switch (tool_name) {|||   76:       case 'start_research_session':|||>>>77:         return handleStartResearch(body, userId, ctx);|||   78:       case 'search_web':|||   79:         return handleSearchWeb(body, userId, ctx);|||   80:       case 'fetch_url':|||   81:         return handleFetchUrl(body, userId, ctx);|||   82:       case 'save_finding':|||   83:         return handleSaveFinding(body, userId, ctx);|||

===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 79 =====
   73:     console.log(`[research] Tool: ${tool_name}, Conversation: ${conversationId}, Org: ${ctx.organisationId}`);|||   74: |||   75:     switch (tool_name) {|||   76:       case 'start_research_session':|||   77:         return handleStartResearch(body, userId, ctx);|||   78:       case 'search_web':|||>>>79:         return handleSearchWeb(body, userId, ctx);|||   80:       case 'fetch_url':|||   81:         return handleFetchUrl(body, userId, ctx);|||   82:       case 'save_finding':|||   83:         return handleSaveFinding(body, userId, ctx);|||   84:       case 'search_knowledge':|||   85:         return handleSearchKnowledge(body, userId, ctx);|||

===== C:\Users\denni\PycharmProjects\Kira\app\api\kira\research\route.ts : 81 =====
   75:     switch (tool_name) {|||   76:       case 'start_research_session':|||   77:         return handleStartResearch(body, userId, ctx);|||   78:       case 'search_web':|||   79:         return handleSearchWeb(body, userId, ctx);|||   80:       case 'fetch_url':|||>>>81:         return handleFetchUrl(body, userId, ctx);|||   82:       case 'save_finding':|||   83:         return handleSaveFinding(body, userId, ctx);|||   84:       case 'search_knowledge':|||   85:         return handleSearchKnowledge(body, userId, ctx);|||   86:       case 'complete_research':|||   87:         return handleCompleteResearch(body, userId, ctx);|||

# Todos
[•] Build canonical model ground truth (org-anchored vs legacy tables, RLS, person provenance)
[ ] Categorize all 737 manifest files by role (migration/route/lib/docs/tests/scripts)
[ ] Classify every hit A/B/C/D/E using extracted context + file role
[ ] Generate complete classification table and write to audit artifact
[ ] Verify completeness: 5725 rows, zero unclassified
[ ] Compute counts, low-confidence list, ambiguous list, remediation P0-P4, legit refs, INV summary

This is a huge audit. Let me formalize my approach and set up tracking.

← Write C:/Users/denni/AppData/Local/Temp/opencode/cmp-worktrees.ps1
Wrote file successfully.

Let me check whether the two worktree snapshots are identical, which would simplify classification.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\cmp-worktrees.ps1" > "C:\Users\denni\AppData\Local\Temp\opencode\worktree-cmp-out.txt"
(no output)

$ Get-Content "C:\Users\denni\AppData\Local\Temp\opencode\worktree-cmp-out.txt"
Files in both plan-beta-copy + state-save: IDENTICAL=0  DIFF=0  MISSING=0

$ Get-Content "C:\Users\denni\AppData\Local\Temp\opencode\hits.tsv" | Select-String -Pattern "plan-beta-copy|state-save" | Select-Object -First 6
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\[userId]\page.tsx   9       userId  
export default async function ExecUserManagePage({ params }: { params: Promise<{ userId: string }> }) {
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\[userId]\page.tsx   10      
userId    const { userId } = await params;
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\[userId]\page.tsx   16      
userId      .eq('id', userId)
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\[userId]\page.tsx   21      
user_id     sb.from('business_valuations').select('gap, worth_today, worth_potential, readiness, currency, 
industry').eq('user_id', userId).maybeSingle(),
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\[userId]\page.tsx   22      
user_id     sb.from('kira_agents').select('id, agent_name, elevenlabs_agent_id, status, journey_type, 
total_conversations, last_conversation_at').eq('user_id', userId).neq('status', 
'deleted').order('last_conversation_at', { ascending: false, nullsFirst: false }),
C:\Users\denni\PycharmProjects\Kira\.claude\worktrees\plan-beta-copy\app\admin\(panel)\exec\[userId]\page.tsx   23      
user_id     sb.from('kira_knowledge').select('id, title, url, file_name, source_type, status, 
created_at').eq('user_id', userId).order('created_at', { ascending: false }),

← Write C:/Users/denni/AppData/Local/Temp/opencode/cmp-direct.ps1
Wrote file successfully.

The prefix-order bug means worktree paths were bucketed under MAIN. Let me fix and compare the two worktrees directly.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\cmp-direct.ps1" > "C:\Users\denni\AppData\Local\Temp\opencode\cmp-direct-out.txt" 2>&1; Get-Content "C:\Users\denni\AppData\Local\Temp\opencode\cmp-direct-out.txt"
plan-beta-copy exists: True
state-save exists: True
plan file count: 416
state file count: 415
only in plan: 1
only in state: 0
common files: 415  hash-identical: 414  hash-different: 1

plan-beta-copy and state-save are essentially identical (414/415 hash-identical), so one classification applies to both. Let me probe the large `tenant_id`/`tenantId` bucket since it's substantive.

$ pwsh -Command "Get-Content 'C:\Users\denni\AppData\Local\Temp\opencode\hits.tsv' | Select-String -Pattern 'tenant' | Measure-Object | Select-Object -ExpandProperty Count" > "C:\Users\denni\AppData\Local\Temp\opencode\tenant-count.txt"; Get-Content "C:\Users\denni\AppData\Local\Temp\opencode\tenant-count.txt"
487

← Write C:/Users/denni/AppData/Local/Temp/opencode/tenant-probe.ps1
Wrote file successfully.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1"
...output truncated...

Full output saved to: C:\Users\denni\.local\share\opencode\tool-output\tool_0607b80f3001CaCOZ4ov6BnvfP

InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
written 1
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..
InvalidOperation: C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe.ps1:17
Line |
  17 |          $out.Add("{0}\t{1}" -f $rel, $snippet)
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Error formatting a string: Index (zero based) must be greater than or equal to zero and less than the size of
     | the argument list..

← Write C:/Users/denni/AppData/Local/Temp/opencode/tenant-probe2.ps1
Wrote file successfully.

$ pwsh -File "C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe2.ps1" > "C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe-out.txt" 2>&1; Get-Content "C:\Users\denni\AppData\Local\Temp\opencode\tenant-probe-out.txt" -TotalCount 40
written 488

→ Read C:/Users/denni/AppData/Local/Temp/opencode/tenant-lines.txt
→ Read app/api/kira/webhooks/task-events/route.ts

The `tenantId` bucket is mostly the flat-owner legacy key in integration seams (task-events webhook, drive actions, Gareth/Shah docs). It maps to user_id in inserts — a legacy tenant/org-ownership semantic (B) or compat seam (D). Let me check the task-events route to be sure.

→ Read app/api/kira/webhooks/task-events/route.ts [offset=33]

This is a large audit. I have the full picture now. Let me build the classification engine grounded in the schema ground-truth and per-file roles. First, let me extract the definitive table-ownership map from the migrations and the audit docs.

$ rg -n "ALTER TABLE|CREATE TABLE" "C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql" "C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql" "C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260829120000_phase1e_valuation_org_ownership.sql" "C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830193000_kira_drafts_org_ownership.sql" "C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830191000_business_valuations_org_ownership.sql" "C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827100000_p04_kira_knowledge_org_scope.sql"
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827100000_p04_kira_knowledge_org_scope.sql:49:ALTER TABLE kira_knowledge
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827100000_p04_kira_knowledge_org_scope.sql:65:ALTER TABLE kira_knowledge
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827100000_p04_kira_knowledge_org_scope.sql:69:ALTER TABLE kira_knowledge
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827100000_p04_kira_knowledge_org_scope.sql:72:ALTER TABLE kira_knowledge
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260829120000_phase1e_valuation_org_ownership.sql:13:ALTER TABLE business_valuations
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830191000_business_valuations_org_ownership.sql:41:ALTER TABLE business_valuations DROP CONSTRAINT IF EXISTS business_valuations_user_uniq;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830191000_business_valuations_org_ownership.sql:46:    ALTER TABLE business_valuations DROP CONSTRAINT IF EXISTS business_valuations_org_uniq;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830191000_business_valuations_org_ownership.sql:54:ALTER TABLE business_valuations
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830193000_kira_drafts_org_ownership.sql:38:ALTER TABLE kira_drafts ADD COLUMN IF NOT EXISTS
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830193000_kira_drafts_org_ownership.sql:40:ALTER TABLE kira_drafts ADD COLUMN IF NOT EXISTS quarantine_status TEXT;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830193000_kira_drafts_org_ownership.sql:41:ALTER TABLE kira_drafts ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260830193000_kira_drafts_org_ownership.sql:42:ALTER TABLE kira_drafts ADD COLUMN IF NOT EXISTS quarantined_at TIMESTAMPTZ;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:20:ALTER TABLE business_valuations
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:22:ALTER TABLE business_valuations DROP CONSTRAINT business_valuations_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:24:ALTER TABLE business_valuation_snapshots
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:26:ALTER TABLE business_valuation_snapshots DROP CONSTRAINT business_valuation_snapshots_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:28:ALTER TABLE client_profiles
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:30:ALTER TABLE client_profiles DROP CONSTRAINT client_profiles_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:32:ALTER TABLE drive_documents
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:34:ALTER TABLE drive_documents DROP CONSTRAINT drive_documents_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:36:ALTER TABLE email_logs
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:38:ALTER TABLE email_logs DROP CONSTRAINT email_logs_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:40:ALTER TABLE beta_codes
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:42:ALTER TABLE beta_codes DROP CONSTRAINT beta_codes_redeemed_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:44:ALTER TABLE genome_item_status
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:46:ALTER TABLE genome_item_status DROP CONSTRAINT genome_item_status_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:48:ALTER TABLE genome_pathways
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:50:ALTER TABLE genome_pathways DROP CONSTRAINT genome_pathways_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:52:ALTER TABLE genome_access_log
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:54:ALTER TABLE genome_access_log DROP CONSTRAINT genome_access_log_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:56:ALTER TABLE introductions
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:58:ALTER TABLE introductions DROP CONSTRAINT introductions_owner_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:60:ALTER TABLE kira_refusals
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:62:ALTER TABLE kira_refusals DROP CONSTRAINT kira_refusals_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:64:ALTER TABLE kira_research_sessions
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:66:ALTER TABLE kira_research_sessions DROP CONSTRAINT kira_research_sessions_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:68:ALTER TABLE knowledge_files
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:70:ALTER TABLE knowledge_files DROP CONSTRAINT knowledge_files_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:72:ALTER TABLE knowledge_urls
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:74:ALTER TABLE knowledge_urls DROP CONSTRAINT knowledge_urls_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:76:ALTER TABLE loi_commitments
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:78:ALTER TABLE loi_commitments DROP CONSTRAINT loi_commitments_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:80:ALTER TABLE setup_sessions
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:82:ALTER TABLE setup_sessions DROP CONSTRAINT setup_sessions_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:84:ALTER TABLE user_feedback
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:86:ALTER TABLE user_feedback DROP CONSTRAINT user_feedback_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:88:ALTER TABLE voice_connect_events
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:90:ALTER TABLE voice_connect_events DROP CONSTRAINT voice_connect_events_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:95:ALTER TABLE kira_knowledge_chunks DROP CONSTRAINT kira_knowledge_chunks_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:100:ALTER TABLE conversations DROP CONSTRAINT conversations_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:101:ALTER TABLE conversation_messages DROP CONSTRAINT conversation_messages_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:102:ALTER TABLE kira_memory DROP CONSTRAINT kira_memory_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:103:ALTER TABLE kira_knowledge DROP CONSTRAINT kira_knowledge_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:104:ALTER TABLE genome_entities DROP CONSTRAINT genome_entities_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:105:ALTER TABLE genome_facts DROP CONSTRAINT genome_facts_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:106:ALTER TABLE genome_relationships DROP CONSTRAINT genome_relationships_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260828001718_phase1_b_legacy_resource_ownership.sql:107:ALTER TABLE genome_events DROP CONSTRAINT genome_events_user_id_fkey;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql:11:ALTER TABLE ownership_periods ENABLE ROW LEVEL SECURITY;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql:81:ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql:126:ALTER TABLE commercial_arrangements ENABLE ROW LEVEL SECURITY;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql:174:ALTER TABLE kira_instances ALTER COLUMN organisation_id SET NOT NULL;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql:177:ALTER TABLE kira_instances ENABLE ROW LEVEL SECURITY;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql:220:-- ALTER TABLE kira_instances DROP COLUMN user_id;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql:228:ALTER TABLE kira_agents ALTER COLUMN organisation_id SET NOT NULL;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql:231:ALTER TABLE kira_agents ENABLE ROW LEVEL SECURITY;
C:\Users\denni\PycharmProjects\Kira\supabase\migrations\20260827232920_phase1_core_org_resources.sql:274:-- ALTER TABLE kira_agents DROP COLUMN user_id;

(.venv) PS C:\Users\denni\PycharmProjects\Kira> 
(.venv) PS C:\Users\denni\PycharmProjects\Kira> 