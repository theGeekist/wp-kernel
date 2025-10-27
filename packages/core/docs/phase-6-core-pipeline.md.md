# Phase 6 - Core Pipeline Orchestration (targets v0.10.0)

We will reserve the **0.9.1 → 0.9.4 patch band** for implementation, tests, documentation, and a buffer slot, then cut **0.10.0** once tasks close-following the existing cadence of “three focused patches + buffer + release” established for prior phases.

_Referenced from:_

- [`packages/cli/docs/cli-migration-phases.md` §14-27](../../cli/docs/cli-migration-phases.md#L14-L27)
- [`packages/cli/docs/mvp-plan.md` §5-13](../../cli/docs/mvp-plan.md#L5-L13)

---

## Patch 0.9.1 - Task 32: Core Pipeline Scaffolding

Define the helper contracts and shared context bridges needed for `@wpkernel/core` to run actions and resources through the pipeline, splitting responsibilities that currently live in `defineAction`/`defineResource` into discrete helpers.

_Referenced from:_

- [`packages/core/src/actions/define.ts` §342-432](../../core/src/actions/define.ts#L342-L432)
- [`packages/core/src/resource/define.ts` §162-378](../../core/src/resource/define.ts#L162-L378)
- [`packages/core/src/pipeline/createPipeline.ts` §1-200](../../core/src/pipeline/createPipeline.ts#L1-L200)

### 🧩 Task: Introduce Core Pipeline Scaffolding

**Objective**: establish the helper map, state contracts, and feature flag needed to migrate orchestration into the pipeline while keeping the public API untouched.

**Deliverables**

1. **Lifecycle mapping** – Document each lifecycle responsibility (config validation, reporter wiring, context assembly, lifecycle emission, registry bookkeeping) and represent them as helper descriptors under `packages/core/src/pipeline/helpers/**`. All new helpers must use verbs such as `build` or `make`; the `create*` prefix remains exclusive to functions that produce pipeline instances via the existing factories.
2. **Typed bridge utilities** – Extend or wrap `packages/core/src/pipeline/createPipeline.ts` only where absolutely required so helpers can forward diagnostics, invoke commit/rollback hooks, and stay under the 500 SLOC/module threshold. Prefer additional exported helpers over nested logic to preserve low complexity and early returns.
3. **Test scaffolding** – Add new `*.test-support.ts` builders in `packages/test-utils/core` that can instantiate the action and resource pipelines with reporter/workspace doubles. Export these helpers for direct unit coverage, and keep each helper/test module ≤500 SLOC.
4. **Feature flag** – Introduce a guard (e.g. `enableCorePipeline`) that controls whether `defineAction`/`defineResource` run via the pipeline or the legacy flow. Default the flag to off, wire it through existing configuration objects, and document how to flip it for experiments.

**Completion placeholder**

- [ ] _Task 32 complete - replace this line with PR link and date when finished._

---

## Patch 0.9.2 - Task 33: Migrate `defineAction` to the Pipeline

Replace the monolithic action orchestration with a pipeline composition that mirrors today’s behaviour (request ID generation, lifecycle events, error normalization, event bus registration).

_Referenced from:_

- [`packages/core/src/actions/define.ts` §342-432](../../core/src/actions/define.ts#L342-L432)

### 🧩 Task: Refactor `defineAction` onto Core Pipeline

**Objective**: run action definitions through the new helper pipeline without altering the external API or lifecycle semantics.

**Deliverables**

1. **Helper implementation** – Build pipeline fragments that resolve options, assemble the action context, emit start/complete/error events, and normalise errors. Ensure helper functions use the `build*`/`make*` naming pattern, keep complexity low (early returns, shallow branches), and export them for direct unit testing.
2. **Pipeline orchestration** – Update `defineAction` to construct the pipeline and invoke it inside the returned callable. Extract registry bookkeeping into a dedicated helper that records namespaces and emits `action:defined`, observing the naming constraint and ≤500 SLOC/module rule.
3. **Dual-path testing** – During the flag window, run suites against both legacy and pipeline flows. Cover reporter output, namespace detection, lifecycle payloads, and error normalisation. Remove the legacy assertions only after parity is demonstrated and recorded.
4. **Coverage instrumentation** – Expand unit/integration tests to keep coverage high. Favour lightweight test helpers from `@wpkernel/test-utils/core`, and update fixtures if any `create*` helper names violate the reserved prefix rule.

**Completion placeholder**

- [ ] _Task 33 complete - replace this line with PR link and date when finished._

---

## Patch 0.9.3 - Task 34: Migrate `defineResource` to the Pipeline

Refactor resource definition to reuse pipeline helpers for namespace resolution, reporter setup, client creation, cache/store wiring, and grouped API exposure, ensuring lazy store registration and cache invalidation semantics remain intact.

_Referenced from:_

- [`packages/core/src/resource/define.ts` §162-378](../../core/src/resource/define.ts#L162-L378)

### 🧩 Task: Refactor `defineResource` onto Core Pipeline

**Objective**: deliver feature-parity resource definitions using the pipeline so stores, caches, and grouped APIs behave identically to the legacy implementation.

**Deliverables**

1. **Helper catalogue** – Build fragments for namespace parsing, reporter resolution, config validation, client fabrication, cache key derivation, and grouped API assembly. Adhere to the naming constraint (`build*`/`make*`), export each helper, and keep individual modules ≤500 SLOC with early-return control flow.
2. **Side-effect orchestration** – Introduce builders that manage lazy store registration and BroadcastChannel event emission so side effects run deterministically via pipeline commit hooks. Cover rollback scenarios to guarantee clean failure handling.
3. **`defineResource` integration** – Update the public entry point to execute the pipeline while preserving TypeScript typings and runtime behaviour. Provide a clear migration path from the feature flag introduced in Task 32.
4. **Regression coverage** – Extend tests to validate reporter messages, cache key generation, grouped API getters, and store registration across Node and browser mocks. Where necessary, refactor oversized fixtures to honour the ≤500 SLOC guideline.

**Completion placeholder**

- [ ] _Task 34 complete - replace this line with PR link and date when finished._

---

## Patch 0.9.4 - Task 35: Buffer & Extension Diagnostics

Use the buffer slot to harden diagnostics, extension hooks, and migration guards before the minor release-surfacing warnings for missing helpers and documenting the new extension points.

_Referenced from:_

- [`packages/core/src/pipeline/createPipeline.ts` §83-153](../../core/src/pipeline/createPipeline.ts#L83-L153)

### 🧩 Task: Polish Diagnostics and Extension Story

**Objective**: finalise the developer experience for pipeline adopters and confirm the feature flag path toward the minor release.

**Deliverables**

1. **Reporter integration** – Wire pipeline diagnostics into the core reporter so missing or unused helpers surface actionable warnings. Keep reporter adapters ≤500 SLOC and expose helper functions for direct testing.
2. **Rollback validation** – Simulate helper failures to exercise commit/rollback hooks. Confirm pipelines unwind side effects cleanly and update tests to guard against regressions.
3. **Documentation sweep** – Refresh `packages/cli/docs/index.md`, `packages/cli/docs/cli-migration-phases.md`, and this phase document with guidance on extending pipelines, naming conventions (reserved `create*` prefix), and the low-complexity rule.
4. **Feature-flag plan** – Finalise the rollout timeline: enable the pipeline by default once diagnostics stabilise, retain an opt-out until 0.10.0 ships, and document the steps required to remove the flag in Task 36.

**Completion placeholder**

- [ ] _Task 35 complete - replace this line with PR link and date when finished._

---

## Minor 0.10.0 - Task 36: Release and Documentation Rollup

Once patches ship, flip the pipeline on by default, remove legacy paths, and cut the coordinated minor release per the standard checklist.

_Referenced from:_

- [`packages/cli/docs/mvp-plan.md` §67-75](../../cli/docs/mvp-plan.md#L67-L75)

### 🧩 Task: Cut Phase 6 Minor Release

**Objective**: complete the transition by making pipelines the sole execution path and documenting the release thoroughly.

**Deliverables**

1. **Flag removal** – Delete the temporary feature flags and any legacy branches. Ensure the surviving helpers honour the reserved `create*` naming policy, retain low-complexity structure, and keep modules/tests ≤500 SLOC.
2. **Full validation** – Run monorepo checks (`pnpm lint --fix`, `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm test`, plus targeted core/cli suites) and capture artefacts for release notes. Address any helper naming violations discovered during the sweep.
3. **Changelog rollup** – Update root and package changelogs with the phase summary, referencing updated CLI documentation and this spec. Call out the pipeline naming convention and testing guarantees for future contributors.
4. **Release PR** – Publish the release PR via the established template, highlighting parity validation, diagnostics improvements, and the enforcement of low-complexity helper design.

**Completion placeholder**

- [ ] _Task 36 complete - replace this line with PR link and date when finished._

---

### Summary

This phase keeps the AST/pipeline doctrine intact while unlocking modular orchestration for the core runtime. The added guidance enforces the reserved `create*` prefix for pipeline factories, low-complexity helper design, exported testable units, and the ≤500 SLOC rule so parity upgrades remain maintainable.

_Referenced from:_

- [`packages/core/src/pipeline/createPipeline.ts` §83-153](../../core/src/pipeline/createPipeline.ts#L83-L153)
