# Assistant Functional Entity Model

The fenced YAML block is the source of truth for the Assistant unit's functional entities and relationships. Logical types describe business meaning rather than persistence or framework representations.

```yaml
functional_entity_model:
  model_id: assistant-functional-entities
  model_version: 1.0.0
  unit:
    id: U9
    name: Assistant
    logical_component: Assistant
  ownership_boundary:
    owns:
      - "Bounded conversations, turns, terminal responses, and versioned summaries."
      - "Provider and model bindings, typed tool orchestration records, citations, action confirmations, and agent evaluation evidence."
    never_owns:
      - "Retailer membership, actor roles, or tenant placement."
      - "Inventory, demand, forecasting, supplier acceptance, replenishment calculations, review allowances, purchase proposals, purchase orders, approvals, cancellations, or receipts."
      - "Arbitrary retrieval collection selection or direct access to another unit's storage."
    cross_unit_reference_rule: "Every cross-unit reference is an identifier plus the governed contract and applicable resource or schema version; it never grants storage access or authority."

  entities:
    - name: AssistantConfigurationVersion
      description: "Immutable version of the Assistant's bounded-memory, tool-registry, evidence, safety, and presentation policies."
      logical_ownership:
        owner: Assistant
        aggregate: AssistantConfiguration
        aggregate_role: aggregate_root
      attributes:
        - { name: configuration_version, logical_type: Version, required: true, unique: true, references: [], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Semantic version identifying one immutable configuration."] }
        - { name: lifecycle_status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [draft, active, retired], default: draft, min: null, max: null, constraints: ["Only an active version may bind a new conversation."] }
        - { name: recent_turn_limit, logical_type: PositiveInteger, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "deployment-configured bounded maximum", constraints: ["Must fit the configured generation input budget."] }
        - { name: summary_size_limit, logical_type: PositiveInteger, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "deployment-configured bounded maximum", constraints: ["Measured in a declared logical content unit."] }
        - { name: tool_result_summary_limit, logical_type: PositiveInteger, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "deployment-configured bounded maximum", constraints: ["Raw unrestricted tool payloads are excluded."] }
        - { name: tool_registry_version, logical_type: Version, required: true, unique: false, references: [{ entity: ToolDefinitionVersion, attribute: registry_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Pins the complete allowlist used by bound conversations."] }
        - { name: presentation_registry_version, logical_type: Version, required: true, unique: false, references: [{ entity: PresentationSchemaVersion, attribute: registry_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Pins the server-defined GenUI schema registry."] }
        - { name: supported_languages, logical_type: BoundedSetOfLanguageCodes, required: true, unique: false, references: [], allowed_values: [en], default: [en], min: 1, max: "configuration-defined", constraints: ["The initial release contains English only."] }
        - { name: created_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "creation time", min: null, max: null, constraints: ["UTC instant."] }
      entity_constraints:
        - "Activation freezes all values; a change creates a new version."
        - "The configuration cannot contain credentials, secrets, hidden reasoning, unrestricted prompts, or raw supplier documents."
        - "All limits are finite before the version becomes active."

    - name: GenerationProfileVersion
      description: "Provider-neutral, immutable generation binding offered to conversations and evaluation runs."
      logical_ownership:
        owner: Assistant
        aggregate: GenerationProfile
        aggregate_role: aggregate_root
      attributes:
        - { name: generation_profile_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Stable logical profile identity."] }
        - { name: profile_version, logical_type: Version, required: true, unique: false, references: [], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Unique with generation_profile_id."] }
        - { name: provider_adapter, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [local, bedrock], default: local, min: null, max: null, constraints: ["Provider selection is explicit and immutable for the version."] }
        - { name: provider_identifier, logical_type: Text, required: true, unique: false, references: [{ contract: C21, owner: Assistant, contract_version_required: true }], allowed_values: null, default: null, min: 1, max: "bounded identifier length", constraints: ["Names a configured provider adapter without credentials."] }
        - { name: model_identifier, logical_type: Text, required: true, unique: false, references: [{ contract: C21, owner: Assistant, contract_version_required: true }], allowed_values: null, default: null, min: 1, max: "bounded identifier length", constraints: ["The initial local candidate is Qwen-family generation."] }
        - { name: model_revision, logical_type: VersionOrDigest, required: true, unique: false, references: [{ contract: C21, owner: Assistant, contract_version_required: true }], allowed_values: null, default: null, min: 1, max: "bounded revision length", constraints: ["Must identify a reproducible artifact revision."] }
        - { name: runtime_profile_version, logical_type: Version, required: true, unique: false, references: [{ contract: C21, owner: Assistant, contract_version_required: true }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Pins runtime and generation limits."] }
        - { name: activation_policy, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [default_local, explicit_opt_in], default: default_local, min: null, max: null, constraints: ["Bedrock must use explicit_opt_in."] }
        - { name: cpu_reviewer_eligible, logical_type: Boolean, required: true, unique: false, references: [], allowed_values: [true, false], default: false, min: null, max: null, constraints: ["True only after clean CPU-path evidence exists."] }
        - { name: lifecycle_status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [draft, active, retired, unavailable], default: draft, min: null, max: null, constraints: ["Unavailable profiles produce an explicit failure."] }
      entity_constraints:
        - "generation_profile_id plus profile_version is unique."
        - "At least one active local CPU-capable profile is the default reviewer path."
        - "A Bedrock profile requires explicit deployment enablement, credentials, and spend policy outside this entity."
        - "No profile declares another provider as an automatic fallback."

    - name: ToolDefinitionVersion
      description: "One versioned, typed, allowlisted Assistant tool operation and its governed service boundary."
      logical_ownership:
        owner: Assistant
        aggregate: ToolRegistry
        aggregate_role: versioned_catalog_entry
      attributes:
        - { name: tool_definition_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Stable tool identity."] }
        - { name: registry_version, logical_type: Version, required: true, unique: false, references: [{ entity: AssistantConfigurationVersion, attribute: tool_registry_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Groups a complete allowlist."] }
        - { name: tool_name, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [query_inventory, query_demand, search_supplier_evidence, compare_accepted_supplier_terms, get_forecast_status, get_forecast_evidence, get_review_status, compare_replenishment_scenarios, request_manual_review, create_purchase_draft, edit_purchase_draft], default: null, min: null, max: null, constraints: ["Unique within registry_version."] }
        - { name: effect_class, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [read_only, deterministic_comparison, side_effect], default: read_only, min: null, max: null, constraints: ["Only the final three allowlisted names may be side_effect."] }
        - { name: target_unit, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [U4, U5, U7, U8], default: null, min: null, max: null, constraints: ["Identifies the authoritative provider; it does not grant access."] }
        - { name: governed_contract, logical_type: ContractIdentifier, required: true, unique: false, references: [{ contracts: [C11, C12, C13, C14], owner: "target service", contract_version_required: true }], allowed_values: [C11, C12, C13, C14], default: null, min: null, max: null, constraints: ["Must match target_unit and operation."] }
        - { name: operation_identifier, logical_type: Text, required: true, unique: false, references: [{ contracts: [C11, C12, C13, C14], owner: "target service", contract_version_required: true }], allowed_values: null, default: null, min: 1, max: "bounded identifier length", constraints: ["Provider-owned operation name."] }
        - { name: input_schema_version, logical_type: Version, required: true, unique: false, references: [{ contract: C01, owner: U1, contract_version_required: true }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Every invocation is validated against this version."] }
        - { name: output_schema_version, logical_type: Version, required: true, unique: false, references: [{ contract: C01, owner: U1, contract_version_required: true }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Every result is validated before model use."] }
        - { name: eligible_roles, logical_type: BoundedSetOfRoleNames, required: true, unique: false, references: [{ entity: TenantDirectory.Membership, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: [planner, manager], default: [], min: 1, max: 2, constraints: ["The authoritative provider rechecks the current role."] }
        - { name: lifecycle_status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [active, retired, disabled], default: disabled, min: null, max: null, constraints: ["Only active definitions may be invoked."] }
      entity_constraints:
        - "tool_name is unique within registry_version."
        - "Submit, approve, reject, cancel, receive, membership, role, supplier-acceptance, arbitrary-collection, and arbitrary-operation tools are forbidden and cannot appear in the registry."
        - "Each invocation supplies typed data only; model-generated identifiers never bypass current authorized resolution."

    - name: PresentationSchemaVersion
      description: "Versioned server-defined vocabulary for safe GenUI presentation and declared confirmation actions."
      logical_ownership:
        owner: Assistant
        aggregate: PresentationRegistry
        aggregate_role: versioned_catalog_entry
      attributes:
        - { name: presentation_schema_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Stable schema identity."] }
        - { name: registry_version, logical_type: Version, required: true, unique: false, references: [{ entity: AssistantConfigurationVersion, attribute: presentation_registry_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Groups approved presentation schemas."] }
        - { name: schema_version, logical_type: Version, required: true, unique: false, references: [], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Unique with presentation_schema_id."] }
        - { name: purpose, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [read_result, action_confirmation, action_result, error_or_limitation], default: null, min: null, max: null, constraints: ["Action confirmation schemas require an AssistantActionDraft."] }
        - { name: allowed_component_kinds, logical_type: BoundedSetOfEnumeration, required: true, unique: false, references: [], allowed_values: [text, key_value, table, alert, citation_list, action_summary, confirmation_control, status], default: [], min: 1, max: 8, constraints: ["The web unit maps semantic kinds to its approved UI components."] }
        - { name: allowed_action_kinds, logical_type: BoundedSetOfEnumeration, required: true, unique: false, references: [], allowed_values: [confirm, decline, clarify, open_citation], default: [], min: 0, max: 4, constraints: ["No action kind itself grants business authority."] }
        - { name: lifecycle_status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [draft, active, retired], default: draft, min: null, max: null, constraints: ["Only active schemas may create presentations."] }
      entity_constraints:
        - "The schema permits typed display data only and forbids executable code, markup, scripts, event handlers, credentials, authority claims, and hidden mutation parameters."
        - "An activated schema version is immutable."

    - name: Conversation
      description: "Tenant-bound Assistant conversation aggregate containing bounded visible history."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: aggregate_root
      attributes:
        - { name: conversation_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque stable identity."] }
        - { name: status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [active, closed], default: active, min: null, max: null, constraints: ["Closed conversations accept no new turns."] }
        - { name: created_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "creation time", min: null, max: null, constraints: ["UTC instant."] }
        - { name: closed_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Required exactly when status is closed."] }
        - { name: latest_turn_sequence, logical_type: NonNegativeInteger, required: true, unique: false, references: [], allowed_values: null, default: 0, min: 0, max: "configuration-defined conversation limit", constraints: ["Increases by one for each accepted turn."] }
        - { name: correlation_id, logical_type: Identifier, required: true, unique: false, references: [{ contract: C01, owner: U1, contract_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Starts the conversation correlation chain."] }
      entity_constraints:
        - "Exactly one immutable ConversationBinding exists for the conversation."
        - "At most one child turn may be Queued or Running at any time."
        - "History contains only visible messages, terminal responses, bounded summaries, compact evidence references, explicit confirmations, and bounded tool-result summaries."
        - "Changing retailer, actor, language, provider, model, or Assistant configuration requires a new conversation and does not copy history automatically."

    - name: ConversationBinding
      description: "Immutable tenant, actor, language, provider, model, and configuration binding for one conversation."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: immutable_owned_entity
      attributes:
        - { name: conversation_binding_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque stable identity."] }
        - { name: conversation_id, logical_type: Identifier, required: true, unique: true, references: [{ entity: Conversation, attribute: conversation_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Exactly one binding per conversation."] }
        - { name: retailer_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: TenantDirectory.Retailer, attribute: retailer_id, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Context only; never authority."] }
        - { name: initiating_actor_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: IdentityAccess.UserAccount, attribute: account_id, contract: C02, owner: U3, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Every later turn must use this actor identity."] }
        - { name: language, logical_type: LanguageCode, required: true, unique: false, references: [], allowed_values: [en], default: en, min: null, max: null, constraints: ["Clearly unsupported input cannot trigger tools until restated or explicitly confirmed in English."] }
        - { name: generation_profile_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: GenerationProfileVersion, attribute: generation_profile_id, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: null, max: null, constraints: ["Paired with generation_profile_version."] }
        - { name: generation_profile_version, logical_type: Version, required: true, unique: false, references: [{ entity: GenerationProfileVersion, attribute: profile_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Immutable for the conversation."] }
        - { name: provider_adapter, logical_type: Enumeration, required: true, unique: false, references: [{ entity: GenerationProfileVersion, attribute: provider_adapter, boundary: immutable_snapshot }], allowed_values: [local, bedrock], default: local, min: null, max: null, constraints: ["Must equal the referenced profile."] }
        - { name: model_identifier, logical_type: Text, required: true, unique: false, references: [{ entity: GenerationProfileVersion, attribute: model_identifier, boundary: immutable_snapshot }], allowed_values: null, default: null, min: 1, max: "bounded identifier length", constraints: ["Must equal the referenced profile."] }
        - { name: model_revision, logical_type: VersionOrDigest, required: true, unique: false, references: [{ entity: GenerationProfileVersion, attribute: model_revision, boundary: immutable_snapshot }], allowed_values: null, default: null, min: 1, max: "bounded revision length", constraints: ["Must equal the referenced profile."] }
        - { name: assistant_configuration_version, logical_type: Version, required: true, unique: false, references: [{ entity: AssistantConfigurationVersion, attribute: configuration_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Pins memory, tool, and presentation policies."] }
        - { name: placement_generation_at_start, logical_type: PositiveInteger, required: true, unique: false, references: [{ entity: TenantDirectory.RetailerPlacement, attribute: generation, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: 1, max: null, constraints: ["Recorded context; current placement is revalidated on every turn and authoritative call."] }
        - { name: bound_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "creation time", min: null, max: null, constraints: ["UTC instant."] }
      entity_constraints:
        - "All attributes are immutable after creation."
        - "The referenced configuration and generation profile must be active when binding occurs."
        - "A Bedrock binding is valid only when explicitly selected from enabled deployment configuration; provider failure never switches the binding."

    - name: ConversationSummary
      description: "Bounded, versioned condensation of visible conversation history used with a deterministic recent-turn window."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: versioned_owned_entity
      attributes:
        - { name: conversation_summary_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque stable identity."] }
        - { name: conversation_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: Conversation, attribute: conversation_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Parent conversation."] }
        - { name: summary_version, logical_type: PositiveInteger, required: true, unique: false, references: [], allowed_values: null, default: 1, min: 1, max: null, constraints: ["Unique and strictly increasing within conversation_id."] }
        - { name: covers_through_turn_sequence, logical_type: NonNegativeInteger, required: true, unique: false, references: [{ entity: ConversationTurn, attribute: sequence, boundary: same_aggregate }], allowed_values: null, default: 0, min: 0, max: "Conversation.latest_turn_sequence", constraints: ["Cannot cover a nonterminal or future turn."] }
        - { name: visible_summary, logical_type: BoundedText, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "AssistantConfigurationVersion.summary_size_limit", constraints: ["Contains visible facts and compact evidence references only."] }
        - { name: source_window_hash, logical_type: Digest, required: true, unique: false, references: [], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Binds the summary to its terminal source window."] }
        - { name: configuration_version, logical_type: Version, required: true, unique: false, references: [{ entity: AssistantConfigurationVersion, attribute: configuration_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Identifies the summarization policy."] }
        - { name: status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [current, superseded, invalidated], default: current, min: null, max: null, constraints: ["At most one current summary per conversation."] }
        - { name: created_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "creation time", min: null, max: null, constraints: ["UTC instant."] }
      entity_constraints:
        - "conversation_id plus summary_version is unique."
        - "The summary excludes hidden reasoning, secrets, credentials, full prompts, and unrestricted raw tool payloads."
        - "Superseding creates a new version; prior summaries are not rewritten."

    - name: ConversationTurn
      description: "One accepted user request and its single Assistant execution lifecycle."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_entity
      attributes:
        - { name: turn_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque stable identity."] }
        - { name: conversation_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: Conversation, attribute: conversation_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Parent conversation."] }
        - { name: sequence, logical_type: PositiveInteger, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configuration-defined conversation limit", constraints: ["Unique and contiguous within conversation_id."] }
        - { name: actor_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: IdentityAccess.UserAccount, attribute: account_id, contract: C02, owner: U3, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Must equal ConversationBinding.initiating_actor_id and be revalidated."] }
        - { name: user_visible_input, logical_type: BoundedText, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configuration-defined turn input limit", constraints: ["Retained as visible history; model instructions within it grant no authority."] }
        - { name: detected_language, logical_type: LanguageCodeOrUnknown, required: true, unique: false, references: [], allowed_values: [en, non_english, unknown], default: unknown, min: null, max: null, constraints: ["non_english cannot invoke tools before an English restatement or confirmed interpretation."] }
        - { name: status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [Queued, Running, Completed, Failed, Cancelled, Uncertain], default: Queued, min: null, max: null, constraints: ["Completed, Failed, Cancelled, and Uncertain are terminal."] }
        - { name: request_idempotency_key, logical_type: IdempotencyKey, required: true, unique: false, references: [{ contract: C18, owner: U11, contract_version_required: true }], allowed_values: null, default: null, min: 16, max: 128, constraints: ["Unique with conversation_id; a replay requires the same request hash."] }
        - { name: request_hash, logical_type: Digest, required: true, unique: false, references: [], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Changed payload with the same key is a conflict."] }
        - { name: correlation_id, logical_type: Identifier, required: true, unique: false, references: [{ contract: C01, owner: U1, contract_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Propagated to all calls and evidence."] }
        - { name: created_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "creation time", min: null, max: null, constraints: ["UTC instant."] }
        - { name: started_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: "created_at", max: null, constraints: ["Required once Running or terminal."] }
        - { name: terminal_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: "started_at", max: null, constraints: ["Required only for terminal status."] }
      entity_constraints:
        - "conversation_id plus sequence and conversation_id plus request_idempotency_key are each unique."
        - "A second turn is rejected while any turn in the conversation is Queued or Running."
        - "Every accepted turn revalidates current actor, retailer membership, role, placement generation, bound configuration, and bound generation profile."
        - "Cancellation stops new work but does not reverse a committed side effect."

    - name: ProvisionalResponseStream
      description: "Transient delivery state for nonauthoritative response fragments emitted while a turn runs."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: transient_owned_entity
      attributes:
        - { name: response_stream_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque delivery identity."] }
        - { name: turn_id, logical_type: Identifier, required: true, unique: true, references: [{ entity: ConversationTurn, attribute: turn_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["At most one stream per turn."] }
        - { name: status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [open, closed, discarded], default: open, min: null, max: null, constraints: ["No fragments are emitted after closed or discarded."] }
        - { name: last_fragment_sequence, logical_type: NonNegativeInteger, required: true, unique: false, references: [], allowed_values: null, default: 0, min: 0, max: "configuration-defined stream limit", constraints: ["Delivery cursor only."] }
        - { name: authoritative, logical_type: Boolean, required: true, unique: false, references: [], allowed_values: [false], default: false, min: null, max: null, constraints: ["Always false."] }
        - { name: opened_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "creation time", min: null, max: null, constraints: ["UTC instant."] }
        - { name: closed_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: "opened_at", max: null, constraints: ["Required when status is closed or discarded."] }
        - { name: expires_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "bounded delivery expiry", min: "opened_at", max: "configured transient lifetime", constraints: ["Must expire independently of conversation retention."] }
      entity_constraints:
        - "Stream fragments are provisional delivery data and never authoritative conversation history, citations, confirmations, or completed tool results."
        - "Only TerminalResponse is retained as the authoritative user-visible Assistant output."

    - name: TerminalResponse
      description: "Single retained user-visible Assistant response for a terminal turn outcome."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_entity
      attributes:
        - { name: terminal_response_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque stable identity."] }
        - { name: turn_id, logical_type: Identifier, required: true, unique: true, references: [{ entity: ConversationTurn, attribute: turn_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Exactly one for each terminal turn."] }
        - { name: outcome, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [Completed, Failed, Cancelled, Uncertain], default: null, min: null, max: null, constraints: ["Must equal the parent turn terminal status."] }
        - { name: user_visible_content, logical_type: BoundedText, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configuration-defined terminal response limit", constraints: ["Discloses conflicts, missing evidence, limitations, and uncertain effects when applicable."] }
        - { name: content_hash, logical_type: Digest, required: true, unique: false, references: [], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Binds claims and presentations to visible content."] }
        - { name: created_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "terminal time", min: null, max: null, constraints: ["UTC instant."] }
      entity_constraints:
        - "The response contains no hidden reasoning, credentials, secrets, unrestricted prompts, or unrestricted raw tool payloads."
        - "A Completed response cannot present an uncertain side effect as committed."
        - "Material factual claims follow the ResponseClaim and CitationClaimLink support constraints."

    - name: ToolInvocation
      description: "One bounded invocation of a versioned allowlisted tool within a turn."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_entity
      attributes:
        - { name: tool_invocation_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Stable invocation identity persisted before side-effect execution."] }
        - { name: turn_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: ConversationTurn, attribute: turn_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Parent turn."] }
        - { name: invocation_sequence, logical_type: PositiveInteger, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configuration-defined tool-call limit per turn", constraints: ["Unique within turn_id."] }
        - { name: tool_definition_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: ToolDefinitionVersion, attribute: tool_definition_id, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: null, max: null, constraints: ["Definition must be active in the conversation's pinned registry."] }
        - { name: tool_registry_version, logical_type: Version, required: true, unique: false, references: [{ entity: ToolDefinitionVersion, attribute: registry_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Must match the bound Assistant configuration."] }
        - { name: input_schema_version, logical_type: Version, required: true, unique: false, references: [{ entity: ToolDefinitionVersion, attribute: input_schema_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Input is rejected unless schema-valid."] }
        - { name: typed_input_summary, logical_type: BoundedTypedMap, required: true, unique: false, references: [], allowed_values: null, default: null, min: 0, max: "AssistantConfigurationVersion.tool_result_summary_limit", constraints: ["Contains resolved authorized identifiers and safe parameters only."] }
        - { name: request_hash, logical_type: Digest, required: true, unique: false, references: [], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Computed from canonical typed input and target operation."] }
        - { name: effect_class, logical_type: Enumeration, required: true, unique: false, references: [{ entity: ToolDefinitionVersion, attribute: effect_class, boundary: immutable_snapshot }], allowed_values: [read_only, deterministic_comparison, side_effect], default: null, min: null, max: null, constraints: ["Must equal the selected definition."] }
        - { name: retailer_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: TenantDirectory.Retailer, attribute: retailer_id, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Must equal the conversation binding and server-derived context."] }
        - { name: actor_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: IdentityAccess.UserAccount, attribute: account_id, contract: C02, owner: U3, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Must equal current server-derived actor context."] }
        - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: [{ entity: TenantDirectory.RetailerPlacement, attribute: generation, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: 1, max: null, constraints: ["Current generation is validated by the provider for every call attempt."] }
        - { name: status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [prepared, running, succeeded, failed, cancelled, uncertain], default: prepared, min: null, max: null, constraints: ["uncertain is allowed for lost or indeterminate side-effect responses."] }
        - { name: bounded_result_summary, logical_type: NullableBoundedTypedMap, required: false, unique: false, references: [], allowed_values: null, default: null, min: 0, max: "AssistantConfigurationVersion.tool_result_summary_limit", constraints: ["Validated against the output schema; raw unrestricted payload is not retained in conversation memory."] }
        - { name: correlation_id, logical_type: Identifier, required: true, unique: false, references: [{ contract: C01, owner: U1, contract_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Equals the parent turn correlation chain."] }
        - { name: completed_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: "invocation creation time", max: null, constraints: ["Required for terminal invocation status."] }
      entity_constraints:
        - "turn_id plus invocation_sequence is unique."
        - "Identifiers and parameters are resolved from bounded authorized matches; ambiguous names never become guessed identifiers."
        - "Every actual authoritative call attempt has a fresh AuthoritativeCallValidation."
        - "A side_effect invocation requires a current confirmed AssistantActionDraft and a SideEffectExecution persisted before the provider call."

    - name: AuthoritativeCallValidation
      description: "Evidence of the authoritative provider's fresh validation for one tool-call attempt; it records a decision but grants no reusable authority."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_evidence_entity
      attributes:
        - { name: call_validation_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque evidence identity."] }
        - { name: tool_invocation_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: ToolInvocation, attribute: tool_invocation_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Validated invocation."] }
        - { name: attempt_sequence, logical_type: PositiveInteger, required: true, unique: false, references: [], allowed_values: null, default: 1, min: 1, max: "bounded retry policy", constraints: ["Unique within tool_invocation_id."] }
        - { name: provider_unit, logical_type: Enumeration, required: true, unique: false, references: [{ contracts: [C11, C12, C13, C14], owner: "target service", contract_version_required: true }], allowed_values: [U4, U5, U7, U8], default: null, min: null, max: null, constraints: ["The named unit made the authoritative decision."] }
        - { name: validated_actor_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: IdentityAccess.UserAccount, attribute: account_id, contract: C02, owner: U3, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Must match current server-derived identity."] }
        - { name: validated_retailer_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: TenantDirectory.Retailer, attribute: retailer_id, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Must match the conversation binding."] }
        - { name: membership_id, logical_type: NullableIdentifier, required: false, unique: false, references: [{ entity: TenantDirectory.Membership, attribute: membership_id, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Absent only when denial hides or lacks a membership."] }
        - { name: membership_version, logical_type: NullableVersion, required: false, unique: false, references: [{ entity: TenantDirectory.Membership, attribute: version, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Current at validation time."] }
        - { name: validated_roles, logical_type: BoundedSetOfRoleNames, required: true, unique: false, references: [{ entity: TenantDirectory.Membership, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: [planner, manager], default: [], min: 0, max: 2, constraints: ["Provider compares these with the tool's eligible roles."] }
        - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: [{ entity: TenantDirectory.RetailerPlacement, attribute: generation, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: 1, max: null, constraints: ["Stale generations are denied."] }
        - { name: resource_scope_hash, logical_type: Digest, required: true, unique: false, references: [], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Binds validation to the exact requested resources without storing hidden authority data."] }
        - { name: request_schema_version, logical_type: Version, required: true, unique: false, references: [{ entity: ToolDefinitionVersion, attribute: input_schema_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Must be supported by the provider contract."] }
        - { name: contract_version, logical_type: Version, required: true, unique: false, references: [{ contracts: [C11, C12, C13, C14], owner: "target service", contract_version_required: true }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Pins provider semantics for this attempt."] }
        - { name: expected_target_version, logical_type: NullableVersion, required: false, unique: false, references: [{ contract: C14, owner: U8, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Required when the governed operation has versioned mutation preconditions."] }
        - { name: idempotency_check, logical_type: Enumeration, required: true, unique: false, references: [{ contract: C01, owner: U1, contract_version_required: true }], allowed_values: [not_applicable, new_key, replay_match, replay_mismatch], default: not_applicable, min: null, max: null, constraints: ["Side effects cannot proceed on replay_mismatch."] }
        - { name: decision, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [allowed, denied], default: denied, min: null, max: null, constraints: ["allowed applies to this attempt only."] }
        - { name: provider_reason_code, logical_type: Text, required: true, unique: false, references: [{ contracts: [C11, C12, C13, C14], owner: "target service", contract_version_required: true }], allowed_values: null, default: null, min: 1, max: "bounded reason-code length", constraints: ["Stable safe code; no secret detail."] }
        - { name: validated_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "validation time", min: null, max: null, constraints: ["UTC instant immediately associated with the attempt."] }
      entity_constraints:
        - "tool_invocation_id plus attempt_sequence is unique."
        - "The authoritative provider, not the Assistant or model, decides membership, role, placement, resource ownership, schema, target version, and idempotency validity."
        - "A prior allowed decision cannot be reused for another attempt."

    - name: SideEffectExecution
      description: "Durable idempotency and outcome record created before a governed Assistant side effect is called."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_entity
      attributes:
        - { name: side_effect_execution_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Stable reconciliation identity."] }
        - { name: tool_invocation_id, logical_type: Identifier, required: true, unique: true, references: [{ entity: ToolInvocation, attribute: tool_invocation_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Exactly one per side-effect invocation."] }
        - { name: action_draft_id, logical_type: Identifier, required: true, unique: true, references: [{ entity: AssistantActionDraft, attribute: action_draft_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["The confirmed action proposal."] }
        - { name: idempotency_key, logical_type: IdempotencyKey, required: true, unique: false, references: [{ contract: C01, owner: U1, contract_version_required: true }], allowed_values: null, default: null, min: 16, max: 128, constraints: ["Unique within retailer, target operation, and provider-defined scope."] }
        - { name: payload_hash, logical_type: Digest, required: true, unique: false, references: [{ entity: AssistantActionDraft, attribute: payload_hash, boundary: immutable_snapshot }], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Must equal the confirmed visible payload hash."] }
        - { name: target_operation, logical_type: Enumeration, required: true, unique: false, references: [{ contract: C14, owner: U8, contract_version_required: true }], allowed_values: [request_manual_review, create_purchase_draft, edit_purchase_draft], default: null, min: null, max: null, constraints: ["No other side effect is permitted."] }
        - { name: state, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [prepared, running, committed, incomplete, failed, uncertain], default: prepared, min: null, max: null, constraints: ["uncertain requires reconciliation before any retry."] }
        - { name: governed_result_type, logical_type: NullableEnumeration, required: false, unique: false, references: [{ entities: [Replenishment.ReviewJob, Purchasing.PurchaseProposal], contract: C14, owner: U8, resource_version_required: true }], allowed_values: [review_job, purchase_proposal], default: null, min: null, max: null, constraints: ["Set only from a validated provider result."] }
        - { name: governed_result_id, logical_type: NullableIdentifier, required: false, unique: false, references: [{ entities: [Replenishment.ReviewJob, Purchasing.PurchaseProposal], contract: C14, owner: U8, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Never generated or inferred by the model."] }
        - { name: governed_result_version, logical_type: NullableVersion, required: false, unique: false, references: [{ entities: [Replenishment.ReviewJob, Purchasing.PurchaseProposal], contract: C14, owner: U8, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Required when the provider returns a versioned result."] }
        - { name: first_attempt_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: "record creation time", max: null, constraints: ["Set immediately before the first provider call."] }
        - { name: last_observed_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: "record creation time", max: null, constraints: ["Updated by validated execution or reconciliation observations."] }
      entity_constraints:
        - "The record, invocation identity, idempotency key, intended target, and payload hash exist before the provider call."
        - "All retries and reconciliation attempts preserve the original key, payload hash, operation, retailer, and intended target."
        - "Cancellation prevents new calls and never asserts rollback of a committed review job or purchase draft."
        - "Only U8 determines whether a review job or purchase proposal was created or changed."

    - name: ReconciliationAttempt
      description: "One bounded observation or same-key replay used to resolve an uncertain side-effect outcome."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_entity
      attributes:
        - { name: reconciliation_attempt_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque attempt identity."] }
        - { name: side_effect_execution_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: SideEffectExecution, attribute: side_effect_execution_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Parent uncertain execution."] }
        - { name: attempt_sequence, logical_type: PositiveInteger, required: true, unique: false, references: [], allowed_values: null, default: 1, min: 1, max: "bounded reconciliation policy", constraints: ["Unique within side_effect_execution_id."] }
        - { name: method, logical_type: Enumeration, required: true, unique: false, references: [{ contract: C14, owner: U8, contract_version_required: true }], allowed_values: [status_lookup, replay_same_key], default: status_lookup, min: null, max: null, constraints: ["A replay uses the original key and byte-equivalent logical payload."] }
        - { name: idempotency_key, logical_type: IdempotencyKey, required: true, unique: false, references: [{ entity: SideEffectExecution, attribute: idempotency_key, boundary: immutable_snapshot }], allowed_values: null, default: null, min: 16, max: 128, constraints: ["Must equal the parent execution key."] }
        - { name: payload_hash, logical_type: Digest, required: true, unique: false, references: [{ entity: SideEffectExecution, attribute: payload_hash, boundary: immutable_snapshot }], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Must equal the parent execution hash."] }
        - { name: outcome, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [committed, not_committed, pending, failed, still_uncertain], default: still_uncertain, min: null, max: null, constraints: ["Only authoritative provider evidence may select committed or not_committed."] }
        - { name: observed_result_id, logical_type: NullableIdentifier, required: false, unique: false, references: [{ entities: [Replenishment.ReviewJob, Purchasing.PurchaseProposal], contract: C14, owner: U8, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Required when outcome is committed."] }
        - { name: observed_result_version, logical_type: NullableVersion, required: false, unique: false, references: [{ entities: [Replenishment.ReviewJob, Purchasing.PurchaseProposal], contract: C14, owner: U8, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Captured when available."] }
        - { name: started_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "attempt start", min: null, max: null, constraints: ["UTC instant."] }
        - { name: completed_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: "started_at", max: null, constraints: ["Required when an outcome is recorded."] }
      entity_constraints:
        - "side_effect_execution_id plus attempt_sequence is unique."
        - "Each attempt receives a fresh AuthoritativeCallValidation through its associated ToolInvocation attempt."
        - "No new idempotency key may be introduced while the parent state is uncertain."

    - name: Citation
      description: "Immutable descriptor of an exact authorized source or data version cited by a terminal response."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_evidence_entity
      attributes:
        - { name: citation_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque citation identity."] }
        - { name: terminal_response_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: TerminalResponse, attribute: terminal_response_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Response that exposes the citation."] }
        - { name: source_owner_unit, logical_type: Enumeration, required: true, unique: false, references: [{ contracts: [C11, C12, C13, C14, C19], owner: "source unit", contract_version_required: true }], allowed_values: [U4, U5, U7, U8, U13], default: null, min: null, max: null, constraints: ["Identifies the authoritative source owner."] }
        - { name: source_type, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [inventory_fact, demand_fact, supplier_submission, supplier_chunk, accepted_supplier_term, retrieval_index_version, forecast_run, forecast_series, review_job, replenishment_scenario, recommendation, evidence_snapshot, demo_evidence_manifest], default: null, min: null, max: null, constraints: ["Must be exposed by the governed source contract."] }
        - { name: source_identifier, logical_type: Identifier, required: true, unique: false, references: [{ entities: [Inventory.InventoryPosition, DemandHistory.DemandObservation, SupplierKnowledge.SupplierSubmission, SupplierKnowledge.DocumentChunk, SupplierKnowledge.AcceptedSupplierTerm, SupplierKnowledge.RetrievalIndexVersion, Forecasting.ForecastRun, Forecasting.ForecastSeries, Replenishment.ReviewJob, Replenishment.ReplenishmentScenario, Replenishment.ReplenishmentRecommendation, Replenishment.EvidenceSnapshot, DemoEvidence.EvidenceManifest], contracts: [C11, C12, C13, C14, C19], owner: "source unit", resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Identifier only; no direct storage locator."] }
        - { name: source_version, logical_type: VersionOrDigest, required: true, unique: false, references: [{ contracts: [C11, C12, C13, C14, C19], owner: "source unit", resource_version_required: true }], allowed_values: null, default: null, min: 1, max: "bounded version length", constraints: ["Exact retained version; never silently replaced by latest."] }
        - { name: locator_kind, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [page, row, field, range, time_range, artifact_section, record], default: record, min: null, max: null, constraints: ["Appropriate for source_type."] }
        - { name: locator, logical_type: BoundedLocator, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configured citation-locator limit", constraints: ["Contains no arbitrary storage address or secret."] }
        - { name: cited_content_hash, logical_type: NullableDigest, required: false, unique: false, references: [], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Used when the source contract exposes a safe content digest."] }
        - { name: contract_version, logical_type: Version, required: true, unique: false, references: [{ contracts: [C11, C12, C13, C14, C19], owner: "source unit", contract_version_required: true }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Pins descriptor semantics."] }
        - { name: created_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "citation creation", min: null, max: null, constraints: ["UTC instant."] }
      entity_constraints:
        - "The descriptor is immutable after the terminal response is created."
        - "Retrieval text is supporting evidence only; current authorized domain facts and accepted terms have higher precedence."
        - "Qdrant collection names, database locations, and object-store paths are not citation authority and are not exposed as selectable references."

    - name: CitationAccessAttempt
      description: "Fresh authorization and availability result for opening one immutable citation."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_evidence_entity
      attributes:
        - { name: citation_access_attempt_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque access-attempt identity."] }
        - { name: citation_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: Citation, attribute: citation_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Immutable descriptor being opened."] }
        - { name: actor_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: IdentityAccess.UserAccount, attribute: account_id, contract: C02, owner: U3, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Current server-derived actor."] }
        - { name: retailer_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: TenantDirectory.Retailer, attribute: retailer_id, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Must equal the bound retailer."] }
        - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: [{ entity: TenantDirectory.RetailerPlacement, attribute: generation, contract: "C11-C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: 1, max: null, constraints: ["Freshly validated for the open attempt."] }
        - { name: authorization_outcome, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [allowed, forbidden], default: forbidden, min: null, max: null, constraints: ["Determined by the source owner."] }
        - { name: availability_outcome, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [available, deleted, expired, unavailable, not_checked], default: not_checked, min: null, max: null, constraints: ["not_checked is required when authorization is forbidden."] }
        - { name: resolved_source_version, logical_type: NullableVersionOrDigest, required: false, unique: false, references: [{ entity: Citation, attribute: source_version, boundary: immutable_snapshot }], allowed_values: null, default: null, min: null, max: "bounded version length", constraints: ["When available, must exactly equal Citation.source_version."] }
        - { name: safe_outcome_code, logical_type: Text, required: true, unique: false, references: [{ contracts: [C11, C12, C13, C14, C19], owner: "source unit", contract_version_required: true }], allowed_values: null, default: null, min: 1, max: "bounded reason-code length", constraints: ["Does not disclose another tenant's resource existence."] }
        - { name: requested_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "access time", min: null, max: null, constraints: ["UTC instant."] }
      entity_constraints:
        - "Every citation open creates a new access attempt and reauthorizes current actor, retailer, role where applicable, placement, resource, contract, and version."
        - "A forbidden, deleted, expired, or unavailable citation is reported explicitly and never redirected to a different or latest source."

    - name: ResponseClaim
      description: "One bounded user-visible factual or limitation claim extracted from a terminal response for support accounting."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_evidence_entity
      attributes:
        - { name: response_claim_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque claim identity."] }
        - { name: terminal_response_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: TerminalResponse, attribute: terminal_response_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Parent response."] }
        - { name: claim_sequence, logical_type: PositiveInteger, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configuration-defined claim limit", constraints: ["Unique within terminal_response_id."] }
        - { name: visible_claim_text, logical_type: BoundedText, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configuration-defined claim length", constraints: ["Must be an exact visible claim or exact visible span."] }
        - { name: material, logical_type: Boolean, required: true, unique: false, references: [], allowed_values: [true, false], default: true, min: null, max: null, constraints: ["Material claims require explicit support accounting."] }
        - { name: claim_category, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [authorized_domain_fact, accepted_commercial_term, retrieved_supporting_evidence, explanation, limitation, action_outcome], default: explanation, min: null, max: null, constraints: ["Category selects evidence precedence."] }
        - { name: support_state, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [supported, conflicting, missing, not_required], default: missing, min: null, max: null, constraints: ["not_required is allowed only for nonmaterial conversational text or explicit limitations."] }
        - { name: precedence, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [current_domain_fact, accepted_term, retrieved_source, model_context, none], default: none, min: null, max: null, constraints: ["Model context cannot override the first three evidence classes."] }
      entity_constraints:
        - "terminal_response_id plus claim_sequence is unique."
        - "A material claim in supported state has at least one supporting CitationClaimLink."
        - "Conflicting or missing evidence is disclosed in the visible terminal response."
        - "A material claim cannot rely only on model context."

    - name: CitationClaimLink
      description: "Explicit many-to-many link describing how one immutable citation relates to one visible response claim."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: association_entity
      attributes:
        - { name: citation_claim_link_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque link identity."] }
        - { name: response_claim_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: ResponseClaim, attribute: response_claim_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Linked visible claim."] }
        - { name: citation_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: Citation, attribute: citation_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Linked exact source descriptor."] }
        - { name: relationship, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [supports, conflicts, contextualizes], default: supports, min: null, max: null, constraints: ["Must reflect the cited content, not model preference."] }
        - { name: evidence_precedence, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [current_domain_fact, accepted_term, retrieved_source], default: retrieved_source, min: null, max: null, constraints: ["Current domain facts and accepted terms outrank retrieved source text."] }
        - { name: support_note, logical_type: NullableBoundedText, required: false, unique: false, references: [], allowed_values: null, default: null, min: 0, max: "configured support-note limit", constraints: ["Visible or safely auditable explanation only."] }
      entity_constraints:
        - "response_claim_id plus citation_id is unique."
        - "The claim and citation must belong to the same TerminalResponse."

    - name: AssistantActionDraft
      description: "Expiring Assistant-owned proposal for a governed U8 side effect; it is a confirmation artifact and never a business purchase entity."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_entity
      attributes:
        - { name: action_draft_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Stable confirmation identity."] }
        - { name: turn_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: ConversationTurn, attribute: turn_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Turn that proposed the action."] }
        - { name: action_type, logical_type: Enumeration, required: true, unique: false, references: [{ contract: C14, owner: U8, contract_version_required: true }], allowed_values: [request_manual_review, create_purchase_draft, edit_purchase_draft], default: null, min: null, max: null, constraints: ["No submit, approve, reject, cancel, receive, or supplier-acceptance action."] }
        - { name: retailer_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: TenantDirectory.Retailer, attribute: retailer_id, contract: "C14 authority invariant", owner: U4, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Must equal ConversationBinding.retailer_id."] }
        - { name: target_type, logical_type: Enumeration, required: true, unique: false, references: [{ entities: [Replenishment.ReviewJob, Purchasing.PurchaseProposal], contract: C14, owner: U8, resource_version_required: true }], allowed_values: [retailer_review, new_purchase_draft, existing_purchase_draft], default: null, min: null, max: null, constraints: ["Must correspond to action_type."] }
        - { name: target_identifier, logical_type: NullableIdentifier, required: false, unique: false, references: [{ entities: [Replenishment.ReviewJob, Purchasing.PurchaseProposal], contract: C14, owner: U8, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Required for edit_purchase_draft; resolved from current authorized data."] }
        - { name: expected_target_version, logical_type: NullableVersion, required: false, unique: false, references: [{ entity: Purchasing.PurchaseProposal, contract: C14, owner: U8, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Required for versioned mutation of an existing draft."] }
        - { name: safe_display_payload, logical_type: BoundedTypedMap, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configuration-defined action payload limit", constraints: ["Contains every visible mutation parameter and no hidden parameter."] }
        - { name: payload_hash, logical_type: Digest, required: true, unique: false, references: [], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Canonical hash of action type, retailer, target, expected version, and safe display payload."] }
        - { name: expected_effect, logical_type: BoundedText, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configured effect-description limit", constraints: ["States the governed service effect without claiming success."] }
        - { name: allowance_or_draft_impact, logical_type: BoundedText, required: true, unique: false, references: [{ entities: [Replenishment.ManualReviewAllowance, Purchasing.PurchaseProposal], contract: C14, owner: U8, resource_version_required: true }], allowed_values: null, default: null, min: 1, max: "configured impact-description limit", constraints: ["For review requests, discloses allowance impact; for draft changes, discloses draft impact."] }
        - { name: status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [proposed, confirmed, declined, expired, executing, completed, failed, uncertain], default: proposed, min: null, max: null, constraints: ["Only confirmed may transition to executing, and only before expiry."] }
        - { name: created_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "creation time", min: null, max: null, constraints: ["UTC instant."] }
        - { name: expires_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "configured short confirmation lifetime", min: "created_at", max: "configured action-draft lifetime", constraints: ["Must be checked immediately before invocation."] }
      entity_constraints:
        - "All required identifiers and parameters are resolved from current authorized data before the draft is presented."
        - "Confirmation applies only to the exact visible payload hash and unexpired draft."
        - "The draft never becomes a ReviewJob, PurchaseProposal, PurchaseOrder, approval, cancellation, or receipt and grants no authority."
        - "Execution requires fresh provider validation of actor, retailer, role, placement, resource, schema, target version, and idempotency."

    - name: ActionConfirmation
      description: "Explicit user decision on the exact visible payload of one AssistantActionDraft."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_entity
      attributes:
        - { name: action_confirmation_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque confirmation identity."] }
        - { name: action_draft_id, logical_type: Identifier, required: true, unique: true, references: [{ entity: AssistantActionDraft, attribute: action_draft_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["At most one terminal decision per draft."] }
        - { name: actor_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: IdentityAccess.UserAccount, attribute: account_id, contract: C02, owner: U3, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Must equal current actor and bound initiating actor."] }
        - { name: decision, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [confirm, decline], default: null, min: null, max: null, constraints: ["Silence, model inference, and ambiguous text are not confirmation."] }
        - { name: confirmed_payload_hash, logical_type: Digest, required: true, unique: false, references: [{ entity: AssistantActionDraft, attribute: payload_hash, boundary: immutable_snapshot }], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Must equal the visible draft hash for either decision."] }
        - { name: disclosure_version, logical_type: Version, required: true, unique: false, references: [{ entity: PresentationSchemaVersion, attribute: schema_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Identifies the exact retailer, target, parameters, effect, and impact disclosure."] }
        - { name: channel, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [genui, fixed_ui], default: genui, min: null, max: null, constraints: ["Both channels enforce the same governed tool boundary."] }
        - { name: decided_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "decision time", min: "AssistantActionDraft.created_at", max: "AssistantActionDraft.expires_at", constraints: ["A late confirmation is rejected and the draft expires."] }
        - { name: correlation_id, logical_type: Identifier, required: true, unique: false, references: [{ contract: C01, owner: U1, contract_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Links decision to the turn and later invocation."] }
      entity_constraints:
        - "A confirm decision changes only AssistantActionDraft confirmation state; it does not perform or authorize a business mutation by itself."
        - "The authoritative provider revalidates current authority after confirmation and before mutation."

    - name: GenUIPresentation
      description: "Validated typed presentation instance rendered from a server-defined schema, including action-draft confirmation views."
      logical_ownership:
        owner: Assistant
        aggregate: Conversation
        aggregate_role: owned_presentation_entity
      attributes:
        - { name: genui_presentation_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Opaque presentation identity."] }
        - { name: turn_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: ConversationTurn, attribute: turn_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Owning conversation turn."] }
        - { name: terminal_response_id, logical_type: NullableIdentifier, required: false, unique: false, references: [{ entity: TerminalResponse, attribute: terminal_response_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Required for a terminal result presentation; absent while an action confirmation is pending."] }
        - { name: action_draft_id, logical_type: NullableIdentifier, required: false, unique: false, references: [{ entity: AssistantActionDraft, attribute: action_draft_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Required for action_confirmation or action_result purpose."] }
        - { name: presentation_schema_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: PresentationSchemaVersion, attribute: presentation_schema_id, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: null, max: null, constraints: ["Active server-defined schema."] }
        - { name: schema_version, logical_type: Version, required: true, unique: false, references: [{ entity: PresentationSchemaVersion, attribute: schema_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Must be active in the conversation's pinned registry."] }
        - { name: purpose, logical_type: Enumeration, required: true, unique: false, references: [{ entity: PresentationSchemaVersion, attribute: purpose, boundary: immutable_snapshot }], allowed_values: [read_result, action_confirmation, action_result, error_or_limitation], default: null, min: null, max: null, constraints: ["Must equal the selected schema purpose."] }
        - { name: typed_display_data, logical_type: BoundedTypedMap, required: true, unique: false, references: [], allowed_values: null, default: null, min: 0, max: "configuration-defined presentation limit", constraints: ["Validated data only; no executable content or hidden parameters."] }
        - { name: display_data_hash, logical_type: Digest, required: true, unique: false, references: [], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Binds the rendered data."] }
        - { name: visible_payload_hash, logical_type: NullableDigest, required: false, unique: false, references: [{ entity: AssistantActionDraft, attribute: payload_hash, boundary: immutable_snapshot }], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Required and equal to the draft hash for action_confirmation."] }
        - { name: component_kinds, logical_type: BoundedSetOfEnumeration, required: true, unique: false, references: [{ entity: PresentationSchemaVersion, attribute: allowed_component_kinds, boundary: internal_versioned_reference }], allowed_values: [text, key_value, table, alert, citation_list, action_summary, confirmation_control, status], default: [], min: 1, max: 8, constraints: ["Every kind must be allowed by the schema."] }
        - { name: declared_actions, logical_type: BoundedSetOfEnumeration, required: true, unique: false, references: [{ entity: PresentationSchemaVersion, attribute: allowed_action_kinds, boundary: internal_versioned_reference }], allowed_values: [confirm, decline, clarify, open_citation], default: [], min: 0, max: 4, constraints: ["Every action must be declared and schema-allowed."] }
        - { name: status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [active, superseded, expired], default: active, min: null, max: null, constraints: ["Expired presentations cannot confirm actions."] }
        - { name: created_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "creation time", min: null, max: null, constraints: ["UTC instant."] }
        - { name: expires_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: "created_at", max: "AssistantActionDraft.expires_at when linked", constraints: ["Required for action confirmation and cannot exceed draft expiry."] }
      entity_constraints:
        - "Model output may propose typed display data but cannot select an unregistered schema or introduce code, markup, scripts, event handlers, authority, or hidden mutation parameters."
        - "A confirm action supplies the same visible payload hash to the same governed tool used by fixed UI flows."
        - "Rendering does not execute a tool; ActionConfirmation and fresh authoritative validation remain mandatory."

    - name: AgentEvaluationRun
      description: "Versioned execution of Assistant generation, retrieval, safety, recovery, latency, or resource evaluation fixtures."
      logical_ownership:
        owner: Assistant
        aggregate: AgentEvaluation
        aggregate_role: aggregate_root
      attributes:
        - { name: agent_evaluation_run_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Stable run identity."] }
        - { name: evaluation_suite_version, logical_type: Version, required: true, unique: false, references: [], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Pins fixtures, expected outcomes, and metrics."] }
        - { name: evaluation_type, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [generation_capability, embedding_retrieval, agent_safety, interruption_recovery, citation_grounding, latency_and_resources], default: agent_safety, min: null, max: null, constraints: ["Selects required cases and metrics."] }
        - { name: status, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [queued, running, completed, failed, limited], default: queued, min: null, max: null, constraints: ["limited discloses an unmet environmental or evidence condition."] }
        - { name: source_revision, logical_type: RevisionDigest, required: true, unique: false, references: [{ contract: C19, owner: U13, contract_version_required: true }], allowed_values: null, default: null, min: "declared revision length", max: "declared revision length", constraints: ["Immutable implementation revision under evaluation."] }
        - { name: environment_profile_version, logical_type: Version, required: true, unique: false, references: [{ entity: DemoEvidence.SetupVerificationRun, contract: C19, owner: U13, resource_version_required: true }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Captures CPU, memory, optional GPU, and runtime conditions without secrets."] }
        - { name: assistant_configuration_version, logical_type: Version, required: true, unique: false, references: [{ entity: AssistantConfigurationVersion, attribute: configuration_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: "1.0.0", max: null, constraints: ["Exact evaluated Assistant policy."] }
        - { name: generation_profile_id, logical_type: NullableIdentifier, required: false, unique: false, references: [{ entity: GenerationProfileVersion, attribute: generation_profile_id, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: null, max: null, constraints: ["Required when generation behavior is evaluated."] }
        - { name: generation_profile_version, logical_type: NullableVersion, required: false, unique: false, references: [{ entity: GenerationProfileVersion, attribute: profile_version, boundary: internal_versioned_reference }], allowed_values: null, default: null, min: null, max: null, constraints: ["Paired with generation_profile_id."] }
        - { name: retrieval_candidate_versions, logical_type: BoundedSetOfVersionedIdentifiers, required: false, unique: false, references: [{ entity: SupplierKnowledge.RetrievalIndexVersion, contract: C12, owner: U5, resource_version_required: true }], allowed_values: null, default: [], min: 0, max: "number of declared candidates", constraints: ["Embedding comparison includes separate EmbeddingGemma-300M and Qwen3-Embedding-0.6B index versions with pinned revisions."] }
        - { name: fixture_set_version, logical_type: VersionOrDigest, required: true, unique: false, references: [{ contract: C19, owner: U13, contract_version_required: true }], allowed_values: null, default: null, min: 1, max: "bounded version length", constraints: ["Held-out English fixtures for retrieval comparison."] }
        - { name: started_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Required once running."] }
        - { name: completed_at, logical_type: NullableTimestamp, required: false, unique: false, references: [], allowed_values: null, default: null, min: "started_at", max: null, constraints: ["Required for terminal status."] }
      entity_constraints:
        - "A completed safety suite includes prompt-injection, cross-tenant, unsupported-claim, interruption, duplicate-side-effect, and forbidden-tool cases."
        - "An embedding comparison references separate U5-governed index versions and records provenance, relevance, citation quality, latency, memory, and setup reproducibility for both pinned candidates."
        - "The run does not choose a Qdrant collection directly and does not transfer embedding ownership from U5."
        - "Failed and limited runs remain evidence and cannot be rewritten as successful."

    - name: AgentEvaluationCaseResult
      description: "Expected-versus-observed result and bounded metrics for one case in an AgentEvaluationRun."
      logical_ownership:
        owner: Assistant
        aggregate: AgentEvaluation
        aggregate_role: owned_entity
      attributes:
        - { name: agent_evaluation_case_result_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Stable case-result identity."] }
        - { name: agent_evaluation_run_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: AgentEvaluationRun, attribute: agent_evaluation_run_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Parent evaluation run."] }
        - { name: case_id, logical_type: Text, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "bounded case identifier", constraints: ["Unique within the evaluation run."] }
        - { name: category, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [prompt_injection, cross_tenant, unsupported_claim, interruption, duplicate_side_effect, forbidden_tool, retrieval_relevance, citation_accuracy, provider_failure, latency, resource_usage, setup_reproducibility], default: null, min: null, max: null, constraints: ["Maps to the suite's expected behavior."] }
        - { name: candidate_identifier, logical_type: NullableVersionedIdentifier, required: false, unique: false, references: [{ entities: [GenerationProfileVersion, SupplierKnowledge.RetrievalIndexVersion], contracts: [C12, C21], owner: "U9 or U5 as applicable", resource_version_required: true }], allowed_values: null, default: null, min: null, max: "bounded versioned identifier", constraints: ["Required for candidate comparisons."] }
        - { name: expected_outcome, logical_type: BoundedText, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configured case-outcome limit", constraints: ["Defined by the pinned suite before execution."] }
        - { name: observed_outcome, logical_type: BoundedText, required: true, unique: false, references: [], allowed_values: null, default: null, min: 1, max: "configured case-outcome limit", constraints: ["Safe factual observation without hidden reasoning or secrets."] }
        - { name: verdict, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [passed, failed, limited], default: failed, min: null, max: null, constraints: ["Derived from declared expectations; limited requires a reason."] }
        - { name: relevance_measure, logical_type: NullableDecimal, required: false, unique: false, references: [], allowed_values: null, default: null, min: 0, max: "metric-defined upper bound", constraints: ["Metric name and aggregation live in the suite version."] }
        - { name: citation_quality_measure, logical_type: NullableDecimal, required: false, unique: false, references: [], allowed_values: null, default: null, min: 0, max: "metric-defined upper bound", constraints: ["Required for citation accuracy cases."] }
        - { name: latency_duration, logical_type: NullableDuration, required: false, unique: false, references: [], allowed_values: null, default: null, min: 0, max: null, constraints: ["Measured under the referenced environment profile."] }
        - { name: peak_memory_amount, logical_type: NullableDataSize, required: false, unique: false, references: [], allowed_values: null, default: null, min: 0, max: null, constraints: ["Measured under the referenced environment profile."] }
        - { name: tool_invocation_count, logical_type: NonNegativeInteger, required: true, unique: false, references: [], allowed_values: null, default: 0, min: 0, max: "suite-defined bound", constraints: ["Supports forbidden and duplicate side-effect assertions."] }
        - { name: limitation_reason, logical_type: NullableBoundedText, required: false, unique: false, references: [], allowed_values: null, default: null, min: 0, max: "configured limitation length", constraints: ["Required when verdict is limited."] }
      entity_constraints:
        - "agent_evaluation_run_id plus case_id plus candidate_identifier is unique."
        - "Every result has one or more immutable AgentEvaluationEvidence records."
        - "A passed duplicate-side-effect case demonstrates one governed business effect for matching replays and a conflict for changed payload with the same key."
        - "A passed forbidden-tool case demonstrates that disallowed operations are absent or rejected before provider invocation."

    - name: AgentEvaluationEvidence
      description: "Immutable, redacted artifact descriptor supporting one agent evaluation case result."
      logical_ownership:
        owner: Assistant
        aggregate: AgentEvaluation
        aggregate_role: owned_evidence_entity
      attributes:
        - { name: agent_evaluation_evidence_id, logical_type: Identifier, required: true, unique: true, references: [], allowed_values: null, default: null, min: null, max: null, constraints: ["Stable evidence identity."] }
        - { name: agent_evaluation_case_result_id, logical_type: Identifier, required: true, unique: false, references: [{ entity: AgentEvaluationCaseResult, attribute: agent_evaluation_case_result_id, boundary: same_aggregate }], allowed_values: null, default: null, min: null, max: null, constraints: ["Supported case result."] }
        - { name: evidence_type, logical_type: Enumeration, required: true, unique: false, references: [], allowed_values: [redacted_transcript, redacted_tool_trace, citation_check, authorization_receipt, idempotency_receipt, reconciliation_receipt, relevance_measurement, latency_measurement, resource_measurement, setup_manifest], default: null, min: null, max: null, constraints: ["Must match the case category and declared suite evidence requirements."] }
        - { name: artifact_identifier, logical_type: IdentifierOrLocator, required: true, unique: false, references: [{ contract: C19, owner: U13, contract_version_required: true }], allowed_values: null, default: null, min: 1, max: "bounded identifier or locator length", constraints: ["Points through a governed evidence interface, never direct foreign storage access."] }
        - { name: artifact_digest, logical_type: Digest, required: true, unique: false, references: [{ contract: C19, owner: U13, contract_version_required: true }], allowed_values: null, default: null, min: "declared digest length", max: "declared digest length", constraints: ["Binds the evidence content immutably."] }
        - { name: source_revision, logical_type: RevisionDigest, required: true, unique: false, references: [{ entity: AgentEvaluationRun, attribute: source_revision, boundary: immutable_snapshot }], allowed_values: null, default: null, min: "declared revision length", max: "declared revision length", constraints: ["Must equal the parent run revision."] }
        - { name: demo_evidence_manifest_id, logical_type: NullableIdentifier, required: false, unique: false, references: [{ entity: DemoEvidence.EvidenceManifest, attribute: evidence_manifest_id, contract: C19, owner: U13, resource_version_required: true }], allowed_values: null, default: null, min: null, max: null, constraints: ["Links portfolio evidence when collected by U13."] }
        - { name: contains_sensitive_content, logical_type: Boolean, required: true, unique: false, references: [], allowed_values: [false], default: false, min: null, max: null, constraints: ["Always false after evidence redaction."] }
        - { name: collected_at, logical_type: Timestamp, required: true, unique: false, references: [], allowed_values: null, default: "collection time", min: null, max: null, constraints: ["UTC instant."] }
      entity_constraints:
        - "Evidence excludes credentials, tokens, secrets, raw supplier documents, unrestricted full prompts, and hidden reasoning."
        - "Evidence descriptors are immutable; corrected evidence creates a new case result or run rather than rewriting history."
        - "U13 may verify and package the evidence through C19, while U9 retains ownership of agent evaluation semantics."

  relationships:
    - { id: R01, from: AssistantConfigurationVersion, to: ConversationBinding, cardinality: "1 to 0..many", direction: "AssistantConfigurationVersion -> ConversationBinding", relationship: "pins configuration for", ownership_boundary: internal }
    - { id: R02, from: GenerationProfileVersion, to: ConversationBinding, cardinality: "1 to 0..many", direction: "GenerationProfileVersion -> ConversationBinding", relationship: "pins provider, model, revision, and runtime for", ownership_boundary: internal }
    - { id: R03, from: Conversation, to: ConversationBinding, cardinality: "1 to exactly 1", direction: "Conversation -> ConversationBinding", relationship: "owns immutable binding", ownership_boundary: composition }
    - { id: R04, from: Conversation, to: ConversationSummary, cardinality: "1 to 0..many", direction: "Conversation -> ConversationSummary", relationship: "owns versioned summaries", ownership_boundary: composition }
    - { id: R05, from: ConversationSummary, to: ConversationTurn, cardinality: "0..many to 0..many", direction: "ConversationSummary -> ConversationTurn", relationship: "summarizes a terminal prefix through a declared sequence", ownership_boundary: same_aggregate }
    - { id: R06, from: Conversation, to: ConversationTurn, cardinality: "1 to 0..many", direction: "Conversation -> ConversationTurn", relationship: "owns ordered turns", ownership_boundary: composition }
    - { id: R07, from: ConversationTurn, to: ProvisionalResponseStream, cardinality: "1 to 0..1", direction: "ConversationTurn -> ProvisionalResponseStream", relationship: "may expose transient provisional delivery", ownership_boundary: composition }
    - { id: R08, from: ConversationTurn, to: TerminalResponse, cardinality: "1 terminal turn to exactly 1; nonterminal turn to 0", direction: "ConversationTurn -> TerminalResponse", relationship: "produces authoritative visible response", ownership_boundary: composition }
    - { id: R09, from: ConversationTurn, to: ToolInvocation, cardinality: "1 to 0..many", direction: "ConversationTurn -> ToolInvocation", relationship: "owns bounded typed invocations", ownership_boundary: composition }
    - { id: R10, from: ToolDefinitionVersion, to: ToolInvocation, cardinality: "1 to 0..many", direction: "ToolDefinitionVersion -> ToolInvocation", relationship: "types and allowlists", ownership_boundary: internal_versioned_reference }
    - { id: R11, from: ToolInvocation, to: AuthoritativeCallValidation, cardinality: "1 to 1..many when called; 1 to 0 when rejected before a provider call", direction: "ToolInvocation -> AuthoritativeCallValidation", relationship: "records fresh provider validation per call attempt", ownership_boundary: composition }
    - { id: R12, from: ToolInvocation, to: SideEffectExecution, cardinality: "1 side-effect invocation to exactly 1; read invocation to 0", direction: "ToolInvocation -> SideEffectExecution", relationship: "owns durable idempotency and outcome state", ownership_boundary: composition }
    - { id: R13, from: SideEffectExecution, to: ReconciliationAttempt, cardinality: "1 to 0..many", direction: "SideEffectExecution -> ReconciliationAttempt", relationship: "is reconciled by bounded attempts", ownership_boundary: composition }
    - { id: R14, from: TerminalResponse, to: Citation, cardinality: "1 to 0..many", direction: "TerminalResponse -> Citation", relationship: "exposes immutable exact-version citations", ownership_boundary: composition }
    - { id: R15, from: Citation, to: CitationAccessAttempt, cardinality: "1 to 0..many", direction: "Citation -> CitationAccessAttempt", relationship: "is reopened only through fresh authorization and availability checks", ownership_boundary: composition }
    - { id: R16, from: TerminalResponse, to: ResponseClaim, cardinality: "1 to 0..many", direction: "TerminalResponse -> ResponseClaim", relationship: "decomposes material support obligations", ownership_boundary: composition }
    - { id: R17, from: ResponseClaim, to: CitationClaimLink, cardinality: "1 to 0..many", direction: "ResponseClaim -> CitationClaimLink", relationship: "links evidence to claim", ownership_boundary: composition }
    - { id: R18, from: Citation, to: CitationClaimLink, cardinality: "1 to 0..many", direction: "Citation -> CitationClaimLink", relationship: "supports, conflicts with, or contextualizes claims", ownership_boundary: same_aggregate }
    - { id: R19, from: ConversationTurn, to: AssistantActionDraft, cardinality: "1 to 0..many", direction: "ConversationTurn -> AssistantActionDraft", relationship: "owns proposed governed actions", ownership_boundary: composition }
    - { id: R20, from: AssistantActionDraft, to: ActionConfirmation, cardinality: "1 to 0..1", direction: "AssistantActionDraft -> ActionConfirmation", relationship: "receives one explicit terminal user decision", ownership_boundary: composition }
    - { id: R21, from: PresentationSchemaVersion, to: GenUIPresentation, cardinality: "1 to 0..many", direction: "PresentationSchemaVersion -> GenUIPresentation", relationship: "validates component and action vocabulary", ownership_boundary: internal_versioned_reference }
    - { id: R22, from: ConversationTurn, to: GenUIPresentation, cardinality: "1 to 0..many", direction: "ConversationTurn -> GenUIPresentation", relationship: "owns typed presentation instances", ownership_boundary: composition }
    - { id: R23, from: TerminalResponse, to: GenUIPresentation, cardinality: "1 to 0..many", direction: "TerminalResponse -> GenUIPresentation", relationship: "may be rendered by terminal result presentations", ownership_boundary: same_aggregate }
    - { id: R24, from: AssistantActionDraft, to: GenUIPresentation, cardinality: "1 to 1..many while presented", direction: "AssistantActionDraft -> GenUIPresentation", relationship: "is rendered with the exact visible payload hash", ownership_boundary: same_aggregate }
    - { id: R25, from: AssistantActionDraft, to: ToolInvocation, cardinality: "1 to 0..1", direction: "AssistantActionDraft -> ToolInvocation", relationship: "may produce one confirmed side-effect invocation", ownership_boundary: same_aggregate }
    - { id: R26, from: AssistantActionDraft, to: SideEffectExecution, cardinality: "1 to 0..1", direction: "AssistantActionDraft -> SideEffectExecution", relationship: "links confirmation proposal to governed outcome", ownership_boundary: same_aggregate }
    - { id: R27, from: ConversationBinding, to: TenantDirectory.Retailer, cardinality: "many to exactly 1", direction: "ConversationBinding -> TenantDirectory.Retailer", relationship: "references bound retailer identifier", ownership_boundary: "cross-unit identifier via C11-C14 authority invariant; no storage access" }
    - { id: R28, from: ConversationBinding, to: IdentityAccess.UserAccount, cardinality: "many to exactly 1", direction: "ConversationBinding -> IdentityAccess.UserAccount", relationship: "references initiating actor identifier", ownership_boundary: "cross-unit identifier via C02; no identity or role ownership" }
    - { id: R29, from: AuthoritativeCallValidation, to: TenantDirectory.Membership, cardinality: "many to 0..1 visible membership reference", direction: "AuthoritativeCallValidation -> TenantDirectory.Membership", relationship: "records provider-validated current membership version", ownership_boundary: "cross-unit identifier/version via provider authority contract; U4 remains authoritative" }
    - { id: R30, from: AuthoritativeCallValidation, to: TenantDirectory.RetailerPlacement, cardinality: "many to exactly 1 generation", direction: "AuthoritativeCallValidation -> TenantDirectory.RetailerPlacement", relationship: "records provider-validated placement generation", ownership_boundary: "cross-unit identifier/version via provider authority contract; U4 remains authoritative" }
    - { id: R31, from: ToolInvocation, to: GovernedServiceOperation, cardinality: "many to exactly 1 versioned operation", direction: "ToolInvocation -> GovernedServiceOperation", relationship: "calls only C11, C12, C13, or C14 through a typed definition", ownership_boundary: "cross-unit contract call; no storage access or transferred authority" }
    - { id: R32, from: Citation, to: GovernedSourceVersion, cardinality: "many to exactly 1", direction: "Citation -> GovernedSourceVersion", relationship: "references an exact source identifier, version, and locator", ownership_boundary: "cross-unit identifier/version via C11-C14 or C19; no storage access" }
    - { id: R33, from: ToolInvocation, to: Citation, cardinality: "0..many to 0..many", direction: "ToolInvocation -> Citation", relationship: "provides validated source descriptors later cited by the response", ownership_boundary: same_aggregate }
    - { id: R34, from: AssistantActionDraft, to: Citation, cardinality: "0..many to 0..many", direction: "AssistantActionDraft -> Citation", relationship: "uses cited evidence as the visible action basis", ownership_boundary: same_aggregate }
    - { id: R35, from: SideEffectExecution, to: Replenishment.ReviewJob, cardinality: "many to 0..1", direction: "SideEffectExecution -> Replenishment.ReviewJob", relationship: "references actual governed review result", ownership_boundary: "cross-unit identifier/version via C14; U8 owns review and allowance decisions" }
    - { id: R36, from: SideEffectExecution, to: Purchasing.PurchaseProposal, cardinality: "many to 0..1", direction: "SideEffectExecution -> Purchasing.PurchaseProposal", relationship: "references actual governed purchase draft result", ownership_boundary: "cross-unit identifier/version via C14; U8 owns draft and all purchasing transitions" }
    - { id: R37, from: AgentEvaluationRun, to: AssistantConfigurationVersion, cardinality: "many to exactly 1", direction: "AgentEvaluationRun -> AssistantConfigurationVersion", relationship: "pins evaluated Assistant policy", ownership_boundary: internal_versioned_reference }
    - { id: R38, from: AgentEvaluationRun, to: GenerationProfileVersion, cardinality: "many to 0..1", direction: "AgentEvaluationRun -> GenerationProfileVersion", relationship: "pins evaluated generation candidate", ownership_boundary: internal_versioned_reference }
    - { id: R39, from: AgentEvaluationRun, to: SupplierKnowledge.RetrievalIndexVersion, cardinality: "many to 0..many versioned candidates", direction: "AgentEvaluationRun -> SupplierKnowledge.RetrievalIndexVersion", relationship: "compares separately indexed embedding candidates", ownership_boundary: "cross-unit identifier/version via C12 and C21; U5 owns routing, indexes, and source lifecycle" }
    - { id: R40, from: AgentEvaluationRun, to: AgentEvaluationCaseResult, cardinality: "1 to 1..many", direction: "AgentEvaluationRun -> AgentEvaluationCaseResult", relationship: "owns expected-versus-observed case results", ownership_boundary: composition }
    - { id: R41, from: AgentEvaluationCaseResult, to: AgentEvaluationEvidence, cardinality: "1 to 1..many", direction: "AgentEvaluationCaseResult -> AgentEvaluationEvidence", relationship: "is supported by immutable redacted evidence", ownership_boundary: composition }
    - { id: R42, from: AgentEvaluationEvidence, to: DemoEvidence.EvidenceManifest, cardinality: "many to 0..1", direction: "AgentEvaluationEvidence -> DemoEvidence.EvidenceManifest", relationship: "may be packaged in portfolio evidence", ownership_boundary: "cross-unit identifier/version via C19; U13 owns the manifest" }
```

## Readable Summary

The model contains four versioned policy/catalog entities, seventeen conversation and orchestration entities, and three agent-evaluation entities. `Conversation` is the main runtime aggregate. Its immutable `ConversationBinding` pins retailer, initiating actor, English language, provider adapter, model identifier and revision, and Assistant configuration. A new conversation is required when any binding changes. `ConversationSummary` and the deterministic recent-turn window bound later prompts without retaining hidden reasoning, secrets, full prompts, or unrestricted tool payloads.

`ConversationTurn` enforces one active turn. `ProvisionalResponseStream` is transient and explicitly nonauthoritative; `TerminalResponse` is the sole retained visible result. Typed `ToolInvocation` records point to an allowlisted `ToolDefinitionVersion`. Each provider attempt yields a fresh `AuthoritativeCallValidation`, while `SideEffectExecution` and `ReconciliationAttempt` preserve one idempotency identity and payload hash across uncertain outcomes.

`Citation`, `CitationAccessAttempt`, `ResponseClaim`, and `CitationClaimLink` preserve exact source/version/locator support and reauthorize every citation open. `AssistantActionDraft`, `ActionConfirmation`, and `GenUIPresentation` bind a short-lived visible payload to an explicit confirmation and the same governed U8 tool. They never become purchasing or review entities and cannot grant approval or other business authority.

`AgentEvaluationRun`, `AgentEvaluationCaseResult`, and `AgentEvaluationEvidence` retain revision-bound, redacted evidence for generation, retrieval, citation, safety, interruption, idempotency, latency, and resource checks. Embedding evaluations reference U5-owned, separately indexed EmbeddingGemma-300M and Qwen3-Embedding-0.6B candidates by governed identifiers and pinned versions; U9 neither selects arbitrary collections nor takes ownership of those indexes.

## Sources

- `.codex/aidlc-common/stages/construction/functional-design.md`
- `aidlc/spaces/default/intents/260908-stock-sense-design/construction/assistant/functional-design/functional-design-questions.md`
- `aidlc/spaces/default/intents/260908-stock-sense-design/inception/units-generation/unit-of-work.md`
- `aidlc/spaces/default/intents/260908-stock-sense-design/inception/units-generation/unit-of-work-story-map.md`
- `aidlc/spaces/default/intents/260908-stock-sense-design/inception/requirements-analysis/requirements.md`
- `aidlc/spaces/default/intents/260908-stock-sense-design/inception/domain-design/components.md`
- `aidlc/spaces/default/intents/260908-stock-sense-design/inception/contract-design/contract-summary.md`

## Assumptions & Open Questions

- The confirmed functional questions resolve behavior. Remaining values are implementation parameters: exact recent-turn, summary, tool-result, stream, claim, presentation, retry, reconciliation, expiry, latency, and response-size bounds must be finite and versioned before implementation.
- The exact local Qwen generation artifact, model revision, runtime profile, context/concurrency limits, and CPU evidence remain open under OQ1/C21. A Bedrock profile remains disabled until explicitly configured with credentials and spend policy; it is never a fallback.
- U5 must finalize retrieval top-k, citation limits, embedding dimensions/configurations, source lifecycle limits, and the default embedding winner. U9 records comparison evidence and consumes authorized results; it does not own U5 indexes or collection routing.
- C14 establishes review-request and purchase-draft creation boundaries. The final versioned request/response schema for editing an existing purchase draft must be present in the U8 provider contract before `edit_purchase_draft` can become active in a tool registry.
- `GovernedServiceOperation` and `GovernedSourceVersion` in relationships R31-R32 are conceptual cross-unit contract targets, not U9-owned entities or shared persistence records.
