# Phase 0 – Baseline Audit & Gap Analysis

## Inputs Reviewed

- `examples/showcase/src/kernel.config.ts` (current authoring config)
- `examples/showcase/composer.json` (autoload baseline)
- `examples/showcase/src/resources/job.ts` (runtime `defineResource` usage)
- `packages/cli/src/config/types.ts:31` (`KernelConfigV1`)
- `packages/core/src/resource/types.ts:144` (`ResourceConfig`)
- `packages/core/src/namespace/detect.ts:522` (`sanitizeNamespace`)

## Summary

- The showcase config omits `version`; Phase 1 currently defaults this to `1`, but the absence should be called out so authors add it once the CLI enforces required fields.
- Namespace `wp-kernel-showcase` aligns with runtime usage and already satisfies `sanitizeNamespace`.
- Resource metadata (identity, storage, query params) matches runtime intent, but runtime `cacheKeys` diverge from the config copy-risking cache drift.
- Composer autoload maps `WPKernel\\Showcase\\` to `inc/`, satisfying Phase‑1 validation expectations.

## KernelConfigV1 Mapping

| Field       | Showcase Value                                                      | Kernel Expectation                                                          | Notes                                                                                                           |
| ----------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `version`   | _missing_ (`examples/showcase/src/kernel.config.ts`)                | `KernelConfigV1` requires explicit `version: 1`                             | Loader backfills to `1` today; document as required once CLI writes configs.                                    |
| `namespace` | `wp-kernel-showcase` (`examples/showcase/src/kernel.config.ts:146`) | Must pass `sanitizeNamespace` (`packages/core/src/namespace/detect.ts:522`) | Already valid and used by runtime (`examples/showcase/src/index.ts:33`).                                        |
| `schemas`   | `{}` placeholder (`examples/showcase/src/kernel.config.ts:147`)     | `Record<string, SchemaConfig>` with `path`/`generated`                      | Empty registry acceptable while all resources use `schema: 'auto'`; add a template when real schema files land. |
| `resources` | `job` entry (`examples/showcase/src/kernel.config.ts:149`)          | `ResourceConfig` from `packages/core/src/resource/types.ts:144`             | Matches runtime capabilities; see per-resource notes below.                                                     |
| `adapters`  | _omitted_                                                           | Optional in `KernelConfigV1`                                                | No action until adapters ship.                                                                                  |

## Resource `job` Detail

| Property      | Showcase Config                                                                                | Runtime Usage                                                                                 | Notes                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `name`        | `'job'` (`examples/showcase/src/kernel.config.ts:137`)                                         | forwarded (`examples/showcase/src/resources/job.ts:8`)                                        | In sync.                                                                  |
| `routes`      | Full CRUD with policies (`examples/showcase/src/kernel.config.ts:59`)                          | Runtime uses same object via spread (`examples/showcase/src/resources/job.ts:7`)              | Aligns with kernel route typing.                                          |
| `identity`    | `{ type: 'number', param: 'id' }` (`examples/showcase/src/kernel.config.ts:33`)                | Not consumed at runtime yet                                                                   | Reserved for CLI outputs; no mismatch.                                    |
| `storage`     | `wp-post` with meta + taxonomies (`examples/showcase/src/kernel.config.ts:38`)                 | Runtime ignores                                                                               | Matches future CLI synthesis.                                             |
| `cacheKeys`   | Normalises `undefined` to `null` and covers CRUD (`examples/showcase/src/kernel.config.ts:89`) | Runtime redefines `list/get` (no normalisation) (`examples/showcase/src/resources/job.ts:12`) | Divergence may introduce inconsistent cache keys; flag for consolidation. |
| `queryParams` | Enum + strings (`examples/showcase/src/kernel.config.ts:108`)                                  | Runtime doesn’t leverage yet                                                                  | Ready for CLI schema synthesis.                                           |
| `schema`      | `'auto'` via resource entry (`examples/showcase/src/kernel.config.ts:103`)                     | Runtime currently imports generated types                                                     | Compatible with Phase‑2 auto schema synthesis plan.                       |

## Composer Autoload Review

- `examples/showcase/composer.json` maps `WPKernel\\Showcase\\` → `inc/` (`examples/showcase/composer.json:7`).
- This satisfies Phase‑1 validation (`packages/cli/src/config/load-kernel-config.ts:208`) and matches expected generated PHP output paths.

## Outstanding Gaps / Actions

1. Add `version: 1` to `examples/showcase/src/kernel.config.ts` once the CLI enforces non-null version.
2. Align runtime `cacheKeys` with the authoritative config (import and reuse, or regenerate from CLI output) to prevent divergence in store keys.
3. Populate `schemas` registry template when manual schemas replace `'auto'`; ensure `generated.types` paths match repository layout.
