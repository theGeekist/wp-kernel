# DX Phase 9 Work Plan

## Phase Snapshot

- The packed CLI now scaffolds, generates, and applies via `scripts/test/smoke-create-generate.mjs`, giving us an end-to-end sanity check before every release.
- Release-pack, quickstart, TSX runtime, and PHP printer readiness helpers all run against the bundled assets, so the readiness matrix mirrors real installs.
- Remaining DX debt is concentrated in hygiene/installer timing, multi-runtime verification, and automation of the packed workflows.

## Validation Harness

- **Smoke test:** `node scripts/test/smoke-create-generate.mjs` builds `@wpkernel/cli` + `@wpkernel/create-wpk`, scaffolds into `/tmp`, and runs `wpk generate && wpk apply --yes` using the packed tarball.
- **Release-pack CI:** `.github/workflows/ci.yml` calls `packages/cli/scripts/check-release-pack-ci.ts`, ensuring readiness metadata ships with every PR.

## Completed Milestones (57–66)

### Task 57 — ReleasePack Chain _(done)_

- [x] Added `packages/cli/src/dx/readiness/helpers/releasePack.ts` plus CI harness (`packages/cli/scripts/check-release-pack-ci.ts`) so we always confirm artefacts before publishing.
- [x] Wired the helper into `.github/workflows/ci.yml`, capturing metrics for two consecutive runs to detect rebuilds.

### Task 58 — Bootstrapper Resolution _(done)_

- [x] Implemented a readiness helper (`packages/cli/src/dx/readiness/helpers/bootstrapperResolution.ts`) that runs the compiled bootstrapper twice to verify lookup resilience.
- [x] CLI bootstrapper now logs friendly status lines via the CLI reporter, keeping parity between `npm create …` and local runs.

### Task 59 — Quickstart Fidelity _(done)_

- [x] Reworked quickstart readiness (`packages/cli/src/dx/readiness/helpers/quickstart.ts`) to scaffold + run `wpk generate` automatically, ensuring templates pull the packed CLI by default.
- [x] Updated docs and template dependencies so quickstart scripts match the behaviour we test in CI.

### Task 60 — TSX Runtime Presence _(done)_

- [x] Added the TSX runtime helper/tests (`packages/cli/src/dx/readiness/helpers/tsxRuntime.ts`) and bundled `tsx` inside the CLI so TypeScript configs load without extra installs.

### Task 61 — PHP Printer Path Integrity _(done)_

- [x] Hardened php-driver bundling and helper coverage (`packages/cli/src/dx/readiness/helpers/phpPrinterPath.ts`) so the CLI verifies the packaged `pretty-print.php` + autoload chain before reporting readiness.

### Task 62 — Composer Independence _(done)_

- [x] Composer readiness now targets the bundled vendor tree instead of the user workspace (`packages/cli/src/dx/readiness/helpers/composer.ts`), eliminating dependency on local Composer installs.

### Task 63 — Generate → Apply Manifest Emission _(done)_

- [x] Ensured `wpk generate` always writes the apply manifest inside the transaction (builder + readiness tests), so `wpk apply` never runs without a manifest again.

### Task 64 — Workspace Hygiene Policy _(done)_

- [x] Introduced a shared workspace cleanliness helper around `git status --porcelain` that fails with `EnvironmentalError(workspace.dirty)` when dirty workspaces are disallowed.
- [x] Routed create/init/generate/apply through the helper and aligned reporter language (“checked” vs “changed”) with the helper’s `performedWork` flag.
- [x] Retired ad-hoc cleanliness checks across commands.

### Task 65 — Timing Budgets

- [x] Pipeline adapter (65a) now routes init/create through `createInitPipeline` for staged logging.
- [x] Installer instrumentation (65b) captures npm/composer timings via the pipeline install builder.
- [x] CLI progress surface (65c) emits start/tick/success/failure logs for installers, generate/apply stages, and doctor readiness.

### Task 66 — Packed End-to-End

Validate packed CLI behaviour matches source using a release-gate workflow.

**Completion log.**

- [x] 2025-11-14 `.github/workflows/ci.yml` smoke job (`scripts/test/smoke-create-generate.mjs`) packs the CLI/create tarballs, installs them into `/tmp`, and drives `wpk generate && wpk apply --yes` directly from the packaged binary.
- [x] 2025-11-14 Reused the smoke harness (`scripts/test/smoke-create-generate.mjs`) so CI installs the packed tarballs into a clean workspace and exercises `wpk generate && wpk apply --yes` via the packaged binary.【scripts/test/smoke-create-generate.mjs†L33-L71】

## Upcoming Tasks

### Task 67 — Package-Manager Parity

Guarantee npm, pnpm, and yarn (Berry) quickstart flows behave identically.

**Primer.** The CLI now accepts `--package-manager <npm|pnpm|yarn>` (or `WPK_PACKAGE_MANAGER` in the environment) so the harness can flip installers without patching the core workflow.

**Completion log.**

- [2025-11-14] `scripts/test/smoke-create-generate.mjs` accepts `--package-managers=` (or `all`) and executes create/generate/apply under npm, pnpm, and yarn sequentially, forwarding the manager flag to `wpk create`.

**Discovery to finish before coding.**

- Document how to provision Yarn Berry with `nodeLinker: node-modules` inside CI and local harnesses.
- Establish comparison criteria for reporter transcripts across package managers.

#### 67a — Multi-PM harness

**Probe.** Extend quickstart readiness to execute scaffolds with npm, pnpm, and yarn, capturing logs and failing when transcripts diverge beyond allowed tolerances.【F:packages/cli/src/commands/init/installers.ts†L9-L210】

**Fix.** The smoke harness provisions separate workspaces per package manager, forwards `--package-manager <manager>` into `wpk create`, and exercises the packaged `wpk` binary under each tool before snapshotting readiness output.【scripts/test/smoke-create-generate.mjs†L33-L129】

**Retire.** Package-manager-specific fallbacks.

#### 67b — CI matrix integration

**Probe.** Add CI jobs covering each package manager, sharing fixtures/lockfiles where possible.

**Fix.** The smoke workflow iterates npm/pnpm/yarn in a single job, so the same readiness harness captures timings/logs for every manager and uploads them with the standard smoke artefacts; any differences surface in that shared run.

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
