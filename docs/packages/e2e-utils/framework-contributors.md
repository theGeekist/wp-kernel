# @wpkernel/e2e-utils for Framework Contributors

## Overview

Framework contributors evolve the Playwright fixture stack and workspace helpers that power kernel E2E suites. The goal is to expose deterministic helpers that mirror the runtime while remaining composable with the shared test-utils workspace primitives.

## Workflow

Keep the `test` fixture aligned with Playwright updates and ensure kernel helpers compose with new WordPress fixtures. Workspace utilities should create isolated sandboxes, seed manifests, and tear everything down after assertions, mirroring the CLI integration runners.

## Examples

```ts
export async function withIsolatedWorkspace<TResult>(
	optionsOrCallback:
		| WithIsolatedWorkspaceOptions
		| WithWorkspaceCallback<TResult>,
	maybeCallback?: WithWorkspaceCallback<TResult>
): Promise<TResult> {
	const options =
		typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
	const callback =
		typeof optionsOrCallback === 'function'
			? optionsOrCallback
			: maybeCallback;

	if (!callback) {
		throw new Error('withIsolatedWorkspace requires a callback');
	}

	const workspace = await createIsolatedWorkspace(options);
	try {
		return await callback(workspace);
	} finally {
		await workspace.dispose();
	}
}
```

## Patterns

Keep workspace helpers defensive: validate callbacks, dispose sandboxes in `finally` blocks, and expose helpers for writing manifests so fixtures can mirror CLI output. Kernel utilities should avoid leaking state between tests by always returning new helper instances per invocation.

## Extension Points

Add new helper factories - such as bundle inspectors or manifest reporters - under `src/test-support` and surface them through the package entry point. When Playwright introduces new fixtures, extend the kernel fixture to include them so downstream suites gain capabilities without rewriting harnesses.

## Testing

Extend the integration suites under `packages/e2e-utils/src/__tests__` to cover new workspace helpers and kernel utilities. Tests should simulate failure paths to ensure fixtures dispose resources even when assertions fail.

## Cross-links

Coordinate with the test-utils framework guide when adjusting workspace primitives, and sync the CLI framework guide whenever manifest expectations change. Codemod diagnostics documented in the php-json-ast plan flow into these helpers, so keep snapshots aligned when adding new outputs.
