# DX Phase 9 Work Plan

## Phase Snapshot

- The packed CLI now scaffolds, generates, and applies via `scripts/test/smoke-create-generate.mjs`, giving us an end-to-end sanity check before every release.
- Release-pack, quickstart, TSX runtime, and PHP printer readiness helpers all run against the bundled assets, so the readiness matrix mirrors real installs.
- Remaining DX debt is concentrated in hygiene/installer timing, multi-runtime verification, and automation of the packed workflows.

## Validation Harness

- **Smoke test:** `node scripts/test/smoke-create-generate.mjs` builds `@wpkernel/cli` + `@wpkernel/create-wpk`, scaffolds into `/tmp`, and runs `pnpm exec wpk generate && pnpm exec wpk apply --yes` using the packed tarball.
- **Release-pack CI:** `.github/workflows/ci.yml` calls `packages/cli/scripts/check-release-pack-ci.ts`, ensuring readiness metadata ships with every PR.

## Completed Milestones (57–63)

### Task 57 — ReleasePack Chain _(done)_

- Added `packages/cli/src/dx/readiness/helpers/releasePack.ts` plus CI harness (`packages/cli/scripts/check-release-pack-ci.ts`) so we always confirm artefacts before publishing.
- Wired the helper into `.github/workflows/ci.yml`, capturing metrics for two consecutive runs to detect rebuilds.

### Task 58 — Bootstrapper Resolution _(done)_

- Implemented a readiness helper (`packages/cli/src/dx/readiness/helpers/bootstrapperResolution.ts`) that runs the compiled bootstrapper twice to verify lookup resilience.
- CLI bootstrapper now logs friendly status lines via the CLI reporter, keeping parity between `npm create …` and local runs.

### Task 59 — Quickstart Fidelity _(done)_

- Reworked quickstart readiness (`packages/cli/src/dx/readiness/helpers/quickstart.ts`) to scaffold + run `wpk generate` automatically, ensuring templates pull the packed CLI by default.
- Updated docs and template dependencies so quickstart scripts match the behaviour we test in CI.

### Task 60 — TSX Runtime Presence _(done)_

- Added the TSX runtime helper/tests (`packages/cli/src/dx/readiness/helpers/tsxRuntime.ts`) and bundled `tsx` inside the CLI so TypeScript configs load without extra installs.

### Task 61 — PHP Printer Path Integrity _(done)_

- Hardened php-driver bundling and helper coverage (`packages/cli/src/dx/readiness/helpers/phpPrinterPath.ts`) so the CLI verifies the packaged `pretty-print.php` + autoload chain before reporting readiness.

### Task 62 — Composer Independence _(done)_

- Composer readiness now targets the bundled vendor tree instead of the user workspace (`packages/cli/src/dx/readiness/helpers/composer.ts`), eliminating dependency on local Composer installs.

### Task 63 — Generate → Apply Manifest Emission _(done)_

- Ensured `wpk generate` always writes the apply manifest inside the transaction (builder + readiness tests), so `wpk apply` never runs without a manifest again.

## Upcoming Tasks

### Task 64 — Workspace Hygiene Policy

Standardise git cleanliness checks across commands.

**Completion log.** Update after each run:

- Complete Standardised git cleanliness checks across commands.

**Probe.** Create a helper around `git status --porcelain` that fails with `EnvironmentalError(workspace.dirty)` when dirty workspaces are disallowed, respecting a shared `--allow-dirty` flag.【F:packages/cli/src/workspace/utilities.ts†L12-L146】

**Fix.** Route create/init/generate/apply through the helper and align reporter language (“checked” vs “changed”) with the helper’s `performedWork` flag. Cover the flow in `packages/cli/src/commands/__tests__/workspace-hygiene.test.ts`.

**Retire.** Ad-hoc cleanliness checks.

### Task 65 — Timing Budgets

Capture deterministic timing metrics for installers and composer healers.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

#### 65a — Pipeline adapter for init/create

**Probe.** Replace the hand-rolled `runInitWorkflow` orchestration with a dedicated pipeline so each stage (namespace resolution, plugin detection, dependency resolution, scaffolding) is a helper with structured logging.【F:packages/cli/src/commands/init/workflow.ts†L20-L208】

**Fix.**

1. Add an init pipeline module
   Files:

- packages/cli/src/commands/init/pipeline.ts (new)
- packages/pipeline/src/createPipeline.ts (reference only; no edits)

What to do:

- Build a dedicated pipeline via createPipeline (from packages/pipeline/src/createPipeline.ts) with
  run options tailored to init/create:
    - Inputs: workspace, reporter, projectName, template, force, preferRegistryVersions, env
      overrides (everything currently threaded through InitWorkflowOptions in packages/cli/src/
      commands/init/workflow.ts:20-58).
    - Context carries the workspace + reporter so helpers can log progress.
- Define InitPipelineDraft shapes for the data we currently compute imperatively:
    - namespace/templates (workflow.ts:63-84)
    - scaffold descriptors (scaffold.ts:27-82)
    - plugin detection + collision results (workflow.ts:112-208)
    - dependency metadata (dependency-versions.ts, scaffold.ts replacements)
- Register helpers so we get step-level instrumentation:
    1. init.namespace – slugifies the project name and materialises buildScaffoldDescriptors.
    2. init.detect – wraps detectExistingPlugin (workflow.ts:210-360).
    3. init.collisions – calls assertNoCollisions / buildSkipSet.
    4. init.dependencies – calls resolveDependencyVersions, buildPathsReplacement,
       buildReplacementMap (currently in workflow.ts:70-120 + scaffold.ts:85-132), and logs the
       “init dependency versions resolved …” message when verbose.
    5. init.scaffold (builder) – begins the .begin('init') transaction, invokes writeScaffoldFiles
        - writePackageJson, logs adoption summaries, commits/rolls back like the old code
          (workflow.ts:90-208).
    6. init.result (builder) – packages the manifest/summaries into the final artifact so callers
       still receive an InitWorkflowResult.
- Expose createInitPipeline() plus a convenience runInitPipeline(options) that runs the pipeline and
  returns { artifact }.
  This gives us discrete pipeline steps without rewriting every helper from scratch, and it plugs into
  the existing pipeline instrumentation for timing/diagnostics later.

2. Rewire runInitWorkflow to the pipeline
   Files:

- packages/cli/src/commands/init/workflow.ts
- packages/cli/src/commands/init.ts

What to do:

- Keep the runInitWorkflow(options) export (everything calls it), but have it instantiate/run
  the pipeline from step 1 instead of the hand-written logic. That means the helper functions
  (logAdoptionSummary, detectExistingPlugin, etc.) stay put and are imported by the new pipeline
  module, so existing tests/mocks still apply.
- Update InitCommandRuntimeDependencies (command-runtime.ts:18-41) so the default runWorkflow
  dependency is the new pipeline-powered version. No CLI call-sites need to change because the
  signature stays InitWorkflowOptions → Promise<InitWorkflowResult>.
- Double-check buildCreateCommand and buildInitCommand still receive identical results (summary
  text, manifest, dependency source) so nothing downstream breaks.
- Leave the readiness hooks (init/shared.ts) untouched—those run after the pipeline completes.

3. Adjust unit tests to the new execution path
   Files:
   still exists, most expectations remain valid; we just need to ensure each invocation
   creates a fresh pipeline so Jest mocks are picked up. Easiest fix: have runInitWorkflow call
   createInitPipeline() inside the function (no global singleton) or allow the test to inject a
   pipeline via an optional param.

- Update any assertions that depended on implementation details we removed (e.g., direct try/catch)
  to reflect that pipeline helpers now wrap the transaction. Rollback/verbose logging behaviours
  should remain the same, so the existing test cases continue to apply with minimal tweaks.

4. Verify the CLI surface stays compatible
   After the refactor, run:
   pnpm --filter @wpkernel/cli test -- init.workflow
   pnpm --filter @wpkernel/cli test -- create.command
   pnpm --filter @wpkernel/cli build
   This confirms the pipeline-backed workflow integrates cleanly with create/init and that packaging
   still succeeds.

With this in place, Task 65a delivers a true pipeline-backed init/create flow, giving us helper-
level logging and the foundation for timing budgets (65b) without ballooning the scope—everything is
contained within the init workflow module and its immediate consumers.

#### 65b — Instrument installers & composer healers

**Probe.** Capture deterministic timing data for the heavy-lift steps that run during wpk create/wpk init - namely npm install and the composer “healer” - and fail fast when they exceed configurable budgets.

**Fix.**

1. Add timing utilities + configuration

Files:

- packages/cli/src/commands/init/timing.ts (new)
- packages/cli/src/commands/init/pipeline.ts (or whatever 65a adds)

What to do:

- Create a small helper (e.g., async function measureStage<T>(label, budgetMs, fn)) that records
  performance.now() before/after the awaited call, logs via the pipeline reporter, and throws
  EnvironmentalError('budget.exceeded', …) when durationMs > budgetMs. Include the measured duration
    - budget in the error data.
- Budgets should be configurable via env vars (e.g., WPK_INIT_INSTALL_NODE_MAX_MS,
  WPK_INIT_INSTALL_COMPOSER_MAX_MS). Provide sane defaults (e.g., 12 s for npm, 6 s for composer)
  inside the helper so CI/local dev behave the same unless overridden.
- Return { durationMs, budgetMs } so the pipeline can stash the sample in its artifact for
  telemetry.

2. Instrument the installer stage inside the init pipeline

Files:

- packages/cli/src/commands/init/pipeline.ts
- packages/cli/src/commands/init/installers.ts

What to do:

- Wrap the existing installNodeDependencies call with measureStage('install.npm', budgets.npm, () =>
  installNodeDependencies(…)).
- Decide when to run Composer: check workspace.exists('composer.json') (or reuse the
  plugin detection) and, if present, run installComposerDependencies under its own
  measureStage('install.composer', budgets.composer, …). This uses the helper already defined in
  packages/cli/src/commands/init/installers.ts but has never been wired up.
- Persist the durations in the pipeline artifact (e.g., artifact.timings.installers = { nodeMs,
  composerMs }) so downstream tooling (Task 65d) can emit telemetry.

3. Surface timing data to reporters/tests

Files:

- packages/cli/src/commands/**tests**/init.workflow.test.ts (and/or new pipeline tests)

What to do:

- Update the init workflow tests to mock the installers and assert:
    - measureStage wrapped functions are invoked.
    - Exceeding the budget raises EnvironmentalError('budget.exceeded', …) with the right metadata.
    - Happy-path runs stash timing data in the pipeline artifact.

4. Document overrides + CI hooks

Files:

- docs/.vitepress/critical-create-generate-failure.md (Task 65b entry)
- packages/cli/README.md (installer section, optional)

What to do:

- Mention the new env vars / budgets so CI (and the smoke harness) know how to raise or lower
  tolerances when containers are slow.
- Note that the timing metrics are now available in the pipeline artifact for Task 65d and the
  packed workflow.

**Retire.** Silent timing regressions.

#### 65c — Readiness budget enforcement

**Probe.** Extend the readiness registry so every helper records detect/prepare/execute/confirm timings and fails with `EnvironmentalError(budget.exceeded)` when a helper exceeds its allotted ceiling.

**Fix.**

1. Instrument `ReadinessRegistry.#runPlan` (packages/cli/src/dx/readiness/registry.ts) with `performance.now()` so each helper’s outcome carries `{ detectMs, prepareMs, executeMs, confirmMs, totalMs }`. Update `ReadinessOutcome`/`ReadinessRunResult` types to expose the timing payload.
2. Add budget metadata/overrides (e.g., `ReadinessHelperMetadata['budgetMs']` + registry `helperOverrides?.timing`) and throw `EnvironmentalError('budget.exceeded', { helper, durationMs, budgetMs })` whenever `totalMs > budgetMs`.
3. Surface timings via the helper reporter (`helperReporter.info('completed', { totalMs, budgetMs })`; `helperReporter.error('exceeded budget', …)` before throwing) so CLI logs call out overruns even when the command handles the error.
4. Expand `packages/cli/src/dx/readiness/__tests__/registry.test.ts` (or new tests) to verify timings appear on outcomes and that helpers with budgets fail fast when they exceed the limit.

**Retire.** Readiness helpers running silently slow without contractual enforcement.

#### 65d — Pipeline telemetry & docs

**Probe.** Persist the installer/readiness timing data captured in 65b–65c so we can compare runs (local smoke test + CI) and explain how to interpret the numbers.

**Fix.**

1. Extend the smoke harness (`scripts/test/smoke-create-generate.mjs`) to emit a telemetry JSON (e.g., `artifacts/cli-smoke/telemetry.json`) capturing commit SHA, npm/composer durations from the init pipeline, and the readiness helper timings surfaced by the registry.
2. Add a CLI script under `packages/cli/scripts/` (or extend `check-release-pack-ci.ts`) that appends the same telemetry to `docs/internal/ci/init-readiness-telemetry.json`, keeping only the latest ~50 entries for comparison.
3. Update `.github/workflows/ci.yml` to run the telemetry script and upload the JSON as an artifact (e.g., `init-readiness-telemetry`) alongside the release-pack metrics so every PR has traceable numbers.
4. Document the telemetry format/override knobs in this worklog (and CLI README) so developers know where to find the installer + readiness timings and how to tune the budgets when CI hardware differs.

**Retire.** One-off log spelunking to understand installer/readiness performance; timings become first-class release data.

### Task 66 — Packed End-to-End

Validate packed CLI behaviour matches source using a release-gate workflow.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Discovery to finish before coding.**

- Define the CI workspace fixture (folder layout, caching strategy) for installing tarballs.
- Decide how readiness logs and artefacts are captured for triage (upload as workflow artefacts vs console output).

#### 66a — Workflow bootstrap

**Probe.** Create `.github/workflows/cli-packed-e2e.yml` that packs the CLI, installs it into a temp workspace, and runs `wpk generate && wpk apply`, failing when any readiness helper emits `EnvironmentalError` post-pack.【a6f825†L1-L11】

**Fix.** Ensure the workflow reuses the shared workspace harness and records timing data for comparison.

**Retire.** Source/tarball divergences.

#### 66b — Idempotency & reporting

**Probe.** Run the workflow twice (or add a rerun step) verifying the second pass is a no-op aside from timing output.

**Fix.** Document how to update the completion log after each successful workflow run.

**Retire.** Manual ad-hoc release testing.

### Task 67 — Package-Manager Parity

Guarantee npm, pnpm, and yarn (Berry) quickstart flows behave identically.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Discovery to finish before coding.**

- Document how to provision Yarn Berry with `nodeLinker: node-modules` inside CI and local harnesses.
- Establish comparison criteria for reporter transcripts across package managers.

#### 67a — Multi-PM harness

**Probe.** Extend quickstart readiness to execute scaffolds with npm, pnpm, and yarn, capturing logs and failing when transcripts diverge beyond allowed tolerances.【F:packages/cli/src/commands/init/installers.ts†L9-L210】

**Fix.** Normalise binary discovery (`wpk` resolution) across package managers and snapshot transcripts.

**Retire.** Package-manager-specific fallbacks.

#### 67b — CI matrix integration

**Probe.** Add CI jobs covering each package manager, sharing fixtures/lockfiles where possible.

**Fix.** Document expected differences (if any) and wire them into timing budgets.

**Retire.** Manual parity checks.

### Task 68 — Runtime Matrix (Node×PHP)

Exercise supported Node and PHP versions to detect drift before release.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Discovery to finish before coding.**

- Identify Docker images or runners providing the supported Node/PHP combinations (per `package.json#engines` and PHP support policy).
- Decide how to compare reporter output across environments (snapshot vs diff tooling).

#### 68a — Matrix workflow

**Probe.** Create a CI matrix that installs the packed CLI across Node/PHP versions, runs `wpk generate && wpk apply`, and records readiness output.

**Fix.** Capture artefacts (logs, manifests) for debugging differences and update this doc with supported versions.

**Retire.** “Latest-only” testing.

#### 68b — Compatibility fixes

**Probe.** Track failures per environment, tagging helper issues (e.g., missing polyfills) for follow-up.

**Fix.** Implement shims based on contract requirements and re-run the matrix, updating completion logs.

**Retire.** Environment-specific guesswork.

### Task 69 — Peer-Range Gate

Ensure packed installs never request unpublished peer versions.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Probe.** Install the packed tarball into an empty project (`devDependencies: {}`) with `pnpm add <tarball> --ignore-scripts`, failing with `EnvironmentalError(peers.unpublished)` when the solver requests non-existent versions.【a6f825†L1-L11】

**Fix.** Align peer and dependency ranges across `packages/*/package.json`, marking optional peers where appropriate. Document changes in release notes.

**Retire.** Peer ranges pointing at unreleased builds.

### Task 70 — Docs Fidelity

Keep public documentation executable and aligned with the CLI behaviour.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Discovery to finish before coding.**

- Choose or build a parser to extract command snippets from `docs/packages/cli.md` and `docs/get-started/*.md`.
- Decide where to store recorded doc-run transcripts for future comparison.

#### 70a — Snippet executor

**Probe.** Implement a runner that executes documentation snippets verbatim inside the fixture workspace, failing with `EnvironmentalError(docs.drift)` when commands diverge.

**Fix.** Add fixtures/tests ensuring snippet execution is deterministic.

**Retire.** Manual doc verification.

#### 70b — Documentation updates

**Probe.** On drift, record the failing snippet path and context.

**Fix.** Update docs or adjust scaffolds to restore parity, annotating changes in both the docs and this worklog. Update completion logs accordingly.

**Retire.** Tribal-knowledge instructions.

## Additional Notes

- The npm bootstrapper now uses the CLI reporter (`packages/create-wpk/src/index.ts`), so users see progress immediately during `npm create @wpkernel/wpk`.
- Release-pack, quickstart, TSX runtime, composer, and PHP printer helpers should continue to treat `packages/cli/dist` as the source of truth—avoid reintroducing workspace-only fallbacks when iterating on readiness.
