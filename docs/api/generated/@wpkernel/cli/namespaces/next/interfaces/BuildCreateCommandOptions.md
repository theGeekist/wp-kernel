[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / BuildCreateCommandOptions

# Interface: BuildCreateCommandOptions

## Properties

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

### runWorkflow()?

```ts
readonly optional runWorkflow: (__namedParameters) => Promise<InitWorkflowResult>;
```

#### Parameters

##### \_\_namedParameters

`InitWorkflowOptions`

#### Returns

`Promise`\&lt;`InitWorkflowResult`\&gt;

---

### checkGitRepository()?

```ts
readonly optional checkGitRepository: (cwd, __namedParameters) => Promise<boolean>;
```

#### Parameters

##### cwd

`string`

##### \_\_namedParameters

`GitDependencies` = `{}`

#### Returns

`Promise`\&lt;`boolean`\&gt;

---

### initGitRepository()?

```ts
readonly optional initGitRepository: (cwd, __namedParameters) => Promise<void>;
```

#### Parameters

##### cwd

`string`

##### \_\_namedParameters

`GitDependencies` = `{}`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### ensureCleanDirectory()?

```ts
readonly optional ensureCleanDirectory: (__namedParameters) => Promise<void>;
```

#### Parameters

##### \_\_namedParameters

[`EnsureCleanDirectoryOptions`](EnsureCleanDirectoryOptions.md)

#### Returns

`Promise`\&lt;`void`\&gt;

---

### installNodeDependencies()?

```ts
readonly optional installNodeDependencies: (cwd, __namedParameters) => Promise<void>;
```

#### Parameters

##### cwd

`string`

##### \_\_namedParameters

`InstallerDependencies` = `{}`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### installComposerDependencies()?

```ts
readonly optional installComposerDependencies: (cwd, __namedParameters) => Promise<void>;
```

#### Parameters

##### cwd

`string`

##### \_\_namedParameters

`InstallerDependencies` = `{}`

#### Returns

`Promise`\&lt;`void`\&gt;
