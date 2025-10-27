[**WP Kernel API v0.8.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / BuildInitCommandOptions

# Interface: BuildInitCommandOptions

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
