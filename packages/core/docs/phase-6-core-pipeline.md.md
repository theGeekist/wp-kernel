# Phase 6 - Core Pipeline Orchestration (targets v0.10.0)

We will reserve the **0.9.1 → 0.9.4 patch band** for implementation, tests, documentation, and a buffer slot, then cut **0.10.0** once tasks close-following the existing cadence of “three focused patches + buffer + release” established for prior phases.

_Referenced from:_

- [cli-migration-phases.md §14- 27](cli/next/packages/cli/docs/cli-migration-phases.md#L14-L27)
- [mvp-plan.md §5- 13](cli/next/packages/cli/docs/mvp-plan.md#L5-L13)

---

## Patch 0.9.1 - Task 32: Core Pipeline Scaffolding

Define the helper contracts and shared context bridges needed for `@wpkernel/core` to run actions/resources through `createPipeline`, splitting responsibilities that currently live in `defineAction`/`defineResource` into discrete fragments/builders.

_Referenced from:_

- [define.ts §342- 432](cli/next/packages/core/src/actions/define.ts#L342-L432)
- [define.ts (resource) §162- 378](cli/next/packages/core/src/resource/define.ts#L162-L378)
- [createPipeline.ts §1- 200](cli/next/packages/core/src/pipeline/createPipeline.ts#L1-L200)

### 🧩 Task: Introduce Core Pipeline Scaffolding

1. Map the lifecycle phases embedded in `defineAction`/`defineResource` into helper descriptors under `packages/core/src/pipeline/helpers/**`, sketching fragments for config validation, context creation, lifecycle emission, reporter wiring, and registry bookkeeping.
2. Extend `createPipeline` typings or wrapper utilities (if needed) so helpers can emit diagnostics and reuse rollback/commit hooks without duplicating orchestration logic.
    - [createPipeline.ts §83- 153](cli/next/packages/core/src/pipeline/createPipeline.ts#L83-L153)

3. Add new test-support builders in `packages/test-utils/core` that instantiate the action/resource pipelines with reporters/workspace mocks.
4. Gate the new helpers behind feature flags (e.g. `enableCorePipeline`) to unblock incremental adoption while existing entry points remain unchanged.

---

## Patch 0.9.2 - Task 33: Migrate `defineAction` to the Pipeline

Replace the monolithic action orchestration with a pipeline composition that mirrors today’s behaviour (request ID generation, lifecycle events, error normalization, event bus registration).

_Referenced from:_

- [define.ts §342- 432](cli/next/packages/core/src/actions/define.ts#L342-L432)

### 🧩 Task: Refactor `defineAction` onto Core Pipeline

1. Implement pipeline fragments/builders that resolve options, create action contexts, emit start/complete/error events, and normalize errors before rethrowing.
2. Update `defineAction` to assemble the pipeline, invoke it in the returned callable, and register the definition via a dedicated helper that records the namespace and emits `action:defined`.
3. Port existing unit/integration tests to exercise both legacy and pipeline paths during the flag window, then drop legacy assertions once parity is proven.
4. Add regression coverage confirming reporter output, namespace detection, and lifecycle event payloads are identical to the current implementation.

---

## Patch 0.9.3 - Task 34: Migrate `defineResource` to the Pipeline

Refactor resource definition to reuse pipeline helpers for namespace resolution, reporter setup, client creation, cache/store wiring, and grouped API exposure, ensuring lazy store registration and cache invalidation semantics remain intact.

_Referenced from:_

- [define.ts (resource) §162- 378](cli/next/packages/core/src/resource/define.ts#L162-L378)

### 🧩 Task: Refactor `defineResource` onto Core Pipeline

1. Build fragments for namespace parsing, reporter resolution, config validation, client fabrication, cache key derivation, and grouped API assembly.
2. Introduce builder helpers that handle lazy store registration and BroadcastChannel event emission so the pipeline can queue side effects deterministically.
3. Update `defineResource` to execute the pipeline, returning the assembled resource object while preserving existing TypeScript surface and runtime behaviour.
4. Extend tests to cover reporter messages, cache key generation, grouped API getters, and store registration paths under both Node and browser mocks.

---

## Patch 0.9.4 - Task 35: Buffer & Extension Diagnostics

Use the buffer slot to harden diagnostics, extension hooks, and migration guards before the minor release-surfacing warnings for missing helpers and documenting the new extension points.

_Referenced from:_

- [createPipeline.ts §83- 153](cli/next/packages/core/src/pipeline/createPipeline.ts#L83-L153)

### 🧩 Task: Polish Diagnostics and Extension Story

1. Wire pipeline diagnostics into the core reporter so missing/unused helpers produce actionable warnings during development.
2. Exercise rollback hooks by simulating helper failures, ensuring transactional integrity when downstream extensions participate.
3. Update developer docs:
    - [index.md §5- 19](cli/next/packages/cli/docs/index.md#L5-L19)
    - [cli-migration-phases.md §35- 88](cli/next/packages/cli/docs/cli-migration-phases.md#L35-L88)
      to describe how core pipelines expose extension hooks for third parties.

4. Finalise feature-flag rollout plan (enable by default, keep opt-out switch until 0.10.0 release).

---

## Minor 0.10.0 - Task 36: Release and Documentation Rollup

Once patches ship, flip the pipeline on by default, remove legacy paths, and cut the coordinated minor release per the standard checklist.

_Referenced from:_

- [mvp-plan.md §67- 75](cli/next/packages/cli/docs/mvp-plan.md#L67-L75)

### 🧩 Task: Cut Phase 6 Minor Release

1. Remove temporary feature flags/dual paths and regenerate artefacts to ensure pipelines are the sole code path.
2. Run full monorepo checks (`pnpm lint --fix`, `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm test`, plus targeted core/cli suites) and capture results for the release notes.
    - [mvp-plan.md §9- 13](cli/next/packages/cli/docs/mvp-plan.md#L9-L13)

3. Update root and package changelogs with the new phase summary, cross-link the CLI docs that describe the pipeline migration, and bump all package versions to 0.10.0.
4. Publish the release PR using the established template, highlighting parity validation for actions/resources and the new extension diagnostics.

---

### Summary

This phase keeps the AST/pipeline doctrine intact while unlocking modular orchestration for the core runtime, paving the way for richer extension hooks and safer customisations without touching `defineAction` or `defineResource` internals.

_Referenced from:_

- [createPipeline.ts §83- 153](cli/next/packages/core/src/pipeline/createPipeline.ts#L83-L153)
