[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / BuildApplyCommandOptions

# Interface: BuildApplyCommandOptions

## Properties

### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () => Promise<LoadedWPKernelConfig>;
```

Locate and load the project's kernel configuration.

The function searches for supported config files, executes them via
cosmiconfig loaders, validates the resulting structure and performs a
Composer autoload sanity check to ensure PHP namespaces are mapped
correctly.

#### Returns

`Promise`\&lt;[`LoadedWPKernelConfig`](../../../interfaces/LoadedWPKernelConfig.md)\&gt;

The validated kernel config and associated metadata.

#### Throws

WPKernelError when discovery, parsing or validation fails.

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

[`LoadedWPKernelConfig`](../../../interfaces/LoadedWPKernelConfig.md)

#### Returns

`string`

---

### promptConfirm()?

```ts
readonly optional promptConfirm: (__namedParameters) => Promise<boolean>;
```

#### Parameters

##### \_\_namedParameters

[`ConfirmPromptOptions`](ConfirmPromptOptions.md)

#### Returns

`Promise`\&lt;`boolean`\&gt;

---

### ensureGitRepository()?

```ts
readonly optional ensureGitRepository: (workspace) => Promise<void>;
```

#### Parameters

##### workspace

[`Workspace`](Workspace.md)

#### Returns

`Promise`\&lt;`void`\&gt;

---

### createBackups()?

```ts
readonly optional createBackups: (__namedParameters) => Promise<void>;
```

#### Parameters

##### \_\_namedParameters

`CreateBackupsOptions`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### appendApplyLog()?

```ts
readonly optional appendApplyLog: (workspace, entry) => Promise<void>;
```

#### Parameters

##### workspace

[`Workspace`](Workspace.md)

##### entry

`ApplyLogEntry`

#### Returns

`Promise`\&lt;`void`\&gt;
