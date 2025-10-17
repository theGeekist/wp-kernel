# Next CLI Research Notes (transient)

> Working document for aligning the `create* → init` scaffolding workflow with the `generate → apply` IR pipeline. Do not commit this file once the findings are captured elsewhere.

## 1. What the IR already does for us

`KernelConfigV1` is deliberately small:

```ts
export interface KernelConfigV1 {
	version: 1;
	namespace: string;
	schemas: Record<string, SchemaConfig>;
	resources: Record<string, ResourceConfig>;
	adapters?: {
		php?: PhpAdapterFactory;
		extensions?: AdapterExtensionFactory[];
	};
}
```

From that, the existing fragments infer most of the behaviour we rely on:

| Fragment                 | Inputs                                | Inferences                                                                                                                                      |
| ------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `meta`                   | namespace, config origin              | Sanitised namespace (`Demo Plugin` → `DemoPlugin`), source path, origin type.                                                                   |
| `schemas`                | `schemas` map                         | Resolves schema files, hashes content, determines provenance (`manual` vs generated), warns on missing files.                                   |
| `resources`              | `resources` map + schemas             | Builds REST routes with transport (`local`/`remote`), cache keys, storage bindings, query params, UI metadata, warnings for invalid configs.    |
| `blocks`                 | resource UI metadata (legacy derived) | Produces `IRBlock { key, directory, manifestSource, hasRender }`, already detects SSR vs JS-only by inspecting manifests/fallback `render.php`. |
| `policies` / `policyMap` | resources + optional policy map file  | Generates policy hints, fallback capabilities, missing/unused warnings.                                                                         |
| `php` adapter            | `adapters.php` factory                | Allows projects to override namespace/autoload/customise PHP AST building.                                                                      |

Printers consume this IR to generate controllers, block registrars (`render.php` stubs), JS-only auto-registration, UI fixtures, etc. Conclusion: **most behaviour is already inferred**-we should prefer wiring existing printers/builders before adding new config fields.

## 2. Legacy vs next pipeline gaps

| Capability (legacy)            | Notes                                                      | Status in `next/`                                                   |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Block printers (SSR & JS-only) | `packages/cli/src/printers/blocks/*`                       | Not invoked; next pipeline lacks a `createBlocksBuilder`.           |
| Post-generate validation       | `validateGeneratedImports`                                 | Missing in next runtime.                                            |
| Adapter extensions sandbox     | `runAdapterExtensions`                                     | Next pipeline has extension registry but no execution/commit stage. |
| Watch/build orchestration      | `wpk start`, `wpk build`                                   | Not ported; need helper-based commands around new pipeline.         |
| Apply safeguards/logging       | Legacy `ApplyCommand` handles flags, logs, block summaries | `NextApplyCommand` is just a thin wrapper around patcher.           |

## 3. Config affordances we _don’t_ need to add yet

- **Block metadata** – already represented via resource UI configs / block directories; `IRBlock` captures directory + manifest path. Once we wire the block printers, no new config fields are required to support SSR vs JS-only.
- **Bundler entries** – manifest `editorScript`/`style` fields provide the data needed to add rollup inputs automatically; our bundler helper can read `IRBlock` metadata instead of expecting new config.
- **Plugin metadata** – currently baked into init templates. If we need to expose it to printers, we can start via adapters instead of expanding the schema.
- **Interactive variants** – can be delivered through adapter extensions or conventions inside block templates before changing config.

## 4. Immediate tasks (no schema change)

1. **Add a `createBlocksBuilder` helper** that wraps existing block printers, runs inside the workspace transaction, and queues manifest/registrar/render files.
2. **Restore post-generate validation** by calling `validateGeneratedImports` after builders run in the new runtime.
3. **Execute adapter extensions** in the next pipeline using the same sandbox/commit mechanism as legacy `runGenerate`.
4. **Revisit the patcher helper** so applying patches no longer requires the temporary IR stub.
5. **Port CLI orchestration** – implement `create*Command` helpers for `generate`, `start`, `build`, etc., mirroring legacy watch/build flows on top of the new pipeline.
6. **Enhance `NextApplyCommand`** – honour flags, log to `.wpk-apply.log`, handle block/build artefacts like the legacy command.

## 5. When to consider config extensions

- If future features truly require upfront choices (e.g., default interactive block template selection), prefer optional fields inside existing structures, e.g.

    ```ts
    resources[resource].ui?.admin?.blocks?.push({
      source: 'blocks/foo',
      variant?: 'static' | 'dynamic' | 'interactive'
    });
    ```

    This aligns with the legacy shape and doesn’t introduce new top-level namespaces.

- For plugin metadata, lean on adapters until we can prove a config field is necessary.

## 6. Next research steps

- Audit how resource UI metadata feeds block/TS outputs to ensure we don’t miss existing signals.
- Map WordPress template structure (`create-block`) to our block printers so template directories can plug in without schema changes.
- Once the above is confirmed, update the main `next-cli` doc to reflect the scoped workstreams.
