# @wpkernel/test-utils for Framework Contributors

## Overview

Framework contributors evolve the shared harnesses that power UI, CLI, and integration suites. The goal is to keep helpers composable, deterministic, and aligned with kernel runtime behaviour so downstream packages can adopt new capabilities without retooling tests.

## Workflow

Build harnesses around concrete providers and runtime factories. `createWPKernelUITestHarness()` wraps `createWordPressTestHarness()`, enforces provider requirements, and exposes utilities for runtime overrides, console guards, and teardown so suites can simulate end-to-end flows.

## Examples

```ts
export function createWPKernelUITestHarness(
	options: WPKernelUITestHarnessOptions = {}
): WPKernelUITestHarness {
	const wordpress = createWordPressTestHarness();
	let currentConsoleError = console.error;
	const provider = options.provider;

	if (!provider) {
		throw new WPKernelError('DeveloperError', {
			message:
				'WPKernelUITestHarness requires a WPKernelUIProvider. Pass options.provider when calling createWPKernelUITestHarness.',
		});
	}

	return {
		wordpress,
		createRuntime: (overrides = {}) =>
			buildRuntime(
				wordpress.wp?.data as WPKernelRegistry | undefined,
				options,
				overrides
			),
		createWrapper: (runtime) =>
			createWrapper(
				runtime ??
					buildRuntime(
						wordpress.wp?.data as WPKernelRegistry | undefined,
						options
					),
				provider
			),
		resetActionStoreRegistration: () => {
			const wpData = wordpress.wp.data as {
				[ACTION_STORE_MARKER]?: unknown;
			};
			if (ACTION_STORE_MARKER in wpData) {
				delete wpData[ACTION_STORE_MARKER];
			}
		},
		suppressConsoleError: (predicate) => {
			currentConsoleError = console.error;
			console.error = (...args: unknown[]) => {
				if (predicate(args)) {
					return;
				}
				const typedArgs = args as Parameters<typeof console.error>;
				return currentConsoleError(...typedArgs);
			};
		},
		restoreConsoleError: () => {
			console.error = currentConsoleError;
		},
		teardown: () => {
			console.error = currentConsoleError;
			wordpress.teardown();
		},
	};
}
```

## Patterns

Maintain strict error messaging for developer mistakes so suites fail fast when providers are missing. Reuse kernel error classes and expose teardown hooks that clean up global state to avoid bleeding fixtures between tests.

## Extension Points

Add new harness capabilities behind options objects so consumers opt into advanced behaviour. When introducing additional globals or runtime overrides, extend the TypeScript interfaces and export them through `packages/test-utils/src/index.ts` so packages receive accurate typings.

## Testing

Guard harness changes with targeted unit tests and cross-package integration suites. Exercises should cover runtime overrides, console suppression, and teardown behaviour to confirm helpers remain safe across concurrent tests.

## Cross-links

Coordinate with the UI framework guide before altering harness wrappers, and review the e2e-utils contributor guide to ensure Playwright fixtures continue to layer on top of the shared workspace helpers. Pipeline updates that add new diagnostics should propagate through the harness reporters documented in the CLI framework guide.
