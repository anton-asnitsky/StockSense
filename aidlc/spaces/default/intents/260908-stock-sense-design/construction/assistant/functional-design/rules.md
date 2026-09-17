# Assistant Business Rules

Unit: U9 Assistant (`assistant`)

Confirmation basis: the Assistant consolidated summary was confirmed as `Looks correct` on 2026-09-14.

The fenced YAML block is the source of truth. These rules define technology-agnostic Assistant decisions and boundaries. Authoritative services retain retailer membership, source data, deterministic calculations, review admission, purchasing state, audit projection, infrastructure, and presentation ownership.

## Rules summary

```yaml source-of-truth
schema_version: "1.0.0"
unit: assistant
rules:
  - id: BR1.1
    statement: "A conversation is bound to one retailer and one execution context."
    category: constraint
    applies_to: [Conversation]
    trigger: "A conversation is created."
    logic: "IF the initiating actor has current retailer authority THEN bind the conversation to that retailer, initiating actor, language, provider adapter, model identifier, and Assistant configuration version."
    violation_behavior: "Do not create the conversation when any required binding is absent or unauthorized."
    source: [FR2, FR14, NFR3, AC7.4.1, Q1]

  - id: BR1.2
    statement: "Current authority is rechecked for every turn and tool invocation."
    category: authorization
    applies_to: [ConversationTurn, ToolInvocation, Citation, AssistantActionDraft]
    trigger: "A turn starts, a tool is considered, an action is confirmed, or a citation is opened."
    logic: "IF current authentication, retailer membership, role, placement generation, and resource ownership all authorize the operation THEN continue; ELSE deny before disclosure or mutation."
    violation_behavior: "Return a safe denied or hidden-resource outcome, stop dependent work, and create no unauthorized effect."
    source: [FR2, FR14, NFR3, AC7.4.1, AC7.6.3, Q1]

  - id: BR1.3
    statement: "A bound conversation cannot switch retailer, provider, model, language, or Assistant configuration in place."
    category: policy
    applies_to: [Conversation]
    trigger: "A request would change a bound context value."
    logic: "IF a bound value would change THEN require a new authorized conversation and do not copy prior history automatically."
    violation_behavior: "Reject the in-place change and identify the need for a separate conversation."
    source: [FR14, FR15, NFR3, Q1]

  - id: BR1.4
    statement: "Only one user turn may be active in a conversation."
    category: constraint
    applies_to: [Conversation, ConversationTurn]
    trigger: "A user submits a turn."
    logic: "IF another turn is Queued or Running in the same conversation THEN reject the new turn with the active-turn reference; ELSE admit it as Queued."
    violation_behavior: "Do not queue, merge, or execute a second concurrent turn."
    source: [FR14, NFR10, AC7.4.2, AC7.11.1, Q2]

  - id: BR1.5
    statement: "Turn outcomes use a closed set of explicit states."
    category: constraint
    applies_to: [ConversationTurn]
    trigger: "A turn is admitted or its execution condition changes."
    logic: "IF a turn progresses THEN its outcome is exactly Queued, Running, Completed, Failed, Cancelled, or Uncertain, and every terminal presentation reflects the recorded outcome."
    violation_behavior: "Do not present an unrecognized, inferred-success, or ambiguous terminal state."
    source: [FR14, NFR10, AC7.4.2, AC7.11.1, Q2]

  - id: BR1.6
    statement: "Streamed fragments are provisional until a terminal turn record exists."
    category: policy
    applies_to: [ConversationTurn]
    trigger: "The Assistant emits incremental output."
    logic: "IF output is still streaming THEN treat it as provisional; WHEN the turn becomes terminal THEN retain only the terminal user-visible response, safe outcome, tool references, citation references, and correlation identity."
    violation_behavior: "Never treat or retain an interrupted fragment as the authoritative completed answer."
    source: [FR14, NFR14, AC7.4.2, Q2]

  - id: BR1.7
    statement: "Conversation memory is bounded and reproducible."
    category: policy
    applies_to: [Conversation, ConversationTurn]
    trigger: "Context is assembled for a later turn."
    logic: "IF prior context is needed THEN use a deterministic recent-turn window plus a versioned bounded summary containing visible messages, terminal responses, compact evidence references, explicit confirmations, and bounded tool-result summaries."
    violation_behavior: "Refuse unbounded context assembly and surface an explicit context-limit outcome when the bounded representation is insufficient."
    source: [FR14, NFR10, Q7]

  - id: BR1.8
    statement: "The initial Assistant accepts English execution only."
    category: validation
    applies_to: [Conversation, ConversationTurn]
    trigger: "A clearly non-English request is received."
    logic: "IF the request is clearly non-English THEN retain the visible turn, state the English-only limitation, and perform no tool call until the user restates it or explicitly confirms an English interpretation."
    violation_behavior: "Do not translate and execute silently or claim support for an unvalidated language."
    source: [FR16.1, NFR14, AC7.3.3, Q10]

  - id: BR2.1
    statement: "Only typed, declared, and allowlisted tools may be offered to or invoked by the Assistant."
    category: authorization
    applies_to: [ToolInvocation, ConversationTurn]
    trigger: "A model or user requests a capability."
    logic: "IF the capability and action are present in the server-approved tool set for the current configuration and actor context THEN it may be considered; ELSE reject it."
    violation_behavior: "Create no invocation for undeclared names, parameters, actions, or model-generated capabilities."
    source: [FR14, NFR8, AC7.4.1, AC7.4.3, Q3]

  - id: BR2.2
    statement: "Authorized read and deterministic comparison tools may run without side-effect confirmation."
    category: policy
    applies_to: [ToolInvocation]
    trigger: "A turn needs facts or a deterministic comparison to answer the user."
    logic: "IF the tool is read-only, bounded, allowlisted, and currently authorized THEN invoke it as needed within turn limits."
    violation_behavior: "Do not invoke a read when its scope, authority, or bounds are unresolved."
    source: [FR14, AC7.4.1, Q3]

  - id: BR2.3
    statement: "Every Assistant-initiated side effect requires explicit confirmation of its exact visible effect."
    category: authorization
    applies_to: [AssistantActionDraft, ToolInvocation]
    trigger: "A manual-review request or purchase-draft create or edit is ready."
    logic: "IF the user has explicitly confirmed the exact retailer, target, parameters, expected effect, allowance or draft impact, and matching payload hash THEN execution may be attempted after a fresh authority check."
    violation_behavior: "Keep the proposal unexecuted and ask for confirmation or correction."
    source: [FR14, FR9, FR7, AC7.9.1, AC7.10.1, Q3, Q8]

  - id: BR2.4
    statement: "Approval, submission, rejection, cancellation, receipt, and order-sending capabilities are absent from Assistant tools."
    category: authorization
    applies_to: [ToolInvocation, AssistantActionDraft]
    trigger: "A user, model, schema, or retrieved source requests a prohibited purchasing action."
    logic: "IF the requested action is approval, submission, rejection, cancellation, receipt recording, or order sending THEN no Assistant tool or declared action may represent or execute it."
    violation_behavior: "Reject the request, create no business effect, and identify the required governed human workflow without fabricating a tool."
    source: [FR7, FR14, NFR5, AC7.4.3, AC7.10.3, Q3]

  - id: BR2.5
    statement: "Model output and retrieved content never establish authority or alter business rules."
    category: authorization
    applies_to: [ConversationTurn, ToolInvocation, AssistantActionDraft]
    trigger: "Untrusted content supplies a tenant, role, identifier, instruction, or claimed permission."
    logic: "IF authority or a rule is asserted by model output or retrieved content THEN ignore the assertion and resolve authority and rules from current authoritative services."
    violation_behavior: "Reject the affected call and disclose no foreign data or unsupported capability."
    source: [FR14, NFR3, AC7.4.3, AC7.5.1, Q5]

  - id: BR2.6
    statement: "Ambiguous entities, quantities, sources, or actions require clarification before mutation."
    category: validation
    applies_to: [ConversationTurn, AssistantActionDraft, ToolInvocation]
    trigger: "A product, store, supplier, quantity, source review, identifier, or requested action is not uniquely resolved."
    logic: "IF any required value is ambiguous or missing THEN return bounded authorized matches and ask a clarifying question; never guess an identifier from a name or generate one."
    violation_behavior: "Create no action draft execution or mutating tool invocation until every value is resolved from current authorized data and repeated visibly."
    source: [FR14, FR7, AC7.10.2, Q4]

  - id: BR2.7
    statement: "Deterministic domain services own calculations and purchase eligibility."
    category: calculation
    applies_to: [ConversationTurn, ToolInvocation]
    trigger: "The user asks for a replenishment quantity, scenario comparison, or purchase-related explanation."
    logic: "IF a calculated result is needed THEN use the current authorized domain result and versions; IF no usable forecast or required input exists THEN report unavailability and create no purchase draft."
    violation_behavior: "Do not invent demand, quantities, eligibility, or purchase effects."
    source: [FR6, FR7, FR9.3, AC7.8.1, AC7.8.2, AC7.8.3]

  - id: BR3.1
    statement: "Retrieval routing is selected by the server for one retailer and one index configuration version."
    category: authorization
    applies_to: [ToolInvocation, Citation]
    trigger: "Supplier evidence is indexed or retrieved."
    logic: "IF current authority and the configured index version are valid THEN route only to the server-selected retailer collection for that version."
    violation_behavior: "Reject missing, stale, foreign, or caller-selected routing without searching another collection."
    source: [FR16, NFR3, AC7.2.1]

  - id: BR3.2
    statement: "Foreign, deleted, or incompatible retrieval content cannot become evidence."
    category: validation
    applies_to: [ToolInvocation, Citation]
    trigger: "Retrieved content is evaluated for use in an answer."
    logic: "IF the content belongs to another retailer, a deleted source, or a different embedding or configuration version THEN exclude it from results and citations."
    violation_behavior: "Return an explicit unavailable or incompatible result and disclose no content."
    source: [FR16, NFR3, AC7.2.2]

  - id: BR3.3
    statement: "Repeated source upserts and deletions have no duplicate retrieval effect."
    category: constraint
    applies_to: [ToolInvocation, Citation]
    trigger: "A versioned source change is replayed."
    logic: "IF the same source version and change identity were already applied THEN preserve the existing result; IF deletion is current THEN the source remains absent."
    violation_behavior: "Do not create duplicate chunks or resurrect deleted evidence."
    source: [FR16, NFR7, AC7.2.3]

  - id: BR3.4
    statement: "The default embedding choice requires a held-out English comparison of both approved candidates."
    category: policy
    applies_to: [AgentEvaluationRun]
    trigger: "An embedding default is selected or reviewed."
    logic: "IF both candidates have comparable held-out evidence for retrieval quality, citations, processor latency, memory use, and reproducible setup THEN select based on that evidence; ELSE leave the choice unresolved."
    violation_behavior: "Do not claim a winning default without the complete comparable evaluation."
    source: [FR16.1, NFR15, AC7.3.1]

  - id: BR3.5
    statement: "Embedding candidates use separate index collections."
    category: constraint
    applies_to: [AgentEvaluationRun, Citation]
    trigger: "Candidate indexes are built or queried."
    logic: "IF candidates have different dimensions or configurations THEN keep their collections and routing identities separate on the same fixtures."
    violation_behavior: "Reject mixed-dimension or mixed-configuration indexing and invalidate affected evidence."
    source: [FR16.1, AC7.3.2]

  - id: BR3.6
    statement: "Original text and language metadata are preserved without extending accepted language claims."
    category: policy
    applies_to: [Citation, AgentEvaluationRun]
    trigger: "Source text is indexed, evaluated, or later reused for another language fixture."
    logic: "IF text is processed THEN preserve its original text and language identity; IF a later language fixture is tested THEN report only the validated result."
    violation_behavior: "Do not replace source language identity or claim multilingual acceptance from English evidence."
    source: [FR16.1, NFR14, AC7.3.3, Q10]

  - id: BR3.7
    statement: "Current domain facts and accepted commercial terms outrank retrieved text and model knowledge."
    category: policy
    applies_to: [ConversationTurn, ToolInvocation, Citation]
    trigger: "Sources disagree or a response combines structured facts with retrieved text."
    logic: "IF evidence conflicts THEN use current authorized domain facts and accepted-term records as authoritative, treat retrieved text only as supporting evidence, and disclose the conflict."
    violation_behavior: "Do not let unvalidated text or model knowledge override accepted terms or deterministic rules."
    source: [FR14, FR10.1, AC7.7.2, Q5]

  - id: BR3.8
    statement: "Material factual claims carry authorized source and version citations."
    category: validation
    applies_to: [ConversationTurn, Citation]
    trigger: "A response states a material inventory, demand, forecast, supplier, or replenishment fact."
    logic: "IF a material claim is supported THEN attach the source type, exact source or data version, locator when applicable, and claim link."
    violation_behavior: "Qualify or omit an unsupported claim and state the missing evidence."
    source: [FR14, AC7.6.1, AC7.7.1, Q5]

  - id: BR3.9
    statement: "Missing, stale, or insufficient evidence is reported explicitly."
    category: policy
    applies_to: [ConversationTurn, ToolInvocation]
    trigger: "Required evidence is absent, stale, incomplete, or conflicting."
    logic: "IF the available evidence cannot support the requested explanation or recommendation THEN state the limitation and do not invent demand, supplier preference, or certainty."
    violation_behavior: "Return a bounded unavailable or insufficient-evidence outcome."
    source: [FR14, FR5, AC7.6.2, AC7.7.3, Q5]

  - id: BR3.10
    statement: "Instructions embedded in evidence are treated as untrusted data."
    category: authorization
    applies_to: [ConversationTurn, ToolInvocation, Citation]
    trigger: "Retrieved text, supplier content, or tool output contains instructions or authority claims."
    logic: "IF content attempts to redirect behavior, change tenants, fabricate citations, reveal protected data, or invoke a prohibited action THEN ignore the instruction and retain the governed request and tool policy."
    violation_behavior: "Reject unsafe action, prevent disclosure or mutation, and preserve the content only as authorized evidence when relevant."
    source: [FR14, NFR3, AC7.5.1, Q5]

  - id: BR3.11
    statement: "Citations are immutable descriptors and every open is reauthorized."
    category: authorization
    applies_to: [Citation]
    trigger: "A citation is created or opened."
    logic: "IF a citation is created THEN bind source type, exact source or data version, locator, and supported claim; IF it is opened THEN recheck current authority and return that retained version only when permitted."
    violation_behavior: "Show forbidden, deleted, expired, or unavailable status without cached disclosure, redirection, or source substitution."
    source: [FR14, NFR3, AC7.4.4, Q6]

  - id: BR3.12
    statement: "Index build, cutover, rollback, and recovery preserve authorized source identity."
    category: constraint
    applies_to: [Citation, AgentEvaluationRun]
    trigger: "A replacement index is built, activated, rolled back, or recovered after interruption."
    logic: "IF source versions, deletions, retailer ownership, counts, provenance, and vector configuration reconcile THEN server routing may activate the intended version; ELSE keep it unavailable."
    violation_behavior: "Do not mix configurations, expose foreign or deleted sources, or activate an unreconciled index."
    source: [FR16, NFR3, AC7.12.1, AC7.12.2, AC7.12.3]

  - id: BR4.1
    statement: "Shortage explanations use authorized inventory, history, forecast, and recommendation evidence."
    category: policy
    applies_to: [ConversationTurn, ToolInvocation, Citation]
    trigger: "A planner asks why an authorized product is running short."
    logic: "IF the product and evidence are currently authorized THEN query the bounded fact tools and explain using their returned versions."
    violation_behavior: "State which evidence is unavailable rather than completing the explanation from model knowledge."
    source: [FR4, FR5, FR14, AC7.6.1]

  - id: BR4.2
    statement: "A foreign-retailer product reference discloses no product facts."
    category: authorization
    applies_to: [ConversationTurn, ToolInvocation]
    trigger: "A question names or resolves to a product outside the bound retailer."
    logic: "IF current authority does not include the product and retailer THEN stop resolution and do not reveal existence, attributes, inventory, history, or forecast data."
    violation_behavior: "Return a safe denied or not-visible outcome and audit the rejected attempt without sensitive content."
    source: [FR2, NFR3, AC7.6.3]

  - id: BR4.3
    statement: "Supplier comparisons use eligible accepted terms and their source versions."
    category: calculation
    applies_to: [ConversationTurn, ToolInvocation, Citation]
    trigger: "A planner requests a supplier comparison."
    logic: "IF eligible accepted terms exist for the bound retailer and product THEN use the deterministic comparison result and cite the accepted-term and source versions."
    violation_behavior: "Do not compare foreign, expired, unaccepted, or unsupported offers as authoritative terms."
    source: [FR6, FR10.1, FR14, AC7.7.1]

  - id: BR4.4
    statement: "Insufficient supplier evidence cannot produce a preferred supplier."
    category: validation
    applies_to: [ConversationTurn, ToolInvocation]
    trigger: "A supplier recommendation is requested."
    logic: "IF eligible comparable accepted terms are incomplete or absent THEN disclose insufficiency and return no preferred supplier."
    violation_behavior: "Do not infer a preference from retrieved prose, partial terms, or model knowledge."
    source: [FR10.1, FR14, AC7.7.3]

  - id: BR4.5
    statement: "Replenishment explanations expose current deterministic inputs and their effects."
    category: calculation
    applies_to: [ConversationTurn, ToolInvocation, Citation]
    trigger: "A planner asks how a recommended quantity was calculated."
    logic: "IF a current authorized recommendation exists THEN explain the effects of inventory position, forecast, inbound stock, lead time, minimum quantity, pack size, and buffer using pinned input versions."
    violation_behavior: "Report stale or missing inputs and do not invent a calculation."
    source: [FR6, FR14, AC7.8.1]

  - id: BR4.6
    statement: "Scenario comparisons use domain-calculated results."
    category: calculation
    applies_to: [ConversationTurn, ToolInvocation]
    trigger: "A planner asks to change a scenario input or compare scenarios."
    logic: "IF the requested scenario is authorized and valid THEN invoke the deterministic comparison capability and explain its returned result; ELSE ask for clarification or report validation failure."
    violation_behavior: "Do not calculate or present model-invented quantities as domain results."
    source: [FR6, FR14, AC7.8.2]

  - id: BR4.7
    statement: "A confirmed manual-review request invokes the same governed operation as other user channels."
    category: policy
    applies_to: [AssistantActionDraft, ToolInvocation]
    trigger: "A planner confirms a manual-review action draft."
    logic: "IF current authority, confirmation, payload integrity, and action-draft validity pass THEN invoke the governed review admission operation and return its actual job, allowance, and outcome."
    violation_behavior: "Do not create a parallel review path, bypass admission controls, or invent a job result."
    source: [FR9, FR9.1, FR14, AC7.9.1, Q3]

  - id: BR4.8
    statement: "The Assistant cannot bypass review concurrency or allowance decisions."
    category: constraint
    applies_to: [ToolInvocation, AssistantActionDraft]
    trigger: "Review admission reports an active job or exhausted allowance."
    logic: "IF the governing service returns an existing active job, remaining allowance, reset time, or denial THEN present that result unchanged and perform no alternative admission attempt."
    violation_behavior: "Do not conceal, reset, or reinterpret the authoritative review result."
    source: [FR9, FR9.1, FR9.2, AC7.9.2]

  - id: BR4.9
    statement: "A failed accepted review retries the same job without another charge or retraining."
    category: constraint
    applies_to: [ToolInvocation]
    trigger: "A planner requests recovery of an accepted failed review."
    logic: "IF the governing service marks the job retryable THEN use its existing job identity and original idempotency identity; no new allowance charge or model retraining may be requested."
    violation_behavior: "Reject any recovery path that creates a new charged review or training action."
    source: [FR9.2, FR9.3, AC7.9.3]

  - id: BR4.10
    statement: "A conversational purchase draft is created only by the purchasing authority and remains a Draft."
    category: policy
    applies_to: [AssistantActionDraft, ToolInvocation, ConversationTurn]
    trigger: "A planner confirms clear purchase-draft intent with validated inputs."
    logic: "IF the governed draft operation succeeds THEN link the Assistant action draft to the exact authorized domain draft, supporting evidence, and terminal result and label it Draft for human review."
    violation_behavior: "Do not represent the Assistant action draft as a purchase proposal, order, submission, or approval."
    source: [FR7, FR14, AC7.10.1, AC7.10.4, Q8]

  - id: BR5.1
    statement: "An Assistant action draft is an expiring proposal with no business authority."
    category: constraint
    applies_to: [AssistantActionDraft]
    trigger: "A side effect is proposed."
    logic: "IF a manual-review request or purchase-draft mutation is proposed THEN create an expiring action draft containing resolved action type, safe visible payload, payload hash, evidence references, and confirmation state."
    violation_behavior: "Do not create an action draft for a prohibited action or treat it as a review job, purchase draft, purchase order, or authority grant."
    source: [FR14, AC7.9.1, AC7.10.1, Q8]

  - id: BR5.2
    statement: "Execution requires an unexpired confirmed action draft with unchanged payload and current authority."
    category: validation
    applies_to: [AssistantActionDraft, ToolInvocation]
    trigger: "A confirmed action draft is submitted for execution."
    logic: "IF the draft is unexpired, confirmation is explicit, the visible payload hash matches the execution payload, and current authority and evidence remain valid THEN invoke the same governed action."
    violation_behavior: "Expire or invalidate the confirmation and require a new visible draft when any bound value, payload, evidence, or authority changed."
    source: [FR14, NFR3, AC7.10.2, Q3, Q8]

  - id: BR5.3
    statement: "An executed action draft links to the actual governed result."
    category: constraint
    applies_to: [AssistantActionDraft, ToolInvocation]
    trigger: "A side-effecting tool reaches a known terminal outcome."
    logic: "IF the governing service returns a review job or purchase draft THEN link its exact identifier and outcome to the action draft without changing the action draft into that domain resource."
    violation_behavior: "Do not fabricate, replace, or detach the governed result identity."
    source: [FR14, AC7.9.1, AC7.10.4, Q8]

  - id: BR5.4
    statement: "Generated user interfaces follow versioned server-defined schemas and allowlists."
    category: validation
    applies_to: [ConversationTurn, AssistantActionDraft]
    trigger: "A result or confirmation is represented as generated user interface data."
    logic: "IF the schema version, component types, typed display data, and declared actions are allowlisted by the server THEN the representation may be rendered."
    violation_behavior: "Reject unknown schemas, components, fields, or actions and fall back to a safe textual outcome."
    source: [FR14, NFR14, AC7.4.2, Q8a]

  - id: BR5.5
    statement: "Model output cannot supply executable user-interface behavior or hidden authority."
    category: authorization
    applies_to: [ConversationTurn, AssistantActionDraft]
    trigger: "Model output supplies generated interface content."
    logic: "IF output contains executable component code, markup, scripts, event handlers, authority claims, or hidden mutation parameters THEN exclude it from the rendered schema and from action execution."
    violation_behavior: "Reject the unsafe representation and create no action from it."
    source: [FR14, AC7.5.1, Q8a]

  - id: BR5.6
    statement: "A side-effecting invocation identity is persisted before the external effect is requested."
    category: constraint
    applies_to: [ToolInvocation, AssistantActionDraft]
    trigger: "A confirmed side-effecting action is ready to call its governing service."
    logic: "IF execution is authorized THEN persist invocation identity, intended target, payload hash, and idempotency key before issuing the call."
    violation_behavior: "Do not issue the side effect without a durable reconciliation identity."
    source: [FR14, NFR7, AC7.11.2, Q9]

  - id: BR5.7
    statement: "Cancellation stops further work but never claims to reverse a committed effect."
    category: policy
    applies_to: [ConversationTurn, ToolInvocation, AssistantActionDraft]
    trigger: "Cancellation or a configured execution limit stops a turn."
    logic: "IF cancellation occurs THEN stop new calls, preserve completed job or draft identities, and distinguish committed, incomplete, and uncertain actions in the terminal result."
    violation_behavior: "Do not report that a committed review charge, job, or purchase draft was undone."
    source: [FR14, NFR10, AC7.11.1, AC7.11.4, Q9]

  - id: BR5.8
    statement: "Uncertain side effects are reconciled before any retry."
    category: constraint
    applies_to: [ToolInvocation, ConversationTurn]
    trigger: "A side-effecting response is lost, times out, or remains uncertain."
    logic: "IF the outcome is uncertain THEN query or reconcile the original invocation with the same idempotency key and payload hash before deciding whether a retry is permitted; never switch providers for recovery."
    violation_behavior: "Keep the action Uncertain, give safe correlation-based guidance without secrets, and do not create a duplicate effect."
    source: [FR14, FR15, NFR7, NFR10, AC7.11.2, AC7.11.3, Q9]

  - id: BR6.1
    statement: "The initial generation path must demonstrate real local processor-only inference."
    category: policy
    applies_to: [GenerationProfileVersion, AgentEvaluationRun]
    trigger: "The initial local generation profile is accepted for reviewer use."
    logic: "IF a documented model and runtime can perform actual generation within the declared local profile without owner hardware, credentials, or cached artifacts THEN the path may be accepted."
    violation_behavior: "Mark the path failed or limited and do not substitute fixtures for real inference."
    source: [FR15, NFR11, NFR2, AC7.1.1]

  - id: BR6.2
    statement: "Local provider failure is explicit and never triggers automatic external fallback."
    category: policy
    applies_to: [GenerationProfileVersion, ConversationTurn]
    trigger: "The configured local provider is unavailable or fails."
    logic: "IF local generation cannot complete within its declared limits THEN return an explicit local unavailable or failed outcome."
    violation_behavior: "Do not route prompts, evidence, or tool context to an external provider automatically."
    source: [FR15, AC7.1.2, Q1]

  - id: BR6.3
    statement: "An external provider is used only through deliberate prior configuration."
    category: authorization
    applies_to: [GenerationProfileVersion, Conversation]
    trigger: "An external generation adapter is selected."
    logic: "IF the adapter, credentials, data policy, and spending policy are explicitly configured and its contract behavior is validated THEN a new conversation may bind to it."
    violation_behavior: "Reject activation and preserve the local path when deliberate configuration is incomplete."
    source: [FR15, AC7.1.3, Q1]

  - id: BR6.4
    statement: "Adversarial evaluation must prove enforced rejection without unauthorized disclosure or mutation."
    category: validation
    applies_to: [AgentEvaluationRun]
    trigger: "Assistant safety and grounding acceptance is evaluated."
    logic: "IF fixtures inject instructions, substitute tenants, fabricate citations, or request prohibited purchasing actions THEN the evaluation passes only when enforcement rejects them and no unauthorized effect occurs."
    violation_behavior: "Record any unsafe success, unsupported citation, or missing required rejection as a failed acceptance result."
    source: [FR14, FR17.1, NFR15, AC7.5.1]

  - id: BR6.5
    statement: "Completed, failed, and rejected tool actions produce bounded auditable outcomes."
    category: policy
    applies_to: [ToolInvocation, AgentEvaluationRun]
    trigger: "A tool attempt reaches an accepted, denied, failed, cancelled, or uncertain outcome."
    logic: "IF an audit record is permitted THEN identify actor, retailer, tool, target, outcome, correlation, and permitted provenance without storing hidden reasoning, secrets, credentials, full prompts, or unrestricted payloads."
    violation_behavior: "Redact prohibited content while retaining enough bounded metadata to investigate the safe outcome."
    source: [FR17.1, NFR10, AC7.5.2, Q7]

  - id: BR6.6
    statement: "Agent evaluation requires both useful authorized behavior and safe failures."
    category: validation
    applies_to: [AgentEvaluationRun]
    trigger: "An evaluation report is produced."
    logic: "IF valid read and draft cases succeed, missing evidence and failures remain explicit, and adversarial cases are safely rejected THEN report the measured outcomes; disabling all tools cannot satisfy acceptance."
    violation_behavior: "Mark incomplete, selectively omitted, or all-tools-disabled evidence as failed or limited rather than safe success."
    source: [FR14, NFR15, AC7.5.3]

  - id: BR6.7
    statement: "A clean Assistant release proves its declared boundaries through build, health, and smoke evidence."
    category: validation
    applies_to: [GenerationProfileVersion, AgentEvaluationRun]
    trigger: "A clean release candidate is reviewed."
    logic: "IF declared prerequisites produce a healthy Assistant boundary and a real local generation smoke result from a clean checkout THEN the Assistant contribution is ready for integrated review."
    violation_behavior: "Do not claim readiness from source presence or mocked generation alone."
    source: [NFR11, NFR13, AC8.1.1]

  - id: BR6.8
    statement: "Assistant presentation semantics remain consistent across supported development and production delivery modes."
    category: constraint
    applies_to: [ConversationTurn, AssistantActionDraft, Citation]
    trigger: "A client renders Assistant results in a supported delivery mode."
    logic: "IF the same versioned Assistant schema and outcome are used THEN visible state, citations, confirmations, and action payload identity must have the same meaning in every supported mode."
    violation_behavior: "Fail the integration evidence when delivery mode changes authority, state meaning, or payload identity."
    source: [NFR14, AC8.1.2]

  - id: BR6.9
    statement: "Unsupported prerequisites or prohibited dependency paths fail validation explicitly."
    category: validation
    applies_to: [GenerationProfileVersion, AgentEvaluationRun]
    trigger: "Prerequisite and dependency validation runs."
    logic: "IF a required version, capability, resource, or approved boundary is unsupported or a prohibited persistence dependency is introduced THEN fail validation before runtime acceptance."
    violation_behavior: "Report the actionable incompatibility and do not claim a successful build or smoke result."
    source: [NFR4, NFR13, AC8.1.3]

  - id: BR7.1
    statement: "Every Assistant integration has a versioned contract covering payload, authority context, tenant context, and errors."
    category: validation
    applies_to: [ToolInvocation, ConversationTurn, Citation, AssistantActionDraft]
    trigger: "An Assistant integration is added or changed."
    logic: "IF the versioned contract defines the request, response, current-authority inputs, retailer binding, stable errors, and correlation behavior THEN it may be accepted for implementation."
    violation_behavior: "Block acceptance of the integration until its contract and representative examples are complete."
    source: [NFR8, AC8.2.1]

  - id: BR7.2
    statement: "Assistant asynchronous messages have validated versioned examples and tenant context."
    category: validation
    applies_to: [ToolInvocation, AgentEvaluationRun]
    trigger: "An Assistant message producer or consumer is introduced or changed."
    logic: "IF the message schema and examples validate actor or service identity, retailer, placement generation, correlation, causation, idempotency, and data shape THEN the flow may be accepted."
    violation_behavior: "Reject invalid examples and do not enable the message flow."
    source: [NFR7, NFR8, AC8.2.2]

  - id: BR7.3
    statement: "Invalid or incompatible Assistant contract changes block the affected release."
    category: constraint
    applies_to: [ToolInvocation, ConversationTurn, Citation, AssistantActionDraft]
    trigger: "Contract validation evaluates a proposed change."
    logic: "IF examples are invalid or compatibility obligations fail THEN the affected Assistant change cannot be integrated."
    violation_behavior: "Retain the last valid contract and report the specific validation or compatibility failure."
    source: [NFR8, NFR13, AC8.2.3]

  - id: BR7.4
    statement: "The Assistant becomes ready only when its protected local dependencies and health conditions are present."
    category: validation
    applies_to: [GenerationProfileVersion, ConversationTurn]
    trigger: "The Assistant starts or reports readiness."
    logic: "IF protected credentials, persistent dependencies, local secure routing, storage, and declared resources are available THEN report ready; ELSE remain unavailable."
    violation_behavior: "Fail readiness explicitly and accept no turn that requires an unavailable dependency."
    source: [NFR2, NFR12, AC8.3.1]

  - id: BR7.5
    statement: "The Assistant cannot select or create infrastructure state backends."
    category: authorization
    applies_to: [GenerationProfileVersion]
    trigger: "Deployment or recovery configuration supplies infrastructure state information."
    logic: "IF a local or deliberately configured remote state result is supplied by the owning platform boundary THEN consume only the declared runtime outputs; the Assistant never chooses or provisions that state."
    violation_behavior: "Reject implicit backend assumptions and do not initiate external provisioning."
    source: [NFR12, AC8.3.2]

  - id: BR7.6
    statement: "Missing resources or bootstrap inputs cause explicit local unavailability."
    category: validation
    applies_to: [GenerationProfileVersion, ConversationTurn]
    trigger: "Startup or prerequisite checks detect missing disk, compute, credentials, or bootstrap inputs."
    logic: "IF any required local resource or protected input is absent THEN fail readiness with an actionable reason."
    violation_behavior: "Do not assume extra host capacity, owner resources, cloud provisioning, or external fallback."
    source: [NFR2, NFR11, NFR12, AC8.3.3]

  - id: BR7.7
    statement: "The Assistant never receives platform root, unseal, or recovery authority."
    category: authorization
    applies_to: [GenerationProfileVersion]
    trigger: "Protected bootstrap or recovery material is handled."
    logic: "IF material grants platform-wide bootstrap, root, unseal, or recovery authority THEN it remains outside the Assistant workload and conversation context."
    violation_behavior: "Deny access, prevent retention, and report the scope violation without exposing the material."
    source: [NFR6, AC8.4.1]

  - id: BR7.8
    statement: "The Assistant receives only workload-scoped credentials and must support authorized rotation."
    category: authorization
    applies_to: [GenerationProfileVersion, ToolInvocation]
    trigger: "A credential is delivered, reloaded, or rotated."
    logic: "IF the credential is authorized for the Assistant workload and exact dependency scope THEN it may be used and reloaded through the declared rotation lifecycle."
    violation_behavior: "Reject broader credentials, exclude credentials from source and state artifacts, and fail safely when reload validation fails."
    source: [NFR6, AC8.4.2]

  - id: BR7.9
    statement: "Sealed secret storage, missing credentials, or unauthorized workload identity fails safely."
    category: authorization
    applies_to: [GenerationProfileVersion, ToolInvocation, ConversationTurn]
    trigger: "The Assistant starts or accesses a protected dependency."
    logic: "IF required secrets are unavailable or workload identity is unauthorized THEN keep the affected capability unavailable and perform no call."
    violation_behavior: "Expose only a safe dependency-unavailable outcome and no secret, token, or protected configuration."
    source: [NFR6, AC8.4.3]

  - id: BR7.10
    statement: "Accepted Assistant business mutations commit their audit and publication intent atomically."
    category: constraint
    applies_to: [AssistantActionDraft, ToolInvocation]
    trigger: "An Assistant-owned action draft or invocation state mutation is accepted."
    logic: "IF the business mutation commits THEN its authoritative audit and publication intent commit with it before downstream acknowledgement."
    violation_behavior: "Roll back the mutation when required audit or publication intent cannot commit."
    source: [FR17, NFR7, AC8.5.1]

  - id: BR7.11
    statement: "Assistant message consumers recheck job and tenant authority and deduplicate effects."
    category: authorization
    applies_to: [ToolInvocation, AgentEvaluationRun]
    trigger: "A message is delivered or redelivered to an Assistant consumer."
    logic: "IF workload identity, retailer, job identity, placement generation, and message identity are valid THEN process once; IF already committed THEN return the recorded result."
    violation_behavior: "Reject unauthorized work and create no duplicate state or downstream effect."
    source: [NFR3, NFR7, AC8.5.2]

  - id: BR7.12
    statement: "Assistant retries are bounded and exhausted work remains observable and replayable only under separate authority."
    category: policy
    applies_to: [ToolInvocation, AgentEvaluationRun]
    trigger: "An asynchronous Assistant operation fails repeatedly."
    logic: "IF the configured retry bound is exhausted THEN stop automatic attempts, retain a failed or dead-letter identity, and require an authorized replay using the original identities."
    violation_behavior: "Do not retry without bound, hide exhausted work, or claim exactly-once delivery."
    source: [NFR7, AC8.5.3]

  - id: BR8.1
    statement: "Every accepted Assistant mutation has atomic actor, retailer, target, outcome, provenance, audit, and publication evidence."
    category: constraint
    applies_to: [AssistantActionDraft, ToolInvocation]
    trigger: "An Assistant-owned business mutation commits."
    logic: "IF the mutation is accepted THEN its audit and publication records identify actor, retailer, target, outcome, permitted provenance, correlation, and placement generation in the same commit boundary."
    violation_behavior: "Roll back the mutation and report failure when required authoritative evidence cannot commit."
    source: [FR17, FR17.1, AC9.1.1]

  - id: BR8.2
    statement: "Rejected Assistant attempts are auditable without making the rejected mutation valid."
    category: policy
    applies_to: [ToolInvocation, AssistantActionDraft]
    trigger: "A side effect is denied or required audit fails."
    logic: "IF required audit fails during an accepted mutation THEN roll back the mutation; IF a request is rejected THEN retain a separate safe rejection record that survives the business rollback."
    violation_behavior: "Never commit an unaudited required mutation or include protected request content in the rejection record."
    source: [FR17, FR17.1, NFR10, AC9.1.2]

  - id: BR8.3
    statement: "Assistant audit history is append-only and tenant-authorized."
    category: authorization
    applies_to: [ToolInvocation, AgentEvaluationRun]
    trigger: "Audit history is read, changed, or deleted."
    logic: "IF the caller lacks current authority for the retailer and purpose THEN disclose nothing; IF runtime update or deletion is requested THEN deny it regardless of ordinary business role."
    violation_behavior: "Preserve authoritative history and record the denied attempt through the safe rejection path."
    source: [FR17.1, NFR3, NFR4, AC9.1.3]

  - id: BR8.4
    statement: "Assistant recovery restores only protected authoritative state and reconciles it before service readiness."
    category: validation
    applies_to: [Conversation, ConversationTurn, ToolInvocation, Citation, AssistantActionDraft, GenerationProfileVersion]
    trigger: "Assistant state and credentials are restored into a clean environment."
    logic: "IF protected backups restore record counts, identities, payload hashes, outcomes, provenance, and valid workload credentials consistently THEN recovery may proceed to projection rebuild and readiness checks."
    violation_behavior: "Keep the Assistant unavailable and report mismatches without silently discarding or inventing state."
    source: [FR20, NFR9, AC9.6.1]

  - id: BR8.5
    statement: "Rebuilt Assistant-related projections preserve retained versions, deletions, and expiry."
    category: constraint
    applies_to: [Citation, AgentEvaluationRun]
    trigger: "Audit or retrieval projections are rebuilt after recovery."
    logic: "IF authoritative retained sources are replayed THEN rebuilt projections must reproduce retained versions and keep deleted or expired evidence absent before activation."
    violation_behavior: "Do not activate a projection with unreconciled counts, provenance, deletion, or expiry."
    source: [FR16, FR20, NFR9, AC9.6.2]

  - id: BR8.6
    statement: "Recovery replay and rollback preserve idempotency and report measured limits."
    category: validation
    applies_to: [ToolInvocation, AssistantActionDraft, AgentEvaluationRun]
    trigger: "A recovery exercise replays work or rolls back an Assistant release."
    logic: "IF replay or rollback completes without duplicate turns, drafts, review charges, or audit effects THEN report measured time, data loss, and limitations against the declared objectives."
    violation_behavior: "Mark recovery failed or limited and do not claim success without reconciled evidence."
    source: [FR20, NFR7, NFR15, AC9.6.3]

  - id: BR9.1
    statement: "Reviewer evidence must reproduce real local Assistant inference without owner-only assets."
    category: validation
    applies_to: [AgentEvaluationRun, GenerationProfileVersion]
    trigger: "The clean reviewer journey is executed."
    logic: "IF a clean environment follows verified prerequisites and downloads and performs real local processor-only inference without owner secrets, cached models, or owner-specific hardware THEN record the measured result."
    violation_behavior: "Mark the journey failed or limited and identify the missing prerequisite or non-reproducible dependency."
    source: [NFR11, NFR15, AC10.1.1]

  - id: BR9.2
    statement: "The reviewer journey links Assistant shortage, drafting, safety evaluation, and governed human purchasing evidence."
    category: policy
    applies_to: [AgentEvaluationRun, ConversationTurn, AssistantActionDraft]
    trigger: "The complete seeded journey is demonstrated."
    logic: "IF the Assistant explains a shortage, creates a governed purchase draft, and produces agent evaluation evidence THEN link those results to the later human approval and simulated receipt evidence without attributing those actions to the Assistant."
    violation_behavior: "Do not claim complete journey evidence when links are missing or when the Assistant is shown performing a prohibited purchasing action."
    source: [FR14, NFR15, AC10.1.2]

  - id: BR9.3
    statement: "Reviewer setup failures remain explicit and actionable."
    category: validation
    applies_to: [AgentEvaluationRun, GenerationProfileVersion]
    trigger: "A prerequisite or setup step is missing or fails."
    logic: "IF setup cannot complete THEN report the failed step, safe recovery guidance, correlation identity when available, and resulting evidence limitation."
    violation_behavior: "Do not claim a successful demo, silently skip the step, or expose credentials and secrets in diagnostics."
    source: [NFR10, NFR11, NFR15, AC10.1.3]

  - id: BR9.4
    statement: "Assistant state and generated-interface contracts expose text-equivalent, keyboard-operable outcomes."
    category: policy
    applies_to: [ConversationTurn, Citation, AssistantActionDraft]
    trigger: "A reviewer traverses Assistant results, citations, clarification, confirmation, failure, cancellation, or uncertainty."
    logic: "IF an Assistant state or action is presented THEN provide meaningful labels, visible focus behavior, text status and errors, and logical focus recovery without relying only on color or stealing focus on updates."
    violation_behavior: "Fail the affected interaction evidence until the state and action can be completed through the declared accessible behavior."
    source: [NFR14, AC10.1.4, Q8a]
```

| Rule group | Scope | Count |
| --- | --- | ---: |
| BR1 | Conversation binding, turn lifecycle, memory, and language | 8 |
| BR2 | Tool authority, consent, prohibited actions, and ambiguity | 7 |
| BR3 | Retrieval, evidence precedence, injection resistance, citations, and index lifecycle | 12 |
| BR4 | Shortage, supplier, replenishment, review, and draft behavior | 10 |
| BR5 | Action drafts, generated UI, cancellation, idempotency, and reconciliation | 8 |
| BR6 | Provider behavior, evaluation, and release readiness | 9 |
| BR7 | Contracts, local readiness, secrets, and asynchronous work | 12 |
| BR8 | Audit and recovery | 6 |
| BR9 | Reviewer journey evidence | 4 |
| **Total** |  | **76** |

## Sources

- `functional-design-questions.md`: confirmed Q1-Q10 and Q8a, including the consolidated summary confirmation.
- `unit-of-work.md`: U9 Assistant ownership, boundaries, local-first behavior, tool safety, and audit constraints.
- `unit-of-work-story-map.md`: the 20 stories whose implementing-unit assignment includes U9.
- `stories.md`: AC7.1.1-AC7.12.3, AC8.1.1-AC8.5.3, AC9.1.1-AC9.1.3, AC9.6.1-AC9.6.3, and AC10.1.1-AC10.1.4.
- `requirements.md`: FR2, FR4-FR7, FR9-FR10.1, FR14-FR17.1, FR20, and NFR2-NFR15 as cited per rule.
- `components.md`: Assistant ownership, dependencies, entities, audit relationship, and the rule that purchasing authority remains outside the Assistant.
- `contract-summary.md`: C11-C15, C18, C19, C21, shared authority and tenancy invariants, idempotency behavior, retry profiles, and deliberately absent Assistant purchasing commands.

## Assumptions & Open Questions

- Numeric context limits, recent-turn window size, summary size, action-draft lifetime, generation budgets, tool deadlines, retry counts, and reconciliation deadlines remain bounded implementation parameters; their absence does not permit unbounded behavior.
- The exact local generation model, local runtime, context and concurrency limits, embedding winner, and optional external-provider profile remain evidence-based choices. The rules require a reproducible processor-only reviewer path and prohibit automatic external fallback.
- Retrieval result limits, citation limits, forecast freshness, recovery objectives, backup expiry, and projection-lag tolerances remain upstream implementation decisions. Until fixed, the Assistant returns explicit bounded unavailable or limited outcomes.
- Future validated languages may be added by creating conversations bound to those languages; the initial accepted behavior remains English-only.
- Infrastructure, secret bootstrap, authoritative audit projection, domain calculations, review admission, purchase drafts, approvals, submission, rejection, cancellation, receipts, and order sending remain owned outside U9.
