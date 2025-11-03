[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / BuildGenerateCommandOptions

# Interface: BuildGenerateCommandOptions

## Properties

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

Create a WP Kernel reporter backed by LogLayer transports.

The reporter honors namespace, channel, and level options while providing a
typed interface for child loggers used across subsystems.

##### Parameters

###### options

[`ReporterOptions`](../../../core/src/type-aliases/ReporterOptions.md) = `{}`

Reporter configuration

##### Returns

[`Reporter`](../../../core/src/type-aliases/Reporter.md)

Reporter instance with child helpers

### Other

#### buildAdapterExtensionsExtension()?

```ts
readonly optional buildAdapterExtensionsExtension: () => PipelineExtension;
```

##### Returns

[`PipelineExtension`](PipelineExtension.md)

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

#### createPipeline()?

```ts
readonly optional createPipeline: () => Pipeline;
```

##### Returns

[`Pipeline`](../type-aliases/Pipeline.md)

---

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () => Promise<LoadedWPKernelConfig>;
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

#### registerBuilders()?

```ts
readonly optional registerBuilders: (pipeline) => void;
```

##### Parameters

###### pipeline

[`Pipeline`](../type-aliases/Pipeline.md)

##### Returns

`void`

---

#### registerFragments()?

```ts
readonly optional registerFragments: (pipeline) => void;
```

##### Parameters

###### pipeline

[`Pipeline`](../type-aliases/Pipeline.md)

##### Returns

`void`

---

#### renderSummary()?

```ts
readonly optional renderSummary: (summary, dryRun, verbose) => string;
```

##### Parameters

###### summary

`FileWriterSummary`

###### dryRun

`boolean`

###### verbose

`boolean`

##### Returns

`string`

---

#### validateGeneratedImports()?

```ts
readonly optional validateGeneratedImports: (__namedParameters) => Promise<void>;
```

##### Parameters

###### \_\_namedParameters

`ValidateGeneratedImportsOptions`

##### Returns

`Promise`\&lt;`void`\&gt;
