# @wpkernel/cli

> Rails-like generators and developer tooling for WP Kernel projects.

## Overview

The CLI turns a single `wpk.config.ts` into a production-ready plugin. It scaffolds resources,
actions, UI entrypoints, DataViews wiring, PHP bridges, and block registrars while keeping
code generation deterministic. `wpk generate` and `wpk apply` form the core workflow, with
adapters and extensions riding on the shared `@wpkernel/pipeline` runtime.

## Quick links

- [Package guide](../../docs/packages/cli.md)
- [CLI migration phases](../../docs/cli-migration-phases.md)
- [CLI MVP plan](../../docs/internal/cli-mvp-plan.md)
- [API reference](../../docs/api/@wpkernel/cli/README.md)
- [PHP codemod roadmap](../../docs/internal/php-json-ast-codemod-plan.md)

## Installation

### New project

```bash
npm create @wpkernel/wpk my-plugin
cd my-plugin
npm start
```

The create wrapper installs `@wpkernel/cli` as a dev dependency and exposes the `wpk` binary.

### Existing project

```bash
pnpm add -D @wpkernel/cli
```

Ensure Node.js 20+ and pnpm 9+ (or npm 10+/yarn Berry) are available for the TypeScript + Vite toolchain.

## Quick start: init → generate → apply

```bash
# 1. Define resources, actions, and capabilities in wpk.config.ts

# 2. Generate artefacts (writes to .generated/**)
wpk generate

# 3. Apply guarded changes into inc/ and build manifests
wpk apply

# 4. Run health checks and pipeline diagnostics
wpk doctor
```

`wpk generate` records a manifest in `.wpk/apply/state.json` so successive runs prune stale
files. `wpk apply` performs guarded merges, optionally keeping `.bak` copies and honouring
`--force` / `--yes` flags for CI automation.

## Command reference

| Command        | Summary                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------ |
| `wpk init`     | Scaffold wpk config, resources, and project plumbing inside an existing repo.              |
| `wpk generate` | Emit TypeScript, PHP, UI, and block artefacts from the current configuration.              |
| `wpk apply`    | Apply the staged plan with guard markers, deletion manifests, and audit logs.              |
| `wpk doctor`   | Validate dependencies, project health, and pipeline diagnostics.                           |
| `wpk start`    | Watch wpk sources, regenerate artefacts, and launch the Vite dev server.                   |
| `wpk build`    | Run `generate → vite build → apply --yes` in one step (pass `--no-apply` to skip merging). |

Use `wpk <command> --help` for flag documentation. Storage coverage spans `wp-post`, `wp-taxonomy`,
`wp-option`, and transient controllers. Generated PHP pipelines mirror the server scaffolding so
cache invalidation and capability checks stay consistent.

## Pipeline & codemod integration

- Built on `@wpkernel/pipeline` helpers for deterministic execution, diagnostics, and rollback.
- Adapters can register pipeline extensions that queue files or mutate the IR via `updateIr()`.
- The CLI threads PHP codemod configuration into `@wpkernel/php-json-ast` helpers; consult the
  [codemod plan](../../docs/internal/php-json-ast-codemod-plan.md) before enabling visitor stacks
  or diagnostics in new pipelines.

## Validation & test utilities

- Run `pnpm --filter @wpkernel/cli test:coverage` before shipping changes.
- `@wpkernel/test-utils/cli` exposes command contexts, reporter mocks, and memory streams.
- Integration suites reuse workspace helpers from `@wpkernel/test-utils/integration` (re-exported
  via `tests/workspace.test-support.ts`).
- End-to-end specs can drive CLI workflows with `runNodeSnippet()` from `@wpkernel/e2e-utils`.

## Requirements & peers

- Node.js 20+
- pnpm 9+ (or npm/yarn alternatives with workspace support)
- Workspace dependencies: `@wpkernel/core`, `@wpkernel/test-utils`, `@wpkernel/php-json-ast`
  (linked via `workspace:*` so builds share runtime contracts)
- Run `pnpm lint:peers` to confirm peer ranges before publishing.

## Contributing

See the [repository contribution guide](../../README.md#contributing). Keep new commands wired
through `src/index.ts`, add fixtures for generated output, and update the migration docs when
pipelines or storage modes change.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
