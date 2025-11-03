[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / BuildApplyCommandOptions

# Interface: BuildApplyCommandOptions

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

#### appendApplyLog()?

```ts
readonly optional appendApplyLog: (workspace, entry) => Promise<void>;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

###### entry

`ApplyLogEntry`

##### Returns

`Promise`\&lt;`void`\&gt;

---

#### buildBuilderOutput()?

```ts
readonly optional buildBuilderOutput: () => BuilderOutput;
```

##### Returns

[`BuilderOutput`](../../../php-json-ast/src/interfaces/BuilderOutput.md)

---

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) => Workspace;
```

##### Parameters

###### root

`string`

##### Returns

[`Workspace`](Workspace.md)

---

#### createBackups()?

```ts
readonly optional createBackups: (options) => Promise<void>;
```

##### Parameters

###### options

`CreateBackupsOptions`

##### Returns

`Promise`\&lt;`void`\&gt;

---

#### createPatcher()?

```ts
readonly optional createPatcher: () => BuilderHelper;
```

##### Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

---

#### ensureGitRepository()?

```ts
readonly optional ensureGitRepository: (workspace) => Promise<void>;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

##### Returns

`Promise`\&lt;`void`\&gt;

---

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () => Promise<LoadedWPKernelConfig>;
```

##### Returns

`Promise`\&lt;[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)\&gt;

---

#### promptConfirm()?

```ts
readonly optional promptConfirm: (options) => Promise<boolean>;
```

##### Parameters

###### options

###### defaultValue

`boolean`

###### input

`ReadableStream`

###### message

`string`

###### output

`WritableStream`

##### Returns

`Promise`\&lt;`boolean`\&gt;

---

#### readManifest()?

```ts
readonly optional readManifest: (workspace) => Promise<PatchManifest | null>;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

##### Returns

`Promise`\&lt;[`PatchManifest`](PatchManifest.md) \| `null`\&gt;

---

#### resolveWorkspaceRoot()?

```ts
readonly optional resolveWorkspaceRoot: (loaded) => string;
```

##### Parameters

###### loaded

[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)

##### Returns

`string`
