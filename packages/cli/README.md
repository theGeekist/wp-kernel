# @wpkernel/cli

> Rails-like generators and developer tooling for WP Kernel projects.

## Overview

The CLI turns a single `wpk.config.ts` into everything a WP Kernel plugin needs:

- **Project scaffolding** via `wpk init`
- **Deterministic generation** of TypeScript contracts, UI entrypoints, PHP bridges, and block registrars
- **Safe apply** workflows that merge generated PHP back into `inc/` and copy build artefacts for blocks
- **Adapter extensions** that participate in the pipeline without mutating project sources directly

### Storage coverage

`wpk generate` now emits controllers for every storage mode used in the framework: `wp-post`, `wp-taxonomy`, `wp-option`, and transient. Transient controllers compute sanitised cache keys and normalise TTL inputs via generated helpers so cache invalidation stays consistent across options and transients.

## Quick start

To start a new project, use the `npm create` command (or `pnpm create` / `yarn create`):

```bash
npm create @wpkernel/wpk my-plugin
cd my-plugin
npm install
```

This scaffolds a Vite-ready plugin with kernel config, TypeScript/ESLint setup, and package scripts wired to the CLI (`start`, `build`, `generate`, `apply`).

## Core workflow: create → generate → apply

1. **Create** a new project with `npm create @wpkernel/wpk` (as shown in Quick Start).
   Alternatively, **Initialise** an existing project with `wpk init`.
2. **Generate** artefacts whenever `wpk.config.ts` changes:

    ```bash
    wpk generate           # writes to .generated/**
    wpk generate --dry-run # report-only mode
    wpk generate --verbose # verbose reporter output
    ```

    The pipeline executes in this order:
    1. Type definitions (`.generated/types/**`)

3. PHP controllers and registries (`.generated/php/**`)
4. UI bootstrap files (`.generated/ui/**`)
5. Block artefacts (`.generated/blocks/**`, `.generated/build/**`)

    Block printers derive manifests for SSR blocks, generate auto-registration stubs for JS-only blocks, and emit PSR-4 block registrars alongside resource controllers.

    Successive runs persist a generation manifest at `.wpk/apply/state.json`, so `wpk generate` prunes stale `.generated/**` files when resources are removed or PHP output/autoload paths change and stages `{ action: 'delete' }` shim entries in `.wpk/apply/plan.json` for `wpk apply` to process.

6. **Apply** once the `.generated/` snapshot looks correct:
    ```bash
    wpk apply --yes              # skip clean checks
    wpk apply --backup           # keep .bak copies of overwritten files
    wpk apply --force            # overwrite files missing guard markers
    ```
    `wpk apply` merges guarded PHP files into `inc/`, copies block registrars, and synchronises `.generated/build/**` (e.g. `blocks-manifest.php`) into `build/`. A `.wpk-apply.log` file records every run for auditability.

## Development commands

- `wpk start` watches kernel sources, regenerates artefacts on change, and launches the Vite dev server. Use `--verbose` for additional logging and `--auto-apply-php` to opt into the best-effort PHP copy pipeline when you also want PHP artefacts updated automatically.
- `wpk build` performs a production pipeline in one go: `generate` → Vite `build` → `apply --yes`. Pass `--no-apply` when you want to review `.generated/**` + Vite output without touching `inc/`.

## Documentation

- **[CLI Migration Phases](./docs/cli-migration-phases.md)** - authoritative reference for the next pipeline
- **[Kernel docs](https://thegeekist.github.io/wp-kernel/)** - framework guides and configuration reference

## Testing Helpers

- `tests/rule-tester.test-support.ts` exports `createRuleTester()` and fixture
  builders that keep ESLint rule suites aligned with the TypeScript parser and
  canonical config snippets.
- `@wpkernel/test-utils/cli` exposes `createCommandContext()`,
  `assignCommandContext()`, `createReporterMock()`, `createMemoryStream()`,
  and `flushAsync()` so suites can share Clipanion wiring without
  re-implementing mocks, streams, or async drains.
- `@wpkernel/test-utils/integration` includes `withWorkspace()` for disposable
  filesystem scaffolds and `createWorkspaceRunner()` to preconfigure prefixes or
  default file layouts per suite (the local `tests/workspace.test-support.ts`
  re-exports these helpers during the migration).
- Integration specs can import `runNodeSnippet()` from `@wpkernel/e2e-utils`
  to exercise CLI failure paths without maintaining bespoke process runners.

## Requirements

- Node.js 20+
- pnpm 9+ (recommended)

## Peer dependencies

Install the workspace builds for `@wpkernel/core`, `@wpkernel/php-json-ast`,
and `@wpkernel/test-utils` alongside the CLI (`workspace:*` ranges). These
packages stay external in the published build so generators can share runtime
contracts with the framework. Run `pnpm lint:peers` (or
`pnpm exec tsx scripts/check-framework-peers.ts`) to verify the versions before
shipping changes.

## Adapter extensions

Adapters can register extension factories to participate in the generation pipeline without mutating `.generated/` directly. Each extension runs inside an isolated sandbox; queued files are only written after the core printers succeed.

```ts
module.exports = {
	// ...wpk.config.js contents
	adapters: {
		extensions: [
			({ namespace, reporter }) => ({
				name: 'telemetry',
				async apply({ queueFile, outputDir }) {
					const path = require('node:path');
					await queueFile(
						path.join(outputDir, 'telemetry.json'),
						JSON.stringify({ namespace })
					);
					reporter.info('Telemetry manifest generated.');
				},
			}),
		],
	},
};
```

Extensions can also call `updateIr(ir)` to feed changes back into the printers while keeping the configuration as the single source of truth.

## Contributing

See the [main repository](https://github.com/theGeekist/wp-kernel) for contribution guidelines.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
