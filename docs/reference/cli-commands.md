# CLI commands

The WPKernel CLI orchestrates the full lifecycle of a plugin. Each command below is available directly as `wpk <command>`.

## `wpk init`

Scaffolds a new plugin with a wpk config, TypeScript build tooling, and Composer wiring. Use it once per project.

## `wpk generate`

Reads `wpk.config.ts`, normalises the IR, and writes generated artifacts under `.generated/**`:

- TypeScript declarations
- PHP controllers and registrars
- REST argument maps
- DataViews fixtures

Pass `--dry-run` to preview changes or `--verbose` to inspect printer output.

## `wpk apply`

Promotes generated artifacts into working directories (`inc/`, `blocks/`, etc.) and performs safety checks:

- Confirms destination files are writable
- Creates backups when `--backup` is provided
- Skips prompts with `--yes`
- Forces overwrites with `--force`

Run this command after reviewing the diff from `wpk generate`.

## `wpk start`

Runs the generator in watch mode and rebuilds assets. Ideal during development: it reacts to wpk config changes, reruns printers, and refreshes Vite builds automatically.

## `wpk build`

One-shot version of `start`. Generates artifacts, builds assets, and exits with a non-zero status on failure. Use it in CI pipelines or release automation.

## `wpk doctor`

Validates the wpk config, checks Composer autoloading, and verifies WordPress integration. Run it whenever the CLI behaves unexpectedly.

## Golden path

```mermaid
graph LR
    A[wpk init] --> B[Edit wpk.config.ts]
    B --> C[wpk generate]
    C --> D[wpk apply]
    D --> E[wpk start]
```

Follow the arrows each time you add a resource, block, or capability hint. `wpk build` mirrors `wpk start` without the watcher, and `wpk doctor` can be invoked at any point in the flow.
