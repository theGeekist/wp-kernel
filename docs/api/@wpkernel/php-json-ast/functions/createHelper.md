[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / createHelper

# Function: createHelper()

```ts
function createHelper&lt;TContext, TInput, TOutput, TReporter, TKind&gt;(options): Helper&lt;TContext, TInput, TOutput, TReporter, TKind&gt;;
```

Creates a pipeline helper-the fundamental building block of WP Kernel's code generation system.

## Overview

Helpers are composable, dependency-aware transformation units that power the entire framework:

- **CLI package**: Generates PHP resources, actions, blocks, and bindings via helper chains
- **PHP Driver**: Transforms PHP AST nodes through fragment helpers
- **Core**: Orchestrates resource definitions and action middleware

Each helper is a pure, immutable descriptor that declares:

- **What it does**: Fragment transformations or artifact building
- **When it runs**: Priority ordering and dependency relationships
- **How it integrates**: Mode (extend/replace/before/after) and rollback behavior

## Key Concepts

### Helper Kinds

- `fragment`: Modifies AST nodes in-place (e.g., add PHP opening tag, inject imports)
- `builder`: Produces final artifacts from fragments (e.g., write files, format code)

### Execution Modes

- `extend`: Add to existing transformations (default)
- `replace`: Override previous helpers with same key
- `before`: Run before a specific helper key
- `after`: Run after a specific helper key

### Dependency Resolution

The pipeline automatically:

- Topologically sorts helpers based on `dependsOn` declarations
- Validates dependency chains and reports missing/circular dependencies
- Ensures helpers run in correct order regardless of registration sequence

## Architecture

Helpers form directed acyclic graphs (DAGs) where each node represents a transformation
and edges represent dependencies. The pipeline executes helpers in topological order,
ensuring all dependencies complete before dependent helpers run.

This design enables:

- **Composability**: Combine helpers from different packages without conflicts
- **Extensibility**: Third-party helpers integrate seamlessly via dependency declarations
- **Reliability**: Rollback support ensures atomic operations across helper chains
- **Observability**: Built-in diagnostics and reporter integration for debugging

## Type Parameters

### TContext

`TContext`

### TInput

`TInput`

### TOutput

`TOutput`

### TReporter

`TReporter` _extends_ `PipelineReporter` = `PipelineReporter`

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Parameters

### options

[`CreateHelperOptions`](../interfaces/CreateHelperOptions.md)\&lt;`TContext`, `TInput`, `TOutput`, `TReporter`, `TKind`\&gt;

## Returns

[`Helper`](../interfaces/Helper.md)\&lt;`TContext`, `TInput`, `TOutput`, `TReporter`, `TKind`\&gt;

## Examples

```typescript
import { createHelper } from '@wpkernel/core/pipeline';

// Add PHP opening tag to generated files
const addPHPTag = createHelper({
  key: 'add-php-opening-tag',
  kind: 'fragment',
  mode: 'extend',
  priority: 100, // Run early in pipeline
  origin: 'wp-kernel-core',
  apply: ({ fragment }) =&gt; {
    fragment.children.unshift({
      kind: 'text',
      text: '&lt;?php\n',
    });
  },
});
```

```typescript
// This helper depends on namespace detection running first
const addNamespaceDeclaration = createHelper({
  key: 'add-namespace',
  kind: 'fragment',
  dependsOn: ['detect-namespace'], // Won't run until this completes
  apply: ({ fragment, context }) =&gt; {
    const ns = context.detectedNamespace;
    fragment.children.push({
      kind: 'namespace',
      name: ns,
    });
  },
});
```

```typescript
import { createPipelineCommit, createPipelineRollback } from '@wpkernel/core/pipeline';

const writeFileHelper = createHelper({
  key: 'write-file',
  kind: 'builder',
  apply: ({ draft, context }) =&gt; {
    const path = context.outputPath;
    const backup = readFileSync(path, 'utf-8'); // Capture current state

    writeFileSync(path, draft);

    return {
      commit: createPipelineCommit(
        () =&gt; context.reporter.info(`Wrote ${path}`)
      ),
      rollback: createPipelineRollback(
        () =&gt; writeFileSync(path, backup), // Restore on error
        () =&gt; context.reporter.warn(`Rolled back ${path}`)
      ),
    };
  },
});
```

```typescript
const formatCodeHelper = createHelper({
  key: 'format-code',
  kind: 'builder',
  dependsOn: ['write-file'],
  apply: async ({ artifact, context }) =&gt; {
    try {
      const formatted = await prettier.format(artifact, {
        parser: 'php',
      });
      return { artifact: formatted };
    } catch (error) {
      context.reporter.error('Formatting failed', { error });
      throw error;
    }
  },
});
```
