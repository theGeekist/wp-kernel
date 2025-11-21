[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildGenerateCommandOptions

# Interface: BuildGenerateCommandOptions

## Properties

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

Create a WPKernel reporter backed by LogLayer transports.

This is the standard reporter for browser/WordPress environments.
For CLI environments, use `createReporterCLI()` for pretty terminal output.

##### Parameters

###### options

`ReporterOptions` = `{}`

Reporter configuration

##### Returns

`Reporter`

Reporter instance with child helpers

### IR

#### registerBuilders()?

```ts
readonly optional registerBuilders: (pipeline) => void;
```

Registers the core builders with the pipeline.

These builders are responsible for taking the Intermediate Representation
and generating various output artifacts (e.g., PHP, TypeScript, bundles).

##### Parameters

###### pipeline

[`Pipeline`](../type-aliases/Pipeline.md)

The pipeline instance to register builders with.

##### Returns

`void`

---

#### registerFragments()?

```ts
readonly optional registerFragments: (pipeline) => void;
```

Registers the core IR fragments with the pipeline.

These fragments are responsible for extracting various pieces of information
from the configuration and building up the Intermediate Representation.

##### Parameters

###### pipeline

[`Pipeline`](../type-aliases/Pipeline.md)

The pipeline instance to register fragments with.

##### Returns

`void`

### Runtime

#### createPipeline()?

```ts
readonly optional createPipeline: () => Pipeline;
```

Creates a new CLI pipeline instance.

This function initializes a robust code generation pipeline that processes project
configurations, builds an Intermediate Representation (IR), and executes various
builder and fragment helpers to generate code and artifacts.

##### Returns

[`Pipeline`](../type-aliases/Pipeline.md)

A `Pipeline` instance configured for CLI operations.

### Other

#### buildAdapterExtensionsExtension()?

```ts
readonly optional buildAdapterExtensionsExtension: () => PipelineExtension;
```

##### Returns

[`PipelineExtension`](../type-aliases/PipelineExtension.md)

---

#### buildReadinessRegistry()?

```ts
readonly optional buildReadinessRegistry: (options?) => ReadinessRegistry;
```

##### Parameters

###### options?

[`BuildDefaultReadinessRegistryOptions`](BuildDefaultReadinessRegistryOptions.md)

##### Returns

[`ReadinessRegistry`](../classes/ReadinessRegistry.md)

---

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) => Workspace;
```

##### Parameters

###### root

`string` = `...`

##### Returns

[`Workspace`](Workspace.md)

---

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: (options?) => Promise<LoadedWPKernelConfig>;
```

Locate and load the project's wpk configuration.

The function searches for supported config files, executes them via
cosmiconfig loaders, validates the resulting structure, and returns the
canonicalised configuration metadata.

##### Parameters

###### options?

###### cwd?

`string`

##### Returns

`Promise`<[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)>

The validated wpk config and associated metadata.

##### Throws

WPKernelError when discovery, parsing or validation fails.

---

#### renderSummary()?

```ts
readonly optional renderSummary: (summary, dryRun, verbose, paths?) => string;
```

##### Parameters

###### summary

[`FileWriterSummary`](FileWriterSummary.md)

###### dryRun

`boolean`

###### verbose

`boolean`

###### paths?

###### js

`string`

###### php

`string`

###### ui

`string`

##### Returns

`string`

---

#### validateGeneratedImports()?

```ts
readonly optional validateGeneratedImports: (__namedParameters) => Promise<void>;
```

##### Parameters

###### \_\_namedParameters

[`ValidateGeneratedImportsOptions`](ValidateGeneratedImportsOptions.md)

##### Returns

`Promise`<`void`>
