## Observations while reproducing `npm create @wpkernel/wpk`

- The scaffolder completes successfully but still needs ~15 s in this container even with progress bars disabled (`npm_config_progress=false`).
- The generated project does **not** install or expose the CLI binary. Immediately after scaffolding, `wpk --help`, `npm wpk generate`, and `pnpm wpk generate` all fail because the command is missing.
- The `package.json` produced by the generator lacks both `@wpkernel/cli` and `tsx`, so none of the `wpk ...` npm scripts can run out of the box.

## Observations while reproducing `pnpm wpk generate`

1. Manually installing the CLI (`npm install --save-dev @wpkernel/cli`) finally places the `wpk` binary under `node_modules/.bin` and surfaces the CLI entry point.
2. Running `pnpm wpk generate` afterwards immediately crashes because the CLI runtime expects a lazy dependency on `tsx`, which the scaffold never installs. Installing `tsx` manually unblocks that step.
3. A second crash follows: the CLI looks for `node_modules/@wpkernel/cli/dist/packages/php-driver/php/pretty-print.php`, but the published bundle does not contain that `php` directory. The actual script lives under `@wpkernel/php-driver/php/pretty-print.php`, so the process aborts even though composer assets (and `vendor/autoload.php`) exist.

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
