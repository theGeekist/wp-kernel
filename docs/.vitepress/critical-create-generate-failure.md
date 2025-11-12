## Observations while reproducing `npm create @wpkernel/wpk`

- The scaffolder completes successfully but still needs ~15 s in this container even with progress bars disabled (`npm_config_progress=false`).
- The generator now ships both `@wpkernel/cli` and `tsx`, so installing dependencies exposes a working `wpk` binary in `node_modules/.bin`.【5ba723†L1-L4】
- The readiness chain still exits non‑zero because the PHP probe shells into the bundled CLI workspace and runs `composer show nikic/php-parser` there, where no composer manifest exists. The scaffolder therefore aborts even though the generated project is otherwise ready to install dependencies.【59859d†L1-L13】

## Observations while reproducing `wpk generate`

1. The scaffolded project follows the public docs and exposes a `"generate": "wpk generate"` npm script. After running `npm install`, `wpk --help` and `npm run wpk -- --help` both resolve via the bundled CLI binary, confirming the dependency gap is closed.【5ba723†L1-L4】
2. `npm run generate` (and direct `npx wpk generate`) still fail, but now because the readiness helper runs `composer show nikic/php-parser` from `node_modules/@wpkernel/cli` instead of the project root. That workspace has no `composer.json`, so composer aborts and the CLI exits with `EnvironmentalError(composer.phpParser.missing)`.【59859d†L1-L13】

### Canonical CLI workflow

The quickstart and homepage both frame the intended developer loop as “edit `wpk.config.ts`, run `wpk generate`, then `wpk apply`.” After the initial `wpk create` or `wpk init`, developers iterate on `wpk generate` as many times as needed, and only invoke `wpk apply` when they are ready to materialise the staged plan into their working copy via the transactional patcher. 【F:docs/index.md†L9-L127】【F:docs/packages/cli.md†L26-L33】

## Manual regression check (local workspace build)

### Workspace build attempt

Running the package builds in release order immediately surfaces the missing module graph that doomed the earlier bootstrapper. `pnpm --filter @wpkernel/create-wpk build` fails until the core dist is produced, and the core build itself aborts until `@wpkernel/pipeline` ships compiled helpers. Even after backfilling the pipeline and php-driver bundles, `pnpm --filter @wpkernel/cli build` collapses with 182 TypeScript errors because the CLI references generated reporter/context types that the php-json-ast and wp-json-ast packages have not emitted yet. The log shows vite attempting to bundle the CLI before those artefacts exist and bailing on `@wpkernel/php-driver` exports. 【90df11†L1-L18】【21c693†L1-L18】【c3c284†L1-L32】【9e4991†L1-L80】

### Compiled bootstrapper smoke test

With the partial builds in place, invoking the compiled bootstrapper (`node packages/create-wpk/dist/index.js my-plugin`) from a clean `/tmp` workspace immediately crashes. Node cannot resolve the bundled php-driver import because the CLI dist still expects `node_modules/@wpkernel/php-driver/dist/index.js`, so the process exits before any readiness helper runs. 【4940cc†L1-L19】

### Source-mode scaffolding (skip install)

After forcing source mode (`WPK_CLI_FORCE_SOURCE=1`) and rebuilding the php/json AST packages, the bootstrapper finally scaffolds a plugin. The readiness log captures the hygiene, git, PHP runtime, and php-driver helpers marching through detect → confirm while we deliberately skip dependency installation to keep timing measurements clean. 【24a1ea†L1-L16】【c641b0†L1-L1】【f68c56†L1-L26】

### Baseline installation timing and binary gap (pre‑beta.3)

Executing `pnpm install` inside the scaffolded plugin takes 8.1 s on this container once `skip-install` is lifted, which gives us a repeatable baseline for readiness timing gates. In the beta.2 run captured below, `node_modules/.bin` still lacked a `wpk` entry and `pnpm wpk generate` failed immediately because the template omitted both `@wpkernel/cli` and its `tsx` peer dependency. The beta.3 smoke test above confirms that dependency gap is now closed even though readiness still fails. 【eb6460†L1-L26】【a462a4†L1-L2】【e4d357†L1-L2】【7d398b†L1-L2】【5ba723†L1-L4】【59859d†L1-L13】

### Tarball installation attempt

Packing the CLI (`pnpm pack --filter @wpkernel/cli`) produces a tarball, but installing it into the scaffold (`pnpm add -D wpkernel-cli-0.12.1-beta.2.tgz`) is blocked because npm cannot satisfy the unpublished peer ranges—the resolver insists on fetching `@wpkernel/php-driver@0.12.1-beta.2`, which does not exist. This mirrors the original npm failure mode and proves we can reproduce it deterministically before release. 【07492e†L1-L287】【a6f825†L1-L11】

### Running CLI from source (pre-composer)

Manually wiring the CLI binary via `WPK_CLI_FORCE_SOURCE=1 node packages/cli/bin/wpk.js generate` gets us into the runtime, but the PHP printer aborts because the scaffold’s composer manifest never pulled in `nikic/php-parser`. The readiness helper logs show the php-driver probe running, the installer attempting to backfill composer dependencies, and the fatal error explaining that autoload metadata is missing. 【b9a035†L1-L1】【de93ab†L1-L29】

### Composer dependency backfill

Running `composer require nikic/php-parser` inside the scaffold resolves the missing autoload, confirming that the CLI can only generate after composer writes the vendor tree. This manual step is the regression we need DX readiness to detect and heal automatically. 【c07f32†L1-L2】【5f1634†L1-L12】

### Generate manifest failure

Even after composer succeeds, the generate flow still fails because the generate transaction never writes `.wpk/apply/manifest.json`. The command finaliser checks for that manifest immediately after committing the workspace and aborts with `Failed to locate apply manifest after generation` when it is missing. Inspecting `.wpk/apply` confirms that only `plan.json` and `state.json` exist, which means the patch manifest the `createPatcher` builder should have recorded during the generate apply phase was never produced. Without that manifest `wpk apply` has nothing to replay, so readiness must gate this earlier in the generate flow instead of assuming the later `wpk apply` command will recover. 【F:packages/cli/src/commands/generate.ts†L70-L103】【F:packages/cli/src/builders/patcher.ts†L590-L642】【e50464†L1-L1】【55d118†L1-L4】【e163da†L1-L8】

### Assessment

- The proposal to stand up a DX-specific orchestration layer on top of `@wpkernel/pipeline` is technically viable. The pipeline runtime is already reused outside the CLI (for example, the core resource pipeline wires its own context, helper kinds, and run result without touching generation code), so creating another configuration that produces “environment readiness” artefacts is consistent with current patterns.
- Phase‑1 discovery has clear entry points. Environment setup for scaffolding lives in the `create` and `init` commands (runtime resolution, workspace hygiene, git checks, and dependency installation), so cataloguing those behaviours will surface what must be unified under DXIRv1.
- The doctor flow currently performs the PHP driver/binary probes imperatively, which makes it a good pilot for “wrap existing checks in the new pipeline” before migrating create/init.
- Generation already drives the shared IR pipeline and commits workspace changes transactionally. Injecting a readiness phase ahead of `pipeline.run()` (to ensure PHP assets, tsx, etc.) lines up cleanly with the proposed “on-demand” Phase‑3 integration.

### Gaps & considerations before execution

- DXIRv1 will need its own notion of “plan/preview/apply/verify”; the core pipeline contracts only return an artifact, diagnostics, and extension commits/rollbacks. There is no baked-in preview/apply distinction today, so the plan should spell out how those phases are modelled (e.g., helper metadata plus extension commits) rather than assuming they exist already.
- The create/init commands build their reporter/workspace context through `createInitCommandRuntime`. Any DX layer has to either wrap that runtime or expose hooks the runtime can call; otherwise the new readiness steps will live beside (instead of in front of) the existing workflow execution.
- Dependency fulfilment still relies on the synchronous npm/composer installers. A deterministic helper needs to account for their side effects (including stderr capturing for actionable diagnostics) so that retries and rollbacks behave well.
- Reporter/log output must remain compatible with the LogLayer transports already configured in the CLI utilities. When you emit DX events, thread them through the same reporter API so structured logs and spinner output stay aligned.
- Adding the new living document under `.vitepress` will require nav/index updates per the docs contribution guide; bake that into the plan so we don’t strand the page without navigation links.

## Task 57 — ReleasePack Chain

Build the publish-order validation probe and enforce deterministic artefact production before release packing.

**Completion log.** Update this list after each run by replacing the placeholder with the date, PR, and outcome summary.

- [x] 57a — 2025-11-11 — Scaffolded `createReleasePackReadinessHelper`, manifest defaults, and unit coverage for missing artefact reporting; wired helper into default registry.
- [x] 57b — 2025-11-11 — Normalised Rollup/Vite build steps to emit manifest artefacts deterministically, added README notes for each package, and captured helper rerun proving no rebuild occurs when outputs exist.
- [x] 57c — 2025-11-11 — Recorded release-pack timing metrics in `docs/internal/ci/release-pack-metrics.json`, instrumented the helper to surface per-package build durations, and added the CI idempotency job that enforces the <5 % delta guardrail.

**Discovery to finish before coding.**

- Catalogue the intended publish order and required artefact list per package (`@wpkernel/core`, `@wpkernel/pipeline`, `@wpkernel/php-driver`, `@wpkernel/cli`, `@wpkernel/create-wpk`) inside `packages/cli/src/dx/readiness/helpers/release-pack.ts`.
- Decide where the helper stores or loads the publish-order manifest (JSON in repo vs generated at runtime) so subsequent reruns stay deterministic.
- Document the temp-workspace harness to invoke builds without polluting the monorepo (e.g., reuse `packages/cli/tests/workspace.test-support.ts`).

### 57a — Manifest & harness bootstrap

**Probe.** Scaffold the `releasePackChain` helper to read the publish-order manifest, create an isolated workspace, and iterate builds in order, failing with `EnvironmentalError(build.missingArtifact)` when required outputs are absent.【90df11†L1-L18】【21c693†L1-L18】【c3c284†L1-L32】

**Fix.** Persist manifest expectations (artefact paths, extension requirements) and wire the helper into the readiness registry. Add unit coverage for manifest parsing and workspace setup. The helper now lives in `packages/cli/src/dx/readiness/helpers/releasePack.ts` with coverage in `packages/cli/src/dx/readiness/helpers/__tests__/releasePack.test.ts`.

**Retire.** Hidden assumptions about build order or relying on monorepo source imports.

### 57b — Deterministic build preconditions

**Probe.** Extend package build scripts so each emits compiled outputs before downstream consumers run; the helper should verify `.js` extensions, type declarations, and dependency closure.

**Fix.** Normalise build tooling (Vite/Rollup configs) to respect the manifest, documenting changes in package READMEs. Ensure re-running the helper detects no work when artefacts exist.

**Retire.** Ad-hoc build chains or silent fallbacks to source files.

### 57c — Idempotent CI integration

**Probe.** Add a CI job that invokes the helper twice, comparing timing deltas (<5 %) and confirming no rebuild occurs on the second pass.

**Fix.** Capture timing metrics in the helper output and persist them for later budget checks.

**Retire.** Build steps that mutate artefacts on no-op runs.

The readiness helper now records per-package build durations and writes each run to `docs/internal/ci/release-pack-metrics.json`, while the CI workflow executes `scripts/readiness/check-release-pack-ci.ts` twice to assert the <5 % timing delta and confirm the second pass performs no rebuilds.

## Task 58 — Bootstrapper Resolution

Guarantee the compiled `create-wpk` bootstrapper resolves only its bundled dependencies in a clean environment.

**Completion log.** Update after each run:

- [x] 2025-11-11 — Added `createBootstrapperResolutionReadinessHelper` to execute `node packages/create-wpk/dist/index.js -- --help` inside a `/tmp/wpk-bootstrapper-*` workspace with `WPK_CLI_FORCE_SOURCE=0`, surfacing `EnvironmentalError(bootstrapper.resolve)` diagnostics when the compiled bootstrapper escapes its tarball dependencies and documenting the harness in code and tests.
- [x] 2025-11-12 — Updated the pipeline build to run `tsc --noEmit` so Vite preserves ESM `.js` specifiers, preventing the helper bundle from rewriting relative imports without extensions; confirmed `node packages/create-wpk/dist/index.js -- --help` resolves in an isolated `/tmp/wpk-bootstrapper-*` workspace.
- [x] 2025-11-12 — Removed the `WPK_CLI_FORCE_SOURCE` escape hatch, forcing the CLI binary to require compiled dist assets and wiring a `bootstrapper` CI job that runs `scripts/check-bootstrapper-resolution-ci.ts` to execute `packages/create-wpk/dist/index.js -- --help` on every PR.

**Discovery to finish before coding.**

- Define the `/tmp` harness (fixture path, environment variables, network stubbing) for executing `packages/create-wpk/dist/index.js` without monorepo fallbacks.
- Inventory the runtime dependencies the bootstrapper should ship (php-driver entrypoints, readiness helpers, config loaders) and how they’re resolved in the packed artefacts.

The harness now lives alongside `createBootstrapperResolutionReadinessHelper` in `packages/cli/src/dx/readiness/helpers/bootstrapperResolution.ts`, spawning `node packages/create-wpk/dist/index.js -- --help` from an isolated temp workspace so reruns remain deterministic. After each execution, append the outcome above the placeholder entry to keep this ledger current.

**Probe.** Implement a readiness helper that shells into the compiled bootstrapper within the isolated workspace and fails with `EnvironmentalError(bootstrapper.resolve)` when module resolution escapes the tarball.【4940cc†L1-L19】

**Fix.** Adjust packaging (Rollup config, `package.json#files`) so dependencies land in the tarball, and update tests to assert the helper succeeds. Document the resolution contract here once implemented.

**Retire.** Source-mode escape hatches (`WPK_CLI_FORCE_SOURCE`) that mask missing bundled files. The bin loader and readiness harness now refuse to honour the flag, and CI exercises the compiled bootstrapper directly so regressions surface immediately.

## Task 59 — Quickstart Fidelity

Ensure the quickstart scaffold mirrors public docs and exposes a working `wpk` binary plus `tsx` immediately after creation.

**Completion log.** Update after each run:

- [x] 2025-11-12 — Quickstart readiness helper now scaffolds via `npm create @wpkernel/wpk`, verifies the bundled `wpk` binary and `tsx` runtime, and the init template ships both dependencies with fixture coverage.
- [x] 2025-11-12 — Readiness logging now records the `npm create` and `wpk generate` durations alongside the resolved binary and `tsx` module paths so the quickstart ledger can cite reproducible timings and asset locations.【F:packages/cli/src/dx/readiness/helpers/quickstart.ts†L288-L297】

**Discovery to finish before coding.**

- Specify how the scaffold injects `@wpkernel/cli` and `tsx` (direct `package.json` edits vs generator templates) and how fixtures reset between runs.
- Capture baseline install timings (`npm install`, `pnpm install`, etc.) for later use in timing budgets.

### 59a — Scaffold dependency injection

**Probe.** Enhance the quickstart helper to create a project via `npm create @wpkernel/wpk` and immediately run `wpk generate`, failing with `EnvironmentalError(cli.binary.missing)` or `EnvironmentalError(tsx.missing)` when dependencies are absent.【F:docs/.vitepress/critical-create-generate-failure.md†L107-L138】

**Fix.** Update scaffold templates so `@wpkernel/cli` and `tsx` land deterministically with lockfile support, extend init integration coverage to assert both devDependencies resolve, and wire the quickstart readiness helper to fail fast with `EnvironmentalError(cli.binary.missing)` or `EnvironmentalError(tsx.missing)` before running `wpk generate`.

**Retire.** Expecting users to install dependencies manually.

### 59b — Readiness & docs alignment

**Probe.** Ensure readiness logs capture install timings and binary detection results, mapping them to doc references (`wpk generate`).

**Fix.** Log quickstart scaffold timings and resolved binary/module paths through the readiness reporter so docs can cite repeatable install baselines and the observed `wpk generate` run.

The helper reports the `npm create` and `wpk generate` durations in the readiness info channel and emits debug entries for the located binary and `tsx` runtime, giving us deterministic artefacts to cite in this log. The success message mirrors those timings, which the unit harness now asserts to keep the messaging stable for future doc updates.【F:packages/cli/src/dx/readiness/helpers/quickstart.ts†L269-L323】【F:packages/cli/src/dx/readiness/helpers/**tests**/quickstart.test.ts†L79-L118】

**Retire.** Divergence between quickstart behaviour and published instructions.

## Task 60 — TSX Runtime Presence

Guarantee the CLI detects and installs `tsx` deterministically with idempotent reruns.

**Completion log.** Update after each run:

- [x] 2025-11-12 — Added the `createTsxRuntimeReadinessHelper` to resolve `tsx` via the CLI module loader paths, install the package with `npm install --save-dev tsx` when absent, and register cleanup so temporary installs are removed after readiness completes.【F:packages/cli/src/dx/readiness/helpers/tsxRuntime.ts†L23-L126】【F:packages/cli/src/dx/readiness/helpers/**tests**/tsxRuntime.test.ts†L7-L48】

**Probe.** Extend `packages/cli/src/dx/readiness/helpers/tsxRuntime.ts` to resolve `tsx` exactly as the CLI loader does, surfacing `EnvironmentalError(tsx.missing)` with module-not-found diagnostics when absent.

**Fix.** Implement deterministic installation or bundling of `tsx`, recording whether work was performed. Document rerun behaviour (short-circuit) in this file once complete.

**Retire.** Implicit devDependency assumptions.

Reruns now short-circuit because the helper reports `ready` when `tsx` is already discoverable, skipping installation while the confirmation step revalidates the resolved module path before exiting.【F:packages/cli/src/dx/readiness/helpers/tsxRuntime.ts†L70-L125】

## Task 61 — PHP Printer Path Integrity

Align PHP asset packaging so runtime resolution matches the bundled tarball contents.

**Completion log.** Update after each run:

- [x] 2025-11-13 — Added the `php-printer-path` readiness helper to compare runtime and module resolutions with canonical `realpath` probes and unit coverage for missing asset and mismatch diagnostics.【F:packages/cli/src/dx/readiness/helpers/phpPrinterPath.ts†L18-L142】【F:packages/cli/src/dx/readiness/helpers/**tests**/phpPrinterPath.test.ts†L1-L209】
- [x] 2025-11-13 — Packed tarball audit now runs `pnpm --filter @wpkernel/php-driver pack --json` plus `tar -tf` to assert the bundle ships `php/pretty-print.php` alongside compiled dist artefacts, with README guidance documenting the expected layout.【F:packages/cli/src/dx/readiness/helpers/**tests**/phpDriverTarball.test.ts†L1-L88】【F:packages/php-driver/README.md†L5-L17】

**Discovery to finish before coding.**

- Audit `@wpkernel/php-driver` packaging (`package.json#files`, bundler output) to list which PHP assets should ship.
- Trace how `packages/cli/src/runtime/php.ts` resolves printer paths today versus inside a packed install.

### 61a — Path verification helper

**Probe.** Add a readiness helper that resolves `pretty-print.php` via the runtime path logic, failing with `EnvironmentalError(php.printerPath.mismatch)` when the path differs between source and tarball.【F:packages/cli/src/runtime/php.ts†L12-L139】

**Fix.** Update package exports and bundler configs so the helper passes in both environments. Cover with source and packed install tests. The CLI now includes a `php-codemod-ingestion` readiness helper that resolves `@wpkernel/php-json-ast/php/ingest-program.php` via the same ingestion runner used at runtime, failing fast when the tarball omits the script or points at mismatched paths.

`createPhpPrinterPathReadinessHelper` now aligns runtime and module resolution by probing canonical paths, raising `EnvironmentalError(php.printerPath.mismatch)` when they diverge. Unit coverage exercises missing runtime assets, resolver failures, and mismatched canonical paths to keep the readiness signal deterministic.【F:packages/cli/src/dx/readiness/helpers/phpPrinterPath.ts†L18-L142】【F:packages/cli/src/dx/readiness/helpers/**tests**/phpPrinterPath.test.ts†L1-L209】

`createPhpPrinterPathReadinessHelper` now aligns runtime and module resolution by probing canonical paths, raising `EnvironmentalError(php.printerPath.mismatch)` when they diverge. Unit coverage exercises missing runtime assets, resolver failures, and mismatched canonical paths to keep the readiness signal deterministic.【F:packages/cli/src/dx/readiness/helpers/phpPrinterPath.ts†L18-L142】【F:packages/cli/src/dx/readiness/helpers/**tests**/phpPrinterPath.test.ts†L1-L209】

**Retire.** Hard-coded dist paths to non-existent assets.

### 61b — Tarball audit & docs

**Probe.** Expand the helper coverage to inspect the packed tarball contents directly (e.g., via `tar -tf`) ensuring PHP assets are present.

**Fix.** Document the expected asset layout here and in the php-driver README. Record audit steps for future releases.

An integration test packs `@wpkernel/php-driver` into a temp workspace, parses the JSON pack manifest, and shells into `tar -tf` to confirm `package/php/pretty-print.php` ships with `package/dist/index.js`, while the php-driver README captures the canonical layout for release reviews.【F:packages/cli/src/dx/readiness/helpers/**tests**/phpDriverTarball.test.ts†L1-L88】【F:packages/php-driver/README.md†L5-L17】

**Retire.** Unverified asset lists.

## Task 62 — Composer Independence

Provide CLI-owned PHP printer assets so generation succeeds without touching the plugin’s composer tree.

**Completion log.** Update after each run:

- [x] 2025-11-13 — Bundled the CLI’s composer vendor tree, wired the `composer` readiness helper into init/create/generate/apply/doctor, and verified CLI-owned autoload paths satisfy PHP printer readiness with the new smoke test.

**Discovery to finish before coding.**

- Evaluate the implementation strategies (PHAR bundle, CLI-scoped vendor cache, autoload stub) with pros/cons (size, update cadence, licensing).
- Determine storage location for CLI-owned assets (e.g., `.wpk/vendor`, embedded PHAR) and how readiness cleans them up.

### 62a — Autoload detection probe (done)

**Probe.** Extend the composer helper to run `composer show nikic/php-parser --format=json`, failing with `EnvironmentalError(php.autoload.required)` when autoload metadata is missing.【de93ab†L1-L29】【c07f32†L1-L2】【5f1634†L1-L12】

**Fix.** Record diagnostics and integrate the helper into generate/apply readiness flows.

**Retire.** Assuming vendor trees exist.

### 62b — Implementation & readiness wiring (done)

**Probe.** Depending on the chosen strategy, add tests confirming generation succeeds with no plugin `vendor` directory.

**Fix.** Implement the selected approach, document the decision here and in `cli-create-init-doctor.md`, ensure readiness reruns are idempotent, and add coverage that the CLI’s bundled autoload satisfies PHP printer checks while missing vendor trees surface `EnvironmentalError(php.autoload.required)`.

**Retire.** Dependence on plugin composer installs.

CLI now ships `vendor/autoload.php` inside its tarball, with helper coverage ensuring that path exists before any PHP helper runs. The smoke test under `scripts/test/smoke-create-generate.mjs` exercises this flow by packing the CLI, scaffolding a project in `/tmp`, and running `wpk generate` without ever touching the user’s composer tree. Readiness logs record which bundled autoload path satisfied the check, and doctor/create/init tests now lean on the helper instead of local fallbacks.

## Task 63 — Generate → Apply Manifest Emission

Guarantee `.wpk/apply/manifest.json` is produced during every generate run.

**Completion log.** Update after each run:

- [x] 2025-11-13 — `createPatcher` now always emits `.wpk/apply/manifest.json` after processing the generated plan and queues it alongside other artefacts, while `GenerateCommand` fails fast with `WPK_EXIT_CODES.UNEXPECTED_ERROR` when the manifest is missing.【F:packages/cli/src/builders/patcher.ts†L586-L635】【F:packages/cli/src/commands/**tests**/generate.command.test.ts†L389-L452】 Apply/patcher integration tests assert the manifest is parsed every run before launching the workflow.

**Probe.** Add regression coverage ensuring `.wpk/apply/manifest.json` exists even for no-op plans, emitting `EnvironmentalError(apply.manifest.missing)` when absent.【F:packages/cli/src/builders/patcher.ts†L586-L635】【F:packages/cli/src/commands/generate.ts†L65-L91】

**Fix.** Adjust `createPatcher` to write the manifest before finalising the command and assert manifest content mirrors the plan actions.

**Retire.** Assuming `wpk apply` creates the initial manifest.

## Task 64 — Workspace Hygiene Policy

Standardise git cleanliness checks across commands.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Probe.** Create a helper around `git status --porcelain` that fails with `EnvironmentalError(workspace.dirty)` when dirty workspaces are disallowed, respecting a shared `--allow-dirty` flag.【F:packages/cli/src/workspace/utilities.ts†L12-L146】

**Fix.** Route create/init/generate/apply through the helper and align reporter language (“checked” vs “changed”) with the helper’s `performedWork` flag. Cover the flow in `packages/cli/src/commands/__tests__/workspace-hygiene.test.ts`.

**Retire.** Ad-hoc cleanliness checks.

## Task 65 — Timing Budgets

Capture deterministic timing metrics for installers and composer healers.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Probe.** Instrument installer/composer helpers to record durations and emit `EnvironmentalError(budget.exceeded)` when configurable ceilings are breached.【eb6460†L1-L26】

**Fix.** Provide CI overrides, persist local baselines from the manual test (8.1 s install), and snapshot timing metadata in registry tests.

**Retire.** Silent timing regressions.

## Task 66 — Packed End-to-End

Validate packed CLI behaviour matches source using a release-gate workflow.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Discovery to finish before coding.**

- Define the CI workspace fixture (folder layout, caching strategy) for installing tarballs.
- Decide how readiness logs and artefacts are captured for triage (upload as workflow artefacts vs console output).

### 66a — Workflow bootstrap

**Probe.** Create `.github/workflows/cli-packed-e2e.yml` that packs the CLI, installs it into a temp workspace, and runs `wpk generate && wpk apply`, failing when any readiness helper emits `EnvironmentalError` post-pack.【a6f825†L1-L11】

**Fix.** Ensure the workflow reuses the shared workspace harness and records timing data for comparison.

**Retire.** Source/tarball divergences.

### 66b — Idempotency & reporting

**Probe.** Run the workflow twice (or add a rerun step) verifying the second pass is a no-op aside from timing output.

**Fix.** Document how to update the completion log after each successful workflow run.

**Retire.** Manual ad-hoc release testing.

## Task 67 — Package-Manager Parity

Guarantee npm, pnpm, and yarn (Berry) quickstart flows behave identically.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Discovery to finish before coding.**

- Document how to provision Yarn Berry with `nodeLinker: node-modules` inside CI and local harnesses.
- Establish comparison criteria for reporter transcripts across package managers.

### 67a — Multi-PM harness

**Probe.** Extend quickstart readiness to execute scaffolds with npm, pnpm, and yarn, capturing logs and failing when transcripts diverge beyond allowed tolerances.【F:packages/cli/src/commands/init/installers.ts†L9-L210】

**Fix.** Normalise binary discovery (`wpk` resolution) across package managers and snapshot transcripts.

**Retire.** Package-manager-specific fallbacks.

### 67b — CI matrix integration

**Probe.** Add CI jobs covering each package manager, sharing fixtures/lockfiles where possible.

**Fix.** Document expected differences (if any) and wire them into timing budgets.

**Retire.** Manual parity checks.

## Task 68 — Runtime Matrix (Node×PHP)

Exercise supported Node and PHP versions to detect drift before release.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Discovery to finish before coding.**

- Identify Docker images or runners providing the supported Node/PHP combinations (per `package.json#engines` and PHP support policy).
- Decide how to compare reporter output across environments (snapshot vs diff tooling).

### 68a — Matrix workflow

**Probe.** Create a CI matrix that installs the packed CLI across Node/PHP versions, runs `wpk generate && wpk apply`, and records readiness output.

**Fix.** Capture artefacts (logs, manifests) for debugging differences and update this doc with supported versions.

**Retire.** “Latest-only” testing.

### 68b — Compatibility fixes

**Probe.** Track failures per environment, tagging helper issues (e.g., missing polyfills) for follow-up.

**Fix.** Implement shims based on contract requirements and re-run the matrix, updating completion logs.

**Retire.** Environment-specific guesswork.

## Task 69 — Peer-Range Gate

Ensure packed installs never request unpublished peer versions.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Probe.** Install the packed tarball into an empty project (`devDependencies: {}`) with `pnpm add <tarball> --ignore-scripts`, failing with `EnvironmentalError(peers.unpublished)` when the solver requests non-existent versions.【a6f825†L1-L11】

**Fix.** Align peer and dependency ranges across `packages/*/package.json`, marking optional peers where appropriate. Document changes in release notes.

**Retire.** Peer ranges pointing at unreleased builds.

## Task 70 — Docs Fidelity

Keep public documentation executable and aligned with the CLI behaviour.

**Completion log.** Update after each run:

- [ ] _Run log placeholder — update after execution_

**Discovery to finish before coding.**

- Choose or build a parser to extract command snippets from `docs/packages/cli.md` and `docs/get-started/*.md`.
- Decide where to store recorded doc-run transcripts for future comparison.

### 70a — Snippet executor

**Probe.** Implement a runner that executes documentation snippets verbatim inside the fixture workspace, failing with `EnvironmentalError(docs.drift)` when commands diverge.

**Fix.** Add fixtures/tests ensuring snippet execution is deterministic.

**Retire.** Manual doc verification.

### 70b — Documentation updates

**Probe.** On drift, record the failing snippet path and context.

**Fix.** Update docs or adjust scaffolds to restore parity, annotating changes in both the docs and this worklog. Update completion logs accordingly.

**Retire.** Tribal knowledge instructions.

## Additional notes

- The spinner that npm prints during scaffolding provides almost no feedback—mirroring the reporter’s “no feedback” concern—and hides the fact that the command is still busy for several seconds.
- Because the CLI never lands in devDependencies by default, the generated npm scripts (`"start": "wpk start"`, etc.) are broken until developers add the package themselves.
- `pnpm wpk generate` is effectively acting like `pnpm exec wpk ...`; without a packaged binary it exits before reaching CLI code, explaining the reporter’s initial “Command 'wpk' not found” result.

---

## USER LOG REPORT:

% time npm create @wpkernel/wpk myPlugin

> geekist-admin@0.0.2 npx
> create-wpk myPlugin

[wpk] init created plugin scaffold for myplugin
created wpk.config.ts
created composer.json
created plugin.php
created inc/.gitkeep
created src/index.ts
created tsconfig.json
created jsconfig.json
created eslint.config.js
created vite.config.ts
created package.json
npm create @wpkernel/wpk myPlugin 10.81s user 8.01s system 32% cpu 58.158 total
jasonnathan@MacBook-Pro-3 plugins % cd myPlugin
jasonnathan@MacBook-Pro-3 myPlugin % ls -la
total 352
drwxr-xr-x@ 16 jasonnathan staff 512 9 Nov 20:16 .
drwxr-xr-x@ 25 jasonnathan staff 800 9 Nov 20:15 ..
-rw-r--r--@ 1 jasonnathan staff 113 9 Nov 20:15 composer.json
-rw-r--r--@ 1 jasonnathan staff 571 9 Nov 20:16 composer.lock
-rw-r--r--@ 1 jasonnathan staff 578 9 Nov 20:15 eslint.config.js
drwxr-xr-x@ 3 jasonnathan staff 96 9 Nov 20:15 inc
-rw-r--r--@ 1 jasonnathan staff 340 9 Nov 20:15 jsconfig.json
drwxr-xr-x@ 166 jasonnathan staff 5312 9 Nov 20:16 node_modules
-rw-r--r--@ 1 jasonnathan staff 143115 9 Nov 20:16 package-lock.json
-rw-r--r--@ 1 jasonnathan staff 1543 9 Nov 20:15 package.json
-rw-r--r--@ 1 jasonnathan staff 2406 9 Nov 20:15 plugin.php
drwxr-xr-x@ 3 jasonnathan staff 96 9 Nov 20:15 src
-rw-r--r--@ 1 jasonnathan staff 545 9 Nov 20:15 tsconfig.json
drwxr-xr-x@ 4 jasonnathan staff 128 9 Nov 20:16 vendor
-rw-r--r--@ 1 jasonnathan staff 1219 9 Nov 20:15 vite.config.ts
-rw-r--r--@ 1 jasonnathan staff 1580 9 Nov 20:15 wpk.config.ts
jasonnathan@MacBook-Pro-3 myPlugin % wpk generate
zsh: command not found: wpk
jasonnathan@MacBook-Pro-3 myPlugin % npm wpk generate
Unknown command: "wpk"

To see a list of supported npm commands, run:
npm help
jasonnathan@MacBook-Pro-3 myPlugin % pnpm wpk generate
[wpk.cli][fatal] Failed to execute /Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/wpk.config.ts: Cannot find package 'tsx' imported from /Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/config/load-wpk-config.js {"name":"WPKernelError","code":"DeveloperError","message":"Failed to execute /Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/wpk.config.ts: Cannot find package 'tsx' imported from /Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/config/load-wpk-config.js","data":{"originalError":{"code":"ERR_MODULE_NOT_FOUND"}},"stack":"WPKernelError: Failed to execute /Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/wpk.config.ts: Cannot find package 'tsx' imported from /Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/config/load-wpk-config.js\n at file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/config/load-wpk-config.js:106:13\n at async #loadConfiguration (/Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/cosmiconfig/dist/Explorer.js:116:36)\n at async #loadConfigFileWithImports (/Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/cosmiconfig/dist/Explorer.js:87:31)\n at async #readConfiguration (/Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/cosmiconfig/dist/Explorer.js:84:51)\n at async search (/Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/cosmiconfig/dist/Explorer.js:50:40)\n at async Explorer.search (/Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/cosmiconfig/dist/Explorer.js:78:20)\n at async Object.R [as loadWPKernelConfig] (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/config/load-wpk-config.js:30:28)\n at async X (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/commands/generate.js:52:15)\n at async Command.execute (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/commands/generate.js:166:17)\n at async Command.validateAndExecute (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/clipanion/lib/advanced/Command.mjs:49:26)"}
jasonnathan@MacBook-Pro-3 myPlugin % npm i tsx

added 5 packages, changed 1 package, and audited 265 packages in 1s

Run `npm audit` for details.
jasonnathan@MacBook-Pro-3 myPlugin % pnpm wpk generate
[wpk.php-driver][stderr] "Could not open input file: /Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/packages/php-driver/php/pretty-print.php\n"
[wpk.cli][fatal] Failed to pretty print PHP artifacts. {"name":"WPKernelError","code":"DeveloperError","message":"Failed to pretty print PHP artifacts.","data":{"filePath":"/Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/.wpk/apply/incoming/plugin.php","exitCode":1,"stderr":"Could not open input file: /Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/packages/php-driver/php/pretty-print.php\n","stderrSummary":["Could not open input file: /Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/packages/php-driver/php/pretty-print.php"]},"stack":"WPKernelError: Failed to pretty print PHP artifacts.\n at Object.c [as prettyPrint] (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/packages/php-driver/dist/prettyPrinter/createPhpPrettyPrinter.js:102:22)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n at async Q (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/builders/plan.js:189:91)\n at async z (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/builders/plan.js:77:13)\n at async K (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/builders/plan.js:54:3)\n at async apply (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/builders/plan.js:27:15)\n at async X (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/commands/generate.js:59:17)\n at async Command.execute (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/@wpkernel/cli/dist/commands/generate.js:166:17)\n at async Command.validateAndExecute (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/clipanion/lib/advanced/Command.mjs:49:26)\n at async Cli.run (file:///Users/jasonnathan/Repos/geekist-admin/wp-content/plugins/myPlugin/node_modules/clipanion/lib/advanced/Cli.mjs:227:24)"}
