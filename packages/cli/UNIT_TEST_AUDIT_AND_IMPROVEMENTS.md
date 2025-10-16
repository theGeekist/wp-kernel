# @wpkernel/cli – Unit Test Audit (2024 refresh)

## Snapshot

- Package coverage remains high (≈97% statements / 90% branches) with focused
  suites around command execution, printers, and config loaders. The shared
  harness utilities introduced over the last refactors keep this bar steady by
  eliminating per-suite boilerplate.
- Core helpers now live under `packages/cli/tests`: reporters, memory streams,
  Clipanion contexts, async flushing, and disposable workspaces. Each ships its
  own unit coverage so behaviour changes surface immediately.
- Generator output continues to be asserted via golden fixtures, ensuring drift
  in templates or printer pipelines is caught without duplicative inline
  snapshots.

## Strengths

1. **Unified command harness.** All command suites rely on the shared
   `assignCommandContext`, `flushAsync`, and `createWorkspaceRunner`
   helpers, which keeps stdout/stderr capture, async settling, and temp
   workspace management consistent while dramatically shrinking fixture noise.
2. **Golden-file coverage.** `generate-command` asserts its full output against
   committed fixtures, so template updates or new printers surface as diff noise
   rather than brittle string expectations.
3. **Printer resiliency.** UI printer suites exercise success and failure paths
   (including symbol serialisation errors) with mocked FS + formatters, covering
   real-world error propagation scenarios.
4. **Workspace abstraction.** `createWorkspaceRunner` allows suites to opt into
   bespoke prefixes/default file graphs without redeclaring wrappers, further
   reducing duplication.

## Gaps & Opportunities

- **No top-level CLI invocation tests.** We still lack a suite that executes the
  published `bin/wpkernel` binary against disposable workspaces to validate help
  output, flag parsing, and exit codes end-to-end. This would complement the
  unit-level command coverage.
- **Adapter extension scenarios.** Extensions are covered for basic reporting,
  but there is room to simulate more complex extension chains (multiple
  extensions mutating IR, failure ordering) to harden the adapter contract.
- **Start command integration.** The refactored unit suite now has lighter
  helpers, yet we still rely on heavy timer orchestration. A future enhancement
  could substitute the mocked watcher with a thin façade around `FakeTimers` to
  more directly assert debounce scheduling semantics or to cover platform
  signals beyond `SIGINT/SIGTERM`.
- **Workspace builder ergonomics.** `createWorkspaceRunner` merges default and
  override file maps, but there is no convenience API for common project
  skeletons (e.g. init/generate pipeline). A small layer of named presets could
  simplify future suites.

## Suggested Next Steps

1. Add a CLI integration harness (likely under `packages/cli/__tests__`) that
   shells out to `bin/wpkernel` for `--help`, `init`, and failure cases, using
   the shared workspace utilities.
2. Expand adapter/extension tests to simulate multiple queued extensions and IR
   mutations, ensuring order and error handling remain deterministic.
3. Investigate a higher-level debounce helper for the `start` command tests so
   timer choreography is expressed declaratively (e.g. `triggerFastChange()`),
   reducing manual `advanceTimersByTimeAsync` calls.
4. Consider adding reusable workspace presets (init scaffold, generated
   artifact set, etc.) atop `createWorkspaceRunner` to keep future suites terse.
