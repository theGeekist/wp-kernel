## Observations while reproducing `npm create @wpkernel/wpk`

- The scaffolder completes successfully but still needs ~15 s in this container even with progress bars disabled (`npm_config_progress=false`).
- The generated project does **not** install or expose the CLI binary. Immediately after scaffolding, `wpk --help`, `npm wpk generate`, and `pnpm wpk generate` all fail because the command is missing.
- The `package.json` produced by the generator lacks both `@wpkernel/cli` and `tsx`, so none of the `wpk ...` npm scripts can run out of the box.

## Observations while reproducing `wpk generate`

1. The scaffolded project follows the public docs and exposes a `"generate": "wpk generate"` npm script, but running `wpk generate` directly fails immediately because the binary is missing. We then tried `npm wpk generate` per npm’s guidance and `pnpm wpk generate` to simulate `pnpm exec`, and all three invocations collapsed because no `wpk` command was installed.【F:docs/.vitepress/critical-create-generate-failure.md†L122-L130】
2. Manually installing the CLI (`npm install --save-dev @wpkernel/cli`) finally places the `wpk` binary under `node_modules/.bin` and surfaces the CLI entry point.【F:docs/.vitepress/critical-create-generate-failure.md†L131-L135】
3. Running `pnpm wpk generate` afterwards immediately crashes because the CLI runtime expects a lazy dependency on `tsx`, which the scaffold never installs. Installing `tsx` manually unblocks that step.【F:docs/.vitepress/critical-create-generate-failure.md†L129-L135】
4. A second crash follows: the CLI looks for `node_modules/@wpkernel/cli/dist/packages/php-driver/php/pretty-print.php`, but the published bundle does not contain that `php` directory. The actual script lives under `@wpkernel/php-driver/php/pretty-print.php`, so the process aborts even though composer assets (and `vendor/autoload.php`) exist.【F:docs/.vitepress/critical-create-generate-failure.md†L136-L138】

### Canonical CLI workflow

The quickstart and homepage both frame the intended developer loop as “edit `wpk.config.ts`, run `wpk generate`, then `wpk apply`.” After the initial `wpk create` or `wpk init`, developers iterate on `wpk generate` as many times as needed, and only invoke `wpk apply` when they are ready to materialise the staged plan into their working copy via the transactional patcher. 【F:docs/index.md†L9-L127】【F:docs/packages/cli.md†L26-L33】

## Manual regression check (local workspace build)

### Workspace build attempt

Running the package builds in release order immediately surfaces the missing module graph that doomed the earlier bootstrapper. `pnpm --filter @wpkernel/create-wpk build` fails until the core dist is produced, and the core build itself aborts until `@wpkernel/pipeline` ships compiled helpers. Even after backfilling the pipeline and php-driver bundles, `pnpm --filter @wpkernel/cli build` collapses with 182 TypeScript errors because the CLI references generated reporter/context types that the php-json-ast and wp-json-ast packages have not emitted yet. The log shows vite attempting to bundle the CLI before those artefacts exist and bailing on `@wpkernel/php-driver` exports. 【90df11†L1-L18】【21c693†L1-L18】【c3c284†L1-L32】【9e4991†L1-L80】

### Compiled bootstrapper smoke test

With the partial builds in place, invoking the compiled bootstrapper (`node packages/create-wpk/dist/index.js my-plugin`) from a clean `/tmp` workspace immediately crashes. Node cannot resolve the bundled php-driver import because the CLI dist still expects `node_modules/@wpkernel/php-driver/dist/index.js`, so the process exits before any readiness helper runs. 【4940cc†L1-L19】

### Source-mode scaffolding (skip install)

After forcing source mode (`WPK_CLI_FORCE_SOURCE=1`) and rebuilding the php/json AST packages, the bootstrapper finally scaffolds a plugin. The readiness log captures the hygiene, git, PHP runtime, and php-driver helpers marching through detect → confirm while we deliberately skip dependency installation to keep timing measurements clean. 【24a1ea†L1-L16】【c641b0†L1-L1】【f68c56†L1-L26】

### Baseline installation timing and binary gap

Executing `pnpm install` inside the scaffolded plugin takes 8.1 s on this container once `skip-install` is lifted, which gives us a repeatable baseline for readiness timing gates. Even after the install completes, `node_modules/.bin` still lacks a `wpk` entry and `pnpm wpk generate` fails immediately, confirming that the generated workspace omits both `@wpkernel/cli` and its `tsx` peer dependency. 【eb6460†L1-L26】【a462a4†L1-L2】【e4d357†L1-L2】【7d398b†L1-L2】

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

## Task 57 – Deterministic validation plan

_Surface the failure → fix it → retire the brittle pathway. Each probe must land beside the readiness helpers it exercises so DXIRv1 remains executable documentation, not tribal knowledge._

### 57a — ReleasePack Chain

**Probe (behaviour).** Add a `releasePackChain` helper under `packages/cli/src/dx/readiness/helpers/release-pack.ts` that replays the publish order (`@wpkernel/pipeline` → `@wpkernel/core` → `@wpkernel/php-driver` → `@wpkernel/cli` → `@wpkernel/create-wpk`) using the existing build entry points in each package (`package.json#scripts.build`). The helper should shell out with the same executor as `packages/cli/src/dx/readiness/helpers/installers.ts` so reporter timing captures align. When any artefact is missing—missing `.js` extensions, uncompiled reporters, absent dist bundles—emit `EnvironmentalError(build.missingArtifact)` with the first failing workspace in `data.subject`, plus the captured stdout/stderr for context. 【90df11†L1-L18】【21c693†L1-L18】【c3c284†L1-L32】【9e4991†L1-L80】

**Fix (behaviour).** Normalize build preconditions across the chain by reusing the typed outputs emitted from `packages/pipeline/tsconfig.build.json` and `packages/core/tsconfig.build.json`. Close any intra-package graph gaps before running the build (for example, confirm `packages/php-driver/dist/index.js` exists before the CLI compiles). When the helper reruns on a clean workspace, confirm phase timings change by <5% to prove idempotency.

**Retire (brittle).** Delete bespoke build order scripts in `packages/create-wpk` that implicitly relied on the source tree. The readiness helper must be the single orchestrator.

### 57b — Bootstrapper Resolution

**Probe.** Author `packages/create-wpk/tests/bootstrapper-resolution.test.ts` that executes the compiled bootstrapper (`dist/index.js`) inside `tests/fixtures/tmp-workspace`. Mirror the temp-dir harness already used in `packages/cli/tests/workspace.test-support.ts` so we can capture the reporter transcript. The probe fails with `EnvironmentalError(bootstrapper.resolve)` when Node attempts to reach back into `packages/cli/src` or when bundled dependencies (`@wpkernel/php-driver`) are missing. 【4940cc†L1-L19】

**Fix.** Ensure the bootstrapper bundles the php-driver assets published under `packages/cli/src/packages/php-driver` and resolves runtime helpers via relative `.js` paths so it never depends on the source tree. Update `packages/create-wpk/package.json#files` if needed.

**Retire.** Remove `WPK_CLI_FORCE_SOURCE` as a requirement for the create path—source-mode should stay a developer escape hatch, not the release path.

### 57c — Quickstart Fidelity

**Probe.** Extend the readiness registry with a `quickstartFidelity` helper that replays the documented `wpk <command>` loop using the scaffolder output created during Task 55 fixtures (`packages/cli/tests/__fixtures__/workspace`). Capture install timing via `reporter.child('install')` and assert a `wpk` binary exists in `node_modules/.bin` immediately after create/init. Failures emit `EnvironmentalError(cli.binary.missing)` or `EnvironmentalError(tsx.missing)` tagged with the command that failed. 【eb6460†L1-L26】【a462a4†L1-L2】【e4d357†L1-L2】【7d398b†L1-L2】

**Fix.** Enhance `packages/cli/src/dx/readiness/helpers/cli-runtime.ts` (new) to inject `@wpkernel/cli` and `tsx` into the scaffold’s `package.json`, mutate the matching lockfile via the installer helper, and update the command tests under `packages/cli/src/commands/__tests__/create.test.ts` to assert `wpk generate` works without manual edits.

**Retire.** Remove guidance suggesting `pnpm wpk` or `npm wpk`. Public docs should continue to show direct `wpk` usage once the binary exists.

### 57d — TSX Runtime Presence

**Probe.** Hoist the current implicit expectation inside `packages/cli/src/config/load-wpk-config.ts` into a readiness helper (`packages/cli/src/dx/readiness/helpers/tsx-runtime.ts`). The helper should call `import.meta.resolve('tsx')` using the same resolver as `loadConfigModule`, logging the path and version. Failures emit `EnvironmentalError(tsx.missing)` with the missing module ID. 【F:packages/cli/src/config/load-wpk-config.ts†L21-L114】

**Fix.** Ensure the helper is wired ahead of generate/apply so it can install TSX (or drop a local shim) deterministically, then confirm through `packages/cli/src/commands/__tests__/generate.test.ts` that retries are idempotent.

**Retire.** Delete comments or documentation that assume developers preinstall TSX.

### 57e — PHP Printer Path Integrity

**Probe.** Create a readiness assertion in `packages/cli/src/dx/readiness/helpers/php-driver.ts` that resolves the PHP printer entry point through `require.resolve('@wpkernel/php-driver/php/pretty-print.php')`. If the resolved path falls under `@wpkernel/cli/dist`, raise `EnvironmentalError(php.printerPath.mismatch)` with both the resolved path and the expected package root. 【F:packages/cli/src/dx/readiness/helpers/php-driver.ts†L20-L162】

**Fix.** Relocate the PHP assets into `@wpkernel/php-driver`’s published fileset and update the CLI builder (`packages/cli/src/builders/plan.ts`) to consume the new location. Add fixture coverage in `packages/cli/src/commands/__tests__/generate.apply.test.ts`.

**Retire.** Stop referencing `dist/packages/php-driver/php/pretty-print.php` from the CLI bundle.

### 57f — Composer Independence

**Probe.** Extend the composer helper (`packages/cli/src/dx/readiness/helpers/composer.ts`) with a `printerAutoload` check that runs `composer show nikic/php-parser --format=json` inside the scaffold. When the command fails, emit `EnvironmentalError(php.autoload.required)` so the readiness report explains the missing autoload. 【de93ab†L1-L29】【c07f32†L1-L2】【5f1634†L1-L12】

**Fix.** Choose one strategy—bundle a PHAR in `packages/php-driver`, generate a CLI-scoped composer vendor tree under `.wpk/vendor`, or ship an autoload stub—and document the decision in `docs/.vitepress/cli-create-init-doctor.md` once implemented. Integration tests in `packages/cli/src/commands/__tests__/generate.test.ts` should verify generation succeeds without touching the plugin’s `vendor` directory.

**Retire.** Any reliance on the plugin workspace’s composer.json to supply php-parser.

### 57g — Generate → Apply Manifest Emission

**Probe.** Add a regression suite in `packages/cli/tests/workspace.test-support.ts` that runs `generate` against a clean fixture and asserts `.wpk/apply/manifest.json` exists even when the plan contains no actions. If missing, throw `EnvironmentalError(apply.manifest.missing)` with the working directory path. 【F:packages/cli/src/builders/patcher.ts†L586-L635】【F:packages/cli/src/commands/generate.ts†L65-L91】

**Fix.** Update `packages/cli/src/builders/patcher.ts` so `createPatcher` writes the manifest immediately after committing the plan. Extend Jest coverage in `packages/cli/src/commands/__tests__/generate.test.ts` to assert the manifest content matches the plan actions.

**Retire.** Remove assumptions that `wpk apply` will create the first manifest.

### 57h — Workspace Hygiene Policy

**Probe.** Introduce a shared helper in `packages/cli/src/dx/readiness/helpers/workspace-hygiene.ts` that fails fast when `git status --porcelain` returns changes. The helper should accept a `--allow-dirty` flag wired through command options and emit `EnvironmentalError(workspace.dirty)` with the summarized diff when dirty workspaces are disallowed. 【F:packages/cli/src/workspace/utilities.ts†L12-L146】

**Fix.** Route create/init/generate/apply through the helper and update their reporters so “checked” vs “changed” outcomes align with the helper’s `performedWork` flag. Cover the flow in `packages/cli/src/commands/__tests__/workspace-hygiene.test.ts`.

**Retire.** Ad-hoc cleanliness checks scattered across commands.

### 57i — Timing Budgets

**Probe.** Build timing capture into the installer and composer helpers (`packages/cli/src/dx/readiness/helpers/installers.ts`, `composer.ts`). Record start/stop timestamps, emit them through `reporter.child('metrics')`, and fail with `EnvironmentalError(budget.exceeded)` when durations exceed configurable ceilings stored in `packages/cli/src/dx/readiness/budgets.ts`. 【eb6460†L1-L26】

**Fix.** Allow CI to override budgets via environment variables while keeping local defaults tied to the observed 8.1 s install baseline. Add snapshot coverage in `packages/cli/src/dx/readiness/__tests__/registry.test.ts` for the timing metadata.

**Retire.** Silent timing drift in installers.

### 57j — Packed End-to-End

**Probe.** Create a CI workflow (`.github/workflows/cli-packed-e2e.yml`) that packs the CLI, installs it into a fresh workspace, and runs `npx wpk generate && npx wpk apply` with readiness logging enabled. The workflow should reuse the workspace harness in `packages/cli/tests/workspace.test-support.ts` so logs stay comparable. Fail the job when any previous probe emits an `EnvironmentalError` post-pack. 【a6f825†L1-L11】

**Fix.** Treat this workflow as the release gate. The packed CLI must match source behaviour byte-for-byte before publish.

**Retire.** Divergences between source mode and tarball installs.

### 57k — Package-Manager Parity

**Probe.** Extend the quickstart helper to execute `npm`, `pnpm`, and `yarn` (Berry with `nodeLinker: node-modules`) in sequence, using the package-manager detection logic in `packages/cli/src/dx/readiness/helpers/installers.ts`. All runs must surface identical reporter transcripts. 【F:packages/cli/src/commands/init/installers.ts†L9-L210】

**Fix.** Normalize binary discovery so `wpk` resolves through each package manager’s exec path. Update docs when divergence is intentional.

**Retire.** PM-specific fallbacks or error messages.

### 57l — Runtime Matrix (Node×PHP)

**Probe.** Run the packed CLI across the minimum supported Node versions (per `package.json#engines`) and PHP 8.1/8.2 inside CI using the Docker harness under `test-harness/docker`. Record reporter output and fail when platform-specific differences appear.

**Fix.** Add shims/polyfills only when required by the contracts in `@wpkernel/core/contracts`.

**Retire.** “Latest-only” assumptions in readiness helpers.

### 57m — Peer-Range Gate

**Probe.** Install the packed tarball into an empty project with `devDependencies: {}` using `pnpm add <tarball> --ignore-scripts`. Fail with `EnvironmentalError(peers.unpublished)` whenever the solver requests versions that are not published (e.g., `0.12.1-beta.2`). 【a6f825†L1-L11】

**Fix.** Align peer and dependency ranges in `packages/*/package.json` with released versions or mark optional peers accordingly.

**Retire.** Peer ranges pointing at unreleased packages.

### 57n — Docs Fidelity

**Probe.** Parse the public CLI docs under `docs/packages/cli.md` and `docs/get-started/*.md` for command snippets, then execute them verbatim inside the fixture workspace. Failures emit `EnvironmentalError(docs.drift)` with the path to the stale snippet.

**Fix.** Either update the documentation or adjust scaffolds until the commands succeed as written. Capture the decision in both the docs and this worklog.

**Retire.** Divergence between public docs and the shipped behaviour.

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
