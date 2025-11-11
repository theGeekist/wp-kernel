# @wpkernel/cli for Plugin Developers

> For plugin teams using WPKernel to scaffold and maintain synchronised PHP, JS, and UI code.

## Overview

The CLI scaffolds wpk-ready plugins and manages PHP builders, manifest generation, and codemod execution. Plugin teams run `init`, iterate with `generate`, and `apply` workspace patches through the wpk-aware pipeline so PHP, TypeScript, and UI scaffolding stay in sync.

## Workflow

`init` seeds configuration, TypeScript, and PHP entry points. `generate` materialises resources, actions, and UI registries, while `apply` commits workspace patches once the PHP transport is satisfied. Keep the workspace under Git so the apply step can create commits after codemods run.

## Examples

```ts
const workspace = buildWorkspace(workspaceRoot);
const reporter = createReporterMock();

const result = await runInitWorkflow({
	workspace,
	reporter,
	verbose: false,
	force: false,
});

const summariesByPath = new Map(
	result.summaries.map((entry) => [entry.path, entry.status])
);
expect(summariesByPath.get('wpk.config.ts')).toBe('created');
expect(summariesByPath.get('tsconfig.json')).toBe('created');
expect(summariesByPath.get('composer.json')).toBe('created');
```

## Patterns

Leaves `composer.json` and existing front-end assets untouched unless `--force` is intentional. The CLI inspects the workspace before writing so repeated runs remain idempotent. When iterating on scaffolds, rerun `generate` after editing `wpk.config.ts` so changes propagate into controllers and PHP manifests.

## Extension Points

Custom adapters extend the pipeline through `createPipelineExtension()` in the CLI runtime. Pair new adapters with entries in the codemod configuration so `php-json-ast` visitors run automatically during `generate` or `apply`, aligning with the codemod roadmap. Emit reporter diagnostics whenever adapters mutate files so reviewers can inspect summaries in `.wpk/`.

## Testing

Use `withWorkspace()` from `@wpkernel/test-utils/integration` to spin isolated plugin projects in tests. Execute CLI commands with `runNodeProcess()` (or your preferred child-process helper) against the published `bin/wpk` entry so suites exercise the same readiness gates developers see locally.

## Cross-links

Follow the framework contributor CLI guide when adjusting adapters or pipeline hooks, and reference the php-json-ast codemod plan to keep visitor stacks aligned with future codemod adoption. UI plugin authors should read the UI workflow guide to understand how generated registries map onto React screens.
