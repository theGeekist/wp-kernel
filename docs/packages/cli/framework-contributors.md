# @wpkernel/cli for Framework Contributors

## Overview

CLI maintainers orchestrate the pipeline that powers scaffolding, adapters, and codemod execution. The runtime wraps the shared pipeline helpers, resolves adapter extensions, and translates diagnostics into structured reporter output so plugin projects inherit predictable tooling.

## Workflow

`createPipeline()` wires CLI-specific factories into the shared pipeline contract. During `generate` it resolves adapter extension factories from configuration, validates their contracts, and executes them in the pipeline hook phase. Each extension receives the intermediate representation, namespace, and reporter handles to produce artefacts or enqueue commits.

## Examples

```ts
function resolveAdapterExtensions(
	factories: AdapterExtensionFactory[],
	adapterContext: AdapterContext
): AdapterExtension[] | Error {
	const extensions: AdapterExtension[] = [];

	for (const factory of factories) {
		const produced = invokeExtensionFactory(factory, adapterContext);
		if (produced instanceof Error) {
			return produced;
		}

		if (!produced) {
			continue;
		}

		for (const candidate of produced) {
			const validated = validateExtension(candidate);
			if (validated instanceof Error) {
				return validated;
			}

			extensions.push(validated);
		}
	}

	return extensions;
}
```

## Patterns

Treat adapter extensions as transactional units. Each factory should validate inputs, emit reporter output through the adapter child logger, and rely on the shared pipeline diagnostics when conflicts arise. Keep codemod configuration alongside adapter registration so visitor stacks execute consistently across generate and apply phases.

## Extension Points

`createExtensionHookOptions()` exposes CLI context, options, and artefacts to pipeline hooks. Use it when adding new lifecycle data so extensions can branch by phase without reaching into private state. For PHP transformations, feed codemod definitions from `serialisePhpCodemodConfiguration()` into the pipeline hook so the php-json-ast visitors run before workspace commits.

## Testing

Use the integration suites under `packages/cli/tests/__tests__` to guard workflow changes. `generate-apply.integration.test.ts` captures exit codes, driver traces, and manifest expectations, while `workspace.test.ts` verifies file lifecycle helpers. Extend these suites whenever pipeline wiring changes to preserve regression coverage.

## Cross-links

Coordinate with the pipeline framework guide when adjusting helper registration or diagnostic payloads. Update the php-json-ast codemod plan whenever new visitor stacks thread through the CLI so downstream contributors know how adapters and codemods interact.
