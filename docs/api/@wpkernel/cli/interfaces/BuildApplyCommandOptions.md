[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / BuildApplyCommandOptions

# Interface: BuildApplyCommandOptions

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

### Other

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () =&gt; Promise&lt;LoadedWPKernelConfig&gt;;
```

##### Returns

`Promise`\&lt;[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)\&gt;

---

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) =&gt; Workspace;
```

##### Parameters

###### root

`string`

##### Returns

[`Workspace`](Workspace.md)

---

#### buildBuilderOutput()?

```ts
readonly optional buildBuilderOutput: () =&gt; BuilderOutput;
```

##### Returns

`BuilderOutput`

---

#### readManifest()?

```ts
readonly optional readManifest: (workspace) =&gt; Promise&lt;PatchManifest | null&gt;;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

##### Returns

`Promise`\&lt;[`PatchManifest`](PatchManifest.md) \| `null`\&gt;

---

#### resolveWorkspaceRoot()?

```ts
readonly optional resolveWorkspaceRoot: (loaded) =&gt; string;
```

##### Parameters

###### loaded

[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)

##### Returns

`string`

---

#### promptConfirm()?

```ts
readonly optional promptConfirm: (options) =&gt; Promise&lt;boolean&gt;;
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

`Promise`\&lt;`boolean`\&gt;

---

#### ensureGitRepository()?

```ts
readonly optional ensureGitRepository: (workspace) =&gt; Promise&lt;void&gt;;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

##### Returns

`Promise`\&lt;`void`\&gt;

---

#### createBackups()?

```ts
readonly optional createBackups: (options) =&gt; Promise&lt;void&gt;;
```

##### Parameters

###### options

[`CreateBackupsOptions`](CreateBackupsOptions.md)

##### Returns

`Promise`\&lt;`void`\&gt;

---

#### appendApplyLog()?

```ts
readonly optional appendApplyLog: (workspace, entry) =&gt; Promise&lt;void&gt;;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

###### entry

[`ApplyLogEntry`](ApplyLogEntry.md)

##### Returns

`Promise`\&lt;`void`\&gt;

### Patcher

#### createPatcher()?

```ts
readonly optional createPatcher: () =&gt; BuilderHelper;
```

Creates a builder helper for applying patches to the workspace.

This helper reads a patch plan, applies file modifications (writes, merges, deletions)
based on the plan, and records the outcome in a patch manifest.
It uses `git merge-file` for intelligent three-way merges to handle conflicts.

##### Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for applying patches.
