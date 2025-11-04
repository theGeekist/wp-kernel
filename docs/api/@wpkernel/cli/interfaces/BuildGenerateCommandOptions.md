[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / BuildGenerateCommandOptions

# Interface: BuildGenerateCommandOptions

## Properties

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) =&gt; Reporter;
```

Create a WP Kernel reporter backed by LogLayer transports.

The reporter honors namespace, channel, and level options while providing a
typed interface for child loggers used across subsystems.

##### Parameters

###### options

`ReporterOptions` = `{}`

Reporter configuration

##### Returns

`Reporter`

Reporter instance with child helpers

### Pipeline

#### createPipeline()?

```ts
readonly optional createPipeline: () =&gt; Pipeline;
```

Creates a new CLI pipeline instance.

This function initializes a robust code generation pipeline that processes project
configurations, builds an Intermediate Representation (IR), and executes various
builder and fragment helpers to generate code and artifacts.

##### Returns

[`Pipeline`](../type-aliases/Pipeline.md)

A `Pipeline` instance configured for CLI operations.

### IR

#### registerFragments()?

```ts
readonly optional registerFragments: (pipeline) =&gt; void;
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

---

#### registerBuilders()?

```ts
readonly optional registerBuilders: (pipeline) =&gt; void;
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

### Other

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () =&gt; Promise&lt;LoadedWPKernelConfig&gt;;
```

Locate and load the project's kernel configuration.

The function searches for supported config files, executes them via
cosmiconfig loaders, validates the resulting structure and performs a
Composer autoload sanity check to ensure PHP namespaces are mapped
correctly.

##### Returns

`Promise`\&lt;[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)\&gt;

The validated kernel config and associated metadata.

##### Throws

WPKernelError when discovery, parsing or validation fails.

---

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) =&gt; Workspace;
```

##### Parameters

###### root

`string` = `...`

##### Returns

[`Workspace`](Workspace.md)

---

#### buildAdapterExtensionsExtension()?

```ts
readonly optional buildAdapterExtensionsExtension: () =&gt; PipelineExtension;
```

##### Returns

[`PipelineExtension`](PipelineExtension.md)

---

#### renderSummary()?

```ts
readonly optional renderSummary: (summary, dryRun, verbose) =&gt; string;
```

##### Parameters

###### summary

[`FileWriterSummary`](FileWriterSummary.md)

###### dryRun

`boolean`

###### verbose

`boolean`

##### Returns

`string`

---

#### validateGeneratedImports()?

```ts
readonly optional validateGeneratedImports: (__namedParameters) =&gt; Promise&lt;void&gt;;
```

##### Parameters

###### \_\_namedParameters

[`ValidateGeneratedImportsOptions`](ValidateGeneratedImportsOptions.md)

##### Returns

`Promise`\&lt;`void`\&gt;
