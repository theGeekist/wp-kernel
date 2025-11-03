[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / createPipeline

# Function: createPipeline()

```ts
function createPipeline<
	TRunOptions,
	TBuildOptions,
	TContext,
	TReporter,
	TDraft,
	TArtifact,
	TDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind,
	TBuilderKind,
	TFragmentHelper,
	TBuilderHelper,
>(
	options
): Pipeline<
	TRunOptions,
	TRunResult,
	TContext,
	TReporter,
	TBuildOptions,
	TArtifact,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TDiagnostic,
	TFragmentKind,
	TBuilderKind,
	TFragmentHelper,
	TBuilderHelper
>;
```

Creates a pipeline orchestrator-the execution engine that powers WP Kernel's entire code generation infrastructure.

## Why Pipelines Matter

The pipeline system is the **single most critical component** of the framework:

- **CLI package**: Every generator (`wpk generate resource`, `wpk generate action`, etc.) runs on pipeline
- **PHP Driver**: All PHP AST transformations flow through pipeline helpers
- **Core package**: Resource definitions, action middleware, and capability proxies leverage pipeline
- **Future-proof**: Designed to extract into standalone `@wpkernel/pipeline` package

Pipelines provide:

1. **Dependency resolution**: Topologically sorts helpers based on `dependsOn` declarations
2. **Priority ordering**: Executes helpers in deterministic order via priority values
3. **Error recovery**: Automatic rollback on failure via commit/rollback protocol
4. **Diagnostics**: Built-in error tracking with reporter integration
5. **Extensibility**: Plugin-style extensions via hooks (pre-run, post-build, etc.)

## Architecture

A pipeline consists of three phases:

### 1. Registration Phase

```
pipeline.registerFragment(helper1)
pipeline.registerBuilder(helper2)
```

Helpers are collected but not executed. Dependency graph is constructed.

### 2. Execution Phase

```
const result = await pipeline.run(options)
```

- Validates dependency graph (detects missing deps, cycles)
- Sorts helpers topologically
- Runs fragment helpers to transform AST
- Runs builder helpers to produce artifacts
- Commits successful results

### 3. Rollback Phase (on error)

```
// Automatic on failure
```

- Walks back through executed helpers in reverse order
- Invokes rollback functions to undo side effects
- Aggregates diagnostics for debugging

## Extension System

Pipelines support hooks that intercept execution at key points:

- `pre-run`: Before any helpers execute (validation, setup)
- `post-fragment`: After fragment helpers complete (AST inspection)
- `post-builder`: After builder helpers complete (artifact transformation)
- `pre-commit`: Before committing results (final validation)

Extensions enable:

- Custom validation logic
- Third-party integrations (ESLint, Prettier, type checkers)
- Conditional execution (feature flags, environment checks)
- Artifact post-processing (minification, bundling)

## Type Safety

The pipeline is fully generic across 16 type parameters, enabling:

- Type-safe context sharing between helpers
- Strongly-typed input/output contracts
- Custom reporter integration (LogLayer, console, etc.)
- Flexible artifact types (strings, AST nodes, binary data)

## Performance

- **Lazy execution**: Helpers only run when `pipeline.run()` is called
- **Incremental registration**: Add helpers at any time before execution
- **Async support**: Mix sync and async helpers seamlessly
- **Memory efficiency**: Helpers are immutable descriptors (no closures)

## Type Parameters

### TRunOptions

`TRunOptions`

### TBuildOptions

`TBuildOptions`

### TContext

`TContext` _extends_ `object`

### TReporter

`TReporter` _extends_ `PipelineReporter` = `PipelineReporter`

### TDraft

`TDraft` = `unknown`

### TArtifact

`TArtifact` = `unknown`

### TDiagnostic

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TRunResult

`TRunResult` = [`PipelineRunState`](../interfaces/PipelineRunState.md)\&lt;`TArtifact`, `TDiagnostic`\&gt;

### TFragmentInput

`TFragmentInput` = `unknown`

### TFragmentOutput

`TFragmentOutput` = `unknown`

### TBuilderInput

`TBuilderInput` = `unknown`

### TBuilderOutput

`TBuilderOutput` = `unknown`

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = `"fragment"`

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = `"builder"`

### TFragmentHelper

`TFragmentHelper` _extends_ [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\&gt; = [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\&gt;

### TBuilderHelper

`TBuilderHelper` _extends_ [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\&gt; = [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\&gt;

## Parameters

### options

[`CreatePipelineOptions`](../interfaces/CreatePipelineOptions.md)\&lt;`TRunOptions`, `TBuildOptions`, `TContext`, `TReporter`, `TDraft`, `TArtifact`, `TDiagnostic`, `TRunResult`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`\&gt;

## Returns

[`Pipeline`](../interfaces/Pipeline.md)\&lt;`TRunOptions`, `TRunResult`, `TContext`, `TReporter`, `TBuildOptions`, `TArtifact`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TDiagnostic`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`\&gt;

## Examples

```typescript
import { createPipeline, createHelper } from '@wpkernel/core/pipeline';
import { createReporter } from '@wpkernel/core';

interface MyContext {
	reporter: ReturnType<typeof createReporter>;
	namespace: string;
}

const pipeline = createPipeline({
	fragmentKind: 'fragment',
	builderKind: 'builder',

	createContext: (reporter) => ({
		reporter,
		namespace: 'MyPlugin',
	}),

	buildFragment: (ctx, opts) => {
		// Transform AST node
		const fragment = opts.input;
		fragment.namespace = ctx.namespace;
		return { fragment };
	},

	buildArtifact: (ctx, opts) => {
		// Generate final PHP code
		const code = opts.draft.toString();
		return { artifact: code };
	},
});

// Register helpers
pipeline.registerFragment(addPHPTagHelper);
pipeline.registerFragment(addNamespaceHelper);
pipeline.registerBuilder(writeFileHelper);

// Execute
const result = await pipeline.run({ input: myAST });
console.log(result.artifact); // Generated PHP code
```

```typescript
const pipeline = createPipeline({
	// ... base config ...

	extensions: [
		{
			key: 'eslint-validation',
			hooks: {
				'post-builder': async ({ artifact, context }) => {
					const lintResult = await eslint.lintText(artifact);
					if (lintResult.errorCount > 0) {
						throw new Error('Linting failed');
					}
					return { artifact };
				},
			},
		},
	],
});
```

```typescript
const result = await pipeline.run({ input: myAST });

if (!result.success) {
	console.error('Pipeline failed:', result.diagnostics);
	// Rollback already executed automatically
	// Files restored, temp resources cleaned up
} else {
	console.log('Success:', result.artifact);
	// All commit functions executed
}
```

```typescript
// This is how `wpk generate resource` works internally:

const resourcePipeline = createPipeline({
	fragmentKind: 'fragment',
	builderKind: 'builder',
	createContext: (reporter) => ({
		reporter,
		config: loadKernelConfig(),
	}),
	buildFragment: (ctx, opts) => {
		// Build PHP AST for resource class
		return buildResourceClass(opts.input, ctx.config);
	},
	buildArtifact: async (ctx, opts) => {
		// Convert AST to PHP code
		const code = await printPhpAst(opts.draft);
		return { artifact: code };
	},
});

// Register standard helpers
resourcePipeline.registerFragment(phpOpeningTagHelper);
resourcePipeline.registerFragment(namespaceHelper);
resourcePipeline.registerFragment(useStatementsHelper);
resourcePipeline.registerFragment(classDefinitionHelper);
resourcePipeline.registerBuilder(writeFileHelper);
resourcePipeline.registerBuilder(formatCodeHelper);

// User can inject custom helpers via config
const userHelpers = loadUserHelpers();
userHelpers.forEach((h) => resourcePipeline.registerFragment(h));

// Execute generation
const result = await resourcePipeline.run({
	input: { name: 'Post', endpoint: '/posts' },
});
```
