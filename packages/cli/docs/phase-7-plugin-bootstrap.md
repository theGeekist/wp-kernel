# Phase 7 – Plugin bootstrap flow

_Phase reference: packages/cli/docs/mvp-plan.md_

Phase 7 closes the gaps that keep freshly scaffolded projects from activating immediately inside WordPress. The work stretches from the bootstrap installers that invoke `wpk create` to the generators that merge `.generated` artefacts into a plugin-aware codebase.

## Scope at a glance

- `wpk create` already honours `--name` inside [`packages/cli/src/commands/create.ts`](../src/commands/create.ts), but the monorepo does not publish a bootstrapper. We must ship `@wpkernel/create-wpk` using [`scripts/register-workspace.ts`](../../../scripts/register-workspace.ts) so `npm|pnpm create @wpkernel/wpk … -- --name` lands in the CLI.
- `wpk init` currently reuses the scaffold descriptors in [`packages/cli/src/commands/init/scaffold.ts`](../src/commands/init/scaffold.ts); `assertNoCollisions()` fails as soon as an existing plugin provides `composer.json`, `wpk.config.ts`, or other template files. Passing `--force` overwrites those author-owned assets with [`packages/cli/templates/init`](../templates/init) defaults, so Phase 7 must add a detection path that seeds only the missing kernel files when running inside an established plugin.
- The init template stops at an empty `inc/.gitkeep` in [`packages/cli/templates/init/inc`](../templates/init/inc/.gitkeep); the generator never writes a plugin header or loader. Phase 7 introduces an AST helper that emits the bootstrap file when missing and detects user-supplied loaders to avoid clobbering them.
- Resource removals currently leave stale files because `wpk generate` only writes additions in [`packages/cli/src/commands/generate.ts`](../src/commands/generate.ts); the workspace removal helpers in [`packages/cli/src/next/workspace/filesystem.ts`](../src/next/workspace/filesystem.ts) are unused. We will surface deletions in the plan so `wpk apply` cleans them up.
- Templates and docs must explain the activation workflow so plugin authors understand where to add routes, UI, and WordPress-specific glue once the bootstrap lands.

## Patch breakdown

### Patch 0.10.1 – Task 37: Register the bootstrap workspace

Stand up the `@wpkernel/create-wpk` workspace so the monorepo can publish a `npm create` entry point. This patch:

1. Runs [`scripts/register-workspace.ts`](../../../scripts/register-workspace.ts) to scaffold the package, wire the TypeScript paths, and register the workspace in `pnpm-workspace.yaml` and root configs.
2. Adds the package metadata (`package.json`, README, LICENSE) and a tiny Node entry that shells out to the CLI binary but leaves flag forwarding for the next patch.
3. Sets up the release tooling (build scripts, `files` whitelist, bin map) without yet touching docs or integration coverage.

### Patch 0.10.2 – Task 38: Wire the bootstrap proxy & smoke coverage

Finish the bootstrapper by teaching it to invoke the CLI and verifying the flow end-to-end. Ship:

1. A proxy that forwards arguments after `--` (e.g. `--name`) into `packages/cli/bin/wpk.js`, capturing stdout/stderr for diagnostics.
2. Optional analytics/reporting hooks so bootstrap usage can be logged alongside other CLI events.
3. A smoke test inside `packages/cli/tests/integration` that exercises `npm create @wpkernel/wpk -- --name demo` via the new package to prove the invocation lands in `wpk create`.
4. Documentation updates in `packages/cli/docs/index.md` and the README that announce the new bootstrap command.

### Patch 0.10.3 – Task 39: Init adoption guardrails

Make `wpk init` safe to run inside an existing plugin. The patch should:

1. Extend [`assertNoCollisions`](../src/commands/init/scaffold.ts) and [`runInitWorkflow`](../src/commands/init/workflow.ts) so the command skips files the author already owns while still writing missing kernel assets.
2. Detect existing plugin markers (e.g. a plugin header in `inc/*.php`, composer autoload entries) and surface a friendly summary instead of aborting.
3. Add regression coverage for both clean directories and established plugin folders, ensuring `--force` continues to overwrite when explicitly requested.
4. Update `packages/cli/templates/init` to separate kernel-managed files from author-owned scaffolding so later patches can reuse the metadata.

### Patch 0.10.4 – Task 40: Bootstrap generator foundation

Introduce the AST helper that creates the plugin loader without wiring it into generation yet. This work:

1. Adds a builder under `packages/cli/src/next/php` (or a dedicated helper module) that emits the plugin header, namespace, and kernel bootstrap call when no loader exists.
2. Seeds a template in `packages/cli/templates/init/inc` that mirrors the helper output for `wpk init`.
3. Documents the loader contract (expected filename, namespace, exported hooks) so future patches know when it is safe to skip regeneration.
4. Provides unit tests that snapshot the generated AST and confirm the helper respects custom namespace inputs.

### Patch 0.10.5 – Task 41: Generate/apply integration for the loader

Wire the helper into the pipeline so `wpk generate` and `wpk apply` manage the loader automatically. Deliver:

1. Changes to [`packages/cli/src/commands/generate.ts`](../src/commands/generate.ts) that enqueue the loader when missing and record it inside `.wpk/apply/plan.json`.
2. Logic inside [`packages/cli/src/commands/apply.ts`](../src/commands/apply.ts) and the patch planner to merge the loader only if the author has not replaced it, leaving overrides untouched.
3. Updated `.generated/php/index.php` to require the loader so activation works without manual wiring.
4. Integration coverage proving `generate → apply` produces an activatable plugin in a clean workspace while respecting author overrides.

### Patch 0.10.6 – Task 42: Manifest persistence & deletion tracking

Teach the pipeline to remember previous generations so resource removals clean up after themselves. This patch:

1. Persists the prior manifest (likely under `.wpk/apply/manifest.json` or a new cache) and compares it to the new plan to detect removed resources.
2. Uses `workspace.rm` from [`packages/cli/src/next/workspace/filesystem.ts`](../src/next/workspace/filesystem.ts) to delete stale `.generated` artefacts and stage shim removals for `apply`.
3. Extends the manifest writer in [`packages/cli/src/next/apply/manifest.ts`](../src/next/apply/manifest.ts) to emit deletion actions alongside additions.
4. Covers the behaviour with integration tests that drop a resource from `wpk.config.ts` and assert the old files disappear while untouched author code remains.

### Patch 0.10.7 – Task 43: Apply cleanup & override safety

Ensure the deletion path respects user code and surfaces diagnostics. Ship:

1. Guardrails in the apply planner so shim removals only occur when the file still matches the previous kernel-generated stub (hash or marker comparison).
2. User-facing logs summarising deleted files and skipped removals when overrides are detected.
3. Targeted cleanup commands or helpers (if needed) that let authors manually prune legacy artefacts when automation skips them.
4. Additional integration coverage that captures mixed scenarios (one resource removed cleanly, another retained due to overrides).

### Patch 0.10.8 – Task 44: Activation smoke & docs alignment

Polish the author experience and documentation once the generator is stable. Deliver:

1. Richer comments inside `wpk.config.ts`, `src/index.ts`, and the plugin loader template explaining how to extend the scaffold.
2. A Playwright- or PHPUnit-backed smoke test that runs `wpk create`, `wpk generate`, `wpk apply --yes`, activates the plugin in WordPress, and asserts the header is detected.
3. Documentation updates across `packages/cli/docs` (index, MVP plan, migration briefs) and the README to reflect the turnkey workflow and the `npm create` entry point.
4. Optional DX niceties (e.g. post-create tips) so authors know the next steps after activation.

## Minor 0.11.0 – Task 45

After patches 37-44 land, run the unified release checklist:

1. Roll the 0.11.0 minor across the monorepo and update every changelog.
2. Capture the bootstrap flow in `packages/cli/docs/mvp-plan.md` and supporting guides.
3. Tag the release once tests and documentation updates merge.
