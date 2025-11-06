[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildApplyCommandOptions

# Interface: BuildApplyCommandOptions

## Properties

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

Create a WP Kernel reporter backed by LogLayer transports.

This is the standard reporter for browser/WordPress environments.
For CLI environments, use `createReporterCLI()` for pretty terminal output.

##### Parameters

###### options

`ReporterOptions` = `{}`

Reporter configuration

##### Returns

`Reporter`

Reporter instance with child helpers

### Other

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () => Promise<LoadedWPKernelConfig>;
```

##### Returns

`Promise`\<[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)\>

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

#### buildBuilderOutput()?

```ts
readonly optional buildBuilderOutput: () => BuilderOutput;
```

##### Returns

`BuilderOutput`

---

#### readManifest()?

```ts
readonly optional readManifest: (workspace) => Promise<PatchManifest | null>;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

##### Returns

`Promise`\<[`PatchManifest`](PatchManifest.md) \| `null`\>

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

---

#### promptConfirm()?

```ts
readonly optional promptConfirm: (options) => Promise<boolean>;
```

##### Parameters

###### options

###### message

`string`

###### defaultValue

`boolean`

###### input

`ReadableStream`

###### output

`WritableStream`

##### Returns

`Promise`\<`boolean`\>

---

#### ensureGitRepository()?

```ts
readonly optional ensureGitRepository: (workspace) => Promise<void>;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

##### Returns

`Promise`\<`void`\>

---

#### createBackups()?

```ts
readonly optional createBackups: (options) => Promise<void>;
```

##### Parameters

###### options

[`CreateBackupsOptions`](CreateBackupsOptions.md)

##### Returns

`Promise`\<`void`\>

---

#### appendApplyLog()?

```ts
readonly optional appendApplyLog: (workspace, entry) => Promise<void>;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

###### entry

[`ApplyLogEntry`](ApplyLogEntry.md)

##### Returns

`Promise`\<`void`\>

### Patcher

#### createPatcher()?

```ts
readonly optional createPatcher: () => BuilderHelper;
```

Creates a builder helper for applying patches to the workspace.

This helper reads a patch plan, applies file modifications (writes, merges, deletions)
based on the plan, and records the outcome in a patch manifest.
It uses `git merge-file` for intelligent three-way merges to handle conflicts.

##### Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for applying patches.
