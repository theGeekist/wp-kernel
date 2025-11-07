# @wpkernel/pipeline

> Framework-agnostic orchestration primitives for building dependency-aware execution pipelines with atomic rollback.

## Overview

`@wpkernel/pipeline` powers every generation flow inside WP Kernel. It was extracted from
`@wpkernel/core` so CLI builders, PHP bridges, and external projects can compose helpers,
validate dependencies, and execute deterministic plans. The runtime enforces a three-phase
model (fragments → builders → extensions) and provides rich diagnostics when helpers clash or
dependencies are missing.

## Quick links

- [Package guide](../../docs/packages/pipeline.md)
- [API reference](../../docs/api/@wpkernel/pipeline/README.md)
- [PHP codemod roadmap](../../docs/internal/php-json-ast-codemod-plan.md)

## Installation

```bash
pnpm add @wpkernel/pipeline
```

The package ships pure TypeScript and has no runtime dependencies.

## Quick start

```ts
import { createPipeline, createHelper } from '@wpkernel/pipeline';

const pipeline = createPipeline({
	fragmentKind: 'fragment',
	builderKind: 'builder',
	createBuildOptions: (options) => options,
	createContext: (options) => ({ reporter: options.reporter }),
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

pipeline.ir.use(
	createHelper({
		key: 'collect-items',
		kind: 'fragment',
		apply: ({ output }) => {
			output.items.push('item1', 'item2');
		},
	})
);

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

const result = await pipeline.run({ reporter: console });
console.log(result.artifact.result); // "item1, item2"
```

## Core concepts

- **Three-phase execution** – fragment helpers assemble intermediate representations, builder
  helpers produce artefacts, and extension hooks commit or roll back side-effects.
- **Deterministic ordering** – helpers declare `dependsOn` relationships; the runtime performs
  topological sorting, cycle detection, and unused-helper diagnostics.
- **Extension system** – register hooks via `createPipelineExtension()` to manage commits,
  rollbacks, and shared setup/teardown logic.
- **Typed contracts** – helper descriptors, execution metadata, and diagnostics surfaces are
  fully typed for TypeScript consumers.

## Consumers

- `@wpkernel/cli` (code generation pipeline, codemod entry points)
- `@wpkernel/core` (resource/action orchestration)
- `@wpkernel/php-json-ast` (codemod and builder stacks)
- External tooling that requires deterministic job orchestration

## Diagnostics & error handling

Use the built-in factories (`createDefaultError`, `PipelineDiagnostic`) to capture conflicts,
missing dependencies, and rollback metadata. Execution snapshots describe which helpers ran,
which were skipped, and what extensions committed.

## Contributing

Keep helpers exported through `src/index.ts` and accompany new primitives with examples in the
API reference. When expanding the extension system or diagnostics, update the codemod roadmap to
reflect new capabilities that PHP bridges or the CLI can adopt.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
