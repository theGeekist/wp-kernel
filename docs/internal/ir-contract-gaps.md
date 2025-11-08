# IR Contract Gap Assessment

See [Docs Index](cli-index.md).

This note reconciles the audit feedback with the current implementations in
`@wpkernel/cli`, `@wpkernel/core`, and `@wpkernel/pipeline`. Each item cites the
source of truth so readers can distinguish verified behaviour from future work.

## Lifecycle accuracy checkpoints

| Concern                        | Status in code                                                                                                                                                                                                                                              | Evidence                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Stable identities              | **Not implemented.** `IRResource`, `IRSchema`, and `IRBlock` expose hashes and keys but no canonical `id` property. Builders and adapters only receive the hash string.                                                                                     | [`IRResource` & related types lack `id` fields.][ir-resource]                                                              |
| Config echo in IR              | **True.** `finalizeIrDraft` returns `draft.config` unchanged, so the entire `WPKernelConfigV1` is embedded in the final artifact.                                                                                                                           | [`finalizeIrDraft` copies the original config reference.][ir-finalize]                                                     |
| Adapter mutation envelope      | **Constrained but permissive.** Adapters receive a cloned IR with functions stripped. They may call `context.updateIr` to replace the artifact; no schema or diff validation exists beyond sandboxed filesystem writes.                                     | [`runAdapterExtensions` clones via `stripFunctions` and allows `updateIr`.][adapter-run]                                   |
| Diagnostic contract            | **Loose.** `IRDiagnostic` contains `key`, `message`, `severity`, and optional `context` but no reserved code registry or required entity pointers.                                                                                                          | [`IRDiagnostic` definition.][ir-diagnostic]                                                                                |
| Async flags vs reality         | **Mixed.** Fragments are declared `async`, but `ir.meta.core`, `ir.capabilities.core`, `ir.diagnostics.core`, `ir.ordering.core`, and `ir.validation.core` never await. The executor still awaits them, yet the metadata can mislead readers about true IO. | [Fragments declare `async` while doing synchronous work.][fragments-async]                                                 |
| Blocks SSR test                | **Heuristic.** Discovery marks `hasRender` when the manifest contains `render` or `render.php` exists; provenance (`manifest` vs file) is not recorded.                                                                                                     | [`discoverBlocks` heuristic check.][block-discovery]                                                                       |
| Capability bindings vocabulary | **Implicit.** Capability descriptors reuse `appliesTo: 'resource'                                                                                                                                                                                           | 'object'`and optional`binding` from the TypeScript type. No enum list ships inside the IR.                                 | [`IRCapabilityDefinition` mirrors the type union without enum metadata.][capability-definition] |
| Size and secrecy               | **Unbounded.** IR retains the full config, schema payloads, and adapter metadata. There is no size cap or redaction pass for secrets.                                                                                                                       | [`IRv1` embeds `config` and raw schema contents.][ir-shape]                                                                |
| Event bus side effects         | **Runtime only.** Core emits `resource:defined` during the finalize extension commit and removes it on rollback. IR consumers must model these events separately.                                                                                           | [`createFinalizeResourceDefinitionExtension` emits events.][core-finalize]                                                 |
| Schema of the schema           | **Missing.** No JSON Schema/Protobuf accompanies `IRv1`; only the TypeScript interfaces act as the contract.                                                                                                                                                | [`IRv1` defined solely in TypeScript.][ir-shape]                                                                           |
| Feature negotiation            | **Missing.** `IRv1.meta` contains namespace/origin only; there is no `meta.features` array to advertise optional sections.                                                                                                                                  | [`IRv1.meta` fields.][ir-shape]                                                                                            |
| Hashing provenance             | **Partial.** Resource hashes derive from canonicalised routes, schemas, storage, etc., but the IR stores only the hash value. Hash algorithm (`sha256`) and input manifest list stay in code.                                                               | [`hashResource` produces the digest without annotating algorithm.][hash-resource]                                          |
| Fragment `async` flags         | **Overstated.** Ordering, diagnostics, validation, and meta fragments are marked async but perform synchronous assignments, echoing the audit note.                                                                                                         | [Same fragment evidence as above.][fragments-async]                                                                        |
| Builder dependencies           | **Explicit where needed.** CLI builders do not declare `dependsOn`; execution order comes from registration priority. Core resource builder enforces its prerequisites manually and throws when client/cache keys are missing.                              | [CLI builder registration order.][create-ir] · [Core builder guards.][core-builder]                                        |
| Config `schemas` cardinality   | **Record keyed by schema name.** `WPKernelConfigV1.schemas` is defined as a `SchemaRegistry` map, not an array.                                                                                                                                             | [`SchemaRegistry` definition.][schema-registry]                                                                            |
| `composerCheck` semantics      | **Advisory.** Loader records `'ok'                                                                                                                                                                                                                          | 'mismatch'`; downstream pipeline stages do not treat mismatches as fatal - they are surfaced via diagnostics/reporters only. | [`load-wpk-config` returns composerCheck without blocking pipeline.][config-loader]             |

## High-impact refinements from audit

The following improvements are **not** implemented today:

- Canonical IDs (`schemaId`, `resourceId`, `blockId`, `capabilityId`).
- JSON Schema (`irv1.schema.json`) or equivalent machine-verifiable contract.
- In-IR invariants section for meta immutability, reference integrity, or
  adapter mutation limits.
- Structured diagnostics with reserved code ranges and resource pointers.
- `meta.features` capability negotiation array.
- Hash algorithm + input disclosure alongside computed values.
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
