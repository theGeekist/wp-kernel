[**WP Kernel API v0.8.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / BuildApplyCommandOptions

# Interface: BuildApplyCommandOptions

## Properties

### loadKernelConfig()?

```ts
readonly optional loadKernelConfig: () => Promise<LoadedKernelConfig>;
```

Locate and load the project's kernel configuration.

The function searches for supported config files, executes them via
cosmiconfig loaders, validates the resulting structure and performs a
Composer autoload sanity check to ensure PHP namespaces are mapped
correctly.

#### Returns

`Promise`\&lt;[`LoadedKernelConfig`](../../../interfaces/LoadedKernelConfig.md)\&gt;

The validated kernel config and associated metadata.

#### Throws

KernelError when discovery, parsing or validation fails.

---

### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) => Workspace;
```

#### Parameters

##### root

`string` = `...`

#### Returns

[`Workspace`](Workspace.md)

---

### createPatcher()?

```ts
readonly optional createPatcher: () => BuilderHelper;
```

#### Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

---

### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

#### Parameters

##### options

[`ReporterOptions`](../../../../../core/src/type-aliases/ReporterOptions.md) = `{}`

#### Returns

[`Reporter`](../../../../../core/src/type-aliases/Reporter.md)

---

### buildBuilderOutput()?

```ts
readonly optional buildBuilderOutput: () => BuilderOutput;
```

#### Returns

[`BuilderOutput`](../../../../../php-json-ast/src/interfaces/BuilderOutput.md)

---

### readManifest()?

```ts
readonly optional readManifest: (workspace) => Promise<PatchManifest | null>;
```

#### Parameters

##### workspace

[`Workspace`](Workspace.md)

#### Returns

`Promise`\&lt;[`PatchManifest`](PatchManifest.md) \| `null`\&gt;

---

### resolveWorkspaceRoot()?

```ts
readonly optional resolveWorkspaceRoot: (loaded) => string;
```

#### Parameters

##### loaded

[`LoadedKernelConfig`](../../../interfaces/LoadedKernelConfig.md)

#### Returns

`string`
