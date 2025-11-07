# Migrating to @wpkernel/pipeline

## Overview

Projects that previously imported helpers from `@wpkernel/core/pipeline` now rely on the standalone `@wpkernel/pipeline` package. The migration separates generic orchestration from domain helpers so core, CLI, and codemod tooling share the same primitives without duplicating contracts.

## Workflow

Replace legacy imports with the new package, then keep domain-specific helpers - such as commit utilities or context bridges - sourced from their owning packages. Update TypeScript project references to depend on `@wpkernel/pipeline` and ensure the workspace lockfile pulls the shared version.

## Examples

```ts
/**
 * For generic pipeline primitives (createHelper, createPipeline, types),
 * import directly from '@wpkernel/pipeline'.
 */
export { createPipelineCommit, createPipelineRollback } from './helpers/commit';
```

## Patterns

Keep reusable helpers in the standalone package and reserve package-specific modules for contextual wiring. When migrating code, audit each helper for package-specific behaviour; if it depends on kernel registries or CLI reporters, keep it co-located with that surface.

## Extension Points

When widening pipeline payloads, update both the standalone types and the consuming package mirrors. For example, the CLI runtime re-exports `PipelineExtensionHookOptions`, so changes should ship in tandem to avoid breaking adapter extensions.

## Testing

Run the pipeline unit suites across all consumers after migrating imports. `packages/core/src/pipeline/__tests__` and CLI integration suites rely on the shared package, ensuring regressions surface quickly if a helper remains behind in the legacy path.

## Cross-links

Consult the pipeline architecture guide for a refresher on helper lifecycles, and coordinate with the CLI framework guide if adapter extensions rely on migrated helpers. The php-json-ast codemod plan depends on the shared pipeline for diagnostics, so keep that roadmap aligned when migrating codemod helpers.
