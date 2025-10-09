# `@geekist/wp-kernel-cli` – Package Guide for Agents

The CLI package ships developer tooling for the framework. Use this guide alongside the root policies in `../../AGENTS.md`.

### Scope

Focus on scaffolding commands, code generation, and DX utilities. Keep the CLI aligned with the current architecture-templates should reflect `configureKernel()`, `KernelUIRuntime`, and config-object definitions.

### Build & Test

Run `pnpm test --filter @geekist/wp-kernel-cli` and `pnpm build --filter @geekist/wp-kernel-cli` before committing. If commands generate files, add fixture-based tests to ensure output stays in sync with framework conventions.

### Conventions

Respect package boundaries: consume kernel APIs through public exports, never deep imports. When adding commands that touch documentation or specs, coordinate the updates so generated output references the latest guidance.

Refer to `PHASES.md` in this package for the current roadmap, DoD, and testing expectations before extending the CLI.
