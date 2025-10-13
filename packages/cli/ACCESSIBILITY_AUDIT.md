# Accessibility & API Surface Audit - `@geekist/wp-kernel-cli`

## Purpose & Scope

This report inspects the CLI package with attention to the discoverability of commands, naming consistency, and opportunities for more composable abstractions that improve accessibility for plugin authors and tooling.

## High-level Observations

- **Clipanion command wrappers are consistent.** All commands extend `Command`, use `static paths`, and centralise execution logic in `execute`, leading to a predictable surface for contributors.
- **Runtime orchestration is implicit.** `runCli` builds a shared `Cli` instance and registers commands in module scope. This keeps startup simple but makes custom command injection or testing of partial registries difficult.
- **Reporter integration is well-factored.** Commands such as `GenerateCommand` accept `verbose`/`dryRun` flags and construct reporters with namespaced labels, which increases observability.

## Command Surface Consistency

- Command file names follow verb-noun pairs (`generate`, `init`, `doctor`), mirroring user-facing verbs. Method names inside commands (`execute`) are constrained by Clipanion, so consistency is inherited.
- Supporting modules under `commands/run-generate/*` are noun-based (e.g., `load-config`, `prepare-generation`, `summary`). Each exports purposeful verbs (`runGenerate`, `renderSummary`, `commitExtensions`), maintaining clarity.
- Some adapters under `printers/` and `adapters/` mix default exports with named exports. Aligning on named exports would improve tree-shakeability and reduce ambiguity.

## Accessibility & Developer Experience

- **Help Output:** Root command prints a friendly banner with version details. However, subcommands rely on Clipanion’s default help. Providing richer descriptions or grouping options would improve accessibility for new users.
- **Error Surfacing:** `runGenerate` returns structured results with `exitCode` and optional `output`. Failures use numeric exit codes but lack a shared enum, so correlating CLI exit states across packages is manual.
- **Testing Hooks:** `GenerateCommand` stores the last `summary` on the instance, aiding integration tests. Similar hooks do not exist for other commands, creating inconsistent testability.

## Complexity & Extensibility

- `runCli` registers commands once; consumers cannot easily extend the CLI with bespoke commands without re-creating the registry. Exposing a factory to compose the command set would increase future extensibility.
- `runGenerate` orchestrates config loading, preparation, printer execution, and extension commits in a linear pipeline. The pipeline is readable but hides intermediate instrumentation points. Providing middleware hooks for each phase would improve composability for teams adding generators.
- Exit code logic is distributed: configuration errors, preparation failures, and extension commit errors each return ad-hoc numbers. Centralising exit code definitions would reduce accidental overlaps.

## Opportunities for Composability & Purity

- Export a `createCli` factory returning a configured `Cli` instance. This would let consumers register additional commands while reusing defaults, and facilitate unit testing by injecting mocked IO streams.
- Publish a shared `enum` or constant map of exit codes from `run-generate`. Other command modules (e.g., build/dev) could reuse them for consistency.
- Provide pure reporter adapters (e.g., JSON reporter) to improve machine-readability when the CLI runs in CI environments.

## Recommendations

1. Introduce a command registry factory (`createCli`) so that extensions can register new commands without forking `runCli`.
2. Consolidate exit code constants into a shared module exported for other commands and documentation.
3. Expand command usage metadata with richer examples and option descriptions to improve first-run accessibility.
4. Align module exports on named exports to keep surfaces explicit and easier to tree-shake.

## Phased Work Plan

### Phase 0 – Adopt Monorepo Contracts

- Consume the shared lifecycle, namespace, and exit code constants published by the kernel once Phase 0 work lands there.
- Update CLI documentation to reference the cross-package accessibility expectations (error handling, reporter structure, semantic messaging).
- Ensure reporters map CLI error states into the shared `KernelError` taxonomy so downstream tooling observes consistent metadata.

### Phase 1 – Enable Extensible Registries

- Refactor `runCli` into a `createCli` factory that can accept injected command registries while preloading the default set.
- Centralise exit codes into a shared module that re-exports the kernel-defined constants and add typed enums for CLI-specific cases.
- Provide hooks/middleware points (aligned with kernel middleware APIs) so commands can insert analytics or validation without forking core logic.

### Phase 2 – Enhance Developer Experience

- Expand help/usage output to highlight the shared contracts, exit codes, and accessibility expectations defined in earlier phases.
- Add integration tests/examples that demonstrate extending the CLI with custom commands using the new registry factory and shared reporters.
- Establish regression checks that ensure new commands continue to emit structured errors/events compatible with the cross-package observability contract.

## Development References

- [README § Overview](README.md#overview) – orient new contributors on the CLI mission and supported pipelines before touching command surfaces.
- [README § Core workflow: init → generate → apply](README.md#core-workflow-init--generate--apply) – understand how generation, reporters, and exit codes interact when designing accessibility improvements.
- [README § Development commands](README.md#development-commands) – follow the recommended local workflows when validating new contracts, middleware hooks, or reporter changes.
