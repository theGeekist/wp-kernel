[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / BuildInitCommandOptions

# Interface: BuildInitCommandOptions

## Properties

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

### runWorkflow()?

```ts
readonly optional runWorkflow: (__namedParameters) => Promise<InitWorkflowResult>;
```

#### Parameters

##### \_\_namedParameters

`InitWorkflowOptions`

#### Returns

`Promise`\&lt;`InitWorkflowResult`\&gt;
