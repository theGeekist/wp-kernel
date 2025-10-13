# @geekist/wp-kernel-cli

> Rails-like generators and developer tooling for WP Kernel projects.

## Overview

The CLI turns a single `kernel.config.ts` into everything a WP Kernel plugin needs:

- **Project scaffolding** via `wpk init`
- **Deterministic generation** of TypeScript contracts, UI entrypoints, PHP bridges, and block registrars
- **Safe apply** workflows that merge generated PHP back into `inc/` and copy build artefacts for blocks
- **Adapter extensions** that participate in the pipeline without mutating project sources directly

## Quick start

```bash
pnpm dlx @geekist/wp-kernel-cli init my-plugin
cd my-plugin
pnpm install
```

This scaffolds a Vite-ready plugin with kernel config, TypeScript/ESLint setup, and package scripts wired to the CLI (`start`, `build`, `generate`, `apply`).

## Core workflow: init → generate → apply

1. **Initialise** a project once with `wpk init`.
2. **Generate** artefacts whenever `kernel.config.ts` changes:

    ```bash
    wpk generate           # writes to .generated/**
    wpk generate --dry-run # report-only mode
    wpk generate --verbose # verbose reporter output
    ```

    The pipeline executes in this order:
    1. Type definitions (`.generated/types/**`)
    2. PHP controllers and registries (`.generated/php/**`)
    3. UI bootstrap files (`.generated/ui/**`)
    4. Block artefacts (`.generated/blocks/**`, `.generated/build/**`)

    Block printers derive manifests for SSR blocks, generate auto-registration stubs for JS-only blocks, and emit PSR-4 block registrars alongside resource controllers.

3. **Apply** once the `.generated/` snapshot looks correct:
    ```bash
    wpk apply --yes              # skip clean checks
    wpk apply --backup           # keep .bak copies of overwritten files
    wpk apply --force            # overwrite files missing guard markers
    ```
    `wpk apply` merges guarded PHP files into `inc/`, copies block registrars, and synchronises `.generated/build/**` (e.g. `blocks-manifest.php`) into `build/`. A `.wpk-apply.log` file records every run for auditability.

## Development commands

- `wpk start` watches kernel sources, regenerates artefacts on change, and launches the Vite dev server. Use `--verbose` for additional logging and `--auto-apply-php` to opt into the best-effort PHP copy used by the legacy `wpk dev` command.
- `wpk build` performs a production pipeline in one go: `generate` → Vite `build` → `apply --yes`. Pass `--no-apply` when you want to review `.generated/**` + Vite output without touching `inc/`.

The `start` command replaces `wpk dev`; the latter remains as a deprecated alias for backwards compatibility and prints a warning when invoked.

## Documentation

- **[MVP CLI Spec](./mvp-cli-spec.md)** – authoritative reference for the pipeline
- **[Kernel docs](https://thegeekist.github.io/wp-kernel/)** – framework guides and configuration reference

## Requirements

- Node.js 20+
- pnpm 9+ (recommended)

## Adapter extensions

Adapters can register extension factories to participate in the generation pipeline without mutating `.generated/` directly. Each extension runs inside an isolated sandbox; queued files are only written after the core printers succeed.

```ts
module.exports = {
	// ...kernel.config.js contents
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

Extensions can also call `updateIr(nextIr)` to feed changes back into the printers while keeping the configuration as the single source of truth.

## Contributing

See the [main repository](https://github.com/theGeekist/wp-kernel) for contribution guidelines.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
