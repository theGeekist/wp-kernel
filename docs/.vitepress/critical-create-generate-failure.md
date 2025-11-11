## Observations while reproducing `npm create @wpkernel/wpk`

- The scaffolder completes successfully but still needs ~15 s in this container even with progress bars disabled (`npm_config_progress=false`).
- The generated project does **not** install or expose the CLI binary. Immediately after scaffolding, `wpk --help`, `npm wpk generate`, and `pnpm wpk generate` all fail because the command is missing.
- The `package.json` produced by the generator lacks both `@wpkernel/cli` and `tsx`, so none of the `wpk ...` npm scripts can run out of the box.

## Observations while reproducing `pnpm wpk generate`

1. Manually installing the CLI (`npm install --save-dev @wpkernel/cli`) finally places the `wpk` binary under `node_modules/.bin` and surfaces the CLI entry point.
2. Running `pnpm wpk generate` afterwards immediately crashes because the CLI runtime expects a lazy dependency on `tsx`, which the scaffold never installs. Installing `tsx` manually unblocks that step.
3. A second crash follows: the CLI looks for `node_modules/@wpkernel/cli/dist/packages/php-driver/php/pretty-print.php`, but the published bundle does not contain that `php` directory. The actual script lives under `@wpkernel/php-driver/php/pretty-print.php`, so the process aborts even though composer assets (and `vendor/autoload.php`) exist.

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

Even after composer succeeds, the generate flow still fails because the apply pipeline never emits `.wpk/apply/manifest.json`. The CLI exits with `Failed to locate apply manifest after generation`, and inspecting `.wpk/apply` confirms that only `plan.json` and `state.json` exist. No manifest means `wpk apply` cannot replay the plan, so readiness must gate this before release. 【e50464†L1-L1】【55d118†L1-L4】【e163da†L1-L8】

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

1. **Gate the build chain with a release smoke test.** Extend the DX readiness suite with a `createPackagedCliBuild` helper that executes the same `pnpm --filter` build sequence we ran manually (`@wpkernel/pipeline` → `@wpkernel/core` → `@wpkernel/php-driver` → `@wpkernel/cli` → `@wpkernel/create-wpk`). Capture the `ERR_MODULE_NOT_FOUND` and TypeScript diagnostics that appear when any dist artefact is missing, and fail the helper until all five packages compile. Wire this helper into a CI job that runs `pnpm pack` and uploads the tarballs for downstream checks so the missing `.js` extensions and uncompiled deps are caught before publish. 【90df11†L1-L18】【21c693†L1-L18】【c3c284†L1-L32】【9e4991†L1-L80】【07492e†L1-L287】
2. **Add a bootstrapper execution probe.** Create an integration test under `packages/create-wpk/tests` that shells out to the compiled `dist/index.js` in a temp directory. Assert that it exits cleanly without needing `WPK_CLI_FORCE_SOURCE=1` and emits the same readiness events we observe in source mode. Fail the test if Node reports the php-driver module is missing, reproducing the crash we hit in `/tmp`. 【4940cc†L1-L19】
3. **Ensure scaffolds install the CLI and tsx automatically.** Update the create/init readiness plan to inject a `cli-runtime` helper that edits the generated `package.json` before installers run, adding `@wpkernel/cli` and `tsx` devDependencies plus the appropriate lockfile updates. Extend the readiness registry tests to verify that a subsequent `pnpm install` drops a `wpk` binary into `node_modules/.bin` and that the helper logs the elapsed installation time (targeting the observed 8.1 s baseline). 【f68c56†L1-L26】【eb6460†L1-L26】【a462a4†L1-L2】【e4d357†L1-L2】【7d398b†L1-L2】
4. **Harden composer readiness for the PHP printer.** Expand `packages/cli/src/dx/readiness/helpers/composer.ts` so it checks for `nikic/php-parser` inside `vendor/composer/installed.json`, installs it when absent, and records the outcome in the reporter log. Cover the helper with an integration test that boots a scaffold lacking vendor files, confirming that the CLI no longer aborts with the php-parser error we reproduced. 【de93ab†L1-L29】【c07f32†L1-L2】【5f1634†L1-L12】
5. **Verify apply manifest emission.** Add a regression harness to `packages/cli/tests/workspace.test-support.ts` that runs `wpk generate` inside a fixture workspace and asserts that `.wpk/apply/manifest.json` exists with at least one planned action. Extend the readiness registry to surface a fatal diagnostic when the manifest is missing so the command never reaches `wpk apply` with an empty plan. 【55d118†L1-L4】【e163da†L1-L8】
6. **Exercise the packed CLI end-to-end.** Introduce a CI pipeline step that installs the freshly packed tarball into a temp project, runs `pnpm install`, and executes `npx wpk generate`/`npx wpk apply`. Record the elapsed install and command durations so we can enforce upper bounds going forward, and ensure the job fails when npm cannot resolve the unpublished peer ranges we observed locally. 【a6f825†L1-L11】

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
