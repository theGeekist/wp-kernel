# @wpkernel/pipeline

**Standalone, framework-agnostic pipeline orchestration for WP Kernel.**

This package extracts the core pipeline system from `@wpkernel/core` into reusable, modular components. It provides dependency resolution, topological sorting, extension hooks, and rollback support for building robust transformation pipelines.

## Status

⚠️ **Pre-alpha** - Modularization in progress. Not yet integrated into the main workspace.

## Architecture

The package is organized into focused modules:

### Core Modules

- **`helper.ts`** - Factory for creating pipeline helpers with full JSDoc
- **`types.ts`** - All TypeScript interfaces and type definitions
- **`async-utils.ts`** - Promise-aware utilities (`isPromiseLike`, `maybeThen`, `maybeTry`, `processSequentially`)
- **`dependency-graph.ts`** - Topological sorting and dependency resolution
- **`extensions.ts`** - Extension hook execution, commit, and rollback logic
- **`index.ts`** - Public API surface

### What's Modularized

#### From `createPipeline.ts` (1651 lines) → 4 focused modules:

1. **async-utils.ts** (~125 lines)
    - `isPromiseLike()` - Type guard for promises
    - `maybeThen()` - Conditional promise chaining
    - `maybeTry()` - Unified error handling
    - `processSequentially()` - Sequential async iteration

2. **dependency-graph.ts** (~310 lines)
    - `createHelperId()` - Unique helper identifiers
    - `compareHelpers()` - Priority-based sorting
    - `createDependencyGraph()` - Topological sort with validation
    - Missing dependency detection
    - Circular dependency prevention

3. **extensions.ts** (~230 lines)
    - `runExtensionHooks()` - Sequential hook execution
    - `commitExtensionResults()` - Commit phase
    - `rollbackExtensionResults()` - Automatic rollback on failure
    - `createRollbackErrorMetadata()` - Error serialization

4. **helper.ts** (~179 lines)
    - `createHelper()` - Main factory function
    - Full JSDoc with examples
    - Immutable descriptor pattern

#### From `helper.ts` → Copied as-is

- No changes needed - already well-structured

## Design Principles

### 1. No External Dependencies

All modules are self-contained. No imports from `@wpkernel/core` or other framework packages.

### 2. Generic Error Handling

Instead of `WPKernelError`, modules accept an error factory function:

```typescript
createDependencyGraph(
	entries,
	options,
	(code, message) => new MyCustomError(code, message)
);
```

### 3. Framework-Agnostic

The pipeline system works with any:

- Reporter implementation (LogLayer, console, custom)
- Error handling strategy
- Context object shape
- Artifact types (strings, AST nodes, binary data)

### 4. TypeScript-First

All modules export proper TypeScript types. No inline type aliases.

## Usage

```typescript
import {
	createHelper,
	type Helper,
	type PipelineReporter,
} from '@wpkernel/pipeline';

interface MyContext {
	reporter: PipelineReporter;
	namespace: string;
}

const myHelper = createHelper<MyContext, string, string>({
	key: 'my-transform',
	kind: 'fragment',
	priority: 100,
	dependsOn: [],
	origin: 'my-package',
	apply: ({ context, fragment }) => {
		// Transform logic here
		return { fragment: fragment.toUpperCase() };
	},
});
```

## Roadmap

### Phase 1: Modularization ✓

- [x] Extract async utilities
- [x] Extract dependency graph logic
- [x] Extract extension system
- [x] Copy helper factory
- [x] Define public API surface

### Phase 2: Executor & Diagnostics ✓

- [x] Extract `executeHelpers()` function to executor.ts
- [x] Extract all diagnostic functions to diagnostics.ts
- [x] Update createPipeline to use modular imports
- [x] Remove duplicate inline functions

### Phase 3: Integration (Next)

- [ ] Add comprehensive tests for each module
- [ ] Clean up unused imports
- [ ] Add to monorepo workspace
- [ ] Update documentation with examples

### Phase 4: Framework Integration

- [ ] Update `@wpkernel/core` to use `@wpkernel/pipeline`
- [ ] Migrate CLI package
- [ ] Performance benchmarks
- [ ] Update documentation

## Testing

Once modularization is complete:

```bash
pnpm --filter @wpkernel/pipeline test
```

## Contributing

This package follows the same conventions as `@wpkernel/core`:

- All modules use `.ts` extension
- Internal helpers are documented with `@internal` tags
- Public API is minimal and well-typed
- No `any` types allowed

## License

MIT - See root LICENSE file.
