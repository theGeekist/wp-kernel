# IR Contract Gap Assessment

See [Docs Index](cli-index.md).

This note reconciles the audit feedback with the current implementations in
`@wpkernel/cli`, `@wpkernel/core`, and `@wpkernel/pipeline`. Each item cites the
source of truth so readers can distinguish verified behaviour from future work.

## Lifecycle accuracy checkpoints

| Concern                        | Status in code                                                                                                                                                                                                                                              | Evidence                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Stable identities              | **Implemented.** `IRResource`, `IRSchema`, `IRBlock`, and capability definitions now expose stable `res:/sch:/blk:/cap:` identifiers alongside their keys.                                                                                                  | [`IRResource`, `IRSchema`, and `IRCapabilityDefinition` include `id`.][ir-resource]                                          |
| Config echo in IR              | **True.** `finalizeIrDraft` returns `draft.config` unchanged, so the entire `WPKernelConfigV1` is embedded in the final artifact.                                                                                                                           | [`finalizeIrDraft` copies the original config reference.][ir-finalize]                                                       |
| Adapter mutation envelope      | **Audit trail added.** Adapters still receive a cloned IR, but `runAdapterExtensions` now diffs `updateIr` payloads and records per-adapter change operations under `ir.adapterAudit.changes`.                                                              | [`runAdapterExtensions` captures change sets via `diffIr`.][adapter-run]                                                     |
| Diagnostic contract            | **Improved.** `IRDiagnostic` now carries canonical `code`, `source`, `target` (type/id/path), optional `hint`, and severity.                                                                                                                                | [`IRDiagnostic` definition.][ir-diagnostic]                                                                                  |
| Async flags vs reality         | **Mixed.** Fragments are declared `async`, but `ir.meta.core`, `ir.capabilities.core`, `ir.diagnostics.core`, `ir.ordering.core`, and `ir.validation.core` never await. The executor still awaits them, yet the metadata can mislead readers about true IO. | [Fragments declare `async` while doing synchronous work.][fragments-async]                                                   |
| Blocks SSR test                | **Heuristic.** Discovery marks `hasRender` when the manifest contains `render` or `render.php` exists; provenance (`manifest` vs file) is not recorded.                                                                                                     | [`discoverBlocks` heuristic check.][block-discovery]                                                                         |
| Capability bindings vocabulary | **Implicit.** Capability descriptors reuse `appliesTo: 'resource'                                                                                                                                                                                           | 'object'`and optional`binding` from the TypeScript type. No enum list ships inside the IR.                                   | [`IRCapabilityDefinition` mirrors the type union without enum metadata.][capability-definition] |
| Size and secrecy               | **Unbounded.** IR retains the full config, schema payloads, and adapter metadata. There is no size cap or redaction pass for secrets.                                                                                                                       | [`IRv1` embeds `config` and raw schema contents.][ir-shape]                                                                  |
| Event bus side effects         | **Runtime only.** Core emits `resource:defined` during the finalize extension commit and removes it on rollback. IR consumers must model these events separately.                                                                                           | [`createFinalizeResourceDefinitionExtension` emits events.][core-finalize]                                                   |
| Schema of the schema           | **Missing.** No JSON Schema/Protobuf accompanies `IRv1`; only the TypeScript interfaces act as the contract.                                                                                                                                                | [`IRv1` defined solely in TypeScript.][ir-shape]                                                                             |
| Feature negotiation            | **Available.** `IRv1.meta.features` advertises active sections such as `capabilityMap`, `blocks`, `uiRegistry`, and `phpAutoload`.                                                                                                                          | [`IRv1.meta.features`.][ir-shape]                                                                                            |
| Hashing provenance             | **Exposed.** `IRHashProvenance` wraps hashes with `algo: 'sha256'`, logical `inputs`, and the digest value for schemas, resources, routes, and blocks.                                                                                                      | [`hashResource`, `normaliseRoutes`, and block discovery return `IRHashProvenance`.][hash-resource]                           |
| Fragment `async` flags         | **Overstated.** Ordering, diagnostics, validation, and meta fragments are marked async but perform synchronous assignments, echoing the audit note.                                                                                                         | [Same fragment evidence as above.][fragments-async]                                                                          |
| Builder dependencies           | **Explicit where needed.** CLI builders do not declare `dependsOn`; execution order comes from registration priority. Core resource builder enforces its prerequisites manually and throws when client/cache keys are missing.                              | [CLI builder registration order.][create-ir] · [Core builder guards.][core-builder]                                          |
| Config `schemas` cardinality   | **Record keyed by schema name.** `WPKernelConfigV1.schemas` is defined as a `SchemaRegistry` map, not an array.                                                                                                                                             | [`SchemaRegistry` definition.][schema-registry]                                                                              |
| `composerCheck` semantics      | **Advisory.** Loader records `'ok'                                                                                                                                                                                                                          | 'mismatch'`; downstream pipeline stages do not treat mismatches as fatal - they are surfaced via diagnostics/reporters only. | [`load-wpk-config` returns composerCheck without blocking pipeline.][config-loader]             |

## High-impact refinements from audit

The following improvements are **not** implemented today:

- JSON Schema (`irv1.schema.json`) or equivalent machine-verifiable contract.
- In-IR invariants section for meta immutability, reference integrity, or
  adapter mutation limits.
- Projection of config that omits unused author input (`final.configProjection`).

They remain open design work and should be tracked separately from lifecycle
documentation to avoid implying existing support.

[ir-resource]: ../../packages/cli/src/ir/publicTypes.ts
[ir-finalize]: ../../packages/cli/src/ir/types.ts
[adapter-run]: ../../packages/cli/src/adapters/extensions.ts
[ir-diagnostic]: ../../packages/cli/src/ir/publicTypes.ts
[fragments-async]: ../../packages/cli/src/ir/fragments
[block-discovery]: ../../packages/cli/src/ir/shared/block-discovery.ts
[capability-definition]: ../../packages/cli/src/ir/publicTypes.ts
[ir-shape]: ../../packages/cli/src/ir/publicTypes.ts
[core-finalize]: ../../packages/core/src/pipeline/resources/extensions/createFinalizeResourceDefinitionExtension.ts
[hash-resource]: ../../packages/cli/src/ir/shared/resource-builder.ts
[create-ir]: ../../packages/cli/src/ir/createIr.ts
[core-builder]: ../../packages/core/src/pipeline/resources/helpers/createResourceObjectBuilder.ts
[schema-registry]: ../../packages/cli/src/config/types.ts
[config-loader]: ../../packages/cli/src/config/load-wpk-config.ts
