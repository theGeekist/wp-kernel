# @wpkernel/pipeline

Framework-agnostic pipeline orchestration primitives for building composable, dependency-aware execution pipelines with atomic operations support.

## Overview

The `@wpkernel/pipeline` package provides the foundational pipeline system used throughout WP Kernel for orchestrating complex code generation workflows, resource/action lifecycle management, and PHP AST transformations. Originally embedded in `@wpkernel/core`, it was extracted into a standalone package to enable reuse across the monorepo and in external projects.

## Key Features

- **3-Phase Execution Model**: Fragment assembly (IR building) → Builder execution (artifact generation) → Extension hooks (commit/rollback)
- **DAG-Based Dependency Resolution**: Helpers declare `dependsOn` constraints; pipeline automatically resolves execution order and validates cycles
- **Extension System**: Pre-run and post-build hooks enable atomic operations with automatic rollback on failure
- **Framework-Agnostic**: No WordPress or kernel-specific dependencies; pure TypeScript orchestration primitives
- **Type-Safe**: Fully typed helper contracts, diagnostic interfaces, and extension hooks

## Architecture

### Pipeline Phases

1. **Fragment Phase**: Helpers build an intermediate representation (IR) or mutable draft state
2. **Builder Phase**: Helpers transform the IR/draft into final artifacts (files, objects, configurations)
3. **Extension Phase**: Pre-run hooks prepare execution context; post-build hooks commit changes or rollback on error

### Helper System

Helpers are the building blocks of pipelines. Each helper:

- Declares a unique `key` for identification
- Specifies a `kind` (`fragment`, `builder`, or custom)
- Defines a `mode` (`extend`, `override`, `merge`)
- Lists `dependsOn` keys for execution ordering
- Implements an `apply` function that receives context, input, output, and reporter

### Extension System

Extensions provide lifecycle hooks for atomic operations:

- **Register**: Extensions register with the pipeline and return optional hook functions
- **Pre-Run**: Hooks execute before any helpers run (setup, validation)
- **Post-Build**: Hooks execute after all builders complete (commit changes, write files)
- **Rollback**: Automatic rollback of all committed extensions on any failure

## Installation

```bash
pnpm add @wpkernel/pipeline
```

## Quick Start

```typescript
import { createPipeline, createHelper } from '@wpkernel/pipeline';

// Define a simple pipeline
const pipeline = createPipeline({
	fragmentKind: 'fragment',
	builderKind: 'builder',
	createBuildOptions: (options) => options,
	createContext: (options) => ({
		reporter: options.reporter,
	}),
	createFragmentState: () => ({ items: [] }),
	createFragmentArgs: ({ context, draft }) => ({
		context,
		input: undefined,
		output: draft,
		reporter: context.reporter,
	}),
	finalizeFragmentState: ({ draft }) => draft,
	createBuilderArgs: ({ context, artifact }) => ({
		context,
		input: artifact,
		output: { result: '' },
		reporter: context.reporter,
	}),
});

// Register a fragment helper
pipeline.ir.use(
	createHelper({
		key: 'collect-items',
		kind: 'fragment',
		apply: ({ output }) => {
			output.items.push('item1', 'item2');
		},
	})
);

// Register a builder helper
pipeline.builders.use(
	createHelper({
		key: 'format-result',
		kind: 'builder',
		dependsOn: ['collect-items'],
		apply: ({ input, output }) => {
			output.result = input.items.join(', ');
		},
	})
);

// Execute the pipeline
const result = await pipeline.run({
	reporter: console,
});

console.log(result.artifact.result); // "item1, item2"
```

## Used By

- **`@wpkernel/core`**: Resource/action lifecycle orchestration with domain-specific helpers
- **`@wpkernel/cli`**: Code generation pipelines (TypeScript, PHP, blocks, controllers)
- **`@wpkernel/php-json-ast`**: PHP AST transformation pipelines with program builder helpers
- **`@wpkernel/php-driver`**: PHP pretty printer installation and autoload resolution

## API Documentation

See the [API reference](/api/@wpkernel/pipeline/) for comprehensive type definitions and examples.

## Key Concepts

### Helpers vs. Extensions

- **Helpers**: Execute during the fragment and builder phases to build artifacts
- **Extensions**: Execute before/after the pipeline to perform atomic operations (writes, registry updates)

### Dependency Resolution

Pipelines resolve helper execution order based on `dependsOn` constraints:

- Topological sort ensures dependencies execute first
- Cycle detection prevents infinite loops
- Missing dependencies generate diagnostics

### Diagnostics

Pipelines emit structured diagnostics for validation issues:

- **Conflict**: Multiple helpers with same key and incompatible modes
- **Missing Dependency**: Helper depends on a key that doesn't exist
- **Unused Helper**: Helper registered but never executed

### Atomic Operations

Extensions enable atomic operations with rollback:

1. Extensions register and return optional hooks
2. Pre-run hooks execute (setup, validation)
3. Helpers execute (fragment + builder phases)
4. Post-build hooks execute (commit changes)
5. On any error, rollback hooks execute in reverse order

## TypeScript Support

The package is fully typed with comprehensive generics for:

- Custom context types
- Domain-specific input/output types
- Custom reporter interfaces
- Framework-specific diagnostic types

## License

EUPL-1.2
