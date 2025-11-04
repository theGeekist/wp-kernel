[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / TsBuilderCreatorContext

# Interface: TsBuilderCreatorContext

Context provided to a `TsBuilderCreator` function.

## Properties

### project

```ts
readonly project: Project;
```

The `ts-morph` project instance for managing source files.

***

### workspace

```ts
readonly workspace: Workspace;
```

The workspace instance.

***

### descriptor

```ts
readonly descriptor: ResourceDescriptor;
```

The resource descriptor for which artifacts are being created.

***

### config

```ts
readonly config: WPKernelConfigV1;
```

The full WP Kernel configuration.

***

### sourcePath

```ts
readonly sourcePath: string;
```

The source path of the configuration file.

***

### ir

```ts
readonly ir: IRv1;
```

The Intermediate Representation (IR) of the project.

***

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance for logging.

***

### emit()

```ts
readonly emit: (options) =&gt; Promise&lt;void&gt;;
```

A function to emit a generated TypeScript file.

#### Parameters

##### options

[`TsBuilderEmitOptions`](TsBuilderEmitOptions.md)

#### Returns

`Promise`\&lt;`void`\&gt;
